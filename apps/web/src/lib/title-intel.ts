import type { Brand } from "@workspace/ui/lib/brands"

import {
  DESIGN_SKILLS,
  ENGINEERING_SKILLS,
  MANAGEMENT_SKILLS,
} from "@/lib/applicants"
import { vocabularyFor } from "@/lib/smart-hire"
import { SKILL_TAGS } from "@/lib/taxonomy"

/**
 * What a job title implies — the move the live product actually makes.
 *
 * The real post-job form does NOT complete the title: it is a free-text box.
 * What it does instead is fire two calls as you type, `suggest-tags {title}`
 * and `suggest-cat-fa {title, description}`, and fill the rest of the form
 * from the answers. Typing "Head of Marketing" there comes back with fifteen
 * ranked skills split into must-have and nice-to-have, plus the category and
 * functional area. That — not a longer list of prefixes — is what makes their
 * box feel like it understands you, and it is what this file mirrors.
 *
 * MIRRORED OFFLINE, AND HONESTLY. Their ranking is a model. This is word
 * overlap against the same tag taxonomy, which reproduces most of it: their
 * answer for "Head of Marketing" is largely tags containing *marketing*
 * (Marketing, Marketing Head, Digital Marketing, Marketing Analytics,
 * Marketing Communications). What it CANNOT reproduce is the non-obvious hop —
 * theirs also returned Brand Management, Go To Market and Budgeting, which
 * share no word with the title. So this degrades into "fewer and obvious"
 * rather than into "wrong", which is the right way for a stand-in to fail.
 *
 * `skillsForTitle` is a pure function of title and brand, and returns the
 * shape their endpoint returns, so a real call can take its place without the
 * bar noticing.
 */

export type SkillProposal = {
  skill: string
  /** Whether the mock pool holds anybody with it — see `smart-hire.ts`. */
  inData: boolean
  /** 0-100, their `matching_percentage`. */
  score: number
  /** Their `skill_type`. No middle — a recruiter either needs it or likes it. */
  tier: "must" | "nice"
}

/**
 * Words that say seniority or grammar rather than subject. Dropped before
 * scoring, or every senior role would match every tag containing "senior".
 */
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "and",
  "for",
  "in",
  "at",
  "to",
  "with",
  "senior",
  "sr",
  "junior",
  "jr",
  "lead",
  "head",
  "chief",
  "vice",
  "president",
  "vp",
  "avp",
  "svp",
  "deputy",
  "assistant",
  "associate",
  "principal",
  "staff",
  "global",
  "national",
  "regional",
  "group",
  "general",
  "manager",
  "director",
  "officer",
  "executive",
])

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9&+.]+/i)
    .filter(Boolean)

/** Anything above this is something the role needs, not something it likes. */
const MUST_HAVE = 70

const PROPOSALS = 8

/**
 * A stop word that also appears in the tag is worth something — "Marketing
 * Head" IS the role — but not as much as the subject. Count it at half, or
 * "IT Marketing Head" beats "Digital Marketing" on the strength of the word
 * "head", which is the one word in the title that says nothing about the work.
 */
const STOP_WEIGHT = 0.5

/**
 * The taxonomy's own order, which is its ids, which is roughly how long a tag
 * has existed and how much it gets used. It is the only popularity signal in
 * the list and it settles the ties that word overlap leaves everywhere — every
 * two-word "X Marketing" tag scores identically, and without this the
 * alphabet decides, which is how "Agri Marketing" ends up above "Digital
 * Marketing" on a marketing role.
 *
 * A skill the generators deal but the taxonomy does not (hirist's Kafka and
 * Kubernetes) sorts ahead of all of them: it is the half of the vocabulary
 * this prototype can actually find people for.
 */
const rank = new Map<string, number>(
  SKILL_TAGS.map((tag, index) => [tag, index])
)
const rankOf = (skill: string) => rank.get(skill) ?? -1

