import type { Brand } from "@workspace/ui/lib/brands"

import {
  COMPANY_INDUSTRIES,
  INDUSTRY_TAGS,
  companiesFor,
  schoolsFor,
} from "@/lib/applicants"
import { criteriaFrom, searchHref } from "@/lib/database"
import { INSTITUTE_GROUPS, writeRange } from "@/lib/database-filters"
import {
  advanceIntake,
  filled,
  notedFrom,
  isSkip,
  nextQuestion,
  payLabel,
  readDescription,
  readPay,
  remainingFields,
  REMOTE,
  SKIP_LABEL,
  titleCase,
  yearsLabel,
  type AskedItem,
  type FieldId,
  type IntakeState,
  type Noted,
  type PostingDraft,
} from "@/lib/job-intake"
import { advanceStart } from "@/lib/job-start"

/**
 * Refinement — the questions between "that's the posting" and posting it.
 *
 * THE POSTING SAYS WHO SHOULD APPLY; THIS SAYS WHO TO GO AND FIND. Six fields
 * make a job ad. They do not make a search: "Head of Finance in Mumbai" is a
 * thousand people, and the recruiter knows things that cut it to fifty — the
 * industries that count, that a Financial Controller would do, that someone
 * moving from Pune is fine, that job-hoppers are not. Almost none of that
 * belongs on a public posting, so it lands in a PRIVATE BRIEF that drives
 * Search Resume, and only three answers cross back onto the posting (which
 * skills are a plus, the team size, relocation support).
 *
 * NINE TOPICS, FOUR ASKED. Asked in full this is a questionnaire, and a
 * questionnaire is what the chat was meant to replace. `planFor` picks at most
 * `REFINE_CAP` that apply to this role — Gemini proposes, the page checks
 * eligibility and fixes the order — and "Skip, post it now" is on every one.
 *
 * WITHOUT A MODEL, ONLY WHAT A TAP CAN ANSWER. "Anyone you'd rule out?" and
 * "would a neighbouring role do?" are free text and need judgement to read; a
 * regex reading them would record nonsense. So when the rules plan, those two
 * are left out rather than asked badly.
 *
 * IT WILL NOT SCREEN ON WHO SOMEONE IS. Age, gender, family, religion, caste,
 * disability and their stand-ins (graduation year, career gaps) are refused
 * wherever they appear — the server prompt says so, and `protectedIn` below
 * drops them from anything recorded, whoever wrote it.
 */

export type RefineId =
  | "skillsSplit"
  | "adjacent"
  | "relocation"
  | "industry"
  | "scale"
  | "targets"
  | "college"
  | "budget"
  | "exclusions"

/**
 * THE ASKING ORDER, AND WHY. What finishes the posting first (which skills are
 * must-haves), then the two biggest ways to widen the pool (neighbouring
 * roles, people who would move), then the ways to narrow it (industry, scale,
 * where they come from, where they studied), then money, and the private,
 * sensitive one last — by then it is clear what kind of screening this is.
 */
export const REFINE_ORDER: RefineId[] = [
  "skillsSplit",
  "adjacent",
  "relocation",
  "industry",
  "scale",
  "targets",
  "college",
  "budget",
  "exclusions",
]

export const REFINE_CAP = 4

/** Free text that takes judgement to read — asked only when Gemini reads. */
const NEEDS_MODEL: RefineId[] = ["adjacent", "exclusions"]

export type HiringBrief = {
  /** Neighbouring titles that would also do. */
  adjacentTitles: string[]
  /** People who would move to the posting's city count, not only locals. */
  openToMovers: boolean | null
  /** Canonical industry names, as the refine panel's `ind` holds them. */
  industries: string[]
  /** Must have led a team (`team=yes`), or explicitly need not have. */
  ledTeam: boolean | null
  /** Where they would ideally come from. Any company, known to the pool or not. */
  targetCompanies: string[]
  /** Institute groups or schools — a preference, never a filter. */
  institutes: string[]
  /** Whether the pay ceiling bends, and how far. */
  budget: { firm: boolean; upTo: number | null } | null
  /** Who to rule out, in words. Private; screened for protected traits. */
  exclusions: string[]
}

export const POST_NOW = "Skip, post it now"

// --- Vocabulary ---------------------------------------------------------------

const unique = <T>(values: T[]) => [...new Set(values)]

/** The industries this product's candidates come from — what `ind` can hold. */
export function industriesFor(brand: Brand) {
  return unique(
    companiesFor(brand)
      .map((company) => COMPANY_INDUSTRIES[company])
      .filter((industry): industry is string => Boolean(industry))
  )
}

