/**
 * The recruiter-side products this design system dresses.
 *
 * Adding a brand means adding an entry here and a token layer in
 * `styles/globals.css`. It should never mean forking a component — if you find
 * yourself branching on `brand` inside a component, that is a real product
 * divergence worth raising with the design team rather than absorbing.
 */
export const BRANDS = [
  { id: "iimjobs", label: "iimjobs" },
  { id: "hirist", label: "hirist" },
] as const

export type Brand = (typeof BRANDS)[number]["id"]

export const DEFAULT_BRAND: Brand = "iimjobs"

export const BRAND_IDS = BRANDS.map((brand) => brand.id) as readonly Brand[]

export function isBrand(value: unknown): value is Brand {
  return typeof value === "string" && BRAND_IDS.includes(value as Brand)
}
