/*
 * mutate.js
 *
 * A full copy of the site where exactly one thing is different, and which
 * one thing keeps changing — one shared, ever-advancing counter (via
 * ../_shared/step-engine.js) picked mod 14 to index into the pool defined
 * in mutate.css. Not cumulative like palimpsest/ or decay/: only ever one
 * `mu-N` class is applied, so it never accumulates and never arrives
 * anywhere — it just never stops being slightly different than itself.
 *
 * Each of the 14 moves reworks something at the scale of the whole page
 * (palette inversion, the entire type system, viewport-level layout) —
 * pushed up from the original's single-element tweaks so a visit's
 * difference actually reads at a glance instead of needing a side-by-side.
 */
(function () {
  var POOL_SIZE = 14;
  var NAMESPACE = 'joshurbandavis-github-io';
  var KEY = 'mutate-onething';

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
    'the whole page narrowed to one column'
  ];

  function applyMutation(step) {
    var index = ((step - 1) % POOL_SIZE + POOL_SIZE) % POOL_SIZE;
    var html = document.documentElement;
    html.classList.add('mu-' + index);
    html.setAttribute('data-mu-index', index);
    html.setAttribute('data-mu-label', LABELS[index]);
    return index;
  }

  function renderChrome(result, index) {
    var chrome = document.getElementById('muChrome');
    if (!chrome) return;
    var label = 'today: ' + LABELS[index] + ' (visit ' + result.value + ')';
    if (!result.shared && !result.dev) label += ' — local, shared counter unreachable';
    chrome.textContent = label;
  }

  function init() {
    // POOL_SIZE as "max" here is a cap only in the sense that StepEngine
    // needs one; the counter itself is allowed to run forever — we just
    // fold it back into range with modulo above rather than clamping it.
    StepEngine.getStep({ namespace: NAMESPACE, key: KEY, max: Number.MAX_SAFE_INTEGER }).then(function (result) {
      var index = applyMutation(result.value);
      renderChrome(result, index);
    });
  }

  init();
})();
