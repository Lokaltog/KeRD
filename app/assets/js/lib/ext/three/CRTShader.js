THREE.CRTShader = {
    uniforms: {
	    iGlobalTime: { type: 'f', value: 0.1 },
	    iResolution: { type: 'v3', value: null },
	    tDiffuse: { type: 't', value: null },
	    noise: { type: 'i', value: 0 },
    },
    vertexShader: `
varying vec2 vUv;
void main()
{
	vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );
}
`,
    fragmentShader: `
// Various shaders from shadertoy tweaked to work with three.js

uniform vec3 iResolution;
uniform float iGlobalTime;
uniform sampler2D tDiffuse;
uniform int noise;
varying vec2 vUv;

vec3 scanline(vec2 coord, vec3 screen, float factor)
{
	screen.rgb -= sin((-coord.y * 1.5 + (iGlobalTime * 20.0))) * factor;
	return screen;
}

vec3 flicker(vec2 coord, vec3 screen, float speedFactor, float intensity, float posBrightnessFactor)
{
	screen.rgb += abs(sin(speedFactor * iGlobalTime) * intensity * posBrightnessFactor);
	return screen;
}

vec3 sampleSplit(sampler2D tex, vec2 coord)
{
	vec3 frag;
	frag.r = texture2D(tex, vec2(coord.x - 0.002 * sin(iGlobalTime), coord.y)).r;
	frag.g = texture2D(tex, vec2(coord.x                           , coord.y)).g;
	frag.b = texture2D(tex, vec2(coord.x + 0.002 * sin(iGlobalTime), coord.y)).b;
	return frag;
}

// HASH AND NOISE FUNCTIONS TAKEN FROM IQ ----------------
float hash( vec2 p )
{
	float h = dot(p,vec2(48.7,342.7)+sin(iGlobalTime));

    return -1.0 + 2.0*fract(sin(h)*54611.5655123);
}

float Noise( in vec2 p )
{
    vec2 i = floor( p );
    vec2 f = fract( p );
	vec2 u = f*f*(3.0-2.0*f);

    return mix( mix( hash( i + vec2(0.0,0.0) ),
                     hash( i + vec2(1.0,0.0) ), u.x),
                mix( hash( i + vec2(0.0,1.0) ),
                     hash( i + vec2(1.0,1.0) ), u.x), u.y);
}
// ------------------------------------------------------

float smooth(in vec2 p){
    float corners = (Noise(vec2(p.x-1.0,p.y-1.0))+Noise(vec2(p.x+1.0,p.y-1.0))+Noise(vec2(p.x-1.0,p.y+1.0))+Noise(vec2(p.x+1.0,p.y+1.0)))/16.0;
    float sides = (Noise(vec2(p.x+1.0,p.y))+Noise(vec2(p.x-1.0,p.y))+Noise(vec2(p.x,p.y+1.0))+Noise(vec2(p.x,p.y-1.0)))/8.0;
    float center = Noise(vec2(p.x,p.y))/4.0;
    return corners + sides + center;
}

float interpolate(float a, float b, float x){
    float ft = x*3.141592;
    float f = (1.0-cos(ft))*0.5;
    return a*(1.0-f) + b*f;
}

float smoothinterp(vec2 p){
    float inx = floor(p.x);
    float frx = p.x - inx;
    float iny = floor(p.y);
    float fry = p.y - iny;
    float v1 = smooth(vec2(inx,iny));
    float v2 = smooth(vec2(inx+1.0,iny));
    float v3 = smooth(vec2(inx,iny+1.0));
    float v4 = smooth(vec2(inx+1.0,iny+1.0));
    float i1 = interpolate(v1,v2,frx);
    float i2 = interpolate(v3,v4,frx);
    return interpolate(i1,i2,fry);
}

void main()
{
	vec2 uv = vUv;
	vec2 screenSpace = uv * iResolution.xy;

	if (noise == 1) {
		// Only display noise/TV static
		float uv2 = smoothinterp(gl_FragCoord.xy);
		gl_FragColor = vec4(uv2,uv2,uv2,1.0) * 0.5;
		gl_FragColor.rgb = flicker(screenSpace, gl_FragColor.rgb, 2.0, 0.07, screenSpace.y / iResolution.y);
		gl_FragColor.rgb = flicker(screenSpace, gl_FragColor.rgb, 40.0, 0.01, 1.0);
		gl_FragColor.rgb = scanline(screenSpace, gl_FragColor.rgb, 0.03);
	}
	else {
		// Overlay CRT effects
		gl_FragColor.rgb = sampleSplit(tDiffuse, uv);
		gl_FragColor.rgb = scanline(screenSpace, gl_FragColor.rgb, 0.012);
		gl_FragColor.rgb = flicker(screenSpace, gl_FragColor.rgb, 2.0, 0.07, screenSpace.y / iResolution.y);
		gl_FragColor.rgb = flicker(screenSpace, gl_FragColor.rgb, 40.0, -0.01, (iResolution.y - screenSpace.y) / iResolution.y);
		// Tint image
		gl_FragColor.r *= 1.1;
		gl_FragColor.g *= 0.9;
		gl_FragColor.b *= 0.8;
	}
}
`,
}
