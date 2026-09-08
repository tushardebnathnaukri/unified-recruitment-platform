import type { LucideIcon } from "lucide-react"
import {
  BriefcaseIcon,
  CalendarCheckIcon,
  TicketIcon,
  UsersIcon,
} from "lucide-react"

import type { Brand } from "@workspace/ui/lib/brands"
import { liveJobsFor, type LiveJob } from "@/lib/jobs"

/**
 * Mock data for the recruiter dashboard.
 *
 * POPULATED, NOT EMPTY. The live dashboard is all empty states because the
 * account behind it has never posted a job, and a screen made entirely of
 * "you don't have any X right now" tells a design review nothing about how the
 * page behaves when it is doing its job. The empty states still matter and are
 * worth designing — but as a second state, not the only one.
 *
 * The numbers are internally consistent because the job ones are not written
 * down twice — the tiles and the active list are both computed from the live
 * jobs, which is the same roster the Jobs page renders. Hardcoding them here is
 * how "View all" ends up on a list that does not contain the row you clicked
 * from.
 *
 * They are FUNCTIONS OF THE BRAND now, not constants. The two products have
 * different postings, so they have different totals — a dashboard reading 6
 * active jobs on both would be the clearest possible tell that switching
 * product only changed the colour.
 */

export type Stat = {
  label: string
  value: string
  /** Said in words rather than a bare delta — "+18%" against what is unclear. */
  detail: string
  icon: LucideIcon
}

export function statsFor(brand: Brand): Stat[] {
  const live = liveJobsFor(brand)
  const applicants = live.reduce((total, job) => total + job.applicants, 0)
  const unread = live.reduce((total, job) => total + job.unread, 0)
  const expiring = live.filter((job) => job.expiresInDays <= 7).length

  return [
    {
      label: "Active jobs",
      value: `${live.length}`,
      detail: `${expiring} expiring this week`,
      icon: BriefcaseIcon,
    },
    {
      label: "Applicants",
      value: `${applicants}`,
      detail: `${unread} you haven't opened`,
      icon: UsersIcon,
    },
    {
      label: "Interviews",
      value: "5",
      detail: "2 today",
      icon: CalendarCheckIcon,
    },
    {
      label: "Posting credits",
      value: "9",
      detail: "of 25 used this quarter",
      icon: TicketIcon,
    },
  ]
}

/** The Jobs page owns the shape; the dashboard shows a slice of the same rows. */
export type DashboardJob = LiveJob

/**
 * The live jobs somebody has actually applied to.
 *
 * A rule rather than a hand-picked four: a freshly posted job with nobody in it
 * has nothing for this list to say, and it is the Jobs page's business anyway.
 * The full roster, including those, is one click away under "View all".
 */
export function activeJobsFor(brand: Brand): DashboardJob[] {
  return liveJobsFor(brand).filter((job) => job.applicants > 0)
}

/**
 * Starters for the dashboard's requirement box.
 *
 * A blank prompt is the hardest empty state in software, and "describe who you
 * are hiring for" is a sentence nobody wants to compose cold.
 *
 * THE LABEL IS SHORT AND THE TEXT IS LONG. Putting the whole mandate on the
 * chip made three chips that wrapped over two lines and shoved the button
 * around; the role alone is enough to say what the starter is. Picking one
 * fills the box rather than launching — a starter is a first draft, and the
 * point of these is that you edit the numbers before you go.
 */
const HIRIST_REQUIREMENTS: Requirement[] = [
  {
    label: "Platform engineer",
    text: "Staff platform engineer in Bengaluru, 9–14 years, has run Kafka at scale",
  },
  {
    label: "Engineering manager",
    text: "Engineering manager for payments, 7–11 years, has managed a team of 6+",
  },
  {
    label: "Product designer",
    text: "Senior product designer, 6+ years, owns a design system end to end",
  },
]

export type Requirement = { label: string; text: string }

export type RecentSearch = {
  id: string
  query: string
  /** The filters that narrowed it, as chips — enough to tell two runs apart. */
  filters: string[]
  matches: number
  ranAgo: string
  /** Profiles opened since the search was last run. */
  newSince: number
}

/**
 * Saved runs against the resume database.
 *
 * A search is worth listing only if it can be re-run, so each row carries what
 * made it distinct — the query and its filters — rather than a name someone had
 * to invent. `newSince` is the reason to come back: the pool moves even when
 * the query does not.
 */
