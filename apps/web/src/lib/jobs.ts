import type { LucideIcon } from "lucide-react"

import type { Brand } from "@workspace/ui/lib/brands"
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

/**
 * Which kind of hiring a posting is, which is the thing the two products
 * actually differ on: hirist is technology, iimjobs is management and senior
 * non-tech. It is stored on the job rather than sniffed from its title because
 * the applicant generator reads it to pick a title, skill and school pool, and
 * "does the title contain the word design" is not a foundation for that.
 */
export type JobDomain = "tech" | "management"

type JobBase = {
  id: string
  title: string
  location: string
  plan: "Pro" | "Basic"
  domain: JobDomain
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
  /** Candidates you moved forward who are now waiting on you. Also the
   * "Contacted" bucket on the response manager — they are the same people. */
  followUp: number
  /** Marked worth talking to, not yet reached out to. */
  shortlisted: number
  /** Turned down. */
  notAFit: number
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
  shortlisted: number
  contacted: number
  notAFit: number
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
const HIRIST_LIVE: LiveJob[] = [
  {
    id: "h1",
    domain: "tech",
    status: "live",
    title: "Principal Engineer, Platform Infrastructure",
    location: "Bengaluru",
    applicants: 148,
    unread: 32,
    recommendations: 42,
    recommendationsNew: 12,
    followUp: 9,
    shortlisted: 12,
    notAFit: 24,
    followUpOldestDays: 6,
    expiresInDays: 6,
    plan: "Pro",
  },
  {
    id: "h2",
    domain: "tech",
    status: "live",
    title: "Engineering Manager — Payments",
    location: "Multiple locations",
    applicants: 61,
    unread: 0,
    recommendations: 28,
    recommendationsNew: 0,
    followUp: 4,
    shortlisted: 8,
    notAFit: 15,
    followUpOldestDays: 2,
    expiresInDays: 3,
    plan: "Pro",
  },
  {
    id: "h3",
    domain: "tech",
    status: "live",
    title: "Product Designer II",
    location: "Pune",
    applicants: 7,
    unread: 7,
    recommendations: 31,
    recommendationsNew: 9,
    followUp: 0,
    shortlisted: 0,
    notAFit: 0,
    followUpOldestDays: 0,
    expiresInDays: 14,
    plan: "Basic",
  },
  {
    id: "h4",
    domain: "tech",
    status: "live",
    title: "Head of Talent Acquisition",
    location: "Gurugram",
    applicants: 55,
    unread: 9,
    recommendations: 12,
    recommendationsNew: 0,
    followUp: 3,
    shortlisted: 6,
    notAFit: 12,
    followUpOldestDays: 11,
    expiresInDays: 21,
    plan: "Basic",
  },
  {
    id: "h5",
    domain: "tech",
    status: "live",
    title: "Senior Data Engineer",
    location: "Hyderabad",
    applicants: 0,
    unread: 0,
    recommendations: 46,
    recommendationsNew: 46,
    followUp: 0,
    shortlisted: 0,
    notAFit: 0,
    followUpOldestDays: 0,
    expiresInDays: 29,
    plan: "Basic",
  },
  {
    id: "h6",
    domain: "tech",
    status: "live",
    title: "Director of Engineering, Marketplace",
    location: "Bengaluru",
    applicants: 0,
    unread: 0,
    recommendations: 0,
    recommendationsNew: 0,
    followUp: 0,
    shortlisted: 0,
    notAFit: 0,
    followUpOldestDays: 0,
    expiresInDays: 27,
    plan: "Pro",
  },
]

/** Submitted, waiting on moderation. Nothing else can be said about them yet. */
const HIRIST_PENDING: PendingJob[] = [
  {
    id: "h7",
    domain: "tech",
    status: "pending",
    title: "Staff Site Reliability Engineer",
    location: "Bengaluru",
    awaitingReviewDays: 2,
    plan: "Pro",
  },
  {
    id: "h8",
    domain: "tech",
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
const HIRIST_CLOSED: ClosedJob[] = [
  {
    id: "h9",
    domain: "tech",
    status: "closed",
    title: "Senior Backend Engineer — Ads",
    location: "Bengaluru",
    applicants: 212,
    shortlisted: 18,
    contacted: 11,
    notAFit: 46,
    closedOn: "12 Aug",
    outcome: "Filled",
    plan: "Pro",
  },
  {
    id: "h10",
    domain: "tech",
    status: "closed",
    title: "Regional Sales Head, West",
    location: "Mumbai",
    applicants: 34,
    shortlisted: 4,
    contacted: 2,
    notAFit: 9,
    closedOn: "28 Jul",
    outcome: "Expired",
    plan: "Basic",
  },
  {
    id: "h11",
    domain: "tech",
    status: "closed",
    title: "Product Manager, Growth",
    location: "Bengaluru",
    applicants: 96,
    shortlisted: 9,
    contacted: 6,
    notAFit: 21,
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
const HIRIST_REJECTED: RejectedJob[] = [
  {
    id: "h12",
    domain: "tech",
    status: "rejected",
    title: "Business Development Manager — huge incentives",
    location: "Delhi NCR",
    rejectedDaysAgo: 3,
    reason:
      "Pay is stated as commission only. Postings need a fixed salary range.",
    plan: "Basic",
  },
  {
    id: "h13",
    domain: "tech",
    status: "rejected",
    title: "Java Developer",
    location: "Noida",
    rejectedDaysAgo: 11,
    reason:
      "The description is identical to another posting on your account. Consolidate the two, or say what differs.",
    plan: "Basic",
  },
]

/**
 * iimjobs — management and senior non-tech.
 *
 * The numbers are shaped differently from hirist's on purpose, because the
 * markets are: a VP Sales posting draws a fraction of the applicants a platform
 * engineering one does, and a much higher proportion of them get read. A
 * prototype where both products show 148 applicants on the top job would hide
 * exactly the difference the two-product question is about.
 */
const IIMJOBS_LIVE: LiveJob[] = [
  {
    id: "i1",
    domain: "management",
    status: "live",
    title: "Vice President, Enterprise Sales",
    location: "Mumbai",
    applicants: 64,
    unread: 11,
    recommendations: 18,
    recommendationsNew: 5,
    followUp: 6,
    followUpOldestDays: 4,
    shortlisted: 9,
    notAFit: 18,
    expiresInDays: 9,
    plan: "Pro",
  },
  {
    id: "i2",
    domain: "management",
    status: "live",
    title: "Head of Brand Marketing",
    location: "Gurugram",
    applicants: 41,
    unread: 0,
    recommendations: 14,
    recommendationsNew: 0,
    followUp: 3,
    followUpOldestDays: 2,
    shortlisted: 7,
    notAFit: 12,
    expiresInDays: 4,
    plan: "Pro",
  },
  {
    id: "i3",
    domain: "management",
    status: "live",
    title: "Financial Controller",
    location: "Bengaluru",
    applicants: 22,
    unread: 22,
    recommendations: 9,
    recommendationsNew: 9,
    followUp: 0,
    followUpOldestDays: 0,
    shortlisted: 0,
    notAFit: 0,
    expiresInDays: 17,
    plan: "Basic",
  },
  {
    id: "i4",
    domain: "management",
    status: "live",
    title: "Director, Supply Chain",
    location: "Pune",
    applicants: 35,
    unread: 5,
    recommendations: 6,
    recommendationsNew: 2,
    followUp: 2,
    followUpOldestDays: 3,
    shortlisted: 4,
    notAFit: 9,
    expiresInDays: 24,
    plan: "Basic",
  },
  {
    id: "i5",
    domain: "management",
    status: "live",
    title: "General Manager, Retail Operations",
    location: "Chennai",
    applicants: 0,
    unread: 0,
    recommendations: 21,
    recommendationsNew: 21,
    followUp: 0,
    followUpOldestDays: 0,
    shortlisted: 0,
    notAFit: 0,
    expiresInDays: 30,
    plan: "Basic",
  },
]

const IIMJOBS_PENDING: PendingJob[] = [
  {
    id: "i6",
    domain: "management",
    status: "pending",
    title: "Chief Human Resources Officer",
    location: "Mumbai",
    awaitingReviewDays: 1,
    plan: "Pro",
  },
]

const IIMJOBS_CLOSED: ClosedJob[] = [
  {
    id: "i7",
    domain: "management",
    status: "closed",
    title: "Head of Category, Personal Care",
    location: "Mumbai",
    applicants: 88,
    shortlisted: 12,
    contacted: 7,
    notAFit: 31,
    closedOn: "3 Aug",
    outcome: "Filled",
    plan: "Pro",
  },
  {
    id: "i8",
    domain: "management",
    status: "closed",
    title: "Zonal Manager, North",
    location: "Delhi NCR",
    applicants: 26,
    shortlisted: 3,
    contacted: 1,
    notAFit: 8,
    closedOn: "21 Jul",
    outcome: "Expired",
    plan: "Basic",
  },
]

const IIMJOBS_REJECTED: RejectedJob[] = [
  {
    id: "i9",
    domain: "management",
    status: "rejected",
    title: "Relationship Manager — earn up to 20L",
    location: "Hyderabad",
    rejectedDaysAgo: 6,
    reason:
      "The title states earnings rather than the role. Put the salary range in the salary field.",
    plan: "Basic",
  },
]

/**
 * The two products' rosters, and the functions that read them.
 *
 * A LOOKUP, NOT A BRANCH IN A COMPONENT. CLAUDE.md's rule is that no component
 * writes `if (brand === "hirist")`, because that absorbs a product divergence
 * into the design system. Different postings on different products is not a
 * divergence — it is the products being different — so it lives here as data
 * selection, and every screen just asks for the active brand's roster.
 */
const ROSTERS: Record<Brand, Job[]> = {
  hirist: [
    ...HIRIST_LIVE,
    ...HIRIST_PENDING,
    ...HIRIST_CLOSED,
    ...HIRIST_REJECTED,
  ],
  iimjobs: [
    ...IIMJOBS_LIVE,
    ...IIMJOBS_PENDING,
    ...IIMJOBS_CLOSED,
    ...IIMJOBS_REJECTED,
  ],
}

export function jobsFor(brand: Brand) {
  return ROSTERS[brand]
}

export function liveJobsFor(brand: Brand) {
  return jobsFor(brand).filter((job): job is LiveJob => job.status === "live")
}

/**
 * The tabs, in the order a posting moves through them — live first because it
 * is where a recruiter spends the day, not because it is first chronologically.
 *
 * The empty copy lives here beside the status it belongs to: each of these
 * states empties for a different reason, and "No jobs" four times over would
 * tell a recruiter nothing about which of the four they are looking at.
 */
const JOB_STATUS_TABS: {
  value: JobStatus
  label: string
  icon: LucideIcon
  empty: { title: string; description: string }
}[] = [
  {
    value: "live",
    label: "Live",
    icon: BriefcaseIcon,
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
    empty: {
      title: "Nothing rejected",
      description:
        "If moderation turns a posting down it lands here with the reason, so you can fix it and submit again.",
    },
  },
]

/**
 * The tabs, filled from one product's roster.
 *
 * The tab list is shared and the jobs in it are not — the four states exist on
 * both products, so the labels and the empty copy stay one definition while
 * only the contents change.
 */
export function jobStatusesFor(brand: Brand) {
  const jobs = jobsFor(brand)

  return JOB_STATUS_TABS.map((tab) => ({
    ...tab,
    jobs: jobs.filter((job) => job.status === tab.value),
  }))
}

/** Narrows a URL's `?status=` to a real tab. Anything else falls back to Live. */
export function toJobStatus(value: string | null): JobStatus {
  return JOB_STATUS_TABS.some((status) => status.value === value)
    ? (value as JobStatus)
    : "live"
}
