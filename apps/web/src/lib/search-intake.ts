import type { Brand } from "@workspace/ui/lib/brands"

import { candidatePhoto } from "@/lib/avatars"
import { profileMatches } from "@/lib/database-filters"
import {
  criteriaFor,
  poolFor,
  recalibrate,
  toReview,
  whatMoved,
  widenings,
  type Judgement,
  type Reviewee,
} from "@/lib/calibration"
import type { Verdict } from "@/lib/criteria"
import {
  briefHref,
  contextFor,
  pending,
  QUESTIONS,
  summarise,
  type Question,
  type QuestionId,
} from "@/lib/intake"
import { isSkip, type AskedItem, type Noted } from "@/lib/job-intake"
import type { Answers } from "@/lib/job-refine"
import { readBack, type SmartChip } from "@/lib/smart-hire"

/**
 * The search conversation — Search Resume's requirement, gathered in the chat.
 *
 * THE POSTING FLOW'S TWIN, BUILT ON THE BRIEF THAT ALREADY EXISTED. Everything
 * a search can use was already written for `/smart-hire/brief`: the eight
 * questions (`lib/intake.ts`), each landing on a refine-panel key, and the
 * calibration step (`lib/calibration.ts`) that puts the three people the
 * search ranks first in front of the recruiter and re-orders the criteria on
 * their say-so. This file folds those into the Dashboard's turns the way
 * `job-intake.ts` folds a posting: the state is a function of the turns, so a
 * reload rebuilds it and a link opens it.
 *
 * RULES ONLY, NO MODEL. Every question is tap-to-answer and every answer is a
 * value the results page reads verbatim, so there is nothing for Gemini to
 * interpret — and no reading is ever pending. The one thing read from prose
 * is the opening sentence, through the same `readBack` the Smart Hire bar
 * uses, so "Product managers in Pune, 8+ years, FMCG" pins down the role,
 * the city, the years and the industry before a question is asked.
 *
 * FOUR STAGES: the requirement (the sentence), the criteria (what the
 * sentence left out), calibration (optional — three people, thumbs up or
 * down), and the search itself, opened on everything gathered.
 */

export type SearchStage = "opener" | "criteria" | "calibrate" | "done"

export type SearchState = {
  stage: SearchStage
  /** The opening sentence, as typed. Empty until it is. */
  text: string
  answered: Partial<Record<QuestionId, string[]>>
  skipped: QuestionId[]
  /** How the three reviewed people were judged, by profile id. */
  judged: Record<string, Judgement>
  /** The criteria after calibration re-ordered them; null until it has. */
  criteria: string[] | null
  /** Said back in prose — a skip, a miss, what calibration moved. */
  heard: string | null
  /** What the last turn recorded, as rows. */
  noted?: Noted
  /** The last sentence could not be read as a role, so it is asked again. */
  missed: boolean
}

const NOBODY = new Set<string>()

export const SEARCH_NOW = "Skip these, find people now"

/** What each question is called in a bubble and on the rail. */
export const SEARCH_LABELS: Record<QuestionId | "calibrate", string> = {
  location: "Location",
  experience: "Experience",
  skills: "Skills",
  industry: "Industry",
  notice: "Notice period",
  pay: "Pay",
  companies: "Companies",
  alumni: "Institutes",
  calibrate: "Calibration",
}

export function startSearch(): SearchState {
  return {
    stage: "opener",
    text: "",
    answered: {},
    skipped: [],
    judged: {},
    criteria: null,
    heard: null,
    missed: false,
  }
}

// --- Reading the sentence --------------------------------------------------------

/**
 * The sentence as the readers can take it. A recruiter SEARCHING types the
 * plural — "product managers in Pune" — and the title reader knows the
 * singular, so role nouns are singularised first; and "find", "look for",
 * "show me" are how the sentence starts rather than part of the role.
 */
