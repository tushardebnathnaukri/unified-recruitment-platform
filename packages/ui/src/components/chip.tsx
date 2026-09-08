import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

/**
 * A pill you press. `Badge` is the pill you read.
 *
 * That is the whole distinction, and it is worth holding to: the dashboard's
 * filter labels under a saved search are Badges, the "Try" starters in the
 * requirement box are Chips. A Badge with an onClick is a Chip with the wrong
 * affordances (no hover, no focus ring, `span` semantics).
 *
 * `selected` makes it a filter chip. Left undefined it is a plain action and
 * gets no `aria-pressed` at all; pass a boolean and it becomes a toggle that
 * announces its state and takes the accent when on. State is yours to hold —
 * a filter chip's value belongs to the search, not the chip.
 */
const chipVariants = cva(
  "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-4xl border px-2.5 text-xs whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        outline:
          "border-border bg-background hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-pressed:bg-primary aria-pressed:text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
)

function Chip({
  className,
  variant = "outline",
  selected,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof chipVariants> & {
    /** Omit for an action chip; pass a boolean to make it a filter toggle. */
    selected?: boolean
  }) {
  return (
    <ButtonPrimitive
      data-slot="chip"
      aria-pressed={selected}
      className={cn(chipVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Chip, chipVariants }
