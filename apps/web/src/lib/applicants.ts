import type { Job } from "@/lib/jobs"

/**
 * Mock applicants for the response manager.
 *
 * GENERATED, NOT WRITTEN OUT. The screen exists to answer "how do you get
 * through 148 responses", and a hand-written list of twelve cannot ask that
 * question — it has no scroll, no paging, and every row fits on one screen so
 * nothing about the ordering or the density is under any pressure. So the
 * people are built from pools of names, companies and skills.
 *
 * DETERMINISTIC. A plain `Math.random()` would deal a different set of people
 * on every render, which makes the page impossible to talk about in a review
 * ("the one third from the top" would not survive the sentence). The generator
 * is a small LCG seeded from the job's id, so a job's applicants are the same
 * every time and two jobs get different ones.
 *
 * The bucket sizes come from the job itself — a job says 32 people applied
 * since your last visit and 12 are shortlisted, so exactly 32 people here are
 * new and 12 are `shortlisted`. The Jobs list and this page cannot disagree,
 * because one is generated from the other's numbers.
 */

/**
 * Where a candidate stands, which is a DECISION — not whether anybody has
 * looked at them.
 *
 * THERE IS NO "UNREAD" ANY MORE, and no "seen". A recruiter's day is "who still
 * needs a decision from me", and whether a card was opened, or scrolled past,
 * or read off the card without opening anything, is not something the screen
 * can know or the recruiter cares about. Somebody skipped is simply still
 * undecided; somebody consciously parked is `maybe`. When they arrived is a
 * separate fact — see `newSinceVisit`.
 */
export type ApplicantStatus =
  /** No decision yet, looked at or not. The To review queue. */
  | "undecided"
  /** "Not now, but do not lose them" — a decision to come back, not a gap. */
  | "maybe"
  | "shortlisted"
  | "contacted"
  | "rejected"

/** One job somebody has held. `to` of `null` means they are still in it. */
export type Position = {
  title: string
  company: string
  from: number
  to: number | null
}

export type Applicant = {
  id: string
  name: string
  title: string
  company: string
  location: string
  experienceYears: number
  /** Current pay, in lakh per annum — how this market states it. */
  currentCtcLakh: number
  /** Notice period in days. 0 means available immediately. */
  noticeDays: number
  /** Days since they applied. `appliedAgo` is this, said in words. */
  appliedDaysAgo: number
  appliedAgo: string
  /**
   * Applied after the recruiter's last visit (`LAST_VISIT`). This is what the
   * dot means and what heads the To review queue — arrival, not reading.
   */
  newSinceVisit: boolean
  /**
   * How well they fit the posting, 0–100, for the Best match sort. Mostly how
   * many of the job's required skills they have, so the top of a Best match
   * list visibly carries the most highlighted skills. A real score is a model
   * the search team owns; this is its shape.
   */
  match: number
  skills: string[]
  status: ApplicantStatus
  /** Newest first; the first one is the current role. */
  positions: Position[]
  education: { school: string; degree: string; from: number; to: number }
  /**
   * Hidden on the card until a recruiter asks for it. In the live product this
   * is the gated bit — the thing a posting is really being paid for — so a
   * prototype that prints it next to the name is quietly designing away the
   * business model.
   */
  email: string
  phone: string
}

/** The tabs: one per status, plus `all`, which is everything. */
export type ResponseBucket = ApplicantStatus | "all"

/**
 * When the recruiter was last here. One user and no accounts, so it is a
 * constant — "since your last visit" has to be per person, and there is one.
 *
 * It is fixed for the whole visit on purpose, the way Slack's "new messages"
 * line is: the divider between New and Earlier must not move while you are
 * working through the list, or refreshing the page would quietly empty New.
 */
export const LAST_VISIT = "yesterday, 4:10 pm"

/**
 * How many responses a job has, by bucket.
 *
 * Pending and rejected postings return zeroes and mean it: a job that has never
 * been published cannot have been applied to, and the page says that rather
 * than showing five empty tabs.
 *
 * TO REVIEW IS THE REMAINDER — everybody without a decision, whether they were
 * skipped or never reached. It is a queue that CAN be cleared, because leaving
 * it takes a decision and every card carries the buttons for one. The newest of
 * them, `newSinceVisit`, head it.
 */
