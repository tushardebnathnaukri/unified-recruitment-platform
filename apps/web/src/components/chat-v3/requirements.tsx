import * as React from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"

import { encodeFilter, type Requirement, type skillMoves } from "@/lib/chat-v3"
import type { FilterId } from "@/lib/job-refine"

/** Which question a filter's "Change it" asks again. */
const EDIT_ID: Record<FilterId, string> = {
  city: "locations",
  years: "experience",
  industries: "industry",
  team: "scale",
  companies: "targets",
  budget: "budget",
}

const people = (n: number) => n.toLocaleString("en-IN")

type Skills = ReturnType<typeof skillMoves>

/**
 * MUST HAVE NARROWS, GOOD TO HAVE RANKS — said as plainly as the search does
 * it. The posting's filters (city, years, industry, team, companies, the pay
 * ceiling) are the only things that remove anybody, so they are the Must
 * have row, each with the people relaxing it would bring back. Skills only
 * ever order people, so they live in Good to have, key skills first; moving
 * one says so instead of pretending the pool moved.
 */
export function RequirementRows({
  requirements,
  skills,
  move,
  guardrail,
  reading,
  onAsk,
  onEdit,
}: {
  requirements: Requirement[]
  skills: Skills
  move: {
    text: string
    before: number
    after: number
    undo: string | null
  } | null
  guardrail: { requirement: Requirement; now: number; after: number } | null
  reading: boolean
  onAsk: (prompt: string) => void
  onEdit: (id: string) => void
}) {
  const must = requirements.filter((requirement) => requirement.must)
  const good = requirements.filter((requirement) => !requirement.must)
  const send = (prompt: string | null) => {
    if (prompt && !reading) onAsk(prompt)
  }

  return (
    <div className="flex flex-col gap-3">
      <Row
        title="Must have"
        sub="Narrows who is found"
        onDrop={(id) => send(encodeFilter({ id, to: "must" }))}
      >
        {must.map((requirement) => (
          <FilterChip
            key={requirement.id}
            requirement={requirement}
            onMove={() =>
              send(encodeFilter({ id: requirement.id, to: "good" }))
            }
            onDrop={() =>
              send(encodeFilter({ id: requirement.id, to: "none" }))
            }
            onEdit={() => onEdit(EDIT_ID[requirement.id])}
          />
        ))}
        {!must.length ? <Empty>Nothing narrows the pool yet.</Empty> : null}
      </Row>

      <Row
        title="Good to have"
        sub="Ranks who is found, removes nobody"
        onDrop={(id) => send(encodeFilter({ id, to: "good" }))}
      >
        {skills.key.map((skill) => (
          <SkillChip
            key={skill}
            skill={skill}
            tier="key"
            onMove={() => send(skills.move(skill, "nice"))}
            canMove={skills.key.length > 1}
          />
        ))}
        {skills.nice.map((skill) => (
          <SkillChip
            key={skill}
            skill={skill}
            tier="nice"
            onMove={() => send(skills.move(skill, "key"))}
            canMove
          />
        ))}
        {good.map((requirement) => (
          <FilterChip
            key={requirement.id}
            requirement={requirement}
            onMove={() =>
              send(encodeFilter({ id: requirement.id, to: "must" }))
            }
            onDrop={() =>
              send(encodeFilter({ id: requirement.id, to: "none" }))
            }
            onEdit={() => onEdit(EDIT_ID[requirement.id])}
          />
        ))}
        <button
          type="button"
          disabled={reading}
          onClick={() => onEdit("skills")}
          className="inline-flex min-h-7 items-center gap-1 rounded-full border border-dashed px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <PencilIcon className="size-3" />
          Skills
        </button>
      </Row>

      {move ? (
        <div
          role="status"
          className="flex animate-in items-start gap-2 rounded-xl bg-muted/70 px-3 py-2 text-xs leading-5 fade-in"
        >
          <span className="min-w-0 flex-1">
            {move.text}
            {move.before !== move.after
              ? ` · pool ${people(move.before)} → ${people(move.after)}`
              : " · the pool is the same"}
          </span>
          {move.undo ? (
            <button
              type="button"
              disabled={reading}
              onClick={() => send(move.undo)}
              className="font-semibold text-primary hover:underline"
            >
              Undo
            </button>
          ) : null}
        </div>
      ) : null}

      {guardrail ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-xs leading-5">
          <span className="min-w-0 flex-1">
            Your must-haves find {people(guardrail.now)}. Making{" "}
            {guardrail.requirement.label.toLowerCase()} a good-to-have finds{" "}
            {people(guardrail.after)}.
          </span>
          <button
            type="button"
            disabled={reading}
            onClick={() =>
              send(encodeFilter({ id: guardrail.requirement.id, to: "good" }))
            }
            className="rounded-full border bg-background px-2.5 py-0.5 font-semibold hover:bg-muted"
          >
            Move it
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Row({
  title,
  sub,
  onDrop,
  children,
}: {
  title: string
  sub: string
  onDrop: (id: FilterId) => void
  children: React.ReactNode
}) {
  const [over, setOver] = React.useState(false)
  return (
    <div
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("application/x-filter")) return
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false)
        const id = event.dataTransfer.getData("application/x-filter")
        if (id) onDrop(id as FilterId)
      }}
      className={cn(
        "flex flex-col gap-2 rounded-xl transition-colors",
        over && "bg-muted/70 outline-2 outline-offset-4 outline-border"
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

/** A filter: draggable to the other row, and a menu to move, change or drop it. */
function FilterChip({
  requirement,
  onMove,
  onDrop,
  onEdit,
}: {
  requirement: Requirement
  onMove: () => void
  onDrop: () => void
  onEdit: () => void
}) {
  const { must, shift } = requirement
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("application/x-filter", requirement.id)
              event.dataTransfer.effectAllowed = "move"
            }}
            title={
              must
                ? `Relaxing it finds ${people(shift)} more`
                : `Requiring it finds ${people(shift)} fewer`
            }
            className={cn(
              "inline-flex max-w-full cursor-grab items-center gap-1.5 rounded-full border py-1 pr-2 pl-2.5 text-xs font-medium transition-colors",
              must
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-background hover:bg-muted"
            )}
          />
        }
      >
        <span
          className={cn(
            "font-normal",
            must ? "text-primary-foreground/80" : "text-muted-foreground"
          )}
        >
          {requirement.label}
        </span>
        <span className="min-w-0 truncate">{requirement.value}</span>
        <ChevronDownIcon className="size-3 shrink-0 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {must
              ? `Filters the pool · relaxing it finds +${people(shift)}`
              : `Ranks only · requiring it finds −${people(shift)}`}
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={onMove}>
            {must ? <ArrowDownIcon /> : <ArrowUpIcon />}
            {must ? "Make it a good-to-have" : "Make it a must-have"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon />
            Change it
          </DropdownMenuItem>
          {requirement.droppable ? (
            <DropdownMenuItem variant="destructive" onClick={onDrop}>
              <Trash2Icon />
              Remove
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** A skill: key skills first in the ranking, nice-to-haves after. */
function SkillChip({
  skill,
  tier,
  canMove,
  onMove,
}: {
  skill: string
  tier: "key" | "nice"
  canMove: boolean
  onMove: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex max-w-full items-center gap-1 rounded-full border py-1 pr-2 pl-2.5 text-xs font-medium transition-colors hover:bg-muted",
              tier === "key"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "bg-background"
            )}
          />
        }
      >
        <span className="min-w-0 truncate">{skill}</span>
        <ChevronDownIcon className="size-3 shrink-0 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {tier === "key"
              ? "A key skill · ranked first"
              : "Nice to have · ranked after the key skills"}
          </DropdownMenuLabel>
          <DropdownMenuItem disabled={!canMove} onClick={onMove}>
            {tier === "key" ? <ArrowDownIcon /> : <ArrowUpIcon />}
            {tier === "key" ? "Make it nice-to-have" : "Make it a key skill"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
