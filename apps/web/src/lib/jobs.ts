/**
 * Mock job postings for the recruiter Jobs table.
 *
 * Deliberately not test-looking data: the legacy page is full of rows named
 * "testGlobal" and "basicJOb", which hides exactly the problems a design review
 * needs to see — how long titles truncate, how a row with 200 applicants sits
 * next to one with none, how the table reads when several states stack up.
 */

export type JobStatus =
  "published" | "unpublished" | "under-review" | "not-published"

/** Paid placement tiers. Shown next to the title, where the eye already is. */
export type JobTier = "free" | "pro" | "pro-boost"

export type Job = {
  id: string
  title: string
  createdOn: string
  /** Days until the posting expires. `null` when expiry does not apply yet. */
  daysToExpiry: number | null
  experience: { min: number; max: number }
  location: string
  status: JobStatus
  tier: JobTier
  applicants: number
  /** Subset of `applicants` the recruiter has not looked at yet. */
  unreviewed: number
  /**
   * What has to change before the job can go live. Per-job, so unlike the
   * review notice it cannot be hoisted into a single banner.
   */
  notPublishedReason?: string
}

/**
 * Status presentation lives here rather than in the table so the vocabulary
 * stays in one place — and so the badge variants stay auditable when the design
 * team settles the full status set.
 *
 * The variants map to SHARED semantic tokens, never `--primary`: a job is
 * published the same way on iimjobs and hirist, so status must not shift with
 * the brand.
 *
 * THE LABELS DIVERGE FROM THE LIVE PRODUCT, deliberately. It shipped
 * "Published", "Unpublished" and "Not published" — the last two read as
 * synonyms to anyone not already fluent in them, while meaning opposite things:
 * one is the recruiter's own doing, the other is ours.
 *
 * The set now reads Live / Paused / Under review / Needs changes. No two can be
 * mistaken for one another, each says whose move it is, and Live/Paused is a
 * pair a recruiter can act on in both directions — which is why the actions
 * around them read "Pause" and "Set live" rather than publish/unpublish.
 *
 * Only the labels moved. The keys are still `published`, `unpublished` and
 * `not-published` because those are whatever the API ends up calling them, so
 * reverting this is editing strings here and nothing else.
 */
export const JOB_STATUS: Record<
  JobStatus,
  {
    label: string
    variant: "success" | "warning" | "secondary" | "destructive"
  }
> = {
  published: { label: "Live", variant: "success" },
  unpublished: { label: "Paused", variant: "secondary" },
  "under-review": { label: "Under review", variant: "warning" },
  "not-published": { label: "Needs changes", variant: "destructive" },
}

/**
 * Tab order for the status filter. The labels track `JOB_STATUS` rather than
 * restating it, so renaming a status cannot leave a filter naming one no badge
 * uses.
 *
 * THERE IS NO UNFILTERED TAB. "All jobs" led here until the list was ordered by
 * attention, and the two pull against each other: a mixed list has to rank
 * across statuses to be useful, and that ranking is a judgement the recruiter
 * can neither see nor turn off. One status at a time, ranked within itself, is
 * a list you can reason about — and the per-tab counts still say what is
 * waiting behind the tabs you are not looking at.
 *
 * THE FIRST ENTRY IS THE LANDING TAB. Live is what a recruiter opens this page
 * to work on; the rest are exceptions, visited deliberately.
 */
export const STATUS_FILTERS: {
  value: string
  label: string
  status: JobStatus
}[] = [
  {
    value: "published",
    label: JOB_STATUS.published.label,
    status: "published",
  },
  {
    value: "unpublished",
    label: JOB_STATUS.unpublished.label,
    status: "unpublished",
  },
  {
    value: "under-review",
    label: JOB_STATUS["under-review"].label,
    status: "under-review",
  },
  {
    value: "not-published",
    label: JOB_STATUS["not-published"].label,
    status: "not-published",
  },
]

/**
 * Every job carries a tier badge, including the unpaid one — the live product
 * labels those "Basic" rather than leaving the slot empty, which keeps the
 * title line the same shape on every row.
 */
export const JOB_TIER: Record<JobTier, { label: string }> = {
  free: { label: "Basic" },
  pro: { label: "Pro" },
  "pro-boost": { label: "Pro + Boost" },
}

/**
 * Expiry is only worth flagging once it is close enough to act on. Shared by
 * the comparator below and by the warning colour on the expiry fact, so the
 * two cannot drift apart.
 */
export const EXPIRY_WARNING_DAYS = 7

/**
 * How loudly a job is asking for the recruiter, lowest rank first.
 *
 * The list used to run in creation order, which answers "what did I post most
 * recently?" — a question nobody opens this page with. These five bands answer
 * "what needs me?" instead:
 *
 * 0. Candidates are waiting on a reply. Time-sensitive in a way nothing else
 *    here is — applicants go cold while the row sits unread.
 * 1. Rejected, so the job is earning nothing until the recruiter edits it.
 * 2. Live but expiring inside the warning window.
 * 3. Live, not expiring yet, and drawing nobody — failing quietly.
 * 4. Everything with no open question: under review, already unpublished, or
 *    published and healthy.
 */
