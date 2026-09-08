import type { Meta, StoryObj } from "@storybook/react-vite"
import { SearchIcon } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Input",
  component: Input,
  parameters: {
    design: design("input"),
    docs: {
      description: {
        component: `
Base UI \`Input\` on a plain \`<input>\` API. Pill-shaped (\`rounded-4xl\`) to
match \`Button\`; \`Textarea\` is the one field that is not, because a pill
around two lines of text looks wrong.

Invalid state is driven by \`aria-invalid\`, not a prop, so it composes with
whatever form library ends up here. Text is 16px on mobile and 14px from
\`md\` up — the 16px stops iOS zooming into the field.
        `,
      },
    },
  },
  args: { placeholder: "Job title", disabled: false },
} satisfies Meta<typeof Input>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => <Input {...args} className="w-72" />,
}

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex w-72 flex-col gap-2">
      <Label htmlFor="in-title">Job title</Label>
      <Input id="in-title" {...args} />
    </div>
  ),
}

export const Invalid: Story = {
  render: (args) => (
    <div className="flex w-72 flex-col gap-2">
      <Label htmlFor="in-invalid">Job title</Label>
      <Input id="in-invalid" {...args} aria-invalid defaultValue="" />
      <p className="text-xs text-destructive">A title is required.</p>
    </div>
  ),
}

export const Search: Story = {
  name: "With leading icon",
  render: () => (
    <div className="relative w-72">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search the database"
        className="pl-9"
        aria-label="Search the database"
      />
    </div>
  ),
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Principal Engineer" },
  render: (args) => <Input {...args} className="w-72" />,
}
