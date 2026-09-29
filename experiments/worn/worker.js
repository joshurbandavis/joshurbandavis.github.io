/**
 * worn -- Cloudflare Worker
 *
 * Holds the faces people agree to leave in the mirror, so a stranger can wear
 * them. Each face is only what the page already keeps: a small JPEG cropped to the
 * face (forehead to chin, a little margin) and its 468-point landmark map. No name,
 * no location, nothing else about the person. IP addresses are never stored --
 * only a salted hash, briefly, to rate-limit uploads.
 *
 * Storage is one Workers KV namespace (binding FACES):
 *   face:<id>   -> { img: "data:image/jpeg;base64,...", uv: [936 numbers], t, del: <sha256 of delete token>, reports }
 *   index       -> [{ id, t }, ...] newest last, capped at INDEX_CAP
 *   rl:<hash>   -> upload rate limit marker (expires on its own)
 *
 *   GET    /faces            the newest faces' ids and times (what the mirror can wear)
 *   GET    /face/<id>        one face: { img, uv, t }  (immutable, so cached hard)
 *   POST   /face             leave a face: { img, uv } -> { id, token }. The token is the
 *                            only way to delete it later; the page keeps it in the
 *                            visitor's own browser.
 *   DELETE /face/<id>        remove a face: header X-Worn-Token (the leaver's token) or
 *                            X-Worn-Admin (ADMIN_TOKEN, a Worker secret, for the site owner)
 *   POST   /face/<id>/report someone found a face they shouldn't have been handed; at
 *                            REPORT_LIMIT reports it leaves the index until reviewed
 *
 * ---- Deploy (no CLI needed) ----
 * 1. dash.cloudflare.com -> Workers & Pages -> Create -> Create Worker -> name it
 *    worn-faces -> Deploy (the placeholder is replaced next).
 * 2. Edit code -> delete the placeholder -> paste this whole file -> Deploy.
 * 3. Storage & Databases -> KV -> Create a namespace (e.g. WORN_FACES).
 * 4. Back on the Worker -> Settings -> Bindings -> Add -> KV namespace:
 *    variable name FACES, bound to the namespace from step 3.
 * 5. Settings -> Variables and Secrets -> Add -> type Secret: name ADMIN_TOKEN, value
 *    any long random string you keep (it deletes any face). Deploy again.
 * 6. Copy the Worker's URL (https://worn-faces.<your-subdomain>.workers.dev) into
 *    WORKER_URL near the top of the script in experiments/worn/index.html.
 *
 * Removing a face as the owner (from a terminal):
 *   curl -X DELETE -H "X-Worn-Admin: <ADMIN_TOKEN>" https://worn-faces.<...>.workers.dev/face/<id>
 * Listing reported faces:  GET /reported with the same header.
 *
 * Free tier: 100,000 requests/day, 1,000 KV writes/day. An upload is ~3 writes; a
 * visit is a few reads. Plenty for this.
 */

