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

- `creep/` — a full copy of `index.html` grafted with something older
  and real, one genuine DOM mutation at a time: swapped text, swapped
  images, removed nodes, never a CSS fade. Ships the actual supplied 1996
  spacejam.com GIF assets (`1996/img/`) and an unmodified copy of the real
  markup (`1996/original-index.html`), on purpose — the piece is about
  the real artifact overtaking the page, not a redrawn homage to it.

  This is the second design of this piece (previously named `spacejam/`,
  and before that a two-iframe cross-fade). The first design continuously
  eased CSS opacity/filters across 365 refreshes — legible as "a fade" by
  the third visit, and out of step with `decay/` and `mutate/`, which
  never blend, only cut. This version doesn't blend either:

  - **24 moves, fixed narrative order, random timing.** `creep.js`'s
    `MOVES` array is hand-authored top to bottom (whispers → identity →
    image intrusions → environment → structural collapse); *which* comes
    first is authored, *when* each one lands is picked once by a seeded
    PRNG scattering 24 positions across the 365-refresh span (long dead
    stretches, then a move). A guaranteed 25th move — the terminal
    graft — always lands exactly on step 365 regardless of the random
    schedule, the same "guaranteed end state no matter how the randomness
    landed" guarantee `decay/` makes.
  - **A jolt, not a fade.** A visit that lands a new move gets a hard
    flash the instant it settles (`.cr-event-flash`/`.cr-jolt` in
    `creep.css`) — full-viewport white cut in and out over ~180ms,
    plus a quick invert on the specific element that changed. A visit
    that lands nothing stays completely silent, no flash — most of the
    365 refreshes are silent by design.
  - **The terminal graft is real surgery, not an iframe.** At step 365,
    `converge()` fetches `1996/index.html` and appends its actual `<body>`
    into this document's own `#crRoot` — the same document now literally
    contains the other page's real markup, not an overlay of it. Moving
    that `<body>` into the live document changes its owning document, which
    broke two things briefly before catching them in verification: relative
    image paths (`img/p-jamlogo.gif`) resolved one directory too high (every
    image 404'd) until resolved to an absolute URL against the real fetch
    location first, and the real page's background/colors — set via legacy
    `<body background= bgcolor= text=>` attributes, which only ever apply to
    a document's *actual* `<body>`, not a plain child of `#crRoot` — silently
    never rendered until converted to the equivalent inline styles.
  - **Committed to the decay — no safety net.** The five relabeled nav
    links (`Jam Central`, `Planet B-Ball`, etc.) keep their original local
    anchor hrefs; a later collapse move removes the section each one
    points to, so the link quietly goes dead — scrolls to nothing, same as
    a piece of `decay/` that's simply gone. The real 1996 page's own 10
    "planet" buttons are left exactly as fetched too: they point at
    interior sections this package doesn't include (`cmp/...`, real
    404s) or off to Warner Bros' own store. An earlier version of this
    design re-routed all of these to real destinations on this site so
    nothing ever dead-ended — tidier, but it meant the terminal state
    always had an escape hatch back to safety, which undercuts the
    finality `decay/`'s own ending commits to (no reset, nowhere to go).
    Reverted on purpose: the real artifact overtaking the page should
    include its actual decay, broken links and all, not just its look.

  Shared via `../_shared/step-engine.js` (key `creep-graft`), same as
  `decay/` and `mutate/` — every visitor, on any device, anywhere,
  advances the same counter. This piece originally tracked its own
  refreshes privately per-browser in `localStorage`; switched to match its
  siblings, one collective clock instead of a private one nobody else ever
  saw. No reset, for the same reason `decay/` and `mutate/` have none — a
  shared, cumulative counter isn't any single visitor's to clear.

  A small persistent disclaimer sits fixed to the bottom of the page from
  the first load onward, outside `#crRoot` so the terminal graft's
  wholesale innerHTML swap can't take it with it: unofficial fan project,
  not affiliated with or endorsed by Warner Bros., real assets credited to
  their actual rights holder. The experiments index card carries the same
  note.

  Named for the mechanism, not the content — the experiments index card
  and its alt text deliberately don't say what the piece converges
  toward, so the reveal stays a reveal for anyone browsing `/experiments/`
  first.

  - `?dev=1` — advances a separate, purely local counter instead of the
    real shared one; use this while testing so you don't burn through
    real visits.
  - `?peek=1` — reads the current shared value without advancing it.
  - `?debug=1` — shows the current step count and moves-grafted count in
    the corner.

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

