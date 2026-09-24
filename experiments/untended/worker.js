/**
 * untended — Cloudflare Worker
 *
 * The one piece of real shared state this experiment needs: when was the
 * garden last visited by anyone, and how many permanent scars has its
 * neglect earned so far. A static page has no way to hold that itself —
 * every visitor would just see their own local guess — so, same as
 * ../internet-is-haunted/worker.js, something has to sit in between and
 * hold the one real number everyone shares.
 *
 * (countapi.xyz, which ../decay and ../mutate lean on, is dead — the
 * domain no longer resolves at all. Its closest still-living replacement,
 * Abacus, has no timestamp field and its counters expire from inactivity,
 * which would erase this piece's memory during exactly the droughts that
 * matter most. Hence a dedicated Worker instead of another hosted counter.)
 *
 * State lives in one Workers KV entry: { lastTendedAt: <epoch ms>, scarCount }.
 *
 *   GET  /state   — read-only peek: returns the state as-is, tends nothing.
 *   POST /tend     — the real visit: computes how long the garden went
 *                    unvisited (server clock vs. the stored lastTendedAt,
 *                    never something the client supplies), turns any whole
 *                    SCAR_INTERVAL_MS of that drought into permanent scars
 *                    (capped at SCAR_CAP), writes the new state, and
 *                    returns the numbers the page should render: the
 *                    drought that just elapsed and the scar count *after*
 *                    folding in whatever this visit's neglect earned it.
 *                    lastTendedAt then becomes "now" for whoever's next.
 *
 * A never-touched counter (fresh KV, or first deploy) reads as genesis:
 * lastTendedAt null, scarCount 0, treated as zero drought rather than
 * infinite — the garden starts healthy, not pre-ruined.
 *
 * ---- Deploy (no CLI needed) ----
 * 1. dash.cloudflare.com → Workers & Pages → Create application →
 *    Create Worker → name it (e.g. untended-garden) → Deploy (placeholder
 *    is fine, replaced next).
 * 2. Edit code → delete the placeholder → paste this entire file →
 *    Save and deploy.
 * 3. Storage & Databases → KV → Create a namespace (e.g. UNTENDED_KV).
 * 4. Back on the Worker → Settings → Variables → Bindings → add a KV
 *    Namespace Binding: variable name GARDEN_KV, bound to the namespace
 *    from step 3. Save and deploy again.
 * 5. Copy the worker's URL (looks like
 *    https://untended-garden.YOUR-SUBDOMAIN.workers.dev).
 * 6. Paste that URL into WORKER_URL near the top of untended.js.
 *
 * Free tier: 100,000 requests/day, 1,000 KV writes/day, no card required —
 * this piece uses one KV read + maybe one write per visit, nowhere close.
 */

const ALLOWED_ORIGINS = [
  'https://joshurbandavis.github.io',
  'https://joshurbandavis.com',
  'https://www.joshurbandavis.com',
  // GitHub Pages doesn't enforce HTTPS on the custom domain, so real visits
  // land on the plain-http origin too — allow it rather than silently
  // failing every request from anyone who lands there (mostly first-time
  // mobile visits with no cached HTTPS preference for the domain).
  'http://joshurbandavis.com',
  'http://www.joshurbandavis.com',
];

const STATE_KEY = 'garden-state';
const SCAR_INTERVAL_MS = 24 * 60 * 60 * 1000; // one full day of neglect = one permanent scar
const SCAR_CAP = 60; // by 60 accumulated scars the piece is meant to read as fully unrecognizable

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
  return allowed ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {};
}

function json(request, obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign(
      { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      corsHeaders(request)
    ),
  });
}

async function readState(env) {
  const raw = await env.GARDEN_KV.get(STATE_KEY);
  if (!raw) return { lastTendedAt: null, scarCount: 0, events: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      lastTendedAt: typeof parsed.lastTendedAt === 'number' ? parsed.lastTendedAt : null,
      scarCount: typeof parsed.scarCount === 'number' ? parsed.scarCount : 0,
      events: Array.isArray(parsed.events) ? parsed.events.filter(e => Number.isFinite(e.at) && ['care','absence'].includes(e.kind)).slice(-24) : [],
    };
  } catch (e) {
    return { lastTendedAt: null, scarCount: 0, events: [] };
  }
}

async function writeState(env, state) {
  await env.GARDEN_KV.put(STATE_KEY, JSON.stringify(state));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (url.pathname === '/state' && request.method === 'GET') {
      const state = await readState(env);
      return json(request, {
        lastTendedAt: state.lastTendedAt,
        scarCount: state.scarCount,
        events: state.events,
        now: Date.now(),
      });
    }

    if (url.pathname === '/tend' && request.method === 'POST') {
      const state = await readState(env);
      const now = Date.now();
      const droughtMs = state.lastTendedAt === null ? 0 : Math.max(0, now - state.lastTendedAt);
      const newScars = Math.min(
        Math.floor(droughtMs / SCAR_INTERVAL_MS),
        Math.max(0, SCAR_CAP - state.scarCount)
      );
      const scarCount = state.scarCount + newScars;

      // Record anonymous care, never identities or addresses. Coalesce arrivals
      // in one minute so a busy period does not erase the sparse history.
      const events = state.events || [];
      if (newScars) events.push({ at: now, kind: 'absence', days: Math.floor(droughtMs / SCAR_INTERVAL_MS), scars: newScars });
      const previous = events[events.length - 1];
      if (!previous || previous.kind !== 'care' || now - previous.at >= 60000) events.push({ at: now, kind: 'care' });
      const recent = events.slice(-24);
      await writeState(env, { lastTendedAt: now, scarCount: scarCount, events: recent });

      return json(request, {
        droughtMs: droughtMs,
        events: recent,
        scarCount: scarCount,
        scarCap: SCAR_CAP,
        newScars: newScars,
        now: now,
      });
    }

    return new Response('not found', { status: 404, headers: corsHeaders(request) });
  },
};
