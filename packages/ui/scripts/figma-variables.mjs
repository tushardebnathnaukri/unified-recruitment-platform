// The Figma half of the drift check.
//
// An npm script cannot reach Figma: MCP tools only exist inside the agent's
// tool loop, and the Variables REST API needs an Enterprise plan. So this does
// not try to talk to Figma itself. Instead it does two things that together
// make the comparison mechanical rather than a matter of eyeballing swatches:
//
//   --print          emit a read-only Plugin API script. Run it through the
//                    Figma MCP (use_figma) and save what it returns.
//   --diff <file>    diff that saved dump against tokens.json.
//
// What this catches that `extract-tokens.mjs --check` cannot: someone editing
// a variable inside Figma, a token missing from the library, a renamed mode.
//
// Not covered by `npm run format` or eslint (both target **/*.{ts,tsx}), so
// this file is hand-formatted in house style: no semicolons, double quotes.

import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const TOKENS_PATH = resolve(HERE, "../tokens.json")

const READER = `// Read-only. Returns the AthenaDS variables in tokens.json's shape.
const collections = await figma.variables.getLocalVariableCollectionsAsync()
const allVars = await figma.variables.getLocalVariablesAsync()
const byId = new Map(allVars.map((v) => [v.id, v]))

const find = (name) => collections.find((c) => c.name === name)
const semColl = find("Semantic")
const primColl = find("Primitives")
const radiusColl = find("Radius")
const modeNames = new Map(semColl.modes.map((m) => [m.modeId, m.name]))

const r6 = (n) => Math.round(n * 1e6) / 1e6
const primitives = {}
for (const v of allVars.filter((x) => x.variableCollectionId === primColl.id)) {
  const value = v.valuesByMode[primColl.modes[0].modeId]
  primitives[v.name] = {
    rgba: {
      r: r6(value.r),
      g: r6(value.g),
      b: r6(value.b),
      a: value.a === undefined ? 1 : r6(value.a),
    },
    // First line of the description is the authoritative oklch source.
    oklch: (v.description || "").split("\\n")[0],
  }
}

const semantic = {}
for (const v of allVars.filter((x) => x.variableCollectionId === semColl.id)) {
  const modes = {}
  for (const [modeId, value] of Object.entries(v.valuesByMode)) {
    const target = value && value.type === "VARIABLE_ALIAS" ? byId.get(value.id) : null
    modes[modeNames.get(modeId)] = target ? target.name : "RAW_VALUE"
  }
  semantic[v.name] = { scopes: v.scopes, codeSyntax: v.codeSyntax.WEB || null, modes }
}

const radius = {}
for (const v of allVars.filter((x) => x.variableCollectionId === radiusColl.id)) {
  radius[v.name.replace("radius/", "")] = v.valuesByMode[radiusColl.modes[0].modeId]
}

return {
  modes: semColl.modes.map((m) => m.name),
  primitives,
  semantic,
  radius,
  textStyles: (await figma.getLocalTextStylesAsync()).map((s) => ({
    name: s.name,
    font: s.fontName.family + " " + s.fontName.style,
    size: s.fontSize,
    lineHeight: s.lineHeight.value,
  })),
}`

