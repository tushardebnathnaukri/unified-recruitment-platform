import type { Brand } from "@workspace/ui/lib/brands"

import {
  COMPANY_INDUSTRIES,
  EXPERIENCE_BANDS,
  INDUSTRY_TAGS,
  LOCATIONS,
  companiesFor,
  schoolsFor,
} from "@/lib/applicants"
import { INSTITUTE_GROUPS, SECTIONS, writeRange } from "@/lib/database-filters"
import { readBack, type SmartChip, type SuggestionKind } from "@/lib/smart-hire"
import { roleIn, skillsForTitle } from "@/lib/title-intel"

/**
 * The questions Smart Hire asks before it goes looking.
 *
 * A CONVERSATION IS THE SHAPE, NOT THE POINT. The bar takes one sentence, and
 * one sentence is never a brief: it has a title and a city and nothing about
 * how soon, how senior, or what the person has to have done. This is the rest
 * of it, asked one question at a time because that is how somebody who knows
 * the job would ask — not as a fourteen-field form that has to be filled in
 * before anything happens.
 *
 * THE RULE: IT ONLY ASKS WHAT THE SEARCH CAN USE. Every question here lands on
 * a filter the results page already has — `cur`, `xp`, `ind`, `np`, `ctc`, or
 * the query text. Team size, who the role reports to and why it is open are
 * all things a recruiter would happily tell you and nothing downstream could
 * do anything with, so they are not asked. This is the same rule Athena works
 * under: answer (or here, ask) what the app can actually compute, and invent
 * nothing. It is what keeps the page from being a chatbot doing an impression
 * of understanding.
 *
 * NOTHING HERE IS A MODEL. The questions are a fixed set, the order is fixed,
 * and which ones get asked is decided by what the sentence already covered.
 * The transcript is DERIVED from the draft plus the answers — see
 * `transcriptFor` — so a reload rebuilds the conversation exactly, and the URL
 * stays the whole state of the page.
 */

export type QuestionId =
  | "location"
  | "experience"
  | "skills"
  | "industry"
  | "notice"
  | "pay"
  | "companies"
  | "alumni"

export type Option = { label: string; value: string }

export type Question = {
  id: QuestionId
  /** The URL key the answer lands on. Skills go into the query text instead. */
  param: string | null
  ask: string
  /** Said under the question, in smaller type. Why it is worth answering. */
  because: string
  /** What the answer can be tapped from. Typing is always allowed too. */
  options: (context: Context) => Option[]
  /** Pick several — cities and skills; everything else is one value. */
  multiple?: boolean
  /** Already answered by the sentence the recruiter wrote? */
  covered: (context: Context) => boolean
}

type Context = {
  draft: { text: string; chips: SmartChip[] }
  brand: Brand
  /** The role the sentence names, chip or prose. */
  role: string | null
}

/** Everything the sentence already pinned down, by kind. */
function recognised(context: Context): Set<SuggestionKind> {
  const kinds = new Set<SuggestionKind>()
  for (const chip of context.draft.chips) kinds.add(chip.kind)
  for (const part of readBack(context.draft.text, context.brand)) {
    if ("chip" in part) kinds.add(part.chip.kind)
  }
  return kinds
}

/**
 * The options a refine-panel section already owns.
 *
 * WRITING AN ANSWER IN THE WRONG DIALECT IS WORSE THAN NOT ASKING. The panel
 * reads `np` with `Number(value)` and `xp` by splitting on a dash, so a chat
 * that answered "now" or "12+" recorded something that looked right in the URL
 * and then either matched nobody or filtered nothing at all — silently, in both
 * directions. Anywhere the panel owns the vocabulary, the question reads it
 * from the section rather than keeping a second copy.
 */
function sectionOptions(key: string): Option[] {
  const section = SECTIONS.find((candidate) => candidate.key === key)
  return section && section.kind === "select"
    ? section.options.map((option) => ({
        label: option.label,
        value: option.value,
      }))
    : []
}

/** "9–14 years", "10+ yrs", "6+", or "fresher" — the same shape the bar ticks. */
const YEARS =
  /\b\d+\s*(?:\+|\s*(?:[–-]|to)\s*\d+)?\s*(?:years?|yrs?)\b|\b\d+\+|\bfreshers?\b/i

