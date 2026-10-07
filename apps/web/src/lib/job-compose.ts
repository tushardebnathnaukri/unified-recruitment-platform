import type { Brand } from "@workspace/ui/lib/brands"

import { INDUSTRY_TAGS } from "@/lib/applicants"
import { poolFor } from "@/lib/calibration"
import { recentSearchesFor } from "@/lib/database"
import { canonicalCity, readDescription, WORK_MODES } from "@/lib/job-intake"
import { jobsFor } from "@/lib/jobs"
import {
  matchesFor,
  vocabularyFor,
  type SuggestionKind,
} from "@/lib/smart-hire"
import { skillsForTitle } from "@/lib/title-intel"

/**
 * The Create Job and Search Resume box: what the sentence covers, and what to
 * add next. One model for both (`purpose`), because a posting and a search are
 * described in the same parts — a search just does not read the CTC.
 *
 * WHAT THE PILL TURNS THE BOX INTO. Pressed, Create Job makes the landing's box
 * a job description being written, and under it this offers the next part —
 * the role first, then where, how senior, the CTC, the sector and the skills —
 * each as a few picks that append themselves to the sentence in plain words.
 * The sentence stays the recruiter's: a pick is text they can edit, and what
 * is sent is the sentence, read by the posting's own readers.
 *
 * NEVER INVENTED. Every option is read off the people a search for the role
 * finds (`poolFor`, the same pool Chat v3's suggestions come from): the cities
 * most of them are in, the bands their years fall in, what the ones in those
 * years expect, the sectors they work in. Skills are the title's own
 * (`skillsForTitle`). A role the pool knows nothing about gets no options for
 * that part rather than plausible ones.
 *
 * WORDS ARE FINISHED BY THE SMART HIRE VOCABULARY (`matchesFor`) — the live
 * taxonomy of titles, cities, industries and skills — so "Product man" offers
 * Product Manager and "Bang" offers Bengaluru. That bar's ghost text was
 * built for the Dashboard once and taken off it; this is offered only after
 * the recruiter has said they are creating a job, which is the difference
 * between helping write a posting and finishing every question's words.
 *
 * READ AT KEYSTROKE SPEED, BY THE RULES. `readDescription` is the reader the
 * posting itself uses, so a tick here is what the posting will read.
 */

export type ComposeField =
  "role" | "location" | "mode" | "experience" | "pay" | "industry" | "skills"

export type ComposeOption = {
  label: string
  /** The whole box's text once this is picked. */
  text: string
  /** A fact beside it, from the pool — "34%". */
  detail?: string
}

export type ComposeRow = {
  /**
   * `complete` finishes the word being typed, `ask` is a question to send, and
   * the rest add a part to the sentence.
   */
  kind: "complete" | "ask" | ComposeField
  title: string
  /** Where the options came from, said once for the row. */
  note?: string
  options: ComposeOption[]
  /** A pick SENDS its text rather than writing it into the box. */
  send?: boolean
}

/**
 * What the sentence is for. A search reads the same parts as a posting less
 * the CTC: pay is asked as a question after the sentence (`QUESTIONS` in
 * `lib/intake.ts`), never read out of it, so ticking it would be a promise
 * the search does not keep. Work mode is left out for the same reason — a
 * search has no office, hybrid or remote to filter on.
 */
export type ComposeFor = "posting" | "search"

export type ComposeAssist = {
  checks: { field: ComposeField; label: string; done: boolean }[]
  rows: ComposeRow[]
}

const LABELS: Record<ComposeField, string> = {
  role: "Role",
  location: "Location",
  mode: "Work mode",
  experience: "Experience",
  pay: "CTC",
  industry: "Industry",
  skills: "Skills",
}

/** The order parts are offered in — the order a role is usually described. */
const ORDER: ComposeField[] = [
  "location",
  "mode",
  "experience",
  "pay",
  "industry",
  "skills",
]

/** Rows shown at once. More and it is a form, which is the thing this is not. */
const ROWS = 2

/** How many sectors the industry row offers. */
const INDUSTRIES_SHOWN = 8

/**
 * THE INDUSTRY ROW'S WIDER LIST, after the pool's own sectors. The pool only
 * knows the eight sectors the generator deals (`INDUSTRY_TAGS`), so a role
 * whose pool sits in four of them offered four — and a recruiter hiring for a
 * hospital or an insurer had nothing to pick. These are the next most common
 * industries on the live iimjobs posting form (`INDUSTRIES` in
 * `lib/taxonomy.ts`, in its own order), with the short name a sentence would
 * use. They carry no share, because nobody in the pool works there: the share
 * is what tells the two halves of the row apart.
 */
