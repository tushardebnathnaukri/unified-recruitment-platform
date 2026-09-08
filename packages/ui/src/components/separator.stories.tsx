import type { Meta, StoryObj } from "@storybook/react-vite"

import { Separator } from "@workspace/ui/components/separator"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Separator",
  component: Separator,
  parameters: {
    design: design("separator"),
    docs: {
      description: {
        component: `
Base UI \`Separator\`. A vertical one stretches to its flex row by default
(\`self-stretch\`); the site header shortens it to \`h-4\` and resets
\`self-auto\` so it sits as a tick between the sidebar trigger and the title.

Not for lists — rows in a \`ListCard\` get their hairlines from the card.
        `,
      },
    },
  },
  argTypes: {
    orientation: { control: "radio", options: ["horizontal", "vertical"] },
  },
  args: { orientation: "horizontal" },
} satisfies Meta<typeof Separator>

export default meta

type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: (args) => (
    <div className="flex w-72 flex-col gap-4 text-sm">
      <p>Brand</p>
      <Separator {...args} />
      <p>Theme</p>
    </div>
  ),
}

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div className="flex h-5 items-center gap-3 text-sm">
      <span>Dashboard</span>
      <Separator {...args} />
      <span>Jobs</span>
      <Separator {...args} />
      <span>Database</span>
    </div>
  ),
}
