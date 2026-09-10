/* eslint-disable react-refresh/only-export-components -- provider and its hook
   belong in one file; splitting them to satisfy fast refresh is not worth it. */
import * as React from "react"

import type { Applicant, ApplicantStatus } from "@/lib/applicants"

/**
 * Decisions taken in this session, laid over the generated applicants.
 *
 * IT IS A PROVIDER BECAUSE TWO SCREENS SHARE IT. The response manager held
 * this in component state, which was fine while it was the only place you
 * could shortlist somebody. A profile page you can decide from makes that a
 * lie: you would shortlist a candidate on their profile, go back, and find
 * them unshortlisted, because the list had never heard about it.
 *
 * AN OVERLAY, NOT A MUTATED COPY. The applicants are derived from the job, so
 * only what a recruiter actually changed needs storing — a map of id to status,
 * over a list that regenerates identically every time.
 *
 * It resets on reload. There is no backend and this is not pretending
 * otherwise; the point is that a review can shortlist twenty people and watch
 * the counts move, not that the twenty survive a refresh.
 */
type DecisionsState = {
  /** The applicant with any decision taken in this session applied to it. */
  decided: (applicant: Applicant) => Applicant
  decide: (id: string, status: ApplicantStatus) => void
}

const DecisionsContext = React.createContext<DecisionsState | undefined>(
  undefined
)

export function DecisionsProvider({ children }: { children: React.ReactNode }) {
  const [decisions, setDecisions] = React.useState<
    Record<string, ApplicantStatus>
  >({})

  const value = React.useMemo<DecisionsState>(
    () => ({
      decided: (applicant) =>
        decisions[applicant.id]
          ? { ...applicant, status: decisions[applicant.id] }
          : applicant,
      decide: (id, status) =>
        setDecisions((current) => ({ ...current, [id]: status })),
    }),
    [decisions]
  )

  return (
    <DecisionsContext.Provider value={value}>
      {children}
    </DecisionsContext.Provider>
  )
}

export function useDecisions() {
  const context = React.useContext(DecisionsContext)

  if (!context) {
    throw new Error("useDecisions must be used within a DecisionsProvider")
  }

  return context
}
