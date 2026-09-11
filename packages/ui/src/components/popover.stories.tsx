import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { SearchIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Popover",
  component: PopoverContent,
  parameters: {
    design: design("popover"),
    docs: {
      description: {
        component: `
A panel anchored to the control that opened it. Base UI, so the trigger
composes through \`render\` rather than \`asChild\`:
\`<PopoverTrigger render={<Button />} />\`.

**Popover or DropdownMenu?** A menu is a list of things to do and closes when
you pick one; a popover is a surface holding controls, and does not. The
response manager uses both — the sort pill is a menu, the search pill is a
popover with an \`Input\` in it, because typing into a menu item is not a
thing menus do.

**It does not close itself.** Anything where choosing is the end of the
interaction has to close it by hand — see the location filter under
Components → Command, which holds its own \`open\` state for exactly that.

\`PopoverHeader\` / \`PopoverTitle\` / \`PopoverDescription\` are there for
the explaining kind. The filter pills skip all three: a 288px panel with one
field in it does not need a heading telling you what the pill already said.
        `,
      },
    },
  },
} satisfies Meta<typeof PopoverContent>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The response manager's search pill — an icon that opens the field it stands
 * for. Shrinking search to a glyph is only safe because the box is one click
 * away, which is what this is.
 */
export const SearchPill: Story = {
  name: "Search pill (as the app uses it)",
  render: () => (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" aria-label="Search responses" />
        }
      >
        <SearchIcon />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <Input placeholder="Search name, role or skill" />
      </PopoverContent>
    </Popover>
  ),
}

export const WithHeader: Story = {
  name: "With a header",
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        Salary band
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Salary band</PopoverTitle>
          <PopoverDescription>
            Shown on the posting. Candidates outside the band still apply.
          </PopoverDescription>
        </PopoverHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="min">Minimum (₹ lpa)</Label>
            <Input id="min" defaultValue="35" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="max">Maximum (₹ lpa)</Label>
            <Input id="max" defaultValue="55" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

/** `align` decides which edge of the trigger the panel lines up with. */
export const Alignment: Story = {
  render: () => (
    <div className="flex gap-2">
      {(["start", "center", "end"] as const).map((align) => (
        <Popover key={align}>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            {align}
          </PopoverTrigger>
          <PopoverContent align={align} className="w-48">
            <p className="text-sm text-muted-foreground">Aligned to {align}.</p>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  ),
}
