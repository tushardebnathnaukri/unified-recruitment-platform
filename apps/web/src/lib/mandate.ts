import type { LucideIcon } from "lucide-react"
import { DatabaseIcon, MegaphoneIcon } from "lucide-react"

import { LOCATIONS } from "@/lib/database-search"

/**
 * The hiring mandate — one statement of who you need, from which both channels
 * are derived.
 *
 * THIS IS THE BET THE PAGE IS TESTING. Today a recruiter with a role to fill
 * has to know to do two separate things — post a job, and search the resume
 * database — do them in two places, and merge two result sets in their head.
 * Nothing tells them the same person turned up in both. Making the mandate the
 * object and the two channels derived from it is the whole idea; the forms
 * behind each channel stay exactly where they are, as the manual path.
 */

export type Criterion = {
  id: string
  /** A full sentence, because that is how the evaluation is stated back. */
  text: string
}

/**
 * The structured half of a mandate: hard constraints, the things a query can
 * be true or false about. Criteria are the soft half — see `ParsedMandate`.
 */
export type MandateFilters = {
  minYears: string
  maxYears: string
  locations: string[]
  skills: string[]
}

export type ParsedMandate = {
  title: string
  filters: MandateFilters
  criteria: Criterion[]
}

export const EMPTY_FILTERS: MandateFilters = {
  minYears: "",
  maxYears: "",
  locations: [],
  skills: [],
}

/** Ways to say the same thing. Only the first is built. */
export type InputMode = {
  id: string
  label: string
  ready: boolean
}

export const INPUT_MODES: InputMode[] = [
  { id: "describe", label: "Describe the role", ready: true },
  { id: "jd", label: "Paste a JD", ready: false },
  { id: "existing", label: "From an existing job", ready: false },
  { id: "similar", label: "Find similar to someone", ready: false },
]

/**
 * Starters. A blank prompt box is the hardest empty state in software, and a
 * mandate is a long sentence nobody wants to compose cold — so these are real
 * mandates for roles this prototype already has jobs for, not lorem.
 */
export const SUGGESTED_MANDATES = [
  "Staff platform engineer in Bengaluru, 9–14 years, has run Kafka and Kubernetes at scale in a payments company",
  "Engineering manager for payments, 7–11 years, has managed a team of 6+ and still reviews code",
  "Senior product designer, 6+ years, owns a design system end to end and has shipped mobile",
]

export type ChannelId = "post" | "search"

/**
 * The two ways a mandate reaches people. Both default on, either can be off —
 * a confidential search wants no public posting, and a role with a strong
 * inbound brand may want no outbound at all.
 */
export const CHANNELS: {
  id: ChannelId
  label: string
  icon: LucideIcon
  description: string
  /** What actually happens, said plainly. Posting spends money; sourcing does not. */
  consequence: string
}[] = [
  {
    id: "post",
    label: "Post a job",
    icon: MegaphoneIcon,
    description:
      "Advertise the role so candidates apply. Fills the post-a-job form from this mandate.",
    consequence: "Public, and spends one posting credit. You approve it first.",
  },
  {
    id: "search",
    label: "Search the database",
    icon: DatabaseIcon,
    description:
      "Find people who already match, whether or not they are looking.",
    consequence: "Nothing is public and nobody is contacted yet.",
  },
]

/**
 * Vocabulary the stub parser can recognise. Deliberately short: it exists to
 * make the demo respond to what you type, not to be a taxonomy.
 */
const SKILL_VOCAB = [
  "Kafka",
  "Kubernetes",
  "Go",
  "Java",
  "Python",
  "React",
  "AWS",
  "GCP",
  "Terraform",
  "Spark",
  "Airflow",
  "Postgres",
  "microservices",
  "distributed systems",
  "observability",
  "design systems",
  "Figma",
  "payments",
  "fintech",
  "B2B SaaS",
  "machine learning",
]

let criterionSeq = 0
export function newCriterion(text = ""): Criterion {
  criterionSeq += 1
  return { id: `c${criterionSeq}`, text }
}

/**
 * TODO(design): A STUB, ON PURPOSE.
 *
 * Keyword matching, not language understanding — it reads a years range, known
 * place names and a short skill vocabulary, and phrases the rest back as
 * criteria. It is here so the INTERACTION can be reviewed: does splitting a
 * mandate into hard filters and ranked criteria help a recruiter, and is the
 * confirmation step reassuring or annoying?
 *
 * Nothing downstream should grow to depend on the quality of this output. If
 * the real product has no parser behind it, this page becomes "fill the two
 * forms from one screen", which is still worth more than today's two visits.
 */
export function parseMandate(text: string): ParsedMandate {
  const trimmed = text.trim()

  const range = trimmed.match(
    /(\d{1,2})\s*(?:–|-|—|to)\s*(\d{1,2})\s*(?:\+)?\s*(?:years|yrs)/i
  )
  const open = trimmed.match(/(\d{1,2})\s*\+\s*(?:years|yrs)/i)

  const skills = SKILL_VOCAB.filter((skill) =>
    new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i").test(trimmed)
  )

  const locations = LOCATIONS.filter((location) =>
    new RegExp(`\\b${escapeRegExp(location)}\\b`, "i").test(trimmed)
  )

  return {
    // Everything up to the first qualifier reads as the role; the rest is what
    // you want it to be true of.
    title: titleCase(
      trimmed.split(/\s*[,.]|\s+(?:with|who|that|having|based)\b/i)[0] ?? ""
    ),
    filters: {
      minYears: range?.[1] ?? open?.[1] ?? "",
      maxYears: range?.[2] ?? "",
      locations,
      skills,
    },
    criteria: buildCriteria(trimmed, skills),
  }
}

/**
 * Criteria are phrased as statements about the candidate because that is how
 * they are evaluated and how they get read back on a result row — "Kafka — ran
 * a 40-broker cluster at Razorpay" only makes sense if the criterion was a
 * claim in the first place.
 *
 * SKILLS DO NOT BECOME CRITERIA. A named skill is a hard yes/no and belongs in
 * the filters; what belongs here is the part of the ask a checkbox never held —
 * "has run Kafka AT SCALE, in a payments company". Emitting both produced a
 * criteria list that restated its own filters.
 *
 * One criterion per comma clause, minus the role and the years, because that is
 * how people actually punctuate a mandate: role, seniority, then the things it
 * has to be true of.
 */
function buildCriteria(text: string, skills: string[]): Criterion[] {
  const clauses = text
    .split(",")
    .slice(1) // the first clause is the role, which is the title
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 12)
    // A bare "9–14 years" clause is already a filter.
    .filter(
      (clause) =>
        !/^\d{1,2}\s*(?:\+|–|-|—|to)?\s*\d{0,2}\s*(?:\+)?\s*(?:years|yrs)\b/i.test(
          clause
        )
    )

  if (clauses.length > 0) {
    return clauses.map((clause) =>
      newCriterion(`The candidate ${lowerFirst(stripTrailingStop(clause))}.`)
    )
  }

  // No qualitative clause to work with. Fall back to the skills so the list is
  // never empty — an empty criteria block reads as the parse having failed.
  if (skills.length > 0) {
    return skills.map((skill) =>
      newCriterion(`The candidate has hands-on experience with ${skill}.`)
    )
  }

  return [newCriterion(`The candidate is a good fit for: ${text}`)]
}

function stripTrailingStop(value: string) {
  return value.replace(/[.\s]+$/, "")
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function lowerFirst(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1)
}
