# net art experiments

Prototypes for small net art pieces — fictional infrastructure, digital archaeology,
behavioral art. Each lives in its own folder as a self-contained page.

- `please-wait/` — a fake Windows 95 "System" dialog that never finishes
  loading: the progress bar approaches 100% but is asymptotic and never
  arrives, and "Time remaining: calculating…" never resolves. The only
  interaction is staying on the page. A real, ticking taskbar clock is the
  one true detail among fabrications; everything else the dialog says about
  you is invented and deliberately inconsistent — an unexplained blue-screen
  flash at 8 seconds ("...nine minutes, then you left.") that's gone before
  you can finish reading it, then an accumulating, increasingly personal log
  ("you were here before," "someone was with you. we did not ask who.") that
  later contradicts its own numbers at the close. The close button doesn't
  work — it shakes the window and says so in a popup. Timer advances on tab
  *visibility* only (not focus — that check broke inside iframe previews,
  since a preview frame can sit permanently unfocused while plainly on
  screen). No backend, no persistence, no exit: leaving or reloading resets
  everything.

- `spacejam/` — this site's homepage (`josh-site.html`, a snapshot of
  `index.html`) contaminated one refresh at a time by the real 1996
  spacejam.com homepage, until a local copy of that page
  (`spacejam/1996/index.html`) fully replaces it. Unlike the earlier
  version of this piece, it doesn't redraw the Space Jam page by eye — it
  ships the actual supplied 1996 GIF assets (`1996/img/`) and an
  unmodified copy of the real markup (`1996/original-index.html`), on
  purpose: the piece is about the real artifact overtaking the page, not
  an homage to it. 365 refreshes to convergence, tracked per-browser via
  `localStorage` (key `dwt_spacejam_refresh_v2`) — no shared backend,
  unlike `decay/` and `mutate/`. The terminal state renders the local
  `1996/` copy directly rather than embedding the live site, so the piece
  doesn't depend on WB's site staying reachable or embeddable. Interior
  sections the 1996 page links to (`cmp/...`, `video/`) aren't included —
  those links 404, as documented in the original source package.

  - `?reset=1` — clears the counter, then loads step 1.
  - `?debug=1` — shows the current step count in the corner.
  - Alt+R while viewing the page resets and reloads.

- `cellular-erasure/`: a found poem seeded onto a Conway's Game of Life
  grid, one word per cell; the automaton runs until it settles, then an
  "Ending" switch decides what that means for the text. **Selected**
  (default) treats aliveness as attention: cells still alive when it
  settles are lifted out and read together as the poem, everything else
  falls away. **Erased** treats aliveness as ink: a living cell settles
  over its word like a marker and blacks it out in place, so the page keeps
  its original shape with redaction bars sitting where the covered words
  were. Same automaton and seed under both; only which cell state means
  "kept" flips. No backend: random or pasted/uploaded text, all client-side.

- `decay/` — a full copy of `index.html` that permanently deletes one real,
  randomly-chosen piece of itself with every visit, anywhere (the direct
  temporary.cc reference). Real destruction — actual DOM `.remove()`, not a
  CSS hide — and genuinely randomized: a pool of 105 real page elements (9
  whole structural containers like `<nav>` and the entire hero section,
  down to each of the 14 publications, 8 project blocks, 34 gallery photos,
  6 tarot collage photos, the 3 individual lines of the name, and every
  social icon/paragraph/button, each addressed individually) is shuffled
  once by a seeded PRNG in `decay.js` — a real algorithm, not an order I
  hand-picked — and consumed one entry per visit. Coarse and fine entries
  share the same pool, so a big chunk *can* get taken out early — in the
  live shuffle actually generated, the whole Contact section is gone by
  visit 36 and the footer by visit 58, well before the page is anywhere
  near visually "done" (though with 96 of the 105 entries being small
  individual items now vs. only 9 big containers, the odds of an early
  catastrophic hit are lower than the smaller pool this replaced — still
  possible, just proportionally rarer). 106 visits guarantees true
  blankness regardless of how the randomness landed — 105 real deletions
  plus a final sweep that clears anything still standing — ending on a
  blank page with a one-line epitaph. No reset.

- `mutate/` — a full copy of `index.html` where exactly one thing about the
  design is different at any given moment — never nothing, never more than
  one — and which single thing keeps changing with every visit, anywhere.
  Not cumulative and not headed anywhere, unlike `decay/` and `spacejam/`. 14
  moves, each reworking something at the scale of the whole page rather
  than one element (palette inversion, the entire type system replaced,
  the page tilted off its axis, the works grid collapsed to one column,
  the name grown until it barely fits...) — pushed up from an earlier,
  much subtler version so a visit's difference actually reads at a glance.

