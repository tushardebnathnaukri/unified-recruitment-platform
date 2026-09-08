import type { LucideIcon } from "lucide-react"
import {
  ArchiveIcon,
  BriefcaseIcon,
  CircleAlertIcon,
  ClockIcon,
} from "lucide-react"

/**
 * Mock data for the Jobs page.
 *
 * A POSTING'S STATUS CHANGES WHAT IS WORTH KNOWING ABOUT IT, so this is a
 * discriminated union rather than one wide row type with most of its fields
 * blank. A live job is about applicants and the expiry closing in; a pending
 * one is about how long moderation has been sitting on it and nothing else —
 * it has no applicants to report yet. Modelling that as optional fields on a
 * single type would let a row render "0 applicants" under a job that has not
 * been published, which is the kind of quiet lie a design review then has to
 * argue about.
 *
 * The four states are the ones the live product moderates against: submitted
 * to review (pending), approved and collecting (live), turned down with a
 * reason (rejected), and finished (closed).
 *
 * These jobs are also what the dashboard shows — `lib/dashboard.ts` derives its
 * list and its counts from `LIVE_JOBS` rather than keeping a second copy, so
 * "View all" on the dashboard lands on a list that actually contains the rows
 * you just clicked away from.
 */

type JobBase = {
  id: string
  title: string
  location: string
  plan: "Pro" | "Basic"
}

export type LiveJob = JobBase & {
  status: "live"
  applicants: number
  /** Applicants nobody has opened yet. */
  unread: number
  /** Database profiles matched to this job — people you did not have to wait for. */
  recommendations: number
  /** Of those, the ones nobody has looked at yet. */
  recommendationsNew: number
  /** Candidates you moved forward who are now waiting on you. */
  followUp: number
  /** Age of the oldest of those, in days. 0 when nobody is waiting. */
  followUpOldestDays: number
  /** Days until the posting expires. Under 7 gets called out. */
  expiresInDays: number
}

export type PendingJob = JobBase & {
  status: "pending"
  /** Days since it was submitted. Moderation is meant to clear it inside one. */
  awaitingReviewDays: number
}

export type ClosedJob = JobBase & {
  status: "closed"
  applicants: number
  closedOn: string
  outcome: "Filled" | "Expired" | "Withdrawn"
}

export type RejectedJob = JobBase & {
  status: "rejected"
  rejectedDaysAgo: number
  /** Why moderation turned it down, in the words a recruiter can act on. */
  reason: string
}

export type Job = LiveJob | PendingJob | ClosedJob | RejectedJob
export type JobStatus = Job["status"]

/**
 * Live postings.
 *
 * The last two have no applicants at all — a job goes live before anyone
 * arrives, and a list where every row has a healthy number is a list that has
 * never been designed for its first day. One of them already has 46
 * recommendations against it, which is the whole argument for that box: on day
 * one the database is the only thing on the row with anything in it.
 *
 * The Product Designer job makes the same point the other way round — seven
 * applicants and thirty-one matches, so the people worth talking to are mostly
 * not the ones who applied.
 */
export const LIVE_JOBS: LiveJob[] = [
  {
    id: "j1",
    status: "live",
    title: "Principal Engineer, Platform Infrastructure",
    location: "Bengaluru",
    applicants: 148,
    unread: 32,
    recommendations: 42,
    recommendationsNew: 12,
    followUp: 9,
    followUpOldestDays: 6,
    expiresInDays: 6,
    plan: "Pro",
  },
  {
    id: "j2",
    status: "live",
    title: "Engineering Manager — Payments",
    location: "Multiple locations",
    applicants: 61,
    unread: 0,
    recommendations: 28,
    recommendationsNew: 0,
    followUp: 4,
    followUpOldestDays: 2,
    expiresInDays: 3,
    plan: "Pro",
  },
  {
    id: "j3",
    status: "live",
    title: "Product Designer II",
    location: "Pune",
    applicants: 7,
    unread: 7,
    recommendations: 31,
    recommendationsNew: 9,
    followUp: 0,
    followUpOldestDays: 0,
    expiresInDays: 14,
    plan: "Basic",
  },
  {
    id: "j4",
    status: "live",
    title: "Head of Talent Acquisition",
    location: "Gurugram",
    applicants: 55,
    unread: 9,
    recommendations: 12,
    recommendationsNew: 0,
    followUp: 3,
    followUpOldestDays: 11,
    expiresInDays: 21,
    plan: "Basic",
  },
  {
    id: "j5",
    status: "live",
    title: "Senior Data Engineer",
    location: "Hyderabad",
    applicants: 0,
    unread: 0,
    recommendations: 46,
    recommendationsNew: 46,
    followUp: 0,
    followUpOldestDays: 0,
    expiresInDays: 29,
    plan: "Basic",
  },
  {
    id: "j6",
    status: "live",
    title: "Director of Engineering, Marketplace",
    location: "Bengaluru",
    applicants: 0,
    unread: 0,
    recommendations: 0,
    recommendationsNew: 0,
    followUp: 0,
    followUpOldestDays: 0,
    expiresInDays: 27,
    plan: "Pro",
  },
]