function diff(dumpPath) {
  const tokens = JSON.parse(readFileSync(TOKENS_PATH, "utf8"))
  const figma = JSON.parse(readFileSync(dumpPath, "utf8"))
  const problems = []

  const modesMatch =
    JSON.stringify(tokens.modes) === JSON.stringify(figma.modes)
  if (!modesMatch) {
    problems.push(
      `modes differ: code ${tokens.modes.join("/")} vs figma ${figma.modes.join("/")}`,
    )
  }

  // Primitives: compare the sRGB values Figma actually holds.
  for (const [name, spec] of Object.entries(tokens.primitives)) {
    const there = figma.primitives[name]
    if (!there) {
      problems.push(`primitive missing in figma: ${name}`)
      continue
    }
    for (const channel of ["r", "g", "b", "a"]) {
      // Figma round-trips through float32, so exact equality would fail on
      // rounding alone. A 1e-4 window is far tighter than one 8-bit step.
      if (Math.abs(there.rgba[channel] - spec.rgba[channel]) > 1e-4) {
        problems.push(
          `primitive ${name}.${channel}: code ${spec.rgba[channel]} vs figma ${there.rgba[channel]}`,
        )
      }
    }
    // The oklch source is the authoritative value; the sRGB above is a lossy,
    // gamut-clipped derivation of it. If the description drifts, the real value
    // has been lost.
    if (there.oklch !== spec.css) {
      problems.push(
        `primitive ${name} oklch source: code "${spec.css}" vs figma "${there.oklch}"`,
      )
    }
  }
  for (const name of Object.keys(figma.primitives)) {
    if (!tokens.primitives[name]) {
      problems.push(`primitive only in figma (not in globals.css): ${name}`)
    }
  }

  // Semantic: the alias edges are the thing that matters, plus scopes and the
  // CSS name Dev Mode shows.
  for (const [name, spec] of Object.entries(tokens.semantic)) {
    const there = figma.semantic[name]
    if (!there) {
      problems.push(`semantic missing in figma: ${name}`)
      continue
    }
    for (const mode of tokens.modes) {
      if (there.modes[mode] !== spec.modes[mode]) {
        problems.push(
          `semantic ${name} @ ${mode}: code -> ${spec.modes[mode]}, figma -> ${there.modes[mode]}`,
        )
      }
    }
    if (there.codeSyntax !== spec.codeSyntax) {
      problems.push(
        `semantic ${name} code syntax: code ${spec.codeSyntax} vs figma ${there.codeSyntax}`,
      )
    }
    if (JSON.stringify(there.scopes) !== JSON.stringify(spec.scopes)) {
      problems.push(
        `semantic ${name} scopes: code ${spec.scopes} vs figma ${there.scopes}`,
      )
    }
  }
  for (const name of Object.keys(figma.semantic)) {
    if (!tokens.semantic[name]) {
      problems.push(`semantic only in figma (not in globals.css): ${name}`)
    }
  }

  for (const [step, px] of Object.entries(tokens.radius)) {
    if (figma.radius[step] !== px) {
      problems.push(`radius ${step}: code ${px} vs figma ${figma.radius[step]}`)
    }
  }

  // The rule the whole brand architecture rests on: only the five accent
  // tokens may differ between brands. Checked against what Figma actually
  // holds, not against the code that generated it.
  const brandVarying = Object.entries(figma.semantic)
    .filter(
      ([, v]) =>
        v.modes["iimjobs Light"] !== v.modes["hirist Light"] ||
        v.modes["iimjobs Dark"] !== v.modes["hirist Dark"],
    )
    .map(([n]) => n)
    .sort()
  const expected = Object.entries(tokens.semantic)
    .filter(([, v]) => v.brandScoped)
    .map(([n]) => n)
    .sort()
  if (JSON.stringify(brandVarying) !== JSON.stringify(expected)) {
    problems.push(
      `brand-scoped tokens in figma [${brandVarying}] != code [${expected}]`,
    )
  }

  if (problems.length) {
    console.error(`figma drift — ${problems.length} problem(s):`)
    for (const line of problems) console.error(`  ${line}`)
    process.exit(1)
  }

  console.log(
    `figma matches tokens.json — ${Object.keys(tokens.primitives).length} primitives, ` +
      `${Object.keys(tokens.semantic).length} semantic across ${tokens.modes.length} modes, ` +
      `${Object.keys(tokens.radius).length} radii. ` +
      `Brand-scoped: ${expected.join(", ")}.`,
  )
}

const diffIndex = process.argv.indexOf("--diff")
if (diffIndex !== -1) {
  const path = process.argv[diffIndex + 1]
  if (!path) throw new Error("usage: --diff <dump.json>")
  diff(path)
} else if (process.argv.includes("--print")) {
  console.log(READER)
} else {
  console.log(
    "usage:\n" +
      "  --print          emit the read-only Plugin API script for use_figma\n" +
      "  --diff <file>    diff a saved Figma dump against tokens.json",
  )
}