const PLURAL_ROLES: [RegExp, string][] = [
  [/\bmanagers\b/gi, "manager"],
  [/\bengineers\b/gi, "engineer"],
  [/\bdevelopers\b/gi, "developer"],
  [/\bdesigners\b/gi, "designer"],
  [/\banalysts\b/gi, "analyst"],
  [/\bleads\b/gi, "lead"],
  [/\bheads\b/gi, "head"],
  [/\bdirectors\b/gi, "director"],
  [/\barchitects\b/gi, "architect"],
  [/\bconsultants\b/gi, "consultant"],
  [/\bexecutives\b/gi, "executive"],
  [/\bspecialists\b/gi, "specialist"],
  [/\bofficers\b/gi, "officer"],
  [/\bscientists\b/gi, "scientist"],
  [/\brecruiters\b/gi, "recruiter"],
  [/\bassociates\b/gi, "associate"],
  [/\bpartners\b/gi, "partner"],
  [/\bcontrollers\b/gi, "controller"],
  [/\baccountants\b/gi, "accountant"],
  [/\bmarketers\b/gi, "marketer"],
  [/\bwriters\b/gi, "writer"],
  [/\bcoordinators\b/gi, "coordinator"],
  [/\badministrators\b/gi, "administrator"],
  [/\bpresidents\b/gi, "president"],
  [/\bvps\b/gi, "VP"],
  [/\bcxos\b/gi, "CXO"],
]
const OPENING =
  /^(?:please\s+)?(?:find|search(?:\s+for)?|look(?:ing)?\s+for|source|show\s+me|get\s+me|i\s+(?:need|want)|hire)\s+(?:me\s+)?(?:some\s+|a\s+|an\s+)?/i

export function requirementOf(text: string) {
  let out = text.trim().replace(OPENING, "")
  for (const [pattern, singular] of PLURAL_ROLES)
    out = out.replace(pattern, singular)
  return out.trim()
}

/** The sentence read back into chips — the same pass the Smart Hire bar makes. */
export function chipsFor(text: string, brand: Brand): SmartChip[] {
  const chips: SmartChip[] = []
  for (const part of readBack(text, brand)) {
    if ("chip" in part) chips.push(part.chip)
  }
  return chips
}

export function searchContext(state: SearchState, brand: Brand) {
  return contextFor(
    { text: state.text, chips: chipsFor(state.text, brand) },
    brand
  )
}

/** The role the sentence names, chip or prose. */
export function roleOf(state: SearchState, brand: Brand) {
  return searchContext(state, brand).role
}

// --- The search it becomes --------------------------------------------------------

export function searchParamsFor(state: SearchState, brand: Brand) {
  const href = briefHref(
    "/database",
    { text: state.text, chips: chipsFor(state.text, brand) },
    state.answered
  )
  const params = new URLSearchParams(href.split("?")[1] ?? "")
  // An industry named in the sentence is the industry question answered —
  // the question is not asked again, so its filter is written from the chip
  // instead. City and years need nothing: the pool already conforms to what
  // the sentence pinned down.
  if (!params.has("ind")) {
    for (const chip of chipsFor(state.text, brand)) {
      if (chip.kind === "industry") params.append("ind", chip.value)
    }
  }
  // Calibration's order rides along as Juicebox criteria, so Best match on
  // the results page is the order the recruiter agreed to.
  if (state.criteria) {
    params.delete("crit")
    for (const criterion of state.criteria) params.append("crit", criterion)
  }
  return params
}

export function searchHrefFor(state: SearchState, brand: Brand) {
  const query = searchParamsFor(state, brand).toString()
  return query ? `/database?${query}` : "/database"
}

export function searchPool(state: SearchState, brand: Brand) {
  return poolFor(brand, state.text, searchParamsFor(state, brand))
}

/** The criteria as they stand: calibration's order, or what the brief implies. */
export function searchCriteria(state: SearchState, brand: Brand) {
  return (
    state.criteria ??
    criteriaFor(searchPool(state, brand), searchParamsFor(state, brand))
  )
}

/**
 * Ways to widen a search that has narrowed too far, each counted against
 * the real pool and each a link to the search with that one filter loosened.
 *
 * Two kinds: the brief page's own step widenings (a range a step wider, a
 * company added), and DROPPING A FILTER OUTRIGHT — because a step is not
 * always enough. Eight-year product managers here start at ₹40L, so "up to
 * ₹25L" widened to ₹35L still finds nobody, and the honest offer is "any
 * pay", counted. Skills are criteria rather than filters, so they are not
 * offered: they remove nobody.
 */
