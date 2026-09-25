import type { Brand } from "@workspace/ui/lib/brands"

import {
  COMPANY_INDUSTRIES,
  DESIGN_SKILLS,
  DESIGN_TITLES,
  ENGINEERING_SKILLS,
  ENGINEERING_TITLES,
  INDUSTRY_TAGS,
  LOCATIONS,
  MANAGEMENT_SKILLS,
  MANAGEMENT_TITLES,
} from "@/lib/applicants"
import {
  FUNCTIONAL_AREAS,
  INDUSTRIES,
  JOB_LOCATIONS,
  JOB_TITLES,
  SKILL_TAGS,
} from "@/lib/taxonomy"

/**
 * What the Smart Hire bar can finish for you, and how it decides.
 *
 * PROGRAMMATIC, NOT A MODEL, and the reason is not cost. Ghost text has to be
 * on screen before the next keystroke, which rules out a 300-900ms round trip;
 * and Tab needs the suggestion to hold still, which a prefix match over a fixed
 * list guarantees and a model does not. What a model is genuinely for is the
 * step AFTER the title — see `title-intel.ts`.
 *
 * THE VOCABULARY IS THE REAL ONE NOW. It used to be our own generators: seven
 * cities, ~28 titles, eight industries. It is the live iimjobs taxonomy in
 * `taxonomy.ts` — 120 locations, 66 industries, 36 functional areas and a
 * thousand skill tags — with the generators folded in where they are richer
 * (titles, and hirist's technology skills, which iimjobs' list does not carry).
 *
 * AND IT SAYS WHICH HALF IS REAL. Every entry carries `inData`: whether this
 * prototype's mock pool could actually return anybody for it. Kolkata is in the
 * taxonomy and in nobody's address; "Brand Management" is a tag no generated
 * candidate holds. Both are still offered — a recruiter reviewing this should
 * see the true list — but they rank below the ones that work and the bar draws
 * them dimmed. `criteriaFrom` in `lib/database.ts` has the opposite habit: it
 * will write `cur=Kolkata` with a straight face and find nobody.
 */

export type SuggestionKind =
  "title" | "location" | "industry" | "skill" | "function"

export type VocabEntry = {
  kind: SuggestionKind
  /** What a filter will carry. The canonical spelling, always. */
  value: string
  /** What the chip says, where the canonical name is built for a filter list
   *  rather than for a sentence. */
  label: string
  /** Every way it gets typed, in the order the ghost would rather finish. */
  matches: string[]
  /** Could the mock pool return anybody for this? See the note above. */
  inData: boolean
}

export type Suggestion = {
  kind: SuggestionKind
  value: string
  label: string
  inData: boolean
  /** What is already typed, verbatim — the ghost continues this. */
  typed: string
  /** What the ghost paints. Empty when the typed words are the whole match. */
  completion: string
  /** False when the typed words appear INSIDE the match rather than starting
   *  it — offerable in the list, never paintable as a ghost. */
  prefix: boolean
}

/**
 * What the sentence is FOR.
 *
 * Smart Hire's whole claim is "a search and a job post out of one description",
 * and until now the arrow quietly assumed the first. This is that claim made
 * into a control — and it defaults to posting, because a recruiter who has
 * just written out a role is more often about to advertise it than to go
 * hunting, and because the search has two other doors already (the Dashboard's
 * box and Search Resume).
 */
export type SmartHireIntent = "post" | "search"

export const INTENTS: { value: SmartHireIntent; label: string }[] = [
  { value: "post", label: "Post a job" },
  { value: "search", label: "Search" },
]

/**
 * Where a finished sentence goes.
 *
 * ONE RULE, BECAUSE TWO BARS SUBMIT. The Dashboard's box and the Smart Hire
 * page's are the same component, and they used to disagree about this: the
 * Dashboard handed off to /smart-hire, which drew the same box again with the
 * same sentence already in it and asked for the same arrow a second time. That
 * screen only made sense while Smart Hire was somewhere you could arrive at
 * cold; now the box is the way in, so both submit straight to the outcome.
 *
 * /smart-hire still exists and still works — it is just no longer on the way
 * to anywhere.
 */
export function smartHireHref(intent: SmartHireIntent, text: string): string {
  const where = intent === "search" ? "/smart-hire/brief" : "/smart-hire/post"
  return `${where}?q=${encodeURIComponent(text)}`
}

/** A value the recruiter accepted, in the order they accepted it. */
export type SmartChip = {
  kind: SuggestionKind
  value: string
  label: string
  /** False where the mock pool holds nobody for it — carried so the tray can
   *  keep saying so after the chip is in the sentence, which is the moment it
   *  matters most. Undefined where it was never checked. */
  inData?: boolean
}

