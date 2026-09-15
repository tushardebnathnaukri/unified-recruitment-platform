import type { Brand } from "@workspace/ui/lib/brands"
import {
  applicantsFor,
  seedFrom,
  seededRandom,
  type Applicant,
} from "@/lib/applicants"
import {
  headlineFor,
  recentSearchesFor,
  resultsFor,
  searchHref,
} from "@/lib/database"
import {
  CANDIDATE_SOURCES,
  jobSource,
  type CandidateSource,
  type CandidateSourceKind,
} from "@/lib/candidate-source"
import { liveJobsFor } from "@/lib/jobs"

/**
 * My Lists: the recruiter's own database.
 *
 * A PERSON IS SAVED ONCE AND FILED IN LISTS. Somebody worth keeping turns up on
 * a posting or in a Search Resume run, and the recruiter keeps
 * them — in one list or several. "All saved" is everybody, once; a list is a
 * view onto the same people, not a copy of them. So a person carries the ids of
 * the lists they are in, and a list carries nothing but its name.
 *
 * WHERE THEY WERE SAVED FROM IS PART OF THE RECORD. Six weeks on, "why do I
 * have this person" is answered by the posting or search they came out of, so
 * every saved person keeps that as a link back to it.
 *
 * It is a pool to come back to, not a queue: the page lays it out as results,
 * with no decision tabs.
 *
 * MOCK. The people are dealt from the same generators as the screens they were
 * "saved" from, so a person here is the same person — name, CV, photo — as on
 * the posting or search the link returns to. This is the pile a recruiter
 * already has; `SavedListsProvider` lays this session's saves over it.
 *
 * No "saved from Interviews": an interview is with somebody who came from a
 * posting or a search, and that is where they were found (`candidate-source`).
 */

export type SavedFromKind = CandidateSourceKind
export type SavedFrom = CandidateSource

export type SavedList = {
  id: string
  name: string
  description: string
}

export type SavedCandidate = Applicant & {
  /**
   * The list ids they are filed in. Never empty — saving means choosing at
   * least one list.
   */
  lists: string[]
  from: SavedFrom
  /** The recruiter's own line about them, when they wrote one. */
  note?: string
}

export const SAVED_FROM = CANDIDATE_SOURCES

/**
 * Lists named the way a recruiter names them — by what they are for, not by a
 * category. Generic ones hold anybody; the "bench" list for a posting is made
 * from that posting's own people, so its name never contradicts its contents.
 */
const GENERIC_LISTS: SavedList[] = [
  {
    id: "silver-medalists",
    name: "Silver medalists",
    description: "Came a close second on a closed role. First calls next time.",
  },
  {
    id: "not-now",
    name: "Strong, not now",
    description: "Good fits who said the timing was wrong.",
  },
  {
    id: "referrals",
    name: "Referrals",
    description: "Sent over by a hiring manager or someone on the team.",
  },
]

const NOTES = [
  "Open to moving in the new year — check back in January.",
  "Asked for well over budget. Revisit if the band moves.",
  "Great first call; lost out on notice period.",
  "Referred by the hiring manager.",
  "Wants a remote-first team.",
  "Strong, but wants a bigger scope than this role.",
]

function savedAgo(days: number) {
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? "last week" : `${weeks} weeks ago`
}

/** The postings whose people get a bench list of their own. */
function benchJobs(brand: Brand) {
  return liveJobsFor(brand).slice(0, 2)
}

export function savedListsFor(brand: Brand): SavedList[] {
  return [
    ...benchJobs(brand).map((job) => ({
      id: `bench-${job.id}`,
      name: `Bench — ${job.title}`,
      description: `Kept from ${job.title} for the next opening like it.`,
    })),
    ...GENERIC_LISTS,
  ]
}

export function savedCandidatesFor(brand: Brand): SavedCandidate[] {
  const worthKeeping = (applicant: Applicant) =>
    applicant.status === "shortlisted" || applicant.status === "maybe"

  const found: { applicant: Applicant; from: SavedFrom; bench?: string }[] = []

  for (const job of liveJobsFor(brand).slice(0, 4)) {
    const bench = benchJobs(brand).some((b) => b.id === job.id)
    for (const applicant of applicantsFor(job).filter(worthKeeping).slice(0, 6))
      found.push({
        applicant,
        from: jobSource(job, applicant.id),
        bench: bench ? `bench-${job.id}` : undefined,
      })
  }

  for (const search of recentSearchesFor(brand).slice(0, 3)) {
    const { people } = resultsFor(brand, search)
    for (const applicant of [...people]
      .sort((a, b) => b.match - a.match)
      .slice(0, 4))
      found.push({
        applicant,
        from: {
          kind: "search",
          label: headlineFor(search.query, search.mode),
          href: searchHref(search),
        },
      })
  }

  const seen = new Set<string>()
  const saved = found
    .filter(
      ({ applicant }) => !seen.has(applicant.id) && seen.add(applicant.id)
    )
    .map(({ applicant, from, bench }) => {
      const random = seededRandom(seedFrom(`${brand}-${applicant.id}-saved`))
      const days = Math.floor(random() * 45)

      const lists = bench ? [bench] : []
      for (const list of GENERIC_LISTS) if (random() < 0.3) lists.push(list.id)
      if (lists.length === 0)
        lists.push(
          GENERIC_LISTS[Math.floor(random() * GENERIC_LISTS.length)].id
        )

      const note =
        random() < 0.45 ? NOTES[Math.floor(random() * NOTES.length)] : undefined

      return {
        ...applicant,
        // The card's "when" is when they were saved, and nobody here is "new":
        // the dot means arrived since your last visit, and you put them here.
        appliedDaysAgo: days,
        appliedAgo: savedAgo(days),
        newSinceVisit: false,
        lists,
        from,
        note,
      }
    })

  // Most recently saved first — `recent` sorts by the order it is given.
  return saved.sort((a, b) => a.appliedDaysAgo - b.appliedDaysAgo)
}
