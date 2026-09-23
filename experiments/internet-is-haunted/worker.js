/**
 * The Internet Is Haunted — Cloudflare Worker
 *
 * A port of server.js to the Workers runtime, so the live, static page at
 * experiments/internet-is-haunted/index.html has somewhere to send its one
 * request: archive.org's APIs send no CORS header, so a plain static page
 * can never call them directly — something has to sit in between.
 *
 * Tries the Availability API (archive.org/wayback/available) first, then
 * falls back to the CDX Search API if that comes up empty. Neither service
 * is reliably always-up on its own — one night CDX was the unreliable one
 * (429s, 521s, 503s, multi-minute outages) while Availability stayed solid;
 * a week later Availability came back empty for nearly everything (even
 * Wikipedia) while CDX worked fine, then CDX itself briefly served the same
 * "Temporarily Offline" page minutes after that. They fail independently
 * and unpredictably, so this only concludes "never archived" when BOTH
 * agree there's nothing — see getCapture() below.
 *
 * Diagnosed live (2026-09-22) that CDX specifically is degraded *because
 * this runs on Cloudflare's network*: archive.org's own response headers
 * include `x-nid: Cloudflare` (their network-identity fingerprint) on CDX
 * requests from this Worker, versus `x-nid: ATT-INTERNET4` for the exact
 * same request from a residential IP — and the Cloudflare-tagged requests
 * came back as three different failures in three consecutive tries (a 400
 * from archive.org's own nginx, a 521 from Cloudflare's edge saying their
 * origin refused the connection, and a full 15s hang), while Availability
 * succeeded every time from the same Worker. CDX is kept as a fallback
 * because it isn't *always* broken, but its timeout is kept short (see
 * getSnapshotCdx) since it's unlikely to pay off, and getSnapshotAvailability
 * retries once before giving up, since it's the one path actually reliable
 * from this network.
 *
 * Availability answers a differently-shaped question ("closest snapshot to
 * a timestamp") but that covers first/last capture too: a timestamp from
 * the web's infancy returns the closest snapshot to it, which for any real
 * site is its earliest capture; a timestamp safely in the future returns
 * the closest to now, i.e. the latest — never omit the timestamp or pass
 * today's actual date for this, a live-tested archive.org quirk. (That
 * quirk itself later got worse: for a few days *any* non-far-past timestamp
 * came back empty, which is exactly why this no longer trusts Availability
 * alone.) CDX's limit=1 (ascending) gets the earliest capture; limit=-1
 * asks the server for the last line — slow or prone to timing out on
 * enormous, constantly-crawled domains (Wikipedia-scale), fine for the
 * obscure pages this piece actually expects.
 *
 * Same overall logic as server.js (first/last capture lookup, a best-effort
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

// Edit this if you change your GitHub Pages domain or custom domain.
const ALLOWED_ORIGINS = [
  'https://joshurbandavis.github.io',
  'https://joshurbandavis.com',
  'https://www.joshurbandavis.com',
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getSnapshotAvailabilityOnce(targetUrl, timestamp) {
  const api = `https://archive.org/wayback/available?url=${encodeURIComponent(targetUrl)}&timestamp=${timestamp}`;
  const res = await fetchWithTimeout(api, {}, 12000);
  const data = await res.json();
  const closest = data && data.archived_snapshots && data.archived_snapshots.closest;
  if (!closest || !closest.available) return null;
  const match = /^https?:\/\/web\.archive\.org\/web\/\d+\/(.+)$/.exec(closest.url || '');
  return { timestamp: closest.timestamp, originalUrl: match ? match[1] : targetUrl };
}

// Confirmed live (2026-09-22) that archive.org has a per-exact-timestamp
// cache bug: querying '19960101' returns a stuck-empty result every time
// (same backend node, same empty body), while '19960102' — a functionally
// identical query, since "closest snapshot" doesn't care about the exact
// day — returns the real answer. The broken timestamps aren't predictable
// (19960101, 19960115, and 20000101 were all stuck; 19960102, 19960201,
// and 20050101 all worked), so a retry has to use a genuinely different
// timestamp, not just repeat the same request — retrying the identical
// query would hit the exact same poisoned cache entry and gain nothing.
function jitterTimestamp(timestamp, days) {
  const y = parseInt(timestamp.slice(0, 4), 10);
  const m = parseInt(timestamp.slice(4, 6), 10) - 1;
  const d = parseInt(timestamp.slice(6, 8), 10);
  const date = new Date(Date.UTC(y, m, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

// This is the one archive.org path confirmed reliable from Cloudflare's
// network (see the file header) — worth one retry on an empty result before
// falling through to CDX, since an empty result here has previously turned
// out to be this API's own known flakiness rather than a genuine absence.
async function getSnapshotAvailability(targetUrl, timestamp) {
  const first = await getSnapshotAvailabilityOnce(targetUrl, timestamp);
  if (first) return first;
  await sleep(400);
  return getSnapshotAvailabilityOnce(targetUrl, jitterTimestamp(timestamp, 14));
}

async function getSnapshotCdx(targetUrl, limit) {
  const api = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(targetUrl)}&output=json&limit=${limit}`;
  // Short timeout: confirmed live that this path is frequently degraded
  // specifically for Cloudflare-network traffic (see file header), so a
  // long wait here rarely pays off — fail fast and let the caller move on.
  const res = await fetchWithTimeout(api, {}, 6000);
  const text = await res.text();
  const rows = JSON.parse(text);
  if (!rows || rows.length < 2) return null;
  const cols = rows[0];
  const tIdx = cols.indexOf('timestamp');
  const oIdx = cols.indexOf('original');
  const row = rows[rows.length - 1];
  return { timestamp: row[tIdx], originalUrl: row[oIdx] || targetUrl };
}

// Try Availability first (usually the simpler, faster call); if it comes
// back empty — which can mean genuinely never-archived, or just that
// service having a bad day — confirm with CDX before believing it.
//
// Never throws: always resolves { ok, capture }. ok:true means one of the
// two services gave a definitive answer, and capture is either the real
// snapshot or null (both services agree there's genuinely nothing here).
// ok:false means BOTH services failed to answer at all for this specific
// direction (first or last) — a real "don't know," not "nothing found."
// This distinction matters: a fast 429 or refused connection on Availability
// used to abort buildMemorial immediately (via an uncaught throw from
// getSnapshotCdx) before the OTHER direction's lookup was ever attempted —
// which is why a single quick rejection could kill the whole request
// almost instantly. Now both directions always run to completion.
async function getCapture(targetUrl, timestamp, cdxLimit) {
  try {
    const viaAvailability = await getSnapshotAvailability(targetUrl, timestamp);
    if (viaAvailability) return { ok: true, capture: viaAvailability };
  } catch (err) {
    // fall through to CDX
  }
  try {
    const viaCdx = await getSnapshotCdx(targetUrl, cdxLimit);
    return { ok: true, capture: viaCdx };
  } catch (err) {
    return { ok: false, capture: null };
  }
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
  // Sequential, not Promise.all — see the note at the top of this file about
  // pacing outbound archive.org calls. getCapture never throws, so both of
  // these always run, regardless of whether the other one struggled.
  const firstRes = await getCapture(targetUrl, '19960101', 1);
  const lastRes = await getCapture(targetUrl, '22000101', -1);

  if (!firstRes.ok || !lastRes.ok) {
    return { ok: false, error: 'archive_unreachable' };
  }

  const first = firstRes.capture;
  const last = lastRes.capture;
  if (!first || !last) {
    return { ok: true, url: targetUrl, archived: false };
  }

  const firstYear = parseInt(first.timestamp.slice(0, 4), 10);
  const lastYear = parseInt(last.timestamp.slice(0, 4), 10);
  const originalUrl = last.originalUrl || targetUrl;
  const lastTimestamp = last.timestamp;
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
