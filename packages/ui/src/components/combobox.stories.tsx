import * as React from "react"
import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite"

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@workspace/ui/components/combobox"
import { Label } from "@workspace/ui/components/label"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Combobox",
  component: ComboboxChips,
  parameters: {
    design: design("combobox"),
    docs: {
      description: {
        component: `
A box you type into with the list narrowing as you do. In its \`multiple\`
shape each thing you take stays behind as a chip **inside the box**, so what
is picked and where you pick it are one control.

**This is how the response manager and Search Resume ask for cities.** Current
location and preferred location are the only two filters on those screens that
are not one-of-a-list, so they are the only two that do not go through the
radios: a role in one city is usually open to the ones around it, and with a
single value, seeing who was in reach of three cities meant running the list
three times.

Three things it does that a \`Command\` and hand-rolled pill buttons do not —
a first pass built exactly that, and it looked identical:

- **Backspace removes the chip behind the caret**, and the chip list is
  focusable and arrow-navigable in its own right.
- **The popup anchors, flips and sizes itself** against the input.
- **\`autoHighlight\` is not decoration.** Without it nothing is highlighted
  until an arrow key is pressed, so typing "pun" and hitting Return did
  nothing — and typing then Return is how anybody uses a box like this.

**There is no "Any city" row.** The chips are the clear: an option in the list
pretending to be a city is a second way to say what removing three chips
already says.

Base UI's combobox. \`items\` feeds the list, \`value\`/\`onValueChange\`
make it controlled, and \`ComboboxList\` takes a render function per item
rather than children.
        `,
      },
    },
  },
} satisfies StoryMeta<typeof ComboboxChips>

export default meta

type Story = StoryObj<typeof meta>

/** The cities the app offers. "Anywhere" is deliberately not among them. */
const CITIES = [
  "Bengaluru",
  "Chennai",
  "Delhi NCR",
  "Gurugram",
  "Hyderabad",
  "Kolkata",
  "Mumbai",
  "Noida",
  "Pune",
]

/**
 * How many people the list would hold **with that city added** — a second city
 * widens rather than narrows, so the number beside each option goes up.
 */
const REACH: Record<string, number> = {
  Bengaluru: 46,
  Chennai: 18,
  "Delhi NCR": 39,
  Gurugram: 27,
  Hyderabad: 31,
  Kolkata: 12,
  Mumbai: 41,
  Noida: 22,
  Pune: 29,
}

function LocationPicker({
  label,
  placeholder,
  defaultValue = [],
  counts = false,
}: {
  label: string
  placeholder: string
  defaultValue?: string[]
  counts?: boolean
}) {
  const [chosen, setChosen] = React.useState<string[]>(defaultValue)

  return (
    <div className="grid w-72 gap-1.5">
      <Label>{label}</Label>
      <Combobox
        items={CITIES}
        multiple
        autoHighlight
        value={chosen}
        onValueChange={setChosen}
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
                {counts && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {REACH[city]}
                  </span>
                )}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

/** Nothing picked: the box is its own placeholder. */
export const Empty: Story = {
  name: "Empty",
  render: () => (
    <LocationPicker label="Current location" placeholder="Search cities…" />
  ),
}

/**
 * Two cities taken. The chips sit inside the box with the caret after them, so
 * the next one is typed where the last one landed.
 */
export const WithChips: Story = {
  name: "Two cities picked",
  render: () => (
    <LocationPicker
      label="Current location"
      placeholder="Search cities…"
      defaultValue={["Pune", "Noida"]}
    />
  ),
}

/**
 * **In the filter rail, each option carries what the list would hold with that
 * city added.** The rail has the room to print the consequence beside a choice,
 * which is the preview a draft would otherwise be for. In a popover or a table
 * header the count is left out rather than shown wrong.
 */
export const WithCounts: Story = {
  name: "In the filter rail, with counts",
  render: () => (
    <LocationPicker
      label="Preferred location"
      placeholder="Anywhere"
      defaultValue={["Pune"]}
      counts
    />
  ),
}

/**
 * The single-value shape, for comparison: one input, one answer, and the
 * trigger caret at its end. Nothing in the app uses this yet — both of its
 * comboboxes are pick-many.
 */
export const Single: Story = {
  name: "Single value",
  render: function Render() {
    const [value, setValue] = React.useState<string | null>(null)

    return (
      <div className="grid w-72 gap-1.5">
        <Label>City</Label>
        <Combobox items={CITIES} value={value} onValueChange={setValue}>
          <ComboboxInput placeholder="Search cities…" className="w-full" />
          <ComboboxContent>
            <ComboboxEmpty>No matching location.</ComboboxEmpty>
            <ComboboxList>
              {(city: string) => (
                <ComboboxItem key={city} value={city}>
                  {city}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    )
  },
}
