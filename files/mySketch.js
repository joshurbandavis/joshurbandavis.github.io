let _minW, _maxW, _count;
let _palette0 = ["af3e4d", "2e86ab", "758e4f", "002a32", "f6ae2d", "fac9b8"];
let _aryRing = [], _aryRotate = [], numRing;
const TWO_PI = 2 * Math.PI;

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

  setObject();
  numRing = _aryRing.length;
}

function setObject() {
  _count = 0;

  let numRing = 600;
  let posR = _minW / 2.9;//3.1;//3.5;
  let posAngNoiseInit_0 = [random(10000), random(10000), random(10000)];
  let rNoiseInit_0 = [random(10000), random(10000), random(10000)];
  let posRNoiseInit_0 = [random(10000), random(10000), random(10000)];
  let posAngNoiseThetaInit = random(2 * PI);
  let rNoiseThetaInit = random(2 * PI);
  let posRNoiseThetaInit = random(2 * PI);
  let posAngNoiseStep = 0.15;
  let rNoiseStep = 0.3;//0.2;
  let posRNoiseStep = 0.3;//0.2;
  let posAngNoiseSpeed = 0.004 * random([-1, 1]);
  let rNoiseSpeed = 0.004 * random([-1, 1]);
  let posRNoiseSpeed = 0.004 * random([-1, 1]);

  shuffle(_palette0, true);

  _aryRing = [];
  let posAngInit, posAngNoiseInit, rNoiseInit, posRNoiseInit;
  for (let i = 0; i < numRing; i++) {
    posAngInit = TWO_PI / numRing * i;
    posAngNoiseInit = [posAngNoiseInit_0[0] + posAngNoiseStep * cos(posAngInit), posAngNoiseInit_0[1] + posAngNoiseStep * sin(posAngInit), posAngNoiseInit_0[2]];
    rNoiseInit = [rNoiseInit_0[0] + rNoiseStep * cos(posAngInit), rNoiseInit_0[1] + rNoiseStep * sin(posAngInit), rNoiseInit_0[2]];
    posRNoiseInit = [posRNoiseInit_0[0] + posRNoiseStep * cos(posAngInit), posRNoiseInit_0[1] + posRNoiseStep * sin(posAngInit), posRNoiseInit_0[2]];

    _aryRing[i] = new Ring(posR, posAngInit, posAngNoiseInit, posAngNoiseThetaInit, posAngNoiseSpeed, rNoiseInit, rNoiseThetaInit, rNoiseSpeed, posRNoiseInit, posRNoiseThetaInit, posRNoiseSpeed, _palette0);
  }

  _aryRotate = [[random(TWO_PI), random(0.01)], [random(TWO_PI), random(0.01)], [random(TWO_PI), random(0.01)]];
}

class Ring {
  constructor(posR, posAngInit, posAngNoiseInit, posAngNoiseThetaInit, posAngNoiseSpeed, rNoiseInit, rNoiseThetaInit, rNoiseSpeed, posRNoiseInit, posRNoiseThetaInit, posRNoiseSpeed, palette) {
    this.posR = posR;
    this.posAngInit = posAngInit;
    this.posAngNoiseInit = posAngNoiseInit;
    this.posAngNoiseThetaInit = posAngNoiseThetaInit;
    this.rNoiseInit = rNoiseInit;
    this.rNoiseThetaInit = rNoiseThetaInit;
    this.posRNoiseInit = posRNoiseInit;
    this.posRNoiseThetaInit = posRNoiseThetaInit;

    this.posAngNoiseSpeed = posAngNoiseSpeed;
    this.posAngMax = 2 * PI / 8 / 1.65;
    this.posAngMin = -this.posAngMax;
    this.posAngGap = this.posAngMax - this.posAngMin;
    this.posAngNoiseFreq = 4;

    this.rNoiseSpeed = rNoiseSpeed;
    this.rMax = this.posR / 2;
    this.rMin = this.rMax / 10;
    this.rGap = this.rMax - this.rMin;
    this.rNoiseFreq = 4;

    this.posRNoiseSpeed = posRNoiseSpeed;
    this.posRMax = this.posR;
    this.posRMin = this.posRMax * 0.75;//0.5;
    this.posRGap = this.posRMax - this.posRMin;
    this.posRNoiseFreq = 4;

    this.colNoiseFreq = 3;

    this.rotZ = random(2 * PI);

    this.palette = palette;
    this.aryCol = [];
    for (let i = 0; i < this.palette.length; i++) {
      this.aryCol[i] = color("#" + this.palette[i]);
    }

    this.numCol = 5;
    this.count = 0;
    this.TWO_PI_FOUR = TWO_PI * 4;
    this.TWO_PI_POS_ANG_FREQ = TWO_PI * this.posAngNoiseFreq;
    this.TWO_PI_R_FREQ = TWO_PI * this.rNoiseFreq;
    this.TWO_PI_POS_R_FREQ = TWO_PI * this.posRNoiseFreq;
  }