const HIRIST_SEARCHES: RecentSearch[] = [
  {
    id: "s1",
    query: "Kafka, Kubernetes, platform",
    filters: ["Bengaluru", "9–14 yrs"],
    matches: 214,
    ranAgo: "2 hours ago",
    newSince: 6,
  },
  {
    id: "s2",
    query: "Engineering manager, payments",
    filters: ["Multiple locations", "7–11 yrs"],
    matches: 88,
    ranAgo: "Yesterday",
    newSince: 0,
  },
  {
    id: "s3",
    query: "Design systems, Figma, mobile",
    filters: ["Pune", "6+ yrs"],
    matches: 37,
    ranAgo: "3 days ago",
    newSince: 4,
  },
]

export type RecentProject = {
  id: string
  name: string
  /** Where the mandate is looking. Empty means it has not been started. */
  channels: ("Posted" | "Sourcing")[]
  shortlisted: number
  contacted: number
  updatedAgo: string
}

/**
 * Mandates in flight.
 *
 * The counts are the outbound funnel — shortlisted, then contacted — which is
 * what says whether a project is actually moving. A project with channels but
 * no contacts has stalled, and that is the state worth spotting from here.
 */
const HIRIST_PROJECTS: RecentProject[] = [
  {
    id: "p1",
    name: "Staff Platform Engineer",
    channels: ["Posted", "Sourcing"],
    shortlisted: 12,
    contacted: 5,
    updatedAgo: "Today",
  },
  {
    id: "p2",
    name: "Engineering Manager, Payments",
    channels: ["Sourcing"],
    shortlisted: 7,
    contacted: 0,
    updatedAgo: "2 days ago",
  },
  {
    id: "p3",
    name: "Design lead — confidential",
    channels: [],
    shortlisted: 0,
    contacted: 0,
    updatedAgo: "5 days ago",
  },
]

/**
 * iimjobs' half of the same three lists.
 *
 * A recruiter's projects, saved searches and starter prompts are the clearest
 * tell of which product they are in — more than the job list, because these are
 * things THEY wrote rather than postings they happened to receive. Leaving them
 * tech-only meant the iimjobs dashboard suggested "Platform engineer" and
 * offered a saved search for Kafka, which is the half-converted state that
 * makes a prototype look like a theme switcher again.
 */
const IIMJOBS_REQUIREMENTS: Requirement[] = [
  {
    label: "Sales leader",
    text: "VP of enterprise sales in Mumbai, 12–18 years, has carried a 100Cr quota",
  },
  {
    label: "Marketing head",
    text: "Head of brand marketing for a consumer business, 10–15 years, FMCG background",
  },
  {
    label: "Finance controller",
    text: "Financial controller, CA, 10+ years, has closed books for a listed company",
  },
]

const IIMJOBS_SEARCHES: RecentSearch[] = [
  {
    id: "s1",
    query: "P&L ownership, FMCG sales",
    filters: ["Mumbai", "12–18 yrs"],
    matches: 96,
    ranAgo: "3 hours ago",
    newSince: 4,
  },
  {
    id: "s2",
    query: "Category manager, personal care",
    filters: ["Mumbai", "8–12 yrs"],
    matches: 54,
    ranAgo: "Yesterday",
    newSince: 0,
  },
  {
    id: "s3",
    query: "Financial controller, CA",
    filters: ["Bengaluru", "10+ yrs"],
    matches: 41,
    ranAgo: "4 days ago",
    newSince: 2,
  },
]

const IIMJOBS_PROJECTS: RecentProject[] = [
  {
    id: "p1",
    name: "VP Enterprise Sales",
    channels: ["Posted", "Sourcing"],
    shortlisted: 9,
    contacted: 4,
    updatedAgo: "Today",
  },
  {
    id: "p2",
    name: "Head of Brand Marketing",
    channels: ["Sourcing"],
    shortlisted: 5,
    contacted: 0,
    updatedAgo: "2 days ago",
  },
  {
    id: "p3",
    name: "CFO — confidential",
    channels: [],
    shortlisted: 0,
    contacted: 0,
    updatedAgo: "4 days ago",
  },
]

export function suggestedRequirementsFor(brand: Brand): Requirement[] {
  return brand === "hirist" ? HIRIST_REQUIREMENTS : IIMJOBS_REQUIREMENTS
}

export function recentSearchesFor(brand: Brand): RecentSearch[] {
  return brand === "hirist" ? HIRIST_SEARCHES : IIMJOBS_SEARCHES
}

export function recentProjectsFor(brand: Brand): RecentProject[] {
  return brand === "hirist" ? HIRIST_PROJECTS : IIMJOBS_PROJECTS
}