const ALLOWED_ORIGINS = [
  'https://joshurbandavis.com',
  'https://www.joshurbandavis.com',
  'https://joshurbandavis.github.io',
  'http://localhost:8790', // local testing
];
const INDEX_CAP = 200;          // faces kept in rotation; older ones fall out of the index
const SERVE_CAP = 40;           // how many the mirror is handed at once
const MAX_IMG_BYTES = 180000;   // the page sends ~30-60KB; anything much bigger isn't ours
const UPLOAD_EVERY_S = 60;      // one face per IP-hash per minute
const REPORT_LIMIT = 2;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Worn-Token, X-Worn-Admin',
      'Vary': 'Origin',
    };
    const json = (body, status = 200, extra = {}) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors, ...extra } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!env.FACES) return json({ error: 'storage not bound (FACES)' }, 500);

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const isAdmin = env.ADMIN_TOKEN && request.headers.get('X-Worn-Admin') === env.ADMIN_TOKEN;

    try {
      // ---- the faces on offer ----
      if (request.method === 'GET' && parts[0] === 'faces' && parts.length === 1) {
        const index = await readIndex(env);
        return json(index.slice(-SERVE_CAP), 200, { 'Cache-Control': 'public, max-age=20' });
      }

      // ---- one face ----
      if (request.method === 'GET' && parts[0] === 'face' && parts.length === 2) {
        const face = await env.FACES.get('face:' + parts[1], 'json');
        if (!face || face.hidden) return json({ error: 'gone' }, 404);
        return json({ img: face.img, uv: face.uv, t: face.t }, 200, { 'Cache-Control': 'public, max-age=86400' });
      }

      // ---- leave a face ----
      if (request.method === 'POST' && parts[0] === 'face' && parts.length === 1) {
        if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: 'not from the mirror' }, 403);
        const ipHash = await sha256(env.RATE_SALT || 'worn' + (request.headers.get('CF-Connecting-IP') || ''));
        if (await env.FACES.get('rl:' + ipHash)) return json({ error: 'one face a minute, please' }, 429);

        const body = await request.json().catch(() => null);
        const problem = validate(body);
        if (problem) return json({ error: problem }, 400);

        const id = randomId(10), token = randomId(24), t = Date.now();
        await env.FACES.put('face:' + id, JSON.stringify({ img: body.img, uv: body.uv, t, del: await sha256(token), reports: 0 }));
        const index = await readIndex(env);
        index.push({ id, t });
        while (index.length > INDEX_CAP) index.shift();
        await env.FACES.put('index', JSON.stringify(index));
        await env.FACES.put('rl:' + ipHash, '1', { expirationTtl: UPLOAD_EVERY_S });
        return json({ id, token }, 201);
      }

      // ---- remove a face (its leaver, or the site owner) ----
      if (request.method === 'DELETE' && parts[0] === 'face' && parts.length === 2) {
        const face = await env.FACES.get('face:' + parts[1], 'json');
        if (!face) return json({ ok: true }); // already gone
        const token = request.headers.get('X-Worn-Token') || '';
        if (!isAdmin && (await sha256(token)) !== face.del) return json({ error: 'not yours to remove' }, 403);
        await env.FACES.delete('face:' + parts[1]);
        await removeFromIndex(env, parts[1]);
        return json({ ok: true });
      }

      // ---- report a face ----
      if (request.method === 'POST' && parts[0] === 'face' && parts[2] === 'report') {
        const face = await env.FACES.get('face:' + parts[1], 'json');
        if (!face) return json({ ok: true });
        face.reports = (face.reports || 0) + 1;
        if (face.reports >= REPORT_LIMIT) { face.hidden = true; await removeFromIndex(env, parts[1]); }
        await env.FACES.put('face:' + parts[1], JSON.stringify(face));
        return json({ ok: true });
      }

      // ---- owner: faces that were reported off the mirror ----
      if (request.method === 'GET' && parts[0] === 'reported' && isAdmin) {
        const out = [];
        let cursor;
        do {
          const page = await env.FACES.list({ prefix: 'face:', cursor });
          for (const k of page.keys) {
            const f = await env.FACES.get(k.name, 'json');
            if (f && f.hidden) out.push({ id: k.name.slice(5), t: f.t, reports: f.reports });
          }
          cursor = page.list_complete ? null : page.cursor;
        } while (cursor);
        return json(out);
      }

      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: 'the mirror stumbled' }, 500);
    }
  },
};

function validate(b) {
  if (!b || typeof b.img !== 'string' || !Array.isArray(b.uv)) return 'expected { img, uv }';
  if (!b.img.startsWith('data:image/jpeg;base64,')) return 'expected a jpeg data url';
  if (b.img.length > MAX_IMG_BYTES) return 'image too large';
  if (b.uv.length !== 936) return 'expected 468 landmark points';
  if (!b.uv.every(v => typeof v === 'number' && isFinite(v) && v > -0.5 && v < 1.5)) return 'landmarks out of range';
  return null;
}

async function readIndex(env) {
  return (await env.FACES.get('index', 'json')) || [];
}
async function removeFromIndex(env, id) {
  const index = await readIndex(env);
  const next = index.filter(e => e.id !== id);
  if (next.length !== index.length) await env.FACES.put('index', JSON.stringify(next));
}

function randomId(n) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return [...bytes].map(b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
}
async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
