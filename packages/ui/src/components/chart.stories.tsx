import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import { Card } from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { design } from "@workspace/ui/lib/figma"

/**
 * No `component` on the meta. `ChartContainer` requires both `config` and a
 * recharts `children` element, so binding it here would demand args on every
 * story — and each of these is a `render`, which makes an args table useless
 * anyway. The Docs page still generates from the description below.
 */
const meta = {
  title: "Components/Chart",
  parameters: {
    design: design("chart"),
    layout: "padded",
    docs: {
      description: {
        component: `
shadcn's wrapper over **recharts 3.8**. A \`ChartContainer\` plus a
\`ChartConfig\` — a map from series key to \`{ label, color }\` — and the
container writes the colours out as CSS variables the recharts elements read
through \`var(--color-<key>)\`.

Used on **/insights** and the Dashboard's performance section.

**Point colours at \`var(--chart-N)\`, never at a hex.** That is the whole
reason the config exists: one indirection, so a chart's palette is a token
decision rather than a per-chart one.

> **\`--chart-1\` … \`--chart-5\` are a NEUTRAL ZINC RAMP.** They are the
> same five values in light and dark, and the brand layers do not touch them
> — the \`[data-brand]\` blocks cover the five accent tokens only. So a chart
> does **not** re-theme with the brand, and does not invert with the theme
> either.
>
> Because the ramp only runs one way, each token is legible in exactly one
> theme. Measured against \`--card\`:
>
> | token | hex | on white card | on dark card |
> | --- | --- | --- | --- |
> | \`--chart-1\` | \`#d4d4d8\` | **1.48:1** | 11.99:1 |
> | \`--chart-2\` | \`#71717b\` | 4.83:1 | 3.67:1 |
> | \`--chart-3\` | \`#52525c\` | 7.73:1 | **2.29:1** |
> | \`--chart-4\` | \`#3f3f46\` | 10.46:1 | **1.70:1** |
> | \`--chart-5\` | \`#27272a\` | 14.89:1 | **1.19:1** |
>
> WCAG 1.4.11 asks 3:1 of a graphical object. \`--chart-1\` is the only series
> on the Dashboard's funnel AND on the Insights demand line, so both are
> effectively invisible in light mode. \`TODO(design)\`: whether series should
> take the brand accent is a question nobody has answered yet, so nothing here
> has been changed.

\`ChartTooltipContent\` and \`ChartLegendContent\` read their labels from the
same config, so a series is named in one place.

\`ChartContainer\` is \`aspect-video\` by default — the app overrides that
with an explicit height (\`className="h-64 w-full"\`), which is what you want
inside a card whose width is a grid column.
        `,
      },
    },
  },
} satisfies StoryMeta

export default meta

type Story = StoryObj<typeof meta>

const funnel = [
  { stage: "Applied", count: 420 },
  { stage: "Shortlisted", count: 168 },
  { stage: "Screened", count: 94 },
  { stage: "Interviewed", count: 31 },
  { stage: "Offered", count: 9 },
]

const funnelConfig = {
  count: { label: "Candidates", color: "var(--chart-1)" },
} satisfies ChartConfig

/** The Dashboard's funnel: a horizontal bar chart inside a card. */
export const Funnel: Story = {
  name: "Funnel (as the Dashboard uses it)",
  render: () => (
    <Card className="gap-4 p-4">
      <ChartContainer config={funnelConfig} className="h-64 w-full">
        <BarChart
          accessibilityLayer
          data={funnel}
          layout="vertical"
          margin={{ left: 8, right: 16 }}
        >
          <CartesianGrid horizontal={false} />
          <YAxis
            dataKey="stage"
            type="category"
            tickLine={false}
            axisLine={false}
            width={92}
          />
          <XAxis type="number" hide />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>
    </Card>
  ),
}

const demand = [
  { month: "Apr", platform: 128, frontend: 96 },
  { month: "May", platform: 141, frontend: 92 },
  { month: "Jun", platform: 166, frontend: 88 },
  { month: "Jul", platform: 182, frontend: 95 },
  { month: "Aug", platform: 211, frontend: 101 },
  { month: "Sep", platform: 238, frontend: 99 },
]

const demandConfig = {
  platform: { label: "Platform engineer", color: "var(--chart-2)" },
  frontend: { label: "Frontend engineer", color: "var(--chart-4)" },
} satisfies ChartConfig

/** Two series, so the legend has something to do. */
export const Demand: Story = {
  name: "Demand over time",
  render: () => (
    <Card className="gap-4 p-4">
      <ChartContainer config={demandConfig} className="h-64 w-full">
        <LineChart accessibilityLayer data={demand} margin={{ left: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={32} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            dataKey="platform"
            stroke="var(--color-platform)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            dataKey="frontend"
            stroke="var(--color-frontend)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </Card>
  ),
}

const ramp = [1, 2, 3, 4, 5]

/**
 * The five chart tokens, drawn from the CSS variables. Flip the theme or the
 * brand in the toolbar: nothing here moves, which is the point being made
 * above.
 */
export const Palette: Story = {
  name: "The chart ramp",
  render: () => (
    <div className="flex flex-col gap-2">
      {ramp.map((n) => (
        <div key={n} className="flex items-center gap-3">
          <div
            className="size-10 rounded-md border"
            style={{ background: `var(--chart-${n})` }}
          />
          <code className="text-xs text-muted-foreground">--chart-{n}</code>
        </div>
      ))}
    </div>
  ),
}
