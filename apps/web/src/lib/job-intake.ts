import type { Brand } from "@workspace/ui/lib/brands"

import { ENGINEERING_SKILLS, MANAGEMENT_SKILLS } from "@/lib/applicants"
import { criteriaFrom } from "@/lib/database"
import { readBack } from "@/lib/smart-hire"
import { JOB_LOCATIONS } from "@/lib/taxonomy"
import { roleIn, skillsForTitle } from "@/lib/title-intel"
import type { HiringBrief, RefineId } from "@/lib/job-refine"
import type { Origin } from "@/lib/job-start"

/**
 * The empty brief lives here rather than in `job-refine.ts` so this file
 * imports nothing but types from it — `job-refine` imports values from here,
 * and two files importing values from each other is a cycle.
 */
export const EMPTY_BRIEF: HiringBrief = {
  adjacentTitles: [],
  openToMovers: null,
  industries: [],
  ledTeam: null,
  targetCompanies: [],
  institutes: [],
  budget: null,
  exclusions: [],
}

/**
 * Posting a job, as a conversation — and as a form, from the same fields.
 *
 * ONE QUESTION TO OPEN, AND ONLY WHAT IS MISSING AFTER IT. "Who would you like
 * to hire?" is answered in a sentence, and a sentence usually carries more than
 * a title: "a senior product manager in Pune, 8–12 years" is three of the six
 * fields at once. Whatever the first answer pins down is never asked again —
 * the same rule the Smart Hire brief follows, for the same reason: a chat that
 * asks for the city you just told it is a form with extra steps.
 *
 * SIX FIELDS, NOT THE LIVE FORM'S TWENTY. What a posting cannot go up without
 * — the role, where, how senior, what they must know, what it pays, and how
 * they would work — and nothing a moderator or a plan decides. The form at
 * `/jobs/new` carries exactly these six plus the description they write, so
 * the conversation and the form are one draft in two shapes rather than two
 * vocabularies that happen to overlap.
 *
 * READ, NOT UNDERSTOOD. Every reader below is a pattern — a city from a list,
 * a span of years, a figure in lakhs — and the title comes from the product's
 * own title vocabulary or the shape of an English job title (`roleIn`). An
 * answer none of them can read is asked again with an example, not guessed at.
 *
 * THE CONVERSATION IS STILL THE URL. The agent page folds its `?ask=` turns
 * through `advanceIntake`, so the intake has no state of its own: the answers
 * are the turns, and the draft is what reading them in order produces. A link
 * mid-intake reopens mid-intake.
 */

export type WorkMode = "office" | "hybrid" | "remote"

/** Years, or lakh a year. `max` null is open-ended — "12+", "₹60L+". */
export type Span = { min: number; max: number | null }

export type PostingDraft = {
  title: string | null
  locations: string[]
  experience: Span | null
  pay: Span | null
  /** The must-haves, once refinement has split them; every skill before. */
  skills: string[]
  mode: WorkMode | null
  /**
   * THREE MORE, NOT ASKED FOR THE POSTING BUT PRINTED ON IT. Refinement is
   * about who to look for, and three of its answers are also things a
   * candidate should read: which skills are only a plus, how big a team the
   * role leads, and whether the move is paid for. They live on the draft
   * because the posting and the form are built from the draft.
   */
  niceSkills: string[]
  teamScale: string | null
  relocationSupport: boolean | null
  /**
   * The screening questions candidates answer when they apply — the form's
   * "Add Screening Questions", up to ten, set in the chat's Screening step.
   */
  screening: string[]
}

/** The six fields the posting stage asks for — not the three refinement adds. */
export type FieldId =
  "title" | "locations" | "experience" | "skills" | "pay" | "mode"

export const EMPTY_DRAFT: PostingDraft = {
  title: null,
  locations: [],
  experience: null,
  pay: null,
  skills: [],
  mode: null,
  niceSkills: [],
  teamScale: null,
  relocationSupport: null,
  screening: [],
}

export const REMOTE = "Remote"

