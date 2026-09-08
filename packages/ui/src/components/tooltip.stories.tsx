import type { Meta, StoryObj } from "@storybook/react-vite"
import { MailIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Kbd } from "@workspace/ui/components/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  parameters: {
    design: design("tooltip"),
    docs: {
      description: {
        component: `
Base UI \`Tooltip\`. **The root does not self-provide**: every tooltip
needs a \`TooltipProvider\` above it. The app mounts one in \`main.tsx\`, and
Storybook's preview mirrors that — so if a tooltip works here and not in
some new tree, that is the missing piece.

The trigger composes with \`render\`. Delay is zero by default; the sidebar's
collapsed rail is the heaviest user, where each icon's label is a tooltip.
        `,
      },
    },
  },
} satisfies Meta<typeof Tooltip>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="outline" size="icon" aria-label="Inbox" />}
      >
        <MailIcon />
      </TooltipTrigger>
      <TooltipContent>Inbox</TooltipContent>
    </Tooltip>
  ),
}

export const WithShortcut: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" />}>
        Toggle theme
      </TooltipTrigger>
      <TooltipContent>
        Toggle theme <Kbd>d</Kbd>
      </TooltipContent>
    </Tooltip>
  ),
}

export const Sides: Story = {
  render: () => (
    <div className="flex gap-2">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Tooltip key={side}>
          <TooltipTrigger render={<Button variant="outline" size="sm" />}>
            {side}
          </TooltipTrigger>
          <TooltipContent side={side}>Opens {side}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
}
