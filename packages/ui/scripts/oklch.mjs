// oklch(L C H / A) -> sRGB. Figma variables are sRGB only, so every colour in
// globals.css has to come through here before it can become a Figma variable.
//
// Out-of-gamut colours (most of the accents and every status colour) are
// resolved by NAIVE PER-CHANNEL CLIPPING, not by CSS Color 4 chroma reduction.
// Clipping is what reproduces the sRGB fallback hexes Tailwind itself publishes
// for these ramps, so the Figma library agrees with the palette everyone reads
// in Tailwind's docs. Chroma reduction gives a "better" colour that matches
// nothing. See `--self-test` below for the values that pin this down.
//
// Not covered by `npm run format` or eslint (both target **/*.{ts,tsx}), so
// this file is hand-formatted in house style: no semicolons, double quotes.

/** Parse `oklch(L C H)` / `oklch(L C H / A)`. L and A accept % or unit form. */
export function parseOklch(input) {
  const match = /^oklch\(\s*([^)]+?)\s*\)$/.exec(String(input).trim())
  if (!match) return null

  const [coords, alphaRaw] = match[1].split("/").map((part) => part.trim())
  const parts = coords.split(/\s+/)
  if (parts.length !== 3) return null

  // `none` is a CSS Color 4 missing component, which resolves to 0. Tailwind
  // writes the achromatic steps that way — `oklch(98.5% 0 none)` is zinc-50 —
  // and parseFloat("none") is NaN, which would silently fail every comparison.
  const num = (value, scaleIfPercent) =>
    value === "none"
      ? 0
      : value.endsWith("%")
        ? parseFloat(value) / scaleIfPercent
        : parseFloat(value)

  return {
    // Percentage scales differ per component: L is /100, chroma is /0.4 per
    // CSS Color 4. Hue is an angle and never a percentage.
    L: num(parts[0], 100),
    C: num(parts[1], 1 / 0.4),
    H: num(parts[2], 1),
    a: alphaRaw === undefined ? 1 : num(alphaRaw, 100),
  }
}

/** OKLCH -> OKLab -> linear sRGB. May return channels outside [0,1]. */
function toLinearSrgb({ L, C, H }) {
  const hRad = (H * Math.PI) / 180
  const a = C * Math.cos(hRad)
  const b = C * Math.sin(hRad)

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  }
}

const encode = (v) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055

const round = (v, dp) => Number(v.toFixed(dp))

/**
 * `oklch(...)` -> { rgba, hex, outOfGamut }.
 * `rgba` is 0-1, the shape figma.variables `setValueForMode` wants.
 */
export function oklchToSrgb(input) {
  const parsed = typeof input === "string" ? parseOklch(input) : input
  if (!parsed) throw new Error(`not an oklch() colour: ${input}`)

  const linear = toLinearSrgb(parsed)
  const encoded = {
    r: encode(linear.r),
    g: encode(linear.g),
    b: encode(linear.b),
  }

  // Judge gamut on the linear values, before encoding — pow() of a negative
  // returns NaN, which would otherwise read as "in gamut".
  const outOfGamut = [linear.r, linear.g, linear.b].some(
    (v) => v < -1e-4 || v > 1 + 1e-4,
  )

  const clamp = (v) => (Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)))
  const rgba = {
    r: round(clamp(encoded.r), 6),
    g: round(clamp(encoded.g), 6),
    b: round(clamp(encoded.b), 6),
    a: round(parsed.a, 6),
  }

  const channel = (v) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0")
  const hex = `#${channel(rgba.r)}${channel(rgba.g)}${channel(rgba.b)}`

  return { rgba, hex, outOfGamut }
}

// --- self-test ---------------------------------------------------------------
// The matrices above are easy to typo and a typo shifts every colour slightly
// rather than failing. These pairs are the tripwire. Run before trusting any
// generated tokens.json:  node scripts/oklch.mjs --self-test

const CASES = [
  // In gamut — must round-trip exactly.
  ["oklch(0.141 0.005 285.823)", "#09090b", false, "zinc-950"],
  ["oklch(0.967 0.001 286.375)", "#f4f4f5", false, "zinc-100"],
  ["oklch(0.552 0.016 285.938)", "#71717b", false, "zinc-500"],
  ["oklch(0.979 0.021 166.113)", "#ecfdf5", false, "emerald-50"],
  ["oklch(1 0 0)", "#ffffff", false, "white"],
  // Out of gamut — must clip to Tailwind's published sRGB fallback.
  ["oklch(0.596 0.145 163.225)", "#009966", true, "emerald-600"],
  ["oklch(0.696 0.17 162.48)", "#00bc7d", true, "emerald-500"],
  ["oklch(0.577 0.245 27.325)", "#e7000b", true, "red-600"],
  ["oklch(0.627 0.194 149.214)", "#00a63e", true, "green-600"],
  ["oklch(0.666 0.179 58.318)", "#e17100", true, "amber-600"],
]

function selfTest() {
  const failures = []

  for (const [input, hex, outOfGamut, label] of CASES) {
    const got = oklchToSrgb(input)
    if (got.hex !== hex) {
      failures.push(`${label}: expected ${hex}, got ${got.hex}`)
    }
    if (got.outOfGamut !== outOfGamut) {
      failures.push(
        `${label}: expected outOfGamut=${outOfGamut}, got ${got.outOfGamut}`,
      )
    }
    const flag = got.outOfGamut ? " (clipped)" : ""
    console.log(`  ${label.padEnd(12)} ${input.padEnd(30)} ${got.hex}${flag}`)
  }

  // Alpha survives the conversion and is not folded into the channels.
  const alpha = oklchToSrgb("oklch(1 0 0 / 10%)")
  if (alpha.rgba.a !== 0.1) {
    failures.push(`alpha: expected 0.1, got ${alpha.rgba.a}`)
  }
  const pct = oklchToSrgb("oklch(59.6% 0.145 163.225)")
  if (pct.hex !== "#009966") {
    failures.push(`percent lightness: expected #009966, got ${pct.hex}`)
  }

  if (failures.length) {
    console.error(`\n${failures.length} failure(s):`)
    for (const line of failures) console.error(`  ${line}`)
    process.exit(1)
  }
  console.log(`\n${CASES.length + 2} checks passed.`)
}

if (process.argv.includes("--self-test")) selfTest()
