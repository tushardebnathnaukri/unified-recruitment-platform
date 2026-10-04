import {
  ActivityIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  LockIcon,
  LockOpenIcon,
  SparklesIcon,
} from "lucide-react"

import type { Brand } from "@workspace/ui/lib/brands"
import { cn } from "@workspace/ui/lib/utils"

import { RequirementRows } from "@/components/chat-v3/requirements"
import {
  PersonCard,
  PostingRail,
  type RailExtras,
} from "@/components/posting-rail"
import { attachmentIn, type WorkStep } from "@/lib/agent"
import {
  FIELD_LABEL,
  SOURCE_LABEL,
  changesFor,
  encodeLock,
  guardrailFor,
  lastMoveOf,
  nudgesFor,
  requirementsOf,
  samplesFor,
  skillMoves,
  statusOf,
  type Provenance,
  type Source,
} from "@/lib/chat-v3"
import type { FieldId, IntakeState } from "@/lib/job-intake"
import type { RailModel } from "@/lib/posting-rail"

/**
 * SOURCES ON THE SYSTEM'S OWN TOKENS, by fill and outline rather than hue:
 * what the recruiter (or their hiring manager) said takes the brand tint,
 * what the agent filled is a plain outline, an edit is a secondary fill, and
 * what is still owed is the destructive tint.
 */
const TONE: Record<Source, string> = {
  brief: "bg-primary/10 text-primary",
  jd: "bg-primary/10 text-primary",
  job: "bg-primary/10 text-primary",
  answered: "bg-primary/10 text-primary",
  note: "bg-primary/10 text-primary",
  suggested: "border border-border bg-background text-foreground",
  edited: "bg-secondary text-secondary-foreground",
  needs: "bg-destructive/10 text-destructive",
}

/** The six posting fields, in the order the rail draws them. */
const ORDER: FieldId[] = [
  "title",
  "locations",
  "pay",
  "mode",
  "experience",
  "skills",
]

const isField = (id: string): id is FieldId => id in FIELD_LABEL

export function SourceChip({ source }: { source: Source }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[11px] leading-4 font-medium whitespace-nowrap",
        TONE[source]
      )}
    >
      {SOURCE_LABEL[source]}
    </span>
  )
}

/**
 * Chat v3's rail: v2's rail with where every value came from beside it, a
 * lock on every value the agent could otherwise change, and the rows filling
 * in turn as a reading lands.
 */
