import type { Meta, StoryObj } from "@storybook/react-vite"
import { LayoutGridIcon, ListIcon, TableIcon } from "lucide-react"

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Toggle group",
  component: ToggleGroup,
  parameters: {
    design: design("toggle-group"),
    docs: {
      description: {
        component: `
Base UI \`ToggleGroup\`. Single-select by default; \`multiple\` allows
several on at once. The value is always an **array**, even for single
select — \`defaultValue={["list"]}\`.

\`spacing={0}\` with \`variant="outline"\` fuses the items into one segmented
control, which is what the Settings page's brand switcher is a hand-built
version of. Prefer this for view switchers (list / board / table); for a
form choice that needs a label per option, use \`RadioGroup\`.
        `,
      },
    },
  },
} satisfies Meta<typeof ToggleGroup>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <ToggleGroup defaultValue={["list"]} aria-label="View">
      <ToggleGroupItem value="list" aria-label="List">
        <ListIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="board" aria-label="Board">
        <LayoutGridIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="table" aria-label="Table">
        <TableIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

export const Segmented: Story = {
  name: "Segmented (outline, no spacing)",
  render: () => (
    <ToggleGroup
      variant="outline"
      spacing={0}
      defaultValue={["iimjobs"]}
      aria-label="Brand"
    >
      <ToggleGroupItem value="iimjobs">iimjobs</ToggleGroupItem>
      <ToggleGroupItem value="hirist">hirist</ToggleGroupItem>
    </ToggleGroup>
  ),
}

export const Multiple: Story = {
  render: () => (
    <ToggleGroup
      multiple
      defaultValue={["remote"]}
      variant="outline"
      size="sm"
      aria-label="Filters"
    >
      <ToggleGroupItem value="remote">Remote</ToggleGroupItem>
      <ToggleGroupItem value="unread">Unread</ToggleGroupItem>
      <ToggleGroupItem value="pro">Pro</ToggleGroupItem>
    </ToggleGroup>
  ),
}

export const Vertical: Story = {
  render: () => (
    <ToggleGroup
      orientation="vertical"
      variant="outline"
      spacing={0}
      defaultValue={["newest"]}
      aria-label="Sort"
    >
      <ToggleGroupItem value="newest">Newest</ToggleGroupItem>
      <ToggleGroupItem value="match">Best match</ToggleGroupItem>
      <ToggleGroupItem value="experience">Experience</ToggleGroupItem>
    </ToggleGroup>
  ),
}
