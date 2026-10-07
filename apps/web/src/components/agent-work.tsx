import * as React from "react"
import { CheckIcon, ChevronRightIcon, LoaderIcon } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

import type { Work } from "@/lib/step-milestones"

/** The least time "Reading your answer" runs for, however fast the reader. */
const READ_MS = 1000
/** Each task after it. */
const TASK_MS = 650

/**
 * Chat v2.7's work card: the agent's work on one answer, inline in the chat
 * where "Reading your answer…" used to be — the step it is for, as a pill, and
 * a checklist of what it does, each task waiting, then running, then done.
 *
 * THE PACE IS STAGED, ON PURPOSE. Gemini often answers in under a second, and
 * a reply that appears at once reads as canned; a checklist that ticks through
 * at a readable pace says work was done, and what. So `live` runs the tasks in
 * turn — the first holds until the answer is in AND at least `READ_MS` has
 * passed, each after it takes `TASK_MS` — and only then calls `onDone`, which
 * is when the page shows the reply. What the tasks SAY is never staged: see
 * `workFor` in `lib/step-milestones.ts`.
 *
 * DONE, IT FOLDS to one line — the step, how many tasks, who read it — that
 * opens back into the checklist, so a long conversation is not a stack of
 * cards. A card that is not live (an earlier turn, a reload) is folded from
 * the start and plays nothing.
 */
export function AgentWorkCard({
  work,
  live,
  ready,
  onDone,
}: {
  work: Work
  /** Run the tasks in turn now — the newest answer, asked in this visit. */
  live: boolean
  /** The answer has been read, so the first task may finish. */
  ready: boolean
  onDone?: () => void
}) {
  const { step, tasks } = work
  const [phase, setPhase] = React.useState(live ? 0 : Infinity)
  const started = React.useRef(0)
  const done = phase >= tasks.length
  // The latest `onDone`, so a parent re-render — which hands down a new
  // function — does not restart the running task's timer.
  const finish = React.useRef(onDone)
  React.useEffect(() => {
    finish.current = onDone
  }, [onDone])

  React.useEffect(() => {
    if (!live || phase >= tasks.length) return
    if (phase === 0 && !started.current) started.current = performance.now()
    if (phase === 0 && !ready) return
    const wait =
      phase === 0
        ? Math.max(0, READ_MS - (performance.now() - started.current))
        : TASK_MS
    const timer = setTimeout(() => {
      setPhase(phase + 1)
      if (phase + 1 >= tasks.length) finish.current?.()
    }, wait)
    return () => clearTimeout(timer)
  }, [live, phase, ready, tasks.length])

  const list = (
    <ol className="flex flex-col gap-3">
      {tasks.map((task, index) => {
        const state =
          index < phase ? "done" : index === phase ? "running" : "waiting"
        return (
          <li key={task.label} className="flex items-start gap-3">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full",
                state === "waiting" ? "bg-muted" : "bg-primary/10 text-primary"
              )}
            >
              {state === "done" ? (
                <CheckIcon className="size-3.5" strokeWidth={3} />
              ) : state === "running" ? (
                <LoaderIcon className="size-3.5 animate-spin" />
              ) : null}
            </span>
            <span className="flex min-w-0 flex-col pt-0.5">
              <span
                className={cn(
                  "text-sm leading-5 font-medium",
                  state === "waiting" && "text-muted-foreground"
                )}
              >
                {task.label}
                {state === "running" ? "…" : ""}
              </span>
              {task.detail ? (
                <span
                  className={cn(
                    "text-xs leading-4",
                    state === "waiting"
                      ? "text-muted-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {task.detail}
                </span>
              ) : null}
            </span>
          </li>
        )
      })}
    </ol>
  )

  const pill = (
    <span className="inline-flex w-fit items-center rounded-full bg-foreground px-2.5 py-0.5 text-xs font-semibold text-background">
      Step {step.number}/{step.total} · {step.label}
    </span>
  )

  if (!done)
    return (
      <div
        aria-live="polite"
        className="ml-10 flex max-w-md flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
      >
        {pill}
        {list}
      </div>
    )

  const read = tasks[0]?.detail
  return (
    <details className="group/work ml-10 text-xs text-muted-foreground">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md py-0.5 hover:text-foreground [&::-webkit-details-marker]:hidden">
        <CheckIcon className="size-3.5 text-primary" strokeWidth={3} />
        Step {step.number}/{step.total} · {step.label} · {tasks.length} done
        {read ? ` · ${read}` : ""}
        <ChevronRightIcon className="size-3.5 transition-transform group-open/work:rotate-90" />
      </summary>
      <div className="mt-2 mb-1 flex max-w-md flex-col gap-3 rounded-2xl bg-card p-4 text-foreground ring-1 ring-foreground/10">
        {pill}
        {list}
      </div>
    </details>
  )
}
