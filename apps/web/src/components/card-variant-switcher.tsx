import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import {
  CARD_VARIANTS,
  useCardVariant,
  type CardVariant,
} from "@/components/card-variant-provider"

/**
 * A two-item toggle, matching the view switcher on the response manager rather
 * than the Select the brand switcher uses: there are two options and both fit
 * as words, so hiding either behind a menu would cost a click to see what the
 * choice even is.
 *
 * An empty selection is ignored — Base UI lets you deselect the active item,
 * and "no card layout" is not a state the app has.
 */
export function CardVariantSwitcher() {
  const { variant, setVariant } = useCardVariant()

  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      aria-label="Candidate card layout"
      value={[variant]}
      onValueChange={(value) => {
        const next = value[0] as CardVariant | undefined
        if (next) setVariant(next)
      }}
    >
      {CARD_VARIANTS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