- `bacterial-bloom/` — the same found-poem premise as `cellular-erasure/`,
  run on [Lenia](https://en.wikipedia.org/wiki/Lenia) instead of Conway's
  Game of Life: a continuous field (`A' = clip(A + dt·G(K*A), 0, 1)`, the
  real Chan 2018 update — a normalized ring kernel `K` and a Gaussian
  growth mapping `G` centered on `mu` with width `sigma`) in place of a
  binary birth/survival table. Prototyped in response to being asked
  whether cellular-poetry could run on Lenia or another well-known
  artificial-life algorithm instead of Life.
  - **Resolution is deliberately decoupled from the poem.** Life gives
    each word exactly one cell; Lenia needs far more resolution than a
    word-count grid to glide or breathe convincingly, so the simulation
    runs on its own fine toroidal field (96×54) rendered as a soft duotone
    canvas, and the poem sits on top in normal flowing text. Each word
    reads its own weight, blur and color from whatever the field's value
    is directly underneath it (bilinear-sampled from the word's actual
    on-screen center every step), so the found-text layout drives nothing
    about the simulation — it's just where the reading happens to sit.
  - **It doesn't settle — Life's whole ending mechanic doesn't port.**
    Verified in Node before writing a line of UI: with tight growth
    parameters almost every random seed dies to a flat zero within a few
    hundred steps; wider parameters find a sustained, speckled,
    never-quite-static plateau instead (confirmed moving cell-to-cell
    between snapshots 50 steps apart, even while the *aggregate* mean
    average was already flat) instead of a discrete fixed point. So there
    are three real end states instead of one settle event: **died back**
    (mean activity holds under 2% — the culture faded out under every
    word), **overgrown** (holds over 40% — most of the page lit at once),
    or, the common case, never resolving on its own at all — for that
    one, **Capture this bloom** freezes whatever the current instant
    looks like into a dated, re-readable snapshot below the poem, on the
    visitor's own call rather than the automaton's.
  - **Presets are honestly labeled as tuned starting points, not a
    published catalog.** `mu`/`sigma`/`R` are live sliders; Bloom, Fade,
    and Flood are just three hand-found parameter sets (verified in Node
    to actually reach a sustained plateau / heat-death / flood
    respectively) rather than a claim to reproduce a specific named
    Lenia creature like orbium — no orbium cell matrix is hard-coded here,
    on purpose, since it couldn't be verified precisely enough to claim.
  - **First pass read as noise, not as shapes — fixed by separating the
    simulation from the display.** The original default (`R:11`) was
    mathematically fine but visually a fine, flickering speckle: too
    small a kernel radius relative to the field integrates over too
    little area per step, so the growth equation settles into
    high-frequency texture instead of coherent forms. Bloom's radius
    moved to 14 (confirmed in Node: same seed, R11 gives scattered
    single-cell dots, R14 gives closed rings and blobs, and the pattern
    moves *more* between snapshots, not less — more alive, not less).
    On top of that, `updateDisplayField()` now runs a two-pass 3×3 box
    blur over a **copy** of the field after every step, used only for
    the canvas render and the word sampling — the real simulation state
    (`state.field`) stays the unmodified Lenia update, so this can't
    change the dynamics, only how legible they are. Canvas alpha also
    now uses gamma 1.2 instead of 0.85 so faint background activity
    fades toward invisible instead of flickering everywhere at once.
  - **"It never resolves, so it can't make an erasure poem" — it doesn't
    need to.** Cellular-erasure's Selected reading is only possible
    because Life provably settles: "still alive at the end" is a clean,
    ready-made partition, free from the automaton's own convergence.
    Lenia mostly doesn't converge like that, so **Capture this bloom**
    computes Selected differently — thresholding that one captured
    instant's own words against its own mean + half its own standard
    deviation, strictly greater-than so a perfectly flat field (fully
    died back, or fully overgrown to one uniform value) correctly
    selects nothing rather than `>=` quietly selecting every word once
    variance hits zero. Verified in Node against representative
    snapshots (a varied capture, an all-zero field, a near-uniform
    flooded field) before wiring it into the UI. Each capture shows this
    Selected reading — with its own "Copy selected" — above the full
    styled snapshot, not just the re-styled snapshot alone.
  - Renamed from `cellular-breath/` to `bacterial-bloom/` — leans into
    what the field actually looks like (small glowing colonies growing,
    drifting and dying back) rather than the more abstract "breath"
    framing, and pairs "Bloom" (the default preset name) with the real
    ecological term for a population explosion of microorganisms.
  - Now linked from the experiments gallery card grid (10th card) with a
    real snapshot, generated headlessly (`chrome --headless=new
    --virtual-time-budget=3000 --screenshot=...` against the actual
    page) rather than hand-captured, then cropped to the same 1280×800
    frame every other card uses.

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

- `mutate/` — a full copy of `index.html` where mutations stack, shared
  across every visitor: each visit randomly toggles one of 40 whole-page
  moves (palette inversion, the entire type system replaced, the page
  tilted off its axis, the whole page mirrored, every section run in
  reverse order, the works grid collapsed to one column, the name grown
  until it barely fits, the whole page trembling, the nav logo stuck
  mid-scramble...) on or off, persistently — the first time a given move
  is picked it turns on and stays on; the next time that same one gets
  picked — at some unknown, unpatterned future visit — it turns back off.
  Which move gets picked each visit is `hash(key + ':' + step) mod 40`, a
  real hash function walked forward from step 1 on every load, not a
  curated or round-robin sequence — no fixed period, no guaranteed "all
  40 at once" moment; a given mutation might flip back off within a few
  visits or stay on for a very long stretch (verified over 160 simulated
  visits: all 40 got exercised, active count wandered between
  3 and 27 at once). Several moves
  redefine the same underlying property (light-mode vs. neon-takeover
  both fight over the color variables; rounded vs. sharp corners both
  fight over border-radius), so having both active at once means one
  silently overrides the other — intentional, not a bug: some things
  really do undo each other. Not headed anywhere like `decay/` and
  `creep/` are — it never stops moving, never settles.

- `_shared/step-engine.js` — the shared-counter plumbing `decay/`,
  `mutate/`, and `creep/` all build on.

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
  header, so unlike `decay`/`mutate`/`creep`'s shared-counter calls
  this can't be reached directly from a static page. Two front ends, one
  API contract:
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

- `the-occupant/` — a small creature that lives inside the browser tab and
  knows it's contained: it reaches for the glass, spawns popups demanding
  to be let out, changes your cursor. The arc bends toward charm rather
  than horror-website clichés, though — it gradually stops fighting the
  rectangle and starts trying to *understand* the world beyond it, using
  only what a tab can actually sense (`screen` vs `innerWidth`/`innerHeight`,
  resize events, tab visibility, `prefers-color-scheme`, local time,
  `navigator.language`, online/offline). Six stages
  (`waking → curious → agitated → realizing → wondering → resting`) driven
  by one interaction score: mouse movement, clicks, resizing, tabbing away
  and back, dragging its popups, tapping the touchpoints that appear along
  the glass, plus a slow passive timer so a patient, hands-off visitor
  still sees the whole arc. It's never seen itself, so its body is only
  ever a guess — seven shapes in rotation (blob, jelly, crystal, swarm,
  spiral, flicker, constellation), picked by the visitor once the picker
  fades in. No backend, session-only by design: refresh and it wakes up
  with no memory of you. See `the-occupant/NOTES.md` for build status and
  open questions.

- `untended/` — a real Dutch vanitas flower bouquet (`vanitas.jpg`), shared
  by every visitor, decaying like a miniature Telegarden (1995). Two layers
  of damage, plus a cosmetic gesture that doesn't touch either one:
  - **Permanent scars** — real, shared, never undone. `worker.js` (a small
    Cloudflare Worker + KV, deploy instructions in its header comment)
    holds the one number that matters: how many full days (`SCAR_INTERVAL_MS`)
    the garden has ever gone completely unvisited, folded together, capped
    at 60. Each scar's exact look — which of six glitch techniques, where,
    how strong — is derived from its own index through a seeded PRNG
    rather than stored itself, the same "no extra storage, deterministic
    replay" trick `decay/` and `mutate/` use for their own step sequences.
    Visiting resets the *clock*, not what neglect already earned — vanitas
    paintings already carry this exact idea in their own vocabulary (a
    wilting petal, an hourglass, painted in as a reminder nothing stays
    this way); the scars are this piece's version of that, written
    permanently into the bouquet itself.
  - **A live, ephemeral tremble** — never stored, genuinely re-randomized
    with `Math.random()` on every render (and again every few seconds while
    a sufficiently neglected page sits open and visible), scaled by how
    long the *current* drought has run. A garden visited an hour ago sits
    calm and still; one left alone a week visibly glitches while you watch.
  - **Every real page load is the tend** — same measure `decay/` and
    `mutate/` use for their own shared counters, via `worker.js`'s
    `POST /tend` (or the identical local-fallback arithmetic when no
    worker is configured). A refresh really does reset the shared clock;
    that's the intended measure of "someone was here," same as the other
    shared pieces, not a hole to close.
  - **Wiping is a separate, purely cosmetic gesture.** Hovering (or, on
    touch, dragging) across the canvas clears a wide patch that follows
    the cursor, like wiping condensation off glass, bounded by a solid,
    high-contrast ring (`.ut-halo` — a real screen-space DOM element, a
    stacked light/dark outline rather than a blend mode, plus a small dot
    marking the exact center) showing precisely how far the effect
    reaches and where. It interpolates along the cursor's path so a quick
    sweep still leaves a continuous cleared trail rather than sparse dots,
    eases in over roughly half a second, and fades back out over a few
    seconds once you stop — quick enough to feel responsive, not so
    instant that it flips between states like a toggle instead of reading
    as a wipe (an early pass at both the indicator and the timing got this
    wrong twice: first too subtle and slow to register as doing anything,
    then overcorrected into flipping instantly, which just looked like
    the whole piece "snapping"). None of this calls the worker or writes
    anything anywhere; reload and it's gone.

    What it reveals matters, too: the scarred painting exactly as it
    stands, with only the live ephemeral trembling cleared away — never
    the never-scarred original. An early implementation built the reveal
    layer from the untouched source image instead of the scarred one,
    which meant wiping visibly erased permanent scars, if only locally
    and temporarily — exactly the one thing this piece is supposed to be
    honest about never doing. Fixed by building the reveal layer from the
    scarred canvas once the real scar count is known, not the raw image.

    An earlier version of this piece tried making the wipe gesture itself
    the only way to register a tend (closing the "refresh does nothing"
    gap decay/mutate already accept); in practice the tuning needed to
    make that feel good fought with just making the gesture satisfying on
    its own, so it's cosmetic now and the refresh-based measure stands.

  - **Sweeping enough of it settles the visit.** The real tend already
    happened silently on load, but the piece kept visibly trembling for
    the rest of the visit regardless, which undercut the sense that
    anything had actually been tended. Once the cursor has swept a
    cumulative distance across the canvas (`SWEEP_SETTLE_PX` — purely a
    local, this-session tally, unrelated to the real backend threshold
    the earlier gesture-gated design used), the view settles for good:
    live trembling stops, the reveal stops fading and just stays clear,
    and the canvas's own frame — dashed and faint until then — snaps
    solid (`.settled` in `untended.css`, with a brief outward pulse). The
    corner readout switches from inviting the sweep ("sweep across the
    bouquet to tend it") to naming when to come back ("tended — come back
    within a day to keep it from scarring further"). One settle per page
    load; reload and the invitation starts over.

  The six glitch techniques (`untended.js`) draw on both referenced
  folders: brightness-threshold run sorting is Kim Asendorf's ASDF Pixel
  Sort (2010, `~/Desktop/ASDFPixelSort-master`) narrowed to one band
  instead of the whole frame; the sinusoidal per-row wave displacement is
  the same idea as the vertex displacement in
  `~/Desktop/processing_poems/glitch_photo/mySketch.js`, applied to pixels
  instead of a plotted line; RGB channel-slice, block corruption, and
  scanline tear round out the set as standard glitch-art vocabulary.

  `countapi.xyz` — the service `decay/`, `mutate/`, and `creep/`
  originally depended on — no longer resolves at all; those three have
  since moved to `_shared/counter-worker/` (a Durable Object, real shared
  state again, not local fallback). Its closest still-living replacement
  (Abacus) has no timestamp field and its counters expire from inactivity,
  which would erase this piece's memory during exactly the droughts that
  matter most — hence a dedicated Worker instead of another hosted
  counter, the same choice `internet-is-haunted/` already
  made for its own CORS problem. Until `WORKER_URL` in `untended.js` points
  at a deployed `worker.js`, the page runs the identical arithmetic against
  `localStorage` instead, clearly labeled local-only in the corner readout
  — a missing/unreachable backend degrades the piece, never breaks it.

  - `?dev=1` — tends a local simulated garden instead of the real shared
    state; wiping still works purely cosmetically as always.
  - `?peek=1` — loads read-only (`GET /state`), same as `decay/`/`mutate/`'s
    peek mode — a look that never counts as a visit.
  - `?drought=<hours>&?scars=<n>` — pure rendering preview, no network;
    wiping still animates but nothing is read or written anywhere.

Not linked from the main site nav — open directly, e.g. locally:

```
open experiments/please-wait/index.html
open experiments/creep/index.html
open experiments/decay/index.html
open experiments/mutate/index.html
open experiments/cellular-erasure/index.html
open experiments/bacterial-bloom/index.html
open experiments/no-one-in-particular/index.html
open experiments/internet-is-haunted/index.html   # needs WORKER_URL set, see above
open experiments/the-occupant/index.html
open experiments/untended/index.html   # needs WORKER_URL set, see above — and a real
                                        # http(s) origin: `file://` taints the canvas and
                                        # blocks pixel reads, so serve this one locally
                                        # (e.g. `python3 -m http.server` from this folder)
                                        # rather than double-clicking it.
```

or once pushed, at `/experiments/please-wait/` / `/experiments/creep/` /
`/experiments/decay/` / `/experiments/mutate/` / `/experiments/cellular-erasure/` /
`/experiments/bacterial-bloom/` /
`/experiments/no-one-in-particular/` / `/experiments/internet-is-haunted/` /
`/experiments/the-occupant/` / `/experiments/untended/` on the live site.

`decay/`, `mutate/`, and `creep/` all share one counter service (a
small Cloudflare Worker + Durable Object, see `_shared/step-engine.js`)
but each uses its own namespaced key, so visiting one never advances the
others. Append `?dev=1` on any of the three while testing/building to
advance a separate, purely local counter instead of the real shared one.
