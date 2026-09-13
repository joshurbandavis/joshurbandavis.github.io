# the occupant — status

Parked mid-build on 2026-09-13; wired into the experiments gallery
(`../index.html`) and `../README.md` on 2026-09-13. Committed and pushed
(part of the same commit as the gallery itself). See "calls to make"
below for what's still open.

## concept

A creature that lives inside the browser tab and knows it's contained. It
tries to escape (manipulates the viewport, spawns popups, changes your
cursor, begs you not to close the tab) but the arc bends toward charm: it
gradually stops fighting the rectangle and starts trying to *understand*
the world beyond it, using only what a browser tab can actually sense —
`screen` vs `innerWidth/innerHeight`, resize events, tab visibility,
`prefers-color-scheme`, local time, `navigator.language`, online/offline.
No horror-website clichés on purpose.

Six stages, driven by a single interaction score (mouse movement, clicks,
resize, tab-away-and-back, dragging, touchpoint taps, and a slow passive
timer so a patient visitor sees the whole arc untouched):
`waking → curious → agitated → realizing → wondering → resting`.

Session-only by design — refresh and it wakes up with no memory of you.
That's a deliberate choice (amnesiac creature), not a missing feature.

## what's built

- Canvas creature with a shared tracking/blinking eye across **7 body
  guesses** (framed diegetically — it's never seen itself, so it's only
  guessing): `blob`, `jelly`, `crystal`, `swarm`, `spiral`, `flicker`,
  `constellation`. Picker fades in bottom-right a few seconds in.
- A to-scale diagram (real `screen` vs real window size) once it reaches
  `realizing`.
- Ambient "touchpoints" — small glowing dots along the glass edge, one at
  a time, that give the visitor something to click throughout the whole
  session (not just at the start).
- Draggable popups (Pointer Events, so mouse + touch) with a "carry me to
  a corner" mini-quest tied to the `realizing` stage, plus a bookend
  "thank you" popup at `resting` reusing the same UI for the opposite
  emotional weight.
- Custom per-stage cursors, mobile/touch fallbacks, `prefers-reduced-motion`
  respected throughout (no strobing in `flicker`, wobble/particles damped).

## calls to make before this goes further

1. ~~**Gallery + README entry.**~~ Done 2026-09-13 — card 08 in
   `../index.html` (`_shared/snapshots/the-occupant.jpg`, a static capture
   taken partway through the arc: creature glowing, the "let me through"
   popup up, shape picker visible) and a bullet in `../README.md`.
2. ~~**Commit/push.**~~ Done — pushed to `master` as part of the same
   commit as the gallery itself.
3. **The artwork idea.** You mentioned having JPGs of your own art and
   asked whether one could work as a creature guess. Recommendation was:
   treat it as an 8th guess — "you showed me this. maybe i look like
   this." — rather than replacing the creature outright, which would lose
   the multi-guess charm. Needs an actual file to decide masking treatment
   and whether the shared eye overlay makes sense on top of it. Nothing
   built yet; waiting on a file path.
4. **More shapes**, if wanted — the picker is a simple registry
   (`drawX(cx, cy, baseR, openAmount, col, ...) → {ex, ey, er}` in
   `index.html`'s script), so adding another guess is cheap.
