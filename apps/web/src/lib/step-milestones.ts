import {
  modeLabel,
  payLabel,
  yearsLabel,
  type IntakeState,
} from "@/lib/job-intake"
import { railSteps, type RailStep } from "@/lib/posting-rail"
import type { Answer, Block } from "@/lib/agent"

/**
 * Chat v2.7's milestones: which of the posting's steps finished on which turn,
 * what each recorded, and what is being asked next.
 *
 * DERIVED FROM THE TURNS, NEVER STORED. `answersFor` already returns the
 * posting state after every turn (`states`); a step that is done (or waved
 * past) after a turn and was not before it finished on that turn. So the
 * milestone lines in the transcript come back on a reload, in the same places,
 * with no turn of their own — and the live cheer (`play("step")`, confetti)
 * is the page's business, fired only when a turn lands in this visit.
 *
 * "Review and post" is never one: it is the form's step, and the chat never
 * ticks it (see `railSteps`).
 */
export type Milestone = {
  /** The step that finished. */
  label: string
  /** Its number on the plan bar, from 1. */
  number: number
  /** How many steps the plan bar has — "Step 2/4". */
  total: number
  /** Waved past rather than done — an optional step left empty. */
  skipped: boolean
  /** What it recorded, in one line, or null when there is nothing to say. */
  recap: string | null
  /** The step being asked now: the next one, or "Review and post" at the end. */
  next: string | null
  /** The next step's number on the plan bar. */
  nextNumber: number | null
  /** This turn finished the chat's part of the posting. */
  last: boolean
}

const FORM_STEP = "Review and post"

const finished = (step: RailStep | undefined) =>
  step?.state === "done" || step?.state === "skipped"

export function milestonesFor(
  states: (IntakeState | null)[]
): Map<number, Milestone[]> {
  const milestones = new Map<number, Milestone[]>()
  let before: RailStep[] | null = null

  states.forEach((state, index) => {
    if (!state) return
    const after = railSteps(state)
    // A fresh posting starts with nothing finished, so comparing step by step
    // against the last posting's state never invents a milestone for it.
    const newly = after
      .map((step, at) => ({ step, number: at + 1 }))
      .filter(
        ({ step, number }) =>
          step.label !== FORM_STEP &&
          finished(step) &&
          !finished(before?.[number - 1])
      )
    if (newly.length > 0) {
      const nextAt = after.findIndex((step) => step.state === "active")
      milestones.set(
        index,
        newly.map(({ step, number }) => ({
          label: step.label,
          number,
          total: after.length,
          skipped: step.state === "skipped",
          recap: recapOf(step, state),
          next: nextAt === -1 ? null : after[nextAt].label,
          nextNumber: nextAt === -1 ? null : nextAt + 1,
          last: state.stage === "done",
        }))
      )
    }
    before = after
  })

  return milestones
}

/** What a finished step recorded, in the rail's own words. */
function recapOf(step: RailStep, state: IntakeState): string | null {
  const { draft } = state
  const parts =
    step.label === "Job details"
      ? [
          draft.title,
          draft.locations.length ? draft.locations.join(", ") : null,
          draft.pay
            ? payLabel(draft.pay).replace(/ a year$/, "")
            : state.skipped.includes("pay")
              ? "Pay not disclosed"
              : null,
          draft.mode ? modeLabel(draft.mode) : null,
        ]
      : step.label === "Candidate details"
        ? [
            draft.experience ? yearsLabel(draft.experience) : null,
            draft.skills.length
              ? `${draft.skills.length} ${draft.skills.length === 1 ? "skill" : "skills"}`
              : null,
          ]
        : // Selection criteria / screening: the rail's own count says it —
          // except "Nothing to ask", which after "post it now" reads as a
          // non sequitur under "done".
          (step.detail ?? "")
            .split(" · ")
            .filter((part) => part !== "Nothing to ask")
  const said = parts.filter(Boolean).join(" · ")
  return said || null
}

// --- The work card -----------------------------------------------------------

/**
 * One thing the agent does with an answer, for Chat v2.7's work card: what it
 * is called while it runs and when it is done, and the fact under it.
 *
 * EVERY TASK IS SOMETHING THE PAGE ACTUALLY DOES, and every detail is read off
 * what it did — who read the answer and how long it took (`WorkStep`), which
 * fields it recorded, how many people the posting now finds (the rail's own
 * count), and the question it asks next. Nothing is narrated that did not
 * happen; the only thing staged is the PACE (`components/agent-work.tsx`).
 */
export type WorkTask = {
  label: string
  /** Said under the label — the fact, or what it is doing while it runs. */
  detail: string | null
}

export type Work = {
  /** The step the answer was for: the one in progress BEFORE it. */
  step: { number: number; total: number; label: string }
  tasks: WorkTask[]
}

/**
 * The card for one answered (or being-read) turn.
 *
 * `people` is the rail's count for the posting AFTER this turn, which the
 * page has only for the newest turn (counting the pool once per turn would be
 * far too heavy) — older cards say where they looked rather than a number.
 */
export function workFor({
  answer,
  before,
  after,
  people,
}: {
  answer: Answer | null
  /** The posting before this turn, if it had started. */
  before: IntakeState | null
  /** After it — null while the answer is still being read. */
  after: IntakeState | null
  people: { matching: number; total: number } | null
}): Work {
  // The step in progress BEFORE the answer. With no posting yet, the answer
  // is the one that starts it, so it is for the first step — never the step
  // the answer moved on to.
  const steps = before ? railSteps(before) : after ? railSteps(after) : []
  const at = before
    ? Math.max(
        0,
        steps.findIndex((step) => step.state === "active")
      )
    : 0
  const step = {
    number: at + 1,
    total: steps.length || 4,
    label: steps[at]?.label ?? "Job details",
  }

  const read = answer?.step
  const took =
    read?.took && read.took >= 200
      ? ` in ${(read.took / 1000).toFixed(1)}s`
      : ""
  const titled = Boolean(after?.draft.title ?? before?.draft.title)
  const asks = answer?.blocks.find(
    (block): block is Extract<Block, { kind: "questionnaire" }> =>
      block.kind === "questionnaire"
  )
  const count = (value: number) => value.toLocaleString("en-IN")

  const tasks: WorkTask[] = [
    {
      label: "Reading your answer",
      detail: read
        ? read.by === "gemini"
          ? `Read by Gemini${took}`
          : `Read by the rules${read.note ? ` · ${read.note}` : ""}`
        : "Working out what you meant",
    },
    {
      label: "Updating the posting",
      detail: read
        ? read.recorded.length
          ? read.recorded.map((row) => row.label).join(", ")
          : "Nothing new to record"
        : "What your answer changes",
    },
    ...(titled
      ? [
          {
            label: "Checking who this would find",
            detail: people
              ? `${count(people.matching)} of ${count(people.total)} profiles`
              : "Against the database",
          },
        ]
      : []),
    {
      label: "Choosing what to ask next",
      detail: asks?.items[0]
        ? asks.items[0].prompt
        : after?.stage === "done"
          ? "Nothing — it is ready to review"
          : answer
            ? null
            : "The next question",
    },
  ]

  return { step, tasks }
}
