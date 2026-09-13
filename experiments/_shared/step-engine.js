/*
 * step-engine.js
 *
 * Shared plumbing for the "shared clock" experiments — pieces where every
 * visitor (site-wide, not per-browser) advances the same counter, and each
 * step unlocks one more irreversible change: something removed, something
 * altered, something transformed toward a target.
 *
 * Backed by countapi.xyz (free, no auth — a single GET increments a named
 * counter and returns the new value). If that service is unreachable, this
 * quietly falls back to a local per-browser counter in localStorage, so a
 * dead third party never breaks the page — the piece just temporarily loses
 * its "shared" quality until the service comes back.
 *
 * Usage:
 *   const { value, max, shared } = await StepEngine.getStep({
 *     namespace: 'joshurbandavis-github-io',
 *     key: 'spacejam-transform',
 *     max: 12
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
  function storageKey(namespace, key, suffix) {
    return 'stepengine:' + namespace + ':' + key + (suffix ? ':' + suffix : '');
  }

  function readLocal(sKey) {
    return parseInt(localStorage.getItem(sKey) || '0', 10);
  }

  function writeLocal(sKey, v) {
    try { localStorage.setItem(sKey, String(v)); } catch (e) { /* storage unavailable */ }
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
        var peekRes = await fetch('https://api.countapi.xyz/get/' + namespace + '/' + key, { cache: 'no-store' });
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
      var res = await fetch('https://api.countapi.xyz/hit/' + namespace + '/' + key, { cache: 'no-store' });
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