export const QUESTIONS: Question[] = [
  {
    id: "location",
    param: "cur",
    ask: "Where should they be?",
    because: "Pick as many cities as the role can take.",
    multiple: true,
    // The seven the generators deal, first and alone: a city nobody lives in
    // is a question that can only produce an empty result.
    options: () => LOCATIONS.map((city) => ({ label: city, value: city })),
    covered: (context) => recognised(context).has("location"),
  },
  {
    id: "experience",
    param: "xp",
    ask: "How much experience?",
    because: "The band matters more than the number.",
    // `xp` is a RANGE the panel reads by splitting on a dash, so the bands are
    // written through `writeRange` — `EXPERIENCE_BANDS`' own "12+" parses to
    // NaN there and quietly filters nothing.
    options: () => [
      { label: EXPERIENCE_BANDS[0].label, value: writeRange(null, 8)! },
      { label: EXPERIENCE_BANDS[1].label, value: writeRange(8, 12)! },
      { label: EXPERIENCE_BANDS[2].label, value: writeRange(12, null)! },
    ],
    covered: (context) => YEARS.test(context.draft.text),
  },
  {
    id: "skills",
    // No key of its own — the results read skills out of the query text, the
    // way a posting's required skills are read (`skillsIn` in applicants.ts).
    param: null,
    ask: "What do they need to have done?",
    because: "These come from the title. Take the ones that matter.",
    multiple: true,
    options: (context) =>
      context.role
        ? skillsForTitle(context.role, context.brand)
            .slice(0, 8)
            .map((proposal) => ({
              label: proposal.skill,
              value: proposal.skill,
            }))
        : [],
    covered: (context) =>
      context.draft.chips.some((chip) => chip.kind === "skill"),
  },
  {
    id: "industry",
    param: "ind",
    ask: "Any particular industry?",
    because: "Where they have done it, rather than what they did.",
    options: () =>
      [...new Set(Object.values(COMPANY_INDUSTRIES))].map((industry) => ({
        label: INDUSTRY_TAGS[industry] ?? industry,
        value: industry,
      })),
    covered: (context) => recognised(context).has("industry"),
  },
  {
    id: "notice",
    param: "np",
    ask: "How soon do you need them?",
    because: "Notice period is the thing that quietly decides a shortlist.",
    // The panel's own list: `np` is a select tested with `Number(value)`, so
    // `NOTICE_BANDS`' "now" would match nobody at all.
    options: () => sectionOptions("np").slice(0, 4),
    covered: () => false,
  },
  {
    id: "pay",
    param: "ctc",
    ask: "What can you pay?",
    because: "In lakhs a year. It narrows harder than anything else here.",
    options: () =>
      [
        ["Up to ₹25L", "-25"],
        ["₹25–50L", "25-50"],
        ["₹50–80L", "50-80"],
        ["₹80L+", "80-"],
      ].map(([label, value]) => ({ label, value })),
    covered: () => false,
  },

  /**
   * WHERE THEY HAVE WORKED AND WHERE THEY STUDIED, asked last on purpose.
   *
   * Both narrow hard and neither is a requirement — a recruiter who says "ideally
   * from Flipkart or Swiggy" will still take somebody from Meesho. Asking them
   * after the filters that actually define the role means the pool is already the
   * right shape before a preference cuts into it, and it is why the skip beside
   * each of them is the honest default rather than a way out.
   */
  {
    id: "companies",
    param: "org",
    ask: "Anywhere in particular they should be coming from?",
    because:
      "Matches anyone who has worked there, not just where they are now.",
    multiple: true,
    // The brand's own employers. Offering a company this pool never deals is
    // offering a way to filter it down to nobody.
    options: (context) =>
      companiesFor(context.brand).map((name) => ({
        label: name,
        value: name,
      })),
    covered: () => false,
  },
  {
    id: "alumni",
    param: "inst",
    ask: "Any institutes you hire from?",
    because: "The group covers all of them — IITs is every IIT.",
    multiple: true,
    options: (context) => {
      const schools = schoolsFor(context.brand)
      // A group is only worth offering when this pool has somebody in it.
      const groups = Object.entries(INSTITUTE_GROUPS)
        .filter(([, prefix]) =>
          schools.some((school) => school.startsWith(prefix))
        )
        .map(([group]) => ({ label: group, value: group }))

      return [
        ...groups,
        ...schools.map((school) => ({ label: school, value: school })),
      ]
    },
    covered: () => false,
  },
]

export function contextFor(
  draft: { text: string; chips: SmartChip[] },
  brand: Brand
): Context {
  const chip = draft.chips.find((c) => c.kind === "title")
  return { draft, brand, role: chip?.value ?? roleIn(draft.text) }
}

/**
 * The URL key that records a question the recruiter declined.
 *
 * A CHAT THAT CANNOT BE TOLD "DOESN'T MATTER" IS A FORM. On a pool this size,
 * "from Flipkart, and an IIT" is legitimately nobody, and every question here
 * is a preference rather than a fact — so each one can be waved away, and the
 * waving is recorded so a reload does not ask again.
 */
export const SKIP_KEY = "skip"

export function skippedFrom(params: URLSearchParams): Set<QuestionId> {
  return new Set(params.getAll(SKIP_KEY) as QuestionId[])
}

