import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  SwatchBookIcon,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"

/**
 * A /settings variant, floating over the screen it changes, so the layouts can
 * be flipped through in place instead of from /settings.
 *
 * A PROTOTYPE CONTROL, DRAWN AS ONE: a dashed outline, like the AI Agent's
 * prototype menu, so nobody in a review reads it as product.
 *
 * The arrows step through the options in /settings order and wrap, because
 * comparing two layouts is flipping back and forth between them; the name in
 * the middle opens the whole list, with each option's hint. Where it sits is
 * the caller's — see `FloatingCardVariantSwitcher` and `SplitView`.
 */
export function FloatingVariantSwitcher<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  className,
}: {
  /** The short word before the current option's label: "Card", "Pane". */
  name: string
  /** What the menu and the group are called for a screen reader. */
  label: string
  options: { value: T; label: string; hint: string }[]
  value: T
  onChange: (next: T) => void
  className?: string
}) {
  const count = options.length
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  )
  const current = options[index]
  const previous = options[(index - 1 + count) % count]
  const next = options[(index + 1) % count]

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex w-fit items-center gap-0.5 rounded-full border border-dashed border-muted-foreground/40 bg-background/95 p-1 shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full"
        aria-label={`Previous layout: ${previous.label}`}
        title={previous.label}
        onClick={() => onChange(previous.value)}
      >
        <ChevronLeftIcon />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="sm" className="rounded-full" />}
        >
          <SwatchBookIcon data-icon="inline-start" />
          <span className="text-muted-foreground">{name}</span>
          <span className="font-semibold">{current.label}</span>
          <ChevronUpIcon data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-80"
        >
          {/* The label inside the group: Base UI's GroupLabel throws outside
              one (see CLAUDE.md). */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={value}
              onValueChange={(picked) => onChange(picked as T)}
            >
              {options.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  <span className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.hint}
                    </span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full"
        aria-label={`Next layout: ${next.label}`}
        title={next.label}
        onClick={() => onChange(next.value)}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  )
}
