import type { Brand } from "@workspace/ui/lib/brands"

import { poolFor } from "@/lib/calibration"
import {
  filled,
  modeLabel,
  payLabel,
  yearsLabel,
  type FieldId,
  type IntakeState,
} from "@/lib/job-intake"
import { industryLabel, pendingTopics, searchHrefFor } from "@/lib/job-refine"

/**
 * What the rail beside the posting conversation shows — worked out from the
 * intake state and nothing else.
 *
 * A NEW RAIL, NOT `BriefRail`. The Smart Hire brief's rail is about one
 * search; this one is about a posting that becomes a search, and it has a
 * section the other has no use for (the posting itself). They share the
 * Plan-list idea and nothing that would have to stay in step.
 *
 * "PEOPLE THIS WOULD FIND" IS PROJECTED ONTO THE WHOLE DATABASE. The count
 * starts as `poolFor` over the exact link "Open the search" opens — the same
 * filter predicate Search Resume runs over the same dealt people — and is then
 * scaled up, because a few hundred dealt people read as a tiny product. So the
 * rail and that page DO disagree: the page still counts its sample. That was
 * a deliberate call (rail only); scaling Search Resume's own counts would be
 * the way to make them agree again. It is one rounded number, not a range: a
 * range here would be an invention dressed as caution.
 */

/**
 * The candidate database each product searches, from what each says publicly
 * (checked September 2026): iimjobs "Trusted by 4 million+ jobseekers" (its
 * App Store listing); hirist "connects more than 35 lacs of jobseekers"
 * (recruit.hirist.tech/about-us). Registered, not active — a real search
 * would run over fewer.
 */
const DATABASE: Record<Brand, number> = {
  iimjobs: 40_00_000,
  hirist: 35_00_000,
}

/**
 * The notional sample the mock deals searches from: one dealt person stands
 * for `DATABASE / SAMPLE` real ones (about 250). Picked so a broad search
 * finds tens of thousands and a narrow brief a few thousand — around 2% and
 * 0.2% of the database.
 */
const SAMPLE = 15_000

/** Two significant figures, so a projection does not pass for a count. */
function roughly(n: number) {
  if (n < 100) return Math.round(n)
  const step = 10 ** (Math.floor(Math.log10(n)) - 1)
  return Math.round(n / step) * step
}

export type RailStep = {
  label: string
  /** Said quietly beside it — "4 of 6", "2 of 4", the role. */
  detail?: string
  state: "done" | "active" | "waiting"
}

export type RailModel = {
  status: string
  steps: RailStep[]
  /** The posting so far, as chips, in the order the card lists it. */
  posting: string[]
  must: string[]
  nice: string[]
  /** The private brief so far, as chips. */
  brief: string[]
  /** Null until there is a role to count people for. */
  people: { matching: number; total: number; href: string } | null
}

const FIELDS: FieldId[] = [
  "title",
  "locations",
  "experience",
  "skills",
  "pay",
  "mode",
]

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`

export function railFor(state: IntakeState, brand: Brand): RailModel {
  const { draft, brief } = state
  const stage = state.opener ? "opener" : state.stage
  const from = state.basedOn
    ? `From ${state.basedOn}`
    : state.origin === "jd"
      ? "From a JD"
      : null
  const filledCount = FIELDS.filter((id) => filled(draft, id)).length
  const answered = state.plan.length - pendingTopics(state).length

  const steps: RailStep[] = [
    {
      label: "Understand the role",
      detail:
        [draft.title, from].filter(Boolean).join(" · ") ||
        (state.origin === "scratch" ? "From scratch" : undefined),
      state: stage === "opener" ? "active" : "done",
    },
    {
      label: "Fill in the posting",
      detail: stage === "opener" ? undefined : `${filledCount} of 6`,
      state:
        stage === "opener"
          ? "waiting"
          : stage === "posting"
            ? "active"
            : "done",
    },
    {
      label: "Sharpen the search",
      detail:
        stage === "refine" || stage === "done"
          ? state.plan.length
            ? `${answered} of ${state.plan.length}`
            : "Nothing to ask"
          : undefined,
      state:
        stage === "refine" ? "active" : stage === "done" ? "done" : "waiting",
    },
    {
      // Never ticked in the chat: posting happens on the form, and a tick
      // here would say the job is up when it is not.
      label: "Review and post",
      state: stage === "done" ? "active" : "waiting",
    },
  ]

  const status = {
    opener:
      state.origin === null
        ? "Choosing how to start"
        : state.origin === "jd"
          ? "Waiting for the JD"
          : state.origin === "job"
            ? "Choosing a job to start from"
            : "Understanding the role",
    posting: "Filling in the posting",
    refine: "Sharpening the search",
    done: "Ready to review",
  }[stage]

  const posting = [
    draft.title,
    draft.locations.length ? draft.locations.join(", ") : null,
    draft.experience ? yearsLabel(draft.experience) : null,
    draft.pay ? payLabel(draft.pay).replace(/ a year$/, "") : null,
    draft.mode ? modeLabel(draft.mode) : null,
    draft.teamScale,
    draft.relocationSupport ? "Relocation supported" : null,
  ].filter((chip): chip is string => Boolean(chip))

  const briefChips = [
    brief.adjacentTitles.length
      ? `+ ${plural(brief.adjacentTitles.length, "neighbouring title")}`
      : null,
    brief.openToMovers === true
      ? "Open to people who'd move"
      : brief.openToMovers === false
        ? "Locals only"
        : null,
    ...brief.industries.map(industryLabel),
    brief.ledTeam ? "Has led a team" : null,
    brief.targetCompanies.length
      ? `Look first at ${plural(brief.targetCompanies.length, "company", "companies")}`
      : null,
    brief.institutes.length ? `Prefers ${brief.institutes.join(", ")}` : null,
    brief.budget
      ? brief.budget.firm
        ? "Firm budget"
        : `Stretch to ₹${brief.budget.upTo}L`
      : null,
    brief.exclusions.length
      ? plural(brief.exclusions.length, "rule-out")
      : null,
  ].filter((chip): chip is string => Boolean(chip))

  let people: RailModel["people"] = null
  if (draft.title) {
    const href = searchHrefFor(state, brand)
    const params = new URLSearchParams(href.split("?")[1] ?? "")
    const pool = poolFor(brand, params.get("q") ?? "", params)
    const base = DATABASE[brand]
    people = {
      matching: roughly(
        Math.min(base, (pool.matching.length * base) / SAMPLE)
      ),
      total: base,
      href,
    }
  }

  return {
    status,
    steps,
    posting,
    must: draft.skills,
    nice: draft.niceSkills,
    brief: briefChips,
    people,
  }
}
