/*
 * untended.js
 *
 * A still life that only stays whole if someone keeps showing up. Telegarden
 * (1995) was one real greenhouse, tended remotely by whoever logged in;
 * this is the same shape in miniature — one shared painting, and the only
 * thing that keeps it looking like a painting is visits.
 *
 * Two layers of damage, on purpose:
 *
 *   - PERMANENT SCARS — real, shared, never undone. Every full day (see
 *     SCAR_INTERVAL_MS) the garden went completely unvisited by anyone
 *     earns one scar, tracked as a single number in worker.js's KV store.
 *     Each scar's exact look (which glitch, where, how strong) is derived
 *     from its own index through a seeded PRNG — not stored itself, just
 *     replayed — the same "no extra storage, deterministic replay" trick
 *     ../decay and ../mutate use for their own step sequences. So the
 *     scars you see are always exactly reproducible from one integer, and
 *     they only ever accumulate: tending the garden resets the *clock*,
 *     it does not erase what neglect already earned. Vanitas still lifes
 *     already carry this exact idea in their own vocabulary — a wilting
 *     petal, an insect, an hourglass, painted into an otherwise perfect
 *     bouquet as a reminder that none of it stays this way. The scars are
 *     this piece's version of that: written into the bouquet itself,
 *     permanently, by real elapsed time.
 *
 *   - THE LIVE, EPHEMERAL TREMBLE — not stored anywhere, genuinely
 *     randomized with Math.random() on every render, and it eases the
 *     moment someone visits. Its strength tracks how long the *current*
 *     drought has run (real wall-clock time since the last visit, from
 *     worker.js's stored timestamp — never something this page invents).
 *     A garden tended an hour ago sits calm and still; one left alone for
 *     a week visibly trembles and re-glitches while you watch, on an
 *     unpredictable timer, because nothing is currently tending it either.
 *
 * No shared backend configured yet (WORKER_URL below still says
 * YOUR-SUBDOMAIN) → the page runs the exact same arithmetic against
 * localStorage instead, clearly labeled as local-only in the corner
 * readout. Same fallback philosophy as every other piece here: a third
 * party being down (or, here, simply not deployed yet) should degrade the
 * piece, never break it. See worker.js's header for why this needed a
 * dedicated Worker instead of another hosted counter service.
 */
