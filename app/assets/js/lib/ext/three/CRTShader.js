THREE.CRTShader = {
    uniforms: {
        iGlobalTime: { type: 'f', value: 0.1 },
	    iResolution: { type: 'v3', value: null },
        tDiffuse: { type: 't', value: null },
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
uniform vec3 iResolution;
uniform float iGlobalTime;
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 scanline(vec2 coord, vec3 screen)
{
	screen.rgb -= sin((coord.y * 1.5 + (iGlobalTime * 20.0))) * 0.01;
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
void main()
{
	vec2 uv = vUv;
	uv.y = 1.0 - uv.y; // flip tex

	gl_FragColor.rgb = sampleSplit(tDiffuse, uv);

	vec2 screenSpace = uv * iResolution.xy;
	gl_FragColor.rgb = scanline(screenSpace, gl_FragColor.rgb);
}
`,
}
