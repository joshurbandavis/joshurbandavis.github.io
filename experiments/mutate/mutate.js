/*
 * mutate.js
 *
 * A full copy of the site where the design keeps mutating, and changes
 * stack: each visit's mutation doesn't replace what's already active, it
 * toggles. The first time a given mutation is picked it turns on and
 * stays on; the next time that same one gets picked — at some unknown,
 * unpatterned future visit — it turns back off. That's what keeps "doing
 * then undoing, infinitely" true even though which one gets picked each
 * time is now genuinely random, not a predictable round-robin.
 *
 * Which mutation gets picked at visit N is `hash(KEY + ':' + N) mod 40` —
 * a real hash function, not a curated sequence, so there's no pattern to
 * notice: could repeat the same mutation two visits running, could skip
 * one for a long stretch. It's still fully derived from the one shared,
 * ever-advancing counter (../_shared/step-engine.js), same as decay/ —
 * no extra storage, and every visitor at the same step count sees the
 * exact same pile (deterministic replay of the same hash sequence, not
 * actual per-visitor randomness). Because several mutations touch the
 * same underlying CSS property (see mutate.css), having more than one
 * active at once sometimes means one silently overrides another rather
 * than combining with it — intentional, not a bug.
 *
 * This replays every visit from 1 to the current step on each page load
 * to tally which mutations are currently on an odd (active) count — an
 * O(N) walk, not a closed-form lookup, because a real hash sequence
 * doesn't have one. Fine well past tens of thousands of visits; if this
 * piece somehow outlives that, the walk is the thing to revisit.
 */
(function () {
  var POOL_SIZE = 40;
  var NAMESPACE = 'joshurbandavis-github-io';
  var KEY = 'mutate-stack-random';

  var LABELS = [
    'palette inverted — dark site gone light',
    'every word shouting (uppercase)',
    'nav moved to the bottom of the screen',
    'every typeface replaced with one monospace',
    'accent color swallows the page whole',
    'the works grid collapsed to one column',
    'the whole page zoomed in, oversized',
    'the whole page tilted off its axis',
    'every hard edge gone soft',
    'every soft edge gone hard',
    'the name grown until it barely fits',
    'every photo gone grayscale',
    'every heading pulled apart, letter-spaced',
    'the whole page narrowed to one column',
    'every photo inverted, colors flipped',
    'the whole page mirrored',
    'every section running in reverse order',
    'the ticker frozen mid-scroll',
    'nav links divided by hairlines',
    'the cursor turned into a permanent question mark',
    'headings swapped to a heavy sans-serif',
    'the interactive glow switched off',
    'every publication link left showing',
    'the whole page set tighter, condensed',
    'the grain turned way up',
    'everything casting a heavy shadow',
    'the whole page slightly out of focus',
    'the whole page gone sepia',
    'the whole page shifted to a cool blue duotone',
    'running text set justified',
    'every photo rendered blocky, pixelated',
    'the whole page trembling',
    'headings flickering in and out',
    'the cursor gone entirely',
    'every hairline turned to the accent color',
    'every publication and project flagged across its top',
    'the ticker shouting in serif italic',
    'section headings grown oversized',
    'every heading and nav link underlined',
    'the logo stuck mid-scramble'
  ];

  // moves that need real DOM work beyond a CSS class — start/stop nothing
  // needed across reloads, since state is recomputed fresh every page
  // load anyway (see applyStack): if a move is active this load, its
  // effect just runs once, for the life of that view.
  var DOM_EFFECTS = {
    39: function () {
      var logo = document.querySelector('nav .logo');
      if (!logo || typeof window.scrambleHover !== 'function') return;
      window.scrambleHover(logo);
      setInterval(function () { window.scrambleHover(logo); }, 2600);
    }
  };

  // FNV-1a: a real, well-known string hash, not a hand-picked sequence.
  function hash32(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // which mutation (0..13) does visit `step` pick? Deterministic per
  // step, unpatterned across steps — that's the "as random as possible,
  // but still shared" part.
  function pickAt(step) {
    return hash32(KEY + ':' + step) % POOL_SIZE;
  }

  function applyStack(step) {
    var counts = new Array(POOL_SIZE).fill(0);
    for (var s = 1; s <= step; s++) counts[pickAt(s)]++;

    var html = document.documentElement;
    var active = [];
    for (var i = 0; i < POOL_SIZE; i++) {
      if (counts[i] % 2 === 1) {
        html.classList.add('mu-' + i);
        active.push(i);
        if (DOM_EFFECTS[i]) DOM_EFFECTS[i]();
      }
    }
    html.setAttribute('data-mu-active', active.join(','));
    html.setAttribute('data-mu-step', step);
    return active;
  }

  function renderChrome(result, active) {
    var chrome = document.getElementById('muChrome');
    if (!chrome) return;
    var label = active.length
      ? 'stacked (' + active.length + '): ' + active.map(function (i) { return LABELS[i]; }).join(' + ')
      : 'stack empty right now';
    label += ' — visit ' + result.value;
    if (!result.shared && !result.dev) label += ' (local, shared counter unreachable)';
    chrome.textContent = label;
  }

  function init() {
    // still uncapped — the counter is allowed to run forever; applyStack()
    // just folds it into on/off per mutation rather than clamping anything.
    StepEngine.getStep({ namespace: NAMESPACE, key: KEY, max: Number.MAX_SAFE_INTEGER }).then(function (result) {
      var active = applyStack(result.value);
      renderChrome(result, active);
    });
  }

  init();
})();
