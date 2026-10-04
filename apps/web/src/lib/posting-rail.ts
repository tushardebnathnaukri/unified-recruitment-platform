import {
  BriefcaseIcon,
  ListChecksIcon,
  MessageSquareTextIcon,
  SearchIcon,
  SendIcon,
  SlidersHorizontalIcon,
  ThumbsUpIcon,
  type LucideIcon,
} from "lucide-react"

import type { Brand } from "@workspace/ui/lib/brands"

import { poolFor } from "@/lib/calibration"
import {
  criteriaOn,
  filled,
  JOB_FIELDS,
  modeLabel,
  payLabel,
  REQUIREMENT_FIELDS,
  yearsLabel,
  type FieldId,
  type IntakeState,
  type PostingDraft,
} from "@/lib/job-intake"
import { briefRows, pendingTopics, searchHrefFor } from "@/lib/job-refine"
import {
  pendingQuestions,
  personOf,
  searchCriteria,
  searchHrefFor as searchHrefOf,
  searchPool,
  searchReviewees,
  searchRows,
  searchSummary,
  type SearchPerson,
  type SearchState,
} from "@/lib/search-intake"

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

/**
 * A count of dealt people, projected onto the database the way the rail's
 * "People this would find" is — for anything else that shows the same number
 * (Chat v3's pool moves and filter costs), so the two cannot disagree.
 */
export function projected(count: number, brand: Brand) {
  const base = DATABASE[brand]
  return roughly(Math.min(base, (count * base) / SAMPLE))
}

export const DATABASE_SIZE = DATABASE

/** The search a posting opens, and the pool it finds. */
export function postingSearch(state: IntakeState, brand: Brand) {
  const href = searchHrefFor(state, brand)
  const params = new URLSearchParams(href.split("?")[1] ?? "")
  const pool = poolFor(brand, params.get("q") ?? "", params)
  return { href, params, pool }
}

export type RailStep = {
  label: string
  /** For the bar across the top ("Chat with rail v2"); the column uses glyphs. */
  icon: LucideIcon
  /** Never shown to candidates — drawn with a lock. */
  private?: boolean
  /** Said quietly beside it — "4 of 6", "2 of 4", the role. */
  detail?: string
  /** `skipped` is an optional stage waved past — drawn muted, not ticked. */
  state: "done" | "active" | "waiting" | "skipped"
}

/**
 * One fact, labelled. A null value is a field the posting still needs; `id`
 * is the question that set it, for the pencil that asks it again.
 */
export type RailRow = {
  label: string
  value: string | null
  /** The question that set it — a posting field, a topic, or a search question. */
  id?: string
}

/**
 * A section of the rail's Details view, for a conversation that is not a
 * posting: a heading tied to a step, rows with pencils, chips, or a list.
 */
export type RailSection = {
  id: string
  title: string
  /** Which step it belongs to — its icon and status chip come from there. */
  step?: number
  private?: boolean
  rows?: RailRow[]
  /** `empty` is what an answered-but-empty set says ("None named"); without
   *  it an empty set draws a dash, meaning the answer is still owed. */
  chips?: { label: string; items: string[]; editId?: string; empty?: string }[]
  list?: { label: string; items: string[]; editId?: string; empty: string }
}

export type RailModel = {
  kind: "posting" | "search"
  status: string
  steps: RailStep[]
  /** The posting itself, for the rail's card view (`PostingCard`); null for a search. */
  draft: PostingDraft | null
  /** A search's Details view — generic sections where a posting has its own. */
  sections?: RailSection[]
  /** A search's Preview: the three people it ranks first. */
  preview?: SearchPerson[]
  /**
   * THE POSTING AS LABELLED ROWS, NOT CHIPS, IN THE STEPPER'S TWO GROUPS. "Mumbai", "8–12 years" and
   * "Hybrid" as three identical chips had to be decoded one by one; a label
   * beside each says what it is at a glance. Rows also show what is still
   * MISSING — a dash where the answer will go — which a chip cannot, so the
   * rail is the checklist as well as the record. `job` is always the four
   * job fields, plus team and relocation once said; `requirements` is the
   * experience row — the skills beside it are `must` and `nice`.
   */
  job: RailRow[]
  requirements: RailRow[]
  must: string[]
  nice: string[]
  /** The private brief so far — `briefRows`, the same rows the finish card prints. */
  brief: RailRow[]
  /** The screening questions, once the step has been reached; null before. */
  screening: string[] | null
  /** Null until there is a role to count people for. */
  people: { matching: number; total: number; href: string } | null
}