/**
 * Endings a tag may add to a word the title used. "Engineer" has to reach
 * "Engineering Services" or a technology title finds nothing at all.
 *
 * ONE DIRECTION ONLY, and that is the whole trick: the TAG may extend the
 * TITLE'S word, never the other way round. Going the other way, a Head of
 * Marketing would match "Market Risk" — *market* being a truncation of
 * *marketing* — which is a plausible-looking suggestion about an unrelated
 * job, and the worst kind of wrong for a box that claims to understand you.
 */
const INFLECTIONS = /^(?:ing|ed|er|ers|s|es|ment)$/

/** Five letters is short enough that extending it proves nothing. */
const STEM_FLOOR = 6

const sameWord = (titleWord: string, tagWord: string) =>
  titleWord === tagWord ||
  (titleWord.length >= STEM_FLOOR &&
    tagWord.startsWith(titleWord) &&
    INFLECTIONS.test(tagWord.slice(titleWord.length)))

const matchesAny = (word: string, pool: Set<string>) => {
  for (const candidate of pool) if (sameWord(candidate, word)) return true
  return false
}

/**
 * THE EXTRACTED TAXONOMY IS iimjobs'. hirist's equivalent lives behind its own
 * recruiter login and has not been pulled, and the difference is not cosmetic:
 * the iimjobs list has no Kafka, no Kubernetes and no system design in it at
 * all. Run a technology title through it and the word overlap finds
 * "Engineering Services", "Engineering Services Marketing" and "Engineering
 * Operations Head" — seven confident suggestions, not one of which a Staff
 * Engineer would recognise. That is the failure this file is written to avoid:
 * plausible and wrong beats thin and honest only until somebody reads it.
 *
 * So on hirist the vocabulary is the generators' own skill pools — what the
 * candidates on the other side of the search actually carry. Coarser (every
 * engineering title gets much the same list) and every entry findable.
 *
 * On iimjobs the taxonomy IS the right list, so it leads and the pool only
 * tops up a thin answer.
 */
function poolFor(brand: Brand, area: string | undefined): readonly string[] {
  if (brand === "iimjobs") return MANAGEMENT_SKILLS
  return area === "Design" ? DESIGN_SKILLS : ENGINEERING_SKILLS
}

/** Below this many hits, the overlap has not really answered the question. */
const THIN = 4

/** What a topped-up proposal scores: offered, never claimed as a must-have. */
const TOP_UP_SCORE = 60

/**
 * The skills a title implies, best first.
 *
 * Two halves to the score: how much of the TAG the title accounts for (a
 * one-word tag fully covered is a stronger signal than one word of four), and
 * how much of the TITLE the tag answers. "Head of Marketing" therefore puts
 * "Marketing" and "Marketing Head" at the top — the tag is entirely explained
 * by the title — and "Digital Marketing" below them, where half of it is
 * something the recruiter never said.
 */
