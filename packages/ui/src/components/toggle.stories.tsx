import type { Meta, StoryObj } from "@storybook/react-vite"
import { BookmarkIcon, EyeOffIcon } from "lucide-react"

import { Toggle } from "@workspace/ui/components/toggle"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Toggle",
  component: Toggle,
  parameters: {
    design: design("toggle"),
    docs: {
      description: {
        component: `
Base UI \`Toggle\`: a button with an on/off state (\`pressed\` /
\`defaultPressed\` / \`onPressedChange\`), announced as \`aria-pressed\`. A
bookmark, a "hide viewed" filter.

The line between this and \`Chip\` with \`selected\`: a Toggle is
button-shaped and usually an icon; a Chip is a text pill that lives in a
row of its siblings. Several exclusive Toggles are a \`ToggleGroup\`.
        `,
      },
    },
  },
  argTypes: {
    variant: { control: "radio", options: ["default", "outline"] },
    size: { control: "radio", options: ["sm", "default", "lg"] },
  },
  args: { variant: "default", size: "default" },
} satisfies Meta<typeof Toggle>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Toggle {...args} aria-label="Save candidate">
      <BookmarkIcon />
    </Toggle>
  ),
}

export const Outline: Story = {
  args: { variant: "outline" },
  render: (args) => (
    <Toggle {...args} defaultPressed>
      <EyeOffIcon data-icon="inline-start" />
      Hide viewed
    </Toggle>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      {(["sm", "default", "lg"] as const).map((size) => (
        <Toggle key={size} size={size} variant="outline" aria-label={size}>
          <BookmarkIcon />
        </Toggle>
      ))}
    </div>
  ),
}
