import { useAtom } from "jotai"

import { persistedAtom } from "@/lib/persisted"

/**
 * Which filter design the database's results use.
 *
 * A PROTOTYPE SETTING, like the card layout beside it on /settings: two
 * answers to "how does a recruiter narrow a search" that the design team has
 * to see side by side before picking one, and that a recruiter would never be
 * offered.
 *
 * - `panel` is the live hirist page's refine column — twenty sections, always
 *   on screen, applied as you pick. THE DEFAULT, and drawn as the response
 *   manager's own filter rail: one column, learned once, on both screens.
 * - `juicebox` is Juicebox's — the query as a pill, the filters in a dialog you
 *   edit and save, ranked plain-English criteria, and "Expand pool" chips that
 *   say how many more people loosening each filter would find.
 *
 * A persisted atom (`lib/persisted.ts`): nothing but the results page and the
 * setting read it, and it stays in step across tabs.
 */
export type FilterVariant = "juicebox" | "panel"

/** The default first, which is the order the switcher on /settings draws. */
export const FILTER_VARIANTS: {
  value: FilterVariant
  label: string
  hint: string
}[] = [
  {
    value: "panel",
    label: "Refine panel",
    hint: "The live hirist column: every filter on screen beside the results.",
  },
  {
    value: "juicebox",
    label: "Juicebox",
    hint: "Filters in a dialog, ranked criteria, and chips that widen the pool.",
  },
]

const variantAtom = persistedAtom<FilterVariant>(
  "database-filter-variant",
  "panel",
  FILTER_VARIANTS.map((option) => option.value)
)

export function useFilterVariant() {
  const [variant, setVariant] = useAtom(variantAtom)
  return { variant, setVariant }
}
