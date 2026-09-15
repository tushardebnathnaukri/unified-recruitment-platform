import type { Brand } from "@workspace/ui/lib/brands"
import {
  applicantsFor,
  seedFrom,
  seededRandom,
  type Applicant,
} from "@/lib/applicants"
import {
  candidateHref,
  jobSource,
  type CandidateSource,
} from "@/lib/candidate-source"
import {
  headlineFor,
  recentSearchesFor,
  resultsFor,
  searchHref,
} from "@/lib/database"
import { liveJobsFor, type LiveJob } from "@/lib/jobs"

/**
 * Mock data for the Interviews page, modelled on hirist's own "My Interviews"
 * — a recruiter's booked slots, one row per candidate rather than per job.
 *
 * INTERVIEWS ARE DRIVEN FROM JOBS AND SEARCH RESUME, the two ways a candidate
 * comes in (`candidate-source.ts`). Somebody who applied is interviewed for
 * that posting; somebody a search found is interviewed for one of the
 * recruiter's live postings. Both are the same records those pages already
 * show — the applicant page, or the profile over the search's results — not a
 * fourth copy of a candidate, and each row says which door they came through.
 *
 * ONLY CONTACTED APPLICANTS GET A SLOT. Booking an interview implies the
 * recruiter already reached out, so a posting's slots go to its Contacted
 * bucket rather than anybody still undecided. A search has no Contacted people
 * in the mock, so its slots go to its best matches — see below.
 */

export type InterviewStatus = "confirmed" | "pending" | "completed"

export type Recommendation = "strong-yes" | "yes" | "no" | "strong-no"

/**
 * THE VERDICT IS A FORCED CHOICE, FOUR WAYS, NO MIDDLE. A five-point scale
 * collects threes; "Hire" or "No hire" is the question the panel is actually
 * answering, and the strong ends say how sure.
 */
export const RECOMMENDATIONS: { value: Recommendation; label: string }[] = [
  { value: "strong-yes", label: "Strong hire" },
  { value: "yes", label: "Hire" },
  { value: "no", label: "No hire" },
  { value: "strong-no", label: "Strong no hire" },
]

export type InterviewFeedback = {
  recommendation: Recommendation
  notes: string
  /** Who wrote it — the recruiter, in a one-user prototype. */
  by: string
  /** When, already said in words. */
  at: string
}

export type InterviewStatusOption = {
  value: InterviewStatus
  label: string
}

/** In the order the live page's dropdown lists them. */
export const INTERVIEW_STATUSES: InterviewStatusOption[] = [
  { value: "confirmed", label: "Interview Invites Confirmed" },
  { value: "pending", label: "Awaiting Candidate Response" },
  { value: "completed", label: "Completed" },
]

export function toInterviewStatus(value: string | null): InterviewStatus {
  return INTERVIEW_STATUSES.some((status) => status.value === value)
    ? (value as InterviewStatus)
    : "confirmed"
}

export type Interview = {
  id: string
  date: string
  timeSlot: string
  calendarName: string
  candidateId: string
  candidateName: string
  candidateTitle: string
  /** Their applicant page, or their profile over the search that found them. */
  candidateHref: string
  /** The posting the interview is for. */
  jobId: string
  jobTitle: string
  /** How they came in: applied to the posting, or sourced from a search. */
  source: CandidateSource
  status: InterviewStatus
  /** Written after it happened; `null` until then. */
  feedback: InterviewFeedback | null
}

/** Also the options behind "Select Calendar" — a recruiter's own name is one. */
export const CALENDAR_NAMES = ["Anurag Yadav", "Tech Panel — L2", "HR Round"]

/** The bookable slots, also offered by the booking dialog. */
export const SLOTS = [
  "10:00 – 10:30 AM",
  "11:30 AM – 12:00 PM",
  "2:00 – 2:30 PM",
  "4:00 – 4:30 PM",
]

/** The bookable days — the next working days from "today" (15 Sep 2026). */
export const DATES = [
  "16 Sep 2026",
  "17 Sep 2026",
  "18 Sep 2026",
  "19 Sep 2026",
  "22 Sep 2026",
]

