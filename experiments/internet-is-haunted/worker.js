/**
 * The Internet Is Haunted — Cloudflare Worker
 *
 * A port of server.js to the Workers runtime, so the live, static page at
 * experiments/internet-is-haunted/index.html has somewhere to send its one
 * request: archive.org's CDX API sends no CORS header, so a plain static
 * page can never call it directly — something has to sit in between.
 *
 * Same logic as server.js (CDX lookup for first/last capture, a best-effort
 * scrape of the last capture for an author/title/fragment), adapted for a
 * stateless edge runtime:
 *   - no fs — the file-backed cache becomes the Workers Cache API (edge
 *     cache, ~24h TTL, no extra binding or setup required)
 *   - no cross-request in-memory queue — server.js serialized every
 *     outbound archive.org call, worker-wide, with a minimum gap between
 *     them; a Worker isolate can't rely on that state surviving between
 *     invocations, so this just runs the two lookups for one request in
 *     sequence (not parallel) rather than trying to pace requests
 *     across everyone hitting the Worker at once
 *   - CORS is restricted to an origin allowlist (your own site + localhost
 *     for local testing) rather than left wide open, so a random other site
 *     can't quietly ride your free-tier request quota
 *
 * ---- Deploy (no CLI needed) ----
 * 1. dash.cloudflare.com → sign up free (no credit card) → Workers & Pages
 * 2. Create application → Create Worker → give it a name (e.g.
 *    internet-is-haunted) → Deploy (this publishes a placeholder — that's fine)
 * 3. Edit code → delete the placeholder → paste this entire file → Save and deploy
 * 4. Copy the worker's URL (looks like
 *    https://internet-is-haunted.YOUR-SUBDOMAIN.workers.dev)
 * 5. Paste that URL into WORKER_URL near the top of ../index.html
 *
 * Free tier: 100,000 requests/day, no card required.
 */

// Edit this if you change your GitHub Pages domain.
const ALLOWED_ORIGINS = [
  'https://joshurbandavis.github.io',
];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
  return allowed ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {};
}

function json(request, obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign(
      { 'Content-Type': 'application/json; charset=utf-8' },
      corsHeaders(request),
      extraHeaders || {}
    ),
  });
}

async function fetchWithTimeout(url, opts, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs || 9000);
  try {
    return await fetch(url, Object.assign({}, opts, { signal: controller.signal }));
  } finally {
    clearTimeout(t);
  }
}

// limit=1 gets the earliest capture (ascending default order); limit=-1
// asks the server for the last line instead of paging through everything.
// archive.org itself is often the slow part, so the timeout sits well
// above a plain curl's worst case rather than reading a slow-but-working
// response as "unreachable."
async function cdxQuery(targetUrl, limit) {
  const api = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(targetUrl)}&output=json&limit=${limit}`;
  const res = await fetchWithTimeout(api, {}, 32000);
  const text = await res.text();
  return JSON.parse(text);
}

// Cookie banners, GDPR notices, and legal boilerplate on a domain still
// alive enough to carry them — real text, but not the kind of salvage this
// piece is after. Matched against a single sentence-shaped chunk.
const BOILERPLATE_RE =
  /\b(cookies?|privacy (policy|choices|notice)|gdpr|consent|terms of (service|use)|all rights reserved|subscribe to our newsletter|javascript is (disabled|required)|enable javascript)\b/i;

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&rsquo;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&mdash;/gi, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

// Best-effort salvage: an author meta tag, a title, and one sentence-shaped
// fragment of real body text. Old, chaotic HTML means this sometimes finds
// nothing — that's reported honestly rather than papered over.
function extractMeta(html) {
  let author = null;
  const authorMatch =
    html.match(/<meta[^>]+name=["']author["'][^>]*content=["']([^"']{2,80})["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']{2,80})["'][^>]*name=["']author["']/i);
  if (authorMatch) author = authorMatch[1].trim();

  let title = null;
  const titleMatch = html.match(/<title[^>]*>([^<]{1,140})<\/title>/i);
  if (titleMatch) title = stripTags(titleMatch[1]).trim() || null;

  let fragment = null;
  const text = stripTags(html);
  const chunks = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  for (const c of chunks) {
    if (c.length < 40 || c.length > 260 || !/[a-zA-Z]{3,}/.test(c)) continue;
    if (BOILERPLATE_RE.test(c)) continue;
    fragment = c;
    break;
  }
  return { author, title, fragment };
}

async function buildMemorial(targetUrl) {
  let first, last;
  try {
    // sequential, not Promise.all — see the note at the top of this file
    first = await cdxQuery(targetUrl, 1);
    last = await cdxQuery(targetUrl, -1);
  } catch (err) {
    return { ok: false, error: 'archive_unreachable' };
  }

  if (!first || first.length < 2 || !last || last.length < 2) {
    return { ok: true, url: targetUrl, archived: false };
  }

  const cols = first[0];
  const tIdx = cols.indexOf('timestamp');
  const oIdx = cols.indexOf('original');
  const firstRow = first[1];
  const lastRow = last[last.length - 1];

  const firstTimestamp = firstRow[tIdx];
  const lastTimestamp = lastRow[tIdx];
  const firstYear = parseInt(firstTimestamp.slice(0, 4), 10);
  const lastYear = parseInt(lastTimestamp.slice(0, 4), 10);
  const originalUrl = lastRow[oIdx] || targetUrl;
  const lastSnapshotUrl = `https://web.archive.org/web/${lastTimestamp}/${originalUrl}`;

  let author = null, title = null, fragment = null;
  try {
    // the "id_" modifier returns the raw captured bytes, no Wayback toolbar
    const rawUrl = `https://web.archive.org/web/${lastTimestamp}id_/${originalUrl}`;
    const res = await fetchWithTimeout(rawUrl, {}, 15000);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html') && res.body) {
      const reader = res.body.getReader();
      const chunks = [];
      let received = 0;
      const MAX = 300 * 1024; // don't pull down an entire old fat page
      while (received < MAX) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
      }
      try { await reader.cancel(); } catch (e) { /* ignore */ }
      const merged = new Uint8Array(received);
      let offset = 0;
      for (const c of chunks) { merged.set(c, offset); offset += c.length; }
      const html = new TextDecoder('utf-8').decode(merged);
      const meta = extractMeta(html);
      author = meta.author;
      title = meta.title;
      fragment = meta.fragment;
    }
  } catch (err) {
    // salvage attempt failed; leaving these null is the honest outcome
  }

  return {
    ok: true,
    url: targetUrl,
    archived: true,
    firstYear,
    lastYear,
    lastSnapshotUrl,
    title,
    author,
    fragment,
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/memorial') {
      return new Response('not found', { status: 404, headers: corsHeaders(request) });
    }

    const target = (url.searchParams.get('url') || '').trim();
    if (!target) return json(request, { ok: false, error: 'missing_url' }, 400);

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const cached = await cache.match(cacheKey);
    if (cached) {
      // cached response was stored without this request's CORS header —
      // reattach it fresh rather than trusting a stale/absent one
      const body = await cached.text();
      return json(request, JSON.parse(body), 200);
    }

    let data;
    try {
      data = await buildMemorial(target);
    } catch (err) {
      data = { ok: false, error: 'server_error' };
    }

    // Only cache a real answer (archived or genuinely not-archived) — never
    // a transient failure. archive.org being briefly unreachable shouldn't
    // get baked in as this URL's answer for the next 24 hours.
    if (data.ok) {
      const response = json(request, data, 200, { 'Cache-Control': 'public, max-age=86400' });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }
    return json(request, data, 200, { 'Cache-Control': 'no-store' });
  },
};
