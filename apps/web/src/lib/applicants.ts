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
 * The bucket sizes come from the job itself — a job says it has 32 unread and
 * 12 shortlisted, so exactly 32 people here are `new` and 12 are `shortlisted`.
 * The Jobs list and this page cannot disagree, because one is generated from
 * the other's numbers.
 */

export type ApplicantStatus =
  /** Nobody has opened them. Named for the fact, not for how recent they are. */
  | "unread"
  /**
   * Opened, no decision taken. Called `seen` rather than `reviewed` because
   * `reviewing` is a real decision one line below it, and two statuses a
   * letter apart is a bug waiting for whoever edits this next.
   */
  | "seen"
  /** Worth another look, but not a yes. The state triage actually lives in. */
  | "reviewing"
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

/** The five tabs. `all` is everything, not a sixth bucket. */
export type ResponseBucket = Exclude<ApplicantStatus, "seen"> | "all"

/**
 * How many responses a job has, by bucket.
 *
 * Pending and rejected postings return zeroes and mean it: a job that has never
 * been published cannot have been applied to, and the page says that rather
 * than showing five empty tabs.
 *
 * `reviewed` is the remainder — opened, no decision taken. It has no tab of its
 * own on purpose: it is not a decision, it is the absence of one, and a tab for
 * it would be a queue nobody could ever clear. Those people appear under All.
 */
