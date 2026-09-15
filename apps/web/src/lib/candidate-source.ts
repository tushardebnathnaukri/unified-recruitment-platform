import * as React from "react"

import type { Applicant } from "@/lib/applicants"

/**
 * Where a recruiter found somebody. There are two doors: they applied to a
 * posting (Jobs), or a search found them (Search Resume).
 *
 * EVERYTHING ELSE IS DOWNSTREAM OF THOSE TWO. An interview is booked with
 * somebody who came in through one of them, and a saved person was saved from
 * one of them — so Interviews and My Lists both record which door, and neither
 * is a door itself.
 */
export type CandidateSourceKind = "job" | "search"

export type CandidateSource = {
  kind: CandidateSourceKind
  /** The posting's title, or the search's headline. */
  label: string
  /** Back to the posting's candidate, or to the search. */
  href: string
  /** `job` only: the posting they applied to. An interview is for this job. */
  jobId?: string
}

export const CANDIDATE_SOURCES: {
  value: CandidateSourceKind
  label: string
}[] = [
  { value: "job", label: "Jobs" },
  { value: "search", label: "Search Resume" },
]

/** Somebody who applied to `job`. Their href is their applicant page. */
export function jobSource(
  job: { id: string; title: string },
  candidateId: string
): CandidateSource {
  return {
    kind: "job",
    label: job.title,
    href: `/jobs/${job.id}/applicants/${candidateId}`,
    jobId: job.id,
  }
}

/** Where a person's own page is: their applicant page, or their profile over the search. */
export function candidateHref(source: CandidateSource, candidateId: string) {
  return source.kind === "job"
    ? source.href
    : `${source.href}${source.href.includes("?") ? "&" : "?"}profile=${candidateId}`
}

/**
 * The source of the people on the current screen, as a function of the person.
 * `CandidateList` provides it from its `candidateSource` prop, and the candidate
 * page from its job; the save menu and the interview dialog read it, five
 * components down, the way the list's words reach them through `ListSource`.
 * Absent on My Lists, whose people carry their own.
 */
export const CandidateSourceContext = React.createContext<
  ((applicant: Applicant) => CandidateSource) | undefined
>(undefined)