export const industryLabel = (industry: string) =>
  INDUSTRY_TAGS[industry] ?? industry

/**
 * The two answers the institutes question offers. PREMIUM IS KEPT AS ONE
 * VALUE on the brief rather than expanded into schools, so the brief, the rail
 * and the search's criterion all say "premium" — which is what was asked.
 */
export const PREMIUM_INSTITUTES = "Premium institutes"
export const ALL_INSTITUTES = "All institutes"

/** "Premium", then the groups with somebody in this pool, then the schools. */
export function institutesFor(brand: Brand) {
  const schools = schoolsFor(brand)
  const groups = Object.keys(INSTITUTE_GROUPS).filter((group) =>
    schools.some((school) => school.startsWith(INSTITUTE_GROUPS[group]))
  )
  return [PREMIUM_INSTITUTES, ...groups, ...schools]
}

/**
 * An answer to the institutes question: the institutes to prefer, an empty
 * list for no preference, or null when it could not be read. Premium or all
 * is the whole question; a school typed into "Something else" still counts.
 */
export function readInstitutes(answer: string, brand: Brand): string[] | null {
  if (/\b(premium|premier|top|tier.?1|elite|best)\b/i.test(answer))
    return [PREMIUM_INSTITUTES]
  if (
    /\ball\b|no preference|\bany\b|doesn'?t matter/i.test(answer) ||
    NO.test(answer.trim())
  )
    return []
  const institutes = named(answer, institutesFor(brand))
  return institutes.length ? institutes : null
}

// --- The guardrail ------------------------------------------------------------

/**
 * Words that mean a person is being screened for who they are, not what they
 * have done. A BACKSTOP, NOT THE POLICY: the server prompt tells Gemini to
 * refuse these, and this catches the plain cases whoever let them through —
 * including the rules, which would otherwise record "no women" verbatim.
 * Deliberately literal. "Over 40" is left to the model, because "over 40
 * people managed" is a real requirement and a regex cannot tell.
 */
const PROTECTED: [RegExp, string][] = [
  [
    /\b(ages?|aged|years? old|young(er|sters?)?|born (in|before|after)|batch(es)? (of|before|after)|graduated (before|after|in))\b/i,
    "age",
  ],
  [/\b(male|female|men|women|woman|gender|girls?|boys?|ladies)\b/i, "gender"],
  [
    /\b(married|unmarried|marital|spouse|kids|children|pregnan\w*|maternity|mothers?)\b/i,
    "family",
  ],
  [
    /\b(religion|religious|hindu|muslim|christian|sikh|jain|caste|community)\b/i,
    "religion or caste",
  ],
  [/\b(disab\w*|handicap\w*)\b/i, "disability"],
  [
    /\b(career gaps?|gaps? in (their )?(career|cv|resume|employment)|career breaks?)\b/i,
    "career gaps",
  ],
]

export function protectedIn(text: string): string | null {
  return PROTECTED.find(([pattern]) => pattern.test(text))?.[1] ?? null
}

/** What was refused, said back — once, not as a lecture. */
export function refusalFor(kinds: string[]) {
  const list = unique(kinds)
  const said =
    list.length > 1
      ? `${list.slice(0, -1).join(", ")} or ${list[list.length - 1]}`
      : list[0]
  return `I've left out anything about ${said} — I can't screen on that.`
}

// --- The plan -------------------------------------------------------------------

/** Whether a topic means anything for this draft. */
function eligible(topic: RefineId, draft: PostingDraft) {
  if (topic === "skillsSplit") return draft.skills.length >= 2
  if (topic === "relocation")
    return (
      draft.mode !== "remote" && draft.locations.some((city) => city !== REMOTE)
    )
  if (topic === "budget") return draft.pay !== null && draft.pay.max !== null
  return true
}

/**
 * Which topics this posting gets.
 *
 * Gemini's picks when it made them and they are usable — filtered to what is
 * eligible, capped, and put back into `REFINE_ORDER`, so the model decides
 * WHICH and the page decides WHEN. Otherwise the first four eligible topics
 * the rules can read.
 */