/** What is left to ask, in order. */
export function pending(
  context: Context,
  answered: Partial<Record<QuestionId, string[]>>,
  skipped: Set<QuestionId> = new Set()
): Question[] {
  return QUESTIONS.filter((question) => {
    if (answered[question.id]?.length) return false
    if (skipped.has(question.id)) return false
    if (question.covered(context)) return false
    // A question with nothing to offer and no key to write is not a question.
    return question.param !== null || question.options(context).length > 0
  })
}

/* -------------------------------------------------------------------------
   The transcript, derived. Nothing about the conversation is stored: it is a
   function of the sentence and the answers, both of which live in the URL, so
   a reload or a pasted link rebuilds it exactly.
   ------------------------------------------------------------------------- */

export type Turn =
  | { kind: "note"; id: string; text: string }
  | {
      kind: "ask"
      id: string
      text: string
      because: string
      question: Question
    }
  | { kind: "said"; id: string; text: string }
  | { kind: "done"; id: string; text: string }

/** What the opening line says it understood, in the recruiter's own terms. */
export function summarise(context: Context): string[] {
  const said: string[] = []
  const of = (kind: SuggestionKind) =>
    context.draft.chips.filter((chip) => chip.kind === kind)

  if (context.role) said.push(context.role)
  for (const chip of of("location")) said.push(`in ${chip.label}`)
  for (const chip of of("industry")) said.push(chip.label)
  for (const chip of of("skill")) said.push(chip.label)
  return said
}

/**
 * An answer in the words it was given in. The URL carries `xp=8-12` because
 * that is what the filter reads; the conversation has to read back "8–12 yrs",
 * which is what the recruiter actually tapped. Anything typed rather than
 * tapped has no option behind it and stands as it is.
 */
function labelFor(question: Question, value: string, context: Context) {
  return (
    question.options(context).find((option) => option.value === value)?.label ??
    value
  )
}

export function transcriptFor(
  context: Context,
  answered: Partial<Record<QuestionId, string[]>>,
  skipped: Set<QuestionId> = new Set()
): Turn[] {
  const turns: Turn[] = []
  const understood = summarise(context)

  turns.push({
    kind: "note",
    id: "opening",
    text: understood.length
      ? `From your description: ${understood.join(" · ")}`
      : "Let's fill in the brief.",
  })

  // Answered questions, in the order they are asked rather than the order they
  // were answered — the conversation reads as one pass down the list.
  for (const question of QUESTIONS) {
    const answer = answered[question.id]
    const waved = skipped.has(question.id)
    if (!answer?.length && !waved) continue

    turns.push({
      kind: "ask",
      id: `ask-${question.id}`,
      text: question.ask,
      because: question.because,
      question,
    })

    // A skipped question stays in the transcript, answered. Dropping it would
    // leave the conversation looking like it never asked.
    if (waved) {
      turns.push({
        kind: "said",
        id: `said-${question.id}`,
        text: "Doesn't matter",
      })
      continue
    }
    turns.push({
      kind: "said",
      id: `said-${question.id}`,
      text: answer!
        .map((value) => labelFor(question, value, context))
        .join(", "),
    })
  }

  const next = pending(context, answered, skipped)[0]

  if (next) {
    turns.push({
      kind: "ask",
      id: `ask-${next.id}`,
      text: next.ask,
      because: next.because,
      question: next,
    })
  } else {
    turns.push({
      kind: "done",
      id: "done",
      text: "That's enough to go on. I'll find people who match.",
    })
  }

  return turns
}

/**
 * The brief as a link.
 *
 * Answers land on the refine panel's own keys, so the requirement a
 * conversation gathered is the same requirement the results page filters by —
 * no second vocabulary, and the URL is the whole brief.
 */
export function briefHref(
  path: string,
  draft: { text: string; chips: SmartChip[] },
  answered: Partial<Record<QuestionId, string[]>>
): string {
  const params = new URLSearchParams()
  if (draft.text.trim()) params.set("q", draft.text.trim())

  for (const question of QUESTIONS) {
    const answer = answered[question.id]
    if (!answer?.length) continue
    if (question.param) {
      for (const value of answer) params.append(question.param, value)
    } else {
      // Skills have no key; they join the query, which is where the results
      // read them from.
      for (const value of answer) params.append("skill", value)
    }
  }

  const query = params.toString()
  return query ? `${path}?${query}` : path
}

/** Read the answers back out of a link. */
export function answersFrom(
  params: URLSearchParams
): Partial<Record<QuestionId, string[]>> {
  const answered: Partial<Record<QuestionId, string[]>> = {}

  for (const question of QUESTIONS) {
    const values = params.getAll(question.param ?? "skill")
    if (values.length) answered[question.id] = values
  }

  return answered
}
