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
  describePosting,
  filled,
  notedFrom,
  isSkip,
  nextQuestion,
  payLabel,
  criteriaOn,
  EMPTY_BRIEF,
  readDescription,
  readField,
  readRanked,
  currentOf,
  postingItem,
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
  type Probe,
} from "@/lib/job-intake"
import { advanceStart } from "@/lib/job-start"
import {
  diversityIn,
  IDEALLY,
  requirementsIn,
  withoutContacts,
} from "@/lib/jd-read"

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
  /**
   * CHAT V3 ONLY: filters the recruiter made good-to-haves. Each still counts
   * — as a ranking line (`crit`) instead of a filter — so the search ranks on
   * it and removes nobody for it. Absent everywhere else.
   */
  relaxed?: FilterId[]
  /**
   * CHAT V2.5 ONLY: what the JD step's own questions asked beyond the fixed
   * topics, as criterion lines ("P&L ownership: ₹50Cr+"). Each ranks the
   * search as a `crit` line and removes nobody. Absent everywhere else.
   */
  requirements?: string[]
}

/** The posting's filters: the things that narrow the pool rather than rank it. */
export type FilterId =
  "city" | "years" | "industries" | "team" | "companies" | "budget"

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
    /\b(ages?|aged|years? old|young(er|sters?)?|born (in|before|after)|batch(es)? (of|before|after)|graduated (before|after|in)|typically \d{2}\s*(-|–|to)\s*\d{2}\s*(years|yrs))\b/i,
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
  // Seen in a live JD: "individuals originating from Punjab or having strong
  // personal, cultural, or family connections to the region".
  [
    /\b(originat\w* from|natives? of|hails? from|domicile\w*|(personal|cultural|family) (ties|connections?|roots) to)\b/i,
    "where someone is from",
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

// --- Screening ----------------------------------------------------------------------

/**
 * THE SCREENING STEP: which questions candidates answer when they apply.
 *
 * PROPOSED FROM WHAT THE CHAT ALREADY KNOWS, never invented — a question per
 * must-have skill, the years, the city (and whether a move would do), the
 * team, the industry, and the two every posting asks (notice, expected
 * pay). The recruiter ticks the ones to use and adds their own; the answer
 * is the page's to read, one question per line, so a comma inside a
 * question is only a comma. Up to ten, as the form allows.
 */
export const SCREENING_MAX = 10

export function screeningFor(state: IntakeState): string[] {
  const { draft, brief } = state
  const questions: string[] = []
  for (const skill of draft.skills.slice(0, 3))
    questions.push(`How many years have you worked hands-on with ${skill}?`)
  if (draft.experience)
    questions.push(
      `Do you have ${draft.experience.min}+ years of total experience?`
    )
  const city = draft.locations.find((place) => place !== REMOTE)
  if (city)
    questions.push(
      brief.openToMovers === false
        ? `Are you currently based in ${city}?`
        : `Are you based in ${city}, or willing to relocate there?`
    )
  if (brief.ledTeam || draft.teamScale)
    questions.push("Have you managed a team? If so, how large?")
  if (brief.industries.length)
    questions.push(
      `Do you have experience in ${brief.industries.map(industryLabel).join(" or ")}?`
    )
  questions.push("What is your notice period?")
  if (draft.pay) questions.push("What is your expected annual CTC?")
  return questions.slice(0, 8)
}

/** One question per line; trimmed, unique, and no more than the form takes. */
export function readScreening(text: string): string[] {
  return unique(
    text
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  ).slice(0, SCREENING_MAX)
}

/** The screening step as a questionnaire item — the proposals as ticks. */
export function screeningItem(
  state: IntakeState,
  { change = false }: { change?: boolean } = {}
): AskedItem {
  const current = state.draft.screening
  return {
    id: "screening",
    prompt: "Which questions should candidates answer when they apply?",
    hint: "Optional. Asked before they can apply — up to ten. Tick the ones to use, or add your own.",
    // Asked again to change them, every question already set is a tick too.
    options: change
      ? unique([...current, ...screeningFor(state)])
      : screeningFor(state),
    multiple: true,
    required: change,
    current: change ? current : undefined,
    separator: "\n",
  }
}

// --- The plan -------------------------------------------------------------------

/** Whether a topic means anything for this draft. */
export function eligible(topic: RefineId, draft: PostingDraft) {
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
    ["skillsSplit", draft.niceSkills.length > 0 || Boolean(state.ranked)],
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
  // CHAT V2.5: before the criteria, whether there is a JD. Asked once — the
  // step records how it went, and leaving it calls this again.
  if (jdStepOn(state) && !state.jd)
    return {
      ...state,
      stage: "jd",
      jd: { status: "ask" },
      plan: [],
      settled: [],
      asking: null,
      missed: false,
    }
  // SELECTION CRITERIA SWITCHED OFF: no topics, straight to screening.
  // Both readers enter refinement here and only here, so this one line is
  // the whole of the behaviour; everything else just draws less.
  const covered = coveredTopics(state)
  const plan = criteriaOn(state)
    ? planFor(state.draft, suggested, { model }).filter(
        (topic) => !covered.includes(topic)
      )
    : []
  const asking = plan[0] ?? null
  return {
    ...state,
    stage: asking ? "refine" : "screen",
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
    ask: () => "Which of these are must-haves?",
    hint: "Above the line decides who is shortlisted; below only ranks them. Drag to reorder, or add your own.",
    // ONLY ASKED WHEN THE SKILLS WERE NEVER RANKED — read from a JD or the
    // opening sentence. The posting's own skills question is this same
    // ranking, and `coveredTopics` drops this topic once it has been answered.
    options: () => [],
    multiple: true,
    read: (answer, draft) => {
      const ranked = readRanked(answer)
      if (ranked)
        return { draft: { skills: ranked.must, niceSkills: ranked.nice } }
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
  if (topic === "skillsSplit") {
    return {
      id: topic,
      prompt: question.ask(state.draft),
      hint: question.hint,
      options: [],
      multiple: true,
      required: false,
      note: state.unread?.includes(topic)
        ? "I couldn't use that last time — try again, or skip it."
        : undefined,
      rank: { must: state.draft.skills, nice: state.draft.niceSkills },
    }
  }
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
export const LABELS: Record<
  FieldId | RefineId | "screening" | "start" | "base" | "jd",
  string
> = {
  start: "Start",
  base: "Based on",
  jd: "JD",
  title: "Role",
  locations: "Location",
  experience: "Experience",
  skills: "Skills",
  pay: "Pay",
  mode: "Work mode",
  skillsSplit: "Skills",
  screening: "Screening",
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

// --- A change from the rail, as one turn -----------------------------------------

/**
 * A CHANGE IS A TURN TOO, and a different kind from an answer. The draft is
 * folded from the turns, so a value changed beside the chat has to be
 * recorded as one or it is gone on reload. It is its own marker rather than
 * an `Answers:` turn because an answer fills what is empty and never
 * overwrites — that is what lets a first sentence set the city without a
 * later "Pune" clobbering it — and a change is exactly an overwrite. It
 * names the field it changes, so it is read by that field's own reader and
 * never by the model: there is nothing to interpret.
 */
const CHANGE = "Change: "

export function encodeChange(answers: Answers) {
  return `${CHANGE}${JSON.stringify(answers)}`
}

export function decodeChange(prompt: string): Answers | null {
  if (!prompt.startsWith(CHANGE)) return null
  return decodeAnswers(`${ANSWERS}${prompt.slice(CHANGE.length)}`)
}

const FIELD_IDS: FieldId[] = [
  "title",
  "locations",
  "experience",
  "skills",
  "pay",
  "mode",
]
const isField = (id: string): id is FieldId => FIELD_IDS.includes(id as FieldId)
const isTopic = (id: string): id is RefineId =>
  REFINE_ORDER.includes(id as RefineId)

/**
 * What "no" clears, topic by topic. The rules' readers answer "no" with a
 * sentence and no change, which is right the first time — nothing was
 * recorded, so nothing is to undo — and wrong for a change, where "no
 * neighbouring titles" means take them off.
 */
const CLEARED: Partial<Record<RefineId, Partial<HiringBrief>>> = {
  adjacent: { adjacentTitles: [] },
  industry: { industries: [] },
  targets: { targetCompanies: [] },
  college: { institutes: [] },
  exclusions: { exclusions: [] },
}

/**
 * The question asked again, to change its answer: the same item as the first
 * time, with the answer as it stands ticked, and required — the way out of a
 * change is the card's close, not a skip that would record nothing.
 */
export function changeItem(
  id: FieldId | RefineId | "screening",
  state: IntakeState,
  brand: Brand
): AskedItem {
  if (id === "screening") return screeningItem(state, { change: true })
  if (isField(id)) {
    const item = postingItem(id, state, brand)
    return {
      ...item,
      required: true,
      note: undefined,
      // The skills come back as the ranking they are, not the title's
      // suggestions with the line guessed.
      rank:
        id === "skills"
          ? { must: state.draft.skills, nice: state.draft.niceSkills }
          : undefined,
      current: currentOf(state.draft, id),
    }
  }
  const item = refineItem(id, state, brand)
  return {
    ...item,
    required: true,
    note: undefined,
    current: currentTopic(state, id),
  }
}

/** A refinement answer as the questionnaire would have said it. */
function currentTopic(state: IntakeState, topic: RefineId): string[] {
  const { brief, draft } = state
  switch (topic) {
    case "skillsSplit":
      return draft.skills
    case "adjacent":
      return brief.adjacentTitles
    case "relocation":
      return brief.openToMovers === null
        ? []
        : brief.openToMovers
          ? [
              draft.relocationSupport
                ? "Yes, and we'll support the move"
                : "Yes, but no relocation support",
            ]
          : [`No, only people in ${cityOf(draft)}`]
    case "industry":
      return brief.industries.map(industryLabel)
    case "scale":
      return draft.teamScale ? [draft.teamScale] : []
    case "targets":
      return brief.targetCompanies
    case "college":
      return brief.institutes.includes(PREMIUM_INSTITUTES)
        ? [PREMIUM_INSTITUTES]
        : brief.institutes.length
          ? brief.institutes
          : [ALL_INSTITUTES]
    case "budget":
      return brief.budget
        ? [brief.budget.firm ? "Firm" : `Up to ₹${brief.budget.upTo}L`]
        : []
    case "exclusions":
      return brief.exclusions
  }
}

/**
 * A change, applied. Each entry is read by its own field's or topic's reader
 * and written over what was there; the stage and the question being asked do
 * not move, so a change mid-conversation lands and the conversation carries
 * on where it was. What could not be read is said back and left as it was.
 */
function applyChange(
  state: IntakeState,
  change: Answers,
  brand: Brand
): IntakeState {
  let draft = { ...state.draft }
  let brief = { ...state.brief }
  const refused: string[] = []
  const unread: string[] = []
  let ranked = state.ranked

  for (const [id, value] of Object.entries(change)) {
    if (value === null) continue
    const kind = protectedIn(value)
    if (kind) {
      refused.push(kind)
      continue
    }
    if (id === "screening") {
      // Allowed to be empty: no questions is a real answer here.
      draft = { ...draft, screening: readScreening(value) }
      continue
    }
    if (isField(id)) {
      const read = readField(id, value, brand)
      if (!read) {
        unread.push(id)
        continue
      }
      draft = { ...draft, ...read }
      if (id === "skills" && readRanked(value)) ranked = true
      continue
    }
    if (!isTopic(id)) continue
    const read = questionOf(id).read(value, draft, brand)
    if (!read) {
      unread.push(id)
      continue
    }
    draft = { ...draft, ...read.draft }
    brief = { ...brief, ...read.brief, ...(read.said ? CLEARED[id] : {}) }
  }

  const changed: Partial<PostingDraft> = {}
  for (const id of [...FIELD_IDS, "niceSkills", "teamScale"] as const) {
    if (JSON.stringify(draft[id]) !== JSON.stringify(state.draft[id]))
      Object.assign(changed, { [id]: draft[id] })
  }
  const screened =
    JSON.stringify(draft.screening) !== JSON.stringify(state.draft.screening)
      ? [{ label: "Screening", value: screeningSaid(draft.screening) }]
      : []
  const labels = Object.keys(change).map(
    (id) => LABELS[id as keyof typeof LABELS] ?? id
  )
  return {
    ...state,
    draft,
    brief,
    ranked,
    unread,
    missed: false,
    engine: "rules",
    fallback: undefined,
    took: undefined,
    heard: refused.length
      ? refusalFor(refused)
      : unread.length
        ? `I couldn't read that change to ${labels.join(", ").toLowerCase()}, so it's as it was.`
        : null,
    noted: mergeNoted(
      [...notedFrom(changed), ...screened],
      refineNoted(state, draft, brief)
    ),
  }
}

// --- Reading an answer, by the rules --------------------------------------------

/**
 * Two lists of recorded rows as one, the first list's label winning. The
 * posting's rows (`notedFrom`) and the brief's (`refineNoted`) both know
 * about the skills split, so a turn that moves a skill below the line would
 * otherwise say "Must have" twice.
 */
export function mergeNoted(first: Noted, second: Noted): Noted {
  return [
    ...first,
    ...second.filter((row) => !first.some((seen) => seen.label === row.label)),
  ]
}

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
      stage: asking ? "refine" : "screen",
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

/** A turn, or a change made from the rail (`encodeChange`) — never a reading. */
export type IntakeTurn = IntakeInput | { change: Answers }

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
// --- The JD step (Chat v2.5) -------------------------------------------------

/**
 * WHETHER THERE IS A JD, ASKED BETWEEN THE POSTING AND THE CRITERIA. A real
 * JD says what refinement would otherwise ask — the team, the sectors that
 * count, who to rule out — so it is read first and refinement drops whatever
 * it covered (`coveredTopics`). Drafting one is the other answer: the drafting
 * is a reason to ask, so the questions come next, written for the role when
 * Gemini is up (`advanceWithAi` asks `/api/probe`), and the JD is drafted
 * from the answers at the end (`descriptionFor`). A drafted JD is never read
 * back for criteria — it would only say what was already said.
 *
 * Only under Chat v2.5 (`jdStep`), only with Selection criteria on, and never
 * for a posting that started from a JD.
 */
export const JD_HAVE = "I have one — I'll paste or attach it"
export const JD_DRAFT = "Draft one with me"

/** A JD shorter than this is a sentence typed beside the card, not a JD. */
export const JD_MIN = 80

export function jdStepOn(state: IntakeState) {
  return state.jdStep === true && criteriaOn(state) && state.origin !== "jd"
}

export function jdItem(state: IntakeState): AskedItem {
  return {
    id: "jd",
    prompt: "Do you have a JD for this role?",
    hint: "A JD usually answers what I'd ask next — the team, the sectors that count, who to rule out. Or I can draft one with you.",
    options: [JD_HAVE, JD_DRAFT],
    multiple: false,
    required: false,
    note: state.missed
      ? "Paste the JD itself, or pick one of these."
      : undefined,
  }
}

/** A probe as a questionnaire item. Its answer is the page's to read. */
export function probeItem(probe: Probe): AskedItem {
  return {
    id: probe.id,
    prompt: probe.ask,
    hint: probe.hint,
    options: probe.options,
    multiple: probe.multiple,
    required: false,
  }
}

/** The probes still to answer. */
export function pendingProbes(state: IntakeState) {
  const done = state.jd?.settledProbes ?? []
  return (state.jd?.probes ?? []).filter((probe) => !done.includes(probe.id))
}

/**
 * Leaving the step to draft one: the questions are the refinement topics
 * chosen for this role (`plan`, or the rules' own plan when null) and the
 * probes Gemini wrote, on one card. Without probes it is refinement as ever,
 * and the JD is still drafted from the answers.
 */
export function startDraft(
  state: IntakeState,
  probes: Probe[],
  plan: RefineId[] | null
): IntakeState {
  const drafting: IntakeState = {
    ...state,
    jd: { status: "draft", probes, settledProbes: [] },
  }
  if (plan === null)
    return enterRefine(drafting, null, { model: drafting.engine === "gemini" })
  const covered = coveredTopics(drafting)
  const kept = plan.filter(
    (topic) => eligible(topic, state.draft) && !covered.includes(topic)
  )
  const asking = kept[0] ?? null
  return {
    ...drafting,
    stage: asking || probes.length ? "refine" : "screen",
    plan: kept,
    settled: [],
    asking,
    missed: false,
  }
}

/**
 * A JD, read by the rules: the posting fields it states (into empty ones
 * only — an answer already given wins), the industries it names, and a team
 * it says they will lead. Then refinement, less what it covered.
 */
export function readJdText(
  state: IntakeState,
  text: string,
  brand: Brand
): IntakeState {
  const read = readDescription(text, brand, { document: true })
  const draft = { ...state.draft }
  const kept: Partial<PostingDraft> = {}
  for (const key of FIELD_IDS) {
    if (filled(draft, key) || read[key] === undefined) continue
    Object.assign(draft, { [key]: read[key] })
    Object.assign(kept, { [key]: read[key] })
  }
  const brief = { ...state.brief }
  if (!brief.industries.length)
    brief.industries = named(text, industriesFor(brand), industryLabel)
  const team = text.match(
    /\b(?:lead|leading|manage|managing)\s+a\s+team\s+of\s+(\d{1,3})/i
  )
  if (team && brief.ledTeam === null) {
    brief.ledTeam = true
    if (!draft.teamScale) draft.teamScale = `Leads a team of ${team[1]}`
  }
  const lines = requirementsIn(text)
  return withJdRead(state, draft, brief, text, notedFrom(kept), {
    must: lines.must,
    nice: lines.nice,
    diversity: diversityIn(text),
  })
}

/**
 * A JD's requirement lines and diversity options, checked: a line asking for
 * a diversity option is that option and not a requirement; a line screening
 * on who someone is ("Age: 40–50", "originating from Punjab") is refused and
 * never recorded — real JDs carry both.
 */
export function jdLines(
  found: {
    must: string[]
    nice: string[]
    diversity: string[]
    /** What the model already refused to read out of the JD. */
    declined?: string[]
  },
  known: string[] = []
) {
  const refused: string[] = []
  const diversity = unique([...found.diversity])
  const keep = (line: string) => {
    const options = diversityIn(line)
    if (options.length) {
      diversity.push(...options)
      return false
    }
    const kind = protectedIn(line)
    if (kind) refused.push(kind)
    return !kind
  }
  const must = found.must.filter(keep)
  const nice = found.nice.filter(keep)
  const lines = unique([
    ...known,
    ...must,
    ...nice.map((line) => IDEALLY + line),
  ])
  // A women-candidates line the model "declined" is the diversity option it
  // also reported — said back as refused, it would contradict the form.
  const declined = (found.declined ?? []).filter(
    (kind) => !(kind === "gender" && diversity.length)
  )
  return {
    lines,
    diversity: unique(diversity),
    refused: unique([...refused, ...declined]),
  }
}

/**
 * A JD as it can be posted: no contact details, and no line — or, on a
 * "Location: Mumbai | Age: 40–50" line, no part of one — that screens on who
 * someone is, since the JD becomes the posting's description. A diversity
 * line goes too: the form's own option says it.
 */
export function postable(text: string): string {
  const out = (part: string) =>
    Boolean(protectedIn(part)) || diversityIn(part).length > 0
  return withoutContacts(text)
    .split("\n")
    .flatMap((line) => {
      if (!out(line)) return [line]
      const parts = line.split(/\s+\|\s+/)
      const kept = parts.filter((part) => !out(part))
      return parts.length > 1 && kept.length ? [kept.join(" | ")] : []
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** The JD's reading applied — by either reader — and on to refinement. */
export function withJdRead(
  state: IntakeState,
  draft: PostingDraft,
  brief: HiringBrief,
  text: string,
  noted: Noted,
  found: {
    must: string[]
    nice: string[]
    diversity: string[]
    declined?: string[]
  }
): IntakeState {
  const { lines, diversity, refused } = jdLines(found, brief.requirements ?? [])
  const next = enterRefine(
    {
      ...state,
      draft,
      brief: { ...brief, requirements: lines },
      jd: { status: "read", text: postable(text), diversity },
      heard: null,
      unread: [],
    },
    null,
    { model: state.engine === "gemini" }
  )
  const added = lines.filter(
    (line) => !(state.brief.requirements ?? []).includes(line)
  )
  const rows = mergeNoted(noted, refineNoted(state, draft, brief))
  const extra: Noted = [
    ...(added.length
      ? [{ label: "Looking for", value: added.join("; ") }]
      : []),
    ...(diversity.length
      ? [{ label: "Diversity hiring", value: diversity.join(", ") }]
      : []),
  ]
  const all = [...rows, ...extra]
  return {
    ...next,
    noted: all,
    heard: refused.length
      ? refusalFor(refused)
      : all.length
        ? null
        : "I read it, but it didn't answer anything I'd ask — so a few questions.",
  }
}

/**
 * The JD step's answer, by the rules — the choice, a pasted JD, or a skip.
 * `draft` is what choosing to draft does; the AI reader passes its own, which
 * asks Gemini for the questions first.
 */
export function advanceJd(
  state: IntakeState,
  input: IntakeInput,
  brand: Brand,
  draft: (state: IntakeState) => IntakeState = (given) =>
    startDraft(given, [], null)
): IntakeState {
  const ruled = {
    engine: "rules" as const,
    phrasings: undefined,
    fallback: undefined,
  }
  const skip = (): IntakeState =>
    enterRefine(
      { ...state, ...ruled, jd: { status: "skipped" }, heard: null },
      null,
      { model: false }
    )

  const value =
    "answers" in input ? (input.answers.jd ?? null) : input.text.trim()
  const document = "text" in input && input.document === true

  if (value === null || (!document && isSkip(value))) return skip()
  if (value === POST_NOW) return { ...finish(state, null), ...ruled }
  if (value === JD_HAVE)
    return {
      ...state,
      ...ruled,
      jd: { status: "paste" },
      heard: null,
      missed: false,
    }
  if (value === JD_DRAFT) return draft({ ...state, ...ruled })
  // Anything else is the JD itself — attached, pasted into the box, or typed
  // into "Something else". Waiting for it, any text is it.
  if (document || state.jd?.status === "paste" || value.length >= JD_MIN)
    return { ...readJdText(state, value, brand), ...ruled }
  return { ...state, ...ruled, heard: null, missed: true }
}

/**
 * The probes' answers, read by the page: each becomes a criterion line,
 * "label: answer", replacing one of the same label. A protected trait is
 * refused and never recorded. Returns what is left for the topic readers.
 */
export function readProbes(
  state: IntakeState,
  answers: Answers
): { state: IntakeState; rest: Answers; refused: string[] } {
  const probes = state.jd?.probes ?? []
  if (!probes.length) return { state, rest: answers, refused: [] }
  const rest: Answers = {}
  const refused: string[] = []
  let lines = state.brief.requirements ?? []
  const settled = [...(state.jd?.settledProbes ?? [])]
  let diversity = state.jd?.diversity ?? []
  const noted: Noted = []
  for (const [id, value] of Object.entries(answers)) {
    const probe = probes.find((entry) => entry.id === id)
    if (!probe) {
      rest[id] = value
      continue
    }
    settled.push(id)
    if (value === null || isSkip(value)) continue
    // "Women candidates preferred" is the posting's diversity option.
    const options = diversityIn(value)
    if (options.length) {
      diversity = unique([...diversity, ...options])
      noted.push({ label: "Diversity hiring", value: options.join(", ") })
      continue
    }
    const kind = protectedIn(value)
    if (kind) {
      refused.push(kind)
      continue
    }
    const line = `${probe.label}: ${value.trim()}`
    lines = [
      ...lines.filter((entry) => !entry.startsWith(`${probe.label}:`)),
      line,
    ]
    noted.push({ label: probe.label, value: value.trim() })
  }
  return {
    state: {
      ...state,
      brief: { ...state.brief, requirements: lines },
      jd: { ...state.jd!, settledProbes: unique(settled), diversity },
      noted: [...(state.noted ?? []), ...noted],
    },
    rest,
    refused,
  }
}

/**
 * The posting's description, when the JD step produced one: their own JD as
 * given, or one drafted from the answers — the rules' draft of the posting
 * fields, plus what the probes found out. Null otherwise, and the form drafts
 * its own as it always has.
 */
export function descriptionFor(state: IntakeState): string | null {
  const jd = state.jd
  // Cleaned here, where it is used, so a reading cached before a rule
  // changed is posted under today's rules.
  if (jd?.status === "read" && jd.text) return postable(jd.text)
  if (jd?.status !== "draft" || !state.draft.title) return null
  const base = describePosting(state.draft)
  const lines = state.brief.requirements ?? []
  if (!lines.length) return base
  // Before the pay, which closes the rules' draft.
  const section = [
    "What we're looking for",
    ...lines.map((line) => `• ${line}`),
  ].join("\n")
  const pay = base.lastIndexOf("\n\nPay\n")
  return pay === -1
    ? `${base}\n\n${section}`
    : `${base.slice(0, pay)}\n\n${section}${base.slice(pay)}`
}

export function advance(
  state: IntakeState,
  given: IntakeTurn,
  brand: Brand
): IntakeState {
  // A change names its field and is read by that field's reader — before
  // anything else, because it can arrive at any stage, including done.
  if ("change" in given)
    return applyChange({ ...state, noted: undefined }, given.change, brand)
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
        if (id === "skills" && value !== null && readRanked(value))
          next = { ...next, ranked: true }
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
    for (const id of [...FIELD_IDS, "niceSkills"] as const) {
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

  if (state.stage === "jd") return advanceJd(state, input, brand)

  if (state.stage === "refine") {
    // Chat v2.5's probes are the page's to read; the topics go on as ever.
    const probed =
      "answers" in input
        ? readProbes({ ...state, noted: undefined }, input.answers)
        : null
    let next: IntakeState = probed?.state ?? state
    const unread: string[] = []
    const refused: string[] = [...(probed?.refused ?? [])]
    const answers = probed?.rest
    const entries: [RefineId, string | null][] = answers
      ? pendingTopics(state)
          .filter((topic) => topic in answers)
          .map((topic) => [topic, answers[topic]])
      : "text" in input
        ? [[pendingTopics(state)[0], input.text]]
        : []

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
      stage: asking ? "refine" : "screen",
      asking,
      unread,
      missed: false,
      heard: refused.length ? refusalFor(refused) : null,
      noted: mergeNoted(
        refineNoted(before, next.draft, next.brief),
        probed?.state.noted ?? []
      ),
    }
  }

  // SCREENING: the card's ticks and typed lines are the questions; a skip,
  // or "post it now", is none. Read by the page, never the model.
  if (state.stage === "screen") {
    // A card answer about something else — a topic re-asked under an
    // earlier plan, say — is a change to the posting, not a skipped step.
    if ("answers" in input && !("screening" in input.answers))
      return applyChange(state, input.answers, brand)
    const value =
      "answers" in input ? (input.answers.screening ?? null) : input.text
    const screening =
      value === null || isSkip(value) || value.trim() === POST_NOW
        ? []
        : readScreening(value)
    return {
      ...state,
      ...ruled,
      stage: "done",
      asking: null,
      draft: { ...state.draft, screening },
      unread: [],
      missed: false,
      heard: screening.length ? null : "No screening questions, then.",
      noted: screening.length
        ? [{ label: "Screening", value: screeningSaid(screening) }]
        : undefined,
    }
  }

  return state
}

/** "3 questions" — how a set of screening questions is said back. */
function screeningSaid(questions: string[]) {
  return questions.length
    ? `${questions.length} question${questions.length === 1 ? "" : "s"}`
    : "None"
}

// --- What it produces -----------------------------------------------------------

/** The private brief as rows — only what was said, nothing defaulted. */
export function briefRows(state: IntakeState) {
  const { brief, draft } = state
  const rows: { label: string; value: string; topic?: RefineId }[] = []
  // Off, the brief is not a thing on screen — even what the opening sentence
  // happened to fill in (an industry) stays out of sight.
  if (!criteriaOn(state)) return rows
  if (brief.adjacentTitles.length)
    rows.push({
      topic: "adjacent",
      label: "Also consider",
      value: brief.adjacentTitles.join(", "),
    })
  if (brief.openToMovers !== null)
    rows.push({
      topic: "relocation",
      label: "Location",
      value: brief.openToMovers
        ? `In ${cityOf(draft)}, or willing to move there`
        : `Already in ${cityOf(draft)}`,
    })
  if (brief.industries.length)
    rows.push({
      topic: "industry",
      label: "Industry",
      value: brief.industries.join(", "),
    })
  if (brief.ledTeam !== null)
    rows.push({
      topic: "scale",
      label: "Has led a team",
      value: brief.ledTeam ? "Required" : "Not needed",
    })
  if (brief.targetCompanies.length)
    rows.push({
      topic: "targets",
      label: "Look first at",
      value: brief.targetCompanies.join(", "),
    })
  if (brief.institutes.length)
    rows.push({
      topic: "college",
      label: "Prefer",
      value: brief.institutes.join(", "),
    })
  if (brief.budget)
    rows.push({
      topic: "budget",
      label: "Budget",
      value: brief.budget.firm
        ? "Firm"
        : `Can stretch to ₹${brief.budget.upTo}L`,
    })
  if (brief.exclusions.length)
    rows.push({
      topic: "exclusions",
      label: "Rule out",
      value: brief.exclusions.join("; "),
    })
  // Chat v2.5: what the JD or its questions said, beyond the topics. No
  // topic, so no pencil — a line is a sentence from the JD, not an answer to
  // one question that could be asked again.
  if (brief.requirements?.length)
    rows.push({ label: "Looking for", value: brief.requirements.join("; ") })
  if (state.jd?.diversity?.length)
    rows.push({
      label: "Diversity hiring",
      value: state.jd.diversity.join(", "),
    })
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
  const { draft } = state
  // Off, the search is the posting's alone: nothing the recruiter cannot see
  // on the screen narrows it.
  const brief = criteriaOn(state) ? state.brief : EMPTY_BRIEF
  // What Chat v3 turned from a filter into a ranking line. Empty everywhere
  // else, so every other layout's search is exactly what it was.
  const relaxed = new Set(state.brief.relaxed ?? [])
  const city = draft.locations.find((place) => place !== REMOTE)
  const movers = brief.openToMovers === true

  const titles = [draft.title, ...brief.adjacentTitles].filter(Boolean)
  // Where the city goes into the TEXT, the search reads it as the current
  // location; people who would move are asked for by preference instead.
  const query = [
    titles.join(" or "),
    city && !movers && !relaxed.has("city") ? `in ${city}` : null,
    draft.experience && !relaxed.has("years")
      ? yearsLabel(draft.experience)
      : null,
  ]
    .filter(Boolean)
    .join(", ")

  const params = new URLSearchParams(
    searchHref({ query, mode: "natural" }).split("?")[1] ?? ""
  )

  if (city && movers && !relaxed.has("city")) {
    const spelled = criteriaFrom(city).location
    if (spelled) params.append("pref", spelled)
  }
  if (!relaxed.has("industries"))
    for (const industry of brief.industries) params.append("ind", industry)
  if (brief.ledTeam && !relaxed.has("team")) params.set("team", "yes")
  const known = companiesFor(brand)
  if (!relaxed.has("companies"))
    for (const company of brief.targetCompanies) {
      if (known.includes(company)) params.append("org", company)
    }
  const ceiling =
    brief.budget?.upTo ?? (brief.budget?.firm ? draft.pay?.max : null)
  if (ceiling && !relaxed.has("budget"))
    params.set("ectc", writeRange(null, ceiling)!)

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
  // Chat v2.5's own questions, as they were answered.
  for (const line of brief.requirements ?? []) params.append("crit", line)

  // The relaxed filters, as the lines they became — ranked after the skills.
  if (relaxed.has("city") && city) params.append("crit", `Based in ${city}`)
  if (relaxed.has("years") && draft.experience)
    params.append(
      "crit",
      `Has at least ${draft.experience.min} years behind them`
    )
  if (relaxed.has("industries"))
    for (const industry of brief.industries)
      params.append("crit", `Has worked in ${industryLabel(industry)}`)
  if (relaxed.has("team") && brief.ledTeam)
    params.append("crit", "Has led a team")
  if (relaxed.has("companies"))
    for (const company of brief.targetCompanies)
      params.append("crit", `Has worked at ${company}`)
  if (relaxed.has("budget") && ceiling)
    params.append("crit", `Expects up to ₹${ceiling}L`)

  return `/database?${params.toString()}`
}

/** Target companies the pool has never dealt — named on the card, not filtered. */
export function unknownCompanies(state: IntakeState, brand: Brand) {
  const known = companiesFor(brand)
  return state.brief.targetCompanies.filter(
    (company) => !known.includes(company)
  )
}
