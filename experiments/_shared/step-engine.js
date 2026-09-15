/*
 * step-engine.js
 *
 * Shared plumbing for the "shared clock" experiments — pieces where every
 * visitor (site-wide, not per-browser) advances the same counter, and each
 * step unlocks one more irreversible change: something removed, something
 * altered, something transformed toward a target.
 *
 * Backed by a small Cloudflare Worker + Durable Object (see
 * ../_shared/counter-worker/ for the code and deploy steps) — a genuinely
 * atomic counter, not eventually-consistent. This replaces countapi.xyz,
 * which is now permanently dead (DNS doesn't resolve at all). If the
 * Worker is unreachable — including because COUNTER_WORKER_URL below is
 * still the placeholder, i.e. it hasn't been deployed yet — this quietly
 * falls back to a local per-browser counter in localStorage, so a dead or
 * unconfigured backend never breaks the page; the piece just temporarily
 * loses its "shared" quality.
 *
 * Usage:
 *   const { value, max, shared } = await StepEngine.getStep({
 *     namespace: 'joshurbandavis-github-io',
 *     key: 'decay-erasure',
 *     max: 106
 *   });
 *
 * Dev mode: append ?dev=1 to the URL to bump a separate, purely local
 * counter (namespace/key + ':dev') instead of the real shared one — use
 * this while building/testing so you don't burn through real visits.
 *
 * Peek mode: append ?peek=1 to read the current shared value WITHOUT
 * incrementing it — use this to check where the piece is without advancing it.
 */
(function (global) {
  // Set this once the Worker in ../counter-worker/ is deployed (its URL
  // looks like https://jud-experiments-counter.YOUR-SUBDOMAIN.workers.dev).
  // Left as the placeholder, every getStep() call below fails fast and
  // falls back to local-only counting — same safe behavior as a genuinely
  // dead backend, not a special case.
  var COUNTER_WORKER_URL = 'https://jud-experiments-counter.joshurbandavis.workers.dev';

  function storageKey(namespace, key, suffix) {
    return 'stepengine:' + namespace + ':' + key + (suffix ? ':' + suffix : '');
  }

  function readLocal(sKey) {
    return parseInt(localStorage.getItem(sKey) || '0', 10);
  }

  function writeLocal(sKey, v) {
    try { localStorage.setItem(sKey, String(v)); } catch (e) { /* storage unavailable */ }
  }

  // A dead/unreachable host can otherwise take many seconds to actually
  // fail (DNS retries, connection timeouts) — during which the page shows
  // nothing new, which reads as "broken," not "loading." Cap the wait so
  // the local fallback kicks in fast regardless of why the network call
  // didn't come back in time.
  function fetchWithTimeout(url, ms) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, ms);
    return fetch(url, { cache: 'no-store', signal: controller.signal }).finally(function () {
      clearTimeout(timer);
    });
  }

  async function getStep(opts) {
    var namespace = opts.namespace;
    var key = opts.key;
    var max = opts.max;
    var params = new URLSearchParams(location.search);
    var dev = params.has('dev');
    var peek = params.has('peek');

    if (dev) {
      var devKey = storageKey(namespace, key, 'dev');
      var v = peek ? readLocal(devKey) : readLocal(devKey) + 1;
      if (!peek) writeLocal(devKey, v);
      return { value: Math.min(v, max), max: max, shared: false, dev: true };
    }

    var cacheKey = storageKey(namespace, key, null);

    if (peek) {
      try {
        var peekRes = await fetchWithTimeout(COUNTER_WORKER_URL + '/get/' + namespace + '/' + key, 2500);
        if (!peekRes.ok) throw new Error('bad status');
        var peekData = await peekRes.json();
        var peekVal = peekData.value || 0;
        writeLocal(cacheKey, peekVal);
        return { value: Math.min(peekVal, max), max: max, shared: true, dev: false };
      } catch (e) {
        return { value: Math.min(readLocal(cacheKey), max), max: max, shared: false, dev: false };
      }
    }

    try {
      var res = await fetchWithTimeout(COUNTER_WORKER_URL + '/hit/' + namespace + '/' + key, 2500);
      if (!res.ok) throw new Error('bad status');
      var data = await res.json();
      var newVal = data.value;
      writeLocal(cacheKey, newVal);
      return { value: Math.min(newVal, max), max: max, shared: true, dev: false };
    } catch (e) {
      // Offline / service down: advance a local fallback counter so the
      // page still does *something*, but mark it as not-shared.
      var fallbackVal = readLocal(cacheKey) + 1;
      writeLocal(cacheKey, fallbackVal);
      return { value: Math.min(fallbackVal, max), max: max, shared: false, dev: false };
    }
  }

  global.StepEngine = { getStep: getStep };
})(window);
