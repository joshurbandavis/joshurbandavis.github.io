/** * Color palette */
const colorPalette = ["#d7263d", "#f46036", "#2e294e", "#1b998b", "#c5d86d"];

let bgColor;
let seed;
let frm;
let m, bf1, bf2;
let cx1, cy1;

function setup() {
  createCanvas(1160, 1500);
  angleMode(DEGREES);
  background(255);
  bgColor = random(colorPalette);
  colorPalette.splice(colorPalette.indexOf(bgColor), 1);
  colorPalette = shuffle(colorPalette);
  background(bgColor);
}

function draw() {
  vessel(width * 0.3, height * 0.37, 2, 10, 5, 5); // Vessel 1 (center)
  vessel(width * 0.3, height * 0.6, 3, 28, 5, 4); // Vessel 2 (left lower)
  vessel(width * 0.39, height * 0.77, 1.75, 28, 5, 6); // Vessel 3 (lower right)
  vessel(width * 0.22, height * 0.23, 1.35, 28, 5, 5); // Vessel 4 (far right)
  vessel(width * 0.26, height * 0.13, 4.25, 10, 5, 4); // Vessel 5 (far left)
}

function vessel(radius, y_input, position, strokeWeightOuter, strokeWeightInner, freq) {
  randomSeed(seed);
  let d = int(width / 30 + 50);
  let x = width / position, y = y_input;
  let m = radius + sin(frameCount * freq) * 50;

  push();
  translate(x, y);
  push();
  translate(0, 0);
  noFill();
  strokeWeight(10);
  stroke(lerpColor(colorPalette[2], colorPalette[3], map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(colorPalette[0], colorPalette[1], map(cos(frameCount), -1, 1, 0, 1)));
  strokeWeight(strokeWeightOuter);
  stroke(lerpColor(colorPalette[2], colorPalette[3], map(sin(frameCount), -1, 1, 0, 1)));
  ellipse(0, 0, m, m / 2);
  noFill();
  strokeWeight(5);
  stroke(lerpColor(colorPalette[0], colorPalette[1], map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(colorPalette[0], colorPalette[1], map(cos(frameCount), -1, 1, 0, 1)));
  strokeWeight(strokeWeightInner);
  stroke(lerpColor(colorPalette[0], colorPalette[1], map(sin(frameCount), -1, 1, 0, 1)));
  pop();
  copy(this.get(), d, d, width - d * 2, height - d * 2, d - x, d - y + 5, width - d * 2, height - d * 2);
  pop();
}