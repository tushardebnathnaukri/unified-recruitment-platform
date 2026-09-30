import type { LucideIcon } from "lucide-react"
import {
  BriefcaseIcon,
  ListChecksIcon,
  MessageSquareTextIcon,
  SendIcon,
  SlidersHorizontalIcon,
} from "lucide-react"

import type { Brand } from "@workspace/ui/lib/brands"

import {
  CITIES,
  DEMAND,
  SALARY_PERCENTILES,
  SALARY_SUMMARY,
} from "@/lib/insights"
import {
  askFor,
  criteriaOn,
  filled,
  JOB_FIELDS,
  REQUIREMENT_FIELDS,
  currentOf,
  type FieldId,
  type IntakeState,
} from "@/lib/job-intake"
import {
  briefRows,
  coveredTopics,
  LABELS,
  pendingTopics,
  planFor,
  refineAsk,
  type RefineId,
} from "@/lib/job-refine"
import { START_OPTIONS } from "@/lib/job-start"
import { liveJobsFor } from "@/lib/jobs"

/**
 * The tracker beside the one-question-at-a-time posting flow ("Chat alt",
 * `lib/posting-variant.ts`): every question the conversation will ask, laid
 * out ahead of time under the four steps, each marked done, current, skipped
 * or still to come — an onboarding's progress list, where the rail is a
 * record of what has been said.
 *
 * IT IS DERIVED FROM THE SAME STATE THE RAIL READS, so the two variants
 * cannot disagree about what has been gathered. What it adds is what has NOT
 * been asked yet: the posting fields still open, and the refinement topics
 * the rules would pick for this draft (`planFor`) until the real plan is
 * made when refinement is entered — Gemini may choose differently, and the
 * list changes to match when it does. Those are drawn as a forecast, not a
 * promise.
 */
export type WizardStepState = "done" | "active" | "upcoming" | "skipped"

export type WizardStep = {
  /** A posting field, a refinement topic, `start`, `screening` or `review`. */
  id: string
  label: string
  /** The question as it would be asked — what an upcoming step shows. */
  prompt: string
  state: WizardStepState
  /** The answer, once given, in the rail's words. */
  value: string | null
  /** Whether clicking it asks the question again (a `Change:` turn). */
  editable: boolean
  /** A forecast rather than a question the plan holds. */
  forecast?: boolean
}

export type WizardSection = {
  id: "job" | "candidate" | "criteria" | "review"
  title: string
  icon: LucideIcon
  private?: boolean
  state: "done" | "active" | "upcoming"
  steps: WizardStep[]
}

/** The question the left pane is asking — the first open item, by id. */
export function askingNow(state: IntakeState): string | null {
  if (state.stage === "posting") {
    if (state.opener) return state.origin === null ? "start" : "title"
    return state.asking
  }
  if (state.stage === "refine") return pendingTopics(state)[0] ?? null
  if (state.stage === "screen") return "screening"
  return "review"
}