export function responseCounts(job: Job) {
  const counts = {
    all: 0,
    undecided: 0,
    // Nobody starts in Maybe: it is a decision, so it only exists once
    // somebody makes it. The tab fills up as you work through the list.
    maybe: 0,
    shortlisted: 0,
    contacted: 0,
    rejected: 0,
    newSinceVisit: 0,
  }

  if (job.status === "live") {
    counts.all = job.applicants
    counts.newSinceVisit = job.newSinceVisit
    counts.shortlisted = job.shortlisted
    counts.contacted = job.followUp
    counts.rejected = job.notAFit
  } else if (job.status === "closed") {
    counts.all = job.applicants
    counts.shortlisted = job.shortlisted
    counts.contacted = job.contacted
    counts.rejected = job.notAFit
  }

  counts.undecided = Math.max(
    counts.all -
      counts.maybe -
      counts.shortlisted -
      counts.contacted -
      counts.rejected,
    0
  )
  // Nobody can be new and decided before the visit that would decide them.
  counts.newSinceVisit = Math.min(counts.newSinceVisit, counts.undecided)

  return counts
}

/** New since the last visit AND still waiting — what the dot marks. */
export function isNew(applicant: Applicant) {
  return applicant.newSinceVisit && applicant.status === "undecided"
}

const FIRST_NAMES = [
  "Arjun",
  "Divya",
  "Karan",
  "Nisha",
  "Rohit",
  "Ananya",
  "Vikram",
  "Meera",
  "Siddharth",
  "Priyanka",
  "Aditya",
  "Kavya",
  "Rahul",
  "Sneha",
  "Aman",
  "Ritika",
  "Harsh",
  "Tanvi",
  "Nikhil",
  "Ishita",
  "Varun",
  "Pooja",
  "Gaurav",
  "Shreya",
]

const LAST_NAMES = [
  "Mehta",
  "Rao",
  "Sharma",
  "Iyer",
  "Verma",
  "Nair",
  "Kulkarni",
  "Banerjee",
  "Chopra",
  "Reddy",
  "Desai",
  "Menon",
  "Joshi",
  "Ghosh",
  "Pillai",
  "Kapoor",
]

const COMPANIES = [
  "Razorpay",
  "Flipkart",
  "Swiggy",
  "Zerodha",
  "PhonePe",
  "Meesho",
  "CRED",
  "Zomato",
  "Freshworks",
  "Postman",
  "Myntra",
  "Dream11",
  "Groww",
  "Navi",
  "Urban Company",
  "Innovaccer",
]

const LOCATIONS = [
  "Bengaluru",
  "Pune",
  "Hyderabad",
  "Gurugram",
  "Mumbai",
  "Chennai",
  "Noida",
]

/**
 * Titles by seniority band, not one flat pool.
 *
 * A flat pool deals a six-year Director of Engineering, and a reviewer looking
 * at this screen then spends the meeting on the mock data instead of the
 * design. Same reason pay is derived from experience below rather than rolled
 * independently: nothing on a card should be arguable except the design.
 */
const ENGINEERING_TITLES: [max: number, titles: string[]][] = [
  [8, ["Senior Engineer", "Lead Backend Engineer", "Engineering Manager"]],
  [12, ["Staff Engineer", "Engineering Manager", "Senior Engineering Manager"]],
  [
    99,
    [
      "Principal Engineer",
      "Senior Staff Engineer",
      "Head of Platform",
      "Director of Engineering",
    ],
  ],
]

const ENGINEERING_SKILLS = [
  "Kafka",
  "Kubernetes",
  "Go",
  "Java",
  "Postgres",
  "AWS",
  "Terraform",
  "Distributed systems",
  "gRPC",
  "Spark",
  "Python",
  "Observability",
]

const DESIGN_TITLES: [max: number, titles: string[]][] = [
  [8, ["Product Designer", "Senior Product Designer"]],
  [12, ["Senior Product Designer", "Lead Product Designer", "Design Manager"]],
  [99, ["Staff Product Designer", "Principal Designer", "Head of Design"]],
]