export function searchWidenings(state: SearchState, brand: Brand) {
  const params = searchParamsFor(state, brand)
  const pool = searchPool(state, brand)
  const count = (next: URLSearchParams) =>
    pool.all.filter((profile) => profileMatches(profile, next, NOBODY, null))
      .length
  const current = pool.matching.length

  const candidates = widenings(pool, params).map((expansion) => ({
    label: expansion.label,
    gain: expansion.gain,
    params: expansion.params,
  }))
  for (const question of QUESTIONS) {
    if (!question.param || !params.has(question.param)) continue
    const without = new URLSearchParams(params)
    without.delete(question.param)
    candidates.push({
      label: `Any ${SEARCH_LABELS[question.id].toLowerCase()}`,
      gain: count(without) - current,
      params: without,
    })
  }

  const seen = new Set<string>()
  return candidates
    .filter((candidate) => candidate.gain > 0)
    .filter((candidate) =>
      seen.has(candidate.label) ? false : (seen.add(candidate.label), true)
    )
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 4)
    .map((candidate) => ({
      label: candidate.label,
      gain: candidate.gain,
      href: `/database?${candidate.params.toString()}`,
    }))
}

/** The three the search ranks first — for calibration, and for the preview. */
export function searchReviewees(state: SearchState, brand: Brand): Reviewee[] {
  return toReview(searchPool(state, brand), searchCriteria(state, brand))
}

/** A reviewee as the chat and the rail draw them. */
export type SearchPerson = {
  id: string
  name: string
  title: string | null
  company: string | null
  location: string
  years: number
  score: number
  verdicts: Verdict[]
  photo?: string
}

export function personOf(reviewee: Reviewee): SearchPerson {
  const { profile } = reviewee
  const role = profile.positions[0]
  return {
    id: profile.id,
    name: profile.name,
    title: role?.title ?? null,
    company: role?.company ?? null,
    location: profile.location,
    years: profile.experienceYears,
    score: reviewee.score,
    verdicts: reviewee.verdicts,
    photo: candidatePhoto(profile.name, profile.experienceYears),
  }
}

// --- The questions -------------------------------------------------------------------

export function pendingQuestions(state: SearchState, brand: Brand): Question[] {
  return pending(
    searchContext(state, brand),
    state.answered,
    new Set(state.skipped)
  )
}

function itemFor(
  question: Question,
  state: SearchState,
  brand: Brand,
  { change = false }: { change?: boolean } = {}
): AskedItem {
  const context = searchContext(state, brand)
  const options = question.options(context)
  const current = (state.answered[question.id] ?? []).map(
    (value) => options.find((option) => option.value === value)?.label ?? value
  )
  return {
    id: question.id,
    prompt: question.ask,
    hint: question.because,
    options: options.map((option) => option.label),
    multiple: question.multiple ?? false,
    required: change,
    current: change ? current : undefined,
  }
}

/** The questions still to ask, as one card. */
export function searchItems(state: SearchState, brand: Brand): AskedItem[] {
  return pendingQuestions(state, brand).map((question) =>
    itemFor(question, state, brand)
  )
}

/** A question asked again from the rail, with its answer as it stands ticked. */
export function searchChangeItem(
  id: string,
  state: SearchState,
  brand: Brand
): AskedItem | null {
  const question = QUESTIONS.find((entry) => entry.id === id)
  return question ? itemFor(question, state, brand, { change: true }) : null
}

/**
 * An answer in the card's words back into the panel's values: a tapped label
 * becomes its value, anything typed stands as typed. Several are joined with
 * ", " by the card, which no option here contains.
 */
function readAnswer(
  question: Question,
  text: string,
  state: SearchState,
  brand: Brand
) {
  const options = question.options(searchContext(state, brand))
  const parts = question.multiple
    ? text
        .split(/,\s*/)
        .map((part) => part.trim())
        .filter(Boolean)
    : [text.trim()].filter(Boolean)
  return [
    ...new Set(
      parts.map(
        (part) =>
          options.find(
            (option) => option.label.toLowerCase() === part.toLowerCase()
          )?.value ?? part
      )
    ),
  ]
}

// --- One turn ------------------------------------------------------------------------

export type SearchInput =
  { text: string } | { answers: Answers } | { change: Answers }

/**
 * One turn, applied. The sentence fills the requirement; a card's answers
 * fill the criteria (null is a skip); calibration's judgements re-order the
 * criteria; a change from the rail overwrites one answer wherever the
 * conversation is. Nothing here is asynchronous.
 */
