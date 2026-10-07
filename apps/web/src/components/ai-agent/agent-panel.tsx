import {
  ArrowRightIcon,
  BuildingIcon,
  CheckIcon,
  CircleAlertIcon,
  ChevronDownIcon,
  LoaderCircleIcon,
  PencilIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { AiTile } from "@/components/ai-agent/brief"
import { useAgent } from "@/components/ai-agent/shared"
import type { logOf, panelOf } from "@/lib/ai-agent/view"

type Panel = ReturnType<typeof panelOf>
type Log = ReturnType<typeof logOf>

const KIND = {
  ai: {
    icon: SparklesIcon,
    tone: "bg-primary text-primary-foreground",
  },
  you: { icon: UserIcon, tone: "bg-primary text-primary-foreground" },
  edit: { icon: PencilIcon, tone: "bg-muted-foreground text-background" },
  acct: { icon: BuildingIcon, tone: "bg-muted-foreground/60 text-background" },
} as const

/**
 * The agent's panel, beside every step: what it is doing right now, what it
 * needs from you (red, each a way to the field), what it has done (latest
 * first, each with where it came from), and what it will do next.
 */
export function AgentPanel({ panel, log }: { panel: Panel; log: Log }) {
  const { brandName } = useAgent()
  return (
    <div className="flex flex-col">
      {/* As tall as the step band beside it, so the two read as one row. */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <AiTile className="size-8 rounded-lg" iconClassName="size-4" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">
            Your {brandName} AI Agent
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 truncate text-xs",
              panel.statusAi ? "text-primary" : "text-muted-foreground"
            )}
          >
            {panel.filling ? (
              <LoaderCircleIcon className="size-3 shrink-0 animate-spin" />
            ) : null}
            {panel.status}
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-3.5 p-4">
        {panel.filling ? (
          <div className="flex flex-col">
            {panel.think.map((step) => (
              <div key={step.t} className="flex items-start gap-2.5 py-2">
                <span
                  className={cn(
                    "mt-px grid size-5 shrink-0 place-items-center rounded-full",
                    step.done
                      ? "bg-primary text-primary-foreground"
                      : step.current
                        ? "bg-muted text-primary"
                        : "bg-muted text-muted-foreground/50"
                  )}
                >
                  {step.done ? (
                    <CheckIcon className="size-2.5" strokeWidth={3.5} />
                  ) : step.current ? (
                    <LoaderCircleIcon
                      className="size-2.5 animate-spin"
                      strokeWidth={3.5}
                    />
                  ) : null}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-[13px] font-semibold",
                      step.done || step.current
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.t}
                  </span>
                  {step.done ? (
                    <span className="animate-in text-xs leading-snug text-muted-foreground fade-in">
                      {step.d}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex animate-in flex-col gap-1 fade-in">
            {panel.todo.length ? (
              <>
                <span className="pb-0.5 text-xs font-semibold text-destructive">
                  Needs you · {panel.todo.length}
                </span>
                {panel.todoShown.map((todo) => (
                  <button
                    key={todo.t}
                    type="button"
                    onClick={todo.go}
                    className="group/todo flex min-h-10 w-full items-center gap-2.5 rounded-xl border bg-background px-3 py-2 text-left shadow-xs transition-colors hover:border-primary/30 hover:bg-muted/50"
                  >
                    <CircleAlertIcon className="size-4 shrink-0 text-destructive" />
                    <span className="flex-1 text-[13px] font-medium">
                      {todo.t}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      Add
                      <ArrowRightIcon className="size-3 transition-transform group-hover/todo:translate-x-0.5" />
                    </span>
                  </button>
                ))}
                {panel.todoMore ? (
                  <button
                    type="button"
                    onClick={panel.toggleTodoAll}
                    className="self-start py-0.5 text-xs font-semibold text-destructive hover:underline"
                  >
                    {panel.todoMore}
                  </button>
                ) : null}
              </>
            ) : null}

            <div className="mt-1.5 flex items-center gap-2">
              <span className="flex-1 text-xs font-semibold text-muted-foreground">
                {panel.doneHead}
              </span>
              {panel.doneMore ? (
                <button
                  type="button"
                  onClick={panel.toggleDoneAll}
                  className="py-0.5 text-xs font-semibold text-primary hover:underline"
                >
                  {panel.doneMore}
                </button>
              ) : null}
            </div>
            {panel.doneShown.map((done) => {
              const kind = KIND[done.kind]
              return (
                <div
                  key={done.t}
                  className="flex items-center gap-2.5 px-0.5 py-1 text-[13px]"
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="size-2.5" strokeWidth={4} />
                  </span>
                  <span className="flex-1 font-medium">{done.t}</span>
                  <span
                    role="img"
                    aria-label={done.src}
                    title={done.src}
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full",
                      kind.tone
                    )}
                  >
                    <kind.icon className="size-2.5" />
                  </span>
                </div>
              )
            })}
            {panel.doneAll ? (
              <div
                aria-hidden="true"
                className="flex flex-wrap gap-3 px-0.5 pt-1 text-[11px] text-muted-foreground"
              >
                {(
                  [
                    ["ai", "AI"],
                    ["you", "You"],
                    ["edit", "Edited"],
                    ["acct", "Account"],
                  ] as const
                ).map(([k, label]) => {
                  const kind = KIND[k]
                  return (
                    <span key={k} className="inline-flex items-center gap-1">
                      <span
                        className={cn(
                          "grid size-3.5 place-items-center rounded-full",
                          kind.tone
                        )}
                      >
                        <kind.icon className="size-2" />
                      </span>
                      {label}
                    </span>
                  )
                })}
              </div>
            ) : null}

            {panel.upcoming.length ? (
              <>
                <span className="mt-2 text-xs font-semibold text-muted-foreground">
                  Working on next
                </span>
                {panel.upcoming.map((next) => (
                  <div
                    key={next}
                    className="flex items-center gap-2.5 px-0.5 py-1 text-[13px] text-muted-foreground"
                  >
                    <span className="size-5 shrink-0 rounded-full border-2 border-dashed border-border" />
                    {next}
                  </div>
                ))}
              </>
            ) : null}
          </div>
        )}
      </section>

      {!panel.filling ? <ActivityLog log={log} /> : null}
    </div>
  )
}

function ActivityLog({ log }: { log: Log }) {
  return (
    <section className="flex flex-col gap-1.5 border-t px-4 py-2.5">
      <button
        type="button"
        onClick={log.toggle}
        aria-expanded={log.open}
        className="flex min-h-8 w-full items-center gap-2 py-1 text-left"
      >
        <AiTile className="size-4 rounded-[5px]" iconClassName="size-2.5" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[13px] font-semibold">{log.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {log.latest}
          </span>
        </span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            log.open && "rotate-180"
          )}
        />
      </button>
      {log.open ? (
        <div className="flex max-h-[280px] animate-in flex-col gap-2.5 overflow-y-auto py-1 fade-in">
          {log.groups.map((group) => (
            <div key={group.label} className="flex flex-col">
              <span className="pb-1 text-[11px] font-bold tracking-wider text-muted-foreground">
                {group.label}
              </span>
              {group.items.map((item, i) => (
                <div key={i} className="flex items-stretch gap-2.5">
                  <div
                    aria-hidden="true"
                    className="flex w-3.5 shrink-0 flex-col items-center"
                  >
                    <span
                      className={cn(
                        "mt-[3px] size-2.5 shrink-0 rounded-full",
                        item.change
                          ? "border-2 border-primary bg-background"
                          : "bg-primary"
                      )}
                    />
                    <span
                      className={cn(
                        "mt-0.5 w-0.5 flex-1",
                        item.last ? "bg-transparent" : "bg-border"
                      )}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-px pb-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="flex-1 text-[12.5px] leading-snug font-semibold">
                        {item.t}
                      </span>
                      {item.d ? (
                        <span
                          className={cn(
                            "text-[11px] font-bold whitespace-nowrap",
                            item.negative ? "text-destructive" : "text-primary"
                          )}
                        >
                          {item.d}
                        </span>
                      ) : null}
                    </div>
                    {item.sub ? (
                      <span className="text-xs leading-snug text-muted-foreground">
                        {item.sub}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
