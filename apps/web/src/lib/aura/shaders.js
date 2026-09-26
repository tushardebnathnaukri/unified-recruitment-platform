// GLSL for the aura: a blurred cyan/blue/magenta mass clipped by a round glass sphere.
import { noise } from './noise.js';

export const auraVertex = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormalV;
varying vec3 vViewPos;
void main(){
  vObj = normalize(position);
  vNormalV = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

export const auraFragment = /* glsl */ `
${noise}
uniform float uTime;
uniform float uFlowT;
uniform float uSwirlT;
uniform float uCoverage;
uniform float uSoftness;
uniform float uFreq;
uniform float uOpacity;
uniform float uMint;
uniform float uJitter;
uniform float uWobble;
uniform vec2 uLook;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;

varying vec3 vNormalV;

mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
vec3 srgb(vec3 c){ return pow(c, vec3(2.2)); } // palette is authored in sRGB

void main(){
  vec3 N = normalize(vNormalV);
  float ndv = clamp(N.z, 0.0, 1.0);

  // Work in the sphere's disc as seen on screen, so the mass reads as a soft glow behind glass.
  // Slight lens magnification toward the rim, as if seen through the glass.
  vec2 disc = N.xy * mix(1.0, 0.8, pow(1.0 - ndv, 2.0));
  vec2 w = rot2(uSwirlT + uWobble) * (disc - uLook * 0.15);
  w += uJitter * 0.05 * vec2(sin(floor(uTime * 12.0) * 7.1), cos(floor(uTime * 12.0) * 3.3));

  float warp = snoise(vec3(w * uFreq * 0.7, uFlowT)); // one smooth, low-frequency layer

  // One lobe, with a drifting "bite" that turns it into a crescent.
  float ba = uFlowT * 0.8 + 0.6;
  vec2 bite = 0.62 * vec2(cos(ba), sin(ba)); // orbits near the rim, so it cuts in from the edge
  float m = 0.62 - length(w - vec2(0.05, 0.02)) + warp * 0.4 + uCoverage;
  m -= smoothstep(0.55, 0.0, length(w - bite)) * 0.6 * (1.0 - clamp(uCoverage, 0.0, 1.0));
  // Blur fades inward from the mass edge, so a wide blur doesn't flood the empty side.
  // Saturated body that blurs out only toward its edge.
  float density = pow(smoothstep(-0.3, uSoftness, m), 0.55);

  // Magenta on one side, through blue, to cyan; pale mint where the mass is densest.
  float g = clamp(0.5 + dot(w, vec2(0.6, 0.6)) * 0.9 + warp * 0.25, 0.0, 1.0);
  vec3 c0 = srgb(uColC), c1 = srgb(uColB), c2 = srgb(uColA);
  vec3 col = g < 0.35 ? mix(c0, c1, smoothstep(0.05, 0.35, g)) : mix(c1, c2, smoothstep(0.35, 0.75, g));
  vec3 mint = mix(c2, vec3(1.0), 0.6);
  col = mix(col, mint, smoothstep(0.5, 1.1, m) * uMint * 0.6); // a small pale highlight, not a wash

  // Reach the glass wall, with just enough fade to anti-alias the edge.
  float edge = smoothstep(0.0, 0.08, ndv);
  gl_FragColor = vec4(col, density * edge * uOpacity);
  #include <colorspace_fragment>
}
`;

export const haloVertex = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Soft bright ring just outside the glass (never behind it, so the inside stays clear).
export const haloFragment = /* glsl */ `
uniform float uGlow;
varying vec2 vUv;
void main(){
  float d = length((vUv - 0.5) * 2.0);
  float glassEdge = 1.0 / 1.7; // glass radius in this plane's half-size
  float a = smoothstep(glassEdge * 0.92, glassEdge * 1.02, d) * (1.0 - smoothstep(glassEdge, 1.0, d)) * 0.6 * uGlow;
  gl_FragColor = vec4(vec3(1.0), clamp(a, 0.0, 1.0));
}
`;

// Clear glass shell: bluish rim, thin bright edge, highlights, faint colour fringe.
export const glassVertex = /* glsl */ `
varying vec3 vNormalV;
varying vec3 vViewPos;
void main(){
  vNormalV = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

export const glassFragment = /* glsl */ `
uniform float uGlass;
uniform vec3 uColA;
uniform vec3 uColC;
varying vec3 vNormalV;
varying vec3 vViewPos;
void main(){
  vec3 N = normalize(vNormalV);
  vec3 V = normalize(-vViewPos);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float r = 1.0 - ndv; // 0 at centre, 1 at the silhouette

  vec3 c = vec3(0.0);
  float a = 0.0;

  // Refracted surroundings darken the rim slightly (how clear glass reads on white).
  float rim = smoothstep(0.3, 1.0, r);
  c += vec3(0.60, 0.66, 0.80) * rim * 0.28;  a += rim * 0.28;

  // Faint chromatic fringe just inside the edge.
  float fringeBand = smoothstep(0.72, 0.93, r) * (1.0 - smoothstep(0.93, 1.0, r));
  vec3 fringe = mix(pow(uColA, vec3(1.0)), pow(uColC, vec3(1.0)), 0.5 + 0.5 * dot(N.xy, vec2(-0.7, -0.7)));
  c += fringe * fringeBand * 0.22;  a += fringeBand * 0.12;

  // Light gathering at the bottom inside (caustic).
  float caustic = smoothstep(0.55, 0.92, r) * max(-N.y, 0.0) * (1.0 - smoothstep(0.92, 1.0, r));
  c += mix(uColA, vec3(1.0), 0.5) * caustic * 0.35;  a += caustic * 0.15;

  // Thin bright edge line.
  float line = smoothstep(0.955, 0.985, r) * (1.0 - smoothstep(0.985, 1.0, r));
  c += vec3(1.0) * line * 0.7;  a += line * 0.7;

  // Highlights from a soft key light, top-left.
  vec3 L = normalize(vec3(-0.5, 0.65, 0.6));
  float rl = max(dot(reflect(-L, N), V), 0.0);
  float spec = pow(rl, 60.0) * 0.6 + pow(rl, 7.0) * 0.04;
  c += vec3(1.0) * spec;  a += spec;

  // Layers above are accumulated premultiplied; output straight colour so sRGB encoding
  // can't push colour above alpha (which composites as a white glow on the page).
  float alpha = clamp(a * uGlass, 0.0, 1.0);
  gl_FragColor = vec4(c / max(a, 1e-4), alpha);
  #include <colorspace_fragment>
}
`;
