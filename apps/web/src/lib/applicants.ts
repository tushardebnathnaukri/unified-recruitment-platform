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
  "new" | "reviewed" | "shortlisted" | "contacted" | "rejected"

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
  appliedAgo: string
  skills: string[]
  status: ApplicantStatus
}

/** The five tabs. `all` is everything, not a sixth bucket. */
export type ResponseBucket = Exclude<ApplicantStatus, "reviewed"> | "all"

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
    new: 0,
    shortlisted: 0,
    contacted: 0,
    rejected: 0,
  }

  if (job.status === "live") {
    counts.all = job.applicants
    counts.new = job.unread
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

/** "Today" for the newest application, then further back down the list. */
function appliedAgo(index: number, total: number) {
  const daysAgo = Math.floor((index / Math.max(total, 1)) * 34)
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
          counts.new -
          counts.shortlisted -
          counts.contacted -
          counts.rejected,
        0
      )
    ).fill("reviewed"),
  ]

  // Fisher-Yates on the decided tail only; the unread stay at the front.
  for (let i = decided.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[decided[i], decided[j]] = [decided[j], decided[i]]
  }

  const statuses: ApplicantStatus[] = [
    ...Array<ApplicantStatus>(counts.new).fill("new"),
    ...decided,
  ]

  return statuses.map((status, index) => {
    const pick = <T>(pool: T[]) => pool[Math.floor(random() * pool.length)]
    const skills = new Set<string>()
    while (skills.size < 3) skills.add(pick(skillPool))

    const experienceYears = 5 + Math.floor(random() * 14)
    const band =
      titleBands.find(([max]) => experienceYears < max) ?? titleBands.at(-1)!

    return {
      id: `${job.id}-a${index + 1}`,
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      title: pick(band[1]),
      company: pick(COMPANIES),
      location: pick(LOCATIONS),
      experienceYears,
      // Roughly five lakh a year of experience, plus a spread wide enough that
      // two people with the same experience are not on the same number.
      currentCtcLakh: Math.round(experienceYears * 5 + 6 + random() * 22),
      noticeDays: pick(NOTICE_DAYS),
      appliedAgo: appliedAgo(index, counts.all),
      skills: [...skills],
      status,
    }
  })
}