/** The shortest thing worth completing. One letter matches half the list. */
const MIN_CHARS = 2

/** Titles run to four words ("Senior Manager, Sales"). */
const MAX_WORDS = 4

/**
 * Cities the way people type them. The canonical spellings are the
 * generator's, so "bangalore" has to resolve to Bengaluru or the chip would
 * carry a city no candidate lives in.
 */
const CITY_ALIASES: Record<string, string[]> = {
  Bengaluru: ["bangalore", "blr", "bglr"],
  Gurugram: ["gurgaon", "ggn"],
  Mumbai: ["bombay"],
  Noida: ["ncr"],
}

const titlesIn = (bands: [max: number, titles: string[]][]) =>
  bands.flatMap(([, titles]) => titles)

/**
 * The titles and skills a brand's people actually carry. Per-brand DATA, which
 * is the two products being different products — not a component asking which
 * brand it is in. hirist draws from the technology pools, iimjobs from the
 * management one, the same split `poolsFor` makes in `applicants.ts`.
 */
function generatorPools(brand: Brand) {
  return brand === "iimjobs"
    ? { titles: titlesIn(MANAGEMENT_TITLES), skills: [...MANAGEMENT_SKILLS] }
    : {
        titles: [...titlesIn(ENGINEERING_TITLES), ...titlesIn(DESIGN_TITLES)],
        skills: [...ENGINEERING_SKILLS, ...DESIGN_SKILLS],
      }
}

/** "Gurgaon/Gurugram" is our Gurugram; "Bangalore" is our Bengaluru. */
function dataCityFor(label: string): string | undefined {
  const parts = label
    .toLowerCase()
    .split("/")
    .map((part) => part.trim())

  return LOCATIONS.find((city) => {
    const names = [city.toLowerCase(), ...(CITY_ALIASES[city] ?? [])]
    return names.some((name) => parts.includes(name))
  })
}

const vocabularies = new Map<Brand, VocabEntry[]>()

/**
 * Everything completable, built once per brand.
 *
 * Titles come first so a fragment matching both a title and something else
 * completes to the title — it is what a recruiter types first. Skills come last
 * because there are a thousand of them and they would otherwise drown the
 * lists that have one right answer.
 */
