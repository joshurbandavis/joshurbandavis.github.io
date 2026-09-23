'use strict';
/**
 * The Internet Is Haunted — a tiny local prototype.
 *
 * Serves a static frontend and one API route, /api/memorial, that looks a
 * URL up in the Internet Archive's Wayback Machine (the Availability API
 * for real capture dates, plus a best-effort scrape of the last capture
 * for an author tag and a fragment of real text) and returns a memorial
 * record.
 *
 * Tries the Availability API first, then falls back to the CDX Search API
 * if that comes up empty. Neither service is reliably always-up on its
 * own — one night CDX was the unreliable one (429s, 521s, 503s,
 * multi-minute outages) while Availability stayed solid; a week later
 * Availability came back empty for nearly everything (even Wikipedia)
 * while CDX worked fine, then CDX itself briefly served the same
 * "Temporarily Offline" page minutes after that. They fail independently
 * and unpredictably, so this only concludes "never archived" when BOTH
 * agree there's nothing — see getCapture() below.
 *
 * No dependencies — just Node's built-ins and the global fetch.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5173;
const PUBLIC_DIR = path.join(__dirname, 'public');

// A JSON-file-backed cache: archive.org is slow and rate-limits hard, so a
// lookup already paid for should survive a server restart, not just live
// for the process's lifetime. Capture history rarely changes minute to
// minute, so the TTL is generous (a day) rather than the 10-minute window
// an in-memory-only cache would need.
const CACHE_FILE = path.join(__dirname, '.cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE = new Map(); // targetUrl -> { time, data }

function loadCache() {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const obj = JSON.parse(raw);
    for (const [k, v] of Object.entries(obj)) CACHE.set(k, v);
    console.log(`loaded ${CACHE.size} cached lookup(s) from ${path.basename(CACHE_FILE)}`);
  } catch (err) {
    // no cache file yet, or it's corrupt — start fresh either way
  }
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(CACHE)));
  } catch (err) {
    // a failed write shouldn't break the request that triggered it —
    // worst case the cache just doesn't persist this entry
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({ 'Access-Control-Allow-Origin': '*' }, headers || {}));
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });
}

// Every call this server makes goes to archive.org, and tonight's testing
// tripped its rate limit more than once — including from a handful of
// requests spaced a few seconds apart. Nothing was pacing our own outbound
// calls, so a few real visitors in quick succession could do the same thing
// to every visitor after them. This serializes all outbound archive.org
// calls with a minimum gap between them, server-wide, regardless of how
// many requests are in flight. Cost: the earliest/latest capture lookups
// below, which used to run in parallel, now run one after the other — a
// small latency hit in exchange for not repeatedly earning a 429.
const ARCHIVE_MIN_GAP_MS = 1500;
let archiveQueue = Promise.resolve();

function throttleArchiveCall(fn) {
  const run = archiveQueue.then(async () => {
    await new Promise((r) => setTimeout(r, ARCHIVE_MIN_GAP_MS));
    return fn();
  });
  archiveQueue = run.catch(() => {}); // keep the chain alive past a rejection
  return run;
}

async function fetchWithTimeout(url, opts, timeoutMs) {
  return throttleArchiveCall(async () => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs || 9000);
    try {
      return await fetch(url, Object.assign({}, opts, { signal: controller.signal }));
    } finally {
      clearTimeout(t);
    }
  });
}

// A timestamp from before the web existed returns the closest snapshot to
// it (the earliest capture, since nothing real predates it); a timestamp
// safely in the future returns the closest to now (the latest capture).
// Never omit the timestamp or pass today's actual date for "latest" — a
// live-tested archive.org quirk where that can come back empty near the
// most recent real capture.
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
// day — returns the real answer. The broken timestamps cluster rather than
// being isolated (19960101, 19960115 — exactly 14 days apart — and
// 20000101/20000102 were all stuck together), so a retry needs a *random*
// offset each time, not a fixed one: a fixed +14-day retry was verified to
// land on another stuck date, which is exactly why every request and every
// retry of a failed link were coming back identically dead instead of
// eventually finding a working date.
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

function randomJitterDays() {
  // 20-400 days, always forward: far enough to dodge a clustered bad
  // range, small enough that "closest to 1996" / "closest to 2200" still
  // means the same thing semantically for any real site.
  return 20 + Math.floor(Math.random() * 380);
}

// This is the more reliable of the two archive.org endpoints — worth
// retrying an empty result before falling through to CDX, since an empty
// result has previously turned out to be this API's own known flakiness
// rather than a genuine absence. Two retries (three attempts total), each
// with an independently random offset, since the stuck dates cluster and
// a single retry can still land on another one.
async function getSnapshotAvailability(targetUrl, timestamp) {
  const first = await getSnapshotAvailabilityOnce(targetUrl, timestamp);
  if (first) return first;
  for (let i = 0; i < 2; i++) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const retry = await getSnapshotAvailabilityOnce(targetUrl, jitterTimestamp(timestamp, randomJitterDays()));
    if (retry) return retry;
  }
  return null;
}

// limit=1 (ascending default order) gets the earliest capture; limit=-1
// asks the server for the last line instead of paging through everything.
// Slow or prone to timing out on enormous, constantly-crawled domains
// (Wikipedia-scale) — fine for the obscure pages this piece expects.
async function getSnapshotCdx(targetUrl, limit) {
  const api = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(targetUrl)}&output=json&limit=${limit}`;
  const res = await fetchWithTimeout(api, {}, 15000);
  const text = await res.text();
  const rows = JSON.parse(text);
  if (!rows || rows.length < 2) return null;
  const cols = rows[0];
  const tIdx = cols.indexOf('timestamp');
  const oIdx = cols.indexOf('original');
  const row = rows[rows.length - 1];
  return { timestamp: row[tIdx], originalUrl: row[oIdx] || targetUrl };
}

// Try Availability first; if it comes back empty or errors, confirm with
// CDX before believing "never archived." One attempt at each, no retry
// beyond that — retrying just doubles the wait for the same eventual
// answer, and having a second independent service already gives this two
// real chances.
//
// Never throws: always resolves { ok, capture }. ok:true means one of the
// two services gave a definitive answer (capture is the real snapshot, or
// null if both agree there's genuinely nothing here). ok:false means BOTH
// failed to answer at all for this direction — a real "don't know," not
// "nothing found." That distinction matters: a fast rejection on
// Availability used to abort buildMemorial immediately, before the OTHER
// direction's lookup was ever attempted — now both always run to completion.
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
    // A domain still alive enough to carry a modern cookie/privacy banner
    // puts that banner first — it's real text, but it's not the salvage
    // this piece is after. Skip it and keep looking.
    if (BOILERPLATE_RE.test(c)) continue;
    fragment = c;
    break;
  }
  return { author, title, fragment };
}

async function buildMemorial(targetUrl) {
  const cached = CACHE.get(targetUrl);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) return cached.data;

  // getCapture never throws, so Promise.all is safe here — both directions
  // always run to completion regardless of whether the other struggled
  // (the actual archive.org calls are still paced by throttleArchiveCall
  // above, so this doesn't double the outbound request rate).
  const [firstRes, lastRes] = await Promise.all([
    getCapture(targetUrl, '19960101', 1),
    getCapture(targetUrl, '22000101', -1),
  ]);

  if (!firstRes.ok || !lastRes.ok) {
    return { ok: false, error: 'archive_unreachable' };
  }

  const first = firstRes.capture;
  const last = lastRes.capture;
  if (!first || !last) {
    const data = { ok: true, url: targetUrl, archived: false };
    CACHE.set(targetUrl, { time: Date.now(), data });
    saveCache();
    return data;
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
      const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
      const meta = extractMeta(html);
      author = meta.author;
      title = meta.title;
      fragment = meta.fragment;
    }
  } catch (err) {
    // salvage attempt failed; leaving these null is the honest outcome
  }

  const data = {
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
  CACHE.set(targetUrl, { time: Date.now(), data });
  saveCache();
  return data;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  if (u.pathname === '/api/memorial') {
    const target = (u.searchParams.get('url') || '').trim();
    if (!target) return sendJson(res, 400, { ok: false, error: 'missing_url' });
    try {
      const data = await buildMemorial(target);
      return sendJson(res, 200, data);
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: 'server_error' });
    }
  }

  let filePath = u.pathname === '/' ? '/index.html' : u.pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.join(PUBLIC_DIR, filePath);
  if (!fullPath.startsWith(PUBLIC_DIR)) return send(res, 403, 'forbidden');

  fs.readFile(fullPath, (err, content) => {
    if (err) return send(res, 404, 'not found', { 'Content-Type': 'text/plain' });
    const ext = path.extname(fullPath);
    send(res, 200, content, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  });
});

loadCache();

server.listen(PORT, () => {
  console.log(`The Internet Is Haunted — http://localhost:${PORT}`);
});
