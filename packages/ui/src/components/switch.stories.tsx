import type { Meta, StoryObj } from "@storybook/react-vite"

import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Switch",
  component: Switch,
  parameters: {
    design: design("switch"),
    docs: {
      description: {
        component: `
Base UI \`Switch\`. For a setting that takes effect immediately — a
notification preference, "show unread only". A choice that needs a Save
button is a \`Checkbox\`.

Two sizes; \`sm\` is for dense rows like a filter panel. On takes
\`--primary\`, so it flips with the brand.
        `,
      },
    },
  },
  argTypes: {
    size: { control: "radio", options: ["sm", "default"] },
  },
  args: { size: "default", disabled: false },
} satisfies Meta<typeof Switch>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Switch id="sw-default" {...args} />
      <Label htmlFor="sw-default">Email me when someone applies</Label>
    </div>
  ),
}

export const Checked: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Switch id="sw-checked" defaultChecked {...args} />
      <Label htmlFor="sw-checked">Show unread only</Label>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Switch size="sm" defaultChecked aria-label="Small" />
      <Switch size="default" defaultChecked aria-label="Default" />
    </div>
  ),
}

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <div className="flex items-center gap-2">
      <Switch id="sw-disabled" defaultChecked {...args} />
      <Label htmlFor="sw-disabled">Included with Pro</Label>
    </div>
  ),
}
