import type { Meta, StoryObj } from "@storybook/react-vite"

import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Label",
  component: Label,
  parameters: {
    design: design("label"),
    docs: {
      description: {
        component: `
A plain \`<label>\` with the form-text style. Two things it does for free:
it dims itself after a disabled sibling control (\`peer-disabled\`), and it
lays out as a flex row so an inline control can sit inside it.

Always pair with \`htmlFor\`; a label that does not point at its control is
just a paragraph.
        `,
      },
    },
  },
  args: { children: "Job title" },
} satisfies Meta<typeof Label>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <div className="flex w-72 flex-col gap-2">
      <Label htmlFor="lbl-input" {...args} />
      <Input id="lbl-input" placeholder="Principal Engineer" />
    </div>
  ),
}

export const Inline: Story = {
  name: "Wrapping a control",
  render: () => (
    <Label>
      <Switch defaultChecked />
      Email me when someone applies
    </Label>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <Input id="lbl-disabled" disabled className="peer" defaultValue="Pro" />
      <Label htmlFor="lbl-disabled">Plan (managed by billing)</Label>
    </div>
  ),
}
