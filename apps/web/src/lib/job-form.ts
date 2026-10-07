import {
  describePosting,
  REMOTE,
  type PostingDraft,
  type Span,
} from "@/lib/job-intake"
import { INDUSTRIES } from "@/lib/taxonomy"

/**
 * What the post-a-job form holds, and how it reads a posting draft.
 *
 * Beside `components/job-form.tsx` rather than in it because a file that
 * exports components cannot also export functions under
 * `react-refresh/only-export-components` — the same split as
 * `lib/messages.ts` and `message-thread.tsx`.
 */

export const WORK_FROM_HOME = "Work from Home"

/** The live form's diversity-hiring options, in its own labels. */
export const DIVERSITY = [
  "Female Candidates",
  "Women Joining back the workforce",
  "Ex-defence personnel",
  "Differently-abled candidates",
  WORK_FROM_HOME,
]

export type Plan = "pro" | "basic"
export type Unit = "Lakhs" | "Crores"
export type Pay = {
  min: string | null
  minUnit: Unit
  max: string | null
  maxUnit: Unit
}

export type JobFormValue = {
  plan: Plan
  boost: boolean
  title: string
  locations: string[]
  xpMin: string
  xpMax: string
  skills: string[]
  description: string
  formatJd: boolean
  videoJd: string
  industries: string[]
  category: string | null
  area: string | null
  pay: Pay
  hideSalary: boolean
  batchMin: string | null
  batchMax: string | null
  courses: string[]
  questions: string[]
  videoProfile: boolean
  applyUrl: string
  diversity: string[]
  company: string
  hideCompany: boolean
  linkedIn: boolean
}

/**
 * The form, opened on a draft. Three of the chat's facts have no field on
 * the live form: good-to-have skills join the one skills list (after the
 * must-haves), a remote role is "Work from Home" under diversity hiring, and
 * team size and relocation live only in the description drafted here.
 */
export function formFrom(
  draft: PostingDraft,
  industries: string[] = [],
  /** A JD from the chat (`?jd=`), used as it is instead of drafting one. */
  description: string | null = null,
  /** Diversity-hiring options a JD in the chat asked for (`?div=`). */
  diversity: string[] = []
): JobFormValue {
  return {
    plan: "pro",
    boost: false,
    title: draft.title ?? "",
    locations: draft.locations.filter((city) => city !== REMOTE).slice(0, 3),
    xpMin: text(draft.experience?.min),
    xpMax: text(draft.experience?.max),
    skills: [...new Set([...draft.skills, ...draft.niceSkills])],
    description: description ?? (draft.title ? describePosting(draft) : ""),
    formatJd: true,
    videoJd: "",
    industries: industries
      .filter((industry) =>
        (INDUSTRIES as readonly string[]).includes(industry)
      )
      .slice(0, 5),
    category: null,
    area: null,
    pay: payFrom(draft.pay),
    hideSalary: false,
    batchMin: null,
    batchMax: null,
    courses: [],
    questions: draft.screening,
    videoProfile: false,
    applyUrl: "",
    diversity: DIVERSITY.filter(
      (option) =>
        diversity.includes(option) ||
        (option === WORK_FROM_HOME && draft.mode === "remote")
    ),
    company: "",
    hideCompany: false,
    linkedIn: true,
  }
}

/** The six posting fields as the form holds them — what a change compares. */
export function draftOf(value: JobFormValue): PostingDraft {
  return {
    title: value.title.trim() || null,
    locations: value.locations,
    experience: spanOf(value.xpMin, value.xpMax),
    pay: payOf(value.pay),
    skills: value.skills,
    mode: value.diversity.includes(WORK_FROM_HOME) ? "remote" : null,
    niceSkills: [],
    teamScale: null,
    relocationSupport: null,
    screening: value.questions.map((q) => q.trim()).filter(Boolean),
  }
}

// --- Values ------------------------------------------------------------------------

const text = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value)

/** Two selects read as one span of years. */
export function spanOf(min: string, max: string): Span | null {
  if (min === "" && max === "") return null
  return { min: Number(min || 0), max: max === "" ? null : Number(max) }
}

/** Lakhs a year, as the four selects hold it: a whole crore reads in crores. */
export function payFrom(span: Span | null): Pay {
  const side = (lakhs: number | null) => {
    if (lakhs === null || lakhs < 1)
      return { value: null, unit: "Lakhs" as Unit }
    if (lakhs >= 100 && lakhs % 100 === 0 && lakhs / 100 <= 99)
      return { value: String(lakhs / 100), unit: "Crores" as Unit }
    return {
      value: String(Math.min(99, Math.round(lakhs))),
      unit: "Lakhs" as Unit,
    }
  }
  const low = side(span?.min ?? null)
  const high = side(span?.max ?? null)
  return {
    min: low.value,
    minUnit: low.unit,
    max: high.value,
    maxUnit: high.unit,
  }
}

export function payOf(pay: Pay): Span | null {
  const lakhs = (value: string | null, unit: Unit) =>
    value === null ? null : Number(value) * (unit === "Crores" ? 100 : 1)
  const min = lakhs(pay.min, pay.minUnit)
  const max = lakhs(pay.max, pay.maxUnit)
  if (min === null && max === null) return null
  return { min: min ?? 0, max }
}

// --- What is still needed ---------------------------------------------------

export type Required =
  | "title"
  | "locations"
  | "experience"
  | "skills"
  | "description"
  | "industries"
  | "category"
  | "area"
  | "pay"
  | "batch"

export function missingIn(
  value: JobFormValue
): Partial<Record<Required, string>> {
  const missing: Partial<Record<Required, string>> = {}
  const pay = payOf(value.pay)
  if (!value.title.trim()) missing.title = "Add a job title."
  if (!value.locations.length) missing.locations = "Add at least one location."
  if (value.xpMin === "" || value.xpMax === "")
    missing.experience = "Pick the minimum and the maximum."
  else if (Number(value.xpMax) < Number(value.xpMin))
    missing.experience = "The maximum is below the minimum."
  if (!value.skills.length) missing.skills = "Add at least one skill."
  if (!value.description.trim()) missing.description = "Add a job description."
  if (!value.industries.length)
    missing.industries = "Add at least one industry."
  if (!value.category) missing.category = "Pick a category."
  if (!value.area) missing.area = "Pick a functional area."
  if (value.pay.min === null || value.pay.max === null)
    missing.pay = "Pick the minimum and the maximum."
  else if ((pay?.max ?? 0) < (pay?.min ?? 0))
    missing.pay = "The maximum is below the minimum."
  if (
    value.batchMin &&
    value.batchMax &&
    Number(value.batchMax) < Number(value.batchMin)
  )
    missing.batch = "The latest batch is before the earliest."
  return missing
}

/** Each required field as the form labels it — for "still needed" lists. */
export const REQUIRED_LABELS: Record<Required, string> = {
  title: "Job title",
  locations: "Location",
  experience: "Experience",
  skills: "Skills",
  description: "Description",
  industries: "Industry",
  category: "Category",
  area: "Functional area",
  pay: "Salary",
  batch: "Graduating year",
}

/** The required fields the form still needs, in the form's own words. */
export function stillNeeded(value: JobFormValue): string[] {
  return (Object.keys(missingIn(value)) as Required[]).map(
    (field) => REQUIRED_LABELS[field]
  )
}
