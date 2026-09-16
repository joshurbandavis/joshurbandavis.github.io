/*
 * creep.js
 *
 * A full copy of this site's homepage that gets grafted, one real
 * irreversible DOM mutation at a time, with something older and real
 * underneath — until a local copy of that real page fully replaces it.
 *
 * This is the second design of this piece. The first faded two iframes
 * into each other with continuously-eased CSS opacity/filters — smooth,
 * legible from the first refresh, and out of step with decay/ and mutate/,
 * which never blend: they cut. This version cuts too. Every move below is
 * a real, instant DOM mutation applied on load — swapped text, swapped
 * images, removed nodes, or (at the end) a wholesale innerHTML graft of
 * the real 1996 page's own markup. Nothing here ever animates a value
 * from A to B; a thing is simply, unaccountably different than it was.
 *
 * Two things make it feel more like an intrusion than a slideshow:
 *
 *  1. Sparse, irregular timing. 24 moves are scattered across the full
 *     365-refresh span at positions picked once by a seeded PRNG (seeded
 *     from SEED, so reproducible/auditable, not hand-picked) — long dead
 *     stretches where a refresh changes nothing, then a move landing.
 *     Moves apply in a fixed, authored order (whispers → identity →
 *     intrusion → environment → collapse); only *when* each one lands is
 *     randomized, not *which* comes first.
 *
 *  2. A visit that lands a new move gets a hard, un-eased flash the
 *     instant the page settles (creep.css's .cr-event-flash /
 *     .cr-jolt) — a jolt, not a fade-in. A visit that lands nothing stays
 *     completely silent, including no flash — most refreshes are silent
 *     by design (24 events across 365 visits).
 *
 * Shared, like decay/ and mutate/: every visitor, on any device, anywhere,
 * advances the same counter via ../_shared/step-engine.js — this piece's
 * own refreshes used to be counted privately per-browser in localStorage,
 * which meant no two visitors ever saw the same state. Switched to match
 * its siblings: one collective clock, same as them. (No reset, same as
 * them too — a shared, cumulative counter has no business being clearable
 * by any single visitor; ?dev=1 advances a separate, purely local counter
 * instead, for testing without burning through real visits.) Every load
 * re-derives the full current state from scratch (same pattern as
 * decay.js) by re-running every move whose position <= the current step
 * against a fresh copy of the page — it does not persist mutated DOM
 * between visits, since a reload always starts from this file's original
 * markup.
 */
