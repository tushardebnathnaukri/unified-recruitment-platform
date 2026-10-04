/**
 * Types for the AI Agent V2.3 port (`lib/ai-agent/`). The prototype was
 * untyped JavaScript; these describe the shapes its data and state actually
 * take, so the port keeps its behaviour and gains a compiler.
 */

export type RoleKey = "sales" | "hr" | "marketing" | "product"

/** The five working steps, in order (`ORDER_STEPS`). */
export type StepKey = "basic" | "jd" | "screen" | "addl" | "profiles"

/** Where a field's value came from — drawn as its source chip. */
export type SourceKey =
  | "you"
  | "inferred"
  | "data"
  | "answer"
  | "edited"
  | "account"
  | "needs"
  | "none"

export type QuestionOption = {
  label: string
  type: "salary" | "extra" | "nice" | "diversity" | "none" | "skip"
  value?: number | string | [number, number]
  log?: string
}

export type RoleQuestion = {
  id: string
  text: string
  options: QuestionOption[]
  answer?: string | null
}

export type Role = {
  fn: string
  title: string
  note: string
  voice: string
  alt: { t: string; m: number }[]
  exp: [number, number]
  median: number
  scale: number
  cities: { n: string; s: number }[]
  skills: string[]
  moreSkills: string[]
  category: string
  fa: string
  industry: string
  subIndustry: string
  domain: string
  subDomain: string
  summary: string
  must: { t: string; q: string }[]
  nice: string[]
  deal: string[]
  extras: {
    team: string
    reports: string
    hire: string
    notice: string
    travel: string
  }
  resp: string[]
  roleQ: RoleQuestion
}

export type VoiceEffect =
  | { type: "must"; t: string; q: string }
  | { type: "addl"; label: string; v: string }
  | { type: "deal"; v: string }
  | { type: "nice"; v: string }

export type VoiceNote = { text: string; fx: VoiceEffect[] }

/** The role's form: what the posting and the pool are computed from. */
export type AgentForm = {
  title: string
  company: string
  confidential: boolean
  locations: string[]
  expMin: number
  expMax: number
  salMin: number | null
  salMax: number | null
  hideSalary: boolean
  skills: string[]
  batchMin: string
  batchMax: string
  course: string[]
  diversity: string[]
  video: boolean
  coSubs: string[]
  cos: string[]
  insts: string[]
}

/** What `poolFor` reads — a full form, or the bare "potential" one. */
export type PoolForm = Pick<
  AgentForm,
  | "locations"
  | "expMin"
  | "expMax"
  | "salMax"
  | "batchMin"
  | "batchMax"
  | "course"
  | "diversity"
  | "video"
  | "skills"
> &
  Partial<Pick<AgentForm, "coSubs" | "cos" | "insts">>

/** Must / good-to-have per criterion key, plus the counts `poolFor` uses. */
export type Buckets = Record<string, "must" | "good"> & {
  _on?: boolean
  _mustN?: number
  _dealN?: number
}

export type ScreeningItem = { t: string; key: string; on: boolean }

export type InstituteList = { name: string; insts: string[] }
export type CompanyList = { name: string; subs: string[]; cos: string[] }
export type PastPrefs = { coSubs?: string[]; cos?: string[]; insts?: string[] }
