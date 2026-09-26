// Soft colour mass inside a glass sphere. The outline is always round:
// expressions change the mass (coverage, flow, palette) and uniform scale/position only.
export const DEFAULTS = {
  colorA: '#5fe6ea',  // cyan
  colorB: '#5a86ff',  // blue
  colorC: '#d42cf0',  // magenta

  radius: 1,
  coverage: 0,        // how much of the sphere the mass fills (-1 empty .. 1 full)
  softness: 0.61,     // blur of the mass edge
  freq: 1.2,          // lobes in the mass
  flow: 0.12,         // how fast the mass morphs
  swirl: 0.12,        // how fast the mass turns inside the sphere
  pulse: 0,           // periodic breathing of the coverage
  pulseRate: 0.8,
  opacity: 1,
  glow: 0.6,          // faint halo around the glass
  glass: 1,           // visibility of the glass shell
  mint: 0.5,          // pale highlight in the densest part

  audioReact: 0,
  jitter: 0,
  sink: 0,
  bounce: 0,
  bounceRate: 2,
  wobble: 0,
  float: 0.03,
  floatRate: 0.2,
  breathAmp: 0.012,
  breathRate: 0.25,
  ease: 3,
};

export const COLOR_KEYS = ['colorA', 'colorB', 'colorC'];

export const STATES = {
  idle: {},

  listening: {
    coverage: 0.15, pulse: 0.18, pulseRate: 0.9, softness: 0.54, flow: 0.18, swirl: 0.05,
    audioReact: 1, mint: 0.7, glow: 1.2,
  },

  thinking: {
    coverage: 0.05, freq: 1.8, flow: 0.45, swirl: 1.1, softness: 0.5,
    colorB: '#5a5cff', breathAmp: 0.02, breathRate: 0.7, ease: 2.5,
  },

  speaking: {
    coverage: 0.2, flow: 0.3, swirl: 0.3, audioReact: 1.2, mint: 0.6, glow: 1.2,
  },

  sleeping: {
    colorA: '#b8dfe6', colorB: '#a8b6e0', colorC: '#cfa6dc',
    coverage: -0.35, flow: 0.03, swirl: 0.02, softness: 0.81, opacity: 0.7, glow: 0.6,
    breathAmp: 0.025, breathRate: 0.1, float: 0.01, ease: 1.2,
  },

  error: {
    colorA: '#ff9a8a', colorB: '#ff3d5e', colorC: '#e0149a',
    coverage: 0.2, freq: 2.2, flow: 0.8, jitter: 1, softness: 0.36, ease: 6,
    impulse: { pop: 0.05 },
  },
};

export const EMOTIONS = {
  happy: {
    colorA: '#7ff0e0', colorB: '#8a7bff', colorC: '#ff4fc8',
    coverage: 0.3, bounce: 0.12, bounceRate: 1.7, mint: 0.8,
    impulse: { pop: 0.04 },
  },

  excited: {
    colorA: '#4ff5ff', colorB: '#6a5cff', colorC: '#ff2ee0',
    coverage: 0.45, swirl: 1.6, flow: 0.7, bounce: 0.16, bounceRate: 2.6, glow: 1.4,
    impulse: { pop: 0.1, spin: 1 },
  },

  sad: {
    colorA: '#9fc4d6', colorB: '#6d86c4', colorC: '#8a78b8',
    coverage: -0.2, flow: 0.05, swirl: 0.03, sink: 0.15, softness: 0.81, glow: 0.6,
  },

  surprised: {
    coverage: 0.6, softness: 0.4, flow: 0.02, swirl: 0, mint: 1, radius: 1.08,
    impulse: { pop: 0.12, spill: 1 },
  },

  confused: {
    freq: 2, wobble: 1, swirl: -0.6, flow: 0.35,
  },
};
