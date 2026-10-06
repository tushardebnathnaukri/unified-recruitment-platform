import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  CARD_VARIANTS,
  useCardVariant,
  type CardVariant,
} from "@/components/card-variant-provider"
import { FloatingVariantSwitcher } from "@/components/floating-variant-switcher"

/**
 * A Select, not the toggle row it was: three words fitted as a toggle, and the
 * fourth (Snapshot) is where a row of them starts wrapping on the settings
 * column — the same call `PostingVariantSwitcher` made at seven. Each option
 * carries its hint, so what a layout is stays readable without opening it.
 */
export function CardVariantSwitcher() {
  const { variant, setVariant } = useCardVariant()

  return (
    <Select
      items={CARD_VARIANTS}
      value={variant}
      onValueChange={(next) => {
        if (next) setVariant(next as CardVariant)
      }}
    >
      <SelectTrigger className="w-56" aria-label="Candidate card layout">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CARD_VARIANTS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * The same choice as `CardVariantSwitcher`, floating over the cards — see
 * `FloatingVariantSwitcher` for what it draws.
 *
 * STICKY, NOT FIXED. `CandidateList` puts it last in the cards column, where it
 * sticks to the bottom of the screen while the list scrolls — so it sits at the
 * left edge of the cards whatever is beside them (the nav at any width, the
 * filter rail, Search Resume's refine panel) without measuring any of them.
 * Fixed to the window, it would have needed the nav's width and the rail's,
 * and still covered one of them.
 */
export function FloatingCardVariantSwitcher({
  className,
}: {
  className?: string
}) {
  const { variant, setVariant } = useCardVariant()

  return (
    <FloatingVariantSwitcher
      name="Card"
      label="Candidate card layout"
      options={CARD_VARIANTS}
      value={variant}
      onChange={setVariant}
      className={className}
    />
  )
}
