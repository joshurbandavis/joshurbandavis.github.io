/**
 * color pallet
 */
// let curl = "https://coolors.co/555233-df921d-878937-cfc52A-dc2a41";
let curl = "https://coolors.co/d7263d-f46036-2e294e-1b998b-c5d86d";
//let curl = "https://coolors.co/1b998b-ed217c-2d3047-fffd82-ff9b71";
// let curl = "https://coolors.co/171219-225560-edf060-f0803c-310d20";

let bgColor;
let seed;
let frm;
let m, bf1, bf2;
let cx1, cy1;

function setup() {
  //createCanvas(1160, 1500);
  createCanvas(1001, 1300);
  //createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  background(255);

  pal = createPallete(curl);
  let cid = int(random(pal.length));
  bgColor = pal[cid];
  pal.splice(cid, 1);
  pal = shuffle(pal);

  background(bgColor);
  // effect();  // noise effect
}

function draw() {

  //vessel 1 (center)
  vessel(width * .3, height * .37, 2, 10, 5, 4);
  //vessel 2 (left lower)
  vessel(width * .3, height * .6, 3, 28, 5, 2);
  //vessel 3 (lower right)
  vessel(width * .39, height * .77, 1.75, 28, 5, 2);
  //vessel 4 (far right)
  vessel(width * .22, height * .26, 1.35, 28, 5, 2);
  //vessle 5 (far left)
  vessel(width * .26, height * .17, 4, 10, 5, 2);

}

// function keyPressed() {
//     save('pix.jpg');
// }

function vessel(radius, y_input, position, strokeWeightOuter, strokeWeightInner, freq) {

  randomSeed(seed);

  let d = int(width / 30 + 50);
  let x = width / position, y = y_input;
  let m = radius + sin(frameCount * freq) * 50;

  //let m = m/width;

  push();
  translate(x, y);

  push();
  translate(0, 0);
  //noFill();  strokeWeight(10);  stroke(lerpColor(pal[2], pal[3], map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(pal[0], pal[1], map(cos(frameCount), -1, 1, 0, 1))); strokeWeight(strokeWeightOuter); stroke(lerpColor(pal[2], pal[3], map(sin(frameCount), -1, 1, 0, 1)));
  ellipse(0, 0, m, m / 2);
  //noFill();  strokeWeight(5);  stroke(lerpColor(pal[0], pal[1], map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(pal[0], pal[1], map(cos(frameCount), -1, 1, 0, 1))); strokeWeight(strokeWeightInner); stroke(lerpColor(pal[0], pal[1], map(sin(frameCount), -1, 1, 0, 1)));
  //ellipse(0, 0, m, m/2);
  pop();

  copy(this.get(),
    d, d, width - d * 2, height - d * 2,
    d - x, d - y + 5, width - d * 2, height - d * 2
  );

  pop();

  // effect();
  // drawWindow();
  //noStroke();
  //fill(90);
  //rect(0, height - 84, width, height);
  //fill(50);
  //rect(0, height - 64, width, height);
}

function effect() {
  strokeWeight(1);
  for (let i = 0; i < width * height * 5 / 50; i++) {
    stroke(0, 0, 0, 10);
    let px = random(width);
    let py = random(height);
    point(px, py);
  }
}

function drawWindow() {
  w = width / 30;
  noStroke();
  fill(255);
  rect(0, 0, width, w);
  rect(0, height - w, width, w);
  rect(0, 0, w, height);
  rect(width - w, 0, w, height);
}

function createPallete(_url) {
  let slash_index = _url.lastIndexOf('/');
  let pallate_str = _url.slice(slash_index + 1);
  let arr = pallate_str.split('-');
  for (let i = 0; i < arr.length; i++) {
    arr[i] = color('#' + arr[i]);
  }
  return arr;
}