export function responseCounts(job: Job) {
  const counts = {
    all: 0,
    unread: 0,
    // Nobody starts in Reviewing: it is a decision, so it only exists once
    // somebody makes it. The tab fills up as you work through the list.
    reviewing: 0,
    shortlisted: 0,
    contacted: 0,
    rejected: 0,
  }

  if (job.status === "live") {
    counts.all = job.applicants
    counts.unread = job.unread
    counts.shortlisted = job.shortlisted
    counts.contacted = job.followUp
    counts.rejected = job.notAFit
  } else if (job.status === "closed") {
    counts.all = job.applicants
    counts.shortlisted = job.shortlisted
    counts.contacted = job.contacted
    counts.rejected = job.notAFit
  }

  return counts
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
 * A 32-bit LCG. Not good randomness — good *repeatable* randomness, which is
 * the only property this needs.
 */
function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function seedFrom(text: string) {
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

/** How many days back this application sits. Newest first, over ~5 weeks. */
function appliedDaysAgo(index: number, total: number) {
  return Math.floor((index / Math.max(total, 1)) * 34)
}

/** The same number, said the way a row says it. */
function appliedAgo(daysAgo: number) {
  if (daysAgo === 0) return "Today"
  if (daysAgo === 1) return "Yesterday"
  if (daysAgo < 7) return `${daysAgo} days ago`
  const weeks = Math.floor(daysAgo / 7)
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
}

/**
 * Everyone who applied to this job, newest first.
 *
 * The unread ones are at the top because they are the most recent — that is
 * what makes "New" the default reading order rather than a filter you have to
 * reach for. The decided ones are shuffled through the rest, so the list does
 * not read as four solid blocks of status.
 */
export function applicantsFor(job: Job): Applicant[] {
  const counts = responseCounts(job)
  if (counts.all === 0) return []

  const design = job.title.toLowerCase().includes("design")
  const titleBands = design ? DESIGN_TITLES : ENGINEERING_TITLES
  const skillPool = design ? DESIGN_SKILLS : ENGINEERING_SKILLS

  const random = seededRandom(seedFrom(job.id))

  const decided: ApplicantStatus[] = [
    ...Array<ApplicantStatus>(counts.shortlisted).fill("shortlisted"),
    ...Array<ApplicantStatus>(counts.contacted).fill("contacted"),
    ...Array<ApplicantStatus>(counts.rejected).fill("rejected"),
    ...Array<ApplicantStatus>(
      Math.max(
        counts.all -
          counts.unread -
          counts.reviewing -
          counts.shortlisted -
          counts.contacted -
          counts.rejected,
        0
      )
    ).fill("seen"),
  ]

  // Fisher-Yates on the decided tail only; the unread stay at the front.
  for (let i = decided.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[decided[i], decided[j]] = [decided[j], decided[i]]
  }

  const statuses: ApplicantStatus[] = [
    ...Array<ApplicantStatus>(counts.unread).fill("unread"),
    ...decided,
  ]

  return statuses.map((status, index) => {
    const pick = <T>(pool: T[]) => pool[Math.floor(random() * pool.length)]
    const skills = new Set<string>()
    while (skills.size < 3) skills.add(pick(skillPool))

    const experienceYears = 5 + Math.floor(random() * 14)
    const band =
      titleBands.find(([max]) => experienceYears < max) ?? titleBands.at(-1)!

    const daysAgo = appliedDaysAgo(index, counts.all)
    const title = pick(band[1])
    const company = pick(COMPANIES)
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
        company: positions.length === 0 ? company : pick(COMPANIES),
        from: start,
        to: positions.length === 0 ? null : cursor,
      })
      cursor = start
    }

    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`

    return {
      id: `${job.id}-a${index + 1}`,
      name,
      title,
      company,
      location: pick(LOCATIONS),
      experienceYears,
      // Roughly five lakh a year of experience, plus a spread wide enough that
      // two people with the same experience are not on the same number.
      currentCtcLakh: Math.round(experienceYears * 5 + 6 + random() * 22),
      noticeDays: pick(NOTICE_DAYS),
      appliedDaysAgo: daysAgo,
      appliedAgo: appliedAgo(daysAgo),
      skills: [...skills],
      status,
      positions,
      email: contactEmail(name),
      // A real-looking Indian mobile: 9xxxx, then five more digits.
      phone: `+91 9${Math.floor(random() * 9000 + 1000)} ${Math.floor(
        random() * 900000 + 100000
      )}`,
      education: {
        school: pick(SCHOOLS),
        degree: pick(design ? DESIGN_DEGREES : ENGINEERING_DEGREES),
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
  /** Which slice of the list to show at all — see `SHOWING`. */
  showing: string
  exp: string
  notice: string
  location: string
}

/**
 * The scope of the list, before any of the other filters narrow it.
 *
 * NEW AND UNREAD ARE NOT THE SAME THING, which is the only reason both are
 * here. New is about when somebody applied; Unread is about whether anybody has
 * looked at them. A candidate who applied this morning and has already been
 * shortlisted is new and not unread; one from three weeks ago that nobody
 * opened is unread and not new. Collapsing them into one control would lose
 * whichever question you were not asking.
 *
 * OPENED, NOT "REVIEWED". There is a Reviewing tab three inches away that means
 * something else entirely — a decision somebody made about a candidate, rather
 * than the fact that anybody looked. Two labels off by one letter, meaning
 * different things, on the same screen, is a trap for whoever reads it fastest.
 *
 * THERE IS NO "UNREAD" HERE, deliberately. It used to be, and it selected
 * exactly what the Unread TAB selects — two controls with the same name and
 * the same result, one of them only visible on the All tab. The tab won: it is
 * always on screen and it carries a count.
 */
export const SHOWING: {
  value: string
  label: string
  hint: string
  test: (applicant: Applicant) => boolean
}[] = [
  { value: "", label: "All", hint: "Everyone who applied", test: () => true },
  {
    value: "new",
    label: "New",
    hint: "Applied in the last week",
    test: (applicant) => applicant.appliedDaysAgo <= 7,
  },
  {
    value: "opened",
    label: "Opened",
    hint: "Somebody has looked at them, decided or not",
    test: (applicant) => applicant.status !== "unread",
  },
]

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

  const showing = SHOWING.find((option) => option.value === filters.showing)
  if (showing && !showing.test(applicant)) return false

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
 * Newest first is the default because the list is a queue: the people you have
 * not seen are the ones who just arrived, and any other default buries them.
 * The rest are the questions a recruiter asks when the queue is not the point
 * any more — "who is the most senior here", "who could start soonest".
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
  { value: "recent", label: "Newest first", compare: () => 0 },
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
 * The skills this posting is actually looking for.
 *
 * Derived from the job rather than stored on it: nothing else in the app shows
 * a job's required skills, so putting them on the `Job` type would be a field
 * with one reader and two places to keep in step. Seeded off the job id with
 * its own salt, so a job's requirements are stable but are not simply the
 * first skills its applicants happen to have.
 */
export function requiredSkillsFor(job: Job) {
  const design = job.title.toLowerCase().includes("design")
  const pool = design ? DESIGN_SKILLS : ENGINEERING_SKILLS
  const random = seededRandom(seedFrom(`${job.id}-requirements`))

  const required = new Set<string>()
  while (required.size < 4)
    required.add(pool[Math.floor(random() * pool.length)])
  return [...required]
}