/** Submitted, waiting on moderation. Nothing else can be said about them yet. */
export const PENDING_JOBS: PendingJob[] = [
  {
    id: "j7",
    status: "pending",
    title: "Staff Site Reliability Engineer",
    location: "Bengaluru",
    awaitingReviewDays: 2,
    plan: "Pro",
  },
  {
    id: "j8",
    status: "pending",
    title: "Chief of Staff to the CEO",
    location: "Mumbai",
    awaitingReviewDays: 0,
    plan: "Basic",
  },
]

/**
 * Finished postings. `outcome` is the only thing that separates a good closure
 * from a bad one — a job that expired unfilled and a job you closed because you
 * hired are the same row otherwise.
 */
export const CLOSED_JOBS: ClosedJob[] = [
  {
    id: "j9",
    status: "closed",
    title: "Senior Backend Engineer — Ads",
    location: "Bengaluru",
    applicants: 212,
    closedOn: "12 Aug",
    outcome: "Filled",
    plan: "Pro",
  },
  {
    id: "j10",
    status: "closed",
    title: "Regional Sales Head, West",
    location: "Mumbai",
    applicants: 34,
    closedOn: "28 Jul",
    outcome: "Expired",
    plan: "Basic",
  },
  {
    id: "j11",
    status: "closed",
    title: "Product Manager, Growth",
    location: "Bengaluru",
    applicants: 96,
    closedOn: "19 Jul",
    outcome: "Withdrawn",
    plan: "Pro",
  },
]

/**
 * Turned down by moderation. The reason is the row — a rejected job with a
 * status and no explanation is a dead end, and the live product's version of
 * this screen is exactly that.
 */
export const REJECTED_JOBS: RejectedJob[] = [
  {
    id: "j12",
    status: "rejected",
    title: "Business Development Manager — huge incentives",
    location: "Delhi NCR",
    rejectedDaysAgo: 3,
    reason:
      "Pay is stated as commission only. Postings need a fixed salary range.",
    plan: "Basic",
  },
  {
    id: "j13",
    status: "rejected",
    title: "Java Developer",
    location: "Noida",
    rejectedDaysAgo: 11,
    reason:
      "The description is identical to another posting on your account. Consolidate the two, or say what differs.",
    plan: "Basic",
  },
]

export const JOBS: Job[] = [
  ...LIVE_JOBS,
  ...PENDING_JOBS,
  ...CLOSED_JOBS,
  ...REJECTED_JOBS,
]

/**
 * The tabs, in the order a posting moves through them — live first because it
 * is where a recruiter spends the day, not because it is first chronologically.
 *
 * The empty copy lives here beside the status it belongs to: each of these
 * states empties for a different reason, and "No jobs" four times over would
 * tell a recruiter nothing about which of the four they are looking at.
 */
export const JOB_STATUSES: {
  value: JobStatus
  label: string
  icon: LucideIcon
  jobs: Job[]
  empty: { title: string; description: string }
}[] = [
  {
    value: "live",
    label: "Live",
    icon: BriefcaseIcon,
    jobs: LIVE_JOBS,
    empty: {
      title: "No live jobs",
      description:
        "Postings show up here once moderation approves them, and start collecting applicants straight away.",
    },
  },
  {
    value: "pending",
    label: "Pending",
    icon: ClockIcon,
    jobs: PENDING_JOBS,
    empty: {
      title: "Nothing waiting for review",
      description:
        "A posting sits here from the moment you submit it until moderation clears it — usually within a working day.",
    },
  },
  {
    value: "closed",
    label: "Closed",
    icon: ArchiveIcon,
    jobs: CLOSED_JOBS,
    empty: {
      title: "Nothing closed yet",
      description:
        "Jobs you fill, withdraw or let expire are kept here, with the applicants they gathered.",
    },
  },
  {
    value: "rejected",
    label: "Rejected",
    icon: CircleAlertIcon,
    jobs: REJECTED_JOBS,
    empty: {
      title: "Nothing rejected",
      description:
        "If moderation turns a posting down it lands here with the reason, so you can fix it and submit again.",
    },
  },
]

/** Narrows a URL's `?status=` to a real tab. Anything else falls back to Live. */
export function toJobStatus(value: string | null): JobStatus {
  return JOB_STATUSES.some((status) => status.value === value)
    ? (value as JobStatus)
    : "live"
}