/** What a panel writes, for the completed slots the mock starts with. */
const FEEDBACK_NOTES = [
  "Clear on the numbers and honest about what did not work. Would want a second round on stakeholder management.",
  "Strong on the fundamentals, thin on scale — has not run anything this size yet.",
  "Good conversation, but the reasons for leaving and the ask on pay did not line up.",
  "Structured, specific answers throughout. The best of the week for this role.",
]

/**
 * Confirmed twice as likely as either other state, so the page's default
 * view — the dropdown opens on "Confirmed" — has something in it rather
 * than risking an empty table on the first look a design review takes.
 */
const STATUS_DRAW: InterviewStatus[] = [
  "confirmed",
  "confirmed",
  "pending",
  "completed",
]

export function interviewsFor(brand: Brand): Interview[] {
  const rows: Interview[] = []
  const jobs = liveJobsFor(brand)

  const book = (
    job: LiveJob,
    candidate: Applicant,
    source: CandidateSource
  ) => {
    const random = seededRandom(seedFrom(`${job.id}-${candidate.id}-slot`))
    const status = STATUS_DRAW[Math.floor(random() * STATUS_DRAW.length)]

    // Drawn in this order so every slot lands where it did before feedback
    // existed; the feedback's own draws come after.
    const date = DATES[Math.floor(random() * DATES.length)]
    const timeSlot = SLOTS[Math.floor(random() * SLOTS.length)]
    const calendarName =
      CALENDAR_NAMES[Math.floor(random() * CALENDAR_NAMES.length)]

    rows.push({
      id: interviewId(job.id, candidate.id),
      date,
      timeSlot,
      calendarName,
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateTitle: `${candidate.title}, ${candidate.company}`,
      candidateHref: candidateHref(source, candidate.id),
      jobId: job.id,
      jobTitle: job.title,
      source,
      status,
      feedback:
        status === "completed"
          ? {
              recommendation:
                RECOMMENDATIONS[Math.floor(random() * RECOMMENDATIONS.length)]
                  .value,
              notes:
                FEEDBACK_NOTES[Math.floor(random() * FEEDBACK_NOTES.length)],
              by: calendarName,
              at: "2 days ago",
            }
          : null,
    })
  }

  // Applied: the posting's own Contacted bucket.
  for (const job of jobs) {
    const contacted = applicantsFor(job).filter(
      (applicant) => applicant.status === "contacted"
    )
    for (const candidate of contacted.slice(0, 2))
      book(job, candidate, jobSource(job, candidate.id))
  }

  // Sourced: somebody a search found, booked against one of the recruiter's
  // live postings. Their profile opens over the search's results, because they
  // never applied — there is no applicant page for them. A search deals nobody
  // as contacted (its stand-in posting has no follow-ups), so its best two
  // matches stand in for the people the recruiter reached out to.
  for (const search of recentSearchesFor(brand).slice(0, 3)) {
    if (jobs.length === 0) break
    const href = searchHref(search)
    const best = [...resultsFor(brand, search).people].sort(
      (a, b) => b.match - a.match
    )
    for (const candidate of best.slice(0, 2)) {
      const job = jobs[seedFrom(`${candidate.id}-booked`) % jobs.length]
      book(job, candidate, {
        kind: "search",
        label: headlineFor(search.query, search.mode),
        href,
      })
    }
  }

  return sortInterviews(rows)
}

/** "18 Sep, 2:00 – 2:30 PM" — the year goes without saying in a diary this short. */
export function whenOf(interview: Interview) {
  return `${interview.date.replace(/ \d{4}$/, "")}, ${interview.timeSlot}`
}

/** One interview per person per posting — booking again is rescheduling. */
export function interviewId(jobId: string, candidateId: string) {
  return `${jobId}-${candidateId}`
}

/** Soonest first, as a diary reads — not grouped by where people came from. */
export function sortInterviews(rows: Interview[]) {
  return [...rows].sort(
    (a, b) =>
      DATES.indexOf(a.date) - DATES.indexOf(b.date) ||
      SLOTS.indexOf(a.timeSlot) - SLOTS.indexOf(b.timeSlot)
  )
}
