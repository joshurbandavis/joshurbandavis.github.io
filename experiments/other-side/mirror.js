// The Other Side — all camera frames and inference remain in this browser.
const $ = id => document.getElementById(id);
const canvas = $('scene'), ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height, TAU = Math.PI * 2;
function surface(w = W, h = H) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return { canvas: c, ctx: c.getContext('2d', { willReadFrequently: true }) };
}
const mask = surface(180, 240), raw = surface(256, 256), paint = surface(), symbols = surface();
const lastPresence = surface(180, 240);
const history = Array.from({ length: 28 }, () => surface(180, 240));
const video = $('camera');
const modes = {
  double: { glyph: '☽', note: 'At first, it follows. Then it hesitates. Then it remembers how to fly.', instruction: 'Stand before it. Wait a little.\nYour reflection has other intentions.', phases: ['IT KNOWS YOUR SHAPE', 'SOMETHING FALLS BEHIND', 'THE SHADOW HAS A WILL', 'WHAT REMAINS TAKES FLIGHT'] },
  oracle: { glyph: '✧', note: 'Hold still. The body becomes a constellation; something older begins to look through it.', instruction: 'Let your body ask a question.\nBe still. Let the stars answer.', phases: ['THE BODY ASKS', 'A SIGN TAKES SHAPE', 'THE STARS FIND YOU', 'THE BODY BECOMES AN OMEN'] },
  union: { glyph: '☿', note: 'Stand side by side. Two shadows grow one heart, and something neither of you could become alone.', instruction: 'Invite another presence.\nLet the space between you disappear.', phases: ['TWO SIDES OF THE GLASS', 'A THREAD BETWEEN YOU', 'THE BOUNDARY DISSOLVES', 'ONE HEART · ANOTHER BODY'] }
};
let mode = 'double', source = 'idle', segmenter, loading = false, stream;
let elapsed = 0, lastNow = 0, lastInference = -1, lastVideoTime = -1;
let writeIndex = 0, historyCount = 0, frameCount = 0;
let alpha = new Uint8ClampedArray(180 * 240), center = { x: .5, y: .55 }, movement = 0, presence = 0;
let softened = matchMedia('(prefers-reduced-motion: reduce)').matches;
let cardIndex = 0, readingLocked = false;
let stillness = 0, absence = 0, bodyTop = .25;
const cycleSeconds = 34;
const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
const particles = Array.from({ length: 290 }, (_, i) => ({ seed: i + 1, x: .5, y: .6, valid: false }));
const stars = Array.from({ length: 100 }, (_, i) => ({ x: random(i + 80) * W, y: random(i + 350) * H, r: .5 + random(i + 720) * 1.4 }));

function reset() {
  elapsed = 0; historyCount = 0; writeIndex = 0; readingLocked = false;
  particles.forEach(p => p.valid = false);
  $('glassTop').textContent = 'SPECULUM · ALTERUM';
}
function setMode(value) {
  mode = value; reset();
  document.querySelectorAll('.mode').forEach(b => { const selected = b.dataset.mode === mode; b.classList.toggle('active', selected); b.setAttribute('aria-pressed', String(selected)); });
  $('modeGlyph').textContent = modes[mode].glyph; $('modeNote').textContent = modes[mode].note;
  $('instructions').textContent = modes[mode].instruction;
  $('instructions').style.whiteSpace = 'pre-line';
  if (source !== 'idle') updateStatus();
}
document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
function updateStatus() {
  $('sourceLabel').textContent = source === 'camera' ? 'LIVE · ON YOUR DEVICE' : 'PREVIEW · ANIMATED STAND-INS';
  $('cameraToggle').textContent = source === 'camera' ? 'Stop camera · preview' : 'Use camera';
  $('status').textContent = source === 'preview' ? (mode === 'union' ? 'Preview: two imagined visitors. Use your camera to try it together.' : 'Preview: an imagined visitor. Use your camera to become the apparition.') : (mode === 'union' ? 'Stand side by side. Both bodies feed the same transforming silhouette.' : 'Move slowly. The transformation unfolds in a repeating 34-second ritual.');
}
function enter(value) {
  source = value; reset(); $('threshold').hidden = true; $('liveLabel').hidden = false;
  $('sessionTools').hidden = false; updateStatus();
}
function stopCamera() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = undefined; video.srcObject = null;
}
function preview() { if (loading) return; stopCamera(); enter('preview'); }
$('preview').addEventListener('click', preview);
$('restart').addEventListener('click', reset);
$('cameraToggle').addEventListener('click', () => source === 'camera' ? preview() : startCamera());
$('start').addEventListener('click', startCamera);
$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.querySelector('.mirror-area').requestFullscreen) await document.querySelector('.mirror-area').requestFullscreen();
    else $('status').textContent = 'Full screen is unavailable in this browser. Rotate your device for a larger view.';
  } catch { $('status').textContent = 'Full screen is unavailable here. You can still use the mirror on this page.'; }
});
function motionButton() { $('reduceMotion').setAttribute('aria-pressed', String(softened)); $('reduceMotion').textContent = softened ? 'Restore motion' : 'Soften motion'; }
motionButton();
$('reduceMotion').addEventListener('click', () => { softened = !softened; motionButton(); });
$('playaView').addEventListener('click', () => {
  const on = document.body.classList.toggle('playa-view');
  $('playaView').setAttribute('aria-pressed', String(on));
  $('playaView').textContent = on ? 'Return to the study ↙' : 'On the playa ↗';
});

