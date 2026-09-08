// globals.css -> tokens.json
//
// globals.css is the single source of truth for the design system (CLAUDE.md).
// This resolves its cascade into the four brand x theme combinations Figma
// needs as variable modes, names every distinct colour after the Tailwind ramp
// it came from, and writes a artifact the Figma sync script can consume with no
// further transformation.
//
//   node scripts/extract-tokens.mjs           write tokens.json
//   node scripts/extract-tokens.mjs --check   fail if tokens.json is stale
//
// Not covered by `npm run format` or eslint (both target **/*.{ts,tsx}), so
// this file is hand-formatted in house style: no semicolons, double quotes.

import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { oklchToSrgb, parseOklch } from "./oklch.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const CSS_PATH = resolve(HERE, "../src/styles/globals.css")
const TW_PATH = resolve(HERE, "../../../node_modules/tailwindcss/theme.css")
const OUT_PATH = resolve(HERE, "../tokens.json")

const ROOT_FONT_SIZE_PX = 16

// The four combinations the CSS cascade can produce, in Figma mode order.
const MODES = [
  { name: "iimjobs Light", brand: "iimjobs", dark: false },
  { name: "iimjobs Dark", brand: "iimjobs", dark: true },
  { name: "hirist Light", brand: "hirist", dark: false },
  { name: "hirist Dark", brand: "hirist", dark: true },
]

// The only tokens a brand layer is allowed to override. If this list and the
// CSS ever disagree, that is a governance problem worth failing loudly on.
const BRAND_TOKENS = [
  "primary",
  "primary-foreground",
  "ring",
  "sidebar-primary",
  "sidebar-primary-foreground",
]

// Figma variable scopes, most specific rule first. Never ALL_SCOPES: it
// pollutes every picker in the file.
const SCOPE_RULES = [
  [/^(border|input|ring|sidebar-border|sidebar-ring)$/, ["STROKE_COLOR"]],
  // Bare `foreground` is the body text colour, same as the *-foreground pairs.
  [/(^|-)foreground$/, ["TEXT_FILL"]],
  // Carry a text scope too: these are used as tones, not just fills —
  // `text-warning`/`text-destructive`/`text-success` in MetaItem, `text-primary`
  // in a pressed Chip.
  [
    /^(primary|sidebar-primary|destructive|success|warning)$/,
    ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"],
  ],
  [/.*/, ["FRAME_FILL", "SHAPE_FILL"]],
]

// Colours that are not in a Tailwind ramp. Everything else is looked up.
const PRIMITIVE_NAMES = {
  // Tailwind spells white as `#fff`, not oklch, so it never matches the ramp.
  "oklch(1 0 0)": "white",
  "oklch(0.58 0.17 40)": "brand/hirist-600",
  "oklch(0.99 0.01 40)": "brand/hirist-50",
  "oklch(0.7 0.15 40)": "brand/hirist-500",
  "oklch(0.18 0.04 40)": "brand/hirist-950",
}

// --- css parsing -------------------------------------------------------------

/** Strip comments first; `/* ... *\/` appears inline after many declarations. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "")
}

/**
 * Body of the block whose header matches `pattern`, by brace matching.
 *
 * Brace matching rather than a regex because the block bodies contain no nested
 * braces today but `@layer base` does, and a greedy `[^}]*` would silently pick
 * up the wrong text the moment one is added.
 */
function block(css, pattern) {
  const match = pattern.exec(css)
  if (!match) throw new Error(`block not found: ${pattern}`)

  const open = css.indexOf("{", match.index)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++
    else if (css[i] === "}" && --depth === 0) {
      return css.slice(open + 1, i)
    }
  }
  throw new Error(`unbalanced braces after ${pattern}`)
}

function declarations(body) {
  const out = {}
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1].slice(2)] = m[2].trim()
  }
  return out
}

// --- tailwind ramp lookup ----------------------------------------------------

/**
 * oklch coordinates -> Tailwind ramp name (`emerald-600`).
 *
 * Compared numerically with an epsilon, never as strings: Tailwind writes
 * `97.9%` and `97.9 / 100` does not stringify back to "0.979".
 */
