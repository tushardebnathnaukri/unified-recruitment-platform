import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

/**
 * The small grey line under a title: location, age, counts.
 *
 * Children are separated by a middle dot by default. The dot is a real
 * element rather than a `::before`, because the list is often conditional
 * ("6 new" only when there are new ones) and a pseudo-element on `* + *`
 * cannot tell a rendered child from a `false` one — `Children.toArray` can.
 *
 * Turn the dot off when every child carries its own icon; the icons already
 * do the separating, and dots between them read as clutter.
 *
 * Numbers inside are tabular so "12 shortlisted" and "7 shortlisted" line up
 * across rows.
 */
function Meta({
  className,
  separator = true,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** Put a middle dot between children. Off when children carry icons. */
  separator?: boolean
}) {
  const items = React.Children.toArray(children)

  return (
    <div
      data-slot="meta"
      className={cn(
        "flex flex-wrap items-center gap-y-1 text-xs text-muted-foreground tabular-nums",
        separator ? "gap-x-2" : "gap-x-3",
        className
      )}
      {...props}
    >
      {items.map((child, index) => (
        <React.Fragment key={index}>
          {separator && index > 0 && <span aria-hidden="true">&middot;</span>}
          {child}
        </React.Fragment>
      ))}
    </div>
  )
}

const metaItemVariants = cva(
  "inline-flex items-center gap-1 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      /**
       * Colour is reserved for the one fact that changes what you do: an
       * expiry inside a week, a project nobody has contacted. Everything else
       * stays grey so that the one that isn't gets noticed.
       */
      tone: {
        default: "",
        warning: "text-warning",
        destructive: "text-destructive",
        success: "text-success",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  }
)

function MetaItem({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof metaItemVariants>) {
  return (
    <span
      data-slot="meta-item"
      data-tone={tone}
      className={cn(metaItemVariants({ tone }), className)}
      {...props}
    />
  )
}

export { Meta, MetaItem, metaItemVariants }
