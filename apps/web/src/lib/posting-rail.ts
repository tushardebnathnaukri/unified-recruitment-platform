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
 * EVERY NUMBER IS ONE ANOTHER SCREEN WOULD PRINT. "People this would find" is
 * `poolFor` over the exact link "Find people now" opens — the same filter
 * predicate Search Resume runs over the same dealt people — so the rail and
 * that page cannot disagree. It is a count, not a range: the reference this
 * was designed from shows "550 – 1k", and a range here would be an invention
 * dressed as caution.
 */

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
    people = { matching: pool.matching.length, total: pool.all.length, href }
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