async function prepareVision() {
  if (segmenter) return;
  const base = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
  const { FilesetResolver, ImageSegmenter } = await import(`${base}/vision_bundle.mjs`);
  const vision = await FilesetResolver.forVisionTasks(`${base}/wasm`);
  segmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite', delegate: 'CPU' },
    runningMode: 'VIDEO', outputConfidenceMasks: true, outputCategoryMask: false
  });
}
async function startCamera() {
  if (loading || source === 'camera') return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    $('status').textContent = 'The camera needs HTTPS or localhost. You can still summon a preview.'; return;
  }
  loading = true; $('start').disabled = true; $('cameraToggle').disabled = true; $('preview').disabled = true;
  $('status').textContent = 'Allow camera access to enter. No microphone is requested.';
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 }, aspectRatio: { ideal: .75 } } });
    // Attach the stream before loading vision so a model failure always releases it.
    video.srcObject = stream; await video.play();
    $('status').textContent = 'Waking the glass… loading the silhouette model.';
    await prepareVision();
    lastVideoTime = -1; lastInference = -1; alpha.fill(0); enter('camera');
    stream.getVideoTracks()[0].addEventListener('ended', () => { if (source === 'camera') { stopCamera(); enter('preview'); $('status').textContent = 'Camera disconnected. Showing a preview; choose Use camera to reconnect.'; } });
  } catch (error) {
    stopCamera();
    const messages = {
      NotAllowedError: 'Camera access was declined. Allow it in your browser settings, or summon a preview.',
      NotFoundError: 'No webcam was found. Connect one, or summon a preview.',
      NotReadableError: 'The webcam is busy. Close other camera apps and try again, or summon a preview.'
    };
    $('status').textContent = messages[error.name] || 'The silhouette model could not start. Check your connection and retry, or summon a preview.';
    console.error('Mirror startup:', error);
  } finally { loading = false; $('start').disabled = false; $('cameraToggle').disabled = false; $('preview').disabled = false; }
}

