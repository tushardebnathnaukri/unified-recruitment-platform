/* eslint-disable react-refresh/only-export-components -- provider and its hook
   belong in one file; splitting them to satisfy fast refresh is not worth it. */
import * as React from "react"

/**
 * Which layout the candidate cards on the response manager use.
 *
 * IT IS A PROTOTYPE SETTING, NOT A PRODUCT ONE. It sits on /settings beside the
 * brand and theme switchers, and for the same reason: these are two answers to
 * "how should a candidate be laid out" that the design team has to look at side
 * by side before picking one. A recruiter would never see this control; the
 * decision it stands in for gets made once and then it goes away.
 *
 * It persists to `localStorage` and syncs across tabs like the other two, so a
 * shared preview link opens on whichever variant was last picked — which is the
 * whole point of being able to send someone a link to a design review.
 */
export type CardVariant = "stacked" | "columns"

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
]

type CardVariantState = {
  variant: CardVariant
  setVariant: (variant: CardVariant) => void
}

const CardVariantContext = React.createContext<CardVariantState | undefined>(
  undefined
)

function isCardVariant(value: string | null): value is CardVariant {
  return CARD_VARIANTS.some((option) => option.value === value)
}

export function CardVariantProvider({
  children,
  defaultVariant = "stacked",
  storageKey = "candidate-card-variant",
}: {
  children: React.ReactNode
  defaultVariant?: CardVariant
  storageKey?: string
}) {
  const [variant, setVariantState] = React.useState<CardVariant>(() => {
    const stored = localStorage.getItem(storageKey)
    return isCardVariant(stored) ? stored : defaultVariant
  })

  const setVariant = React.useCallback(
    (next: CardVariant) => {
      localStorage.setItem(storageKey, next)
      setVariantState(next)
    },
    [storageKey]
  )

  // Cross-tab sync, matching ThemeProvider: `storage` only fires in the OTHER
  // tabs, so a design review with two windows open stays in step.
  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return
      if (isCardVariant(event.newValue)) setVariantState(event.newValue)
    }

    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [storageKey])

  const value = React.useMemo(
    () => ({ variant, setVariant }),
    [variant, setVariant]
  )

  return (
    <CardVariantContext.Provider value={value}>
      {children}
    </CardVariantContext.Provider>
  )
}

export function useCardVariant() {
  const context = React.useContext(CardVariantContext)

  if (!context) {
    throw new Error("useCardVariant must be used within a CardVariantProvider")
  }

  return context
}
