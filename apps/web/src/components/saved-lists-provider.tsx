import * as React from "react"
import { atom, useAtomValue, useSetAtom, type Atom } from "jotai"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { BRAND_IDS, type Brand } from "@workspace/ui/lib/brands"
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
 * AN OVERLAY, LIKE THE DECISIONS. The seeded pile in `lib/lists.ts`
 * regenerates identically, so only what the recruiter changed this session is
 * stored: a person's lists by id, and the lists they made. Filing somebody in
 * no lists is unsaving them. It resets on reload.
 *
 * Scoped by brand, because the lists are one product's — switching product
 * switches the pile, the same way it switches the jobs.
 *
 * ATOMS, NOT A PROVIDER (it was `SavedListsProvider` in `main.tsx`). Every
 * card's Save menu asks for this, so the merged pile is a derived atom per
 * brand: worked out once per change, not once per card.
 */
type Change = { applicant: Applicant; from: SavedFrom; lists: string[] }

const changesAtom = atom<Partial<Record<Brand, Record<string, Change>>>>({})
const createdAtom = atom<Partial<Record<Brand, SavedList[]>>>({})

// The seeded pile, generated on first use and identical every time after.
const seeded: Partial<Record<Brand, SavedCandidate[]>> = {}
const seededFor = (brand: Brand) =>
  (seeded[brand] ??= savedCandidatesFor(brand))

type View = { lists: SavedList[]; saved: SavedCandidate[] }

const viewAtoms = Object.fromEntries(
  BRAND_IDS.map((brand) => [
    brand,
    atom((get): View => {
      const mine = get(changesAtom)[brand] ?? {}
      const pile = seededFor(brand)
      const lists = [
        ...savedListsFor(brand),
        ...(get(createdAtom)[brand] ?? []),
      ]

      const kept = pile
        .map((person) =>
          mine[person.id] ? { ...person, lists: mine[person.id].lists } : person
        )
        .filter((person) => person.lists.length > 0)

      // Saved this session and not in the seeded pile: they are the newest.
      const added: SavedCandidate[] = Object.values(mine)
        .filter(
          (change) =>
            change.lists.length > 0 &&
            !pile.some((person) => person.id === change.applicant.id)
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

      return { lists, saved: [...added, ...kept] }
    }),
  ])
) as Record<Brand, Atom<View>>

export function useSavedLists() {
  const { brand } = useBrand()
  const { lists, saved } = useAtomValue(viewAtoms[brand])
  const setChanges = useSetAtom(changesAtom)
  const setCreated = useSetAtom(createdAtom)

  return React.useMemo(
    () => ({
      lists,
      /** Everybody saved in the active product, most recently saved first. */
      saved,
      /** The list ids a person is in; empty means not saved. */
      listsOf: (id: string) =>
        saved.find((person) => person.id === id)?.lists ?? [],
      /**
       * Files a person in exactly `lists`. `from` is kept from the first save —
       * where somebody was found does not change because you re-filed them.
       */
      setLists: (applicant: Applicant, next: string[], from?: SavedFrom) =>
        setChanges((current) => {
          const forBrand = { ...(current[brand] ?? {}) }
          const existing =
            forBrand[applicant.id]?.from ??
            seededFor(brand).find((person) => person.id === applicant.id)
              ?.from ??
            from
          if (!existing) return current
          // Re-inserted, so a fresh save lands last and `reverse` puts it first.
          delete forBrand[applicant.id]
          forBrand[applicant.id] = { applicant, from: existing, lists: next }
          return { ...current, [brand]: forBrand }
        }),
      /** Makes a list and returns its id. */
      createList: (name: string) => {
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
    }),
    [brand, lists, saved, setChanges, setCreated]
  )
}
