import { CheckIcon, CircleDashedIcon, LoaderIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

/**
 * The Plan beside the requirement chat.
 *
 * WHY A TRANSCRIPT IS NOT ENOUGH. A conversation shows what has been said; it
 * does not show how much is left, and without that a chat asking its seventh
 * question reads as stalling rather than working. Four stages, ticking, is the
 * cheapest thing that answers "how long is this going to take".
 *
 * IT ONLY SHOWS NUMBERS IT CAN STAND BEHIND. The pool count is the brief's own
 * filters run over the search's people by `profileMatches` — the same predicate
 * the results page and every "expand pool" figure agree on. The criteria are
 * the `?crit=` list in rank order, which is the order that decides Best match.
 * Nothing here is a progress bar filling up to look busy.
 */

export type Stage = {
  label: string
  /** Said quietly beside the label — "3 of 6", "2 of 3". */
  detail?: string
  state: "done" | "active" | "waiting"
}

export function BriefRail({
  stages,
  pool,
  total,
  criteria,
}: {
  stages: Stage[]
  /** How many people the brief currently holds. */
  pool: number
  /** How many the sentence alone found, before the brief narrowed it. */
  total: number
  criteria: string[]
}) {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 border-l bg-background p-4">
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">Plan</h2>
        <ol className="flex flex-col gap-1.5">
          {stages.map((stage) => (
            <li
              key={stage.label}
              className={cn(
                "flex items-center gap-2 text-sm",
                stage.state === "waiting" && "text-muted-foreground",
                stage.state === "done" && "text-muted-foreground line-through"
              )}
            >
              {stage.state === "done" ? (
                <CheckIcon className="size-4 shrink-0 text-primary" />
              ) : stage.state === "active" ? (
                <LoaderIcon className="size-4 shrink-0 animate-spin text-primary" />
              ) : (
                <CircleDashedIcon className="size-4 shrink-0 text-muted-foreground/50" />
              )}
              <span className="min-w-0 flex-1 truncate">{stage.label}</span>
              {stage.detail ? (
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {stage.detail}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-1 border-t pt-4">
        <h2 className="text-xs font-medium text-muted-foreground">
          Qualified pool
        </h2>
        <p className="text-2xl font-semibold tabular-nums">{pool}</p>
        {/* The number the sentence alone found, so the brief's cost is legible:
            every answer narrows, and this is by how much. */}
        <p className="text-xs text-muted-foreground tabular-nums">
          of {total} the description found
        </p>
      </section>

      {criteria.length ? (
        <section className="flex flex-col gap-2 border-t pt-4">
          <h2 className="text-xs font-medium text-muted-foreground">
            Criteria, most important first
          </h2>
          <ol className="flex flex-wrap gap-1">
            {criteria.map((criterion, index) => (
              <li key={criterion}>
                <Badge
                  variant={index === 0 ? "secondary" : "outline"}
                  className="max-w-full font-normal"
                  title={criterion}
                >
                  <span className="truncate">{shorten(criterion)}</span>
                </Badge>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </aside>
  )
}

/** The subject of a criterion sentence, which is all a chip has room for. */
function shorten(criterion: string) {
  return criterion
    .replace(/^Has hands-on experience with /, "")
    .replace(/^Has worked in /, "")
    .replace(/^Has at least /, "")
}
