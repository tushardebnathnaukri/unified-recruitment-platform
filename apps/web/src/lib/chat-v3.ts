import type { Brand } from "@workspace/ui/lib/brands"

import { companiesFor } from "@/lib/applicants"
import { poolFor, toReview } from "@/lib/calibration"
import { SALARY_PERCENTILES, CITIES } from "@/lib/insights"
import {
  decodeAnswers,
  decodeChange,
  encodeChange,
  enterRefine,
  industryLabel,
  searchHrefFor,
  type FilterId,
} from "@/lib/job-refine"
import { postingSearch, projected } from "@/lib/posting-rail"
import { personOf } from "@/lib/search-intake"
import {
  EMPTY_BRIEF,
  EMPTY_DRAFT,
  REMOTE,
  canonicalCity,
  criteriaOn,
  encodeRanked,
  filled,
  nextQuestion,
  rankFor,
  yearsLabel,
  type FieldId,
  type IntakeState,
  type PostingDraft,
} from "@/lib/job-intake"
import { skillsForTitle } from "@/lib/title-intel"

/**
 * Chat v3 — the `rail3` posting variant: Chat with rail v2 with the AI Agent's
 * ideas on our own conversation. This module is the part of it that is not
 * drawing: the two turn kinds it adds, what the agent fills on its own, and
 * where every value on the rail came from.
 *
 * THE CONVERSATION IS STILL ITS TURNS. A lock is a turn, a hiring manager's
 * note is a turn; what the agent fills is NOT a turn — it is worked out from
 * the turns on every fold (`withSuggestions`), so it replays the same way and
 * a shared link shows the same rail.
 */

// --- Two turn kinds --------------------------------------------------------

const LOCK = "Lock: "

/** "Lock: {"pay":true}" — the agent leaves a locked field alone. */
export function encodeLock(field: FieldId, on: boolean) {
  return `${LOCK}${JSON.stringify({ [field]: on })}`
}

export function decodeLock(
  prompt: string
): { field: FieldId; on: boolean } | null {
  if (!prompt.startsWith(LOCK)) return null
  try {
    const value: unknown = JSON.parse(prompt.slice(LOCK.length))
    if (!value || typeof value !== "object") return null
    const [entry] = Object.entries(value)
    if (
      !entry ||
      !SUGGESTIBLE.concat(["title", "mode"]).includes(entry[0] as FieldId)
    )
      return null
    return { field: entry[0] as FieldId, on: entry[1] === true }
  } catch {
    return null
  }
}

/** A hiring manager's note, as recorded or typed: read like a description. */
export const NOTE = "Note: "

export function encodeNote(text: string) {
  return `${NOTE}${text.trim()}`
}

export function decodeNote(prompt: string) {
  return prompt.startsWith(NOTE) ? prompt.slice(NOTE.length) : null
}

// --- What the agent fills ---------------------------------------------------

/** The fields the pool can say something about. Work mode is not one. */
const SUGGESTIBLE: FieldId[] = ["locations", "experience", "pay", "skills"]

/** The rail's labels, for "I filled pay, years and skills". */
export const FIELD_LABEL: Record<FieldId, string> = {
  title: "Role",
  locations: "Location",
  experience: "Experience",
  skills: "Skills",
  pay: "Pay",
  mode: "Work mode",
}

const POOLS = new Map<string, ReturnType<typeof poolFor>>()

/** The dealt pool for a title (and a city, when one is known), cached. */
function peopleFor(brand: Brand, title: string, city: string | null) {
  const query = city ? `${title} in ${city}` : title
  const key = `${brand}\u0001${query}`
  let pool = POOLS.get(key)
  if (!pool) {
    pool = poolFor(brand, query, new URLSearchParams())
    POOLS.set(key, pool)
  }
  return pool.all
}

/**
 * The middle third of a list of numbers, as a range — the people a posting is
 * most likely written for. The middle half was tried first, and on a senior
 * pool it read "8–15 years, ₹75L–1.26Cr": true of the pool, and too wide to
 * post.
 */
function middleThird(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const at = (share: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))]
  const min = Math.round(at(1 / 3))
  const max = Math.max(min + 1, Math.round(at(2 / 3)))
  return { min, max }
}

/**
 * What the agent would put in the empty fields, from the people a search for
 * this title finds — NEVER INVENTED. Years are the middle third of what
 * those people have, pay the middle third of what the ones inside those
 * years expect; the city is where most of them are;
 * the skills are the title's own (`skillsForTitle`), ranked as the card
 * ranks them. Nothing for a field the pool says nothing about.
 */
