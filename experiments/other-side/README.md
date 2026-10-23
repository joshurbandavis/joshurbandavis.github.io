# The Other Side

A browser prototype for a sculptural divining mirror by Josh Urban Davis.

Revised as a Burning Man **2027 / Spellbound** sculpture study. The official
theme foregrounds divination, elemental magic, impossible illusions, and shared
enchantment: https://journal.burningman.org/2026/09/news/official-announcements/burning-man-2027-spellbound/

## Playa revision

The current frame follows the user's tall antique gilt mirror reference:
an arched opening, rounded gold moldings, shell crest, carved acanthus at
the shoulders and lower corners, and a scalloped lower rail. It replaces
the earlier crescent/eye/moth surround with an original SVG drawing; the
reference photograph, watermark, and checkerboard are not used as assets.
The glass uses a matching vector clip and a centered cover crop so the
narrower aperture preserves the animation's proportions. Visitors may need
to stand farther back to fit two full bodies within the narrow glass.

- A separate vector surround adds layered gold moldings and carved foliage.
  `frame.svg` is transparent across the aperture, so the decoration never
  becomes part of the camera image.
- **On the playa** switches to a desert night scale study with mountain
  silhouettes, a ground plane, and an imagined visitor. This is a composition
  study with no specified physical dimensions or photometric simulation.
- The Double now has occasional larger moths, a return into bodily form,
  and a fading imprint of the last reasonably still visitor after departure.
- The Oracle removes the rectangular card UI and floating reading sentence
  from the glass. Body-sampled constellations, an adaptive halo, and brighter
  linework with stillness make the visitor the divination mechanism.
- The Union develops a common glowing heart and connecting filaments. Its
  fusion eases back into the visitors' silhouettes at the end of a cycle.

The artistic priority is recognition → impossible behavior → transformation.
At a large scale, independent shadows and the shared creature should carry
the primary illusion; celestial detail and divination reward close viewing.
This prototype does not validate projector brightness, reflective optical
arrangements, daylight appearance, structural anchoring, or dust protection.

Open `/experiments/other-side/` over HTTPS, or serve the site on localhost.
No build step, backend, accounts, or recording. Click **Enter the mirror**
to grant webcam access. **Or summon a preview** runs animated stand-ins.

## Three apparitions

- **The Double:** a mirrored body mask follows, delays, develops independent
  imprints, then dissolves into moths sampled from the silhouette.
- **The Oracle:** motion and body position choose one of three original,
  procedurally drawn tarot images, which appear inside the visitor's body
  with a halo and constellations that brighten as the visitor holds still.
- **The Union:** the combined foreground silhouette narrows and grows shared
  tissue, duplicated limbs, and branching antlers. Try two visitors side by
  side. This is an optical study using a shared person mask, not individual
  person detection, tracking, or counting. The preview contains two figures.

Each apparition progresses automatically through a repeating 34-second cycle.
The cycle waits when no silhouette is visible and pauses when the tab is hidden.
Switching mode or choosing **Begin again** restarts the ritual. **Soften motion**
reduces travel, flutter, and cycle speed; the operating system's reduced-motion
preference is respected at startup. Full screen is available where supported.
**Stop camera · preview** releases the webcam; leaving the page also releases it.

## Dependencies and privacy

MediaPipe Tasks Vision 0.10.21 is loaded on demand from jsDelivr. The pinned
MediaPipe Selfie Segmenter float16 v1 model is downloaded from Google Storage.
Cormorant Garamond and DM Sans load from Google Fonts, with local fallbacks.
Those providers receive ordinary resource requests; camera frames, masks, and
motion measurements are processed in browser memory and are never uploaded or
saved by this page. Preview mode does not download the vision model.

Requires a browser with Canvas 2D, WebAssembly, ES modules, and getUserMedia.
The camera requires HTTPS or localhost. Camera-denied, missing-camera, and
model-loading errors offer the preview rather than substituting raw video.
Low light, occlusion, or a cluttered background can affect segmentation.
The camera image is fit to the tall glass as an intentional optical distortion.

Implementation reference: https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter/web_js