/** "3 screening questions". */
function screeningCount(count: number) {
  return `${count} screening question${count === 1 ? "" : "s"}`
}

export function railFor(state: IntakeState, brand: Brand): RailModel {
  const { draft } = state
  const stage = state.opener ? "opener" : state.stage
  // A base job copies its own title, and the card names it "Title — City",
  // so "Title · From Title — City" said one thing twice. When the base's
  // name already starts with the title, the base is the whole detail.
  const from = state.basedOn
    ? `From ${state.basedOn}`
    : state.origin === "jd"
      ? "From a JD"
      : null
  const titled =
    state.basedOn && draft.title && state.basedOn.startsWith(draft.title)
      ? null
      : draft.title
  const settled = (id: FieldId) =>
    filled(draft, id) || state.skipped.includes(id)
  const jobFilled = JOB_FIELDS.filter(settled).length
  const reqFilled = REQUIREMENT_FIELDS.filter(settled).length
  const jobDone = jobFilled === JOB_FIELDS.length
  const reqDone = reqFilled === REQUIREMENT_FIELDS.length
  const answered = state.plan.length - pendingTopics(state).length

  /**
   * FIVE STEPS, NAMED FOR WHAT A RECRUITER TELLS APART: what the job is,
   * what the candidate must have, how to pick between the ones who do
   * (private — it becomes Search Resume's criteria, and its optional tail
   * is the screening questions candidates answer when they apply), and
   * posting. The chat gathers the first three; the last is the form's,
   * and is never ticked here.
   */
  const steps: RailStep[] = [
    {
      icon: BriefcaseIcon,
      label: "Job details",
      detail:
        stage === "opener"
          ? [titled, from].filter(Boolean).join(" · ") ||
            (state.origin === "scratch" ? "From scratch" : undefined)
          : `${jobFilled} of ${JOB_FIELDS.length}`,
      state:
        stage === "opener" || (stage === "posting" && !jobDone)
          ? "active"
          : "done",
    },
    {
      icon: ListChecksIcon,
      label: "Candidate details",
      detail:
        stage === "opener"
          ? undefined
          : `${reqFilled} of ${REQUIREMENT_FIELDS.length}`,
      state:
        stage === "opener"
          ? "waiting"
          : stage === "posting"
            ? reqDone
              ? "done"
              : jobDone
                ? "active"
                : "waiting"
            : "done",
    },
    // Step 3: the private brief with screening as its tail — or, with
    // Selection criteria switched off on /settings, the screening questions
    // on their own, which are not private: candidates answer them.
    criteriaOn(state)
      ? {
          icon: SlidersHorizontalIcon,
          label: "Selection criteria",
          private: true,
          // Two asks in one step: the refinement topics, then — optional —
          // the screening questions. The count is the topics'; the
          // questions are said once they are set.
          detail:
            stage === "refine" || stage === "screen" || stage === "done"
              ? [
                  state.plan.length
                    ? `${answered} of ${state.plan.length}`
                    : "Nothing to ask",
                  stage === "done" && draft.screening.length
                    ? screeningCount(draft.screening.length)
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : undefined,
          state:
            stage === "refine" || stage === "screen"
              ? "active"
              : stage === "done"
                ? "done"
                : "waiting",
        }
      : {
          icon: MessageSquareTextIcon,
          label: "Screening questions",
          detail:
            stage === "done"
              ? draft.screening.length
                ? screeningCount(draft.screening.length)
                : "None"
              : stage === "screen"
                ? "Optional"
                : undefined,
          state:
            stage === "screen"
              ? "active"
              : stage === "done"
                ? draft.screening.length
                  ? "done"
                  : "skipped"
                : "waiting",
        },
    {
      // Never ticked in the chat: posting happens on the form, and a tick
      // here would say the job is up when it is not.
      icon: SendIcon,
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
            : "Starting the job details",
    posting: jobDone
      ? "Filling in the candidate details"
      : "Filling in the job details",
    refine: "Setting selection criteria",
    screen: criteriaOn(state)
      ? "Setting selection criteria"
      : "Setting screening questions",
    done: "Ready to review",
  }[stage]

  const job: RailRow[] = [
    { id: "title", label: "Role", value: draft.title },
    {
      id: "locations",
      label: "Location",
      value: draft.locations.length ? draft.locations.join(", ") : null,
    },
    {
      id: "pay",
      label: "Pay",
      value: draft.pay
        ? payLabel(draft.pay).replace(/ a year$/, "")
        : state.skipped.includes("pay")
          ? "Not disclosed"
          : null,
    },
    {
      id: "mode",
      label: "Work mode",
      value: draft.mode ? modeLabel(draft.mode) : null,
    },
    ...(draft.teamScale
      ? [{ id: "scale" as const, label: "Team", value: draft.teamScale }]
      : []),
    ...(draft.relocationSupport
      ? [{ id: "relocation" as const, label: "Relocation", value: "Supported" }]
      : []),
  ]
  const requirements: RailRow[] = [
    {
      id: "experience",
      label: "Experience",
      value: draft.experience ? yearsLabel(draft.experience) : null,
    },
  ]

  let people: RailModel["people"] = null
  if (draft.title) {
    const { href, pool } = postingSearch(state, brand)
    people = {
      matching: projected(pool.matching.length, brand),
      total: DATABASE[brand],
      href,
    }
  }

  return {
    kind: "posting",
    status,
    steps,
    draft,
    job,
    requirements,
    must: draft.skills,
    nice: draft.niceSkills,
    brief: briefRows(state).map(({ topic, ...row }) => ({ ...row, id: topic })),
    screening: stage === "screen" || stage === "done" ? draft.screening : null,
    people,
  }
}

// --- The search conversation's rail ---------------------------------------------------

/**
 * The rail for a search — the same shape as a posting's, so the bar, the
 * panels and the pencils are one piece of furniture, with the search's own
 * four steps and its own sections: the requirement, the criteria, the
 * calibration, and how many people it finds. The count here is the sample's
 * own, not projected onto the database: Search Resume counts its sample, and
 * a search's rail should say what its results page will.
 */
export function searchRailFor(state: SearchState, brand: Brand): RailModel {
  const rows = searchRows(state, brand)
  const answeredCount =
    Object.keys(state.answered).length + state.skipped.length
  const left =
    state.stage === "opener" ? 0 : pendingQuestions(state, brand).length
  const judged = Object.values(state.judged)
  const kept = judged.filter((j) => j === "kept").length

  const steps: RailStep[] = [
    {
      icon: SearchIcon,
      label: "Requirement",
      detail:
        state.stage === "opener" ? undefined : searchSummary(state, brand),
      state: state.stage === "opener" ? "active" : "done",
    },
    {
      icon: SlidersHorizontalIcon,
      label: "Search criteria",
      detail:
        state.stage === "opener"
          ? undefined
          : `${answeredCount} of ${answeredCount + left}`,
      state:
        state.stage === "opener"
          ? "waiting"
          : state.stage === "criteria"
            ? "active"
            : "done",
    },
    {
      icon: ThumbsUpIcon,
      label: "Calibrate",
      detail:
        state.stage === "calibrate"
          ? "Optional"
          : state.stage === "done"
            ? judged.length
              ? `${kept} kept, ${judged.length - kept} not a fit`
              : "Skipped"
            : undefined,
      state:
        state.stage === "calibrate"
          ? "active"
          : state.stage === "done"
            ? judged.length
              ? "done"
              : "skipped"
            : "waiting",
    },
    {
      icon: SendIcon,
      label: "Open the search",
      state: state.stage === "done" ? "active" : "waiting",
    },
  ]

  const status = {
    opener: "Describing who you're looking for",
    criteria: "Setting search criteria",
    calibrate: "Calibrating the search",
    done: "Ready to search",
  }[state.stage]

  const started = state.stage !== "opener"
  const pool = started ? searchPool(state, brand) : null
  const criteria = started ? searchCriteria(state, brand) : []

  const sections: RailSection[] = [
    {
      id: "requirement",
      title: "Requirement",
      step: 0,
      rows: rows.requirement,
      chips: [
        {
          label: "Skills",
          items: rows.skills,
          editId: "skills",
          empty: state.skipped.includes("skills") ? "None named" : undefined,
        },
      ],
    },
    {
      id: "criteria",
      title: "Search criteria",
      step: 1,
      rows: rows.criteria,
    },
    ...(state.stage === "calibrate" || state.stage === "done"
      ? [
          {
            id: "calibration",
            title: "Calibration",
            step: 2,
            private: true,
            list: {
              label: "Criteria, most important first",
              items: criteria,
              empty: "Nothing to rank yet.",
            },
          },
        ]
      : []),
  ]

  return {
    kind: "search",
    status,
    steps,
    draft: null,
    sections,
    preview: started ? searchReviewees(state, brand).map(personOf) : undefined,
    job: [],
    requirements: [],
    must: [],
    nice: [],
    brief: [],
    screening: null,
    people: pool
      ? {
          matching: pool.matching.length,
          total: pool.all.length,
          href: searchHrefOf(state, brand),
        }
      : null,
  }
}
