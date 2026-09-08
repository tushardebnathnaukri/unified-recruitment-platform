import type { Meta, StoryObj } from "@storybook/react-vite"
import { ClockIcon, SparklesIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { design } from "@workspace/ui/lib/figma"

const VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "link",
  "success",
  "warning",
  "destructive",
] as const

const meta = {
  title: "Components/Badge",
  component: Badge,
  parameters: {
    design: design("badge"),
    docs: {
      description: {
        component: `
A pill you **read**. For a pill you press, use \`Chip\` (Patterns).

Built on Base UI's \`useRender\`, so \`render={<a href />}\` turns it into a
link without a wrapper. \`success\` and \`warning\` map to the shared status
tokens — a job is "published" the same way on iimjobs and hirist, so status
colour is deliberately *not* brand-aware.

On the dashboard: plan tier next to a job title (\`secondary\` / \`outline\`),
saved-search filters (\`outline\`, \`font-normal\`), and "6 new" on a search
that moved (\`success\` — the one thing on the row that earns a colour).
        `,
      },
    },
  },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
  },
  args: { children: "Pro", variant: "default" },
} satisfies Meta<typeof Badge>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      {VARIANTS.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
}

export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary">
        <SparklesIcon data-icon="inline-start" />
        Pro
      </Badge>
      <Badge variant="warning">
        <ClockIcon data-icon="inline-start" />
        Expires in 3 days
      </Badge>
    </div>
  ),
}

export const Status: Story = {
  name: "Status (shared tokens)",
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="success" className="font-normal">
        6 new
      </Badge>
      <Badge variant="warning" className="font-normal">
        Stalled
      </Badge>
      <Badge variant="destructive" className="font-normal">
        Expired
      </Badge>
      <Badge variant="outline" className="font-normal">
        Not started
      </Badge>
    </div>
  ),
}

export const AsLink: Story = {
  render: () => (
    <Badge variant="outline" render={<a href="#bengaluru" />}>
      Bengaluru
    </Badge>
  ),
}
