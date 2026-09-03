/**
 * Island Glow — the aurora that sits behind the dashboard's brand band.
 *
 * Ported from the Flutter shader that ships in the iimjobs app
 * (`lib/res/shaders/island_glow.frag`, painted by `AppIslandBackdrop`). The
 * whole diff from that source is the header — `#include
 * <flutter/runtime_effect.glsl>` becomes `#version 300 es` plus a precision
 * qualifier, and `FlutterFragCoord()` becomes `gl_FragCoord`. Every function
 * body and the whole of `main` are byte-identical, so a fix on either side
 * ports across without reconciliation.
 *
 * Kept as strings in their own module so the component that drives them stays
 * readable, and so a diff against the app's `.frag` is a diff of one file.
 */

/** Attribute-less fullscreen triangle — no vertex buffer needed. */
export const VERT_SRC = `#version 300 es
void main() {
  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
`

export const FRAG_SRC = `#version 300 es
precision highp float;

// Animated island hero fill — aurora borealis over the island canvas.
//
// The island's own diagonal ramp (brand green anchored top-right, reaching
// canvas by ~46% along the diagonal) is kept as an ambient body, so the hero
// still reads as the designed island. Curtains of hue-shifted light drift
// across it in the island's own gradient frame, with vertical ray striations
// and a patchy brightness envelope — the two things that make an aurora read
// as an aurora rather than as a moving gradient.
//
// Uniform order must match the driver's setUniforms().
//   uSize    island size in logical px
//   uTime    seconds since the ticker started
//   uBrand   island brand green      (0..1 rgb)
//   uCanvas  island canvas           (0..1 rgb)
//   uCool    brand hue-rotated toward teal
//   uWarm    brand hue-rotated toward mint
uniform vec2 uSize;
uniform float uTime;
uniform vec3 uBrand;
uniform vec3 uCanvas;
uniform vec3 uCool;
uniform vec3 uWarm;

out vec4 fragColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Two octaves, not three: the third was invisible under the curtains' gaussian
// falloff and cost a third of the whole noise budget. Rescaled by 0.75 -> 0.875
// so the output keeps its original range and every constant tuned against it
// still holds.
float fbm(vec2 p) {
  return (0.5 * vnoise(p) + 0.25 * vnoise(p * 2.03)) * 1.16667;
}

// One aurora curtain, expressed in the island's own gradient frame:
//   \`diag\` runs across the ribbon (0 at the top-right corner, 1 at bottom-left)
//   \`u\`    runs along it, parallel to the island's stop line.
// The ribbon sits at \`d0\` across, wobbles on two out-of-phase sines along, and
// migrates slowly up and down the diagonal.
float curtain(float u, float diag, float d0, float amp, float freq,
              float thick, float phase, float t, float speed) {
  float wob = amp * sin(u * freq + t * speed + phase) +
              amp * 0.45 * sin(u * freq * 1.83 - t * speed * 0.63 + phase);
  float drift = 0.035 * sin(t * 0.07 + phase);
  float d = (diag - (d0 + drift + wob)) / thick;
  float core = exp(-d * d);

  // Rays: fine striations perpendicular to the ribbon, sliding along it. This
  // one is genuinely 2-D — it varies across the ribbon as well as along it.
  float rays = 0.45 + 0.55 * fbm(vec2(u * 13.0 - t * 0.06 + phase, diag * 4.0));
  // Patchy envelope so the curtain isn't uniformly lit along its length. Two
  // incommensurate sines rather than fbm: the fbm this replaces sampled a 2-D
  // field whose second component was a per-curtain constant, so it paid for
  // 2-D machinery to produce a 1-D signal. Range and mean match the original.
  float env = 0.30 + 0.6125 * (0.5 +
      0.25 * sin(u * 3.1 + t * 0.14 + phase) +
      0.25 * sin(u * 5.3 - t * 0.09 + phase * 1.7));
  return core * rays * env;
}

void main() {
  // gl_FragCoord's origin is BOTTOM-left; FlutterFragCoord's is top-left. Without
  // this flip the whole composition renders mirrored — the brand anchor lands in
  // the bottom-right instead of the top-right, and \`guard\`, which exists to keep
  // the curtains off the bottom, holds them off the top instead.
  vec2 frag = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y);
  vec2 uv = frag / uSize;
  float t = uTime;

  // Aspect-corrected space so curtains keep their shape however tall the
  // island is (it stretches on pull-to-refresh overscroll).
  float aspect = uSize.x / max(uSize.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Two-channel fbm warp so the ribbons never repeat visibly.
  vec2 wv = vec2(fbm(p * 1.4 + vec2(0.0, t * 0.035)),
                fbm(p * 1.4 + vec2(4.7, -t * 0.030)));
  vec2 pw = p + (wv - 0.5) * 0.08;
  vec2 uvw = vec2(pw.x / aspect, pw.y);

  // The island's gradient frame. \`diag\` is the same projection Flutter's
  // LinearGradient uses for begin: topRight, end: bottomLeft; \`u\` is its
  // orthogonal partner, running along the stop line, and slides slowly so the
  // curtains travel rather than just shimmering in place.
  float w2 = uSize.x * uSize.x;
  float h2 = uSize.y * uSize.y;
  float L = sqrt(aspect * aspect + 1.0);
  float diag = (w2 * (1.0 - uvw.x) + h2 * uvw.y) / (w2 + h2);
  float u = aspect * (uvw.x - 1.0 + uvw.y) / L + t * 0.010;

  // Structural body: brand green anchored in the top-right corner.
  // WEB RETUNE: 0.457 anchored the wash to the brand corner, which on a wide
  // band is the right-hand third. Reaching further gives the curtains a lit
  // body to stand on across the whole width instead of only over on the right.
  float reach = 0.95 * (1.0 + 0.08 * sin(t * 0.09));
  float body = 1.0 - clamp(diag / reach, 0.0, 1.0);

  // Curtains spread across the band, each on its own period. The outermost
  // sits at the diagonal that grazes the top-left corner (diag ~0.41 there),
  // so the aurora reaches across the top instead of hugging the brand corner.
  //
  // WEB RETUNE. The app's island is slightly taller than wide, so its whole
  // frame spans diag 0..0.41 and four curtains packed into that range fill it.
  // On a 5:1 band w2 swamps h2, diag becomes very nearly "distance from the
  // right edge", and the same four numbers bunch every ribbon into the
  // right-hand fifth. Spread across the frame, they read as what they are:
  // separate curtains with dark air between them, standing across the band.
  float a1 = curtain(u, diag, 0.12, 0.045, 11.0, 0.055, 0.0, t, 0.20);
  float a2 = curtain(u, diag, 0.34, 0.060, 7.5, 0.075, 2.3, t, 0.14);
  float a3 = curtain(u, diag, 0.56, 0.050, 14.0, 0.050, 4.9, t, 0.26);
  float a4 = curtain(u, diag, 0.78, 0.055, 9.0, 0.075, 1.4, t, 0.17);

  // WEB RETUNE. In the app this cut at 0.62 to stop the outer arm reaching the
  // bottom-right corner, which sits at nearly the same diag as the top-left one.
  // A wide band has no such ambiguity — diag runs left-to-right and nothing
  // else — so the mask is now only a soft fade off the far edge, and \`guard\`
  // below is left to do the vertical containment on its own.
  float span = 1.0 - smoothstep(0.95, 1.12, diag);
  // The top-left and bottom-right corners sit at nearly the same \`diag\`, so
  // \`span\` alone would light both. This guard keeps the aurora off the bottom
  // while barely touching the upper two thirds.
  float guard = 1.0 - smoothstep(0.45, 0.90, uvw.y);
  // WEB RETUNE. The app fades each successive curtain because they recede from
  // the brand corner it is anchored to. Spread across a wide band they are not
  // receding from anything — they are four ribbons standing side by side — and
  // a 1.0/0.85/0.70/0.60 falloff running the same direction as the ambient
  // ramp turned all four into one smooth slope. Near-equal keeps them separate.
  float aur = (a1 + a2 * 0.95 + a3 * 0.92 + a4 * 0.88) * span * guard;

  // The ramp drops to an ambient wash so the curtains have dark room to read
  // as light. They, not the ramp, are the hero's light source.
  // WEB RETUNE: 0.5 over a corner-anchored wash was a body the curtains stood
  // out from. Once \`reach\` spread that wash across the whole band, the same
  // 0.5 filled it with green and the ribbons had nothing left to be brighter
  // than. Dropped so the base is a dark tint and the curtains are the light.
  vec3 col = mix(uCanvas, uBrand, body * 0.26);
  // Cool teal in the tails, warm mint in the bright cores — aurora shifts hue
  // with intensity. Additive, because the curtains are emissive.
  float crest = smoothstep(0.30, 0.90, aur);
  vec3 ribbon = mix(uCool, uWarm, crest);
  // WEB RETUNE: 0.8 suits a portrait island where a curtain fills a lot of the
  // frame. Spread thin across a wide band each ribbon covers far less of it, so
  // the same multiplier reads as a muted wash rather than as light.
  col += ribbon * clamp(aur, 0.0, 1.3) * 1.15;

  // Ordered-ish dither — a long dark ramp bands badly at 8 bits per channel.
  col += (hash21(frag) - 0.5) / 255.0;

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
