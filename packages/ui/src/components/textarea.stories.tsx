import type { Meta, StoryObj } from "@storybook/react-vite"

import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Textarea",
  component: Textarea,
  parameters: {
    design: design("textarea"),
    docs: {
      description: {
        component: `
Multi-line text. Grows with its content (\`field-sizing-content\`) instead
of showing a scrollbar, and is \`rounded-xl\` where \`Input\` is a pill — the
one field in the system that is not, because a pill around two lines of
text looks wrong.

The dashboard's requirement box strips its border and ring and lets the
surrounding \`Card\` be the field; see Compositions → Dashboard.
        `,
      },
    },
  },
  args: {
    placeholder:
      "Describe who you're hiring for — seniority, location, and what they need to have actually done.",
    disabled: false,
  },
} satisfies Meta<typeof Textarea>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => <Textarea {...args} className="w-96" />,
}

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex w-96 flex-col gap-2">
      <Label htmlFor="ta-mandate">Mandate</Label>
      <Textarea id="ta-mandate" {...args} />
      <p className="text-xs text-muted-foreground">
        Two sentences is plenty. You can edit the numbers after.
      </p>
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue:
      "Staff platform engineer in Bengaluru, 9–14 years, has run Kafka at scale",
  },
  render: (args) => <Textarea {...args} className="w-96" />,
}
