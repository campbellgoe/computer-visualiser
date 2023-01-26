

export const fragmentShaderTopBoilerplate = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`
export const fragmentShaderMain = `
// original shader thanks to mklefrancois
// https://www.shadertoy.com/view/wdK3Dy

float grid_intensity = 0.7;

// Thick lines 
float grid(vec2 fragCoord, float space, float gridWidth)
{
    vec2 p  = fragCoord - vec2(.5);
    vec2 size = vec2(gridWidth);
    
    vec2 a1 = mod(p - size, space);
    vec2 a2 = mod(p + size, space);
    vec2 a = a2 - a1;
       
    float g = min(a.x, a.y);
    return clamp(g, 0., 1.0);
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;

    // Pixel color
    vec3 col = vec3(.7,.7,.7);
    
    // Gradient across screen
    vec2 p = fragCoord.xy;           // Point
	vec2 c = iResolution.xy / 2.0;   // Center
    col *= (1.0 - length(c - p)/iResolution.x*0.7);
	
    // 2-size grid
    col *= clamp(grid(fragCoord, 10., 0.5) *  grid(fragCoord, 50., 1.), grid_intensity, 1.0);
    
    // Output to screen
    fragColor = vec4(col,1.0);
}
void main() {
  mainImage(gl_FragColor,gl_FragCoord.xy);
}


`
export const vertexShaderMain = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}    
`
const shaderParts = {
  fragmentShader: {
    topBoilerplate: fragmentShaderTopBoilerplate,
    main: fragmentShaderMain,
  },
  vertexShader: {
    main: vertexShaderMain
  }
}
export default shaderParts