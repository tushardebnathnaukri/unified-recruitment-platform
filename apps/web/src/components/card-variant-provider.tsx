import { useAtom } from "jotai"

import { persistedAtom } from "@/lib/persisted"

/**
 * Which layout the candidate cards on the response manager use.
 *
 * IT IS A PROTOTYPE SETTING, NOT A PRODUCT ONE. It sits on /settings beside the
 * brand and theme switchers, and for the same reason: these are answers to "how
 * should a candidate be laid out" that the design team has to look at side by
 * side before picking one. A recruiter would never see this control; the
 * decision it stands in for gets made once and then it goes away.
 *
 * A persisted atom (`lib/persisted.ts`) — it was a provider in `main.tsx`, and
 * the name of this file is what is left of that. It syncs across tabs like the
 * other settings, so a design review with two windows open stays in step.
 */
export type CardVariant =
  "stacked" | "columns" | "sections" | "snapshot" | "screening"

export const CARD_VARIANTS: {
  value: CardVariant
  label: string
  hint: string
}[] = [
  {
    value: "stacked",
    label: "Stacked",
    hint: "Labels down the left, values beside them. Reads like a profile.",
  },
  {
    value: "columns",
    label: "Columns",
    hint: "Buckets across the card, label over value. Fits more per screen.",
  },
  {
    value: "sections",
    label: "Sections",
    hint: "Full-width bands with a rule between. No label column, so nothing wraps.",
  },
  {
    value: "snapshot",
    label: "Snapshot",
    hint: "The four numbers you compare in a strip, the career as a timeline, the skills as a score.",
  },
  {
    value: "screening",
    label: "Screening",
    hint: "Ordered as a recruiter screens: who, then the must-haves in one panel, then the record.",
  },
]

const variantAtom = persistedAtom<CardVariant>(
  "candidate-card-variant",
  "stacked",
  CARD_VARIANTS.map((option) => option.value)
)

export function useCardVariant() {
  const [variant, setVariant] = useAtom(variantAtom)
  return { variant, setVariant }
}