const MORE_INDUSTRIES = [
  "Consulting",
  "Healthcare",
  "Insurance",
  "Manufacturing",
  "Pharma",
  "Consumer durables",
  "Logistics",
  "Real estate",
  "Media",
  "Education",
  "Telecom",
  "Travel",
]

/** A must-have list is usually three; the skills row stays until then. */
const SKILLS_WANTED = 3

/** What separates the parts of a sentence: " in ", a comma, a dash. */
const SEPARATOR = /\s+in\s+|,|\s[—–-]\s/i

/** "Hire a", "find", "looking for" — said before the role, not part of it. */
const LEAD_IN =
  /^(?:(?:i|we)\s+(?:want|need|are looking)\s+(?:to\s+(?:hire|find)\s+)?|hire|hiring|find(?:\s+me)?|search\s+for|looking\s+for|need)\s+(?:an?\s+)?/i

const titleLists = new Map<Brand, string[]>()

/** Every title a sentence can start with: your postings', then the vocabulary's. */
function titlesOf(brand: Brand) {
  let list = titleLists.get(brand)
  if (!list) {
    list = [
      ...new Set([
        ...jobsFor(brand).map((job) => job.title.toLowerCase()),
        ...vocabularyFor(brand)
          .filter((entry) => entry.kind === "title")
          .map((entry) => entry.value.toLowerCase()),
      ]),
    ]
    titleLists.set(brand, list)
  }
  return list
}

/**
 * The role, once it is written, and what follows it.
 *
 * A KNOWN TITLE IS MATCHED WHOLE, longest first, because titles hold the very
 * marks that separate the parts — "Vice President, Enterprise Sales",
 * "Engineering Manager — Payments" — and splitting on them made the role
 * "Vice President". Otherwise the first part counts once the recruiter has
 * moved past it, or once it is two words with nothing left to finish (a title
 * the vocabulary does not hold, like "Senior Backend Engineer").
 */
function roleOf(
  text: string,
  brand: Brand
): { role: string; rest: string } | null {
  const body = text.replace(LEAD_IN, "")
  const lower = body.toLowerCase()

  let best = ""
  for (const title of titlesOf(brand)) {
    if (title.length <= best.length || !lower.startsWith(title)) continue
    const after = lower.slice(title.length)
    if (!after || /^[\s,—–-]/.test(after)) best = title
  }
  if (best)
    return { role: body.slice(0, best.length), rest: body.slice(best.length) }

  const head = body.split(SEPARATOR)[0].trim()
  if (head.length < 3) return null
  const rest = body.slice(body.indexOf(head) + head.length)
  if (SEPARATOR.test(body)) return { role: head, rest }
  const unfinished = matchesFor(head, brand, 8).some(
    (hit) => hit.kind === "title" && hit.prefix && hit.completion
  )
  return head.split(/\s+/).length > 1 && !unfinished
    ? { role: head, rest }
    : null
}

type Person = ReturnType<typeof poolFor>["all"][number]

const POOLS = new Map<string, Person[]>()

/** The people a search for the role (and city) finds, cached per brand. */
function peopleFor(brand: Brand, role: string, city: string | null) {
  const query = city ? `${role} in ${city}` : role
  const key = `${brand}\u0001${query.toLowerCase()}`
  let people = POOLS.get(key)
  if (!people) {
    people = poolFor(brand, query, new URLSearchParams()).all
    POOLS.set(key, people)
  }
  return people
}

/** The value at a share of the way through a sorted list. */
const at = (sorted: number[], share: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))]

/**
 * Three bands across the pool — the bottom, middle and top thirds, trimmed of
 * the outer tenths — so the options are where people actually are, not the
 * extremes. `step` rounds the ends to what a person would write.
 */
function bands(values: number[], step: (n: number) => number) {
  if (values.length < 3) return []
  const sorted = [...values].sort((a, b) => a - b)
  const cuts = [0.1, 1 / 3, 2 / 3, 0.9].map((share) => step(at(sorted, share)))
  const out: { min: number; max: number }[] = []
  for (let i = 0; i < 3; i++) {
    const min = cuts[i]
    const max = Math.max(cuts[i + 1], min + step(1))
    if (!out.some((band) => band.min === min && band.max === max))
      out.push({ min, max })
  }
  return out
}

const roundYears = (n: number) => Math.max(0, Math.round(n))
/** Lakh to the nearest one under 20, five under 100, ten above. */
const roundLakh = (n: number) =>
  n < 20
    ? Math.round(n)
    : n < 100
      ? Math.round(n / 5) * 5
      : Math.round(n / 10) * 10
const lakh = (n: number) =>
  n >= 100 ? `₹${+(n / 100).toFixed(2)}Cr` : `₹${n}L`