  draw() {
    // Pre-calculate frequently used values
    let noiseOffset = this.posAngNoiseSpeed * this.count;

    let posAngNoiseVal = sin(this.posAngNoiseThetaInit + this.TWO_PI_POS_ANG_FREQ *
      noise(this.posAngNoiseInit[0], this.posAngNoiseInit[1] + noiseOffset, this.posAngNoiseInit[2] + noiseOffset)) * 0.5 + 0.5;

    let posAng = this.posAngInit + this.posAngMin + this.posAngGap * posAngNoiseVal;

    let rNoiseVal = sin(this.rNoiseThetaInit + 2 * PI * this.rNoiseFreq *
      noise(this.rNoiseInit[0], this.rNoiseInit[1] + this.rNoiseSpeed * this.count, this.rNoiseInit[2] + this.rNoiseSpeed * this.count)) * 0.5 + 0.5;
    let r = this.rMin + this.rGap * rNoiseVal;

    let posRNoiseVal = sin(this.posRNoiseThetaInit + 2 * PI * this.posRNoiseFreq *
      noise(this.posRNoiseInit[0], this.posRNoiseInit[1] + this.posRNoiseSpeed * this.count, this.posRNoiseInit[2] + this.posRNoiseSpeed * this.count)) * 0.5 + 0.5;
    let posRNew = this.posRMin + this.posRGap * posRNoiseVal;

    let colNoiseVal = sin(this.posRNoiseThetaInit + 2 * PI * this.colNoiseFreq *
      noise(this.posRNoiseInit[0] + 1000, this.posRNoiseInit[1] + this.posRNoiseSpeed * this.count + 1000, this.posRNoiseInit[2] + this.posRNoiseSpeed * this.count) + 1000) * 0.5 + 0.5;
    let col_i1 = int(colNoiseVal * this.numCol);
    let col_i2 = (col_i1 + 1) % this.numCol;
    let colAmp = (colNoiseVal - col_i1 / this.numCol) * this.numCol;
    let col = lerpColor(this.aryCol[col_i1], this.aryCol[col_i2], colAmp);

    let tmpRotate = PI / 2;
    push();
    stroke(col);
    rotateX(tmpRotate);
    rotateY(posAng);
    translate(posRNew, 0, 0);
    rotateZ(this.rotZ);
    ellipse(0, 0, r, r, 36);
    pop();

    this.count++;
  }
}

function draw() {
  ortho(-width / 2, width / 2, -height / 2, height / 2, -_maxW * 2, _maxW * 4);
  background(90 / 100 * 255);

  rotateX(_aryRotate[0][0] + _aryRotate[0][1] * frameCount);
  rotateY(_aryRotate[1][0] + _aryRotate[1][1] * frameCount);
  rotateZ(_aryRotate[2][0] + _aryRotate[2][1] * frameCount);
  rotateX(PI / 4);

  for (let i = 0, len = numRing; i < len; i++) { // Cached length
    _aryRing[i].draw();
  }
}

