import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@workspace/ui/components/combobox"

/**
 * CITIES ARE PICKED, NOT CHOSEN ONE AT A TIME: a box you type into, the list
 * narrowing as you do, and a chip for each city you take — shadcn's Combobox
 * in its `multiple` shape (`ComboboxChips` + `ComboboxChipsInput`), which is
 * the control this already wanted to be.
 *
 * It replaced radios. A role in one city is usually open to the ones around
 * it, and with one value per filter seeing who was in reach of three cities
 * meant running the list three times. The chips are also the only "clear" this
 * needs: removing the last one turns the filter off, so there is no "Any city"
 * option sitting at the top of a list pretending to be a city.
 *
 * THE COMPONENT BRINGS WHAT A HAND-ROLLED ONE DID NOT: Backspace deletes the
 * chip behind the caret, the chips are a real focusable list rather than
 * buttons, and the popup anchors, flips and sizes itself against the input. A
 * first pass built this out of `Command` and had none of it.
 *
 * `autoHighlight` is not decoration. Without it nothing is highlighted until
 * you press an arrow key, so typing "pun" and pressing Return did nothing at
 * all — and typing then Return is how anybody uses a box like this.
 *
 * `countFor` is the rail's "how many people this would leave" — the count for
 * the list AS IT WOULD BE with this city added, since a second city widens
 * rather than narrows. Where there is no room for it (a popover, a table
 * header) it is left out rather than shown wrong.
 */
export function LocationPicker({
  label,
  placeholder,
  options,
  chosen,
  onChange,
  countFor,
}: {
  label: string
  placeholder: string
  options: string[]
  chosen: string[]
  onChange: (next: string[]) => void
  countFor?: (city: string) => number
}) {
  return (
    <Combobox
      items={options}
      multiple
      autoHighlight
      value={chosen}
      onValueChange={onChange}
    >
      <ComboboxChips className="w-full" aria-label={label}>
        <ComboboxValue>
          {chosen.map((city) => (
            <ComboboxChip key={city} aria-label={city}>
              {city}
            </ComboboxChip>
          ))}
        </ComboboxValue>
        {/* The placeholder goes once there are chips: it is the label for an
            empty box, and beside three cities it reads as a fourth. */}
        <ComboboxChipsInput
          placeholder={chosen.length > 0 ? "" : placeholder}
        />
      </ComboboxChips>

      <ComboboxContent>
        <ComboboxEmpty>No matching location.</ComboboxEmpty>
        <ComboboxList>
          {(city: string) => (
            <ComboboxItem key={city} value={city}>
              <span className="min-w-0 flex-1 truncate">{city}</span>
              {countFor && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {countFor(city)}
                </span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
