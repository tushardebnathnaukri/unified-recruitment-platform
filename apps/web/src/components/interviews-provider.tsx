import * as React from "react"
import { atom, useAtomValue, useSetAtom, type Atom } from "jotai"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { BRAND_IDS, type Brand } from "@workspace/ui/lib/brands"
import { interviewsFor, sortInterviews, type Interview } from "@/lib/interviews"

/**
 * Booked interviews: the seeded diary from `lib/interviews.ts`, with this
 * session's bookings laid over it — the same overlay the decisions and saved
 * lists use, per brand, reset on reload.
 *
 * Shared because the booking happens on a posting or a search and the result
 * is read on /interviews, and because a card has to know its person already has
 * a slot.
 *
 * ATOMS, NOT A PROVIDER (it was `InterviewsProvider` in `main.tsx`). The view
 * for each brand is a derived atom, so the merged, sorted diary is worked out
 * once per change and shared by every card that asks, rather than once per
 * card.
 */

// By id: an Interview is a booking, `null` a booking that was moved away.
type Changes = Record<string, Interview | null>
const changesAtom = atom<Partial<Record<Brand, Changes>>>({})

const viewAtoms = Object.fromEntries(
  BRAND_IDS.map((brand) => {
    // Seeded on first read, not at import: a brand nobody opens costs nothing.
    let seeded: Interview[] | undefined
    return [
      brand,
      atom((get) => {
        seeded ??= interviewsFor(brand)
        const byId = new Map(seeded.map((row) => [row.id, row]))
        for (const [id, row] of Object.entries(get(changesAtom)[brand] ?? {})) {
          if (row) byId.set(id, row)
          else byId.delete(id)
        }
        return sortInterviews([...byId.values()])
      }),
    ]
  })
) as Record<Brand, Atom<Interview[]>>

export function useInterviews() {
  const { brand } = useBrand()
  const interviews = useAtomValue(viewAtoms[brand])
  const setChanges = useSetAtom(changesAtom)

  return React.useMemo(
    () => ({
      /** Everybody's slots in the active product, soonest first. */
      interviews,
      /** The person's booked slot, if they have one — the soonest, if several. */
      bookingFor: (candidateId: string) =>
        interviews.find(
          (row) => row.candidateId === candidateId && row.status !== "completed"
        ),
      /**
       * Books a slot, or reschedules one. `replacing` is the slot being moved,
       * which is dropped — rescheduling onto another posting changes the id.
       */
      book: (interview: Interview, replacing?: string) =>
        setChanges((current) => {
          const forBrand = { ...(current[brand] ?? {}) }
          if (replacing && replacing !== interview.id)
            forBrand[replacing] = null
          forBrand[interview.id] = interview
          return { ...current, [brand]: forBrand }
        }),
      /** Takes a slot off the diary. Undo is `book` with the same interview. */
      cancel: (id: string) =>
        setChanges((current) => ({
          ...current,
          [brand]: { ...(current[brand] ?? {}), [id]: null },
        })),
    }),
    [brand, interviews, setChanges]
  )
}
