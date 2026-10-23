# The Other Side

A browser prototype for a sculptural divining mirror by Josh Urban Davis.

Open `/experiments/other-side/` over HTTPS, or serve the site on localhost.
No build step, backend, accounts, or recording. Click **Enter the mirror**
to grant webcam access. **Or summon a preview** runs animated stand-ins.

## Three apparitions

- **The Double:** a mirrored body mask follows, delays, develops independent
  imprints, then dissolves into moths sampled from the silhouette.
- **The Oracle:** motion and body position choose one of three original,
  procedurally drawn tarot images, which appear inside the visitor's body.
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