export function advanceSearch(
  state: SearchState,
  input: SearchInput,
  brand: Brand
): SearchState {
  const base: SearchState = {
    ...state,
    heard: null,
    noted: undefined,
    missed: false,
  }

  if ("change" in input) {
    let next = base
    const noted: Noted = []
    for (const [id, value] of Object.entries(input.change)) {
      const question = QUESTIONS.find((entry) => entry.id === id)
      if (!question || value === null) continue
      const values = readAnswer(question, value, next, brand)
      next = {
        ...next,
        answered: { ...next.answered, [question.id]: values },
        skipped: next.skipped.filter((skipped) => skipped !== question.id),
        // Answers moved, so calibration's order is no longer about this search.
        criteria: null,
        judged: {},
      }
      noted.push({
        label: SEARCH_LABELS[question.id],
        value: labelsOf(question, values, next, brand).join(", ") || "Any",
      })
    }
    return {
      ...next,
      noted,
      // Calibration ordered the criteria as they were; an answer moving
      // under it is worth saying rather than quietly forgetting.
      heard:
        state.criteria && noted.length
          ? "The criteria changed, so calibration's order no longer applies."
          : null,
    }
  }

  if (state.stage === "opener") {
    const text = "text" in input ? requirementOf(input.text) : ""
    if (!text) return { ...base, missed: true }
    const read: SearchState = { ...base, text }
    if (!roleOf(read, brand)) {
      return {
        ...base,
        missed: true,
        heard: `I couldn't find a role in that. Who are you looking for — "Head of Sales in Mumbai, 12+ years", say?`,
      }
    }
    const understood = summarise(searchContext(read, brand))
    const left = pendingQuestions(read, brand)
    return onward(
      {
        ...read,
        stage: left.length ? "criteria" : "calibrate",
        noted: [{ label: "Looking for", value: understood.join(" · ") }],
      },
      brand
    )
  }

  if (state.stage === "criteria") {
    let next = base
    const noted: Noted = []
    if ("answers" in input) {
      for (const question of pendingQuestions(state, brand)) {
        if (!(question.id in input.answers)) continue
        const value = input.answers[question.id]
        if (value === null || isSkip(value)) {
          next = { ...next, skipped: [...next.skipped, question.id] }
          continue
        }
        const values = readAnswer(question, value, next, brand)
        next = {
          ...next,
          answered: { ...next.answered, [question.id]: values },
        }
        noted.push({
          label: SEARCH_LABELS[question.id],
          value: labelsOf(question, values, next, brand).join(", "),
        })
      }
    } else if (input.text.trim() === SEARCH_NOW) {
      // Straight to the people: every open question waved away, and the
      // calibration too — "now" means now.
      return {
        ...next,
        skipped: [
          ...next.skipped,
          ...pendingQuestions(state, brand).map((question) => question.id),
        ],
        stage: "done",
        heard: "Skipped the rest.",
      }
    } else {
      // Typed beside the card: an answer to the first open question.
      const question = pendingQuestions(state, brand)[0]
      if (!question) return next
      if (isSkip(input.text)) {
        next = { ...next, skipped: [...next.skipped, question.id] }
      } else {
        const values = readAnswer(question, input.text, next, brand)
        next = {
          ...next,
          answered: { ...next.answered, [question.id]: values },
        }
        noted.push({
          label: SEARCH_LABELS[question.id],
          value: labelsOf(question, values, next, brand).join(", "),
        })
      }
    }
    const left = pendingQuestions(next, brand)
    return onward(
      { ...next, noted, stage: left.length ? "criteria" : "calibrate" },
      brand
    )
  }

  if (state.stage === "calibrate") {
    const value =
      "answers" in input ? (input.answers.calibrate ?? null) : input.text
    if (value === null || isSkip(value) || value.trim() === SEARCH_NOW) {
      return { ...base, stage: "done", heard: "No calibration, then." }
    }
    const judged: Record<string, Judgement> = {}
    for (const line of value.split("\n")) {
      const [id, judgement] = line.split("=")
      if (id && (judgement === "kept" || judgement === "dropped"))
        judged[id.trim()] = judgement
    }
    const reviewees = searchReviewees(state, brand)
    const before = searchCriteria(state, brand)
    const after = recalibrate(
      before,
      reviewees
        .filter((reviewee) => judged[reviewee.profile.id])
        .map((reviewee) => ({
          verdicts: reviewee.verdicts,
          judgement: judged[reviewee.profile.id]!,
        }))
    )
    const kept = Object.values(judged).filter((j) => j === "kept").length
    const dropped = Object.values(judged).length - kept
    return {
      ...base,
      stage: "done",
      judged,
      criteria: after,
      heard:
        whatMoved(before, after) ??
        "Nothing moved — the search already had the order right.",
      noted: [
        {
          label: "Calibration",
          value: `${kept} kept, ${dropped} not a fit`,
        },
      ],
    }
  }

  return base
}

