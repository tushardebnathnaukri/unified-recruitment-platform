import * as React from "react"
import { atom, useAtom } from "jotai"

import type { Applicant, ApplicantStatus } from "@/lib/applicants"

/**
 * Decisions taken in this session, laid over the generated applicants.
 *
 * SHARED BECAUSE TWO SCREENS DECIDE. The response manager held this in
 * component state, which was fine while it was the only place you could
 * shortlist somebody. A profile page you can decide from makes that a lie:
 * you would shortlist a candidate on their profile, go back, and find them
 * unshortlisted, because the list had never heard about it.
 *
 * AN ATOM, NOT A PROVIDER. It was `DecisionsProvider` in `main.tsx`; the state
 * is the same, it just lives in Jotai's store rather than a component, and
 * this file keeps its name so nothing that imports `useDecisions` moved.
 *
 * AN OVERLAY, NOT A MUTATED COPY. The applicants are derived from the job, so
 * only what a recruiter actually changed needs storing — a map of id to status,
 * over a list that regenerates identically every time.
 *
 * It resets on reload. There is no backend and this is not pretending
 * otherwise; the point is that a review can shortlist twenty people and watch
 * the counts move, not that the twenty survive a refresh.
 */
const decisionsAtom = atom<Record<string, ApplicantStatus>>({})

export function useDecisions() {
  const [decisions, setDecisions] = useAtom(decisionsAtom)

  return React.useMemo(
    () => ({
      /** The applicant with any decision taken in this session applied to it. */
      decided: (applicant: Applicant): Applicant =>
        decisions[applicant.id]
          ? { ...applicant, status: decisions[applicant.id] }
          : applicant,
      decide: (id: string, status: ApplicantStatus) =>
        setDecisions((current) => ({ ...current, [id]: status })),
    }),
    [decisions, setDecisions]
  )
}