export function skillsForTitle(title: string, brand: Brand): SkillProposal[] {
  const titleWords = words(title)
  const significant = titleWords.filter((word) => !STOP_WORDS.has(word))
  if (!significant.length) return []

  const area = functionForTitle(title)?.functionalArea
  const pool = poolFor(brand, area)

  // hirist has no taxonomy of its own here — see `poolFor`.
  if (brand !== "iimjobs") {
    return pool.slice(0, PROPOSALS).map((skill) => ({
      skill,
      inData: true,
      score: TOP_UP_SCORE,
      tier: "nice" as const,
    }))
  }

  const titleSet = new Set(titleWords)
  const significantSet = new Set(significant)
  const proposals: SkillProposal[] = []

  for (const entry of vocabularyFor(brand)) {
    if (entry.kind !== "skill") continue

    const tagWords = words(entry.value)
    if (!tagWords.length) continue

    // A tag that shares only a stop word ("Head") is not about this role.
    const onSubject = tagWords.filter((word) =>
      matchesAny(word, significantSet)
    ).length
    if (!onSubject) continue

    const echoed = tagWords.filter(
      (word) => titleSet.has(word) && STOP_WORDS.has(word)
    ).length

    const coverage = (onSubject + echoed * STOP_WEIGHT) / tagWords.length
    const relevance = onSubject / significant.length
    const score = Math.round(coverage * 55 + relevance * 45)

    proposals.push({
      skill: entry.value,
      inData: entry.inData,
      score,
      tier: score >= MUST_HAVE ? "must" : "nice",
    })
  }

  // Score, then the taxonomy's own order, then alphabetical — so the list is
  // the same every time the same title is typed. Word overlap ties a lot at
  // the same number, and a proposal block that reshuffles itself is unusable.
  proposals.sort(
    (a, b) =>
      b.score - a.score ||
      rankOf(a.skill) - rankOf(b.skill) ||
      a.skill.localeCompare(b.skill)
  )

  const best = proposals.slice(0, PROPOSALS)
  if (best.length >= THIN) return best

  const already = new Set(best.map((proposal) => proposal.skill))
  for (const skill of pool) {
    if (best.length >= PROPOSALS) break
    if (already.has(skill)) continue
    best.push({ skill, inData: true, score: TOP_UP_SCORE, tier: "nice" })
  }

  return best
}

/**
 * What the role does, and which of the eight buckets it sits in.
 *
 * NOT DRAWN IN THE BAR ANY MORE. It was offered as a chip — "and sits in
 * Sales / Business Development / Client Servicing" — and came out badly on
 * three counts: it mostly restated the title, it put a 46-character string in
 * the middle of a sentence, and it claimed to be findable when the only
 * functional-area filter this prototype has runs on a different nine-value
 * vocabulary entirely (`FUNCTIONS` in `database-filters.ts`). It is still
 * called here, because it picks which pool a thin skill answer tops up from,
 * and it is what a posting would need the day the arrow is wired.
 *
 * Their `suggest-cat-fa` infers this; ours is rules, in order, first match
 * wins. Specific before general, so "Product Marketing Head" is marketing
 * rather than product. The category is left off where none of the eight is
 * honest — a CEO is Top Management and is not a Finance hire.
 */
const FUNCTION_RULES: [RegExp, string, string?][] = [
  [/\bpresales?\b|\brfp\b|\bbid\b/i, "Presales/RFP", "Sales & Marketing"],
  [
    /marketing|brand|growth|advertis|communications|public relations|\bpr\b/i,
    "Marketing / Advertising / Public Relations",
    "Sales & Marketing",
  ],
  [
    /sales|business development|account management|key account|revenue/i,
    "Sales / Business Development / Client Servicing",
    "Sales & Marketing",
  ],
  [
    /\bhr\b|human resource|talent|recruit|people|chro|compensation/i,
    "HR / IR",
    "HR",
  ],
  [/training|learning|\bl&d\b/i, "Training & Development", "HR"],
  [
    /analytics|business intelligence|data scien|data analy|insights/i,
    "Analytics & Business Intelligence",
    "IT & Systems",
  ],
  [
    /product manage|product owner|product head|product strategy/i,
    "Product Management",
    "IT & Systems",
  ],
  [/design|\bux\b|\bui\b/i, "Design", "IT & Systems"],
  [
    /engineer|developer|architect|devops|software|platform|technology|\bcto\b|\bcio\b/i,
    "IT",
    "IT & Systems",
  ],
  [
    /consult|strategy|corporate planning|transformation/i,
    "Corporate Planning / Consulting / Strategy",
    "Consulting",
  ],
  [/research|\bkpo\b/i, "KPO / Research", "Consulting"],
  [
    /finance|accounts|accounting|audit|\btax\b|taxation|treasury|controller|\bcfo\b|\bfp&a\b/i,
    "Accounting / Taxation / Audit",
    "Finance",
  ],
  [
    /bank|credit|investment|wealth|\brisk\b|capital markets/i,
    "Banking / Financial Services",
    "Finance",
  ],
  [/insurance|actuar|underwrit/i, "Insurance", "Finance"],
  [
    /supply chain|procurement|purchase|logistics|sourcing|warehouse/i,
    "Purchase / Supply Chain / Logistics",
    "Operations",
  ],
  [
    /operations|plant|manufactur|production|quality|maintenance/i,
    "Production / Maintenance / Quality Assurance",
    "Operations",
  ],
  [
    /legal|counsel|company secretary|litigation|compliance/i,
    "Legal / Law / Company Secretary",
    "Legal",
  ],
  [
    /\bbpo\b|customer service|customer success|customer experience/i,
    "ITeS / BPO / Customer Service",
    "BPO",
  ],
  [/media|content|editor|publish/i, "Media / Entertainment"],
  [/travel|hospitality|hotel|restaurant/i, "Travel / Hospitality"],
  [/real estate|construction|civil|\bepc\b/i, "Real Estate/Construction"],
  [/merchandis/i, "Visual Merchandising"],
  [
    /\bceo\b|\bcoo\b|managing director|country head|business head/i,
    "Top Management",
  ],
  [/admin/i, "Administration"],
]