- `_shared/step-engine.js` — the shared-counter plumbing `decay/` and
  `mutate/` build on. (`spacejam/` used to as well; it now tracks its step
  count per-browser in `localStorage` instead — see above.)

- `no-one-in-particular/` — a rebuild of `thisobituarydoesnotexist.com`
  (2019, GPT-2 + a StyleGAN/FFHQ portrait model, gallery-shown as
  `fauxbituary`): a new obituary generates on every visit, and the "someone
  who never lived" domain has since lapsed. Each visit is one of two kinds,
  roughly 50/50, labeled honestly in the card's footer stamp:
  - **Fresh specimen** — templates (name/dates/survivors/service info, kept
    internally consistent) plus a word-bigram Markov chain trained on an
    original ~60-sentence corpus for the free-text eulogy: the same
    almost-coherent GPT-2 texture, no model required, effectively unlimited
    variety.
  - **Archival specimen** — one of 148 real GPT-2 completions recovered from
    the original data-merge file and actually curated and printed for the
    2019 show ("An Archive of Feeling," Chandler Gallery). Embedded verbatim
    (`archive-data` JSON island in `index.html`, ~180KB). One row from the
    original 149 was dropped: it reproduced a real racial slur from its
    period training text.

  The portrait is *not* regenerated live in either case: it's a random pick
  from the ten actual faces the 2019 StyleGAN run produced for the original
  piece (`portraits/`, optimized down from the ~15MB originals to ~1.8MB
  total) — the old `karras2019stylegan-ffhq-1024x1024.pkl` needs TensorFlow
  1.x and a GPU to run live, and the full 149-image batch the archival text
  was originally paired with is lost (not on this machine, no drive had it).
  Each visit instead applies a random crop/zoom/rotation/mirror/duotone pass
  to one of the ten so repeats don't look identical; the footer says plainly
  that the archival text's original photo pairing didn't survive. No
  backend, no API key, free to keep running indefinitely.

- `internet-is-haunted/` — paste in a dead (or any) URL and get back a small
  memorial instead of a 404: real first/last capture dates and, where
  recoverable, a real author tag and a fragment of real archived text,
  pulled live from the Wayback Machine's CDX API, not invented. Breaks the
  no-backend pattern above on purpose: archive.org's API sends no CORS
  header, so unlike `decay`/`mutate`'s `countapi.xyz` calls this can't be
  reached directly from a static page. Two front ends, one API contract:
  - `index.html` — the deployed page: calls a small Cloudflare Worker
    (`worker.js`, deploy instructions in its header comment) that does the
    CDX lookup and best-effort text salvage, then returns JSON with a
    CORS header the browser will actually accept. Set `WORKER_URL` near the
    top of `index.html`'s script once the Worker is deployed; until then the
    page shows an honest "not configured yet" note instead of pretending.
  - `server.js` / `public/index.html` — the original local-only path,
    unchanged: `node server.js` from this folder runs the same lookup logic
    against a plain Node server instead, for offline development.

  archive.org itself is often the slow part (real responses can take
  20-30s, occasionally longer) — the wait is narrated rather than hidden,
  and that wait is currently being treated as part of the piece, not a bug
  to engineer away.

  - Local dev: `node server.js` from `internet-is-haunted/`, then open
    `http://localhost:5173`.
  - Deployed: open `internet-is-haunted/index.html` directly, or via
    `/experiments/internet-is-haunted/` once pushed — works like every
    other piece here as long as `WORKER_URL` is set.

Not linked from the main site nav — open directly, e.g. locally:

```
open experiments/please-wait/index.html
open experiments/spacejam/index.html
open experiments/decay/index.html
open experiments/mutate/index.html
open experiments/cellular-erasure/index.html
open experiments/no-one-in-particular/index.html
open experiments/internet-is-haunted/index.html   # needs WORKER_URL set, see above
```

or once pushed, at `/experiments/please-wait/` / `/experiments/spacejam/` /
`/experiments/decay/` / `/experiments/mutate/` / `/experiments/cellular-erasure/` /
`/experiments/no-one-in-particular/` / `/experiments/internet-is-haunted/` on
the live site.

`decay/` and `mutate/` share one counter service (`countapi.xyz`) but each
uses its own namespaced key, so visiting one never advances the other.
Append `?dev=1` on either while testing/building to advance a separate,
purely local counter instead of the real shared one. `spacejam/` is
unrelated to that service — its own counter is purely local (see above).