export function ChatV3Rail({
  model,
  posting,
  provenance,
  prompts,
  states,
  steps,
  brand,
  reading,
  openView,
  onEdit,
  onAsk,
}: {
  model: RailModel
  posting: IntakeState
  provenance: Provenance
  /** The turns and the state after each — for the last move and "Recent". */
  prompts: string[]
  states: (IntakeState | null)[]
  /** Every reply's work, in order — the activity log. */
  steps: WorkStep[]
  brand: Brand
  reading: boolean
  /** Asked to open the Candidates view (the finish card's link). */
  openView: string | null
  onEdit: (id: string) => void
  onAsk: (prompt: string) => void
}) {
  const locked = posting.locked ?? []
  const isAttachment = (prompt: string) => attachmentIn(prompt) !== null
  const changes = changesFor(prompts, states, isAttachment)
  const status = statusOf(posting, provenance, changes)
  const nudges = reading ? [] : nudgesFor(posting, brand)
  const titled = Boolean(posting.draft.title)
  const requirements = titled ? requirementsOf(posting, brand) : []
  const samples = samplesFor(posting, brand)

  const extras: RailExtras = {
    // The lock beside the pencil; where the value came from under it, so a
    // chip never squeezes the value it describes.
    rowAside: (id) => {
      if (!isField(id)) return null
      const source = provenance[id]
      if (!source || source === "needs") return null
      const on = locked.includes(id)
      return (
        <button
          type="button"
          disabled={reading}
          aria-pressed={on}
          aria-label={`${on ? "Unlock" : "Lock"} ${FIELD_LABEL[id].toLowerCase()}`}
          title={
            on
              ? "Locked: the agent won't change this"
              : "Lock it so the agent won't change it"
          }
          onClick={() => onAsk(encodeLock(id, !on))}
          className={cn(
            "-my-0.5 grid size-6 shrink-0 place-items-center rounded-full transition-[opacity,color,background-color] hover:bg-muted disabled:pointer-events-none",
            on
              ? "text-foreground"
              : "text-muted-foreground opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
          )}
        >
          {on ? (
            <LockIcon className="size-3.5" />
          ) : (
            <LockOpenIcon className="size-3.5" />
          )}
        </button>
      )
    },
    rowBelow: (id) => {
      if (!isField(id)) return null
      const source = provenance[id]
      // Nothing is owed before the agent has read anything.
      const chip =
        source && !(source === "needs" && posting.opener) ? source : null
      const nudge = nudges.find((entry) => entry.id === id)
      if (!chip && !nudge) return null
      return (
        <span className="flex flex-col items-start gap-1">
          {chip ? <SourceChip source={chip} /> : null}
          {nudge ? (
            <button
              type="button"
              onClick={() => onAsk(nudge.prompt)}
              title="From the market data on /insights"
              className="inline-flex items-center gap-1 text-left text-xs font-normal text-primary hover:underline"
            >
              <SparklesIcon className="size-3 shrink-0" />
              {nudge.label}
            </button>
          ) : null}
        </span>
      )
    },
    requirements: titled ? (
      <RequirementRows
        requirements={requirements}
        skills={skillMoves(posting)}
        move={lastMoveOf(prompts, states, brand)}
        guardrail={guardrailFor(posting, brand)}
        reading={reading}
        onAsk={onAsk}
        onEdit={onEdit}
      />
    ) : undefined,
    top: titled ? (
      <StatusPanel
        needs={status.needs}
        recent={status.recent}
        next={reading ? "Reading your answer…" : model.status}
        onEdit={onEdit}
      />
    ) : undefined,
    view: {
      id: "candidates",
      label: "Candidates",
      content: samples ? (
        <>
          <p className="text-xs font-medium text-muted-foreground">
            The three this posting's search ranks first, checked against it
          </p>
          {samples.length ? (
            samples.map((sample) => (
              <div key={sample.person.id} className="flex flex-col gap-1.5">
                <PersonCard person={sample.person} />
                {sample.of ? (
                  <p className="px-1 text-xs font-medium">
                    Meets {sample.met} of {sample.of} key skills
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              The must-haves leave nobody. Make one a good-to-have and people
              appear here.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nobody to show until the role is named.
        </p>
      ),
    },
    openView,
    bottom: steps.length ? <ActivityLog steps={steps} /> : undefined,
    rowReveal: (id) => (isField(id) ? ORDER.indexOf(id) : null),
  }

  return (
    <PostingRail
      model={model}
      reading={reading}
      onEdit={onEdit}
      plan={false}
      extras={extras}
    />
  )
}

/** Needs you, Recent, Working on next — the agent's own account of itself. */
function StatusPanel({
  needs,
  recent,
  next,
  onEdit,
}: {
  needs: FieldId[]
  recent: { field: FieldId; source: Source; turn: number }[]
  next: string
  onEdit: (id: string) => void
}) {
  return (
    <section className="flex flex-col gap-2.5 rounded-xl border bg-background p-3">
      {needs.length ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-destructive">
            Needs you · {needs.length}
          </p>
          {needs.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onEdit(id)}
              className="flex items-center gap-2 rounded-lg bg-destructive/5 px-2 py-1.5 text-left text-sm hover:bg-destructive/10"
            >
              <CircleAlertIcon className="size-3.5 text-destructive" />
              <span className="flex-1">{FIELD_LABEL[id]}</span>
              <ChevronRightIcon className="size-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : null}
      {recent.length ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">Recent</p>
          {recent.map((change) => (
            <p
              key={`${change.turn}-${change.field}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span>{FIELD_LABEL[change.field]}</span>
              <SourceChip source={change.source} />
            </p>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-medium text-muted-foreground">
          Working on next
        </p>
        <p className="text-sm">{next}</p>
      </div>
    </section>
  )
}

/** Every reading the agent made, collapsed: who read it, how long, what. */
function ActivityLog({ steps }: { steps: WorkStep[] }) {
  return (
    <details className="group/log rounded-xl border bg-background px-3 py-2.5 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <ActivityIcon className="size-3.5 text-muted-foreground" />
        <span className="flex-1 font-medium">
          Worked through {steps.length} step{steps.length === 1 ? "" : "s"}
        </span>
        <ChevronRightIcon className="size-3.5 text-muted-foreground transition-transform group-open/log:rotate-90" />
      </summary>
      <ol className="mt-2 flex flex-col gap-2 border-t pt-2">
        {steps.map((step, index) => (
          <li key={index} className="flex flex-col gap-0.5 text-xs">
            <span className="font-medium">
              {step.by === "gemini" ? "Read by Gemini" : "Read by rules"}
              {step.took && step.took >= 200
                ? ` in ${(step.took / 1000).toFixed(1)}s`
                : ""}
            </span>
            <span className="text-muted-foreground">
              {step.recorded.length
                ? step.recorded
                    .map((row) => `${row.label}: ${row.value}`)
                    .join(" · ")
                : "Nothing new recorded"}
            </span>
          </li>
        ))}
      </ol>
    </details>
  )
}
