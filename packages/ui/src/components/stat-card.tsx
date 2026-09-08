import * as React from "react"

import { Card } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

/**
 * One number, a label above it and a line of context under it.
 *
 * `detail` is the part worth arguing about. A bare delta ("+18%") against an
 * unstated baseline is noise; "2 expiring this week" is a sentence a recruiter
 * can act on. Leave it out rather than fill it with a number nobody asked for.
 *
 * NOTE(design): as built this shows a STANDING TOTAL, and the dashboard review
 * on 2026-09-03 judged that three of its four tiles could never prompt an
 * action — "Applicants 271" only ever goes up. The agreed direction is queues
 * with an age on them ("To review", "Awaiting your reply") that click through
 * to a filtered list. The tile shape survives that change, so it is a
 * component; the numbers it is fed are what needs to move.
 */
function StatCard({
  label,
  value,
  detail,
  icon,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Card>, "children"> & {
  label: React.ReactNode
  value: React.ReactNode
  detail?: React.ReactNode
  /** An icon element, e.g. `<BriefcaseIcon />`. Sized and coloured here. */
  icon?: React.ReactNode
}) {
  return (
    <Card
      data-slot="stat-card"
      size="sm"
      className={cn("gap-3 px-(--card-spacing)", className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && (
          <span className="shrink-0 text-muted-foreground [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
            {icon}
          </span>
        )}
      </div>
      <p className="text-2xl font-medium tabular-nums">{value}</p>
      {detail && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {detail}
        </p>
      )}
    </Card>
  )
}

/**
 * Two across on a narrow column, four when there is room. Never three — an
 * orphan tile on the second row reads as a rendering fault.
 *
 * The breakpoint is a container query, not a viewport one, because what
 * actually changes width under a sidebar is the content column. It is unnamed
 * so it resolves against the nearest container: the app shell's
 * `@container/main`, or whatever a story wraps it in.
 */
function StatGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-grid"
      className={cn(
        "grid grid-cols-2 gap-3 @3xl:grid-cols-4 @3xl:gap-4",
        className
      )}
      {...props}
    />
  )
}

export { StatCard, StatGrid }
