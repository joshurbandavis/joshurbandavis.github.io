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

  **v2 — three colonies, paint, and a real (if small) evolutionary
  search.** Prompted by being asked what else could be pulled in from
  actual Lenia research and demos: interactive variations, intuitive
  tunables, real color (not a repaint), and visible evolution.
  - **Three coupled fields instead of one, in a closed predation loop.**
    R, G and B each run their own Lenia growth-clip update, but each
    channel's potential also includes a cross-kernel term from the
    channel it preys on (R eats G, G eats B, B eats R — cyclic dominance,
    the same shape as May & Leonard's classic three-species competition
    model) *and* a negative term from its own predator. Both halves
    matter: a first pass with only "boosted by prey" and no "suppressed
    by predator" made all three channels converge onto nearly the same
    spatial pattern — caught with a cross-channel correlation check in
    Node (≈+1 with one term, ≈0 once both were added, confirming genuine
    spatial segregation rather than three overlapping copies of the same
    texture). Color is now literal: canvas and word tint are both a
    weighted mix of three real per-channel base hues by each channel's
    actual sampled intensity, not a single duotone ramp.
  - **A real "Flow Lenia"-style transport update was tried first, and
    dropped.** Instead of adding growth directly (which creates/destroys
    mass), the plan was to move existing mass via the gradient of the
    growth potential, deposited conservatively with bilinear splatting —
    verified in Node to hold total mass *exactly* constant across 300
    steps. But it visually collapsed into isolated point-spikes rather
    than sustaining blob/creature shapes, and cost ~35ms/step, both
    confirmed before it went anywhere near the page. Reverted to the
    proven additive update plus a much cheaper safeguard: after each
    step, blend each channel back toward its own starting total mass by
    a fraction (`renormFrac`, 0.5) — a soft nudge, not a hard conservation
    law. It's real enough to matter: Node-verified Fade and Flood presets
    now settle around 13% and 19% combined activity, not the old
    single-channel build's <2%/>40% extremes — which is also why the
    automatic "died back"/"overgrown" banners were retired as *displayed
    text* wording only (the detection code stays, tightened, mostly for
    what happens under extreme manual slider settings) rather than kept
    describing failure modes the new engine rarely reaches on its own.
  - **Paint-to-seed**, the single most-cited Lenia demo interaction:
    click or drag directly on the dish to deposit mass by hand into
    whichever of the three colonies is selected, plus a "Clear dish"
    button so a visitor can paint a creature from nothing rather than
    only reshaping a random seed. Painting updates the *live* field and
    its own mass target immediately (so the safeguard defends the new
    paint, not erodes it back toward the old baseline), independent of
    whether the automaton is currently running or paused.
  - **A real, small (1+1) evolutionary strategy.** Toggled off by
    default (`Evolve`). Every `evolveEvery` steps, it mutates the six
    growth parameters (mu/sigma × 3 channels) by a small random jitter,
    runs a short cloned trial under both the current and mutated rules,
    and keeps whichever produces higher fitness — fitness being the
    field's own mean per-channel spatial variance, which rewards texture
    and penalizes both degenerate extremes (a fully flat field, died back
    or overgrown, has ~zero variance either way) without a separate mass
    term. Accepted mutations are logged live with their new μ/σ per
    channel. The manual growth sliders set all three channels identically
    (one "temperament" control); evolution is the only thing that can
    make the three colonies drift into distinct personalities from each
    other, and the Instrument panel shows each channel's current μ/σ
    separately so that divergence is visible once it happens.
  - Verified before any of this touched the page: the exact shipped
    `advanceField()`/`mutateParams()`/`fitnessOf()` functions were
    extracted from the real file and run standalone in Node (not just
    the earlier prototype) — no NaN across 300 steps, ~17–21ms/step,
    activity in the expected band, a trial genuinely diverging from its
    parent. Then checked visually via two headless-Chrome screenshots
    (`chrome --headless=new --virtual-time-budget=... --screenshot=...`)
    with stderr grepped for uncaught exceptions — real color segregation
    confirmed, no console errors. Paint's pointer-event wiring reuses the
    exact same `getBoundingClientRect()` coordinate transform already
    verified working for word-sampling, but the gesture itself hasn't
    been interactively click-tested yet (no live browser access this
    session) — worth a real test pass before calling it fully done.

  **v3 — split the dish from the reading.** Prompted directly by user
  feedback after v2 shipped: "the bloom and the words are competing with
  each other, it's difficult to discern what's happening." They were
  right, and the cause was structural, not cosmetic — the poem was
  printed directly over the canvas, both layers animating, both shifting
  color, fighting for the same pixels.
  - **Two zones instead of one stack.** The dish (`.manuscript-field`)
    is now pure canvas — nothing else sits on it, so it reads cleanly as
    a living visual you watch or paint. The poem moved into its own
    `.reading-zone` below it: a plain, calm background, always legible.
  - **Word field-positions are now fixed, not DOM-derived.** v1/v2
    sampled the field at each word's actual on-screen position, which
    made sense when the word was printed on top of the canvas it was
    sampling. Once the reading has its own panel, "where the word is
    drawn" and "where it stands in the dish" are different questions —
    `assignWordPositions()` now gives every word a stable position once,
    at load time, by treating the poem's word order as a near-square
    virtual grid sized to word count and mapped onto the field (the same
    "one word, one cell, in reading order" idea `cellular-erasure/`
    already uses, just for a continuous field instead of a discrete
    grid). Stable across a resize now too, instead of silently
    reshuffling — and it meant the window-resize listener could be
    deleted outright rather than kept firing pointlessly.
  - **The live reading is the prominent thing now, not just the
    archive.** Every step, `updateLiveSelection()` runs the same
    mean-plus-half-standard-deviation threshold `captureBreath()` uses,
    live, and highlights whichever words currently clear it — so the
    "Selected" reading is always on screen, continuously, not something
    you only see after clicking Capture. Capture now means "file this
    instant away permanently," not "the only way to ever see a poem
    here" — the Captured-blooms section below was re-labeled "the
    archive" and its intro copy rewritten to say so.
  - **A real color bug, caught by actually looking at a screenshot: dim
    words were blending toward black.** Word color was computed as a
    raw weighted sum of the three channel colors by intensity — at low
    intensity that sum approaches `rgb(0,0,0)`, which is legible on the
    light theme's pale background but genuinely invisible against the
    dark theme's dark one. First headless screenshot of this layout
    caught it immediately (most of the poem was there but unreadable).
    Fixed by blending each word from the theme's own `--ink-soft` color
    toward the field's locally-dominant hue as brightness rises, instead
    of blending toward black — `computeWordColor()`, now shared by the
    live reading and the archived captures so the same bug can't recur
    in one place while being fixed in the other.
  - Snapshot regenerated headlessly against the new layout; alt text and
    gallery-card copy updated to describe the split rather than the old
    single-canvas look.

  **v4 — the poem composes and erases itself, word by word, permanently.**
  The user's own proposal, in response to being asked how the reading
  should actually display: fade words in and out, or let newly-stable
  words be chosen or erased as the dish moves. Both ideas, not one -
  fading stays for anything undecided; composition is layered on top of
  it, verified as a real property of the simulation before it became a
  feature.
  - **Verified in Node first: the dish never settles, but individual
    points regularly do, for a while.** Tracked 150 fixed sample points
    (the same virtual-grid layout `assignWordPositions()` uses) under
    the shipped Bloom preset, and checked, at each point, whether its
    last 15 steps held inside a 0.02 range. The *instantaneous* stable
    fraction never really grows - it oscillates around 3-15%, since a
    point that goes quiet can always get disturbed again later by a
    passing chaser. But locking a point the *first* time it ever
    qualifies, permanently, gives a real, unforced composition curve:
    17% locked by step 30 (~6s), 57% by step 100 (~20s), 92% by step 400
    (~80s) - and a couple of points that still hadn't locked after 800
    steps, sitting in a permanently contested spot. That asymmetry -
    most of it finishes, a little of it never does - wasn't tuned in.
  - **A word locks the first moment its own neighborhood holds still,
    decided as kept or erased by the live threshold at that instant,
    then never re-samples again.** `syncWordStyles()` now skips locked
    words entirely; `updateLiveSelection()` tracks a rolling 15-step
    history per still-unlocked word and calls `lockWord()` the moment
    its range drops under 0.02. Erased words get cellular-erasure's own
    `.covered` treatment verbatim (`background:var(--ink)`, transparent
    text) - which is theme-relative, not literally black, exactly like
    the sibling piece already does, confirmed by checking
    `cellular-erasure/index.html`'s own `.covered` rule rather than
    assuming; a first look at a dark-mode screenshot could easily have
    been mistaken for a bug otherwise.
  - **Painting revives a locked word.** Deposit mass within 4 field
    cells of an already-settled word's position and it unlocks, clears
    its history, and re-enters the negotiation - the one way to contest
    a decision besides starting over completely.
  - **Reading caption now reports the actual composition state**: how
    many words have settled, the kept/erased split, how many are still
    deciding, and how many of those are currently ahead - not just a
    single live percentage.
  - Captures now carry `locked`/`lockedBright` per word and render with
    the same permanent classes the live reading uses, and the threshold
    a fresh capture computes excludes already-locked words (their fate
    was decided when they settled, not re-judged against a new snapshot)
    - `captureBreath()` and `renderCaptures()` both updated together so
    the archive can't drift out of sync with what locking actually means.
  - Verified via a 25-second-virtual-time headless screenshot of the
    real page (not just the Node prototype): a live composition caption
    ("64 of 85 words have settled permanently, 7 kept, 57 erased - 21
    still deciding"), visible redaction blocks and permanent highlights,
    no console errors.

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

    That live-tremble reveal was the *only* payoff for a long stretch,
    and it's only ever visible during real, substantial neglect — maybe
    17+ hours of drought before the tremble even starts — so on a
    normally-tended page there was usually nothing there to reverse, and
    wiping read as inert no matter how the animation itself was tuned.
    Fixed by giving the whole canvas an always-present haze
    (`HAZE_FILTER` — `blur(6px) saturate(.45) brightness(.82)`,
    independent of the real drought/scar state) that wiping always clears
    back to full color and focus within the mask. Guarantees something
    satisfying to wipe on every visit regardless of the real shared
    clock, while leaving the honest mechanics underneath (scars stay,
    only tremble clears) completely unchanged.

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

    Settling also fires three purely decorative flourishes, none of which
    touch any real state: a warm bloom behind the canvas (`.ut-bloom`),
    a scatter of dust motes that drift up off the canvas and fade
    (`spawnParticles` — literalizes "the haze you just wiped away" as
    something actually leaving), and a one-time toast overlaid near the
    top of the canvas naming when to come back. The toast read as
    invisible in both directions while building it: once from being a
    sibling of `.ut-canvas-wrap` rather than a child, so its
    `position:absolute` had nothing correctly-positioned to anchor to and
    drifted toward the bottom of the viewport instead of sitting under
    the canvas; and once more, after moving it inside the wrapper, from
    sitting under the canvas's own `z-index:1` with no `z-index` of its
    own.

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

- `in-other-words/` — say something plainly and nine voices answer with
  the one line each of them ever wrote that sits closest in *meaning*:
  Taylor Swift, Phoebe Bridgers, ABBA, Leonard Cohen, Kendrick Lamar,
  Shakespeare's Sonnets, Emily Dickinson, Edgar Allan Poe, and Proverbs &
  Ecclesiastes (KJV). Built so more voices are cheap to add.
  - **Offline:** `build/build.mjs` downloads each corpus (cached in
    `build/.cache/`, gitignored), cuts it into units (a line plus the line
    after it; a verse for Proverbs), embeds every unit with
    `all-MiniLM-L6-v2` via transformers.js, and writes `data/<voice>.json`
    (text + source) and `data/<voice>.bin` (int8 vectors with one float32
    scale each, a quarter the size of float32) plus `data/voices.json`.
    `cd in-other-words/build && npm install && npm run build` rebuilds
    everything in a few minutes, `npm run build -- swift` rebuilds one
    voice, and `npm run build -- --dry poe` only parses (unit counts and
    sample lines, no embedding) for checking a new voice's parser.
  - **In the browser:** the same model (~23 MB, fetched once from Hugging
    Face via jsDelivr, then cached) embeds the visitor's sentence, and an
    exact scan over all ~35k vectors finds each voice's top 5 ("another ↻"
    steps through them). The voice with the highest best score gets marked
    "closest." No backend; nothing typed leaves the page. `?q=<text>`
    pre-fills and runs a query, so results are shareable as links.
  - **Adding a voice:** add an entry to `VOICES` in `build.mjs` (a name, a
    credit, and a `units()` that returns `{ a, b, src }`), rebuild, and give
    it an accent colour in `index.html` (`.voice[data-id="…"]`). The page
    lays voices out three across, so multiples of three fill the grid.
  - **Lyrics from Genius:** `geniusUnits('<Artist>')` pulls every song
    for an exact Genius artist name from a ~3M-song Genius dump on Hugging
    Face (`theelderemo/genius-lyrics-cleaned`) through the datasets
    server's filter endpoint, so nothing huge is downloaded. The server is
    often mid-rebuild of its index, so the fetch retries every 15s. Covers
    are other people's words and have to be listed by hand in `skip`
    (check the titles with `--dry`); alternate takes (demo, live, remix,
    voice memo…) are dropped by title, and sections credited to a guest
    (`[Verse 2: Jay Rock]`) are dropped unless the credit names one of
    `singers`. `since` / `exclude` trim a very large catalogue (Kendrick
    is 2011 onward without radio freestyles, or he'd be ~40% of the
    download on his own). The dump stops around 2022, so later albums are
    missing.
  - Model and dtype must match between `build.mjs` and `index.html`, or
    query and corpus vectors end up in different spaces.
  - The five lyric voices are copyrighted and their `data/*.json` hold
    every line in plain text; Shakespeare, Dickinson, Poe and the KJV are
    public domain.
  - Weight: ~16 MB of data (13 MB of it vectors) on top of the ~23 MB
    model, all cached after the first visit.
  - Looks: `scream.jpg` (supplied, not from Commons) tiles the whole page as
    web-1.0 wallpaper; each card carries its voice's portrait from
    `portraits/<voice>.jpg` (Wikimedia Commons, public domain or CC BY /
    BY-SA, credited with links in the page footer), faded under the card
    colour so the text stays readable. A new voice needs a portrait there
    and a `--portrait` / `--pos` line next to its accent colour.

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
