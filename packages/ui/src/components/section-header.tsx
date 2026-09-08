import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * A titled row above a block of content, with an optional action on the right.
 *
 * `min-h-8` is the height of a small button, so a section with an action and
 * one without sit at the same rhythm — otherwise the headings on a page drift
 * by a few pixels depending on which of them got a "View all".
 *
 * The heading is an `h2` because the page title is an `h1` in the shell's
 * header. A page with deeper nesting should pass a plain `title` string and
 * accept the level; a second heading hierarchy is not worth a prop.
 *
 * The action is whatever you hand it — a link-variant Button rendered as a
 * router `Link`, a `Button` that opens a sheet, a `Select`. It is not styled
 * here, so it can be any of those without the header knowing.
 */
function SectionHeader({
  title,
  description,
  action,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        "flex min-h-8 items-center justify-between gap-3",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-sm font-medium">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <div
          data-slot="section-header-action"
          className="flex shrink-0 items-center gap-2"
        >
          {action}
        </div>
      )}
    </div>
  )
}

export { SectionHeader }
