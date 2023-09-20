// noprotect

const frag = `
	#ifdef GL_ES
	precision mediump float;
	#endif

	uniform vec2 iResolution;
	uniform float iPixelDensity;
	uniform sampler2D iCanvas;
	uniform vec2 iMouse;
	uniform float iTime;

	${ displace }
	${ snoise3D }
	${ snoise3DImage }
	${ gradient }
	${ Palette }
	${ extendMode }

	float smoo3(float x) { return x*x*(3.-2.*x); }
	vec2 smoo3(vec2 x) { return x*x*(3.-2.*x); }
	vec3 smoo3(vec3 x) { return x*x*(3.-2.*x); }
	vec4 smoo3(vec4 x) { return x*x*(3.-2.*x); }

	varying vec2 vTexCoord;
	void main() {
		vec2 uv = vTexCoord;
		vec2 mouse = iMouse.xy/iResolution.xy;
		mouse = min(max(vec2(0.), mouse), vec2(1.));

		uv-=0.5;
		uv.x *= iResolution.x/iResolution.y;

		vec2 muv = smoo3(mirror(uv, 1.));

		float scal = 2.;
		float gain = mouse.y*100.;
		float ofst = .5;
		float expo = mouse.x*2.5;
		vec3  move = vec3(0., 0., iTime*0.0025);
		vec4 dimg = snoise3DImage(1.*uv, scal, gain, ofst, expo, move);
		
		float wei = 0.1;
		vec2 duv = smoo3(displace(muv, dimg.rg, ofst, wei));

		vec2 puv = smoo3(conical(duv, vec2(.5), 5., iTime*0.001));

		vec4 color = smoo3(Palette(puv));

		gl_FragColor = smoo3(color);
	}
`