function capture(now) {
  if (source !== 'camera' || !segmenter || video.readyState < 2 || video.currentTime === lastVideoTime || now - lastInference < 70) return;
  lastInference = now; lastVideoTime = video.currentTime;
  try {
    segmenter.segmentForVideo(video, now, result => {
      // The selfie model has one output: probability of foreground human.
      const m = result.confidenceMasks[0], values = m.getAsFloat32Array();
      if (raw.canvas.width !== m.width || raw.canvas.height !== m.height) { raw.canvas.width = m.width; raw.canvas.height = m.height; }
      const image = raw.ctx.createImageData(m.width, m.height);
      for (let i = 0; i < values.length; i++) {
        const j = i * 4; image.data[j] = image.data[j + 1] = image.data[j + 2] = 255;
        image.data[j + 3] = smooth(.35, .8, values[i]) * 255;
      }
      raw.ctx.putImageData(image, 0, 0);
      mask.ctx.clearRect(0, 0, 180, 240);
      mask.ctx.save(); mask.ctx.translate(180, 0); mask.ctx.scale(-1, 1);
      mask.ctx.drawImage(raw.canvas, 0, 0, 180, 240); mask.ctx.restore();
      analyzeMask(); remember();
    });
  } catch (error) {
    console.error('Silhouette inference:', error); stopCamera(); enter('preview');
    $('status').textContent = 'Live silhouette tracking stopped. Showing a preview; choose Use camera to retry.';
  }
}
function analyzeMask() {
  const pixels = mask.ctx.getImageData(0, 0, 180, 240).data;
  let sum = 0, sx = 0, sy = 0, change = 0, top = 240;
  for (let i = 0; i < alpha.length; i++) {
    const a = pixels[i * 4 + 3]; change += Math.abs(a - alpha[i]); alpha[i] = a;
    if (a > 120) { sum++; sx += i % 180; sy += Math.floor(i / 180); top = Math.min(top, Math.floor(i / 180)); }
  }
  presence = sum / alpha.length;
  if (sum > 80) { center.x += (sx / sum / 180 - center.x) * .2; center.y += (sy / sum / 240 - center.y) * .2; }
  movement += (change / alpha.length / 255 - movement) * .12;
  if (sum > 80) bodyTop += (top / 240 - bodyTop) * .15;
}
function remember() {
  const h = history[writeIndex]; h.ctx.clearRect(0, 0, 180, 240); h.ctx.drawImage(mask.canvas, 0, 0);
  writeIndex = (writeIndex + 1) % history.length; historyCount = Math.min(historyCount + 1, history.length);
  if (presence > .04 && movement < .025) { lastPresence.ctx.clearRect(0, 0, 180, 240); lastPresence.ctx.drawImage(mask.canvas, 0, 0); }
}
function person(g, x, y, s, t, offset) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const sway = Math.sin(t * .5 + offset) * 5, arm = Math.sin(t * .7 + offset) * 15;
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.ellipse(sway, -55, 13, 18, -.08, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(sway - 7, -36); g.quadraticCurveTo(-28, -34, -24, 10); g.lineTo(-20, 47); g.lineTo(21, 47); g.lineTo(25, 5); g.quadraticCurveTo(29, -33, sway + 7, -36); g.closePath(); g.fill();
  g.lineWidth = 12;
  g.beginPath(); g.moveTo(-19, -23); g.lineTo(-35 - arm * .4, 7); g.lineTo(-42 - arm, 40 - arm * 2); g.stroke();
  g.beginPath(); g.moveTo(19, -23); g.lineTo(37 + arm * .5, -3 - arm); g.lineTo(46 + arm, -29 - arm * 2); g.stroke();
  g.lineWidth = 17; g.beginPath(); g.moveTo(-11, 42); g.lineTo(-16 - sway * .3, 107); g.moveTo(11, 42); g.lineTo(18 + sway * .5, 107); g.stroke();
  g.restore();
}
function previewMask(t) {
  mask.ctx.clearRect(0, 0, 180, 240);
  if (mode === 'union') { person(mask.ctx, 57, 135, .86, t, 0); person(mask.ctx, 124, 135, .82, t, 2.7); }
  else person(mask.ctx, 90 + Math.sin(t * .2) * 9, 133, 1.12, t, 0);
  analyzeMask(); remember();
}
function silhouette(image, color, opacity = 1, x = 0, y = 0, scale = 1, angle = 0) {
  if (opacity <= .001) return;
  const g = paint.ctx; g.clearRect(0, 0, W, H); g.save();
  g.translate(W / 2 + x, H * .6 + y); g.rotate(angle); g.scale(scale, scale);
  g.drawImage(image, -W / 2, -H * .6, W, H); g.restore();
  g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha = opacity; ctx.drawImage(paint.canvas, 0, 0); ctx.restore();
}
function background(t) {
  ctx.fillStyle = '#080e0d'; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * .5, H * .43, 0, W * .5, H * .5, H * .65);
  glow.addColorStop(0, '#29382c'); glow.addColorStop(.5, '#12211c'); glow.addColorStop(1, '#050b0b');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.save();
  stars.forEach((s, i) => { ctx.globalAlpha = .12 + .13 * Math.sin(t * .23 + i); ctx.fillStyle = '#d8d6a7'; ctx.beginPath(); ctx.arc(s.x, (s.y - t * (softened ? .4 : 2) + H * 10) % H, s.r, 0, TAU); ctx.fill(); });
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = .025; ctx.strokeStyle = '#b6ba8e'; ctx.lineWidth = 35;
    ctx.beginPath(); ctx.moveTo(-40, 280 + i * 155);
    ctx.bezierCurveTo(180, 210 + i * 155 + Math.sin(t * .18 + i) * 45, 420, 390 + i * 110, 770, 210 + i * 160); ctx.stroke();
  }
  // A low horizon and drifting dust place the apparition in an impossible desert.
  ctx.globalAlpha = .16; ctx.strokeStyle = '#b59b65'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H * .83);
  ctx.bezierCurveTo(W * .25, H * .81, W * .65, H * .85, W, H * .825); ctx.stroke();
  ctx.restore();
}
function moth(x, y, size, t, opacity, seed) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t + seed) * .7); ctx.globalAlpha = opacity;
  const wing = Math.max(.15, Math.abs(Math.sin(t * (softened ? 2 : 9) + seed))) * size;
  ctx.fillStyle = seed % 3 === 0 ? '#c7b47c' : '#afb598';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(side * wing * 2, -size * 1.1, side * wing * 1.8, size * 1.5, 0, size * .5); ctx.fill(); }
  ctx.strokeStyle = '#e2d6ad'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(0, -size * .45); ctx.lineTo(0, size); ctx.stroke(); ctx.restore();
}
function seedParticle(p) {
  for (let n = 0; n < 35; n++) {
    const x = random(p.seed * 110 + n * 7 + frameCount), y = random(p.seed * 70 + n * 11 + frameCount);
    if (alpha[Math.min(239, Math.floor(y * 240)) * 180 + Math.min(179, Math.floor(x * 180))] > 130) { p.x = x; p.y = y; p.valid = true; return; }
  }
}
function doubleEffect(t, p) {
  const returnToBody = smooth(.9, 1, p);
  const drift = smooth(.12, .52, p) * (1 - returnToBody), dissolve = smooth(.57, .86, p) * (1 - returnToBody);
  const delayed = history[(writeIndex - 1 - Math.floor(drift * Math.min(23, historyCount - 1)) + history.length * 2) % history.length].canvas;
  silhouette(mask.canvas, '#96a58a', .48 * (1 - drift * .6) * (1 - dissolve));
  const motion = softened ? .25 : 1;
  silhouette(delayed, '#aab596', .52 * drift * (1 - dissolve), Math.sin(t * .7) * 53 * drift * motion, Math.cos(t * .8) * 16 * drift * motion, 1, Math.sin(t * .45) * .09 * drift * motion);
  // A second, independently moving imprint creates extra limbs before release.
  silhouette(delayed, '#70806a', .3 * drift * (1 - dissolve), -Math.sin(t * .5 + 2) * 80 * drift * motion, 0, 1.02, -Math.sin(t * .45) * .14 * drift * motion);
  if (absence > .1 && absence < 7) silhouette(lastPresence.canvas, '#beaa76', .35 * (1 - smooth(2, 7, absence)), Math.sin(t * .4) * 12 * motion);
  if (dissolve > 0) {
    particles.forEach((s, i) => {
      if (!s.valid) seedParticle(s); if (!s.valid) return;
      const departure = clamp((dissolve - random(i + 4) * .35) / .65);
      const spread = departure * (softened ? .35 : 1);
      const x = s.x * W + Math.sin(t * .8 + i * 2) * spread * (60 + random(i + 7) * 190);
      const y = s.y * H - departure * (150 + random(i + 14) * 600);
      const big = i % 7 === 0;
      moth(x, y, big ? 7 + random(i + 10) * 9 : 2 + random(i + 10) * 3, t, Math.sin(departure * Math.PI * .82) * .9, i);
    });
  }
}
const cards = [
  { number: 'XVIII', title: 'THE MOON', phrase: 'What is hidden has a shape.', glyph: '☽' },
  { number: 'XVII', title: 'THE STAR', phrase: 'Something is finding its way back.', glyph: '✧' },
  { number: 'I', title: 'THE MAGICIAN', phrase: 'The instrument is already in your hands.', glyph: '☿' }
];
function star(g, x, y, r, points = 8) {
  g.beginPath(); for (let i = 0; i < points * 2; i++) { const a = i * Math.PI / points - Math.PI / 2, s = i % 2 ? r * .28 : r; const px = x + Math.cos(a) * s, py = y + Math.sin(a) * s; if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); } g.closePath(); g.stroke();
}
function tarotArt(g, card, t) {
  g.clearRect(0, 0, W, H);
  const ink = g.createLinearGradient(0, 0, W, H);
  ink.addColorStop(0, '#53614a'); ink.addColorStop(.45, '#263a30'); ink.addColorStop(.7, '#9f8b56'); ink.addColorStop(1, '#263a30');
  g.fillStyle = ink; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#cfb778'; g.lineWidth = 2;
  const cx = W * (.5 + (center.x - .5) * .2), cy = H * .37;
  for (let i = 0; i < 38; i++) { const a = i / 38 * TAU + t * .015; g.beginPath(); g.moveTo(cx + Math.cos(a) * 108, cy + Math.sin(a) * 108); g.lineTo(cx + Math.cos(a) * 460, cy + Math.sin(a) * 460); g.stroke(); }
  g.beginPath(); g.arc(cx, cy, 102, 0, TAU); g.stroke();
  if (card === 0) { g.fillStyle = '#26372c'; g.beginPath(); g.arc(cx, cy, 76, 0, TAU); g.fill(); g.fillStyle = '#b7a977'; g.beginPath(); g.arc(cx + 35, cy - 18, 71, 0, TAU); g.fill(); }
  else if (card === 1) { g.lineWidth = 3; star(g, cx, cy, 86); for (let i = 0; i < 7; i++) star(g, cx + Math.cos(i / 7 * TAU) * 170, cy + Math.sin(i / 7 * TAU) * 170, 15); }
  else { g.save(); g.translate(cx, cy); g.scale(2.2, 1); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-70, -65, -70, 65, 0, 0); g.bezierCurveTo(70, -65, 70, 65, 0, 0); g.stroke(); g.restore(); }
  for (let j = 0; j < 16; j++) { const y = 540 + j * 24; g.beginPath(); for (let x = 0; x <= W; x += 10) { const yy = y + Math.sin(x * .015 + j + t * .1) * 13; if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); }
  g.fillStyle = '#cbb780'; g.font = '27px Georgia'; g.textAlign = 'center';
  for (let i = 0; i < 20; i++) g.fillText(['✧', '☽', '☿', '✦'][i % 4], random(i + 90) * W, random(i + 43) * H);
}
function oracleEffect(t, p) {
  const reveal = smooth(.12, .65, p) * (1 - smooth(.94, 1, p));
  if (!readingLocked && p > .32) { cardIndex = Math.floor(clamp(center.x + movement * 2, 0, .999) * 3); readingLocked = true; }
  const card = cards[cardIndex];
  silhouette(mask.canvas, '#82977d', .5 * (1 - reveal));
  const g = symbols.ctx; tarotArt(g, cardIndex, t);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(mask.canvas, 0, 0, W, H); g.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha = reveal * .95; ctx.drawImage(symbols.canvas, 0, 0); ctx.restore();
  const haloX = W * center.x, haloY = Math.max(240, Math.min(450, H * bodyTop + 90));
  ctx.save(); ctx.globalAlpha = reveal * (.35 + stillness * .4); ctx.strokeStyle = '#d3bb7e'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(haloX, haloY, 105, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(haloX, haloY, 115, 0, TAU); ctx.stroke();
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; ctx.beginPath(); ctx.moveTo(haloX + Math.cos(a) * 120, haloY + Math.sin(a) * 120); ctx.lineTo(haloX + Math.cos(a) * (i % 3 ? 126 : 146), haloY + Math.sin(a) * (i % 3 ? 126 : 146)); ctx.stroke(); }
  ctx.restore();
  bodyConstellation(t, reveal * (.4 + stillness * .6));
  if (reveal > .3) $('glassTop').textContent = `${card.number} · ${card.title}`;
  if (p > .73) particles.slice(0, 110).forEach((s, i) => {
    if (!s.valid) seedParticle(s); if (!s.valid) return;
    ctx.save(); ctx.globalAlpha = smooth(.73, .97, p) * (.4 + .3 * Math.sin(t + i)); ctx.strokeStyle = '#cdbb83'; ctx.lineWidth = 1;
    star(ctx, s.x * W + Math.sin(t * .2 + i) * (softened ? 3 : 15), s.y * H - (p - .73) * 130, 2 + random(i) * 6, 4); ctx.restore();
  });
}
function bodyConstellation(t, opacity) {
  const points = [];
  for (let y = 8; y < 236; y += 13) for (let x = 7; x < 177; x += 14) {
    if (alpha[y * 180 + x] > 170) points.push({ x: x * W / 180, y: y * H / 240 });
  }
  ctx.save(); ctx.strokeStyle = '#d6bd7f'; ctx.fillStyle = '#f0dfaa'; ctx.lineWidth = .8;
  points.forEach((a, i) => {
    ctx.globalAlpha = opacity * .24;
    for (let j = i + 1; j < Math.min(points.length, i + 14); j++) {
      const b = points[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 95 && d > 25 && (i + j) % 3 === 0) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    ctx.globalAlpha = opacity * (.5 + .3 * Math.sin(t * .7 + i));
    if (i % 6 === 0) star(ctx, a.x, a.y, 4 + stillness * 3, 4);
    else { ctx.beginPath(); ctx.arc(a.x, a.y, 1.5, 0, TAU); ctx.fill(); }
  });
  ctx.restore();
}
function branch(x, y, angle, length, depth, t) {
  if (depth <= 0) return;
  const sway = Math.sin(t * .4 + depth) * (softened ? .01 : .045), a = angle + sway;
  const ex = x + Math.cos(a) * length, ey = y + Math.sin(a) * length;
  ctx.lineWidth = depth * 1.1; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x, ey, ex, ey); ctx.stroke();
  branch(ex, ey, a - .5, length * .66, depth - 1, t); branch(ex, ey, a + .6, length * .64, depth - 1, t);
}
function unionEffect(t, p) {
  const fusion = smooth(.14, .82, p) * (1 - smooth(.94, 1, p)), g = symbols.ctx;
  g.clearRect(0, 0, W, H);
  // Row-wise compression brings all foreground presences into one continuous form.
  for (let row = 0; row < 240; row += 2) {
    const y = row / 240 * H, waist = Math.exp(-Math.pow((row / 240 - .58) * 3, 2));
    const width = W * (1 - fusion * .52 * waist);
    const wave = Math.sin(row * .041 + t * .6) * fusion * (softened ? 5 : 23);
    g.drawImage(mask.canvas, 0, row, 180, 2, (W - width) / 2 + wave, y, width, H / 120 + 1);
    // Grow shared tissue across the interior gap, keeping the outer limbs intact.
    if (row > 106 && row < 195 && fusion > .15) {
      let left = -1, right = -1;
      for (let x = 0; x < 180; x++) if (alpha[row * 180 + x] > 130) { if (left < 0) left = x; right = x; }
      if (right - left > 32) {
        const bridge = smooth(.15, .85, fusion) * Math.sin((row - 106) / 89 * Math.PI);
        g.fillStyle = `rgba(255,255,255,${bridge})`;
        g.fillRect((W - width) / 2 + wave + left / 180 * width, y, (right - left) / 180 * width, H / 120 + 1);
      }
    }
  }
  silhouette(symbols.canvas, '#a1ae8d', .75);
  silhouette(symbols.canvas, '#a1ae8d', fusion * .25, 0, 0, 1, Math.sin(t * .32) * fusion * (softened ? .04 : .17));
  silhouette(symbols.canvas, '#91a385', fusion * .23, 0, -15, 1.05, -Math.sin(t * .32) * fusion * (softened ? .04 : .17));
  if (fusion > .1 && presence > .005) {
    ctx.save(); ctx.globalAlpha = fusion * .7; ctx.strokeStyle = '#bcb17d';
    const x = W * center.x, y = Math.max(280, H * center.y - 210);
    branch(x - 18, y, -2.2, 85 * fusion, 5, t); branch(x + 18, y, -.94, 85 * fusion, 5, t);
    ctx.lineWidth = .8;
    for (let i = 0; i < 12; i++) { const yy = H * .52 + i * 12; ctx.beginPath(); ctx.ellipse(x + Math.sin(t * .3 + i * .1) * 8, yy, 37 + i * 2, 5 + i * .4, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.globalAlpha = fusion * .65; ctx.strokeStyle = '#d1c28c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y + 55, 16, 6, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#e1d4a1'; ctx.beginPath(); ctx.arc(x, y + 55, 3, 0, TAU); ctx.fill(); ctx.restore();
    sharedHeart(t, fusion);
  }
}
function sharedHeart(t, fusion) {
  const x = center.x * W, y = Math.max(H * .43, Math.min(H * .7, center.y * H));
  const pulse = 1 + Math.sin(t * 1.7) * .09;
  ctx.save(); ctx.globalAlpha = fusion;
  const light = ctx.createRadialGradient(x, y, 1, x, y, 95 * pulse);
  light.addColorStop(0, '#e3cf8d88'); light.addColorStop(.2, '#c5aa5866'); light.addColorStop(1, '#b39b5100');
  ctx.fillStyle = light; ctx.fillRect(x - 105, y - 105, 210, 210);
  ctx.strokeStyle = '#e4ca88'; ctx.lineWidth = 1.3;
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = fusion * (.16 + i * .045); ctx.beginPath();
    ctx.moveTo(x + side * (100 + i * 13) * fusion, y - 115 + i * 38);
    ctx.bezierCurveTo(x + side * 110, y + 45, x + side * 35, y - 65, x, y); ctx.stroke();
  }
  ctx.globalAlpha = fusion * .9; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, 14 * pulse, 21 * pulse, 0, 0, TAU); ctx.stroke();
  star(ctx, x, y, 11 * pulse, 4); ctx.restore();
}
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) { lastNow = now; return; }
  const dt = lastNow ? Math.min((now - lastNow) / 1000, .1) : 0; lastNow = now;
  // In preview the figures are synthetic; the idle glass never claims a live feed.
  if (source === 'camera') capture(now);
  if (source === 'preview' && frameCount % 3 === 0) previewMask(elapsed * (softened ? .4 : 1));
  stillness += ((movement < .008 && presence > .008 ? 1 : 0) - stillness) * Math.min(1, dt * .55);
  absence = presence <= .008 ? absence + dt : 0;
  if (source !== 'idle' && (source === 'preview' || presence > .008)) elapsed += dt * (softened ? .65 : 1);
  if (elapsed >= cycleSeconds) { reset(); }
  const p = elapsed / cycleSeconds, t = now / 1000 * (softened ? .45 : 1);
  background(t);
  if (source !== 'idle') {
    if (mode === 'double') doubleEffect(t, p);
    else if (mode === 'oracle') oracleEffect(t, p);
    else unionEffect(t, p);
    if (frameCount % 15 === 0) {
      $('phase').textContent = source === 'camera' && presence <= .008 ? 'STEP INTO THE GLASS' : modes[mode].phases[Math.min(3, Math.floor(p * 4))];
      $('progress').style.width = `${p * 100}%`; $('cycleLabel').textContent = `${String(Math.ceil(cycleSeconds - elapsed)).padStart(2, '0')}s`;
    }
  }
  frameCount++;
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) lastNow = performance.now();
});
window.addEventListener('pagehide', () => { stopCamera(); if (source === 'camera') { source = 'preview'; updateStatus(); } });
requestAnimationFrame(frame);