function loadRamp() {
  const css = readFileSync(TW_PATH, "utf8")
  const ramp = []
  for (const m of css.matchAll(/--color-([a-z]+-\d+):\s*(oklch\([^)]+\))/g)) {
    const parsed = parseOklch(m[2])
    if (parsed) ramp.push({ name: m[1], ...parsed })
  }
  return ramp
}

function nameFor(css, ramp) {
  const parsed = parseOklch(css)
  if (!parsed) throw new Error(`not a colour: ${css}`)

  // Alpha variants hang off their opaque parent: emerald/600 -> emerald/600-a60
  const opaque =
    parsed.a === 1
      ? css
      : `oklch(${css.slice(6, -1).split("/")[0].trim()})`
  const suffix =
    parsed.a === 1 ? "" : `-a${String(Math.round(parsed.a * 100))}`

  const override = PRIMITIVE_NAMES[opaque]
  if (override) return override + suffix

  const eq = (a, b) => Math.abs(a - b) < 1e-6
  const base = parseOklch(opaque)
  const hit = ramp.find(
    (r) => eq(r.L, base.L) && eq(r.C, base.C) && eq(r.H, base.H),
  )
  if (!hit) throw new Error(`no primitive name for ${css} — add to PRIMITIVE_NAMES`)

  return hit.name.replace("-", "/") + suffix
}

// --- extraction --------------------------------------------------------------

