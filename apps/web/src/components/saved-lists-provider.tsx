/* eslint-disable react-refresh/only-export-components -- provider and its hook
   belong in one file, as in `decisions-provider.tsx`. */
import * as React from "react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import type { Brand } from "@workspace/ui/lib/brands"
import type { Applicant } from "@/lib/applicants"
import {
  savedCandidatesFor,
  savedListsFor,
  type SavedCandidate,
  type SavedFrom,
  type SavedList,
} from "@/lib/lists"

/**
 * Who is saved to which list, shared by every screen that can save somebody —
 * the response manager, Search Resume's results — and My Lists, which shows
 * the pile.
 *
 * AN OVERLAY, LIKE `DecisionsProvider`. The seeded pile in `lib/lists.ts`
 * regenerates identically, so only what the recruiter changed this session is
 * stored: a person's lists by id, and the lists they made. Filing somebody in
 * no lists is unsaving them. It resets on reload.
 *
 * Scoped by brand, because the lists are one product's — switching product
 * switches the pile, the same way it switches the jobs.
 */
type Change = { applicant: Applicant; from: SavedFrom; lists: string[] }

type SavedListsState = {
  lists: SavedList[]
  /** Everybody saved in the active product, most recently saved first. */
  saved: SavedCandidate[]
  /** The list ids a person is in; empty means not saved. */
  listsOf: (id: string) => string[]
  /**
   * Files a person in exactly `lists`. `from` is kept from the first save —
   * where somebody was found does not change because you re-filed them.
   */
  setLists: (applicant: Applicant, lists: string[], from?: SavedFrom) => void
  /** Makes a list and returns its id. */
  createList: (name: string) => string
}

const SavedListsContext = React.createContext<SavedListsState | undefined>(
  undefined
)

export function SavedListsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { brand } = useBrand()
  const [created, setCreated] = React.useState<Record<Brand, SavedList[]>>(
    {} as Record<Brand, SavedList[]>
  )
  const [changes, setChanges] = React.useState<
    Record<Brand, Record<string, Change>>
  >({} as Record<Brand, Record<string, Change>>)

  const seeded = React.useMemo(() => savedCandidatesFor(brand), [brand])

  const value = React.useMemo<SavedListsState>(() => {
    const mine = changes[brand] ?? {}
    const lists = [...savedListsFor(brand), ...(created[brand] ?? [])]

    const kept = seeded
      .map((person) =>
        mine[person.id] ? { ...person, lists: mine[person.id].lists } : person
      )
      .filter((person) => person.lists.length > 0)

    // Saved this session and not in the seeded pile: they are the newest.
    const added: SavedCandidate[] = Object.values(mine)
      .filter(
        (change) =>
          change.lists.length > 0 &&
          !seeded.some((person) => person.id === change.applicant.id)
      )
      .reverse()
      .map((change) => ({
        ...change.applicant,
        appliedDaysAgo: 0,
        appliedAgo: "today",
        newSinceVisit: false,
        lists: change.lists,
        from: change.from,
      }))

    const saved = [...added, ...kept]

    return {
      lists,
      saved,
      listsOf: (id) => saved.find((person) => person.id === id)?.lists ?? [],
      setLists: (applicant, next, from) =>
        setChanges((current) => {
          const forBrand = { ...(current[brand] ?? {}) }
          const existing =
            forBrand[applicant.id]?.from ??
            seeded.find((person) => person.id === applicant.id)?.from ??
            from
          if (!existing) return current
          // Re-inserted, so a fresh save lands last and `reverse` puts it first.
          delete forBrand[applicant.id]
          forBrand[applicant.id] = { applicant, from: existing, lists: next }
          return { ...current, [brand]: forBrand }
        }),
      createList: (name) => {
        const id = `new-${Date.now().toString(36)}`
        setCreated((current) => ({
          ...current,
          [brand]: [
            ...(current[brand] ?? []),
            { id, name, description: "A list you made this session." },
          ],
        }))
        return id
      },
    }
  }, [brand, seeded, changes, created])

  return (
    <SavedListsContext.Provider value={value}>
      {children}
    </SavedListsContext.Provider>
  )
}

export function useSavedLists() {
  const context = React.useContext(SavedListsContext)

  if (!context) {
    throw new Error("useSavedLists must be used within a SavedListsProvider")
  }

  return context
}
