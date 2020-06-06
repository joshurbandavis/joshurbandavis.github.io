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
  createCanvas(1200, 1500);
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

  //
  //vessel 1
  //

  randomSeed(seed);

  let d = int(width / 30 + 50);
  let x = width / 2, y = 600;
  let m = 350 + sin(frameCount * 4) * 50;

  push();
  translate(x, y);

  push();
  translate(0, 0);
  //noFill();  strokeWeight(10);  stroke(lerpColor(pal[2], pal[3], map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(pal[0], pal[1], map(cos(frameCount), -1, 1, 0, 1))); strokeWeight(10); stroke(lerpColor(pal[2], pal[3], map(sin(frameCount), -1, 1, 0, 1)));
  ellipse(0, 0, m, m / 2);
  //noFill();  strokeWeight(5);  stroke(lerpColor(pal[0], pal[1], map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(pal[0], pal[1], map(cos(frameCount), -1, 1, 0, 1))); strokeWeight(5); stroke(lerpColor(pal[0], pal[1], map(sin(frameCount), -1, 1, 0, 1)));
  //ellipse(0, 0, m, m/2);
  pop();

  copy(this.get(),
    d, d, width - d * 2, height - d * 2,
    d - x, d - y + 5, width - d * 2, height - d * 2
  );

  pop();

  // effect();
  // drawWindow();
  noStroke();
  fill(90);
  rect(0, height - 84, width, height);
  fill(50);
  rect(0, height - 64, width, height);

  //
  //vessel 2
  //

  randomSeed(seed);

  let d2 = int(width / 30 + 50);
  let x2 = width / 3, y2 = 950;
  let m2 = 350 + cos(frameCount * 4) * 50;

  push();
  translate(x2, y2);

  push();
  translate(0, 0);
  //noFill();  strokeWeight(10);  stroke(lerpColor(pal[2], pal[3], map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(pal[0], pal[1], map(cos(frameCount), -1, 1, 0, 1))); strokeWeight(28); stroke(lerpColor(pal[2], pal[3], map(sin(frameCount), -1, 1, 0, 1)));
  ellipse(0, 0, m2, m2 / 2);
  //noFill();  strokeWeight(5);  stroke(lerpColor(pal[0], pal[1], map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(pal[0], pal[1], map(cos(frameCount), -1, 1, 0, 1))); strokeWeight(5); stroke(lerpColor(pal[0], pal[1], map(sin(frameCount), -1, 1, 0, 1)));
  //ellipse(0, 0, m, m/2);
  pop();

  copy(this.get(),
    d2, d2, width - d2 * 2, height - d2 * 2,
    d2 - x2, d2 - y2 + 5, width - d2 * 2, height - d2 * 2
  );

  pop();

  // effect();
  // drawWindow();
  noStroke();
  fill(90);
  rect(0, height - 84, width, height);
  fill(50);
  rect(0, height - 64, width, height);


  //
  //vessel 3
  //

  randomSeed(seed);

  let d3 = int(width / 30 + 50);
  let x3 = width / 1.75, y3 = 1200;
  let m3 = 450 + cos(frameCount * 4) * 50;

  push();
  translate(x3, y3);

  push();
  translate(0, 0);
  //noFill();  strokeWeight(10);  stroke(lerpColor(pal[2], pal[3], map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(pal[0], pal[1], map(cos(frameCount), -1, 1, 0, 1))); strokeWeight(28); stroke(lerpColor(pal[2], pal[3], map(sin(frameCount), -1, 1, 0, 1)));
  ellipse(0, 0, m3, m3 / 2);
  //noFill();  strokeWeight(5);  stroke(lerpColor(pal[0], pal[1], map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(pal[0], pal[1], map(cos(frameCount), -1, 1, 0, 1))); strokeWeight(5); stroke(lerpColor(pal[0], pal[1], map(sin(frameCount), -1, 1, 0, 1)));
  //ellipse(0, 0, m, m/2);
  pop();

  copy(this.get(),
    d3, d3, width - d3 * 2, height - d3 * 2,
    d3 - x3, d3 - y3 + 5, width - d3 * 2, height - d3 * 2
  );

  pop();

  // effect();
  // drawWindow();
  noStroke();
  fill(90);
  rect(0, height - 84, width, height);
  fill(50);
  rect(0, height - 64, width, height);

  //
  //vessel number 4
  //

  randomSeed(seed);

  let d4 = int(width / 30 + 50);
  let x4 = width / 1.35, y4 = 400;
  let m4 = 250 + cos(frameCount * 4) * 50;

  push();
  translate(x4, y4);

  push();
  translate(0, 0);
  //noFill();  strokeWeight(10);  stroke(lerpColor(pal[2], pal[3], map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(pal[0], pal[1], map(cos(frameCount), -1, 1, 0, 1))); strokeWeight(28); stroke(lerpColor(pal[2], pal[3], map(sin(frameCount), -1, 1, 0, 1)));
  ellipse(0, 0, m4, m4 / 2);
  //noFill();  strokeWeight(5);  stroke(lerpColor(pal[0], pal[1], map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(pal[0], pal[1], map(cos(frameCount), -1, 1, 0, 1))); strokeWeight(5); stroke(lerpColor(pal[0], pal[1], map(sin(frameCount), -1, 1, 0, 1)));
  //ellipse(0, 0, m, m/2);
  pop();

  copy(this.get(),
    d4, d4, width - d3 * 2, height - d4 * 2,
    d4 - x4, d4 - y4 + 5, width - d4 * 2, height - d4 * 2
  );

  pop();

  //effect();
  // drawWindow();
  noStroke();
  fill(90);
  rect(0, height - 84, width, height);
  fill(50);
  rect(0, height - 64, width, height);

  //
  //vessel number 5
  //

  randomSeed(seed);

  let d5 = int(width / 30 + 50);
  let x5 = width / 4.5, y5 = 250;
  let m5 = 300 + cos(frameCount * 5) * 50;

  push();
  translate(x5, y5);

  push();
  translate(0, 0);
  //noFill();  strokeWeight(10);  stroke(lerpColor(pal[2], pal[3], map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(pal[0], pal[1], map(cos(frameCount), -1, 1, 0, 1))); strokeWeight(10); stroke(lerpColor(pal[2], pal[3], map(sin(frameCount), -1, 1, 0, 1)));
  ellipse(0, 0, m5, m5 / 2);
  //noFill();  strokeWeight(5);  stroke(lerpColor(pal[0], pal[1], map(sin(frameCount), -1, 1, 0, 1)));
  fill(lerpColor(pal[0], pal[1], map(cos(frameCount), -1, 1, 0, 1))); strokeWeight(5); stroke(lerpColor(pal[0], pal[1], map(sin(frameCount), -1, 1, 0, 1)));
  //ellipse(0, 0, m, m/2);
  pop();

  copy(this.get(),
    d5, d5, width - d5 * 2, height - d5 * 2,
    d5 - x5, d5 - y5 + 5, width - d5 * 2, height - d5 * 2
  );

  pop();

  //effect();
  // drawWindow();
  noStroke();
  fill(90);
  rect(0, height - 84, width, height);
  fill(50);
  rect(0, height - 64, width, height);

}

// function keyPressed() {
//     save('pix.jpg');
// }

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