import * as React from "react"

import { Card } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

/**
 * A card whose body is a list of `Item`s divided by hairlines.
 *
 * The three lists on the dashboard — jobs, searches, projects — all had this
 * shape, and each drew its own dividers from a `first` prop on the row. The
 * dividers are the list's concern, not the row's: an `Item` should only know
 * that it is an item, so it can be dropped into a `ListCard`, a plain
 * `ItemGroup` or a dropdown without changing.
 *
 * Rows lose their radius and side borders here. `Item` ships with
 * `rounded-2xl` and a one-pixel transparent border; inside a card the radius
 * showed as a notch in the corners on hover, and the transparent border was
 * winning over the divider colour. The focus ring goes inset for the same
 * reason — the card clips overflow, so an outside ring lost its left and
 * right edges.
 *
 * Pass `role="list"` semantics for free: this IS the group, so it takes the
 * role that `ItemGroup` would have.
 */
function ListCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card
      role="list"
      data-slot="list-card"
      className={cn(
        "gap-0 py-0",
        "*:data-[slot=item]:rounded-none *:data-[slot=item]:border-x-0 *:data-[slot=item]:border-b-0 *:data-[slot=item]:focus-visible:ring-inset",
        "[&>[data-slot=item]+[data-slot=item]]:border-t-border",
        className
      )}
      {...props}
    />
  )
}

export { ListCard }