/** "₹20–30L", or "₹80L–1.2Cr" where the range crosses a crore. */
const lakhRange = (min: number, max: number) =>
  max < 100 ? `₹${min}–${max}L` : `${lakh(min)}–${lakh(max).slice(1)}`

/** The most common values of a field across the pool, with their share. */
function commonest(people: Person[], of: (person: Person) => string) {
  const counts = new Map<string, number>()
  for (const person of people)
    counts.set(of(person), (counts.get(of(person)) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({
      value,
      share: Math.round((count / people.length) * 100),
    }))
}

/** Appends a part with the separator a person would type before it. */
function append(text: string, part: string, kind: ComposeField) {
  const base = text.replace(/[\s,]+$/, "")
  if (kind === "location" && !/,|\s+in\s+/i.test(base))
    return `${base} in ${part}`
  if (kind === "skills")
    return /\s[—–-]\s/.test(base) ? `${base}, ${part}` : `${base} — ${part}`
  return `${base}, ${part}`
}

/** The skills written after the dash — "— Brand Strategy, P&L" — whatever they are. */
function skillsIn(rest: string) {
  const dash = rest.search(/\s[—–-]\s/)
  if (dash === -1) return []
  return rest
    .slice(dash)
    .replace(/^\s[—–-]\s/, "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean)
}

const words = (text: string) =>
  new RegExp(`\\b${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")

/** Which kinds the word being typed can finish to, by what came before it. */
function completable(text: string, role: string | null): SuggestionKind[] {
  if (!role) return ["title"]
  const after = /(\s+in\s+|,|\s[—–-]\s)[^,—–]*$/i.exec(text)?.[1]?.trim()
  if (after === "in") return ["location"]
  if (after && /[—–-]/.test(after)) return ["skill"]
  return ["location", "industry", "skill"]
}

export function composeAssist(
  text: string,
  brand: Brand,
  purpose: ComposeFor = "posting"
): ComposeAssist {
  const fields = (Object.keys(LABELS) as ComposeField[]).filter(
    (field) => purpose === "posting" || (field !== "pay" && field !== "mode")
  )
  const parsed = roleOf(text, brand)
  const role = parsed?.role ?? null
  const rest = parsed?.rest ?? ""
  const read = role ? readDescription(text, brand) : {}
  const city =
    read.locations?.map((place) => canonicalCity(place) ?? place)[0] ?? null
  const people = role ? peopleFor(brand, role, null) : []
  const local = role && city ? peopleFor(brand, role, city) : people

  const industries = commonest(people, (person) => person.industry).filter(
    (row) => INDUSTRY_TAGS[row.value]
  )
  // Read after the role, so "Head of Brand Marketing" is not a sector and
  // "Head of Marketing" is not a skill.
  const industryNamed =
    industries.some(({ value }) =>
      [value, INDUSTRY_TAGS[value]].some((word) => words(word).test(rest))
    ) || MORE_INDUSTRIES.some((label) => words(label).test(rest))
  const skills = skillsIn(rest)

  const done: Record<ComposeField, boolean> = {
    role: Boolean(role),
    location: Boolean(read.locations?.length),
    mode: Boolean(read.mode),
    experience: Boolean(read.experience),
    pay: Boolean(read.pay),
    industry: industryNamed,
    skills: skills.length > 0,
  }
  const checks = fields.map((field) => ({
    field,
    label: LABELS[field],
    done: done[field],
  }))

  // FINISHING THE WORD comes first, and alone: offering the next part while a
  // word is half-typed puts two lists under one caret. Only the part being
  // typed now — after the last separator — so the role is never "finished"
  // into a skill once it is written.
  // The WHOLE part is what gets finished, never its last word: "Brand
  // Strategy" is a skill as typed, not "Brand" plus a "Strategy Head".
  const typing = role
    ? (rest.split(SEPARATOR).at(-1) ?? "").trim()
    : text.replace(LEAD_IN, "").trim()
  if (typing && !/\s$/.test(text)) {
    const kinds = completable(role ? rest : text, role)
    const all = matchesFor(typing, brand, 24).filter(
      (hit) =>
        hit.prefix &&
        kinds.includes(hit.kind) &&
        hit.typed.toLowerCase() === typing.toLowerCase()
    )
    const exact = all.some((hit) => !hit.completion)
    const hits = exact
      ? []
      : all
          .filter((hit) => hit.completion)
          // A city the pool deals before one it does not, so "Ban" is
          // Bangalore rather than Banaras.
          .sort((a, b) => Number(b.inData) - Number(a.inData))
          .slice(0, 4)
    if (hits.length)
      return {
        checks,
        rows: [
          {
            kind: "complete",
            title: "Finish",
            options: hits.map((hit) => {
              const label =
                hit.kind === "location"
                  ? (canonicalCity(hit.label) ?? hit.label)
                  : hit.label
              return {
                label,
                text: text.slice(0, text.length - hit.typed.length) + label,
              }
            }),
          },
        ],
      }
  }

  // NO ROLE YET: the box is empty or the title is still being written. A
  // posting starts from your own postings' titles, since a role is most often
  // one you have hired for; a search from your recent searches, whole, since
  // running one again is the commonest search there is.
  if (!role) {
    if (text.trim()) return { checks, rows: [] }
    const recent = recentSearchesFor(brand)
      .filter((search) => search.mode === "natural" && !search.boolean)
      .map((search) => search.query)
      .slice(0, 3)
    const titles = [...new Set(jobsFor(brand).map((job) => job.title))]
    const starts: ComposeRow[] = []
    if (purpose === "search" && recent.length)
      starts.push({
        kind: "role",
        title: "Run a recent search",
        note: "Edit it, or send it as it is",
        options: recent.map((query) => ({ label: query, text: query })),
      })
    if (titles.length)
      starts.push({
        kind: "role",
        title: starts.length ? "Or start with a role" : "Start with the role",
        note: "From your postings",
        options: titles
          .slice(0, 4)
          .map((title) => ({ label: title, text: title })),
      })
    return { checks, rows: starts }
  }

  const rows: ComposeRow[] = []
  const add = (row: ComposeRow) => {
    if (row.options.length && rows.length < ROWS) rows.push(row)
  }

  for (const field of ORDER) {
    if (!fields.includes(field)) continue
    if (field === "skills" ? skills.length >= SKILLS_WANTED : done[field])
      continue

    if (field === "location") {
      add({
        kind: field,
        title: "Add location",
        note: "Where most of them are",
        // Counted in the form's spellings, so Gurugram and Noida are one
        // Delhi NCR rather than two of them.
        options: commonest(
          people,
          (person) => canonicalCity(person.location) ?? person.location
        )
          .slice(0, 4)
          .map(({ value, share }) => ({
            label: value,
            detail: `${share}%`,
            text: append(text, value, field),
          })),
      })
    }

    // Office, hybrid or remote — the posting's work-mode question, answered in
    // the sentence instead. Written as a person would say it after the city
    // ("in Mumbai, hybrid"), and in words `readMode` reads back.
    if (field === "mode") {
      add({
        kind: field,
        title: "Add work mode",
        note: "Office, hybrid or remote",
        options: WORK_MODES.map(({ label }) => ({
          label,
          text: append(text, label.toLowerCase(), field),
        })),
      })
    }

    if (field === "experience") {
      add({
        kind: field,
        title: "Add experience",
        note: city ? `Most common in ${city}` : "Most common",
        options: bands(
          local.map((person) => person.experienceYears),
          roundYears
        ).map(({ min, max }, index, all) =>
          // The top band is open-ended: "15–16 yrs" is where the pool stops,
          // not a ceiling anybody would post.
          index === all.length - 1
            ? {
                label: `${min}+ yrs`,
                text: append(text, `${min}+ years`, field),
              }
            : {
                label: `${min}–${max} yrs`,
                text: append(text, `${min}–${max} years`, field),
              }
        ),
      })
    }

    if (field === "pay") {
      const years = read.experience
      const within = years
        ? local.filter(
            (person) =>
              person.experienceYears >= years.min &&
              person.experienceYears <= (years.max ?? Infinity)
          )
        : local
      add({
        kind: field,
        title: "Add CTC",
        note: years
          ? "What people with those years expect"
          : "What they expect",
        options: bands(
          (within.length >= 3 ? within : local).map(
            (person) => person.expectedCtcLakh
          ),
          roundLakh
        ).map(({ min, max }) => ({
          label: lakhRange(min, max),
          text: append(text, `₹${min}–${max} LPA`, field),
        })),
      })
    }

    if (field === "industry") {
      add({
        kind: field,
        title: "Add industry",
        note: "Where they work now",
        // Where the pool works first, with its share; then the wider list.
        options: [
          ...industries.map(({ value, share }) => ({
            label: INDUSTRY_TAGS[value],
            detail: `${share}%` as string | undefined,
          })),
          ...MORE_INDUSTRIES.map((label) => ({
            label,
            detail: undefined,
          })),
        ]
          .slice(0, INDUSTRIES_SHOWN)
          .map((option) => ({
            ...option,
            text: append(text, option.label, field),
          })),
      })
    }

    if (field === "skills") {
      add({
        kind: field,
        title: "Add skills",
        note: `Usual for a ${role}`,
        options: skillsForTitle(role, brand)
          .map((proposal) => proposal.skill)
          .filter((skill) => !skills.includes(skill))
          .slice(0, 5)
          .map((skill) => ({ label: skill, text: append(text, skill, field) })),
      })
    }
  }

  return { checks, rows }
}
