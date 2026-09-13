import type { Brand } from "@workspace/ui/lib/brands"
import { applicantsFor, seedFrom, seededRandom } from "@/lib/applicants"
import { liveJobsFor } from "@/lib/jobs"

/**
 * Mock data for the Interviews page, modelled on hirist's own "My Interviews"
 * — a recruiter's booked slots, one row per candidate rather than per job.
 *
 * DRAWN FROM THE SAME JOBS AND APPLICANTS the Jobs page and response manager
 * use, not a fourth copy of a candidate: the person, their fit and the
 * posting they applied to are the exact records those pages already show,
 * one click away through the routes they already have
 * (`/jobs/:jobId` and `/jobs/:jobId/applicants/:applicantId`).
 *
 * ONLY CONTACTED CANDIDATES GET A SLOT. Booking an interview implies the
 * recruiter already reached out, so this reads the people `applicantsFor`
 * marks `"contacted"` — the response manager's Contacted bucket, the same
 * `job.followUp` count the Jobs list shows — rather than anybody still
 * undecided.
 */

export type InterviewStatus = "confirmed" | "pending" | "completed"

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
  jobId: string
  jobTitle: string
  status: InterviewStatus
  feedback: "pending" | "submitted"
}

/** Also the options behind "Select Calendar" — a recruiter's own name is one. */
export const CALENDAR_NAMES = ["Anurag Yadav", "Tech Panel — L2", "HR Round"]

const SLOTS = [
  "10:00 – 10:30 AM",
  "11:30 AM – 12:00 PM",
  "2:00 – 2:30 PM",
  "4:00 – 4:30 PM",
]

const DATES = [
  "16 Sep 2026",
  "17 Sep 2026",
  "18 Sep 2026",
  "19 Sep 2026",
  "22 Sep 2026",
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

  for (const job of liveJobsFor(brand)) {
    const contacted = applicantsFor(job).filter(
      (applicant) => applicant.status === "contacted"
    )

    for (const candidate of contacted.slice(0, 2)) {
      const random = seededRandom(seedFrom(`${job.id}-${candidate.id}-slot`))
      const status = STATUS_DRAW[Math.floor(random() * STATUS_DRAW.length)]

      rows.push({
        id: `${job.id}-${candidate.id}`,
        date: DATES[Math.floor(random() * DATES.length)],
        timeSlot: SLOTS[Math.floor(random() * SLOTS.length)],
        calendarName:
          CALENDAR_NAMES[Math.floor(random() * CALENDAR_NAMES.length)],
        candidateId: candidate.id,
        candidateName: candidate.name,
        candidateTitle: `${candidate.title}, ${candidate.company}`,
        jobId: job.id,
        jobTitle: job.title,
        status,
        feedback: status === "completed" ? "submitted" : "pending",
      })
    }
  }

  return rows
}
