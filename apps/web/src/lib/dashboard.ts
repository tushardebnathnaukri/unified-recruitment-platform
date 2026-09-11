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

/**
 * Applicants across every live job who arrived since the last visit. One
 * function because the greeting and the Applicants tile both say it, and two
 * sums is how they would end up saying different numbers.
 */
export function newSinceVisitFor(brand: Brand): number {
  return liveJobsFor(brand).reduce((total, job) => total + job.newSinceVisit, 0)
}

export function statsFor(brand: Brand): Stat[] {
  const live = liveJobsFor(brand)
  const applicants = live.reduce((total, job) => total + job.applicants, 0)
  const fresh = newSinceVisitFor(brand)
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
      detail: `${fresh} new since your last visit`,
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
 * iimjobs' half of the same two lists.
 *
 * A recruiter's projects and saved searches are the clearest tell of which
 * product they are in — more than the job list, because these are things THEY
 * wrote rather than postings they happened to receive. Leaving them tech-only
 * meant the iimjobs dashboard offered a saved search for Kafka, which is the
 * half-converted state that makes a prototype look like a theme switcher again.
 */
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

export function recentSearchesFor(brand: Brand): RecentSearch[] {
  return brand === "hirist" ? HIRIST_SEARCHES : IIMJOBS_SEARCHES
}

export function recentProjectsFor(brand: Brand): RecentProject[] {
  return brand === "hirist" ? HIRIST_PROJECTS : IIMJOBS_PROJECTS
}

const FILLER = new Set(["a", "an", "and", "for", "of", "the"])

/** Words that name a role, with the punctuation and filler taken out. */
function roleWords(text: string): string[] {
  return text
    .replace(/—.*$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !FILLER.has(word))
}

/**
 * The project a role would be filed under, if there is one already.
 *
 * PROJECTS ARE NOT CREATED, THEY ACCUMULATE. Anything started from the
 * dashboard — a search, a posting, a look at the market — lands in the project
 * for its role, and the first thing done for a new role makes one. So the
 * question the start box asks here is only "does this role have a project
 * yet", matched on whole words either way round: "Engineering manager for
 * payments" finds "Engineering Manager, Payments", and a half-typed "Staff"
 * finds "Staff Platform Engineer", but "C" does not find "CFO".
 *
 * TODO(design): the mechanics — what counts as the same role, whether a
 * recruiter can merge or split two, what a project holds — are not decided.
 */
export function projectForRole(
  brand: Brand,
  role: string
): RecentProject | undefined {
  const typed = roleWords(role)
  if (typed.length === 0) return undefined

  return recentProjectsFor(brand).find((project) => {
    const named = roleWords(project.name)
    const [shorter, longer] =
      typed.length <= named.length ? [typed, named] : [named, typed]
    return shorter.every((word, i) => word === longer[i])
  })
}

/**
 * Performance — how the recruiter's own hiring is going.
 *
 * IT IS THE OTHER HALF OF INSIGHTS, AND THE HALF THAT IS ABOUT YOU. Insights
 * describes a market and reads the same for everybody who searches it; this
 * describes one recruiter's postings and is meaningless to anybody else. That
 * split is why the nav item was renamed rather than this being folded in there.
 *
 * Per brand, like the rosters: two products, two sets of postings, and a
 * `Record<Brand, …>` lookup rather than a component branching on brand.
 */
export type FunnelStage = {
  stage: string
  count: number
  /** What this stage is for, in the recruiter's words. */
  hint: string
}

export type Performance = {
  /** Median days from a posting going live to an offer accepted. */
  timeToFill: number
  timeToFillLastQuarter: number
  funnel: FunnelStage[]
  /** Where accepted offers actually came from. Validates the mandate's channels. */
  sources: { source: string; hires: number }[]
  /** Of everybody contacted, how many replied at all. */
  replyRate: number
  replyRateLastQuarter: number
}

const PERFORMANCE: Record<Brand, Performance> = {
  iimjobs: {
    timeToFill: 38,
    timeToFillLastQuarter: 45,
    funnel: [
      { stage: "Applied", count: 1284, hint: "Came to the posting" },
      { stage: "Reviewed", count: 742, hint: "Somebody opened them" },
      { stage: "Shortlisted", count: 186, hint: "Worth a conversation" },
      { stage: "Contacted", count: 141, hint: "Reached out to" },
      { stage: "Interviewed", count: 63, hint: "Sat with a panel" },
      { stage: "Hired", count: 11, hint: "Offer accepted" },
    ],
    sources: [
      { source: "Applied to a posting", hires: 7 },
      { source: "Sourced from the database", hires: 3 },
      { source: "Referred", hires: 1 },
    ],
    replyRate: 34,
    replyRateLastQuarter: 29,
  },
  hirist: {
    timeToFill: 44,
    timeToFillLastQuarter: 41,
    funnel: [
      { stage: "Applied", count: 2170, hint: "Came to the posting" },
      { stage: "Reviewed", count: 1106, hint: "Somebody opened them" },
      { stage: "Shortlisted", count: 248, hint: "Worth a conversation" },
      { stage: "Contacted", count: 197, hint: "Reached out to" },
      { stage: "Interviewed", count: 88, hint: "Sat with a panel" },
      { stage: "Hired", count: 14, hint: "Offer accepted" },
    ],
    sources: [
      { source: "Applied to a posting", hires: 8 },
      { source: "Sourced from the database", hires: 5 },
      { source: "Referred", hires: 1 },
    ],
    replyRate: 27,
    replyRateLastQuarter: 31,
  },
}

export function performanceFor(brand: Brand): Performance {
  return PERFORMANCE[brand]
}

/**
 * The biggest drop in the funnel, as a share of the stage above it.
 *
 * A funnel where every bar is shorter than the last tells a recruiter nothing —
 * that is what a funnel IS. The number worth surfacing is which step loses the
 * most, because that is the one step where doing something different changes
 * the outcome. Applied → Reviewed is excluded: everything is lost there by
 * definition on a posting with 1,284 applicants, and "review more of them" is
 * not a finding.
 */
export function worstDrop(funnel: FunnelStage[]) {
  let worst = { from: funnel[1], to: funnel[2], lostPct: 0 }

  for (let i = 2; i < funnel.length; i++) {
    const from = funnel[i - 1]
    const to = funnel[i]
    const lostPct = Math.round(((from.count - to.count) / from.count) * 100)
    if (lostPct > worst.lostPct) worst = { from, to, lostPct }
  }

  return worst
}