(function () {
  var SEED = 'dwt_palimpsest_refresh_v3'; // unchanged from the local-only design, so the move schedule doesn't reshuffle
  var NAMESPACE = 'joshurbandavis-github-io';
  var STEP_KEY = 'creep-graft';
  var TOTAL = 365;
  var TERMINAL_STEP = TOTAL;

  // ---- seeded PRNG + shuffle (same mulberry32-style approach as decay.js,
  // so the schedule is genuinely randomized by code, once, not hand-picked,
  // and reproducible from SEED rather than an arbitrary magic order). ----
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

  function img1996(file) { return '1996/img/' + file; }

  function setAll(sel, fn) {
    document.querySelectorAll(sel).forEach(fn);
  }
  function jolt(el) {
    if (!el) return;
    el.classList.remove('cr-jolt');
    // force reflow so re-adding the class restarts the animation
    void el.offsetWidth;
    el.classList.add('cr-jolt');
  }
  function swapIcon(ariaLabel, file, alt) {
    var a = document.querySelector('.hero-links a[aria-label="' + ariaLabel + '"]');
    if (!a) return;
    a.innerHTML = '';
    var im = document.createElement('img');
    im.src = img1996(file);
    im.alt = alt;
    im.width = 32; im.height = 32;
    im.style.objectFit = 'contain';
    a.appendChild(im);
    jolt(a);
  }
  function relabelNav(href, label) {
    setAll('a[href="' + href + '"]', function (a) {
      a.textContent = label;
      // href is left alone on purpose: a later collapse move removes the
      // section it points to (see below), so this link quietly goes dead —
      // scrolls to nothing, same as decay/'s missing pieces just stay
      // missing. Committing to that rather than routing it somewhere safe.
      jolt(a);
    });
  }

  var LEGAL_TEXT = 'SPACE JAM, characters, names, and all related indicia are trademarks of Warner Bros. © 1996';

  // ---- the moves, in fixed narrative order. WHEN each lands is random
  // (see POSITIONS below); WHICH comes first is authored, not shuffled. ----
  var MOVES = [
    // -- whispers: nothing legible as "Space Jam" yet, just small wrongness --
    { id: 'cursor', label: 'the crosshair cursor is just a cursor now', apply: function () {
      document.body.style.cursor = 'default';
    }},
    { id: 'accent', label: 'the accent color has shifted', apply: function () {
      document.documentElement.style.setProperty('--accent', '#ff4d1a');
      jolt(document.querySelector('.hero-name .line2'));
    }},
    { id: 'glow', label: 'the cursor no longer glows', apply: function () {
      var glow = document.getElementById('glow');
      if (glow) { glow.style.background = 'none'; }
    }},
    { id: 'font', label: 'the typeface has changed', apply: function () {
      document.documentElement.style.setProperty('--sans', 'Verdana, Arial, sans-serif');
      jolt(document.querySelector('.hero-bio'));
    }},
    { id: 'scrollhint', label: '"Scroll to explore" now reads "Site Map"', apply: function () {
      var el = document.querySelector('.hero-scroll');
      if (el) { el.textContent = 'Site Map'; jolt(el); }
    }},

    // -- identity: the nav starts speaking a different language --
    { id: 'nav-about', label: 'About → Jam Central', apply: function () { relabelNav('#about', 'Jam Central'); }},
    { id: 'nav-research', label: 'Research → Planet B-Ball', apply: function () { relabelNav('#pubs', 'Planet B-Ball'); }},
    { id: 'nav-design', label: 'Design → Lunar Tunes', apply: function () { relabelNav('#projects', 'Lunar Tunes'); }},
    { id: 'nav-shop', label: 'Shop → Jump Station', apply: function () { relabelNav('http://73f7b8-3.myshopify.com', 'Jump Station'); }},
    { id: 'nav-contact', label: 'Contact → Junior Jam', apply: function () { relabelNav('#contact', 'Junior Jam'); }},

    // -- intrusion: real 1996 images replacing real icons, one at a time --
    { id: 'icon-scholar', label: 'the Scholar icon is a real 1996 GIF now', apply: function () { swapIcon('Google Scholar', 'p-pressbox.gif', 'Press Box Shuttle'); }},
    { id: 'icon-github', label: 'the GitHub icon is a real 1996 GIF now', apply: function () { swapIcon('GitHub', 'p-studiostore.gif', 'Warner Studio Store'); }},
    { id: 'icon-instagram', label: 'the Instagram icon is a real 1996 GIF now', apply: function () { swapIcon('Instagram', 'p-souvenirs.gif', 'Stellar Souvenirs'); }},
    { id: 'icon-twitter', label: 'the Twitter icon is a real 1996 GIF now', apply: function () { swapIcon('Twitter', 'p-sitemap.gif', 'Site Map'); }},
    { id: 'icon-linkedin', label: 'the LinkedIn icon is a real 1996 GIF now', apply: function () { swapIcon('LinkedIn', 'p-behind.gif', 'Behind the Jam'); }},

    // -- environment: the space itself changes --
    { id: 'bg-starfield', label: 'the background is a real tiled 1996 GIF now', apply: function () {
      var hero = document.querySelector('.hero');
      if (hero) {
        hero.style.backgroundImage = 'url(' + img1996('bg_stars.gif') + ')';
        hero.style.backgroundSize = '220px 220px';
        jolt(hero);
      }
    }},
    { id: 'marquee-legal', label: 'the ticker now reads the real trademark line', apply: function () {
      window.__pxStopMarquee = true; // stop the old glitch cycle from ever touching this again
      var inner = document.querySelector('.marquee-inner');
      if (!inner) return;
      inner.innerHTML = '';
      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        var parts = [];
        for (var n = 0; n < 6; n++) parts.push(LEGAL_TEXT);
        span.innerHTML = parts.join('<span class="dot"></span>');
        inner.appendChild(span);
      }
      jolt(inner);
    }},
    { id: 'logo-mark', label: 'the "JUD" logo is a real 1996 GIF now', apply: function () {
      var logo = document.querySelector('nav .logo');
      if (!logo) return;
      logo.textContent = '';
      var im = document.createElement('img');
      im.src = img1996('p-jamlogo.gif');
      im.alt = '';
      im.style.height = '26px';
      im.style.width = 'auto';
      logo.appendChild(im);
      jolt(logo);
    }},
    { id: 'name-overtaken', label: '"Josh" is a real 1996 GIF now', apply: function () {
      var line1 = document.querySelector('.hero-name .line1');
      if (!line1) return;
      line1.textContent = '';
      var im = document.createElement('img');
      im.src = img1996('p-jamlogo.gif');
      im.alt = '';
      im.style.maxWidth = 'min(80vw, 420px)';
      im.style.height = 'auto';
      line1.appendChild(im);
      jolt(line1);
    }},
    { id: 'bio-overwritten', label: 'the bio is the real trademark line now', apply: function () {
      var bio = document.querySelector('.hero-bio');
      if (bio) { bio.textContent = LEGAL_TEXT; jolt(bio); }
    }},

    // -- collapse: real removals, decay-style --
    { id: 'marquee-gone', label: 'the ticker is gone', apply: function () {
      window.__pxStopMarquee = true;
      var el = document.querySelector('.marquee');
      if (el) el.remove();
    }},
    { id: 'about-gone', label: 'the about section is gone', apply: function () {
      var el = document.querySelector('.about-wrap');
      if (el) el.remove();
    }},
    { id: 'work-gone', label: 'research and design are gone', apply: function () {
      var a = document.querySelector('.pub-section'); if (a) a.remove();
      var b = document.querySelector('.proj-section'); if (b) b.remove();
    }},
    { id: 'contact-gone', label: 'contact is gone; the page has narrowed', apply: function () {
      var a = document.querySelector('.contact'); if (a) a.remove();
      var f = document.querySelector('footer'); if (f) f.remove();
      document.body.classList.add('cr-narrow');
    }}
  ];

  // Reserve room before TERMINAL_STEP so the guaranteed final graft never
  // collides with a scheduled move, and step 1 always shows a clean
  // baseline (no move scheduled at 1).
  var SCHEDULE_MIN = 2;
  var SCHEDULE_MAX = TOTAL - 5;
  var range = [];
  for (var i = SCHEDULE_MIN; i <= SCHEDULE_MAX; i++) range.push(i);
  var POSITIONS = seededShuffle(range, SEED).slice(0, MOVES.length)
    .sort(function (a, b) { return a - b; });

  function appliedCount(step) {
    var n = 0;
    for (var i = 0; i < POSITIONS.length; i++) if (POSITIONS[i] <= step) n++;
    return n;
  }

  // ---- the terminal graft: real, one-way DOM surgery. Fetches the actual
  // 1996 page and replaces whatever remains of crRoot with its real body
  // markup, verbatim — the same document now literally contains the other
  // page's real markup, not an overlay/iframe of it. ----
  function converge() {
    var root = document.getElementById('crRoot');
    document.title = 'Space Jam';
    document.body.classList.add('cr-converged');
    window.__pxStopMarquee = true;
    window.__pxStopHeroCanvas = true;
    fetch('1996/index.html', { cache: 'no-store' })
      .then(function (res) { return res.text().then(function (html) { return { html: html, url: res.url }; }); })
      .then(function (result) {
        var doc = new DOMParser().parseFromString(result.html, 'text/html');
        var body = doc.body;
        if (!root || !body) return;
        // Only `body` gets grafted below, but the real page's own <head>
        // can carry real rules too (a trivial one today - a footer-link
        // margin - but the fetched file could gain more later, and there's
        // no reason for those to silently stop applying just because they
        // happened to live in <head>). Carry every <style> block over
        // as-is; parsed from a fetch response, not authored here, so
        // nothing about this write depends on the specific rules inside.
        Array.prototype.forEach.call(doc.head ? doc.head.querySelectorAll('style') : [], function (styleEl) {
          document.head.appendChild(styleEl.cloneNode(true));
        });
        // Moving `body` into the live document changes its owning document,
        // so relative src/href attributes (e.g. "img/p-jamlogo.gif") would
        // otherwise resolve against *this* page's URL, not 1996/index.html's
        // — one directory too high, and every image 404s. Resolve each one
        // to an absolute URL against the real fetched location first.
        Array.prototype.forEach.call(body.querySelectorAll('img[src]'), function (im) {
          im.setAttribute('src', new URL(im.getAttribute('src'), result.url).href);
        });
        // The real page sets its background/colors via legacy <body> HTML
        // attributes (background=, bgcolor=, text=), not CSS. Those only
        // ever apply to a document's actual <body> element — this one is
        // about to become a plain child of #crRoot, so the browser won't
        // honor them at all (the background silently never renders).
        // Convert each to the equivalent inline style, same URL-resolution
        // treatment as the images above, before it loses "real body" status.
        var bg = body.getAttribute('background');
        if (bg) {
          body.style.backgroundImage = 'url(' + new URL(bg, result.url).href + ')';
          body.removeAttribute('background');
        }
        var bgcolor = body.getAttribute('bgcolor');
        if (bgcolor) { body.style.backgroundColor = bgcolor; body.removeAttribute('bgcolor'); }
        var textColor = body.getAttribute('text');
        if (textColor) { body.style.color = textColor; body.removeAttribute('text'); }
        // The real page's own links are left exactly as fetched: the 10
        // "planet" buttons point at interior sections this package doesn't
        // include (cmp/..., real 404s), and Warner Studio Store points off
        // to WB's own shop. Real, unfixed dead ends — the genuine decay of
        // a 30-year-old page, not routed back to safety. Committing to it.
        root.innerHTML = '';
        root.appendChild(body);
        jolt(root);
      })
      .catch(function () {
        // Real page unreachable this load (offline dev, file:// without a
        // server, etc.) — leave the already-collapsed page as-is rather
        // than pretend the graft happened.
        var note = document.createElement('p');
        note.style.cssText = 'font:11px monospace;color:#5a564f;text-align:center;padding:2rem';
        note.textContent = 'converged — real page unreachable this load (needs to be served, not opened as a file)';
        if (root) root.appendChild(note);
      });
  }

  function renderChrome(step, count, debug, result) {
    var chrome = document.getElementById('crChrome');
    if (!chrome) return;
    var text = 'step ' + step + ' / ' + TOTAL;
    if (debug) text += ' — ' + count + '/' + MOVES.length + ' moves grafted';
    if (step >= TERMINAL_STEP) text = 'converged — step ' + step + ' / ' + TOTAL;
    if (!result.shared && !result.dev) text += ' (local — shared counter unreachable)';
    chrome.textContent = text;
  }

  function fireEventFlash() {
    var flash = document.getElementById('crFlash');
    if (!flash) return;
    flash.classList.remove('cr-firing');
    void flash.offsetWidth;
    flash.classList.add('cr-firing');
  }

  function init() {
    var params = new URLSearchParams(location.search);
    var debug = params.has('debug');

    StepEngine.getStep({ namespace: NAMESPACE, key: STEP_KEY, max: TOTAL }).then(function (result) {
      var step = result.value;
      var prevStep = Math.max(0, step - 1); // StepEngine always hits by exactly 1, so this visit's "before" is just one less

      var countBefore = appliedCount(prevStep);
      var countNow = appliedCount(step);

      // Re-derive full current state from scratch: apply every move whose
      // position has been reached, in order — same "replay from zero every
      // load" model as decay.js. Every move in range gets applied on every
      // load regardless of countBefore (jolt() on an already-settled
      // element is a harmless no-op re-flash) — only whether the *overall*
      // visit landed something new (countNow > countBefore) decides
      // whether the full-page event flash fires.
      for (var i = 0; i < countNow; i++) {
        MOVES[i].apply();
      }
      if (step >= TERMINAL_STEP) converge();

      if (countNow > countBefore || step >= TERMINAL_STEP) fireEventFlash();

      renderChrome(step, countNow, debug, result);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