export function vocabularyFor(brand: Brand): VocabEntry[] {
  const cached = vocabularies.get(brand)
  if (cached) return cached

  const pools = generatorPools(brand)
  const seen = new Set<string>()
  const vocab: VocabEntry[] = []

  const add = (entry: VocabEntry) => {
    const key = `${entry.kind}:${entry.value.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    vocab.push(entry)
  }

  // The generators' own titles first — those are the ones a search can
  // actually return — then the sampled Naukri list behind them. ONE LIST FOR
  // BOTH PRODUCTS: `inData` already does the per-brand work, so a hirist
  // recruiter typing "sen" gets Senior Engineer (dealt by the generator)
  // before Senior Accounts Executive, without anybody classifying 906 titles
  // into tech and management and getting the ambiguous half wrong.
  for (const value of pools.titles) {
    add({ kind: "title", value, label: value, matches: [value], inData: true })
  }
  for (const value of JOB_TITLES) {
    add({ kind: "title", value, label: value, matches: [value], inData: false })
  }

  // Our seven cities first, under their own spellings, then the rest of the
  // real list. A taxonomy city that IS one of ours is folded into it, so
  // typing "bangalore" lands the Bengaluru the generator deals.
  for (const label of JOB_LOCATIONS) {
    const city = dataCityFor(label)
    const value = city ?? label
    add({
      kind: "location",
      value,
      label: value,
      matches: city
        ? [city, label, ...(CITY_ALIASES[city] ?? [])]
        : [label, ...label.split("/").map((part) => part.trim())],
      inData: Boolean(city),
    })
  }

  // The eight the generator deals, then the 66 the product offers. The two
  // lists overlap by exact string in three places and by sense in more, which
  // is why ours are added first and win the dedupe.
  const dealt = new Set(Object.values(COMPANY_INDUSTRIES))
  for (const value of [...dealt, ...INDUSTRIES]) {
    const label = INDUSTRY_TAGS[value] ?? value
    add({
      kind: "industry",
      value,
      label,
      matches: [...new Set([label, value.split(" / ")[0], value])],
      inData: dealt.has(value),
    })
  }

  for (const value of pools.skills) {
    add({ kind: "skill", value, label: value, matches: [value], inData: true })
  }
  for (const value of SKILL_TAGS) {
    add({ kind: "skill", value, label: value, matches: [value], inData: false })
  }

  // NOT FINDABLE, AND THIS ONE IS SUBTLE. There IS a Functional area filter in
  // the refine panel (`fn` in `database-filters.ts`) — but it runs on a
  // DIFFERENT vocabulary: nine values derived from a candidate's title
  // ("Sales / Business Development", "Software Developer"), not these 36
  // posting categories. So `fn=Sales / Business Development / Client
  // Servicing` matches nobody, and calling it findable would be a promise this
  // prototype cannot keep. They stay completable, because a posting needs one
  // — see the note on the Smart Hire bar's dropped proposal.
  for (const value of FUNCTIONAL_AREAS) {
    add({
      kind: "function",
      value,
      label: value,
      matches: [value, ...value.split(/[/&]/).map((part) => part.trim())],
      inData: false,
    })
  }

  vocabularies.set(brand, vocab)
  return vocab
}

/** The last `count` words of a string, or null if there are not that many. */
function tailWords(text: string, count: number): string | null {
  const words = text.split(/\s+/)
  if (words.length < count) return null
  const tail = words.slice(-count).join(" ")
  return tail.trim() ? tail : null
}

/**
 * Everything the bar could mean by what has been typed, best first.
 *
 * Longest fragment first, so "head of pro" reaches a four-word title rather
 * than stopping at "pro". Within a fragment: things that START with it before
 * things that merely CONTAIN it, then the ones the data can answer, then the
 * shortest label — which keeps the answer stable as the lists grow and stops a
 * fragment matching five entries picking a different one on every keystroke.
 *
 * Substring hits are here because the live form works that way — "fin" offers
 * Recruitment / Staffing, because of *staffing*. They can never be a ghost,
 * which is what `prefix` is for.
 */
export function matchesFor(
  text: string,
  brand: Brand,
  limit = 6
): Suggestion[] {
  if (text.trim().length < MIN_CHARS) return []
  // A trailing space means the word is finished and the next has not started;
  // completing there would put the ghost after a gap.
  if (/\s$/.test(text)) return []

  const vocab = vocabularyFor(brand)

  for (let words = MAX_WORDS; words >= 1; words--) {
    const typed = tailWords(text, words)
    if (!typed || typed.length < MIN_CHARS) continue

    const lower = typed.toLowerCase()
    const hits: Suggestion[] = []

    for (const entry of vocab) {
      let best: { candidate: string; prefix: boolean } | null = null

      for (const option of entry.matches) {
        const at = option.toLowerCase().indexOf(lower)
        if (at === -1) continue
        // A prefix hit ends the search; a substring hit is kept in case
        // nothing better turns up on this entry.
        if (at === 0) {
          best = { candidate: option, prefix: true }
          break
        }
        best ??= { candidate: option, prefix: false }
      }

      if (!best) continue

      hits.push({
        kind: entry.kind,
        value: entry.value,
        label: entry.label,
        inData: entry.inData,
        typed,
        // The remainder of whatever matched, so the ghost reads as the word
        // being finished. The chip is the entry's own label either way, which
        // is how "gurgaon" + Tab lands as Gurugram.
        completion: best.prefix ? best.candidate.slice(typed.length) : "",
        prefix: best.prefix,
      })
    }

    if (!hits.length) continue

    // HOW MUCH OF THE MATCH THE TYPING ACCOUNTS FOR comes before whether the
    // data can answer it. Typing "sales" used to land the whole functional
    // area — "Sales / Business Development / Client Servicing", 46 characters
    // of which the recruiter typed five — because that entry is findable and
    // the skill tag "Sales" is not. Five characters of forty-six is not what
    // anybody meant. For a prefix hit the matched text is `typed + completion`,
    // so this is simply the shortest thing that starts with what you typed.
    const span = (hit: Suggestion) =>
      hit.prefix ? hit.typed.length + hit.completion.length : hit.label.length

    hits.sort(
      (a, b) =>
        Number(b.prefix) - Number(a.prefix) ||
        span(a) - span(b) ||
        Number(b.inData) - Number(a.inData) ||
        a.label.localeCompare(b.label)
    )

    return hits.slice(0, limit)
  }

  return []
}

/**
 * What Tab would take: the best PREFIX match, or nothing.
 *
 * A ghost is a continuation of what your fingers are already on, so a
 * substring hit cannot be one — those live in the row under the bar instead.
 */
export function suggest(text: string, brand: Brand): Suggestion | null {
  return matchesFor(text, brand, 1).find((hit) => hit.prefix) ?? null
}

/**
 * The kinds that are safe to recognise without being asked.
 *
 * Not skills: a thousand tags include "Sales", "Quality" and "Design", and a
 * sentence would turn into confetti. Not functional areas either — they are
 * long, they restate the title, and nothing here can find people by one.
 */
const UNPROMPTED: SuggestionKind[] = ["title", "location", "industry"]

/**
 * Is what was just finished a thing in its own right?
 *
 * Only an EXACT match counts. "Product Manager" is one; "Product" on its way
 * to it is not, and neither is "Manage" on its way to "Manager". That is the
 * difference between a box that recognises what you wrote and one that grabs
 * at every word as you type it.
 */
export function exactMatch(text: string, brand: Brand): Suggestion | null {
  return (
    matchesFor(text, brand, 8).find(
      (hit) =>
        hit.prefix &&
        !hit.completion &&
        UNPROMPTED.includes(hit.kind) &&
        hit.typed.toLowerCase() === hit.label.toLowerCase()
    ) ?? null
  )
}

/** A piece of a described requirement: prose, or something recognised in it. */
export type DraftPart = { text: string } | { chip: SmartChip }

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * Read a plain sentence back as prose and chips.
 *
 * WHAT THE HAND-OFF IS FOR. The Dashboard's bar carries its draft to
 * /smart-hire in the query string, and a URL can only hold text — so without
 * this, chipping "Mumbai" on the Dashboard and pressing the arrow throws that
 * confirmation away and lands as flat prose. Everything chippable came out of
 * this vocabulary in the first place, so reading it back finds it again.
 *
 * Longest match first, so "Senior Manager, Sales" is one chip rather than
 * "Manager, Sales" with a stray "Senior" in front of it.
 *
 * SKILLS AND FUNCTIONS ARE LEFT OUT OF THIS PASS. A thousand tags include
 * "Sales", "Quality" and "Design", and chipping every one of those out of an
 * ordinary sentence would turn a description into confetti. Skills arrive by
 * being typed, or by being proposed from the title.
 */
/**
 * The scanner, built once per brand. A thousand-odd alternatives compiled into
 * one regex is not something to do on every keystroke, and the bar now asks
 * this question on every keystroke — it is what the checklist ticks from.
 */
const scanners = new Map<
  Brand,
  { pattern: RegExp; byMatch: Map<string, VocabEntry> }
>()

function scannerFor(brand: Brand) {
  const cached = scanners.get(brand)
  if (cached) return cached

  const vocab = vocabularyFor(brand).filter(
    (entry) => entry.kind !== "skill" && entry.kind !== "function"
  )
  const byMatch = new Map<string, VocabEntry>()

  for (const entry of vocab) {
    for (const option of entry.matches) {
      // First writer wins, which keeps the title pools ahead of the rest —
      // the order `vocabularyFor` builds them in.
      if (!byMatch.has(option.toLowerCase()))
        byMatch.set(option.toLowerCase(), entry)
    }
  }

  const options = [...byMatch.keys()].sort((a, b) => b.length - a.length)
  const scanner = {
    byMatch,
    pattern: new RegExp(`\\b(?:${options.map(escape).join("|")})\\b`, "gi"),
  }

  scanners.set(brand, scanner)
  return scanner
}

export function readBack(text: string, brand: Brand): DraftPart[] {
  if (!text) return []

  const { pattern, byMatch } = scannerFor(brand)
  pattern.lastIndex = 0

  const parts: DraftPart[] = []
  let cursor = 0

  for (const match of text.matchAll(pattern)) {
    const entry = byMatch.get(match[0].toLowerCase())
    if (!entry || match.index === undefined) continue

    if (match.index > cursor) {
      parts.push({ text: text.slice(cursor, match.index) })
    }
    parts.push({
      chip: {
        kind: entry.kind,
        value: entry.value,
        label: entry.label,
        inData: entry.inData,
      },
    })
    cursor = match.index + match[0].length
  }

  if (cursor < text.length) parts.push({ text: text.slice(cursor) })
  return parts
}

/**
 * What a chip set means as a search.
 *
 * A chip is a filter the recruiter confirmed, so it lands on the same URL keys
 * the refine panel reads (`cur`, `ind`) rather than being re-guessed out of the
 * sentence by `criteriaFrom`. Titles and skills have no key of their own, so
 * they stay in the query text.
 *
 * PARKED UNTIL SUBMIT IS DECIDED — /smart-hire's arrow goes nowhere yet. Kept
 * because it is the half of the chip model that says why chips are worth
 * having, and writing it now is what stops them becoming decoration.
 */
export function paramsFrom(chips: SmartChip[]) {
  const of = (kind: SuggestionKind) =>
    chips.filter((chip) => chip.kind === kind).map((chip) => chip.value)

  return {
    cur: of("location"),
    ind: of("industry"),
    titles: of("title"),
    skills: of("skill"),
  }
}
