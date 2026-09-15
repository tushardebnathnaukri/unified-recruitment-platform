/* eslint-disable react-refresh/only-export-components -- provider and its hook
   belong in one file, as in `decisions-provider.tsx`. */
import * as React from "react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import type { Brand } from "@workspace/ui/lib/brands"
import { interviewsFor, sortInterviews, type Interview } from "@/lib/interviews"

/**
 * Booked interviews: the seeded diary from `lib/interviews.ts`, with this
 * session's bookings laid over it — the same overlay `DecisionsProvider` and
 * `SavedListsProvider` use, per brand, reset on reload.
 *
 * Shared because the booking happens on a posting or a search and the result
 * is read on /interviews, and because a card has to know its person already has
 * a slot.
 */
type InterviewsState = {
  /** Everybody's slots in the active product, soonest first. */
  interviews: Interview[]
  /** The person's booked slot, if they have one — the soonest, if several. */
  bookingFor: (candidateId: string) => Interview | undefined
  /**
   * Books a slot, or reschedules one. `replacing` is the slot being moved,
   * which is dropped — rescheduling onto another posting changes the id.
   */
  book: (interview: Interview, replacing?: string) => void
  /** Takes a slot off the diary. Undo is `book` with the same interview. */
  cancel: (id: string) => void
}

const InterviewsContext = React.createContext<InterviewsState | undefined>(
  undefined
)

export function InterviewsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { brand } = useBrand()
  // By id: an Interview is a booking, `null` a booking that was moved away.
  const [changes, setChanges] = React.useState<
    Record<Brand, Record<string, Interview | null>>
  >({} as Record<Brand, Record<string, Interview | null>>)

  const seeded = React.useMemo(() => interviewsFor(brand), [brand])

  const value = React.useMemo<InterviewsState>(() => {
    const mine = changes[brand] ?? {}
    const byId = new Map(seeded.map((row) => [row.id, row]))
    for (const [id, row] of Object.entries(mine)) {
      if (row) byId.set(id, row)
      else byId.delete(id)
    }
    const interviews = sortInterviews([...byId.values()])

    return {
      interviews,
      bookingFor: (candidateId) =>
        interviews.find(
          (row) => row.candidateId === candidateId && row.status !== "completed"
        ),
      book: (interview, replacing) =>
        setChanges((current) => {
          const forBrand = { ...(current[brand] ?? {}) }
          if (replacing && replacing !== interview.id)
            forBrand[replacing] = null
          forBrand[interview.id] = interview
          return { ...current, [brand]: forBrand }
        }),
      cancel: (id) =>
        setChanges((current) => ({
          ...current,
          [brand]: { ...(current[brand] ?? {}), [id]: null },
        })),
    }
  }, [brand, seeded, changes])

  return (
    <InterviewsContext.Provider value={value}>
      {children}
    </InterviewsContext.Provider>
  )
}

export function useInterviews() {
  const context = React.useContext(InterviewsContext)

  if (!context) {
    throw new Error("useInterviews must be used within an InterviewsProvider")
  }

  return context
}
