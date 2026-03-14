let _minW, _maxW;
let _palette0 = ["af3e4d", "2e86ab", "758e4f", "002a32", "f6ae2d", "fac9b8"];
let _aryRing = [], _aryRotate = [], numRing;
const TWO_PI = 2 * Math.PI;

// Pre-parsed palette as RGB arrays (avoids p5 color() overhead)
let _paletteRGB = [];

function setup() {
  p5.disableFriendlyErrors = true;
  createCanvas(windowWidth, windowHeight, WEBGL);
  _minW = min(width, height);
  _maxW = max(width, height);
  frameRate(45);

  rectMode(CENTER);
  ellipseMode(RADIUS);
  noFill();
  stroke(0, 60, 90);
  strokeWeight((_minW / 600) * pixelDensity());

  // Parse palette once upfront to RGB arrays
  _paletteRGB = _palette0.map(hex => [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16)
  ]);

  setObject();
  numRing = _aryRing.length;
}

function setObject() {
  let numRing = 400;
  let posR = _minW / 2.9;
  let posAngNoiseInit_0 = [random(10000), random(10000), random(10000)];
  let rNoiseInit_0 = [random(10000), random(10000), random(10000)];
  let posRNoiseInit_0 = [random(10000), random(10000), random(10000)];
  let posAngNoiseThetaInit = random(TWO_PI);
  let rNoiseThetaInit = random(TWO_PI);
  let posRNoiseThetaInit = random(TWO_PI);
  let posAngNoiseStep = 0.15;
  let rNoiseStep = 0.3;
  let posRNoiseStep = 0.3;
  let posAngNoiseSpeed = 0.004 * random([-1, 1]);
  let rNoiseSpeed = 0.004 * random([-1, 1]);
  let posRNoiseSpeed = 0.004 * random([-1, 1]);

  shuffle(_palette0, true);
  // Re-parse after shuffle
  _paletteRGB = _palette0.map(hex => [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16)
  ]);

  _aryRing = new Array(numRing);
  let posAngInit, posAngNoiseInit, rNoiseInit, posRNoiseInit;
  for (let i = 0; i < numRing; i++) {
    posAngInit = TWO_PI / numRing * i;
    posAngNoiseInit = [
      posAngNoiseInit_0[0] + posAngNoiseStep * cos(posAngInit),
      posAngNoiseInit_0[1] + posAngNoiseStep * sin(posAngInit),
      posAngNoiseInit_0[2]
    ];
    rNoiseInit = [
      rNoiseInit_0[0] + rNoiseStep * cos(posAngInit),
      rNoiseInit_0[1] + rNoiseStep * sin(posAngInit),
      rNoiseInit_0[2]
    ];
    posRNoiseInit = [
      posRNoiseInit_0[0] + posRNoiseStep * cos(posAngInit),
      posRNoiseInit_0[1] + posRNoiseStep * sin(posAngInit),
      posRNoiseInit_0[2]
    ];

    _aryRing[i] = new Ring(posR, posAngInit, posAngNoiseInit, posAngNoiseThetaInit, posAngNoiseSpeed, rNoiseInit, rNoiseThetaInit, rNoiseSpeed, posRNoiseInit, posRNoiseThetaInit, posRNoiseSpeed);
  }

  _aryRotate = [
    [random(TWO_PI), random(0.01)],
    [random(TWO_PI), random(0.01)],
    [random(TWO_PI), random(0.01)]
  ];
}

