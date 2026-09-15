/**
 * Shared step-counter Worker for decay/ and mutate/ — replaces the dead
 * countapi.xyz service step-engine.js used to depend on.
 *
 * Backed by a Durable Object: every request for the same {namespace}/{key}
 * gets routed to the exact same single Durable Object instance, which
 * serializes all access to it - so "increment by 1" is genuinely atomic,
 * not eventually-consistent the way plain Workers KV would be (KV was
 * considered and rejected for exactly this reason - see the README).
 *
 * Endpoints (mirroring the old countapi.xyz shape, so step-engine.js's
 * URL construction barely has to change):
 *   GET /hit/{namespace}/{key}   - increment by 1, return the new value
 *   GET /get/{namespace}/{key}   - read the current value, don't increment
 *
 * ---- Deploy ----
 * This one DOES need the Wrangler CLI (unlike internet-is-haunted's
 * worker.js) - Durable Object bindings aren't something you can paste into
 * the dashboard's code editor the way a plain Worker is. From this folder:
 *
 *   npm install -g wrangler        (skip if you already have it)
 *   wrangler login                 (opens a browser to authorize once)
 *   wrangler deploy
 *
 * That prints your Worker's URL (looks like
 * https://jud-experiments-counter.YOUR-SUBDOMAIN.workers.dev). Paste that
 * into COUNTER_WORKER_URL near the top of ../step-engine.js.
 *
 * Free tier: 100,000 requests/day, 100,000 row writes/day (SQLite-backed
 * Durable Objects, which is what wrangler.toml's `storage = "sqlite"`
 * requests - the only backend available without the paid Workers plan).
 */

const ALLOWED_ORIGINS = [
  'https://joshurbandavis.github.io',
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function jsonResponse(data, origin, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  });
}

export class Counter {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    let value = (await this.state.storage.get('value')) || 0;
    if (url.pathname === '/hit') {
      value += 1;
      await this.state.storage.put('value', value);
    }
    // any other path (e.g. /get) just reads the current value
    return new Response(JSON.stringify({ value }), {
      headers: { 'content-type': 'application/json' },
    });
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean); // ["hit"|"get", namespace, key]

    if (parts.length !== 3 || (parts[0] !== 'hit' && parts[0] !== 'get')) {
      return jsonResponse(
        { error: 'expected /hit/{namespace}/{key} or /get/{namespace}/{key}' },
        origin,
        400
      );
    }

    const [op, namespace, key] = parts;
    const id = env.COUNTER.idFromName(namespace + ':' + key);
    const stub = env.COUNTER.get(id);
    const doResponse = await stub.fetch('https://do/' + op);
    const data = await doResponse.json();
    return jsonResponse(data, origin);
  },
};