(function () {
  var WORKER_URL = 'https://untended-garden.YOUR-SUBDOMAIN.workers.dev';
  var CONFIGURED = !!WORKER_URL && WORKER_URL.indexOf('YOUR-SUBDOMAIN') === -1;

  var SEED_KEY = 'joshurbandavis-github-io:untended-garden';
  var SCAR_INTERVAL_MS = 24 * 60 * 60 * 1000; // must match worker.js
  var SCAR_CAP = 60; // must match worker.js
  var EPHEMERAL_FULL_MS = 7 * 24 * 60 * 60 * 1000; // one week of drought = live tremble maxed out
  var LIVE_TREMBLE_MIN_RATIO = 0.12; // below this, the piece just sits still

  var LOCAL_KEY = 'untended:state:v1';
  var LOCAL_DEV_KEY = 'untended:state:dev:v1';

  var INTERNAL_SIZE = 750; // source is 1500x1500; half-res keeps per-pixel passes fast

  // ---------- seeded RNG (same mulberry32 + FNV-1a shape as decay.js/mutate.js) ----------
  function hash32(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- glitch primitives — operate on {data,width,height} ImageData in place ----------
  // Sources: brightness-threshold run sorting is Kim Asendorf's ASDF Pixel
  // Sort (2010) reduced to one band instead of the whole frame; the wave
  // displacement's per-row sinusoidal offset is the same idea driving the
  // vertex displacement in glitch_photo/mySketch.js, just applied to pixels
  // instead of a plotted line. Channel-slice, block-corrupt and scanline
  // tear are standard glitch-art vocabulary alongside those two.

  function brightnessAt(d, i) { return (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722); }

  function pixelSortBand(img, orientation, start, end, threshold, above) {
    var d = img.data, w = img.width, h = img.height;
    if (orientation === 'row') {
      for (var y = start; y < end && y < h; y++) {
        var x = 0;
        while (x < w) {
          var inRun = above ? brightnessAt(d, (y * w + x) * 4) > threshold : brightnessAt(d, (y * w + x) * 4) < threshold;
          if (!inRun) { x++; continue; }
          var xEnd = x;
          while (xEnd < w && (above ? brightnessAt(d, (y * w + xEnd) * 4) > threshold : brightnessAt(d, (y * w + xEnd) * 4) < threshold)) xEnd++;
          sortRun(d, w, y, x, xEnd, true);
          x = xEnd + 1;
        }
      }
    } else {
      for (var xc = start; xc < end && xc < w; xc++) {
        var yy = 0;
        while (yy < h) {
          var inRunC = above ? brightnessAt(d, (yy * w + xc) * 4) > threshold : brightnessAt(d, (yy * w + xc) * 4) < threshold;
          if (!inRunC) { yy++; continue; }
          var yEnd = yy;
          while (yEnd < h && (above ? brightnessAt(d, (yEnd * w + xc) * 4) > threshold : brightnessAt(d, (yEnd * w + xc) * 4) < threshold)) yEnd++;
          sortRunCol(d, w, xc, yy, yEnd);
          yy = yEnd + 1;
        }
      }
    }
  }

  function sortRun(d, w, y, x0, x1, isRow) {
    var n = x1 - x0;
    if (n < 2) return;
    var px = new Array(n);
    for (var i = 0; i < n; i++) {
      var idx = (y * w + x0 + i) * 4;
      px[i] = [d[idx], d[idx + 1], d[idx + 2], d[idx + 3]];
    }
    px.sort(function (a, b) { return (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]); });
    for (var j = 0; j < n; j++) {
      var idx2 = (y * w + x0 + j) * 4;
      d[idx2] = px[j][0]; d[idx2 + 1] = px[j][1]; d[idx2 + 2] = px[j][2]; d[idx2 + 3] = px[j][3];
    }
  }

  function sortRunCol(d, w, x, y0, y1) {
    var n = y1 - y0;
    if (n < 2) return;
    var px = new Array(n);
    for (var i = 0; i < n; i++) {
      var idx = ((y0 + i) * w + x) * 4;
      px[i] = [d[idx], d[idx + 1], d[idx + 2], d[idx + 3]];
    }
    px.sort(function (a, b) { return (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]); });
    for (var j = 0; j < n; j++) {
      var idx2 = ((y0 + j) * w + x) * 4;
      d[idx2] = px[j][0]; d[idx2 + 1] = px[j][1]; d[idx2 + 2] = px[j][2]; d[idx2 + 3] = px[j][3];
    }
  }

  function channelShiftSlice(img, y0, y1, dx, channel) {
    var d = img.data, w = img.width, h = img.height;
    y1 = Math.min(y1, h);
    for (var y = y0; y < y1; y++) {
      var row = new Uint8ClampedArray(w);
      for (var x = 0; x < w; x++) row[x] = d[(y * w + x) * 4 + channel];
      for (var x2 = 0; x2 < w; x2++) {
        var srcX = ((x2 - dx) % w + w) % w;
        d[(y * w + x2) * 4 + channel] = row[srcX];
      }
    }
  }

  function blockCorrupt(img, x, y, bw, bh, srcX, srcY) {
    var d = img.data, w = img.width, h = img.height;
    bw = Math.min(bw, w); bh = Math.min(bh, h);
    var tmp = new Uint8ClampedArray(bw * bh * 4);
    for (var row = 0; row < bh; row++) {
      var sy = ((srcY + row) % h + h) % h;
      for (var col = 0; col < bw; col++) {
        var sx = ((srcX + col) % w + w) % w;
        var sIdx = (sy * w + sx) * 4, tIdx = (row * bw + col) * 4;
        tmp[tIdx] = d[sIdx]; tmp[tIdx + 1] = d[sIdx + 1]; tmp[tIdx + 2] = d[sIdx + 2]; tmp[tIdx + 3] = d[sIdx + 3];
      }
    }
    for (var row2 = 0; row2 < bh; row2++) {
      var dy = y + row2; if (dy < 0 || dy >= h) continue;
      for (var col2 = 0; col2 < bw; col2++) {
        var dxp = x + col2; if (dxp < 0 || dxp >= w) continue;
        var dIdx = (dy * w + dxp) * 4, sIdx2 = (row2 * bw + col2) * 4;
        d[dIdx] = tmp[sIdx2]; d[dIdx + 1] = tmp[sIdx2 + 1]; d[dIdx + 2] = tmp[sIdx2 + 2]; d[dIdx + 3] = tmp[sIdx2 + 3];
      }
    }
  }

  function scanlineTear(img, y0, y1, dx) {
    var d = img.data, w = img.width, h = img.height;
    y1 = Math.min(y1, h);
    for (var y = y0; y < y1; y++) {
      var row = new Uint8ClampedArray(w * 4);
      for (var x = 0; x < w; x++) {
        var idx = (y * w + x) * 4;
        row[x * 4] = d[idx]; row[x * 4 + 1] = d[idx + 1]; row[x * 4 + 2] = d[idx + 2]; row[x * 4 + 3] = d[idx + 3];
      }
      for (var x2 = 0; x2 < w; x2++) {
        var srcX = ((x2 - dx) % w + w) % w;
        var dIdx = (y * w + x2) * 4;
        d[dIdx] = row[srcX * 4]; d[dIdx + 1] = row[srcX * 4 + 1]; d[dIdx + 2] = row[srcX * 4 + 2]; d[dIdx + 3] = row[srcX * 4 + 3];
      }
    }
  }

  function waveDisplace(img, y0, y1, amplitude, freq, phase) {
    var d = img.data, w = img.width, h = img.height;
    y1 = Math.min(y1, h);
    for (var y = y0; y < y1; y++) {
      var shift = Math.round(amplitude * Math.sin(freq * y + phase));
      if (shift === 0) continue;
      scanlineTear(img, y, y + 1, shift);
    }
  }

  // ---------- deriving one scar's look from its index alone ----------
  var SCAR_TYPES = ['sort-row', 'sort-col', 'channel-slice', 'block-corrupt', 'scanline-tear', 'wave-displace'];

  function applyScar(img, index) {
    var rng = mulberry32(hash32(SEED_KEY + ':scar:' + index));
    var w = img.width, h = img.height;
    var type = SCAR_TYPES[Math.floor(rng() * SCAR_TYPES.length)];
    // later scars hit a little harder — accumulated fatigue, not reset per scar
    var fatigue = Math.min(1, index / SCAR_CAP);
    var bandFrac = 0.04 + rng() * 0.10 * (1 + fatigue);

    if (type === 'sort-row') {
      var y0 = Math.floor(rng() * h);
      var bh = Math.max(6, Math.floor(h * bandFrac));
      pixelSortBand(img, 'row', y0, y0 + bh, 60 + rng() * 120, rng() > 0.5);
    } else if (type === 'sort-col') {
      var x0 = Math.floor(rng() * w);
      var bw = Math.max(6, Math.floor(w * bandFrac));
      pixelSortBand(img, 'col', x0, x0 + bw, 60 + rng() * 120, rng() > 0.5);
    } else if (type === 'channel-slice') {
      var yy0 = Math.floor(rng() * h);
      var sh = Math.max(4, Math.floor(h * bandFrac));
      var dx = Math.floor((rng() - 0.5) * w * (0.05 + 0.1 * fatigue));
      channelShiftSlice(img, yy0, yy0 + sh, dx, Math.floor(rng() * 3));
    } else if (type === 'block-corrupt') {
      var bw2 = Math.floor(w * (0.08 + rng() * 0.14));
      var bh2 = Math.floor(h * (0.08 + rng() * 0.14));
      var x1 = Math.floor(rng() * w), y1c = Math.floor(rng() * h);
      var sx = Math.floor(rng() * w), sy = Math.floor(rng() * h);
      blockCorrupt(img, x1, y1c, bw2, bh2, sx, sy);
    } else if (type === 'scanline-tear') {
      var ty0 = Math.floor(rng() * h);
      var th = Math.max(4, Math.floor(h * bandFrac));
      var tdx = Math.floor((rng() - 0.5) * w * (0.1 + 0.15 * fatigue));
      scanlineTear(img, ty0, ty0 + th, tdx);
    } else {
      var wy0 = Math.floor(rng() * h);
      var wh = Math.max(20, Math.floor(h * (0.15 + rng() * 0.2)));
      waveDisplace(img, wy0, wy0 + wh, 6 + rng() * 18 * (1 + fatigue), 0.05 + rng() * 0.1, rng() * Math.PI * 2);
    }
  }

  // ---------- live, ephemeral pass — true Math.random(), never persisted ----------
  function applyEphemeralPass(img, ratio) {
    var w = img.width, h = img.height;
    var passes = Math.round(ratio * 5); // 0..5 live passes depending on current drought
    for (var p = 0; p < passes; p++) {
      var r = Math.random();
      var mag = 0.4 + ratio * 0.6;
      if (r < 0.22) {
        var y0 = Math.floor(Math.random() * h);
        pixelSortBand(img, 'row', y0, y0 + Math.max(6, Math.floor(h * 0.05 * mag)), 60 + Math.random() * 120, Math.random() > 0.5);
      } else if (r < 0.44) {
        var yy0 = Math.floor(Math.random() * h);
        channelShiftSlice(img, yy0, yy0 + Math.max(4, Math.floor(h * 0.05 * mag)), Math.floor((Math.random() - 0.5) * w * 0.12 * mag), Math.floor(Math.random() * 3));
      } else if (r < 0.66) {
        var bw = Math.floor(w * 0.06 * mag) + 20, bh = Math.floor(h * 0.06 * mag) + 20;
        blockCorrupt(img, Math.floor(Math.random() * w), Math.floor(Math.random() * h), bw, bh, Math.floor(Math.random() * w), Math.floor(Math.random() * h));
      } else if (r < 0.85) {
        var ty0 = Math.floor(Math.random() * h);
        scanlineTear(img, ty0, ty0 + Math.max(3, Math.floor(h * 0.03 * mag)), Math.floor((Math.random() - 0.5) * w * 0.18 * mag));
      } else {
        var wy0 = Math.floor(Math.random() * h);
        waveDisplace(img, wy0, wy0 + Math.max(20, Math.floor(h * 0.18)), 4 + Math.random() * 14 * mag, 0.04 + Math.random() * 0.12, Math.random() * Math.PI * 2);
      }
    }
  }

  // ---------- shared-state fetch, with local fallback ----------
  function fetchWithTimeout(url, opts, ms) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, ms);
    return fetch(url, Object.assign({ cache: 'no-store', signal: controller.signal }, opts)).finally(function () {
      clearTimeout(timer);
    });
  }

  // shared by the real local-fallback path and ?dev=1 — same arithmetic
  // worker.js runs server-side, just against localStorage instead of KV.
  function computeTend(storageKey, peek) {
    var raw;
    try { raw = localStorage.getItem(storageKey); } catch (e) { raw = null; }
    var state = raw ? JSON.parse(raw) : { lastTendedAt: null, scarCount: 0 };
    var now = Date.now();
    var drought = state.lastTendedAt === null ? 0 : Math.max(0, now - state.lastTendedAt);
    if (peek) return { droughtMs: drought, scarCount: state.scarCount, now: now };
    var newScars = Math.min(Math.floor(drought / SCAR_INTERVAL_MS), Math.max(0, SCAR_CAP - state.scarCount));
    var scarCount = state.scarCount + newScars;
    try { localStorage.setItem(storageKey, JSON.stringify({ lastTendedAt: now, scarCount: scarCount })); } catch (e) { /* unavailable */ }
    return { droughtMs: drought, scarCount: scarCount, now: now };
  }

  function getGardenState() {
    var params = new URLSearchParams(location.search);
    var dev = params.has('dev');
    var peek = params.has('peek');

    if (params.has('reset') && dev) {
      try { localStorage.removeItem(LOCAL_DEV_KEY); } catch (e) { /* ignore */ }
    }

    // pure rendering overrides — never touch network or storage, just preview a state
    if (params.has('drought') || params.has('scars')) {
      var hours = parseFloat(params.get('drought') || '0') || 0;
      var scars = parseInt(params.get('scars') || '0', 10) || 0;
      return Promise.resolve({
        droughtMs: Math.max(0, hours) * 60 * 60 * 1000,
        scarCount: Math.min(Math.max(0, scars), SCAR_CAP),
        shared: false,
        preview: true,
      });
    }

    if (dev) {
      return Promise.resolve(Object.assign(computeTend(LOCAL_DEV_KEY, peek), { shared: false, dev: true }));
    }

    if (!CONFIGURED) {
      return Promise.resolve(Object.assign(computeTend(LOCAL_KEY, peek), { shared: false, notConfigured: true }));
    }

    var path = peek ? '/state' : '/tend';
    var opts = peek ? {} : { method: 'POST' };
    return fetchWithTimeout(WORKER_URL + path, opts, 4000)
      .then(function (res) {
        if (!res.ok) throw new Error('bad status');
        return res.json();
      })
      .then(function (data) {
        return {
          droughtMs: peek ? Math.max(0, data.now - (data.lastTendedAt || data.now)) : data.droughtMs,
          scarCount: Math.min(data.scarCount, SCAR_CAP),
          shared: true,
        };
      })
      .catch(function () {
        return Object.assign(computeTend(LOCAL_KEY, peek), { shared: false, workerUnreachable: true });
      });
  }

  // ---------- rendering ----------
  function formatDuration(ms) {
    var s = Math.floor(ms / 1000);
    if (s < 60) return 'moments';
    var m = Math.floor(s / 60);
    if (m < 60) return m + 'm';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h ' + (m % 60) + 'm';
    var d = Math.floor(h / 24);
    return d + 'd ' + (h % 24) + 'h';
  }

  function init() {
    var canvas = document.getElementById('gardenCanvas');
    var chrome = document.getElementById('utChrome');
    var banner = document.getElementById('utBanner');
    if (!CONFIGURED && banner) banner.hidden = false;

    var img = new Image();
    img.onload = function () {
      var off = document.createElement('canvas');
      off.width = INTERNAL_SIZE; off.height = INTERNAL_SIZE;
      var offCtx = off.getContext('2d');
      offCtx.drawImage(img, 0, 0, INTERNAL_SIZE, INTERNAL_SIZE);

      var baseData;
      try {
        baseData = offCtx.getImageData(0, 0, INTERNAL_SIZE, INTERNAL_SIZE);
      } catch (e) {
        // Opened directly via file:// — browsers treat that as an opaque
        // origin and refuse pixel reads off a canvas holding it (a real
        // security restriction, not a bug in this page). Serving the page
        // over any real http(s) origin — a local `python3 -m http.server`,
        // or the deployed GitHub Pages URL — resolves it.
        if (chrome) chrome.textContent = 'canvas blocked reading pixels — open this over http(s), not file:// (e.g. `python3 -m http.server` from this folder)';
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width || INTERNAL_SIZE, canvas.height || INTERNAL_SIZE);
        return;
      }

      canvas.width = INTERNAL_SIZE; canvas.height = INTERNAL_SIZE;
      var ctx = canvas.getContext('2d');

      getGardenState().then(function (state) {
        // build the scarred (permanent) base once
        var scarred = new ImageData(new Uint8ClampedArray(baseData.data), INTERNAL_SIZE, INTERNAL_SIZE);
        for (var i = 1; i <= state.scarCount; i++) applyScar(scarred, i);

        var ratio = Math.max(0, Math.min(1, state.droughtMs / EPHEMERAL_FULL_MS));

        function renderFrame() {
          var frame = new ImageData(new Uint8ClampedArray(scarred.data), INTERNAL_SIZE, INTERNAL_SIZE);
          if (ratio > 0) applyEphemeralPass(frame, ratio);
          ctx.putImageData(frame, 0, 0);
        }
        renderFrame();

        if (ratio >= LIVE_TREMBLE_MIN_RATIO) {
          var scheduleNext = function () {
            var delay = 4000 + Math.random() * 5000;
            setTimeout(function () {
              if (document.visibilityState === 'visible') renderFrame();
              scheduleNext();
            }, delay);
          };
          scheduleNext();
        }

        if (chrome) {
          var bits = [];
          if (state.preview) {
            bits.push('preview — ' + formatDuration(state.droughtMs) + ' drought, ' + state.scarCount + ' scars');
          } else {
            bits.push(state.droughtMs === 0 ? 'just tended' : 'unvisited ' + formatDuration(state.droughtMs) + ' before this');
            bits.push(state.scarCount + ' of ' + SCAR_CAP + ' scars');
            if (state.dev) bits.push('dev — local only, not the real garden');
            else if (state.notConfigured) bits.push('local only — shared worker not deployed yet');
            else if (state.workerUnreachable) bits.push('local only — shared worker unreachable');
            else if (state.shared) bits.push('shared');
          }
          chrome.textContent = bits.join(' · ');
        }
      });
    };
    img.onerror = function () {
      if (chrome) chrome.textContent = 'the painting failed to load';
    };
    img.src = 'vanitas.jpg';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