/**
 * iimjobs' side of the market: management and senior non-tech.
 *
 * Separate pools rather than a wider shared one, because the point of the split
 * is that a VP Sales posting and a platform engineering posting draw different
 * people. A single pool with Kafka and P&L in it would put both on the same
 * card, which is the exact thing this is meant to stop.
 */
const MANAGEMENT_TITLES: [max: number, titles: string[]][] = [
  [8, ["Manager, Sales", "Marketing Manager", "Business Analyst"]],
  [
    12,
    [
      "Senior Manager, Sales",
      "Category Manager",
      "Finance Manager",
      "HR Business Partner",
    ],
  ],
  [
    99,
    [
      "Vice President, Sales",
      "Head of Marketing",
      "Director, Operations",
      "General Manager",
      "Chief Financial Officer",
    ],
  ],
]

const MANAGEMENT_SKILLS = [
  "P&L ownership",
  "GTM strategy",
  "Channel sales",
  "Key accounts",
  "Category management",
  "Budgeting",
  "Vendor management",
  "Team building",
  "Forecasting",
  "Trade marketing",
]

/** Where this market's people actually come from — hence the product's name. */
const MANAGEMENT_SCHOOLS = [
  "IIM Ahmedabad",
  "IIM Bangalore",
  "IIM Calcutta",
  "IIM Lucknow",
  "XLRI Jamshedpur",
  "FMS Delhi",
  "ISB Hyderabad",
  "MDI Gurgaon",
  "SP Jain Mumbai",
  "NMIMS Mumbai",
]

const MANAGEMENT_DEGREES = ["MBA", "PGDM", "CA", "B.Com"]

const MANAGEMENT_COMPANIES = [
  "Hindustan Unilever",
  "Asian Paints",
  "ICICI Bank",
  "Mahindra",
  "Titan",
  "Marico",
  "Godrej",
  "Tata Motors",
  "Bajaj Finserv",
  "Aditya Birla Group",
  "Dabur",
  "HDFC Bank",
]

const DESIGN_SKILLS = [
  "Figma",
  "Design systems",
  "Prototyping",
  "User research",
  "Mobile",
  "Accessibility",
  "Motion",
  "Data viz",
]

const NOTICE_DAYS = [0, 15, 30, 45, 60, 90]

const SCHOOLS = [
  "IIT Bombay",
  "IIT Delhi",
  "IIT Kharagpur",
  "BITS Pilani",
  "NIT Trichy",
  "IIIT Hyderabad",
  "Delhi Technological University",
  "VIT Vellore",
  "Manipal Institute of Technology",
  "Anna University",
  "Jadavpur University",
  "NIT Surathkal",
]

const ENGINEERING_DEGREES = ["B.Tech", "B.E.", "M.Tech", "MCA"]
const DESIGN_DEGREES = ["B.Des", "M.Des", "B.F.A.", "B.Arch"]

/** "Now" for every date on a card. A constant, so the mock data cannot age. */
const CURRENT_YEAR = 2026

/**
 * Which market a job draws from.
 *
 * The domain comes off the job — hirist postings are `tech`, iimjobs' are
 * `management` — and design is the one split INSIDE a domain, because a product
 * designer and a backend engineer are both technology hires but share almost
 * nothing on a card.
 */
function poolsFor(job: Job) {
  if (job.domain === "management") {
    return {
      titleBands: MANAGEMENT_TITLES,
      skillPool: MANAGEMENT_SKILLS,
      companies: MANAGEMENT_COMPANIES,
      schools: MANAGEMENT_SCHOOLS,
      degrees: MANAGEMENT_DEGREES,
    }
  }

  const design = job.title.toLowerCase().includes("design")

  return {
    titleBands: design ? DESIGN_TITLES : ENGINEERING_TITLES,
    skillPool: design ? DESIGN_SKILLS : ENGINEERING_SKILLS,
    companies: COMPANIES,
    schools: SCHOOLS,
    degrees: design ? DESIGN_DEGREES : ENGINEERING_DEGREES,
  }
}

/**
 * A 32-bit LCG. Not good randomness — good *repeatable* randomness, which is
 * the only property this needs.
 */