export function wizardFor(state: IntakeState): WizardSection[] {
  const { draft } = state
  const asking = askingNow(state)
  const brief = briefRows(state)

  const field = (id: FieldId): WizardStep => {
    const value = currentOf(draft, id)
    const answered = filled(draft, id)
    const skipped = state.skipped.includes(id)
    return {
      id,
      label: LABELS[id],
      prompt: askFor(id),
      value: answered
        ? value.join(", ")
        : skipped && id === "pay"
          ? "Not disclosed"
          : null,
      state: answered
        ? "done"
        : skipped
          ? "skipped"
          : asking === id
            ? "active"
            : "upcoming",
      editable: answered || skipped,
    }
  }

  const startValue =
    state.basedOn ??
    (state.origin
      ? (START_OPTIONS.find((option) => option.value === state.origin)?.label ??
        null)
      : null)
  const start: WizardStep = {
    id: "start",
    label: "Start",
    prompt: "How would you like to start?",
    value: startValue,
    state: startValue ? "done" : asking === "start" ? "active" : "upcoming",
    editable: false,
  }

  // THE TOPICS: the plan once there is one, the rules' forecast before.
  // Topics the conversation already covered without asking (an industry in
  // the opening sentence) are done, with what the brief holds.
  // Selection criteria switched off on /settings: no topics at all, and the
  // section is the screening question on its own.
  const criteria = criteriaOn(state)
  const covered = criteria ? coveredTopics(state) : []
  const planned: RefineId[] = !criteria
    ? []
    : state.plan.length
      ? state.plan
      : state.stage === "posting"
        ? planFor(draft, null, { model: false }).filter(
            (topic) => !covered.includes(topic)
          )
        : []
  const forecast = !state.plan.length && state.stage === "posting"
  // The skills split is the Skills step already ticked under Candidate
  // details — the ranking answers both — so it is not listed twice.
  const topics = [...new Set([...covered, ...planned])].filter(
    (topic) => topic !== "skillsSplit" || !covered.includes(topic)
  )
  const topicSteps: WizardStep[] = topics.map((topic) => {
    const row = brief.find((entry) => entry.topic === topic)
    const settled = state.settled.includes(topic)
    const done = Boolean(row) || covered.includes(topic)
    return {
      id: topic,
      label: LABELS[topic],
      prompt: refineAsk(topic, draft),
      value: row?.value ?? (done ? "Noted" : null),
      state: done
        ? "done"
        : settled
          ? "skipped"
          : asking === topic
            ? "active"
            : "upcoming",
      editable: done || settled,
      forecast: forecast && !covered.includes(topic),
    }
  })
  const screeningDone = state.stage === "done"
  const screening: WizardStep = {
    id: "screening",
    label: "Screening questions",
    prompt: "Should candidates answer a few questions when they apply?",
    value: screeningDone
      ? draft.screening.length
        ? `${draft.screening.length} question${draft.screening.length === 1 ? "" : "s"}`
        : null
      : null,
    state: screeningDone
      ? draft.screening.length
        ? "done"
        : "skipped"
      : asking === "screening"
        ? "active"
        : "upcoming",
    editable: screeningDone,
  }

  const review: WizardStep = {
    id: "review",
    label: "Review the posting",
    prompt: "Check it over, then post it or find people now.",
    value: null,
    state: state.stage === "done" ? "active" : "upcoming",
    editable: false,
  }

  const sectionState = (steps: WizardStep[]): WizardSection["state"] =>
    steps.some((step) => step.state === "active")
      ? "active"
      : steps.every((step) => step.state === "done" || step.state === "skipped")
        ? "done"
        : "upcoming"

  const job = [start, ...JOB_FIELDS.map(field)]
  const candidate = REQUIREMENT_FIELDS.map(field)
  const criteriaSteps = [...topicSteps, screening]
  // Sections after the one being asked are upcoming even if every step in
  // them is, by coincidence, settled — the candidate section before the
  // opener has been answered, say.
  return [
    {
      id: "job",
      title: "Job details",
      icon: BriefcaseIcon,
      state: sectionState(job),
      steps: job,
    },
    {
      id: "candidate",
      title: "Candidate details",
      icon: ListChecksIcon,
      state: sectionState(candidate),
      steps: candidate,
    },
    {
      id: "criteria",
      title: criteria ? "Selection criteria" : "Screening questions",
      icon: criteria ? SlidersHorizontalIcon : MessageSquareTextIcon,
      private: criteria,
      state:
        state.stage === "refine" || state.stage === "screen"
          ? "active"
          : state.stage === "done"
            ? "done"
            : "upcoming",
      steps: criteriaSteps,
    },
    {
      id: "review",
      title: "Review and post",
      icon: SendIcon,
      state: state.stage === "done" ? "active" : "upcoming",
      steps: [review],
    },
  ]
}

/** "Question 3 of 12" — where the recruiter is, counted over the whole list. */
export function wizardProgress(sections: WizardSection[]) {
  const steps = sections.flatMap((section) => section.steps)
  const total = steps.length
  const done = steps.filter(
    (step) => step.state === "done" || step.state === "skipped"
  ).length
  const current = steps.findIndex((step) => step.state === "active")
  return { total, done, current: current === -1 ? total : current + 1 }
}