export function planFor(
  draft: PostingDraft,
  suggested: unknown,
  { model }: { model: boolean }
): RefineId[] {
  const allowed = REFINE_ORDER.filter(
    (topic) => eligible(topic, draft) && (model || !NEEDS_MODEL.includes(topic))
  )
  const picked = Array.isArray(suggested)
    ? unique(
        suggested.filter((topic): topic is RefineId =>
          allowed.includes(topic as RefineId)
        )
      ).slice(0, REFINE_CAP)
    : []
  const chosen = picked.length ? picked : allowed.slice(0, REFINE_CAP)
  return REFINE_ORDER.filter((topic) => chosen.includes(topic))
}

function nextTopic(plan: RefineId[], settled: RefineId[]) {
  return plan.find((topic) => !settled.includes(topic)) ?? null
}

/** The posting is complete: move to refinement, or straight to done. */
/**
 * Topics the conversation has already answered without being asked — an
 * industry in the opening sentence, a team size in a JD. They leave the plan,
 * so refinement never asks for something the recruiter has already said.
 */
export function coveredTopics(state: IntakeState): RefineId[] {
  const { brief, draft } = state
  const covered: [RefineId, boolean][] = [
    ["skillsSplit", draft.niceSkills.length > 0],
    ["adjacent", brief.adjacentTitles.length > 0],
    ["relocation", brief.openToMovers !== null],
    ["industry", brief.industries.length > 0],
    ["scale", brief.ledTeam !== null || draft.teamScale !== null],
    ["targets", brief.targetCompanies.length > 0],
    ["college", brief.institutes.length > 0],
    ["budget", brief.budget !== null],
    ["exclusions", brief.exclusions.length > 0],
  ]
  return covered.filter(([, yes]) => yes).map(([topic]) => topic)
}

export function enterRefine(
  state: IntakeState,
  suggested: unknown,
  { model }: { model: boolean }
): IntakeState {
  const covered = coveredTopics(state)
  const plan = planFor(state.draft, suggested, { model }).filter(
    (topic) => !covered.includes(topic)
  )
  const asking = plan[0] ?? null
  return {
    ...state,
    stage: asking ? "refine" : "done",
    plan,
    settled: [],
    asking,
    missed: false,
  }
}

// --- The questions --------------------------------------------------------------

type Change = {
  draft?: Partial<PostingDraft>
  brief?: Partial<HiringBrief>
  /** Said back instead of the change, for answers that change nothing ("No"). */
  said?: string
}

type RefineQuestion = {
  id: RefineId
  ask: (draft: PostingDraft) => string
  hint: string
  options: (draft: PostingDraft, brand: Brand) => string[]
  /** Checkboxes: more than one answer is one answer. */
  multiple?: boolean
  read: (answer: string, draft: PostingDraft, brand: Brand) => Change | null
}

const cityOf = (draft: PostingDraft) =>
  draft.locations.find((city) => city !== REMOTE) ?? "the city"

const NO = /^(no|nope|nah|none|nobody|only|not really|just)\b/i
const YES = /^(yes|yeah|yep|sure|ok|okay|definitely|absolutely|of course)\b/i

