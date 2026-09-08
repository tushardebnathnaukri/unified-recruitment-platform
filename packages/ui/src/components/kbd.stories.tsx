import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@workspace/ui/components/button"
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Kbd",
  component: Kbd,
  parameters: {
    design: design("kbd"),
    docs: {
      description: {
        component: `
A key cap. The prototype has two global shortcuts — \`d\` flips the theme,
\`⌘B\` the sidebar — and Settings and Playground both explained them with a
hand-styled \`<kbd>\`; this replaces those.

Inside a \`TooltipContent\` it re-colours itself to sit on the dark tooltip,
which is why the tooltip reserves a slot for it.
        `,
      },
    },
  },
  args: { children: "d" },
} satisfies Meta<typeof Kbd>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Group: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>⌘</Kbd>
      <Kbd>B</Kbd>
    </KbdGroup>
  ),
}

export const InTooltip: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" />}>
        Toggle sidebar
      </TooltipTrigger>
      <TooltipContent>
        Toggle sidebar
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>B</Kbd>
        </KbdGroup>
      </TooltipContent>
    </Tooltip>
  ),
}

export const InSentence: Story = {
  render: () => (
    <p className="text-sm text-muted-foreground">
      Press <Kbd>d</Kbd> anywhere to flip the theme.
    </p>
  ),
}
