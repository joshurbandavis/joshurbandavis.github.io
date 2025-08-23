/** 
 * Optimized Background Animation with p5.js
 * - Scales to window size
 * - Lower frame rate (30 fps)
 * - Removed heavy copy() calls
 * - Draws directly (or into an offscreen buffer if you want)
 */

const colorPalette = ["#d7263d", "#f46036", "#2e294e", "#1b998b", "#c5d86d"];

let bgColor;
let pg; // offscreen buffer for effects

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(30); // reduce fps for performance
  angleMode(DEGREES);

  // pick and remove background color from palette
  bgColor = random(colorPalette);
  colorPalette.splice(colorPalette.indexOf(bgColor), 1);

  background(bgColor);

  // optional offscreen buffer (could skip and just draw directly on canvas)
  pg = createGraphics(width, height);
  pg.background(bgColor);
}

function draw() {
  background(bgColor); // redraw clean background

  // draw vessels (scaled to screen)
  vessel(width * 0.3, height * 0.37, 2, 10, 5, 5);
  vessel(width * 0.3, height * 0.6, 3, 28, 5, 4);
  vessel(width * 0.39, height * 0.77, 1.75, 28, 5, 6);
  vessel(width * 0.22, height * 0.23, 1.35, 28, 5, 5);
  vessel(width * 0.26, height * 0.13, 4.25, 10, 5, 4);

  // if you want buffer effects, draw buffer instead:
  // image(pg, 0, 0);
}

function vessel(radius, y_input, position, strokeWeightOuter, strokeWeightInner, freq) {
  let x = width / position;
  let y = y_input;
  let m = radius + sin(frameCount * freq) * 50;

  push();
  translate(x, y);

  noFill();
  strokeWeight(strokeWeightOuter);
  stroke(lerpColor(color(colorPalette[2]), color(colorPalette[3]), map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(color(colorPalette[0]), color(colorPalette[1]), map(cos(frameCount), -1, 1, 0, 1)));
  ellipse(0, 0, m, m / 2);

  noFill();
  strokeWeight(strokeWeightInner);
  stroke(lerpColor(color(colorPalette[0]), color(colorPalette[1]), map(sin(frameCount), -1, 1, 0, 1)));
  ellipse(0, 0, m * 0.8, (m / 2) * 0.8);

  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  pg = createGraphics(width, height);
  pg.background(bgColor);
}