function listOf(text: string) {
  return text
    .split(/,|\band\b|\/|&|;/i)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Names from `vocabulary` that the answer mentions, in the vocabulary's spelling. */
function named(
  answer: string,
  vocabulary: string[],
  labels?: (v: string) => string
) {
  const text = answer.toLowerCase()
  return vocabulary.filter((entry) => {
    const words = [entry, labels?.(entry)].filter(Boolean) as string[]
    return words.some((word) => text.includes(word.toLowerCase()))
  })
}

const round = (n: number) => Math.round(n / 5) * 5

const QUESTIONS: RefineQuestion[] = [
  {
    id: "skillsSplit",
    ask: () => "Which of these are must-haves? The rest become good-to-haves.",
    hint: "Must-haves decide who is shortlisted; good-to-haves only rank them.",
    // Every listed skill as a checkbox — tick the must-haves. The chat had a
    // chip for "all" and for the first two; a list of ticks says it directly.
    options: (draft) => draft.skills,
    multiple: true,
    read: (answer, draft) => {
      if (/^all\b/i.test(answer.trim())) {
        return { said: "Got it — all of them are must-haves." }
      }
      const must = named(answer, draft.skills)
      if (!must.length) return null
      if (must.length === draft.skills.length)
        return { said: "Got it — all of them are must-haves." }
      const nice = draft.skills.filter((skill) => !must.includes(skill))
      return {
        draft: {
          skills: must,
          niceSkills: unique([...draft.niceSkills, ...nice]),
        },
      }
    },
  },
  {
    id: "adjacent",
    ask: (draft) =>
      `Would someone from a neighbouring role work — not only a ${draft.title ?? "match on the title"}?`,
    hint: "The biggest single way to widen the pool.",
    multiple: true,
    // The rules cannot know a role's neighbours; only Gemini offers them.
    options: () => [],
    read: (answer) => {
      if (NO.test(answer.trim())) return { said: "Only this title, then." }
      const titles = listOf(answer).map(titleCase).slice(0, 6)
      return titles.length ? { brief: { adjacentTitles: titles } } : null
    },
  },
  {
    id: "relocation",
    ask: (draft) => `Open to people who'd move to ${cityOf(draft)} for this?`,
    hint: "People who would move there count, not only people already there.",
    options: (draft) => [
      "Yes, and we'll support the move",
      "Yes, but no relocation support",
      `No, only people in ${cityOf(draft)}`,
    ],
    read: (answer) => {
      const text = answer.trim()
      if (NO.test(text)) return { brief: { openToMovers: false } }
      if (!YES.test(text) && !/\b(open|fine|happy|move|relocat)/i.test(text))
        return null
      const refused =
        /\b(no|without|not)\b.{0,20}\b(support|help|package)/i.test(text)
      const offered =
        !refused && /\b(support|help|package|assist|cover|pay for)/i.test(text)
      return {
        brief: { openToMovers: true },
        draft: { relocationSupport: offered ? true : refused ? false : null },
      }
    },
  },
  {
    id: "industry",
    ask: () => "Should they come from a particular industry?",
    hint: "Where they did the work, rather than what the work was.",
    // No "Any industry" option: Skip says that, and a checkbox that means
    // "none of these" beside four that mean "this one" is a trap.
    options: (_, brand) => industriesFor(brand).slice(0, 6).map(industryLabel),
    multiple: true,
    read: (answer, _, brand) => {
      if (/\bany\b/i.test(answer)) return { said: "Any industry, then." }
      const industries = named(answer, industriesFor(brand), industryLabel)
      return industries.length ? { brief: { industries } } : null
    },
  },
  {
    id: "scale",
    ask: () => "Will they lead a team — and roughly how big?",
    hint: "Goes on the posting, and finds people who have led one.",
    options: () => [
      "Yes, a team of up to 10",
      "Yes, a team of 10+",
      "No — an individual contributor",
    ],
    read: (answer) => {
      const text = answer.trim()
      if (NO.test(text) || /individual contributor|\bic\b/i.test(text)) {
        return {
          brief: { ledTeam: false },
          said: "Got it — an individual contributor.",
        }
      }
      const size = /(up to\s*\d+|\d+\s*\+|\d+(\s*(-|–|to)\s*\d+)?)/i.exec(text)
      if (!size && !YES.test(text)) return null
      return {
        brief: { ledTeam: true },
        draft: {
          teamScale: size
            ? `Leads a team of ${size[0].trim()}`
            : "Leads a team",
        },
      }
    },
  },
  {
    id: "targets",
    ask: () => "Anywhere they should ideally come from?",
    hint: "Where to look first — anyone else can still apply.",
    multiple: true,
    options: (_, brand) => companiesFor(brand).slice(0, 5),
    read: (answer, _, brand) => {
      if (NO.test(answer.trim()))
        return { said: "No particular companies, then." }
      const known = companiesFor(brand)
      const companies = listOf(answer).map(
        (name) =>
          known.find(
            (company) => company.toLowerCase() === name.toLowerCase()
          ) ?? name
      )
      return companies.length ? { brief: { targetCompanies: companies } } : null
    },
  },
  {
    id: "college",
    ask: () => "Only people from premium institutes, or all?",
    hint: "Premium means the IITs, IIMs, ISB, XLRI, BITS and the like. A preference, not a requirement — it ranks people, it rules nobody out.",
    options: () => [PREMIUM_INSTITUTES, ALL_INSTITUTES],
    read: (answer, _, brand) => {
      const institutes = readInstitutes(answer, brand)
      if (!institutes) return null
      return institutes.length
        ? { brief: { institutes } }
        : { said: "No institute preference, then." }
    },
  },
  {
    id: "budget",
    ask: (draft) =>
      `Is ${draft.pay ? payLabel(draft.pay).replace(/ a year$/, "") : "that"} firm, or is there stretch for the right person?`,
    hint: "Decides whether to show people asking a little more.",
    options: (draft) => {
      const max = draft.pay?.max ?? 0
      return unique([
        "Firm",
        `Up to ₹${round(max * 1.1)}L`,
        `Up to ₹${round(max * 1.2)}L`,
      ])
    },
    read: (answer, draft) => {
      if (/\b(firm|fixed|strict|no stretch|hard cap)\b/i.test(answer))
        return { brief: { budget: { firm: true, upTo: null } } }
      const pay = readPay(answer, { bare: true })
      const upTo = pay?.span.max ?? pay?.span.min ?? null
      if (upTo === null || (draft.pay?.max && upTo < draft.pay.max)) return null
      return { brief: { budget: { firm: false, upTo } } }
    },
  },
  {
    id: "exclusions",
    ask: () => "Anyone you'd rule out?",
    hint: "Kept private — it screens, it never goes on the posting.",
    options: () => [],
    read: (answer) => {
      if (NO.test(answer.trim())) return { said: "Nobody ruled out, then." }
      return { brief: { exclusions: [answer.trim()] } }
    },
  },
]

const questionOf = (topic: RefineId) =>
  QUESTIONS.find((question) => question.id === topic)!

/** A topic's question in the rules' words, for the page and for the model. */
export function refineAsk(topic: RefineId, draft: PostingDraft) {
  return questionOf(topic).ask(draft)
}

/** Refinement topics still to ask, in asking order. */
export function pendingTopics(state: IntakeState) {
  return state.plan.filter((topic) => !state.settled.includes(topic))
}

/** A refinement topic as a questionnaire item — the model's words if it gave any. */
export function refineItem(
  topic: RefineId,
  state: IntakeState,
  brand: Brand
): AskedItem {
  const question = questionOf(topic)
  // WHERE A TICK HAS A FIXED MEANING, THE WORDS ARE THE PAGE'S. Ticking under
  // the skills split means "must-have", because that is how the answer is
  // read — and Gemini, left to phrase it, asked "are all of these must-haves,
  // or are some nice-to-have?", which a tick cannot answer. It phrased it
  // clearly on the next run, which is the problem: it varies.
  // Institutes are the same: two fixed answers, and Gemini offered a list of
  // five schools instead.
  const phrasing =
    topic === "skillsSplit" || topic === "college"
      ? undefined
      : state.phrasings?.[topic]
  return {
    id: topic,
    prompt: phrasing?.ask || question.ask(state.draft),
    hint: phrasing?.hint || question.hint,
    options: phrasing?.options.length
      ? phrasing.options
      : question.options(state.draft, brand).filter(Boolean),
    multiple: question.multiple ?? false,
    // All refinement is optional: every item can be skipped.
    required: false,
    note: state.unread?.includes(topic)
      ? "I couldn't use that last time — try again, or skip it."
      : undefined,
  }
}

/** What each question is called in the recruiter's answer bubble. */
export const LABELS: Record<FieldId | RefineId | "start" | "base", string> = {
  start: "Start",
  base: "Based on",
  title: "Role",
  locations: "Location",
  experience: "Experience",
  skills: "Skills",
  pay: "Pay",
  mode: "Work mode",
  skillsSplit: "Must-haves",
  adjacent: "Neighbouring roles",
  relocation: "Relocation",
  industry: "Industry",
  scale: "Team",
  targets: "Look first at",
  college: "Institutes",
  budget: "Budget",
  exclusions: "Rule out",
}

// --- A questionnaire's answers, as one turn ---------------------------------

/**
 * A submitted questionnaire is ONE TURN IN `?ask=`, so the transcript is still
 * the URL: the answers are written into the prompt as JSON behind a marker,
 * and the page draws them as a list rather than printing the JSON. `null` is
 * a question skipped on purpose; a question the recruiter never reached is
 * absent. Each answer is text — several ticks are joined with commas, which is
 * what the readers already split on.
 */
const ANSWERS = "Answers: "

export type Answers = Record<string, string | null>

export function encodeAnswers(answers: Answers) {
  return `${ANSWERS}${JSON.stringify(answers)}`
}

export function decodeAnswers(prompt: string): Answers | null {
  if (!prompt.startsWith(ANSWERS)) return null
  try {
    const value: unknown = JSON.parse(prompt.slice(ANSWERS.length))
    if (!value || typeof value !== "object" || Array.isArray(value)) return null
    const answers: Answers = {}
    for (const [key, answer] of Object.entries(value)) {
      if (typeof answer === "string" || answer === null) answers[key] = answer
    }
    return answers
  } catch {
    return null
  }
}

// --- Reading an answer, by the rules --------------------------------------------

/** What a refinement answer changed, as rows — labelled as the brief is. */
export function refineNoted(
  before: IntakeState,
  draft: PostingDraft,
  brief: HiringBrief
): Noted {
  const rows: Noted = []
  const changed = <K extends keyof HiringBrief>(key: K) =>
    JSON.stringify(brief[key]) !== JSON.stringify(before.brief[key])

  if (
    JSON.stringify(draft.niceSkills) !== JSON.stringify(before.draft.niceSkills)
  ) {
    rows.push({ label: "Must have", value: draft.skills.join(", ") })
    rows.push({ label: "Good to have", value: draft.niceSkills.join(", ") })
  }
  if (changed("adjacentTitles") && brief.adjacentTitles.length)
    rows.push({
      label: "Also consider",
      value: brief.adjacentTitles.join(", "),
    })
  if (changed("openToMovers"))
    rows.push({
      label: "Relocation",
      value: brief.openToMovers
        ? `Open to people who'd move${draft.relocationSupport ? ", relocation supported" : ""}`
        : "Only people already there",
    })
  if (changed("industries") && brief.industries.length)
    rows.push({
      label: "Industry",
      value: brief.industries.map(industryLabel).join(", "),
    })
  if (draft.teamScale !== before.draft.teamScale && draft.teamScale)
    rows.push({ label: "Team", value: draft.teamScale })
  if (changed("targetCompanies") && brief.targetCompanies.length)
    rows.push({
      label: "Look first at",
      value: brief.targetCompanies.join(", "),
    })
  if (changed("institutes") && brief.institutes.length)
    rows.push({ label: "Prefer", value: brief.institutes.join(", ") })
  if (changed("budget") && brief.budget)
    rows.push({
      label: "Budget",
      value: brief.budget.firm
        ? "Firm"
        : `Can stretch to ₹${brief.budget.upTo}L for the right person`,
    })
  if (changed("exclusions") && brief.exclusions.length)
    rows.push({ label: "Rule out", value: brief.exclusions.join("; ") })

  return rows
}

/** Every recorded exclusion, with anything protected taken out. */
export function screenExclusions(exclusions: string[]) {
  const refused: string[] = []
  const kept = exclusions.filter((exclusion) => {
    const kind = protectedIn(exclusion)
    if (kind) refused.push(kind)
    return !kind
  })
  return { kept, refused }
}

function finish(state: IntakeState, heard: string | null): IntakeState {
  return {
    ...state,
    stage: "done",
    settled: unique([...state.settled, ...state.plan]),
    asking: null,
    heard,
    missed: false,
    phrasings: undefined,
  }
}

function advanceRefine(
  state: IntakeState,
  answer: string,
  brand: Brand
): IntakeState {
  const topic = state.asking as RefineId
  const ruled = {
    engine: "rules" as const,
    phrasings: undefined,
    fallback: undefined,
  }

  if (answer.trim() === POST_NOW) return { ...finish(state, null), ...ruled }

  const next = (
    settled: RefineId[],
    rest: Partial<IntakeState>
  ): IntakeState => {
    const asking = nextTopic(state.plan, settled)
    return {
      ...state,
      ...rest,
      ...ruled,
      settled,
      asking,
      stage: asking ? "refine" : "done",
    }
  }

  if (isSkip(answer)) {
    return next([...state.settled, topic], {
      heard: "Skipped, then.",
      missed: false,
    })
  }

  // Refused before it is read, so a protected trait is never recorded even
  // for a moment — whichever question it was typed under. Under "rule out"
  // the question is then settled rather than asked again: pressing for a
  // rephrasing of a discriminatory ask is the wrong thing to do. Anywhere
  // else it is asked again, because the rest of the answer may be needed.
  const kind = protectedIn(answer)
  if (kind) {
    return topic === "exclusions"
      ? next([...state.settled, topic], {
          heard: refusalFor([kind]),
          missed: false,
        })
      : { ...state, ...ruled, heard: refusalFor([kind]), missed: true }
  }

  const change = questionOf(topic).read(answer, state.draft, brand)
  if (!change) return { ...state, ...ruled, heard: null, missed: true }

  const draft = { ...state.draft, ...change.draft }
  const brief = { ...state.brief, ...change.brief }
  return next([...state.settled, topic], {
    draft,
    brief,
    heard: change.said ?? null,
    missed: false,
  })
}

/** What a turn carries: typed text, an attached document, or a questionnaire. */
export type IntakeInput =
  { text: string; document?: boolean } | { answers: Answers }

/**
 * One turn, by the rules, whichever stage it is in.
 *
 * A questionnaire is read ITEM BY ITEM with the reader each question already
 * has, in asking order, so an answer to "where" is read as a city and one to
 * "pay" as lakhs — the same readers the one-question chat used. An answer
 * none of them can read is kept in `unread` and asked again in the next
 * questionnaire with a note, instead of being guessed at.
 *
 * Typed text while a questionnaire is up is an answer too: in the posting
 * stage it is read like a description (it may cover several questions at
 * once); in refinement it answers the first open topic.
 */
export function advance(
  state: IntakeState,
  given: IntakeInput,
  brand: Brand
): IntakeState {
  // How the posting starts comes first, and is never a model's to read.
  const start = advanceStart({ ...state, noted: undefined }, given, brand)
  if (start.done) return start.state
  return advanceRead(start.state, start.input, brand)
}

function advanceRead(
  state: IntakeState,
  input: IntakeInput,
  brand: Brand
): IntakeState {
  const ruled = {
    engine: "rules" as const,
    phrasings: undefined,
    fallback: undefined,
  }
  const before = state

  if (state.stage === "posting") {
    let next: IntakeState = { ...state, opener: false }
    const unread: string[] = []

    if ("answers" in input) {
      for (const id of remainingFields(state.draft, state.skipped)) {
        if (!(id in input.answers)) continue
        const value = input.answers[id]
        next = advanceIntake(
          { ...next, asking: id },
          value === null ? SKIP_LABEL : value,
          brand
        )
        if (value !== null && !filled(next.draft, id)) unread.push(id)
      }
    } else if (state.opener || input.document) {
      next = {
        ...advanceIntake(state, input.text, brand, input),
        opener: false,
      }
    } else {
      // Typed beside an open questionnaire: read like a description, into
      // whatever it covers; if it covers nothing, as the first open question.
      const read = readDescription(input.text, brand)
      const draft = { ...next.draft }
      for (const [key, value] of Object.entries(read)) {
        if (!filled(draft, key as FieldId))
          Object.assign(draft, { [key]: value })
      }
      next = { ...next, draft }
      const first = remainingFields(state.draft, state.skipped)[0]
      if (first && JSON.stringify(draft) === JSON.stringify(state.draft)) {
        next = advanceIntake({ ...next, asking: first }, input.text, brand)
        if (!filled(next.draft, first)) unread.push(first)
      }
    }

    // The opener asks for an industry, which is a refinement topic rather
    // than a posting field: named in any posting-stage text, it is recorded
    // on the brief, and refinement will not ask for it again.
    const typed =
      "text" in input
        ? input.text
        : Object.values(input.answers).filter(Boolean).join(" ")
    if (!next.brief.industries.length && typed) {
      const industries = named(typed, industriesFor(brand), industryLabel)
      if (industries.length)
        next = { ...next, brief: { ...next.brief, industries } }
    }

    const changed: Partial<PostingDraft> = {}
    for (const id of FIELD_IDS) {
      if (JSON.stringify(next.draft[id]) !== JSON.stringify(before.draft[id]))
        Object.assign(changed, { [id]: next.draft[id] })
    }
    const newIndustries =
      next.brief.industries.length && !before.brief.industries.length
        ? next.brief.industries.map(industryLabel).join(", ")
        : null
    const asking = nextQuestion(next.draft, next.skipped)
    next = {
      ...next,
      ...ruled,
      asking,
      unread,
      missed: false,
      heard: null,
      noted: [
        ...notedFrom(changed),
        ...(newIndustries ? [{ label: "Industry", value: newIndustries }] : []),
      ],
    }
    return asking === null ? enterRefine(next, null, { model: false }) : next
  }

  if (state.stage === "refine") {
    let next: IntakeState = state
    const unread: string[] = []
    const refused: string[] = []
    const entries: [RefineId, string | null][] =
      "answers" in input
        ? pendingTopics(state)
            .filter((topic) => topic in input.answers)
            .map((topic) => [topic, input.answers[topic]])
        : [[pendingTopics(state)[0], input.text]]

    for (const [topic, value] of entries) {
      if (!topic) continue
      const kind = value ? protectedIn(value) : null
      if (kind) refused.push(kind)
      next = advanceRefine(
        { ...next, asking: topic },
        value === null ? SKIP_LABEL : value,
        brand
      )
      if (next.missed) unread.push(topic)
    }

    const asking = nextTopic(next.plan, next.settled)
    return {
      ...next,
      ...ruled,
      stage: asking ? "refine" : "done",
      asking,
      unread,
      missed: false,
      heard: refused.length ? refusalFor(refused) : null,
      noted: refineNoted(before, next.draft, next.brief),
    }
  }

  return state
}

const FIELD_IDS: FieldId[] = [
  "title",
  "locations",
  "experience",
  "skills",
  "pay",
  "mode",
]

// --- What it produces -----------------------------------------------------------

/** The private brief as rows — only what was said, nothing defaulted. */
export function briefRows(state: IntakeState) {
  const { brief, draft } = state
  const rows: { label: string; value: string }[] = []
  if (brief.adjacentTitles.length)
    rows.push({
      label: "Also consider",
      value: brief.adjacentTitles.join(", "),
    })
  if (brief.openToMovers !== null)
    rows.push({
      label: "Location",
      value: brief.openToMovers
        ? `In ${cityOf(draft)}, or willing to move there`
        : `Already in ${cityOf(draft)}`,
    })
  if (brief.industries.length)
    rows.push({ label: "Industry", value: brief.industries.join(", ") })
  if (brief.ledTeam !== null)
    rows.push({
      label: "Has led a team",
      value: brief.ledTeam ? "Required" : "Not needed",
    })
  if (brief.targetCompanies.length)
    rows.push({
      label: "Look first at",
      value: brief.targetCompanies.join(", "),
    })
  if (brief.institutes.length)
    rows.push({ label: "Prefer", value: brief.institutes.join(", ") })
  if (brief.budget)
    rows.push({
      label: "Budget",
      value: brief.budget.firm
        ? "Firm"
        : `Can stretch to ₹${brief.budget.upTo}L`,
    })
  if (brief.exclusions.length)
    rows.push({ label: "Rule out", value: brief.exclusions.join("; ") })
  return rows
}

/**
 * Search Resume, opened on the brief.
 *
 * WHAT CAN BE A FILTER IS ONE; WHAT IS A PREFERENCE IS A CRITERION. Industry,
 * a team, a budget and "people who would move" all remove people, so they
 * land on the refine panel's own keys. Skills, institutes and exclusions are
 * things to weigh, so they become Juicebox criteria (`crit`), which rank and
 * highlight and remove nobody — the only honest home for "prefer IIMs".
 * Target companies go to `org` only when the pool knows them; a company it
 * has never dealt would filter the list to no one.
 */
export function searchHrefFor(state: IntakeState, brand: Brand) {
  const { draft, brief } = state
  const city = draft.locations.find((place) => place !== REMOTE)
  const movers = brief.openToMovers === true

  const titles = [draft.title, ...brief.adjacentTitles].filter(Boolean)
  // Where the city goes into the TEXT, the search reads it as the current
  // location; people who would move are asked for by preference instead.
  const query = [
    titles.join(" or "),
    city && !movers ? `in ${city}` : null,
    draft.experience ? yearsLabel(draft.experience) : null,
  ]
    .filter(Boolean)
    .join(", ")

  const params = new URLSearchParams(
    searchHref({ query, mode: "natural" }).split("?")[1] ?? ""
  )

  if (city && movers) {
    const spelled = criteriaFrom(city).location
    if (spelled) params.append("pref", spelled)
  }
  for (const industry of brief.industries) params.append("ind", industry)
  if (brief.ledTeam) params.set("team", "yes")
  const known = companiesFor(brand)
  for (const company of brief.targetCompanies) {
    if (known.includes(company)) params.append("org", company)
  }
  const ceiling =
    brief.budget?.upTo ?? (brief.budget?.firm ? draft.pay?.max : null)
  if (ceiling) params.set("ectc", writeRange(null, ceiling)!)

  for (const skill of draft.skills) params.append("crit", `Has ${skill}`)
  for (const skill of draft.niceSkills)
    params.append("crit", `Ideally has ${skill}`)
  for (const institute of brief.institutes)
    params.append(
      "crit",
      institute === PREMIUM_INSTITUTES
        ? "Studied at a premium institute"
        : `Studied at ${institute}`
    )
  for (const exclusion of brief.exclusions)
    params.append("crit", `Not: ${exclusion}`)

  return `/database?${params.toString()}`
}

/** Target companies the pool has never dealt — named on the card, not filtered. */
export function unknownCompanies(state: IntakeState, brand: Brand) {
  const known = companiesFor(brand)
  return state.brief.targetCompanies.filter(
    (company) => !known.includes(company)
  )
}
