import * as React from "react"

/**
 * Which filter design the database's results use.
 *
 * A PROTOTYPE SETTING, like the card layout beside it on /settings: two
 * answers to "how does a recruiter narrow a search" that the design team has
 * to see side by side before picking one, and that a recruiter would never be
 * offered.
 *
 * - `panel` is the live hirist page's refine column — twenty sections, always
 *   on screen, applied as you pick.
 * - `juicebox` is Juicebox's — the query as a pill, the filters in a dialog you
 *   edit and save, ranked plain-English criteria, and "Expand pool" chips that
 *   say how many more people loosening each filter would find.
 *
 * A hook over `localStorage` rather than a provider: nothing but the results
 * page and the setting read it, and `useSyncExternalStore` keeps both — and
 * other tabs — in step without a component in `main.tsx`.
 */
export type FilterVariant = "juicebox" | "panel"

export const FILTER_VARIANTS: {
  value: FilterVariant
  label: string
  hint: string
}[] = [
  {
    value: "juicebox",
    label: "Juicebox",
    hint: "Filters in a dialog, ranked criteria, and chips that widen the pool.",
  },
  {
    value: "panel",
    label: "Refine panel",
    hint: "The live hirist column: every filter on screen beside the results.",
  },
]

const KEY = "database-filter-variant"
const DEFAULT: FilterVariant = "juicebox"
/** `storage` only fires in OTHER tabs, so this tab announces its own writes. */
const LOCAL = "database-filter-variant-change"

/**
 * The last choice made in this tab. Storage can be unavailable — a private
 * window, a browser set to block site data, an embedded preview — and a switch
 * that silently does nothing there reads as broken, so the choice is kept here
 * too and outlives the page only when storage lets it.
 */
let chosen: FilterVariant | null = null

const isVariant = (value: unknown): value is FilterVariant =>
  FILTER_VARIANTS.some((option) => option.value === value)

function read(): FilterVariant {
  try {
    const stored = localStorage.getItem(KEY)
    if (isVariant(stored)) return stored
  } catch {
    // Storage is blocked; fall through to this tab's own choice.
  }
  return chosen ?? DEFAULT
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(LOCAL, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(LOCAL, onChange)
  }
}

export function useFilterVariant() {
  const variant = React.useSyncExternalStore(subscribe, read, () => DEFAULT)
  const setVariant = React.useCallback((next: FilterVariant) => {
    chosen = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Kept for this tab only — see `chosen`.
    }
    window.dispatchEvent(new Event(LOCAL))
  }, [])

  return { variant, setVariant }
}