export const WORK_MODES: { value: WorkMode; label: string }[] = [
  { value: "office", label: "In office" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
]

/** What an answer's words are scanned against — this product's own skills. */
export function skillPoolFor(brand: Brand) {
  return brand === "hirist" ? ENGINEERING_SKILLS : MANAGEMENT_SKILLS
}

// --- Reading ----------------------------------------------------------------

/**
 * The live form's location list, plus the spellings people actually type.
 *
 * TWO TAXONOMIES DISAGREE ABOUT ONE CITY. The generators deal "Bengaluru" and
 * the posting form offers "Bangalore"; NCR is five names in speech and one in
 * the form. A posting is written in the form's vocabulary, so what is heard is
 * mapped onto it rather than stored as typed.
 */
const LOCATION_ALIASES: Record<string, string> = {
  bengaluru: "Bangalore",
  gurugram: "Delhi NCR",
  gurgaon: "Delhi NCR",
  noida: "Delhi NCR",
  delhi: "Delhi NCR",
  "new delhi": "Delhi NCR",
  ncr: "Delhi NCR",
  bombay: "Mumbai",
  madras: "Chennai",
  anywhere: REMOTE,
  remote: REMOTE,
  wfh: REMOTE,
}

export function canonicalCity(text: string): string | null {
  const key = text.trim().toLowerCase()
  if (!key) return null
  if (LOCATION_ALIASES[key]) return LOCATION_ALIASES[key]
  return JOB_LOCATIONS.find((city) => city.toLowerCase() === key) ?? null
}

const NUMBER = String.raw`(\d{1,3}(?:\.\d+)?)`
const DASH = String.raw`\s*(?:-|–|—|to)\s*`
const LAKH = String.raw`\s*(?:l|lakhs?|lacs?|lpa)\b`
const CRORE = String.raw`\s*(?:cr|crores?)\b`
const YRS = String.raw`\s*(?:years?|yrs?)\b`

/**
 * Pay, in lakh a year. Read BEFORE years, and cut out of the sentence, because
 * "20–35L" and "8–12 years" are the same shape less a unit — read in the other
 * order, a pay range became an experience band.
 */
export function readPay(
  text: string,
  { bare = false }: { bare?: boolean } = {}
): { span: Span; rest: string } | null {
  const patterns: [RegExp, (m: RegExpExecArray) => Span][] = [
    [
      new RegExp(`₹?\\s*${NUMBER}${DASH}₹?\\s*${NUMBER}${CRORE}`, "i"),
      (m) => ({ min: Number(m[1]) * 100, max: Number(m[2]) * 100 }),
    ],
    [
      new RegExp(
        `₹?\\s*${NUMBER}(?:${LAKH})?${DASH}₹?\\s*${NUMBER}${LAKH}`,
        "i"
      ),
      (m) => ({ min: Number(m[1]), max: Number(m[2]) }),
    ],
    [
      new RegExp(`up\\s*to\\s*₹?\\s*${NUMBER}${LAKH}`, "i"),
      (m) => ({ min: 0, max: Number(m[1]) }),
    ],
    [
      new RegExp(`₹?\\s*${NUMBER}${LAKH}\\s*\\+`, "i"),
      (m) => ({ min: Number(m[1]), max: null }),
    ],
    [
      new RegExp(`up\\s*to\\s*₹?\\s*${NUMBER}${CRORE}`, "i"),
      (m) => ({ min: 0, max: Number(m[1]) * 100 }),
    ],
    [
      new RegExp(`₹?\\s*${NUMBER}${CRORE}`, "i"),
      (m) => ({ min: Number(m[1]) * 100, max: Number(m[1]) * 100 }),
    ],
    [
      new RegExp(`₹?\\s*${NUMBER}${LAKH}`, "i"),
      (m) => ({ min: Number(m[1]), max: Number(m[1]) }),
    ],
  ]

  // Asked "what can you pay?", a bare "20-35" can only mean lakh.
  if (bare) {
    patterns.push(
      [
        new RegExp(`^₹?\\s*${NUMBER}${DASH}₹?\\s*${NUMBER}$`, "i"),
        (m) => ({ min: Number(m[1]), max: Number(m[2]) }),
      ],
      [
        new RegExp(`^₹?\\s*${NUMBER}\\s*\\+$`, "i"),
        (m) => ({ min: Number(m[1]), max: null }),
      ]
    )
  }

  for (const [pattern, toSpan] of patterns) {
    const match = pattern.exec(text)
    if (!match) continue
    const span = toSpan(match)
    if (span.max !== null && span.max < span.min) continue
    return { span, rest: text.replace(match[0], " ") }
  }
  return null
}

/** Years. `bare` accepts "8-12" and "6" on their own, as an answer would. */
export function readYears(
  text: string,
  { bare = false }: { bare?: boolean } = {}
): Span | null {
  if (/\bfreshers?\b/i.test(text)) return { min: 0, max: 1 }

  const patterns: [RegExp, (m: RegExpExecArray) => Span][] = [
    [
      new RegExp(`${NUMBER}${DASH}${NUMBER}${YRS}`, "i"),
      (m) => ({ min: Number(m[1]), max: Number(m[2]) }),
    ],
    [
      new RegExp(`${NUMBER}\\s*\\+(?:${YRS})?`, "i"),
      (m) => ({ min: Number(m[1]), max: null }),
    ],
    [
      new RegExp(`${NUMBER}${YRS}`, "i"),
      (m) => ({ min: Number(m[1]), max: null }),
    ],
  ]
  if (bare) {
    patterns.push(
      [
        new RegExp(`^${NUMBER}${DASH}${NUMBER}$`),
        (m) => ({ min: Number(m[1]), max: Number(m[2]) }),
      ],
      [new RegExp(`^${NUMBER}$`), (m) => ({ min: Number(m[1]), max: null })]
    )
  }

  for (const [pattern, toSpan] of patterns) {
    const match = pattern.exec(text.trim())
    if (!match) continue
    const span = toSpan(match)
    if (span.max !== null && span.max < span.min) continue
    // Nobody posts for 60 years of experience; that was a number in a sentence.
    if (span.min > 40) continue
    return span
  }
  return null
}

export function readMode(text: string): WorkMode | null {
  if (/\b(remote|wfh|work from home|anywhere)\b/i.test(text)) return "remote"
  if (/\bhybrid\b/i.test(text)) return "hybrid"
  if (/\b(in[- ]?office|on[- ]?site|office|in person)\b/i.test(text))
    return "office"
  return null
}

/** Every city named in a sentence, in the form's own spelling. */
function readLocations(text: string, brand: Brand): string[] {
  const found: string[] = []
  for (const part of readBack(text, brand)) {
    if ("chip" in part && part.chip.kind === "location") {
      // "UP", "MP": a state in capitals and an ordinary word in lower case.
      // readBack matches case-blind, so "up to ₹60L" was posting a job in
      // Uttar Pradesh.
      const label = part.chip.label
      if (label.length <= 3 && !new RegExp(`\\b${label}\\b`).test(text)) {
        continue
      }
      const city = canonicalCity(part.chip.value) ?? label
      if (!found.includes(city)) found.push(city)
    }
  }
  const spotted = criteriaFrom(text).location
  const city = spotted ? canonicalCity(spotted) : null
  if (city && !found.includes(city)) found.push(city)
  for (const word of Object.keys(LOCATION_ALIASES)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) {
      const alias = LOCATION_ALIASES[word]
      if (!found.includes(alias)) found.push(alias)
    }
  }
  return found
}

