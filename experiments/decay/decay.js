/*
 * decay.js
 *
 * temporary.cc for this site: a full copy that permanently loses one more
 * real piece of itself with every visit, anywhere. Real destruction, not
 * simulated — every deletion below is an actual DOM removal (`.remove()`),
 * not a CSS `display:none`. The counter is shared (via
 * ../_shared/step-engine.js) and only ever goes up — there is no reset,
 * no undo.
 *
 * The deletion order is genuinely randomized, not hand-authored: POOL below
 * is shuffled once by a seeded PRNG (seeded from KEY, so it's reproducible
 * and auditable, not an arbitrary magic number) and applied in that order.
 * The pool mixes whole structural chunks (<nav>, the entire hero section...)
 * with small individual items (one publication, one project) in the SAME
 * pool — so an early unlucky roll can take out something major and leave
 * the page genuinely broken well before the pool is exhausted, not just
 * cosmetically thinner. By the final step, whatever's still standing gets
 * swept regardless, so it always ends up truly blank — the randomness
 * changes how fast and how ugly the collapse looks, never whether it
 * finishes.
 */
(function () {
  var NAMESPACE = 'joshurbandavis-github-io';
  var KEY = 'decay-erasure';

  // every real, individually removable piece of the page. Coarse entries
  // (whole containers) and fine entries (their own sub-parts) sit in the
  // same pool on purpose — removing a coarse entry makes its own
  // not-yet-reached fine entries silent no-ops later, which is fine and
  // realistic (you can't lose a leaf twice).
  var POOL = [
    // coarse — whole sections/containers
    'nav', '.mob-nav', '.hero', '.marquee', '.about-wrap',
    '.pub-section', '.proj-section', '.contact', 'footer',
    '#glow', '.modal',
    // hero sub-parts (the name is 3 lines, addressed individually below)
    '.hero-canvas', '.hero-content > .hero-pre',
    '.hero-content > .hero-bottom', '.hero-scroll',
    // about sub-parts
    '.about-left', '.about-right',
    // nav sub-parts
    'nav .logo', 'nav .nav-links', '.menu-btn',
    // contact sub-parts
    '.contact-big', '.contact-row', '.contact-links',
  ];
  for (var i = 1; i <= 14; i++) POOL.push('.pub-list > *:nth-child(' + i + ')'); // the 14 publications, individually
  for (var j = 1; j <= 8; j++) POOL.push('.proj-section > div:nth-of-type(' + j + ')'); // the 8 project blocks, individually
  for (var n = 1; n <= 3; n++) POOL.push('.hero-name > span:nth-child(' + n + ')'); // the 3 lines of the name, individually
  for (var w = 1; w <= 34; w++) POOL.push('.works-grid > img:nth-child(' + w + ')'); // the 34 gallery photos, individually
  for (var t = 1; t <= 6; t++) POOL.push('.proj-block:nth-of-type(1) > div[style*="columns"] > img:nth-child(' + t + ')'); // the 6 tarot collage photos, individually
  for (var h = 1; h <= 5; h++) POOL.push('.hero-links > a:nth-child(' + h + ')'); // the 5 hero social icons, individually
  for (var c = 1; c <= 5; c++) POOL.push('.contact-links > a:nth-child(' + c + ')'); // the 5 contact social icons, individually
  for (var p = 1; p <= 5; p++) POOL.push('.about-text > p:nth-child(' + p + ')'); // the 5 about paragraphs, individually
  for (var b = 1; b <= 2; b++) POOL.push('.about-btns > a:nth-child(' + b + ')'); // resume + CV download links, individually

  var MAX_STEPS = POOL.length + 1; // +1: a final hard sweep + epitaph, guaranteeing true blankness no matter how the randomness landed

  // seeded PRNG (mulberry32-style) + Fisher-Yates — genuinely randomized by
  // code, once, not an order I picked by hand. Seeded from KEY so the
  // result is reproducible/auditable rather than an arbitrary constant.
  function seededRng(seedStr) {
    var h = 1779033703 ^ seedStr.length;
    for (var k = 0; k < seedStr.length; k++) {
      h = Math.imul(h ^ seedStr.charCodeAt(k), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }
  function seededShuffle(arr, seedStr) {
    var rng = seededRng(seedStr);
    var a = arr.slice();
    for (var n = a.length - 1; n > 0; n--) {
      var m = Math.floor(rng() * (n + 1));
      var tmp = a[n]; a[n] = a[m]; a[m] = tmp;
    }
    return a;
  }
  var ORDER = seededShuffle(POOL, KEY);

  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function destroy(step) {
    var count = Math.min(step, POOL.length);
    for (var k = 0; k < count; k++) {
      var sel = ORDER[k];
      var el = document.querySelector(sel);
      if (!el) continue; // already gone — an earlier coarse deletion took it with it
      if (sel === '.hero-canvas' || sel === '.hero') window.__dcStopHeroCanvas = true;
      if (sel === '.marquee') window.__dcStopMarquee = true;
      el.remove();
    }
    if (step >= MAX_STEPS) {
      Array.prototype.slice.call(document.body.children).forEach(function (el) {
        if (el.classList.contains('dc-chrome') || el.classList.contains('dc-return') || el.classList.contains('dc-epitaph') || el.tagName === 'SCRIPT') return;
        el.remove();
      });
      insertEpitaph(step);
    }
  }

  function insertEpitaph(step) {
    var div = document.createElement('div');
    div.className = 'dc-epitaph';
    div.innerHTML =
      '<p>there was something here.</p>' +
      '<p>it was deleted, one random piece at a time.</p>' +
      '<span>' + (step - 1) + ' things gone. this was the ' + ordinal(step) + '.</span>';
    document.body.appendChild(div);
  }

  function renderChrome(result) {
    var chrome = document.getElementById('dcChrome');
    if (!chrome) return;
    var label = 'step ' + Math.min(result.value, MAX_STEPS) + ' of ' + MAX_STEPS;
    if (result.value >= MAX_STEPS) label = 'nothing left — step ' + MAX_STEPS + ' of ' + MAX_STEPS;
    if (!result.shared && !result.dev) label += ' (local — shared counter unreachable)';
    chrome.textContent = label;
  }

  function init() {
    StepEngine.getStep({ namespace: NAMESPACE, key: KEY, max: MAX_STEPS }).then(function (result) {
      document.documentElement.setAttribute('data-dc-step', result.value);
      document.documentElement.setAttribute('data-dc-max', MAX_STEPS);
      renderChrome(result);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { destroy(result.value); });
      } else {
        destroy(result.value);
      }
    });
  }

  init();
})();
