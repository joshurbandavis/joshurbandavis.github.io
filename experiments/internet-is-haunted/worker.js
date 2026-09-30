/**
 * The Internet Is Haunted: bounded Wayback lookups and an opt-in D1 reliquary.
 * Saved snapshots are immutable and readable without contacting the archive.
 * See README.md for local development, storage migration and deployment.
 */
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

// archive.org's endpoints are themselves Cloudflare-fronted (their
// responses carry cf-ray / server: cloudflare), which means a plain
// fetch() from inside a Worker can have its *outbound* request served
// from Cloudflare's own edge cache for that exact URL — including a
// cached failure. `cacheTtl: 0` + `cacheEverything: false` opts every
// subrequest here out of that, so a retry actually reaches archive.org
// again instead of getting the same cached answer back instantly.
async function fetchWithTimeout(url, opts, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs || 9000);
  try {
    let response;
    for (let hop=0;hop<5;hop++) {
      const destination=new URL(url);
      if(destination.protocol!=='https:' || !['archive.org','web.archive.org'].includes(destination.hostname)) throw new Error('unsafe_archive_redirect');
      response=await fetch(destination.href,Object.assign({},opts,{redirect:'manual',signal:controller.signal,cf:{cacheTtl:0,cacheEverything:false}}));
      if(![301,302,303,307,308].includes(response.status))break;
      const location=response.headers.get('Location');response.body?.cancel().catch(()=>{});
      if(!location||hop===4)throw new Error('archive_redirect_loop');
      url=new URL(location,destination).href;
    }
    // Keep the deadline active through body consumption, not just headers.
    if (!response.ok) throw new Error('upstream_' + response.status);
    const reader = response.body?.getReader(), chunks = [];
    let size = 0;
    if (reader) try {
      while (size < 300 * 1024) {
        const {done, value} = await reader.read();
        if (done) break;
        const part = value.subarray(0, 300 * 1024 - size);
        chunks.push(part); size += part.length;
      }
    } finally { await reader.cancel().catch(()=>{}); }
    return new Response(new Blob(chunks), {status: response.status, headers: response.headers});
  } finally {
    clearTimeout(t);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getSnapshotAvailabilityOnce(targetUrl, timestamp) {
  const api = `https://archive.org/wayback/available?url=${encodeURIComponent(targetUrl)}&timestamp=${timestamp}`;
  const res = await fetchWithTimeout(api, {}, 5000);
  const data = await res.json();
  const closest = data && data.archived_snapshots && data.archived_snapshots.closest;
  if (!data || typeof data.archived_snapshots !== 'object') throw new Error('invalid_availability');
  if (!closest || !closest.available) return null;
  if (!/^\d{14}$/.test(closest.timestamp || '')) throw new Error('invalid_capture');
  const match = /^https?:\/\/web\.archive\.org\/web\/\d+\/(.+)$/.exec(closest.url || '');
  return { timestamp: closest.timestamp, originalUrl: match ? match[1] : targetUrl, status: closest.status || null };
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

// This is the one archive.org path confirmed reliable from Cloudflare's
// network (see the file header) — worth retrying an empty result before
// falling through to CDX, since an empty result here has previously turned
// out to be this API's own known flakiness rather than a genuine absence.
// One jittered retry keeps both capture lookups and salvage inside the client deadline.
async function getSnapshotAvailability(targetUrl, timestamp) {
  const first = await getSnapshotAvailabilityOnce(targetUrl, timestamp);
  if (first) return first;
  for (let i = 0; i < 1; i++) {
    await sleep(300);
    const retry = await getSnapshotAvailabilityOnce(targetUrl, jitterTimestamp(timestamp, randomJitterDays()));
    if (retry) return retry;
  }
  return null;
}

async function getSnapshotCdx(targetUrl, limit) {
  const api = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(targetUrl)}&output=json&limit=${limit}`;
  // Short timeout: confirmed live that this path is frequently degraded
  // specifically for Cloudflare-network traffic (see file header), so a
  // long wait here rarely pays off — fail fast and let the caller move on.
  const res = await fetchWithTimeout(api, {}, 6000);
  const text = await res.text();
  const rows = JSON.parse(text);
  if (!Array.isArray(rows)) throw new Error('invalid_cdx');
  if (rows.length === 0) return null;
  if (!Array.isArray(rows[0]) || !rows[0].includes('timestamp')) throw new Error('invalid_cdx');
  if (rows.length < 2) return null;
  const cols = rows[0];
  const tIdx = cols.indexOf('timestamp');
  const oIdx = cols.indexOf('original');
  const sIdx = cols.indexOf('statuscode');
  const row = rows[rows.length - 1];
  if (!/^\d{14}$/.test(row[tIdx] || '')) throw new Error('invalid_capture');
  return { timestamp: row[tIdx], originalUrl: row[oIdx] || targetUrl, status: sIdx !== -1 ? row[sIdx] : null };
}

// Try Availability first (usually the simpler, faster call); if it comes
// back empty — which can mean genuinely never-archived, or just that
// service having a bad day — confirm with CDX before believing it.
//
// Never throws: always resolves { ok, capture }. ok:true means one of the
// two services gave a definitive answer, and capture is either the real
// snapshot or null (both services agree there's genuinely nothing here).
// ok:false also covers one failed service plus one empty response: that is
// uncertainty, not evidence that the page was never archived.
// This distinction matters: a fast 429 or refused connection on Availability
// used to abort buildMemorial immediately (via an uncaught throw from
// getSnapshotCdx) before the OTHER direction's lookup was ever attempted —
// which is why a single quick rejection could kill the whole request
// almost instantly. Now both directions always run to completion.
async function getCapture(targetUrl, timestamp, cdxLimit) {
  let availabilityAnswered = false;
  try {
    const viaAvailability = await getSnapshotAvailability(targetUrl, timestamp);
    if (viaAvailability) return { ok: true, capture: viaAvailability };
    availabilityAnswered = true;
  } catch (err) {
    // fall through to CDX
  }
  try {
    const viaCdx = await getSnapshotCdx(targetUrl, cdxLimit);
    return { ok: Boolean(viaCdx) || availabilityAnswered, capture: viaCdx };
  } catch (err) {
    return { ok: false, capture: null };
  }
}

// Cookie banners, GDPR notices, and legal boilerplate on a domain still
// alive enough to carry them — real text, but not the kind of salvage this
// piece is after. Matched against a single sentence-shaped chunk.
const BOILERPLATE_RE =
  /\b(cookies?|privacy (policy|choices|notice)|gdpr|consent|terms of (service|use)|all rights reserved|subscribe to our newsletter|javascript is (disabled|required)|enable javascript)\b/i;

function decodeEntities(str) {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&rsquo;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&mdash;/gi, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

// Pulls a meta tag's content by name= or property=, trying content-before-
// and content-after-the-identifying-attribute since real HTML isn't
// consistent about attribute order.
function metaContent(html, attr, key, maxLen) {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re1 = new RegExp(`<meta[^>]+${attr}=["']${esc}["'][^>]*content=["']([^"']{2,${maxLen}})["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']{2,${maxLen}})["'][^>]*${attr}=["']${esc}["']`, 'i');
  const match = html.match(re1) || html.match(re2);
  return match ? decodeEntities(match[1]) : null;
}

// Best-effort salvage: meta tags and one sentence-shaped fragment of real
// body text. Old, chaotic HTML means this sometimes finds nothing — that's
// reported honestly rather than papered over.
function extractMeta(html) {
  const author = metaContent(html, 'name', 'author', 80);
  // The page's own self-summary — often a better "about" line than a
  // randomly-selected body sentence. og:description covers pages that only
  // bothered with Open Graph tags, not the plain meta description.
  const description = metaContent(html, 'name', 'description', 300) || metaContent(html, 'property', 'og:description', 300);
  // What built it — WordPress, Movable Type, Dreamweaver, a GeoCities-era
  // editor — a real, concrete detail, like a trade or craft.
  const generator = metaContent(html, 'name', 'generator', 80);
  const siteName = metaContent(html, 'property', 'og:site_name', 80);

  let title = null;
  const titleMatch = html.match(/<title[^>]*>([^<]{1,140})<\/title>/i);
  if (titleMatch) title = stripTags(titleMatch[1]).trim() || null;

  let fragment = null;
  const text = stripTags(html.replace(/<head[\s\S]*?<\/head>/gi, ' ').replace(/<title[\s\S]*?<\/title>/gi, ' '));
  const chunks = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  for (const c of chunks) {
    if (c.length < 40 || c.length > 260 || !/[a-zA-Z]{3,}/.test(c)) continue;
    if (BOILERPLATE_RE.test(c)) continue;
    fragment = c;
    break;
  }
  return { author, title, fragment, description, generator, siteName };
}

// Wayback timestamps are 'YYYYMMDDHHMMSS'; format as ISO 8601 so the
// client can render an exact date (and, if it wants, time) instead of just
// the year this file otherwise reduces every timestamp down to.
function waybackTimestampToISO(ts) {
  const y = ts.slice(0, 4), mo = ts.slice(4, 6), d = ts.slice(6, 8);
  const h = ts.slice(8, 10) || '00', mi = ts.slice(10, 12) || '00', s = ts.slice(12, 14) || '00';
  return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
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

  let first = firstRes.capture;
  let last = lastRes.capture;
  if (!first && !last) return { ok: true, url: targetUrl, archived: false };
  if (!first || !last) return { ok: false, error: 'archive_inconsistent' };
  if (first.timestamp > last.timestamp) [first,last] = [last,first];

  const firstYear = parseInt(first.timestamp.slice(0, 4), 10);
  const lastYear = parseInt(last.timestamp.slice(0, 4), 10);
  const originalUrl = last.originalUrl || targetUrl;
  const lastTimestamp = last.timestamp;
  const lastSnapshotUrl = `https://web.archive.org/web/${lastTimestamp}/${originalUrl}`;
  const firstDate = waybackTimestampToISO(first.timestamp);
  const lastDate = waybackTimestampToISO(last.timestamp);
  // The crawler's last-recorded status, not a live check of the url right
  // now — this piece never re-checks liveness itself, so this only says
  // what archive.org saw at that specific past visit, which may or may not
  // be when the page actually went away.
  const lastStatus = last.status || null;

  let author = null, title = null, fragment = null, description = null, generator = null, siteName = null;
  try {
    // the "id_" modifier returns the raw captured bytes, no Wayback toolbar
    const rawUrl = `https://web.archive.org/web/${lastTimestamp}id_/${originalUrl}`;
    const res = await fetchWithTimeout(rawUrl, {}, 8000);
    const ct = res.headers.get('content-type') || '';
    // A non-2xx here (429 from archive.org rate-limiting this specific
    // fetch, a stray 5xx, etc.) still often comes back as text/html — but
    // it's archive.org's own error page, not the archived page. Parsing it
    // anyway means the "fragment" scraper had picked up "429 Too Many
    // Requests / You have sent too many requests..." and presented it as if
    // it were real salvaged text from the page, which is exactly backwards
    // from this piece's "real salvage over invented flavor" principle.
    if (res.ok && ct.includes('text/html') && res.body) {
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
      description = meta.description;
      generator = meta.generator;
      siteName = meta.siteName;
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
    firstDate,
    lastDate,
    lastStatus,
    lastSnapshotUrl,
    title,
    author,
    fragment,
    description,
    generator,
    siteName,
  };
}

function normalizeUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('invalid_url');
  let text=value.trim();
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text='https://'+text;
  const u=new URL(text);
  if (!['http:','https:'].includes(u.protocol) || u.username || u.password || !u.hostname.includes('.') || u.hostname.endsWith('.local')) throw new Error('invalid_url');
  u.hash=''; return u.href;
}
function unpack(row) { return {id:row.id,savedAt:row.saved_at,memorial:JSON.parse(row.snapshot)}; }
async function offerSave(data, env) {
  if (!data.archived) return data;
  if (!env.RELIQUARY) return {...data,saveUnavailable:true};
  try {
    const existing=await env.RELIQUARY.prepare('SELECT * FROM relics WHERE url = ?').bind(data.url).first();
    if (existing) return {...JSON.parse(existing.snapshot),relicId:existing.id};
    const token=crypto.randomUUID(),expires=Date.now()+86400000;
    await env.RELIQUARY.batch([
      env.RELIQUARY.prepare('DELETE FROM discoveries WHERE expires < ?').bind(Date.now()),
      env.RELIQUARY.prepare('INSERT INTO discoveries(token,url,snapshot,expires) VALUES(?,?,?,?)').bind(token,data.url,JSON.stringify(data),expires)
    ]);
    return {...data,saveToken:token};
  } catch { return {...data,saveUnavailable:true}; }
}
async function readSaveBody(request) {
  if(Number(request.headers.get('Content-Length'))>1024)throw new Error('body_too_large');
  const reader=request.body?.getReader();if(!reader)return '';
  let timer,size=0;const chunks=[];
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('body_timeout')),5000);});
  try {
    while(true){const {done,value}=await Promise.race([reader.read(),deadline]);if(done)break;size+=value.length;if(size>1024)throw new Error('body_too_large');chunks.push(value);}
    return await new Blob(chunks).text();
  }finally{clearTimeout(timer);reader.cancel().catch(()=>{});}
}
async function route(request,env,ctx) {
  const url=new URL(request.url),path=url.pathname;
  if (request.method==='OPTIONS') return new Response(null,{status:204,headers:{...corsHeaders(request),'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
  if (!['GET','POST'].includes(request.method)) return json(request,{ok:false,error:'method_not_allowed'},405);
  if (path.startsWith('/api/reliquary')) {
    if (!env.RELIQUARY) return json(request,{ok:false,error:'storage_unavailable'},503);
    const db=env.RELIQUARY;
    if (request.method==='POST' && path==='/api/reliquary') {
      if (!corsHeaders(request)['Access-Control-Allow-Origin']) return json(request,{ok:false,error:'origin_not_allowed'},403);
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json(request,{ok:false,error:'invalid_request'},415);
      let body;try{body=await readSaveBody(request);}catch(error){return json(request,{ok:false,error:'invalid_request'},error.message==='body_too_large'?413:408);}
      let token;try{token=JSON.parse(body).token;}catch{return json(request,{ok:false,error:'invalid_request'},400);}
      if (typeof token!=='string'||token.length>64) return json(request,{ok:false,error:'invalid_token'},400);
      const discovery=await db.prepare('SELECT * FROM discoveries WHERE token=? AND expires>?').bind(token,Date.now()).first();
      if (!discovery) return json(request,{ok:false,error:'discovery_expired'},410);
      // Unique URL + INSERT OR IGNORE makes retries and concurrent saves idempotent.
      await db.prepare('INSERT OR IGNORE INTO relics(url,snapshot) VALUES(?,?)').bind(discovery.url,discovery.snapshot).run();
      const entry=await db.prepare('SELECT * FROM relics WHERE url=?').bind(discovery.url).first();
      return json(request,{ok:true,entry:unpack(entry)},200,{'Cache-Control':'no-store'});
    }
    if (request.method!=='GET') return json(request,{ok:false,error:'method_not_allowed'},405);
    if (path==='/api/reliquary') {
      const before=Number(url.searchParams.get('before')||Number.MAX_SAFE_INTEGER);
      if(!Number.isSafeInteger(before)||before<1)return json(request,{ok:false,error:'invalid_cursor'},400);
      const {results}=await db.prepare('SELECT * FROM relics WHERE id<? ORDER BY id DESC LIMIT 21').bind(before).all();
      const more=results.length>20,rows=results.slice(0,20);
      return json(request,{ok:true,entries:rows.map(unpack),next:more?rows.at(-1).id:null},200,{'Cache-Control':'no-store'});
    }
    let row;
    if(path==='/api/reliquary/random')row=await db.prepare('SELECT * FROM relics WHERE id!=? ORDER BY RANDOM() LIMIT 1').bind(Number(url.searchParams.get('exclude'))||0).first();
    else if(/^\/api\/reliquary\/\d+$/.test(path))row=await db.prepare('SELECT * FROM relics WHERE id=?').bind(Number(path.split('/').pop())).first();
    else return json(request,{ok:false,error:'not_found'},404);
    return json(request,{ok:true,entry:row?unpack(row):null},row?200:404,{'Cache-Control':'no-store'});
  }
  if(path!=='/api/memorial')return json(request,{ok:false,error:'not_found'},404);
  if(request.method!=='GET')return json(request,{ok:false,error:'method_not_allowed'},405);
  let target;try{target=normalizeUrl(url.searchParams.get('url'));}catch{return json(request,{ok:false,error:'invalid_url'},400);}
  // A saved URL remains useful even if Wayback or the edge cache is down.
  if(env.RELIQUARY)try{
    const saved=await env.RELIQUARY.prepare('SELECT * FROM relics WHERE url=?').bind(target).first();
    if(saved)return json(request,{...JSON.parse(saved.snapshot),relicId:saved.id},200,{'Cache-Control':'no-store'});
  }catch{/* Storage trouble must not prevent a fresh archive lookup. */}
  const cache=caches.default,cacheKey=new Request(url.origin+'/api/memorial?v=2&url='+encodeURIComponent(target));
  let data;try{const cached=await cache.match(cacheKey);if(cached)data=await cached.json();}catch{}
  if(!data){
    data=await buildMemorial(target);
    if(data.ok)ctx.waitUntil(cache.put(cacheKey,new Response(JSON.stringify(data),{headers:{'Cache-Control':'public, max-age='+(data.archived?86400:300)}})).catch(()=>{}));
  }
  return json(request,await offerSave(data,env),data.ok?200:503,{'Cache-Control':'no-store'});
}
export default {
 async fetch(request,env,ctx){try{return await route(request,env,ctx);}catch{return json(request,{ok:false,error:'temporarily_unavailable'},503,{'Cache-Control':'no-store'});}}
};