/**
 * Calibration needs somebody to calibrate against. A search whose filters
 * leave nobody skips it and finishes, saying so — the finish card then
 * offers what would widen it, which is the useful next thing.
 */
function onward(state: SearchState, brand: Brand): SearchState {
  if (state.stage !== "calibrate") return state
  if (!searchCriteria(state, brand).length) {
    // Calibration re-orders the criteria; with none there is nothing it
    // could move, and three people scored on nothing would be a fiction.
    return {
      ...state,
      stage: "done",
      heard:
        "Nothing to rank by — no skill or industry was named — so no calibration.",
    }
  }
  if (searchReviewees(state, brand).length) return state
  return {
    ...state,
    stage: "done",
    heard:
      "Those filters leave nobody in the database — here's what would widen it.",
  }
}

function labelsOf(
  question: Question,
  values: string[],
  state: SearchState,
  brand: Brand
) {
  const options = question.options(searchContext(state, brand))
  return values.map(
    (value) => options.find((option) => option.value === value)?.label ?? value
  )
}

// --- What it says about itself -------------------------------------------------------

export type SearchRow = { id?: string; label: string; value: string | null }

/**
 * The requirement and the criteria as labelled rows — the rail's, the finish
 * card's, and the work step's. What the sentence pinned down shows too, from
 * its chips, so a row is never blank for a fact the recruiter typed.
 */
export function searchRows(
  state: SearchState,
  brand: Brand
): { requirement: SearchRow[]; criteria: SearchRow[]; skills: string[] } {
  const context = searchContext(state, brand)
  const chips = chipsFor(state.text, brand)
  const chipLabels = (kind: SmartChip["kind"]) =>
    chips.filter((chip) => chip.kind === kind).map((chip) => chip.label)
  const answered = (id: QuestionId) => {
    const question = QUESTIONS.find((entry) => entry.id === id)!
    const values = state.answered[id]
    return values?.length ? labelsOf(question, values, state, brand) : null
  }
  const years =
    /\b\d+\s*(?:\+|\s*(?:[–-]|to)\s*\d+)?\s*(?:years?|yrs?)\b|\b\d+\+/i.exec(
      state.text
    )?.[0]
  const orAny = (id: QuestionId, value: string | null) =>
    value ?? (state.skipped.includes(id) ? "Any" : null)

  return {
    requirement: [
      { label: "Role", value: context.role },
      {
        id: "location",
        label: "Location",
        value: orAny(
          "location",
          answered("location")?.join(", ") ??
            (chipLabels("location").join(", ") || null)
        ),
      },
      {
        id: "experience",
        label: "Experience",
        value: orAny(
          "experience",
          answered("experience")?.join(", ") ?? years ?? null
        ),
      },
    ],
    criteria: [
      {
        id: "industry",
        label: "Industry",
        value: orAny(
          "industry",
          answered("industry")?.join(", ") ??
            (chipLabels("industry").join(", ") || null)
        ),
      },
      {
        id: "notice",
        label: "Notice period",
        value: orAny("notice", answered("notice")?.join(", ") ?? null),
      },
      {
        id: "pay",
        label: "Pay",
        value: orAny("pay", answered("pay")?.join(", ") ?? null),
      },
      {
        id: "companies",
        label: "Companies",
        value: orAny("companies", answered("companies")?.join(", ") ?? null),
      },
      {
        id: "alumni",
        label: "Institutes",
        value: orAny("alumni", answered("alumni")?.join(", ") ?? null),
      },
    ],
    skills: answered("skills") ?? chipLabels("skill"),
  }
}

/** The sentence, as the opener's detail: "Product Manager · in Pune · FMCG". */
export function searchSummary(state: SearchState, brand: Brand) {
  return summarise(searchContext(state, brand)).join(" · ")
}