class Ring {
  constructor(posR, posAngInit, posAngNoiseInit, posAngNoiseThetaInit, posAngNoiseSpeed, rNoiseInit, rNoiseThetaInit, rNoiseSpeed, posRNoiseInit, posRNoiseThetaInit, posRNoiseSpeed) {
    this.posR = posR;
    this.posAngInit = posAngInit;
    // Flatten noise init arrays to individual values (avoids array lookups)
    this.paN0 = posAngNoiseInit[0];
    this.paN1 = posAngNoiseInit[1];
    this.paN2 = posAngNoiseInit[2];
    this.posAngNoiseThetaInit = posAngNoiseThetaInit;

    this.rN0 = rNoiseInit[0];
    this.rN1 = rNoiseInit[1];
    this.rN2 = rNoiseInit[2];
    this.rNoiseThetaInit = rNoiseThetaInit;

    this.prN0 = posRNoiseInit[0];
    this.prN1 = posRNoiseInit[1];
    this.prN2 = posRNoiseInit[2];
    this.posRNoiseThetaInit = posRNoiseThetaInit;

    this.posAngNoiseSpeed = posAngNoiseSpeed;
    this.posAngMax = TWO_PI / 8 / 1.65;
    this.posAngMin = -this.posAngMax;
    this.posAngGap = this.posAngMax - this.posAngMin;

    this.rNoiseSpeed = rNoiseSpeed;
    this.rMax = this.posR / 2;
    this.rMin = this.rMax / 10;
    this.rGap = this.rMax - this.rMin;

    this.posRNoiseSpeed = posRNoiseSpeed;
    this.posRMax = this.posR;
    this.posRMin = this.posRMax * 0.75;
    this.posRGap = this.posRMax - this.posRMin;

    // Pre-compute TWO_PI * freq constants
    this.twoPiPosAngFreq = TWO_PI * 4;
    this.twoPiRFreq = TWO_PI * 4;
    this.twoPiPosRFreq = TWO_PI * 4;
    this.twoPiColFreq = TWO_PI * 3;

    this.rotZ = random(TWO_PI);
    this.numCol = 5;
    this.count = 0;
  }

  draw() {
    let cnt = this.count;
    let paOff = this.posAngNoiseSpeed * cnt;
    let rOff = this.rNoiseSpeed * cnt;
    let prOff = this.posRNoiseSpeed * cnt;

    // Noise calls (unavoidable, but reduced overhead by flattening arrays)
    let posAngNoiseVal = sin(this.posAngNoiseThetaInit + this.twoPiPosAngFreq *
      noise(this.paN0, this.paN1 + paOff, this.paN2 + paOff)) * 0.5 + 0.5;

    let posAng = this.posAngInit + this.posAngMin + this.posAngGap * posAngNoiseVal;

    let rNoiseVal = sin(this.rNoiseThetaInit + this.twoPiRFreq *
      noise(this.rN0, this.rN1 + rOff, this.rN2 + rOff)) * 0.5 + 0.5;
    let r = this.rMin + this.rGap * rNoiseVal;

    let posRNoiseVal = sin(this.posRNoiseThetaInit + this.twoPiPosRFreq *
      noise(this.prN0, this.prN1 + prOff, this.prN2 + prOff)) * 0.5 + 0.5;
    let posRNew = this.posRMin + this.posRGap * posRNoiseVal;

    // Color: manual RGB lerp instead of lerpColor() — MUCH faster
    let colNoiseVal = sin(this.posRNoiseThetaInit + this.twoPiColFreq *
      noise(this.prN0 + 1000, this.prN1 + prOff + 1000, this.prN2 + prOff) + 1000) * 0.5 + 0.5;
    let ci1 = (colNoiseVal * this.numCol) | 0; // Bitwise floor
    let ci2 = (ci1 + 1) % this.numCol;
    let t = (colNoiseVal - ci1 / this.numCol) * this.numCol;
    let c1 = _paletteRGB[ci1];
    let c2 = _paletteRGB[ci2];
    // Manual lerp avoids creating p5.Color objects entirely
    let cr = c1[0] + (c2[0] - c1[0]) * t;
    let cg = c1[1] + (c2[1] - c1[1]) * t;
    let cb = c1[2] + (c2[2] - c1[2]) * t;

    push();
    stroke(cr, cg, cb);
    rotateX(HALF_PI);
    rotateY(posAng);
    translate(posRNew, 0, 0);
    rotateZ(this.rotZ);
    ellipse(0, 0, r, r, 24); // 24 segments instead of 36 — barely visible difference
    pop();

    this.count++;
  }
}

function draw() {
  ortho(-width / 2, width / 2, -height / 2, height / 2, -_maxW * 2, _maxW * 4);
  background(230); // Direct value instead of 90/100*255

  let fc = frameCount;
  rotateX(_aryRotate[0][0] + _aryRotate[0][1] * fc);
  rotateY(_aryRotate[1][0] + _aryRotate[1][1] * fc);
  rotateZ(_aryRotate[2][0] + _aryRotate[2][1] * fc);
  rotateX(HALF_PI / 2); // PI/4 = HALF_PI/2, uses p5 constant

  for (let i = 0; i < numRing; i++) {
    _aryRing[i].draw();
  }
}