function attentionRank(job: Job) {
  if (job.unreviewed > 0) return 0
  if (job.status === "not-published") return 1
  if (job.daysToExpiry !== null && job.daysToExpiry <= EXPIRY_WARNING_DAYS)
    return 2
  if (job.status === "published" && job.applicants === 0) return 3
  return 4
}

/**
 * Ties break by size of the backlog, then by how soon the posting expires.
 * Anything still tied keeps its source order, which is creation order — `sort`
 * is stable, so the old ordering survives inside each band.
 */
export function compareByAttention(a: Job, b: Job) {
  const byRank = attentionRank(a) - attentionRank(b)
  if (byRank !== 0) return byRank

  if (a.unreviewed !== b.unreviewed) return b.unreviewed - a.unreviewed

  if (a.daysToExpiry !== null && b.daysToExpiry !== null)
    return a.daysToExpiry - b.daysToExpiry

  return 0
}

/**
 * The one thing a row is asking the recruiter to do, which is a different thing
 * per status — and used to be the same thing for everyone, so the rows in the
 * most trouble offered the least.
 *
 * A published job with nobody in it is the sharpest case: it is live, it is
 * spending its slot, and it is failing, and all the page did was print a `0`
 * and stop. Rejected jobs were worse — the reason text already tells you what
 * to change, and there was no way to go and change it.
 *
 * `null` for under review is not an oversight. Nothing the recruiter can do
 * moves that job along, and a button that does not help is worse than the gap
 * where it would sit.
 */
export function primaryActionFor(job: Job): string | null {
  switch (job.status) {
    case "published":
      return job.applicants > 0 ? "View candidates" : "Boost reach"
    case "unpublished":
      return "Set live"
    case "not-published":
      return "Edit and resubmit"
    case "under-review":
      return null
  }
}

/** One formatter so ranges cannot drift into "18 - 28" and "0 - 1" like today. */
export function formatExperience({ min, max }: Job["experience"]) {
  return `${min}–${max} yrs`
}

export const JOBS: Job[] = [
  {
    id: "1",
    title: "Vice President — Corporate Strategy & Planning",
    createdOn: "17 Aug",
    daysToExpiry: null,
    experience: { min: 12, max: 18 },
    location: "Bengaluru",
    status: "under-review",
    tier: "pro-boost",
    applicants: 0,
    unreviewed: 0,
  },
  {
    id: "2",
    title: "Senior Manager — Supply Chain Analytics",
    createdOn: "17 Aug",
    daysToExpiry: null,
    experience: { min: 8, max: 12 },
    location: "Mangaluru",
    status: "under-review",
    tier: "pro",
    applicants: 0,
    unreviewed: 0,
  },
  {
    id: "3",
    title: "Principal Engineer, Platform Infrastructure (Kubernetes, Go)",
    createdOn: "15 Aug",
    daysToExpiry: 6,
    experience: { min: 9, max: 14 },
    location: "Bengaluru",
    status: "published",
    tier: "pro-boost",
    applicants: 148,
    unreviewed: 32,
  },
  {
    id: "4",
    title: "Engineering Manager — Payments",
    createdOn: "12 Aug",
    daysToExpiry: 3,
    experience: { min: 7, max: 11 },
    location: "Multiple locations",
    status: "published",
    tier: "pro",
    applicants: 61,
    unreviewed: 0,
  },
  {
    id: "5",
    title: "Head of Talent Acquisition",
    createdOn: "9 Aug",
    daysToExpiry: 21,
    experience: { min: 10, max: 16 },
    location: "Gurugram",
    status: "published",
    tier: "free",
    applicants: 0,
    unreviewed: 0,
  },
  {
    id: "6",
    title: "Product Designer II",
    createdOn: "2 Aug",
    daysToExpiry: 14,
    experience: { min: 3, max: 6 },
    location: "Pune",
    status: "published",
    tier: "free",
    applicants: 7,
    unreviewed: 7,
  },
  {
    id: "7",
    // Real titles run this long and often restate the experience range, which
    // then disagrees with the structured field below it. Kept verbatim in shape
    // so the table gets stress-tested against the data it will actually hold.
    title:
      "Associate Director - Investment Banking Coverage - Financial Services (13-16 yrs)",
    createdOn: "24 Jul",
    daysToExpiry: null,
    experience: { min: 11, max: 15 },
    location: "Mumbai",
    status: "unpublished",
    tier: "pro",
    applicants: 93,
    unreviewed: 0,
  },
  {
    id: "8",
    title: "Urgent hiring!!! Sales role — earn upto 25 LPA",
    createdOn: "21 Jul",
    daysToExpiry: null,
    experience: { min: 1, max: 4 },
    location: "Noida",
    status: "not-published",
    tier: "free",
    applicants: 0,
    unreviewed: 0,
    notPublishedReason:
      "The title contains promotional language and a salary claim we cannot verify. Rewrite it as the role name alone and resubmit.",
  },
]