const capitalise = (text: string) =>
  text.replace(
    /(^|\s)([a-z])/g,
    (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`
  )

const SMALL_WORDS = new Set(["of", "and", "for", "the", "in", "at", "to"])

/** "senior head of marketing" → "Senior Head of Marketing". */
export function titleCase(text: string) {
  return capitalise(text.trim())
    .split(" ")
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word.toLowerCase())
        ? word.toLowerCase()
        : word
    )
    .join(" ")
}

/**
 * The role in a sentence.
 *
 * The product's own title vocabulary first — a chip is a title somebody else
 * already agreed is one. Then `roleIn`, which finds the head noun ("manager",
 * "engineer", "head") and the qualifiers in front of it; this adds what comes
 * AFTER it when that is "of something", because "Head" is not a posting and
 * "Head of Marketing" is. Then, for an answer of a few words with nothing else
 * in it, the answer itself: "Chief of Staff" has no head noun in the list and
 * is still obviously a title.
 */
export function readTitle(text: string, brand: Brand): string | null {
  const parts = readBack(text, brand)
  const chip = parts.find(
    (part): part is Extract<typeof part, { chip: unknown }> =>
      "chip" in part && part.chip.kind === "title"
  )
  const role = roleIn(text)

  // The vocabulary's chip unless the sentence says MORE than it: "Product
  // Manager" is a title the product knows, and "senior product manager" is
  // the one the recruiter asked for.
  if (
    chip &&
    !(
      role &&
      role.length > chip.chip.label.length &&
      role.toLowerCase().includes(chip.chip.label.toLowerCase())
    )
  ) {
    return chip.chip.label
  }

  if (role) {
    const at = text.toLowerCase().indexOf(role.toLowerCase())
    const after = at >= 0 ? text.slice(at + role.length) : ""
    const tail = /^\s+(of|for)\s+([A-Za-z&]+(?:\s+[A-Za-z&]+)?)/i.exec(after)
    // Stop at the words that start the rest of the sentence.
    const objectWords = tail?.[2].split(/\s+/) ?? []
    const cut = objectWords.findIndex((w) =>
      /^(in|with|at|who|to|and)$/i.test(w)
    )
    const object = (cut === -1 ? objectWords : objectWords.slice(0, cut)).join(
      " "
    )
    return titleCase(object ? `${role} ${tail![1]} ${object}` : role)
  }

  const words = text
    .trim()
    .replace(/^(a|an|the)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
  const anythingElse =
    parts.some((part) => "chip" in part) ||
    readYears(text) !== null ||
    readPay(text) !== null
  if (words.length && words.length <= 5 && !anythingElse) {
    return titleCase(words.join(" "))
  }
  return null
}

/** A list someone typed: commas, "and", slashes. */
function listOf(text: string) {
  return text
    .split(/,|\band\b|\/|&|;/i)
    .map((part) => part.trim())
    .filter(Boolean)
}

// --- Skills, ranked -------------------------------------------------------------

/**
 * THE SKILLS ARE ASKED ONCE, AS A RANKING. They used to be asked twice: tick
 * the ones that matter, then — first thing in refinement — tick which of those
 * are must-haves. Both were the same list and the same judgement. Now the one
 * question is an ordered list with a line through it: above the line decides
 * who is shortlisted, below only ranks them, and the order is the order the
 * search weighs them in (`crit`, which Best match reads top down).
 *
 * THE CARD'S ANSWER IS WRITTEN IN WORDS, so the bubble and the model can read
 * it as they would anything typed: "Must have: A, B · Good to have: C". The
 * prefix is what marks it as a ranking rather than a list somebody typed, and
 * it is always there — without it a ranking with nothing below the line would
 * read the same as a typed list of some of the skills.
 */
const RANKED =
  /^\s*must.?haves?:\s*(.*?)(?:\s*·\s*good.?to.?haves?:\s*(.*?))?\s*$/is

/** Commas and "and" split skills; a slash does not, or UI/UX is two skills. */
function skillsIn(text: string) {
  return text
    .split(/,|;|\band\b|&/i)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function encodeRanked(must: string[], nice: string[]) {
  const head = `Must have: ${must.join(", ")}`
  return nice.length ? `${head} · Good to have: ${nice.join(", ")}` : head
}

/** A ranking the card sent, or null for text that is not one. */
export function readRanked(
  answer: string
): { must: string[]; nice: string[] } | null {
  const match = RANKED.exec(answer)
  if (!match) return null
  const must = [...new Set(skillsIn(match[1] ?? ""))]
  const nice = [...new Set(skillsIn(match[2] ?? ""))].filter(
    (skill) => !must.includes(skill)
  )
  // Something always sits above the line: a posting of nothing but
  // good-to-haves has no must-haves to shortlist on.
  if (!must.length && nice.length)
    return { must: nice.slice(0, 1), nice: nice.slice(1) }
  return must.length ? { must, nice } : null
}

/** How many suggestions start above the line when the title says nothing. */
const MUST_BY_DEFAULT = 3

/**
 * Where a list of suggested skills starts: the ones the title marks as
 * must-haves above the line, or — where it marks none, as hirist's pool never
 * does — the top three, since the list is already in order of fit.
 */
export function rankFor(title: string | null, skills: string[], brand: Brand) {
  const proposals = title ? skillsForTitle(title, brand) : []
  const flagged = skills.filter((skill) =>
    proposals.some(
      (proposal) => proposal.skill === skill && proposal.tier === "must"
    )
  )
  const must = flagged.length ? flagged : skills.slice(0, MUST_BY_DEFAULT)
  return { must, nice: skills.filter((skill) => !must.includes(skill)) }
}

/**
 * Everything a first answer — or an attached JD — says about the posting.
 *
 * Pay is read and CUT before years (see `readPay`); a JD's title is its first
 * short line, because that is where a JD keeps it and `roleIn` over a whole
 * document finds the first "manager" in the body instead.
 */
export function readDescription(
  text: string,
  brand: Brand,
  { document = false }: { document?: boolean } = {}
): Partial<PostingDraft> {
  const pay = readPay(text)
  const rest = pay ? pay.rest : text

  const firstLine = document
    ? text
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.length > 2 && line.length < 90)
    : undefined

  const locations = readLocations(rest, brand)
  const mode = locations.includes(REMOTE) ? "remote" : readMode(rest)

  const lower = text.toLowerCase()
  const skills = document
    ? skillPoolFor(brand).filter((skill) => lower.includes(skill.toLowerCase()))
    : []

  const out: Partial<PostingDraft> = {}
  const title = firstLine ?? readTitle(rest, brand)
  if (title) out.title = title
  if (locations.length) out.locations = locations
  const years = readYears(rest)
  if (years) out.experience = years
  if (pay) out.pay = pay.span
  if (mode) out.mode = mode
  if (skills.length) out.skills = skills
  return out
}

// --- Saying it back ---------------------------------------------------------

const lakh = (n: number) =>
  n >= 100 ? `₹${+(n / 100).toFixed(2)}Cr` : `₹${+n.toFixed(1)}L`

export function yearsLabel({ min, max }: Span) {
  if (max === null) return `${min}+ years`
  if (min === max) return `${min} years`
  return `${min}–${max} years`
}

export function payLabel({ min, max }: Span) {
  if (max === null) return `${lakh(min)}+ a year`
  if (min === 0) return `Up to ${lakh(max)} a year`
  if (min === max) return `${lakh(min)} a year`
  // One unit for the pair where they share one: "₹40–60L", not "₹40L–60L".
  if (max < 100) return `₹${+min.toFixed(1)}–${+max.toFixed(1)}L a year`
  return `${lakh(min)}–${lakh(max).slice(1)} a year`
}

export function modeLabel(mode: WorkMode) {
  return WORK_MODES.find((option) => option.value === mode)!.label
}

/** The posting's facts as rows — the summary card, and nothing invented. */
export function summaryRows(draft: PostingDraft) {
  return [
    // The job, then the requirements — the stepper's two groups.
    { label: "Role", value: draft.title ?? "—" },
    {
      label: "Location",
      value: draft.locations.length ? draft.locations.join(", ") : "—",
    },
    { label: "Pay", value: draft.pay ? payLabel(draft.pay) : "Not disclosed" },
    { label: "Work mode", value: draft.mode ? modeLabel(draft.mode) : "—" },
    ...(draft.teamScale ? [{ label: "Team", value: draft.teamScale }] : []),
    ...(draft.relocationSupport
      ? [{ label: "Relocation", value: "Supported" }]
      : []),
    {
      label: "Experience",
      value: draft.experience ? yearsLabel(draft.experience) : "—",
    },
    {
      label: draft.niceSkills.length ? "Must have" : "Skills",
      value: draft.skills.length ? draft.skills.join(", ") : "None listed",
    },
    ...(draft.niceSkills.length
      ? [{ label: "Good to have", value: draft.niceSkills.join(", ") }]
      : []),
    ...(draft.screening.length
      ? [
          {
            label: "Screening",
            value: `${draft.screening.length} question${draft.screening.length === 1 ? "" : "s"}`,
          },
        ]
      : []),
  ]
}

/**
 * The description, written from the draft.
 *
 * EVERY SENTENCE IS ONE OF THE FIELDS SAID ALOUD. Nothing here describes the
 * team, the company or the mission, because none of that was asked and all of
 * it would be invented — a posting with a paragraph of confident filler is
 * the version a recruiter publishes without reading. What is missing stays
 * missing; the form is where it gets written.
 */
export function describePosting(draft: PostingDraft) {
  const title = draft.title ?? "this role"
  const where = draft.locations.filter((city) => city !== REMOTE)
  const place =
    draft.mode === "remote"
      ? "The role is remote."
      : where.length
        ? `The role is based in ${where.join(" or ")}${
            draft.mode === "hybrid" ? ", working hybrid" : ""
          }.`
        : draft.mode === "hybrid"
          ? "The role is hybrid."
          : ""

  const team = draft.teamScale ? `${sentence(draft.teamScale)}` : ""
  const move = draft.relocationSupport ? "Relocation support is available." : ""
  const lines = [
    "About the role",
    [`We are hiring a ${title}.`, place, team, move].filter(Boolean).join(" "),
  ]

  const needs = [
    draft.experience
      ? `${yearsLabel(draft.experience)} of relevant experience`
      : null,
    ...draft.skills.map((skill) => `Hands-on depth in ${skill}`),
  ].filter((line) => line !== null)

  if (needs.length) {
    lines.push("", "What you will need", ...needs.map((line) => `• ${line}`))
  }

  if (draft.niceSkills.length) {
    lines.push(
      "",
      "Good to have",
      ...draft.niceSkills.map((skill) => `• ${skill}`)
    )
  }

  if (draft.pay) lines.push("", "Pay", payLabel(draft.pay))

  return lines.join("\n")
}

/** "leads a team of 8" → "Leads a team of 8." */
function sentence(text: string) {
  const trimmed = text.trim().replace(/\.$/, "")
  return `${trimmed[0].toUpperCase()}${trimmed.slice(1)}.`
}

// --- The link between the chat and the form ---------------------------------

const span = (value: Span) => `${value.min}-${value.max ?? ""}`

function readSpan(value: string | null): Span | null {
  if (!value) return null
  const [low, high] = value.split("-")
  const min = Number(low)
  if (!Number.isFinite(min)) return null
  const max = high ? Number(high) : null
  return { min, max: max !== null && Number.isFinite(max) ? max : null }
}

/**
 * The form, opened on this draft.
 *
 * The keys are the form's own and nothing else reads them — `loc`, not the
 * refine panel's `cur`, because a posting's cities are where the job IS and a
 * search's are where people are, and a link that wrote one into the other
 * would quietly turn a posting into a filter.
 */
export function postingHref(
  draft: PostingDraft,
  { industries = [] }: { industries?: string[] } = {}
) {
  const params = new URLSearchParams()
  if (draft.title) params.set("title", draft.title)
  for (const city of draft.locations) params.append("loc", city)
  if (draft.experience) params.set("xp", span(draft.experience))
  if (draft.pay) params.set("pay", span(draft.pay))
  for (const skill of draft.skills) params.append("skill", skill)
  if (draft.mode) params.set("mode", draft.mode)
  for (const skill of draft.niceSkills) params.append("nice", skill)
  if (draft.teamScale) params.set("team", draft.teamScale)
  if (draft.relocationSupport) params.set("reloc", "1")
  for (const question of draft.screening) params.append("sq", question)
  // Not a posting field in the chat but a required one on the form, and the
  // chat's opener asks for it — so the brief's industries come along.
  for (const industry of industries) params.append("ind", industry)
  const query = params.toString()
  return query ? `/jobs/new?${query}` : "/jobs/new"
}

/**
 * A link to the form that remembers the chat it came from, as `?chat=` — the
 * chat's own URL, `/dashboard/c/<id>`, which opens that conversation. Any other
 * link passes through untouched.
 */
export function withChat(to: string, chat: string) {
  if (!to.startsWith("/jobs/new")) return to
  const [path, query = ""] = to.split("?")
  const params = new URLSearchParams(query)
  params.set("chat", chat)
  return `${path}?${params}`
}

/**
 * The chat to go back to, if the form was opened from one. Only ever this
 * app's Dashboard (the Agent) — a `?chat=` pointing anywhere else is ignored, so the
 * link cannot be turned into a redirect to another site.
 */
export function chatFrom(params: URLSearchParams) {
  const chat = params.get("chat")
  // `/agent…` too: a form link from before the rename, which now redirects.
  return chat && /^\/(dashboard|agent)(\/c\/[a-z0-9]+)?(\?|$)/.test(chat)
    ? chat
    : null
}

export function draftFrom(params: URLSearchParams): PostingDraft {
  const mode = params.get("mode")
  return {
    title: params.get("title"),
    locations: params.getAll("loc"),
    experience: readSpan(params.get("xp")),
    pay: readSpan(params.get("pay")),
    skills: params.getAll("skill"),
    mode: WORK_MODES.some((option) => option.value === mode)
      ? (mode as WorkMode)
      : null,
    niceSkills: params.getAll("nice"),
    teamScale: params.get("team"),
    relocationSupport: params.get("reloc") === "1" ? true : null,
    screening: params.getAll("sq"),
  }
}

// --- The conversation -------------------------------------------------------

type Question = {
  id: FieldId
  ask: string
  /** Asked again, when the last answer could not be read. */
  retry: string
  hint: string
  options: (draft: PostingDraft, brand: Brand) => string[]
  /** The title is the one thing a posting cannot go up without. */
  skippable: boolean
  /** Checkboxes rather than radios in the questionnaire: cities and skills. */
  multiple?: boolean
  /** What saying "skip" sounds like, said back. */
  skipped: string
  read: (answer: string, brand: Brand) => Partial<PostingDraft> | null
}

/**
 * The opener's examples. PER-BRAND DATA, NOT A FORK: iimjobs is management
 * hiring and hirist is technology, so an example sentence from the other
 * product's market would teach the wrong shape of answer.
 */
const EXAMPLES: Record<Brand, string[]> = {
  iimjobs: [
    "A Head of Marketing in Mumbai, 12+ years",
    "A Financial Controller in Bangalore with 8–12 years, hybrid",
  ],
  hirist: [
    "A Senior Backend Engineer in Bangalore, 5–8 years",
    "An Engineering Manager in Pune with 10+ years, up to ₹60L",
  ],
}

/** The asking order: the job (what, where, pay, mode), then the requirements
 *  (years, skills) — see `JOB_FIELDS` / `REQUIREMENT_FIELDS` below. */
const QUESTIONS: Question[] = [
  {
    id: "title",
    ask: "Who would you like to hire?",
    retry:
      'I couldn\'t find a job title in that. What is the role called — "Head of Marketing", say?',
    hint: "Say it in a sentence — the role, where they'd work, how senior. I'll only ask about what's missing.",
    options: (_, brand) => EXAMPLES[brand],
    skippable: false,
    skipped: "",
    // Whatever the sentence pinned down is kept even without a title — "Pune"
    // is still Pune — and the title is asked again, because it is still empty.
    read: (answer, brand) => {
      const read = readDescription(answer, brand)
      return Object.keys(read).length ? read : null
    },
  },
  {
    id: "locations",
    ask: "Where will they work?",
    retry: "I didn't recognise a city in that. Which city — or is it remote?",
    hint: 'One city or several. Say "remote" if it\'s anywhere.',
    multiple: true,
    options: () => [
      "Delhi NCR",
      "Mumbai",
      "Bangalore",
      "Hyderabad",
      "Pune",
      "Chennai",
      REMOTE,
    ],
    skippable: true,
    skipped: "No location, then.",
    read: (answer) => {
      const cities = listOf(answer)
        .map(
          (part) =>
            canonicalCity(part) ??
            (/^[a-z ]{3,30}$/i.test(part) ? titleCase(part) : null)
        )
        .filter((city) => city !== null)
      if (!cities.length) return null
      const unique = [...new Set(cities)]
      return {
        locations: unique,
        ...(unique.includes(REMOTE) ? { mode: "remote" as const } : {}),
      }
    },
  },
  {
    id: "pay",
    ask: "What's the pay range?",
    retry: 'I need a figure in lakhs a year — "20–35L", "up to 60L", "1.2 Cr".',
    hint: 'In lakhs a year. Skip it and the posting says "Not disclosed".',
    options: () => ["₹10–20L", "₹20–35L", "₹35–60L", "₹60L+"],
    skippable: true,
    skipped: "Pay not disclosed, then.",
    read: (answer) => {
      const pay = readPay(answer, { bare: true })
      return pay ? { pay: pay.span } : null
    },
  },
  {
    id: "mode",
    ask: "In the office, hybrid or remote?",
    retry: "Is that in the office, hybrid or remote?",
    hint: "The last one.",
    options: () => WORK_MODES.map((option) => option.label),
    skippable: true,
    skipped: "Left open, then.",
    read: (answer) => {
      const mode = readMode(answer)
      return mode ? { mode } : null
    },
  },
  {
    id: "experience",
    ask: "How much experience should they have?",
    retry: 'I need a number of years — "5–8", "12+", or "fresher".',
    hint: "The band matters more than the exact number.",
    options: () => [
      "0–2 years",
      "2–5 years",
      "5–8 years",
      "8–12 years",
      "12+ years",
    ],
    skippable: true,
    skipped: "Any experience, then.",
    read: (answer) => {
      const years = readYears(answer, { bare: true })
      return years ? { experience: years } : null
    },
  },
  {
    id: "skills",
    ask: "Which skills matter most?",
    retry: 'Name them with commas between — "Forecasting, Key accounts".',
    hint: "Suggested from the title, most important first. Above the line decides who is shortlisted; below only ranks them. Drag to reorder, or add your own.",
    multiple: true,
    // Drawn as a ranking (`rank` on the item), not as ticks — see `readRanked`.
    options: (draft, brand) =>
      draft.title
        ? skillsForTitle(draft.title, brand)
            .slice(0, 6)
            .map((proposal) => proposal.skill)
        : [],
    skippable: true,
    skipped: "No skills listed, then.",
    read: (answer) => {
      const ranked = readRanked(answer)
      if (ranked) return { skills: ranked.must, niceSkills: ranked.nice }
      const skills = skillsIn(answer)
      return skills.length ? { skills } : null
    },
  },
]

/**
 * THE SIX FIELDS IN TWO GROUPS, which is the order they are asked in and the
 * order the stepper ticks them off: what the job IS — title, where, pay, how
 * it is worked — and then what the candidate MUST HAVE — years and skills.
 * A recruiter reads "job details" and "candidate requirements" as two things,
 * so the posting stage is two steps rather than one, and pay is asked before
 * experience because it belongs to the job rather than to the person.
 */
export const JOB_FIELDS: FieldId[] = ["title", "locations", "pay", "mode"]
export const REQUIREMENT_FIELDS: FieldId[] = ["experience", "skills"]

const SKIP =
  /^(skip|no|none|nope|n\/?a|any|not sure|doesn'?t matter|don'?t know|pass)\.?$/i

export function isSkip(text: string) {
  return SKIP.test(text.trim())
}

export const SKIP_LABEL = "Skip"

export function filled(draft: PostingDraft, id: FieldId) {
  const value = draft[id]
  return Array.isArray(value) ? value.length > 0 : value !== null
}

export type IntakeState = {
  /**
   * POSTING, THEN REFINE, THEN DONE. The six fields make a posting; the
   * refinement that follows sharpens who to look for (`job-refine.ts`); done
   * is the finished card. One state carries all three so the conversation is
   * one conversation — a correction during refinement still reaches the draft.
   */
  stage: "posting" | "refine" | "screen" | "done"
  draft: PostingDraft
  skipped: FieldId[]
  /** The private half — who to search for and screen on. Never posted. */
  brief: HiringBrief
  /** The refinement topics this posting gets, in asking order. At most four. */
  plan: RefineId[]
  /** Refinement topics answered or skipped. */
  settled: RefineId[]
  /**
   * The skills were ranked on the card, so which are must-haves is already
   * said — even when nothing went below the line, which leaves no trace on
   * the draft. Keeps refinement from asking the same question again.
   */
  ranked?: boolean
  /** The question being asked, or null once there is nothing left to ask. */
  asking: FieldId | RefineId | null
  /**
   * What the last answer said back in prose — a skip, a refusal, the model's
   * own words when nothing was recorded. What it RECORDED is `noted`.
   */
  heard: string | null
  /**
   * What the last answer recorded, one row per fact, drawn under "Got it." as
   * a label and its value. Cleared at the start of every turn (`advance`,
   * `advanceWithAi`), so a turn that records nothing does not repeat the last.
   */
  noted?: Noted
  /** The last answer could not be read, so the question is asked again. */
  missed: boolean
  /**
   * Who read the last answer. Shown on the page, because a design review
   * needs to know whether a good reply came from the model or from a regex —
   * and the rules are what answer whenever Gemini is not configured.
   */
  engine: "gemini" | "rules"
  /**
   * Why the rules answered when Gemini was meant to: no key on the AI server
   * (or no server), or a call that failed. Absent when nothing was asked of it.
   */
  fallback?: "unconfigured" | "failed"
  /**
   * The model's own wording for the questions it is about to be asked, by id.
   * Only kept for questions the page was going to ask anyway; anything absent
   * is asked in the rules' words.
   */
  phrasings?: Record<string, Phrasing>
  /**
   * TRUE UNTIL THE FIRST ANSWER. "Who would you like to hire?" is asked in the
   * chat, because a sentence can fill three fields at once; everything after
   * it is asked as one questionnaire of whatever is still missing.
   */
  opener: boolean
  /**
   * How the posting starts — from a JD, from scratch, or copied from one of
   * the recruiter's jobs (`lib/job-start.ts`). Null until they have said,
   * which is the first thing asked.
   */
  origin: Origin | null
  /** The job it was copied from, as the card named it. */
  basedOn?: string
  /** Questions that were answered but could not be read — asked again. */
  unread?: string[]
  /**
   * How long the recruiter waited for this reading, in ms — measured by the
   * page around the call, so it includes the network and not only the model.
   */
  took?: number
}

export type Phrasing = { ask: string; hint: string; options: string[] }

/**
 * One question in a questionnaire, whichever stage it is from — the shape the
 * page draws, and the only thing it needs to know about a question.
 */
export type AskedItem = {
  /**
   * A posting field, a refinement topic, the screening step, one of the two
   * start questions — or a search question (`lib/intake.ts`). A string, so
   * the two conversations share one card.
   */
  id: string
  prompt: string
  hint: string
  options: string[]
  multiple: boolean
  required: boolean
  /** Said with a question whose last answer could not be read. */
  note?: string
  /**
   * Drawn as a ranking instead of choices — the skills, and the must-haves
   * split when the skills came from a JD. Where the list starts.
   */
  rank?: { must: string[]; nice: string[] }
  /**
   * What the answer is NOW, when a question is asked again to change it: the
   * matching options come up ticked, and a value that is not one of them
   * sits in "Something else".
   */
  current?: string[]
  /**
   * What several ticks are joined with in the answer — ", " unless the
   * values can hold commas themselves (screening questions: a newline).
   */
  separator?: string
}

export function nextQuestion(draft: PostingDraft, skipped: FieldId[]) {
  return (
    QUESTIONS.find(
      (question) =>
        !filled(draft, question.id) && !skipped.includes(question.id)
    )?.id ?? null
  )
}

export function startIntake(): IntakeState {
  return {
    stage: "posting",
    draft: EMPTY_DRAFT,
    skipped: [],
    brief: EMPTY_BRIEF,
    plan: [],
    settled: [],
    asking: "title",
    heard: null,
    missed: false,
    engine: "rules",
    opener: true,
    origin: null,
  }
}

export type Noted = { label: string; value: string }[]

/** What an answer changed, as rows — labelled the way the summary card is. */
export function notedFrom(change: Partial<PostingDraft>): Noted {
  const rows: [string, string | null | undefined][] = [
    ["Role", change.title],
    ["Location", change.locations?.join(", ")],
    ["Experience", change.experience ? yearsLabel(change.experience) : null],
    [
      change.niceSkills?.length ? "Must have" : "Skills",
      change.skills?.join(", "),
    ],
    ["Good to have", change.niceSkills?.join(", ")],
    ["Pay", change.pay ? payLabel(change.pay) : null],
    ["Work mode", change.mode ? modeLabel(change.mode) : null],
  ]
  return rows.flatMap(([label, value]) => (value ? [{ label, value }] : []))
}

/**
 * One answer, applied.
 *
 * An answer is read against the question it answers — "8" means eight years
 * when the question is experience — and then merged; it never overwrites a
 * field the recruiter already gave. The next question is whatever is still
 * empty and not skipped, which is how a first sentence that named the city
 * skips "Where will they work?" without anything having to say so.
 */
export function advanceIntake(
  state: IntakeState,
  answer: string,
  brand: Brand,
  { document = false }: { document?: boolean } = {}
): IntakeState {
  const question = QUESTIONS.find((entry) => entry.id === state.asking)
  if (!question) return state

  // Whatever the last turn was, THIS one is the rules' — so neither the
  // model's label nor its wording for the previous question carries over.
  const ruled = {
    engine: "rules" as const,
    phrasings: undefined,
    fallback: undefined,
  }

  if (!document && SKIP.test(answer.trim())) {
    if (!question.skippable)
      return { ...state, ...ruled, heard: null, missed: true }
    const skipped = [...state.skipped, question.id]
    return {
      ...state,
      ...ruled,
      skipped,
      asking: nextQuestion(state.draft, skipped),
      heard: question.skipped,
      missed: false,
    }
  }

  // An attached JD answers everything it can at once, whichever question was up.
  const change = document
    ? readDescription(answer, brand, { document: true })
    : question.read(answer, brand)

  if (!change || (document && !Object.keys(change).length)) {
    return { ...state, ...ruled, heard: null, missed: true }
  }

  const draft = { ...state.draft }
  const kept: Partial<PostingDraft> = {}
  for (const key of Object.keys(change) as FieldId[]) {
    if (filled(draft, key)) continue
    Object.assign(draft, { [key]: change[key] })
    Object.assign(kept, { [key]: change[key] })
  }

  const asking = nextQuestion(draft, state.skipped)
  return {
    ...state,
    draft,
    skipped: state.skipped,
    asking,
    heard: null,
    noted: notedFrom(kept),
    // Answered around the question rather than to it: what it did say is
    // kept, and the question comes back in its "I couldn't read that" form.
    missed: !document && asking === question.id,
    ...ruled,
  }
}

/** The question being asked, as the page draws it. */
export function questionFor(state: IntakeState, brand: Brand) {
  const question = QUESTIONS.find((entry) => entry.id === state.asking)
  if (!question) return null
  const skip = question.skippable ? SKIP_LABEL : undefined
  const phrasing = state.phrasings?.[question.id]
  if (phrasing) return { ...phrasing, skip }
  return {
    ask: state.missed ? question.retry : question.ask,
    hint: question.hint,
    options: question.options(state.draft, brand),
    skip,
  }
}

/** Every posting field still to ask, in asking order. */
export function remainingFields(draft: PostingDraft, skipped: FieldId[]) {
  return QUESTIONS.filter(
    (question) => !filled(draft, question.id) && !skipped.includes(question.id)
  ).map((question) => question.id)
}

/** A posting field as a questionnaire item — the model's words if it gave any. */
export function postingItem(
  id: FieldId,
  state: IntakeState,
  brand: Brand
): AskedItem {
  const question = QUESTIONS.find((entry) => entry.id === id)!
  const phrasing = state.phrasings?.[id]
  // Work mode is a closed list with labels of its own; Gemini offered the raw
  // values ("office", "hybrid") instead. Its wording of the question is kept.
  const fixed = id === "mode"
  const options =
    !fixed && phrasing?.options.length
      ? phrasing.options
      : question.options(state.draft, brand)
  // THE SKILLS ARE A RANKING, AND ITS WORDS ARE THE PAGE'S: Gemini's hint
  // says "tick the ones that matter", which a ranking cannot be answered by.
  // Its suggestions are kept — they are often better than the title's.
  if (id === "skills") {
    return {
      id,
      prompt: question.ask,
      hint: question.hint,
      options: [],
      multiple: true,
      required: false,
      note: state.unread?.includes(id) ? question.retry : undefined,
      rank: rankFor(state.draft.title, options, brand),
    }
  }
  return {
    id,
    prompt: phrasing?.ask || question.ask,
    hint: phrasing?.hint || question.hint,
    options,
    multiple: question.multiple ?? false,
    required: !question.skippable,
    note: state.unread?.includes(id) ? question.retry : undefined,
  }
}

/** The rules' wording for a field — what the model is told is being asked. */
export function askFor(id: FieldId) {
  return QUESTIONS.find((entry) => entry.id === id)?.ask ?? ""
}

/**
 * One field's answer, read by that field's own reader — for a change made
 * from the rail, which names the field it is changing. Only THAT field comes
 * back (plus the good-to-haves when the skills were ranked): the title's
 * reader reads a whole sentence, and "Head of Sales" typed to change the
 * title must not also move the city.
 */
export function readField(
  id: FieldId,
  answer: string,
  brand: Brand
): Partial<PostingDraft> | null {
  const question = QUESTIONS.find((entry) => entry.id === id)
  const read = question?.read(answer, brand)
  // A TITLE TYPED INTO A BOX IS THE TITLE, WHOLE. The title's reader reads a
  // sentence and pulls the role out of it — "VP, Enterprise Sales" came back
  // as "VP" — which is right for the question's example sentences ("A Head
  // of Marketing in Mumbai, 12+ years") and wrong for the form's box. A
  // sentence gives a city or years as well; a bare title gives neither.
  if (id === "title") {
    const sentence = read?.title && (read.locations || read.experience)
    const title = sentence ? read.title : answer.trim() || null
    return title ? { title } : null
  }
  if (!read || !(id in read)) return null
  const change: Partial<PostingDraft> = { [id]: read[id] }
  if (id === "skills" && read.niceSkills) change.niceSkills = read.niceSkills
  return change
}

/** The field's value as the questionnaire would have said it — to tick it. */
export function currentOf(draft: PostingDraft, id: FieldId): string[] {
  switch (id) {
    case "title":
      return draft.title ? [draft.title] : []
    case "locations":
      return draft.locations
    case "experience":
      return draft.experience ? [yearsLabel(draft.experience)] : []
    case "pay":
      return draft.pay ? [payLabel(draft.pay).replace(/ a year$/, "")] : []
    case "mode":
      return draft.mode ? [modeLabel(draft.mode)] : []
    case "skills":
      return draft.skills
  }
}