export function suggestionsFor(
  draft: PostingDraft,
  brand: Brand
): Partial<PostingDraft> {
  if (!draft.title) return {}
  const city = draft.locations.find((place) => canonicalCity(place)) ?? null
  const people = peopleFor(brand, draft.title, city)
  const out: Partial<PostingDraft> = {}

  if (!city && people.length) {
    const counts = new Map<string, number>()
    for (const person of people)
      counts.set(person.location, (counts.get(person.location) ?? 0) + 1)
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    const place = top ? canonicalCity(top) : null
    if (place) out.locations = [place]
  }
  // Years first, then pay from the people inside those years — or the
  // years given, when the recruiter gave them — so the two describe the
  // same person rather than two ends of the pool.
  const years =
    draft.experience ??
    middleThird(people.map((person) => person.experienceYears))
  if (years && !draft.experience) out.experience = years
  const within = years
    ? people.filter(
        (person) =>
          person.experienceYears >= years.min &&
          person.experienceYears <= (years.max ?? Infinity)
      )
    : people
  const pay = middleThird(
    (within.length ? within : people).map((person) => person.expectedCtcLakh)
  )
  if (pay) out.pay = pay

  const skills = skillsForTitle(draft.title, brand)
    .map((proposal) => proposal.skill)
    .slice(0, 6)
  if (skills.length) {
    const { must, nice } = rankFor(draft.title, skills, brand)
    out.skills = must
    out.niceSkills = nice
  }
  return out
}

/**
 * The state a reader is given: the agent's suggestions taken back out, so an
 * answer can still fill those fields — the readers never overwrite a filled
 * one. A locked field keeps its value, suggested or not.
 */
export function withoutSuggestions(state: IntakeState): IntakeState {
  const suggested = (state.suggested ?? []).filter(
    (id) => !(state.locked ?? []).includes(id)
  )
  if (!suggested.length) return state
  const draft = { ...state.draft }
  for (const id of suggested) {
    Object.assign(draft, { [id]: EMPTY_DRAFT[id] })
    if (id === "skills") draft.niceSkills = []
  }
  return { ...state, draft, suggested: [] }
}

/**
 * After a turn: put the locked fields back as they were, then fill whatever is
 * still empty from the pool, and move the conversation on if that answered
 * the last posting question. What was filled THIS turn is said back.
 */
export function withSuggestions(
  state: IntakeState,
  before: IntakeState | null,
  brand: Brand
): IntakeState {
  let next = state
  const locked = state.locked ?? []

  // LOCKS, whichever reader ran: the agent does not change a locked field.
  if (before && locked.length) {
    const draft = { ...next.draft }
    const kept: string[] = []
    for (const id of locked) {
      if (JSON.stringify(draft[id]) === JSON.stringify(before.draft[id]))
        continue
      Object.assign(draft, { [id]: before.draft[id] })
      if (id === "skills") draft.niceSkills = before.draft.niceSkills
      kept.push(FIELD_LABEL[id])
    }
    if (kept.length) {
      next = {
        ...next,
        draft,
        noted: next.noted?.filter((row) => !kept.includes(row.label)),
        heard: joinSaid(
          next.heard,
          `${listOf(kept)} ${kept.length > 1 ? "are" : "is"} locked, so I left ${
            kept.length > 1 ? "them" : "it"
          } as ${kept.length > 1 ? "they were" : "it was"}.`
        ),
      }
    }
  }

  const wanted = suggestionsFor(next.draft, brand)
  const draft = { ...next.draft }
  const suggested: FieldId[] = []
  for (const id of SUGGESTIBLE) {
    const value = wanted[id]
    if (value === undefined) continue
    if (filled(draft, id) || next.skipped.includes(id)) continue
    Object.assign(draft, { [id]: value })
    if (id === "skills") draft.niceSkills = wanted.niceSkills ?? []
    suggested.push(id)
  }
  if (!suggested.length) return { ...next, suggested: [] }

  const fresh = suggested.filter(
    (id) => !(before?.suggested ?? []).includes(id)
  )
  next = {
    ...next,
    draft,
    suggested,
    ranked: next.ranked || suggested.includes("skills"),
    heard: fresh.length
      ? joinSaid(
          next.heard,
          `I filled ${listOf(fresh.map((id) => FIELD_LABEL[id].toLowerCase()))} from people who already do this job. Change anything that's off.`
        )
      : next.heard,
  }

  // Filling may have answered the last posting question.
  if (next.stage === "posting") {
    const asking = nextQuestion(next.draft, next.skipped)
    next =
      asking === null
        ? enterRefine({ ...next, asking }, null, { model: false })
        : { ...next, asking }
  }
  return next
}