function extract() {
  const raw = readFileSync(CSS_PATH, "utf8")
  const css = stripComments(raw)
  const ramp = loadRamp()

  const theme = declarations(block(css, /@theme inline\s*\{/))
  // `.dark` must be anchored: `:root[data-brand="iimjobs"].dark {` also
  // contains the substring `.dark {`.
  const base = {
    light: declarations(block(css, /^:root\s*\{/m)),
    dark: declarations(block(css, /^\.dark\s*\{/m)),
  }
  const brand = {}
  for (const { brand: id, dark } of MODES) {
    const suffix = dark ? "\\.dark" : ":not\\(\\.dark\\)"
    brand[`${id}:${dark}`] = declarations(
      block(css, new RegExp(`^:root\\[data-brand="${id}"\\]${suffix}\\s*\\{`, "m")),
    )
  }

  // Resolve the cascade. :root, then .dark if dark, then the brand block.
  // Specificity confirms this order: :root and .dark are both (0,1,0) with
  // .dark later in the file; both brand selectors are (0,3,0) and mutually
  // exclusive.
  const resolved = {}
  for (const mode of MODES) {
    resolved[mode.name] = {
      ...base.light,
      ...(mode.dark ? base.dark : {}),
      ...brand[`${mode.brand}:${mode.dark}`],
    }
  }

  // Colour tokens are everything resolved except --radius, which is a length.
  const names = Object.keys(resolved[MODES[0].name])
    .filter((n) => n !== "radius")
    .sort()

  const primitives = {}
  const semantic = {}

  for (const name of names) {
    const modes = {}
    for (const mode of MODES) {
      const value = resolved[mode.name][name]
      const primitive = nameFor(value, ramp)
      if (!primitives[primitive]) {
        const { rgba, hex, outOfGamut } = oklchToSrgb(value)
        primitives[primitive] = { css: value, hex, rgba, outOfGamut }
      }
      modes[mode.name] = primitive
    }

    const brandScoped = BRAND_TOKENS.includes(name)
    const varies = new Set(Object.values(modes)).size > 1
    // A brand block that overrides a token outside BRAND_TOKENS, or a listed
    // token that never actually varies, means the CSS and this script have
    // drifted apart.
    const brandVaries =
      modes["iimjobs Light"] !== modes["hirist Light"] ||
      modes["iimjobs Dark"] !== modes["hirist Dark"]
    if (brandVaries !== brandScoped) {
      throw new Error(
        `${name}: brand-scoped=${brandScoped} but brand variance=${brandVaries}` +
          " — reconcile BRAND_TOKENS with the brand layers in globals.css",
      )
    }

    semantic[name] = {
      scopes: SCOPE_RULES.find(([re]) => re.test(name))[1],
      codeSyntax: `var(--${name})`,
      brandScoped,
      themeScoped: varies && !brandScoped,
      modes,
    }
  }

  // Radius: `calc()` only ever appears as `calc(var(--radius) * N)`, so match
  // that one form rather than building a calc engine. --radius is :root-only,
  // never redeclared by .dark or a brand layer, so radii are single-mode.
  const radiusRem = parseFloat(base.light.radius)
  const radius = {}
  for (const [key, value] of Object.entries(theme)) {
    if (!key.startsWith("radius-")) continue
    const step = key.slice("radius-".length)
    const mul = /calc\(var\(--radius\)\s*\*\s*([\d.]+)\)/.exec(value)
    const factor = mul ? parseFloat(mul[1]) : 1
    radius[step] = Number((radiusRem * factor * ROOT_FONT_SIZE_PX).toFixed(4))
  }

  // The 33 --color-* entries in @theme inline are a 1:1 Tailwind naming shim.
  // Mirroring them would double 33 Figma variables to 66 and make the picker
  // unusable. Recorded so their absence reads as deliberate.
  const tailwindAliases = {}
  for (const [key, value] of Object.entries(theme)) {
    const ref = /^var\(--([\w-]+)\)$/.exec(value)
    if (ref) tailwindAliases[key] = ref[1]
  }

  return {
    meta: {
      source: "src/styles/globals.css",
      sourceSha256: createHash("sha256").update(raw).digest("hex"),
      generator: "scripts/extract-tokens.mjs",
      colorSpace: "srgb",
      gamutMapping: "clip",
      rootFontSizePx: ROOT_FONT_SIZE_PX,
    },
    modes: MODES.map((m) => m.name),
    primitives: Object.fromEntries(
      Object.entries(primitives).sort(([a], [b]) => a.localeCompare(b)),
    ),
    semantic,
    radius,
    fontFamily: theme["font-sans"],
    excluded: { tailwindAliases },
  }
}

// --- invariants --------------------------------------------------------------

/**
 * In every brand layer `--ring` is written as a literal but *means* "primary at
 * 60%". Figma will hold it as an independent variable with no visible link, so
 * without this assertion editing primary silently desyncs ring and nothing
 * notices.
 */
function checkRingInvariant(tokens) {
  const problems = []
  for (const mode of tokens.modes) {
    const ring = tokens.primitives[tokens.semantic.ring.modes[mode]]
    const primary = tokens.primitives[tokens.semantic.primary.modes[mode]]
    const sameRgb =
      ring.rgba.r === primary.rgba.r &&
      ring.rgba.g === primary.rgba.g &&
      ring.rgba.b === primary.rgba.b
    if (!sameRgb || ring.rgba.a !== 0.6) {
      problems.push(
        `${mode}: ring is ${ring.css}, expected primary (${primary.css}) at 60%`,
      )
    }
  }
  return problems
}

// --- main --------------------------------------------------------------------

const tokens = extract()
const serialised = `${JSON.stringify(tokens, null, 2)}\n`
const ring = checkRingInvariant(tokens)

if (process.argv.includes("--check")) {
  const problems = [...ring]
  let current = ""
  try {
    current = readFileSync(OUT_PATH, "utf8")
  } catch {
    problems.push("tokens.json is missing — run: npm run tokens")
  }
  if (current && current !== serialised) {
    problems.push(
      "tokens.json is stale — globals.css has changed. Run: npm run tokens",
    )
  }
  if (problems.length) {
    console.error("token check failed:")
    for (const line of problems) console.error(`  ${line}`)
    process.exit(1)
  }
  console.log("tokens.json is in sync with globals.css; ring invariant holds.")
} else {
  if (ring.length) {
    console.error("ring invariant broken:")
    for (const line of ring) console.error(`  ${line}`)
    process.exit(1)
  }
  writeFileSync(OUT_PATH, serialised)
  const brandScoped = Object.values(tokens.semantic).filter(
    (t) => t.brandScoped,
  ).length
  console.log(
    `wrote tokens.json — ${Object.keys(tokens.primitives).length} primitives, ` +
      `${Object.keys(tokens.semantic).length} semantic ` +
      `(${brandScoped} brand-scoped), ${Object.keys(tokens.radius).length} radii, ` +
      `${tokens.modes.length} modes`,
  )
}
