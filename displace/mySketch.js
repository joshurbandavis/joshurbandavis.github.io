// Basic structure ref: https://itp-xstory.github.io/p5js-shaders/#/./docs/setting-up-shaders-in-p5

let theShader;
let WebGL;
let Canvas;
let img;

function preload(){
	theShader = new p5.Shader(this.renderer, vert, frag);
}

function setup() {
	createCanvas(windowWidth, windowHeight);
	pixelDensity(2);
	WebGL = createGraphics(width, height, WEBGL);
	Canvas = createGraphics(width, height);
	noStroke();
}

function draw() {
	WebGL.shader(theShader);

	theShader.setUniform('iResolution', [width, height]);
	theShader.setUniform('iPixelDensity', pixelDensity());
	theShader.setUniform('iCanvas', Canvas);
	theShader.setUniform('iMouse', [mouseX, mouseY]);
	theShader.setUniform('iTime', frameCount);

	WebGL.rect(0, 0, width, height);
	
	image(WebGL, 0, 0);
}

let STOP = false;
function keyPressed() {
  if (key == ' ') {
    STOP = !STOP;
    if (STOP) { noLoop(); }
    else { loop(); }
  }
}