export function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

export function seedFrom(text: string) {
  let hash = 2166136261
  for (const char of text) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** first.last@… — the shape of an address people actually put on a CV. */
function contactEmail(name: string) {
  return `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`
}

/**
 * When this application arrived. The new ones came in since the last visit —
 * within the last day, so they are counted in hours. Everybody else is spread
 * newest first over the ~5 weeks before that.
 */
function appliedAt(index: number, total: number, fresh: number) {
  if (index < fresh) {
    const hours = 1 + Math.floor((index / Math.max(fresh, 1)) * 18)
    return {
      daysAgo: 0,
      label: hours === 1 ? "1 hour ago" : `${hours} hours ago`,
    }
  }
  const daysAgo =
    1 + Math.floor(((index - fresh) / Math.max(total - fresh, 1)) * 33)
  return { daysAgo, label: appliedAgo(daysAgo) }
}

/** A number of days, said the way a row says it. */
function appliedAgo(daysAgo: number) {
  if (daysAgo === 0) return "Today"
  if (daysAgo === 1) return "Yesterday"
  if (daysAgo < 7) return `${daysAgo} days ago`
  const weeks = Math.floor(daysAgo / 7)
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
}

/**
 * What a database search pins down before anybody is generated: the skills it
 * named, and the experience and city it asked for. A posting passes none of
 * these and gets the people it always had.
 *
 * The people CONFORM rather than being filtered afterwards. A search for
 * Bengaluru that came back with six cities in it, of which a filter then kept
 * one, would put "214 matches" on the recent row and "31 of 214" on the page —
 * two numbers for one search.
 */
export type GenerateOptions = {
  required?: string[]
  /** Inclusive, in years. */
  experience?: [number, number]
  location?: string
}

/**
 * Everyone who applied to this job, newest first.
 *
 * The ones who arrived since the last visit are at the top, undecided, because
 * nobody has been here since they came. Everybody older is shuffled — decided
 * or still waiting — so the list does not read as solid blocks of status, and
 * so the Earlier part of To review is made of people who were skipped between
 * people who were not, which is what a real backlog looks like.
 */
export function applicantsFor(
  job: Job,
  options: GenerateOptions = {}
): Applicant[] {
  const counts = responseCounts(job)
  if (counts.all === 0) return []

  const pools = poolsFor(job)
  const { titleBands, skillPool } = pools
  const required = options.required ?? requiredSkillsFor(job)
  const [lowest, highest] = options.experience ?? [5, 18]

  const random = seededRandom(seedFrom(job.id))

  const older: ApplicantStatus[] = [
    ...Array<ApplicantStatus>(counts.shortlisted).fill("shortlisted"),
    ...Array<ApplicantStatus>(counts.contacted).fill("contacted"),
    ...Array<ApplicantStatus>(counts.rejected).fill("rejected"),
    ...Array<ApplicantStatus>(counts.undecided - counts.newSinceVisit).fill(
      "undecided"
    ),
  ]

  // Fisher-Yates on the older tail only; the new stay at the front.
  for (let i = older.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[older[i], older[j]] = [older[j], older[i]]
  }

  const statuses: ApplicantStatus[] = [
    ...Array<ApplicantStatus>(counts.newSinceVisit).fill("undecided"),
    ...older,
  ]

  return statuses.map((status, index) => {
    const pick = <T>(pool: T[]) => pool[Math.floor(random() * pool.length)]
    const skills = new Set<string>()
    while (skills.size < 3) skills.add(pick(skillPool))

    // One draw either way, so a job's people come out exactly as they did
    // before a search could narrow the range.
    const experienceYears =
      lowest + Math.floor(random() * (highest - lowest + 1))
    const band =
      titleBands.find(([max]) => experienceYears < max) ?? titleBands.at(-1)!

    const applied = appliedAt(index, counts.all, counts.newSinceVisit)
    const title = pick(band[1])
    const company = pick(pools.companies)
    const careerStart = CURRENT_YEAR - experienceYears

    /**
     * A career walked backwards from today, two to four years a job, until it
     * runs out of experience — which is why the number of positions varies
     * with seniority instead of being rolled on its own. A five-year candidate
     * with six jobs behind them is the sort of detail that derails a review.
     *
     * Earlier titles come from the bands BELOW the one they are in now: people
     * get promoted, and a card showing "Principal Engineer" under "Senior
     * Engineer" reads as a data bug.
     */
    const positions: Position[] = []
    let cursor = CURRENT_YEAR
    while (cursor > careerStart && positions.length < 6) {
      const tenure = Math.min(
        2 + Math.floor(random() * 3),
        cursor - careerStart
      )
      const start = cursor - tenure
      // STRICTLY below their current band. `<=` let a Principal Engineer show
      // up two rows under an Engineering Manager, which reads as a demotion
      // rather than a career. The junior-most band has nothing below it, so it
      // falls back to itself.
      const lower = titleBands.filter(([max]) => max < band[0])
      const earlier = (lower.length > 0 ? lower : [titleBands[0]]).flatMap(
        ([, titles]) => titles
      )

      positions.push({
        title: positions.length === 0 ? title : pick(earlier),
        company: positions.length === 0 ? company : pick(pools.companies),
        from: start,
        to: positions.length === 0 ? null : cursor,
      })
      cursor = start
    }

    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`

    // Its own seeded stream, not `random`: a draw from the shared one here
    // would shift every value after it and re-deal every person on the page.
    const jitter = seededRandom(seedFrom(`${job.id}-a${index + 1}-match`))()
    const fits = [...skills].filter((skill) => required.includes(skill)).length

    return {
      id: `${job.id}-a${index + 1}`,
      name,
      title,
      company,
      location: options.location ?? pick(LOCATIONS),
      experienceYears,
      // Roughly five lakh a year of experience, plus a spread wide enough that
      // two people with the same experience are not on the same number.
      currentCtcLakh: Math.round(experienceYears * 5 + 6 + random() * 22),
      noticeDays: pick(NOTICE_DAYS),
      appliedDaysAgo: applied.daysAgo,
      appliedAgo: applied.label,
      newSinceVisit: index < counts.newSinceVisit,
      match: Math.round(fits * 25 + jitter * 25),
      skills: [...skills],
      status,
      positions,
      email: contactEmail(name),
      // A real-looking Indian mobile: 9xxxx, then five more digits.
      phone: `+91 9${Math.floor(random() * 9000 + 1000)} ${Math.floor(
        random() * 900000 + 100000
      )}`,
      education: {
        school: pick(pools.schools),
        degree: pick(pools.degrees),
        // Four years, ending the year the career starts. Nobody on this screen
        // has a gap between graduating and their first job, which is a
        // simplification, not a claim about the market.
        from: careerStart - 4,
        to: careerStart,
      },
    }
  })
}

/**
 * What a recruiter narrows 148 responses by.
 *
 * FOUR CONTROLS, NOT A PANEL OF TWELVE. Search, then the three facts that
 * actually rule people out on this market: how senior they are, how soon they
 * can start, and where they are. Pay is deliberately not one of them — a
 * recruiter filtering on current salary is filtering on what somebody is paid
 * today rather than what they are worth, and building that in as a first-class
 * control endorses it. It is on the card to read, not to filter by.
 *
 * THEY ARE INLINE, NOT BEHIND A "FILTERS" BUTTON. This is the screen's main
 * verb; a sheet would put a click in front of every use of it and hide which
 * filters are on. The cost is a second row, which the tabs already established.
 */
export type Filters = {
  q: string
  exp: string
  notice: string
  location: string
}

/*
 * There used to be a SHOWING filter here — All / New / Opened — scoping the All
 * tab. The To review queue replaced it: "new" is the head of that queue, and
 * "opened" is not something the screen tracks any more (see `ApplicantStatus`).
 */

export const EXPERIENCE_BANDS: {
  value: string
  label: string
  test: (years: number) => boolean
}[] = [
  { value: "0-8", label: "Under 8 yrs", test: (y) => y < 8 },
  { value: "8-12", label: "8–12 yrs", test: (y) => y >= 8 && y < 12 },
  { value: "12+", label: "12+ yrs", test: (y) => y >= 12 },
]

export const NOTICE_BANDS: {
  value: string
  label: string
  test: (days: number) => boolean
}[] = [
  { value: "now", label: "Available now", test: (d) => d === 0 },
  { value: "30", label: "30 days or less", test: (d) => d <= 30 },
  { value: "60", label: "60 days or less", test: (d) => d <= 60 },
]

/**
 * Search covers name, current role, company and skills in one box.
 *
 * One field rather than four, because a recruiter typing "kafka" does not first
 * decide whether that is a skill or a job title, and on this data it is both.
 */
export function matchesFilters(applicant: Applicant, filters: Filters) {
  const q = filters.q.trim().toLowerCase()
  if (q) {
    const haystack = [
      applicant.name,
      applicant.title,
      applicant.company,
      ...applicant.skills,
    ]
      .join(" ")
      .toLowerCase()
    if (!haystack.includes(q)) return false
  }

  const band = EXPERIENCE_BANDS.find((b) => b.value === filters.exp)
  if (band && !band.test(applicant.experienceYears)) return false

  const notice = NOTICE_BANDS.find((b) => b.value === filters.notice)
  if (notice && !notice.test(applicant.noticeDays)) return false

  if (filters.location && applicant.location !== filters.location) return false

  return true
}

/**
 * How the list is ordered.
 *
 * MOST RECENT OR BEST MATCH are the two a recruiter switches between: the queue
 * in the order it arrived, or the same queue with the strongest fits first —
 * which is what you want after a week away, when New holds far more than you
 * will read today. Most recent is the default because the list is a queue.
 * The other two are the questions asked once the queue is not the point any
 * more — "who is the most senior here", "who could start soonest".
 *
 * In To review the sort applies INSIDE New and Earlier, never across them: a
 * better match from three weeks ago does not jump ahead of today's arrivals.
 *
 * THERE IS NO SORT BY PAY, for the same reason there is no filter on it:
 * ordering a shortlist by what people are currently paid ranks them by their
 * last employer's budget. It is on the card to read, not to rank by.
 */
export const SORTS: {
  value: string
  label: string
  compare: (a: Applicant, b: Applicant) => number
}[] = [
  { value: "recent", label: "Most recent", compare: () => 0 },
  {
    value: "match",
    label: "Best match",
    compare: (a, b) => b.match - a.match,
  },
  {
    value: "experience",
    label: "Most experience",
    compare: (a, b) => b.experienceYears - a.experienceYears,
  },
  {
    value: "notice",
    label: "Soonest available",
    compare: (a, b) => a.noticeDays - b.noticeDays,
  },
]

/**
 * `recent` is the generated order, so it sorts by nothing — a stable no-op
 * comparator rather than a reversal, because the generator already lays people
 * out newest first and re-deriving that from `appliedAgo` would mean parsing
 * "3 weeks ago" back into a number.
 */
export function sortApplicants(applicants: Applicant[], sort: string) {
  const rule = SORTS.find((option) => option.value === sort)
  if (!rule || rule.value === "recent") return applicants
  return [...applicants].sort(rule.compare)
}

/**
 * The skills from this market's pool that a piece of text names, whole words
 * and case-insensitive — "Kafka, Kubernetes, platform" names two. A search's
 * skills bucket highlights these rather than four picked at random, so what is
 * green on a card is what the recruiter typed.
 */
export function skillsIn(job: Job, text: string): string[] {
  return poolsFor(job).skillPool.filter((skill) =>
    new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i").test(text)
  )
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * The skills this posting is actually looking for.
 *
 * Derived from the job rather than stored on it: nothing else in the app shows
 * a job's required skills, so putting them on the `Job` type would be a field
 * with one reader and two places to keep in step. Seeded off the job id with
 * its own salt, so a job's requirements are stable but are not simply the
 * first skills its applicants happen to have.
 */
export function requiredSkillsFor(job: Job) {
  const pool = poolsFor(job).skillPool
  const random = seededRandom(seedFrom(`${job.id}-requirements`))

  const required = new Set<string>()
  while (required.size < 4)
    required.add(pool[Math.floor(random() * pool.length)])
  return [...required]
}
