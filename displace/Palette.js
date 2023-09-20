// noprotect

const Palette = `
	// MIT License
	// Copyright © 2023 Zaron
	// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
	// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

	float pulse(float start, float end) {
		return step(0., start) * step(end, 0.);
	}

	vec4 grad(float area, vec4 startCol, vec4 endCol, float startPos, float endPos) {
		float u = pulse(area-startPos, area-endPos);
		vec4 gradientCol = mix(startCol, endCol, (area-startPos)/(endPos-startPos))*u;
		return gradientCol;
	}

	vec4 Palette(vec2 puv) {
		// define your colors
		vec4 cols[5];
		cols[0] = vec4(0., 0., 0., 1.);
		cols[1] = vec4(.8, .5, .0, 1.);
		cols[2] = vec4(1., 1., 1., 1.);
		cols[3] = vec4(.3, .6, .7, 1.);
		cols[4] = vec4(0., 0., 0., 1.);

		// define positions of your colors (0.0 - 1.0)
		float pos[5];
		pos[0] = 0.0;
		pos[1] = 0.25;
		pos[2] = 0.5;
		pos[3] = 0.75;
		pos[4] = 1.0;

		vec4 result_color = vec4(0.);
		for (int i = 0; i < 4; i++) {
			result_color += grad(puv.x, cols[i], cols[i+1], pos[i], pos[i+1]);
		}

		return result_color;
	}
`