function joinSaid(first: string | null, second: string) {
  return first ? `${first} ${second}` : second
}

function listOf(items: string[]) {
  if (items.length < 2) return items.join("")
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

// --- Where each value came from ----------------------------------------------

export type Source =
  | "brief"
  | "jd"
  | "job"
  | "answered"
  | "edited"
  | "note"
  | "suggested"
  | "needs"

export const SOURCE_LABEL: Record<Source, string> = {
  brief: "From your brief",
  jd: "From your JD",
  job: "From your job",
  answered: "You answered",
  edited: "Edited by you",
  note: "From the hiring manager",
  suggested: "Suggested",
  needs: "Needs input",
}

type TurnKind = Exclude<Source, "suggested" | "needs"> | "lock" | "other"

function kindOf(
  prompt: string,
  before: IntakeState | null,
  isAttachment: (prompt: string) => boolean
): TurnKind {
  if (decodeLock(prompt)) return "lock"
  if (decodeNote(prompt) !== null) return "note"
  if (decodeChange(prompt)) return "edited"
  const answers = decodeAnswers(prompt)
  if (answers) return "base" in answers ? "job" : "answered"
  if (isAttachment(prompt)) return "jd"
  if (!before || before.opener) return "brief"
  return "answered"
}

export type Provenance = Partial<Record<FieldId, Source>>

/** One value set by one turn — what the status panel's "Recent" lists. */
export type Change = { field: FieldId; source: Source; turn: number }

/**
 * Every value each turn set, in order. `states[i]` is the posting state after
 * `prompts[i]` (`answersFor`). A new posting starts the list over.
 */
export function changesFor(
  prompts: string[],
  states: (IntakeState | null)[],
  isAttachment: (prompt: string) => boolean
): Change[] {
  let out: Change[] = []
  let previous: IntakeState | null = null
  prompts.forEach((prompt, index) => {
    const state = states[index]
    if (!state) return
    if (previous && state !== previous && state.draft === EMPTY_DRAFT) out = []
    const kind = kindOf(prompt, previous, isAttachment)
    const draftBefore = previous?.draft ?? EMPTY_DRAFT
    if (kind !== "lock" && kind !== "other") {
      for (const id of Object.keys(FIELD_LABEL) as FieldId[]) {
        if (JSON.stringify(state.draft[id]) === JSON.stringify(draftBefore[id]))
          continue
        out.push({
          field: id,
          source: state.suggested?.includes(id) ? "suggested" : kind,
          turn: index,
        })
      }
    }
    previous = state
  })
  return out
}

/**
 * For each posting field: which kind of turn last set it — or "Suggested"
 * while the agent's value is the one standing, "Needs input" while nothing is.
 */
export function provenanceFor(
  prompts: string[],
  states: (IntakeState | null)[],
  isAttachment: (prompt: string) => boolean
): Provenance {
  const out: Provenance = {}
  for (const change of changesFor(prompts, states, isAttachment))
    out[change.field] = change.source
  const last = [...states].reverse().find(Boolean) ?? null
  if (last) {
    for (const id of Object.keys(FIELD_LABEL) as FieldId[]) {
      if (last.suggested?.includes(id)) out[id] = "suggested"
      else if (!filled(last.draft, id)) out[id] = "needs"
      else if (!out[id]) out[id] = "brief"
    }
  }
  return out
}

// --- Filters: what narrows the pool ---------------------------------------------

const FILTER = "Filter: "

/**
 * "Filter: {"id":"industries","to":"good"}" — a filter made a good-to-have
 * (relaxed: it ranks, it removes nobody), made a must-have again, or dropped
 * from the brief altogether (`"none"`). A turn, so it replays.
 */
export type FilterMove = { id: FilterId; to: "must" | "good" | "none" }

const FILTER_IDS: FilterId[] = [
  "city",
  "years",
  "industries",
  "team",
  "companies",
  "budget",
]

export function encodeFilter(move: FilterMove) {
  return `${FILTER}${JSON.stringify(move)}`
}

export function decodeFilter(prompt: string): FilterMove | null {
  if (!prompt.startsWith(FILTER)) return null
  try {
    const value = JSON.parse(prompt.slice(FILTER.length)) as Partial<FilterMove>
    if (!value.id || !FILTER_IDS.includes(value.id)) return null
    if (value.to !== "must" && value.to !== "good" && value.to !== "none")
      return null
    return { id: value.id, to: value.to }
  } catch {
    return null
  }
}

/** A filter move, applied: the relaxed list, or the brief without it. */
export function applyFilter(state: IntakeState, move: FilterMove): IntakeState {
  const relaxed = (state.brief.relaxed ?? []).filter((id) => id !== move.id)
  if (move.to === "good")
    return {
      ...state,
      brief: { ...state.brief, relaxed: [...relaxed, move.id] },
    }
  if (move.to === "must")
    return { ...state, brief: { ...state.brief, relaxed } }
  // Dropped: only the brief's own filters — a posting keeps its city and years.
  const brief = { ...state.brief, relaxed }
  if (move.id === "industries") brief.industries = []
  if (move.id === "team") brief.ledTeam = null
  if (move.id === "companies") brief.targetCompanies = []
  if (move.id === "budget") brief.budget = null
  return { ...state, brief }
}

export const FILTER_LABEL: Record<FilterId, string> = {
  city: "Location",
  years: "Experience",
  industries: "Industry",
  team: "Led a team",
  companies: "Companies",
  budget: "Pay ceiling",
}

const COUNTS = new Map<string, number>()

/** How many people the posting's search finds, projected as the rail does. */
export function poolCount(state: IntakeState, brand: Brand) {
  const href = searchHrefFor(state, brand)
  const key = `${brand}\u0001${href}`
  let count = COUNTS.get(key)
  if (count === undefined) {
    count = projected(postingSearch(state, brand).pool.matching.length, brand)
    COUNTS.set(key, count)
  }
  return count
}

export type Requirement = {
  id: FilterId
  label: string
  value: string
  /** Narrows the pool (a must-have), or only ranks it (a good-to-have). */
  must: boolean
  /** People the pool gains by relaxing it — or loses by making it a must. */
  shift: number
  /** A brief filter can be dropped; the posting's city and years cannot. */
  droppable: boolean
}

/** The posting's filters as they stand, each with what it costs. */
export function requirementsOf(
  state: IntakeState,
  brand: Brand
): Requirement[] {
  const { draft } = state
  const brief = criteriaOn(state) ? state.brief : EMPTY_BRIEF
  const relaxed = state.brief.relaxed ?? []
  const city = draft.locations.find((place) => place !== REMOTE)
  const ceiling =
    brief.budget?.upTo ?? (brief.budget?.firm ? draft.pay?.max : null)
  const known = companiesFor(brand)
  const companies = brief.targetCompanies.filter((c) => known.includes(c))

  const present: [FilterId, string | null][] = [
    ["city", city ?? null],
    ["years", draft.experience ? yearsLabel(draft.experience) : null],
    [
      "industries",
      brief.industries.length
        ? brief.industries.map(industryLabel).join(", ")
        : null,
    ],
    ["team", brief.ledTeam ? "Has led a team" : null],
    ["companies", companies.length ? companies.join(", ") : null],
    ["budget", ceiling ? `Up to ₹${ceiling}L` : null],
  ]
  const now = poolCount(state, brand)
  return present.flatMap(([id, value]) => {
    if (!value) return []
    const must = !relaxed.includes(id)
    const flipped = applyFilter(state, { id, to: must ? "good" : "must" })
    return [
      {
        id,
        label: FILTER_LABEL[id],
        value,
        must,
        shift: Math.abs(poolCount(flipped, brand) - now),
        droppable: id !== "city" && id !== "years",
      },
    ]
  })
}

/** The single move that recovers the most people, when the pool runs thin. */
export const THIN_POOL = 5_000

export function guardrailFor(state: IntakeState, brand: Brand) {
  const now = poolCount(state, brand)
  if (now >= THIN_POOL) return null
  const best = requirementsOf(state, brand)
    .filter((requirement) => requirement.must)
    .sort((a, b) => b.shift - a.shift)[0]
  if (!best || best.shift < Math.max(100, now * 0.15)) return null
  return { requirement: best, now, after: now + best.shift }
}

/**
 * What the last turn moved, if it was a move — said with the pool before and
 * after it, and the turn that would put it back.
 */
export function lastMoveOf(
  prompts: string[],
  states: (IntakeState | null)[],
  brand: Brand
) {
  const index = prompts.length - 1
  const before = states[index - 1]
  const after = states[index]
  if (index < 1 || !before || !after) return null
  const prompt = prompts[index]
  const filter = decodeFilter(prompt)
  if (filter) {
    const was = (before.brief.relaxed ?? []).includes(filter.id)
      ? "good"
      : "must"
    const where =
      filter.to === "none"
        ? "Removed"
        : `Moved to ${filter.to === "must" ? "Must have" : "Good to have"}:`
    return {
      text: `${where} ${FILTER_LABEL[filter.id]}`,
      before: poolCount(before, brand),
      after: poolCount(after, brand),
      undo:
        filter.to === "none" ? null : encodeFilter({ id: filter.id, to: was }),
    }
  }
  const change = decodeChange(prompt)
  if (change && "skills" in change && before.draft.skills.length) {
    return {
      text: "Skills reordered: they rank people and remove nobody",
      before: poolCount(before, brand),
      after: poolCount(after, brand),
      undo: encodeChange({
        skills: encodeRanked(before.draft.skills, before.draft.niceSkills),
      }),
    }
  }
  return null
}

/** The skills, in the order the search weighs them, and how to move one. */
export function skillMoves(state: IntakeState) {
  const { skills, niceSkills } = state.draft
  const move = (skill: string, to: "key" | "nice") => {
    const must =
      to === "key"
        ? [...skills.filter((s) => s !== skill), skill]
        : skills.filter((s) => s !== skill)
    const nice =
      to === "nice"
        ? [skill, ...niceSkills.filter((s) => s !== skill)]
        : niceSkills.filter((s) => s !== skill)
    // A posting keeps at least one must-have skill.
    if (!must.length) return null
    return encodeChange({ skills: encodeRanked(must, nice) })
  }
  return { key: skills, nice: niceSkills, move }
}

// --- Insights you can apply -----------------------------------------------------

export type Nudge = { id: FieldId; label: string; prompt: string }

/**
 * Where the market says something that a one-tap change would act on — from
 * `/insights`' own city shares and pay percentiles, and the pool's own count
 * for a wider range. Nothing for a locked field, and nothing that would only
 * restate what is already there.
 */
export function nudgesFor(state: IntakeState, brand: Brand): Nudge[] {
  const { draft } = state
  const locked = state.locked ?? []
  const out: Nudge[] = []
  if (!draft.title) return out

  if (!locked.includes("locations") && draft.locations.length < 3) {
    const taken = draft.locations.map((place) => canonicalCity(place) ?? place)
    const next = CITIES.map((row) => ({
      ...row,
      name: canonicalCity(row.city) ?? row.city,
    })).find((row) => !taken.includes(row.name))
    if (next)
      out.push({
        id: "locations",
        label: `+ ${next.name} · ${next.share}% of profiles`,
        prompt: encodeChange({
          locations: [...draft.locations, next.name].join(", "),
        }),
      })
  }

  const market = {
    min: SALARY_PERCENTILES[1].expected,
    max: SALARY_PERCENTILES[3].expected,
  }
  if (!locked.includes("pay") && draft.pay?.max && draft.pay.max < market.min)
    out.push({
      id: "pay",
      label: `Below the market's middle (₹${market.min}–${market.max}L) · Raise to it`,
      prompt: encodeChange({ pay: `${market.min}-${market.max} lakh` }),
    })

  if (!locked.includes("experience") && draft.experience?.max) {
    const wider = {
      min: Math.max(0, draft.experience.min - 2),
      max: draft.experience.max + 2,
    }
    const now = poolCount(state, brand)
    const then = poolCount(
      { ...state, draft: { ...draft, experience: wider } },
      brand
    )
    if (then - now >= Math.max(100, now * 0.05))
      out.push({
        id: "experience",
        label: `Widen to ${yearsLabel(wider)} · +${(then - now).toLocaleString("en-IN")} people`,
        prompt: encodeChange({ experience: `${wider.min}-${wider.max} years` }),
      })
  }
  return out
}

// --- Sample people ---------------------------------------------------------------

/** The three the posting's search ranks first, checked line by line. */
export function samplesFor(state: IntakeState, brand: Brand) {
  if (!state.draft.title) return null
  const { params, pool } = postingSearch(state, brand)
  const criteria = params.getAll("crit")
  // The key skills' own lines — not "Has worked in…", which reads the same.
  const keys = new Set(state.draft.skills.map((skill) => `Has ${skill}`))
  return toReview(pool, criteria).map((reviewee) => {
    const person = personOf(reviewee)
    const keyLines = reviewee.verdicts.filter((verdict) =>
      keys.has(verdict.criterion)
    )
    return {
      person,
      met: keyLines.filter((verdict) => verdict.met).length,
      of: keyLines.length,
    }
  })
}

// --- The agent's status ------------------------------------------------------------

/** "Needs you", "Recent" and "Working on next", for the top of the rail. */
export function statusOf(
  state: IntakeState,
  provenance: Provenance,
  changes: Change[]
) {
  const needs = state.opener
    ? []
    : (Object.keys(FIELD_LABEL) as FieldId[]).filter(
        (id) => provenance[id] === "needs" && !state.skipped.includes(id)
      )
  const recent = [...changes].reverse().slice(0, 3)
  return { needs, recent }
}
