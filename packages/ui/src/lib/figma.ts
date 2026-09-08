import map from "../../figma-map.json"

/**
 * Storybook-only. Not part of the component API — nothing in `src/components`
 * should import this.
 *
 * Resolves a component's Figma node through `figma-map.json` so the node id
 * lives in exactly one place. Hardcoding the URL per story would mean 17 edits
 * every time the library file is reorganised, and a rebuild in Figma always
 * produces a new node id.
 *
 * Usage, in a story's `meta`:
 *
 *     parameters: { design: design("stat-card") }
 */
export type FigmaComponent = keyof typeof map.components

export function design(name: FigmaComponent) {
  const { nodeId } = map.components[name]
  return {
    type: "figma" as const,
    // Figma's current URL form uses a hyphen; the colon form still resolves,
    // but store the canonical colon id and convert at the boundary.
    url: `${map.fileUrl}?node-id=${nodeId.replace(":", "-")}`,
  }
}

/** The Figma node URL for a component, without the addon wrapper. */
export function figmaUrl(name: FigmaComponent) {
  return design(name).url
}

export type FigmaPage = keyof typeof map.pages

/** Same as `design`, for the documentation pages rather than a component. */
export function designPage(name: FigmaPage) {
  return {
    type: "figma" as const,
    url: `${map.fileUrl}?node-id=${map.pages[name].replace(":", "-")}`,
  }
}
