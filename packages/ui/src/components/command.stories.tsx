import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  BriefcaseIcon,
  DatabaseIcon,
  LayoutDashboardIcon,
  PlusCircleIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@workspace/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Command",
  component: Command,
  parameters: {
    design: design("command"),
    docs: {
      description: {
        component: `
A list you filter by typing. Built on \`cmdk\`, with \`CommandInput\` wearing
an \`InputGroup\` and \`CommandDialog\` wearing a \`Dialog\` — both of which
came into the package with it.

**In the prototype it is a filter, not a command palette.** The response
manager's location pill is a \`Command\` inside a \`Popover\`, and it is the
only one of the five filters that has a search box: every other pill picks
from a fixed set of bands written in \`applicants.ts\`, while location is
built from the cities the applicants actually live in — so its length is data
rather than a decision. That is what a search box is for.

Two things that shape are easy to get wrong:

- **The popover must close on pick.** A menu closes itself; a popover does
  not, and a filter left open after you have chosen is a panel you then have
  to dismiss. Hold the \`open\` state and set it false in \`onSelect\`.
- **\`value\` on an item is what cmdk matches typing against**, so it takes
  the LABEL. The id the filter stores rides along in \`onSelect\`'s closure
  instead. For cities the two are the same string; writing it this way means
  the next filter with a search box does not need matching ids and labels.
        `,
      },
    },
  },
} satisfies Meta<typeof Command>

export default meta

type Story = StoryObj<typeof meta>

const LOCATIONS = [
  "Any location",
  "Bengaluru",
  "Pune",
  "Gurugram",
  "Hyderabad",
  "Mumbai",
  "Remote",
]

/** The location filter, exactly as the response manager builds it. */
function LocationFilter() {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("Any location")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        {value}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 gap-0 p-0">
        <Command>
          <CommandInput placeholder="Search locations" />
          <CommandList>
            <CommandEmpty>No matching location.</CommandEmpty>
            {LOCATIONS.map((location) => (
              <CommandItem
                key={location}
                value={location}
                data-checked={location === value}
                onSelect={() => {
                  setValue(location)
                  setOpen(false)
                }}
              >
                {location}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export const LocationPill: Story = {
  name: "Location filter (as the app uses it)",
  render: () => <LocationFilter />,
}

/** The bare list, with groups and shortcuts. */
export const Grouped: Story = {
  render: () => (
    <Command className="w-80 rounded-xl border">
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>
        <CommandGroup heading="Go to">
          <CommandItem>
            <LayoutDashboardIcon />
            Dashboard
          </CommandItem>
          <CommandItem>
            <BriefcaseIcon />
            Jobs
          </CommandItem>
          <CommandItem>
            <DatabaseIcon />
            Database
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Create">
          <CommandItem>
            <PlusCircleIcon />
            New project
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}

/**
 * `CommandDialog` is the same list in a modal. Nothing in the prototype opens
 * one yet — a palette is a power-user affordance, and the recruiter product
 * has not earned one.
 */
function PaletteDemo() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open the palette
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>Nothing matches.</CommandEmpty>
          <CommandGroup heading="Go to">
            <CommandItem>
              <LayoutDashboardIcon />
              Dashboard
            </CommandItem>
            <CommandItem>
              <BriefcaseIcon />
              Jobs
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

export const Palette: Story = {
  name: "In a dialog",
  render: () => <PaletteDemo />,
}