// --- Insights -------------------------------------------------------------------

/**
 * What is worth knowing while a question is being answered — from the same
 * data `/insights` draws and the roster the Jobs list shows, never invented.
 * A figure with a label and, where it helps, a line saying what it means for
 * this posting. Empty where nothing here bears on the question.
 */
export type Insight = { label: string; value: string; note?: string }

const lakh = (value: number) => `₹${value}L`

export function insightsFor(
  id: string | null,
  state: IntakeState,
  brand: Brand
): Insight[] {
  const { draft } = state
  const city = draft.locations[0]
  const cityRow = city
    ? CITIES.find((row) => row.city.toLowerCase() === city.toLowerCase())
    : undefined

  switch (id) {
    case "title": {
      const live = liveJobsFor(brand)
      const same = draft.title
        ? live.filter(
            (job) => job.title.toLowerCase() === draft.title!.toLowerCase()
          ).length
        : 0
      return [
        {
          label: "Your live postings",
          value: String(live.length),
          note: same
            ? `${same} of them ${same === 1 ? "is" : "are"} already for this title.`
            : "A title that matches how candidates describe themselves gets found in search.",
        },
      ]
    }
    case "locations": {
      const [first, second, third] = CITIES
      return [
        {
          label: "Where the profiles are",
          value: `${first.city} ${first.share}%`,
          note: `${second.city} ${second.share}%, ${third.city} ${third.share}%. The rest are spread thin.`,
        },
        ...CITIES.filter((row) => row.change < -10)
          .slice(0, 1)
          .map((row) => ({
            label: "Getting cheaper",
            value: row.city,
            note: `Median pay there is down ${Math.abs(row.change)}% on the year, to ${lakh(row.medianLakh)}.`,
          })),
      ]
    }
    case "pay": {
      const [, p25, p50, p75] = SALARY_PERCENTILES
      return [
        {
          label: "What the market asks",
          value: `${lakh(p25.expected)}–${lakh(p75.expected)}`,
          note: `The middle half of expected pay. Candidates ask about ${SALARY_SUMMARY.uplift}% over what they earn now (median ${lakh(p50.current)}).`,
        },
        ...(cityRow
          ? [
              {
                label: `Median in ${cityRow.city}`,
                value: lakh(cityRow.medianLakh),
                note:
                  cityRow.change === 0
                    ? "Flat on the year."
                    : `${cityRow.change > 0 ? "Up" : "Down"} ${Math.abs(cityRow.change)}% on the year.`,
              },
            ]
          : []),
      ]
    }
    case "experience": {
      const first = DEMAND[0]
      const last = DEMAND[DEMAND.length - 1]
      const change = Math.round(
        ((last.postings - first.postings) / first.postings) * 100
      )
      return [
        {
          label: "Demand for this kind of role",
          value: `${change >= 0 ? "+" : ""}${change}%`,
          note: `Postings from ${first.month} to ${last.month}. A wide band of years finds more people; a narrow one finds the right ones.`,
        },
      ]
    }
    case "skills":
      return [
        {
          label: "Ranking, not filtering",
          value: "Skills order people",
          note: "Must-haves rank the search; nobody is removed for missing one. Three or four is plenty.",
        },
      ]
    case "relocation":
      return cityRow
        ? [
            {
              label: `Outside ${cityRow.city}`,
              value: `${Math.round(100 - cityRow.share)}%`,
              note: "Of the profiles. Being open to movers is the single widest change you can make.",
            },
          ]
        : []
    case "budget": {
      const [, , p50, p75, p90] = SALARY_PERCENTILES
      return [
        {
          label: "Where a ceiling bites",
          value: `${lakh(p75.expected)} · ${lakh(p90.expected)}`,
          note: `The 75th and 90th percentiles of what people ask for. Median is ${lakh(p50.expected)}.`,
        },
      ]
    }
    default:
      return []
  }
}
