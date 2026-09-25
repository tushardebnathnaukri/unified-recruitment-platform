import type { Brand } from "@workspace/ui/lib/brands"

import {
  defaultCriteria,
  scoreFor,
  verdictsFor,
  type Verdict,
} from "@/lib/criteria"
import { resultsFor } from "@/lib/database"
import {
  expansions,
  profileMatches,
  type Expansion,
  type Profile,
} from "@/lib/database-filters"
import { INDUSTRY_TAGS } from "@/lib/applicants"

/**
 * The pool behind a brief, and the three people it asks you about.
 *
 * WHY THIS IS MOSTLY WIRING. Everything the calibration step needs already
 * exists and is already used by the database page: `verdictsFor` says whether a
 * person meets a criterion and cites a real role as evidence, `scoreFor` turns
 * those verdicts into the Best-match number, and `expansions` counts — not
 * estimates — how many more people a loosened filter would find. What was
 * missing was a reason to call them from outside the results screen.
 *
 * THE REWEIGHTING IS A RE-ORDERING. `scoreFor` is rank-weighted: the first
 * criterion counts most and the last barely at all. So "this person is not what
 * I meant" does not need a new scoring model — it needs the criteria that
 * person scored on to move down the list. That is the whole of `recalibrate`,
 * and it is why the effect is visible: the criteria chips reorder, and every
 * score in the pool changes with them.
 */

/** Nobody has been viewed and nothing is open, outside the results screen. */
const NOBODY = new Set<string>()

export type Pool = {
  /** Everyone the sentence finds, before the brief's filters. */
  all: Profile[]
  /** Everyone still standing after them. */
  matching: Profile[]
  /** What the search named, for the criteria. */
  requiredSkills: string[]
  readSkills: (text: string) => string[]
}

export function poolFor(
  brand: Brand,
  query: string,
  params: URLSearchParams
): Pool {
  const results = resultsFor(brand, { query, mode: "natural" })

  return {
    all: results.people,
    matching: results.people.filter((profile) =>
      profileMatches(profile, params, NOBODY, null)
    ),
    requiredSkills: results.requiredSkills,
    readSkills: results.readSkills,
  }
}

/** Ways to widen a brief that has narrowed too far, with counted gains. */
export function widenings(pool: Pool, params: URLSearchParams): Expansion[] {
  return expansions(
    params,
    pool.all,
    (next) =>
      pool.all.filter((profile) => profileMatches(profile, next, NOBODY, null))
        .length
  )
}

/**
 * The criteria a brief implies, most important first.
 *
 * The skills it named lead, because they are the thing the recruiter typed out;
 * industry and experience follow as sentences, because that is the shape
 * `verdictsFor` reads and what `?crit=` carries.
 */
export function criteriaFor(pool: Pool, params: URLSearchParams): string[] {
  const named = params.getAll("skill")
  const skills = named.length ? named : pool.requiredSkills
  const criteria = defaultCriteria(skills)

  for (const industry of params.getAll("ind")) {
    criteria.push(`Has worked in ${INDUSTRY_TAGS[industry] ?? industry}`)
  }

  const xp = params.get("xp")
  if (xp) {
    const [min] = xp.split("-")
    if (min) criteria.push(`Has at least ${min} years behind them`)
  }

  return criteria
}

export type Reviewee = {
  profile: Profile
  verdicts: Verdict[]
  score: number
}

/**
 * The three to put in front of the recruiter.
 *
 * THE TOP THREE, not a spread. Calibrating against people the search already
 * ranks first is the only version of this that means anything: if the best it
 * can do is wrong, the criteria are wrong, which is exactly what the step is
 * for. Showing a deliberate mix of good and bad would be testing the recruiter
 * rather than the search.
 *
 * Three because that is already this product's number for looking at a few
 * people at once — see `COMPARE_MAX` in `candidate-list/selection.tsx`.
 */
export const REVIEW_COUNT = 3

export function toReview(pool: Pool, criteria: string[]): Reviewee[] {
  return pool.matching
    .map((profile) => {
      const verdicts = verdictsFor(profile, criteria, pool.readSkills)
      return { profile, verdicts, score: scoreFor(verdicts, profile.match) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, REVIEW_COUNT)
}

/** How a reviewed profile was judged. */
export type Judgement = "kept" | "dropped"

/**
 * Move the criteria a judgement implicates.
 *
 * A criterion this person MET carries the weight of the decision: keeping them
 * says it was worth matching, dropping them says it was not what made them
 * interesting. A criterion they missed says nothing either way — they were
 * shown despite it — so it does not move.
 *
 * The result is a re-ordering, which is a re-weighting, because `scoreFor`
 * counts the first criterion most.
 */
export function recalibrate(
  criteria: string[],
  judged: { verdicts: Verdict[]; judgement: Judgement }[]
): string[] {
  const weight = new Map(criteria.map((criterion) => [criterion, 0]))

  for (const { verdicts, judgement } of judged) {
    for (const verdict of verdicts) {
      if (!verdict.met) continue
      const current = weight.get(verdict.criterion)
      if (current === undefined) continue
      weight.set(verdict.criterion, current + (judgement === "kept" ? 1 : -1))
    }
  }

  // A stable sort on the original order, so criteria nobody's decision touched
  // stay exactly where they were rather than shuffling for no reason.
  return [...criteria].sort(
    (a, b) =>
      (weight.get(b) ?? 0) - (weight.get(a) ?? 0) ||
      criteria.indexOf(a) - criteria.indexOf(b)
  )
}

/** What moved, in a sentence the chat can say. Null when nothing did. */
export function whatMoved(before: string[], after: string[]): string | null {
  const risen = after.find(
    (criterion, index) => index < before.indexOf(criterion)
  )
  if (!risen) return null

  const label = risen.replace(/^Has (hands-on experience with|worked in) /, "")
  return `${label} matters more than I had it.`
}
