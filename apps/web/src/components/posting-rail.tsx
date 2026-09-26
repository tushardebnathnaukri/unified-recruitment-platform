import type * as React from "react"
import { Link } from "react-router"
import {
  ArrowRightIcon,
  CheckIcon,
  CircleDashedIcon,
  LoaderIcon,
  LockIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import type { RailModel } from "@/lib/posting-rail"

/**
 * The rail beside the posting conversation.
 *
 * WHY A TRANSCRIPT IS NOT ENOUGH. A conversation shows what has been said; it
 * does not show how much is left or what has been gathered, and a recruiter
 * three cards in should not have to scroll back through bubbles to see what
 * the posting says. So the rail holds the four steps and where the current one
 * is, the posting as it stands, the private brief as it builds, and how many
 * people it would find — all of it moving as answers land.
 *
 * STATUS AND COUNT PAUSE WHILE AN ANSWER IS BEING READ. The count would
 * otherwise sit there describing the brief before the answer, as if it were
 * current; while a reading is in flight it says "Updating…" instead.
 */
export function PostingRail({
  model,
  reading,
}: {
  model: RailModel
  /** An answer is being read — the numbers below are about to change. */
  reading: boolean
}) {
  const { people } = model
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l bg-background p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        {reading ? (
          <LoaderIcon className="size-4 shrink-0 animate-spin text-primary" />
        ) : (
          <span className="size-2 shrink-0 rounded-full bg-primary" />
        )}
        {reading ? "Reading your answer…" : model.status}
      </p>

      <Section title="Plan">
        <ol className="flex flex-col gap-2">
          {model.steps.map((step) => (
            <li
              key={step.label}
              className={cn(
                "flex items-start gap-2 text-sm",
                step.state === "waiting" && "text-muted-foreground",
                step.state === "done" && "text-muted-foreground"
              )}
            >
              {step.state === "done" ? (
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              ) : step.state === "active" ? (
                <LoaderIcon
                  className={cn(
                    "mt-0.5 size-4 shrink-0 text-primary",
                    reading && "animate-spin"
                  )}
                />
              ) : (
                <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
              )}
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    step.state === "done" && "line-through",
                    step.state === "active" && "font-medium text-foreground"
                  )}
                >
                  {step.label}
                </span>
                {step.detail ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {step.detail}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="The posting so far">
        {model.posting.length ? (
          <Chips chips={model.posting} />
        ) : (
          <p className="text-xs text-muted-foreground">Nothing yet.</p>
        )}
        {model.must.length ? (
          <div className="mt-3 flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">
              {model.nice.length ? "Must have" : "Skills"}
            </p>
            <Chips chips={model.must} tone="strong" />
            {model.nice.length ? (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  Good to have
                </p>
                <Chips chips={model.nice} />
              </>
            ) : null}
          </div>
        ) : null}
      </Section>

      {model.brief.length ? (
        <Section
          title="Who we're looking for"
          aside={
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <LockIcon className="size-3" />
              Private
            </span>
          }
        >
          <Chips chips={model.brief} />
        </Section>
      ) : null}

      {people ? (
        <Section title="People this would find">
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums transition-opacity",
              reading && "opacity-40"
            )}
          >
            {people.matching.toLocaleString("en-IN")}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              of {people.total.toLocaleString("en-IN")}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {reading
              ? "Updating…"
              : "Estimated across the database, with this brief's filters."}
          </p>
          <Link
            to={people.href}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Open the search
            <ArrowRightIcon className="size-3" />
          </Link>
        </Section>
      ) : null}
    </aside>
  )
}

function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Chips({
  chips,
  tone = "soft",
}: {
  chips: string[]
  tone?: "soft" | "strong"
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip}
          className={cn(
            "max-w-full truncate rounded-4xl px-2.5 py-1 text-xs font-medium",
            tone === "strong"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-foreground"
          )}
        >
          {chip}
        </span>
      ))}
    </div>
  )
}
