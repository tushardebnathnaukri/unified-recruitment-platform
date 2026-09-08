import type { Meta, StoryObj } from "@storybook/react-vite"

import { Checkbox } from "@workspace/ui/components/checkbox"
import { Label } from "@workspace/ui/components/label"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  parameters: {
    design: design("checkbox"),
    docs: {
      description: {
        component: `
Base UI \`Checkbox\`. State props are Base UI's: \`checked\` / \`defaultChecked\` /
\`onCheckedChange\`. The hit area extends past the 16px box via an \`::after\`,
so it is comfortable to click without a label — but pair it with \`Label\`
anyway; \`htmlFor\` is what lets the text toggle it.

Checked state takes \`--primary\`, so this is one of the controls that flips
with the brand switcher.
        `,
      },
    },
  },
  args: { disabled: false },
} satisfies Meta<typeof Checkbox>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="cb-remote" {...args} />
      <Label htmlFor="cb-remote">Open to remote</Label>
    </div>
  ),
}

export const Checked: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="cb-checked" defaultChecked {...args} />
      <Label htmlFor="cb-checked">Notify me of new applicants</Label>
    </div>
  ),
}

export const Group: Story = {
  render: () => (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">Must have</legend>
      {["Kafka at scale", "Managed 6+ engineers", "Payments domain"].map(
        (label, index) => (
          <div key={label} className="flex items-center gap-2">
            <Checkbox id={`cb-${index}`} defaultChecked={index === 0} />
            <Label htmlFor={`cb-${index}`} className="font-normal">
              {label}
            </Label>
          </div>
        )
      )}
    </fieldset>
  ),
}

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="cb-disabled" defaultChecked {...args} />
      <Label htmlFor="cb-disabled">Included with Pro</Label>
    </div>
  ),
}
