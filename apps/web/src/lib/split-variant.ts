import { useAtom } from "jotai"

import { persistedAtom } from "@/lib/persisted"

/**
 * How the split view's pane shows one person's CV and profile.
 *
 * A PROTOTYPE SETTING, like the card layout beside it on /settings — the
 * question `CandidateCv` leaves open in its own TODO: does the document belong
 * beside the profile or instead of it.
 *
 * - `tabs` is one at a time, the whole width of the pane, CV first. THE
 *   DEFAULT, because it is what the split view has always been.
 * - `side-by-side` is both at once, the profile on the left, each column
 *   scrolling on its own — so the facts stay put while the document is read,
 *   and the other way round. Below a pane wide enough for two columns they
 *   stack instead.
 * - `card-cv` is one column: a short summary card on top — the header, the
 *   four numbers everybody compares and the skills match — and the CV under
 *   it, in one scroll. The career and the school are left to the CV.
 *
 * A persisted atom (`lib/persisted.ts`): nothing but the split view and the
 * setting read it, and it stays in step across tabs.
 */
export type SplitVariant = "tabs" | "side-by-side" | "card-cv"

/** The default first, which is the order the switchers draw. */
export const SPLIT_VARIANTS: {
  value: SplitVariant
  label: string
  hint: string
}[] = [
  {
    value: "tabs",
    label: "Tabs",
    hint: "CV or profile, one at a time, the full width of the pane.",
  },
  {
    value: "side-by-side",
    label: "Side by side",
    hint: "Profile and CV in two columns that scroll on their own.",
  },
  {
    value: "card-cv",
    label: "Card, then CV",
    hint: "A short summary card on top — key numbers and skills — the CV under it.",
  },
]

const variantAtom = persistedAtom<SplitVariant>(
  "split-pane-variant",
  "tabs",
  SPLIT_VARIANTS.map((option) => option.value)
)

export function useSplitVariant() {
  const [variant, setVariant] = useAtom(variantAtom)
  return { variant, setVariant }
}