/**
 * The words that make a phrase a job title. Nothing is a role without one of
 * these in it, and everything before one is usually its qualifier.
 */
const HEAD_NOUN =
  /\b(manager|engineer|developer|designer|architect|analyst|scientist|consultant|director|head|lead|owner|specialist|executive|officer|president|founder|partner|associate|accountant|strategist|researcher|recruiter|controller|coordinator|supervisor|representative|technician|planner|buyer|trainer|writer|editor|marketer|tester|programmer|administrator|generalist|vp|avp|svp|cto|cfo|ceo|coo|cmo|chro)\b/i

/** Words that start the sentence rather than the role. */
const PREAMBLE = new Set([
  "hiring",
  "looking",
  "for",
  "a",
  "an",
  "the",
  "we",
  "need",
  "want",
  "seeking",
  "searching",
  "find",
  "me",
  "someone",
  "somebody",
  "to",
  "hire",
])

/** A qualifier three words back is no longer about the job. */
const QUALIFIERS = 3

/**
 * The role inside a sentence.
 *
 * WITHOUT THIS THE PROPOSALS NEVER FIRE. They used to hang off a title CHIP,
 * and a chip only happens when what you typed prefix-matches one of the dozen
 * titles the generator deals. A recruiter types "hiring for a junior sales
 * manager", which is not one of them, so the box sat there with nothing to
 * say — the one moment it was built for.
 *
 * So the title is read out of the prose instead: find the word that makes a
 * phrase a role, and take the qualifiers in front of it. "Hiring for a junior
 * sales manager with 2-3 years" is a "junior sales manager", and the stop-word
 * list in `skillsForTitle` throws away "junior" and "manager" to leave the
 * subject, which is sales.
 *
 * A heuristic, like everything else that reads this box. It gets the shape of
 * an English job title and will not get a sentence that buries the role.
 */
export function roleIn(text: string): string | null {
  const match = HEAD_NOUN.exec(text)
  if (!match || match.index === undefined) return null

  const before = text
    .slice(0, match.index)
    .split(/[^a-zA-Z0-9&+.'-]+/)
    .filter(Boolean)

  const qualifiers: string[] = []
  for (const word of before.slice(-QUALIFIERS).reverse()) {
    if (PREAMBLE.has(word.toLowerCase())) break
    qualifiers.unshift(word)
  }

  return [...qualifiers, match[0]].join(" ")
}

export function functionForTitle(
  title: string
): { functionalArea: string; category?: string } | null {
  for (const [pattern, functionalArea, category] of FUNCTION_RULES) {
    if (pattern.test(title)) return { functionalArea, category }
  }
  return null
}
