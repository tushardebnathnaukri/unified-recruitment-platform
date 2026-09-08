import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { MapPinIcon, XIcon } from "lucide-react"

import { Chip } from "@workspace/ui/components/chip"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Patterns/Chip",
  component: Chip,
  parameters: {
    design: design("chip"),
    docs: {
      description: {
        component: `
A pill you **press**. \`Badge\` is the pill you read — that is the whole
distinction, and it is worth keeping: a Badge with an onClick has no hover,
no focus ring and \`span\` semantics.

Two uses, one component:

- **Action chip** — omit \`selected\`. The dashboard's "Try" starters, which
  fill the requirement box with a draft.
- **Filter chip** — pass a boolean \`selected\`. It becomes a toggle with
  \`aria-pressed\`, and takes the accent when on. State is yours to hold;
  a filter's value belongs to the search, not the chip.

Built on Base UI \`Button\`, so \`render={<a />}\` works.
        `,
      },
    },
  },
  argTypes: {
    variant: { control: "radio", options: ["outline", "secondary"] },
  },
  args: { children: "Platform engineer", variant: "outline" },
} satisfies Meta<typeof Chip>

export default meta

type Story = StoryObj<typeof meta>

export const Action: Story = {}

export const Starters: Story = {
  name: "Action chips (starters)",
  render: () => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Try</span>
      {["Platform engineer", "Engineering manager", "Product designer"].map(
        (label) => (
          <Chip key={label}>{label}</Chip>
        )
      )}
    </div>
  ),
}

function FilterDemo({ variant }: { variant?: "outline" | "secondary" }) {
  const [active, setActive] = React.useState<string[]>(["Bengaluru"])
  const toggle = (value: string) =>
    setActive((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    )

  return (
    <div className="flex flex-wrap gap-1.5">
      {["Bengaluru", "Pune", "Gurugram", "Remote"].map((city) => (
        <Chip
          key={city}
          variant={variant}
          selected={active.includes(city)}
          onClick={() => toggle(city)}
        >
          <MapPinIcon data-icon="inline-start" />
          {city}
        </Chip>
      ))}
    </div>
  )
}

export const Filters: Story = {
  name: "Filter chips (selected)",
  render: () => <FilterDemo />,
}

export const Secondary: Story = {
  render: () => <FilterDemo variant="secondary" />,
}

export const Removable: Story = {
  render: () => (
    <div className="flex flex-wrap gap-1.5">
      {["Kafka", "Kubernetes", "9–14 yrs"].map((filter) => (
        <Chip key={filter} aria-label={`Remove ${filter}`}>
          {filter}
          <XIcon data-icon="inline-end" />
        </Chip>
      ))}
    </div>
  ),
}

export const Disabled: Story = {
  args: { disabled: true },
}
