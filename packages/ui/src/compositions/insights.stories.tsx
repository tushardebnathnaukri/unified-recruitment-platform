import type {
  Decorator,
  Meta as StoryMeta,
  StoryObj,
} from "@storybook/react-vite"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts"
import { LightbulbIcon, SearchIcon, XIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Chip } from "@workspace/ui/components/chip"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { SectionHeader } from "@workspace/ui/components/section-header"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import { designComposition } from "@workspace/ui/lib/figma"

/**
 * Insights — the market for a role.
 *
 * Mirrors `apps/web/src/routes/insights.tsx`; mock data is a copy of
 * `apps/web/src/lib/insights.ts`.
 *
 * **`/insights` is the market; the Dashboard is you.** This page answers "what
 * does this role pay, where are the people, is demand rising" and reads the
 * same for whoever searches it. "How is my hiring going" — funnel, time to
 * fill, reply rate — lives on the Dashboard, because a recruiter reads
 * "analytics" as the second question. The nav item was renamed rather than
 * one page trying to be both.
 *
 * Modelled on `calculus.hirist.tech`, with three deliberate departures noted
 * on the sections below.
 */

const SALARY_PERCENTILES = [
  { label: "10th", current: 26, expected: 32 },
  { label: "25th", current: 38, expected: 45 },
  { label: "50th", current: 50, expected: 60 },
  { label: "75th", current: 68, expected: 79 },
  { label: "90th", current: 88, expected: 102 },
]

const DEMAND = [
  { month: "Mar", postings: 86 },
  { month: "Apr", postings: 64 },
  { month: "May", postings: 97 },
  { month: "Jun", postings: 127 },
  { month: "Jul", postings: 112 },
  { month: "Aug", postings: 134 },
]

const CITIES = [
  { city: "Bengaluru", share: 44.4, medianLakh: 55, change: 10 },
  { city: "Delhi NCR", share: 20.4, medianLakh: 50, change: 0 },
  { city: "Hyderabad", share: 12.4, medianLakh: 55, change: 10 },
  { city: "Pune", share: 8.6, medianLakh: 47.7, change: -4.6 },
  { city: "Chennai", share: 5.2, medianLakh: 42, change: -16 },
  { city: "Mumbai", share: 4.9, medianLakh: 43.5, change: -13 },
  { city: "Kolkata", share: 0.9, medianLakh: 35.5, change: -29 },
]

const FLOW_IN = [
  { company: "Siemens", share: 18 },
  { company: "Publicis Sapient", share: 15 },
  { company: "Matter Motor Works", share: 11 },
  { company: "Nonghyup Bank", share: 9 },
  { company: "Accenture", share: 7 },
]

const FLOW_OUT = [
  { company: "Bhanzu", share: 21 },
  { company: "Creesync Software", share: 16 },
  { company: "Oracle", share: 12 },
  { company: "Wells Fargo", share: 8 },
  { company: "Walmart", share: 6 },
]

const ADVICE = [
  {
    id: "a1",
    headline: "Move quickly — demand is climbing",
    evidence: "134 postings in Aug, up 56% from Apr",
    tone: "act",
  },
  {
    id: "a2",
    headline: "Budget around ₹60L to be competitive",
    evidence: "Median ask is ₹60L against ₹50L earned — a 20% uplift",
    tone: "neutral",
  },
  {
    id: "a3",
    headline: "Look beyond Bengaluru",
    evidence: "44% of profiles, and the only metro where pay rose 10%",
    tone: "caution",
  },
  {
    id: "a4",
    headline: "Chennai and Kolkata are getting cheaper",
    evidence: "Median down 16% and 29% year on year",
    tone: "act",
  },
]

const FACETS = [
  {
    id: "experience",
    title: "Experience",
    options: ["0–3 yrs", "4–8 yrs", "9–14 yrs", "15+ yrs"],
  },
  {
    id: "city",
    title: "City",
    options: ["Bengaluru", "Delhi NCR", "Hyderabad", "Pune"],
  },
  {
    id: "industry",
    title: "Industry",
    options: ["IT Services", "Product", "BFSI", "Consulting"],
  },
]

/**
 * The same shape the resume Database search uses — a keyword and a Boolean
 * toggle. That is not a coincidence worth hiding: searching the market and
 * searching the database are the same query asked of two different things.
 */
function QueryBar() {
  return (
    <Card className="gap-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            defaultValue="Engineering Manager"
            aria-label="Role or skill to look up"
            placeholder="A role or a skill — Engineering Manager, Kafka"
            className="pl-9"
          />
        </div>
        <Button>Look it up</Button>
      </div>
    </Card>
  )
}

function FacetRail() {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 @4xl/main:w-64">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Narrow the market</p>
        <Button variant="ghost" size="sm">
          Clear
        </Button>
      </div>

      {FACETS.map((facet, index) => (
        <div key={facet.id} className="flex flex-col gap-2">
          {index > 0 && <Separator className="mb-2" />}
          <p className="text-xs font-medium text-muted-foreground">
            {facet.title}
          </p>
          {facet.options.map((option) => (
            <Label
              key={option}
              className="flex items-center gap-2 text-sm font-normal"
            >
              <Checkbox defaultChecked={option === "Bengaluru"} />
              {option}
            </Label>
          ))}
        </div>
      ))}
    </aside>
  )
}

/** What is currently narrowing the market, and the size of what is left. */
function AppliedBar() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">5,540</span> profiles
        match
      </span>
      <Chip selected>
        Bengaluru
        <XIcon data-icon="inline-end" />
      </Chip>
    </div>
  )
}

/**
 * THE ADVISORY SITS AT THE TOP, not under the thirteen charts it summarises —
 * the arrangement Calculus uses, and the one thing about that page I would not
 * copy. Every line carries its evidence: an advisory a recruiter cannot check
 * is one they either believe blindly or ignore, and both are worse than a
 * chart.
 */
function Advisory() {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="What this means" />
      <div className="grid gap-3 @2xl/main:grid-cols-2">
        {ADVICE.map((advice) => (
          <Card key={advice.id} className="flex-row items-start gap-3 p-4">
            <LightbulbIcon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                advice.tone === "act" && "text-primary",
                advice.tone === "caution" && "text-warning",
                advice.tone === "neutral" && "text-muted-foreground"
              )}
            />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm font-medium">{advice.headline}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {advice.evidence}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

const salaryConfig = {
  current: { label: "Earning now", color: "var(--chart-1)" },
  expected: { label: "Asking for", color: "var(--chart-2)" },
} satisfies ChartConfig

/**
 * Current against expected pay, in ONE chart at matching percentiles.
 *
 * Calculus draws these as two cards side by side and their x-axes disagree —
 * 18–29 against 17–29 — so the one comparison anybody wants cannot be read
 * across them. Percentiles rather than salary bands is the other half: bands
 * change with the data, percentiles are the same question every time.
 */
function SalaryCard() {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="What it pays" description="National median ₹50L" />
      <Card className="gap-4 p-4">
        <ChartContainer config={salaryConfig} className="h-56 w-full">
          <BarChart accessibilityLayer data={SALARY_PERCENTILES}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="current" fill="var(--color-current)" radius={4} />
            <Bar dataKey="expected" fill="var(--color-expected)" radius={4} />
          </BarChart>
        </ChartContainer>

        {/* The one number this card exists to produce. */}
        <p className="text-sm leading-relaxed">
          <span className="font-medium">₹50L earned, ₹60L asked</span>{" "}
          <span className="text-muted-foreground">
            at the median — a 20% uplift to beat.
          </span>
        </p>
      </Card>
    </section>
  )
}

const demandConfig = {
  postings: { label: "Postings", color: "var(--chart-1)" },
} satisfies ChartConfig

function DemandCard() {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="Whether demand is rising"
        description="Postings for this role, per month"
      />
      <Card className="gap-4 p-4">
        <ChartContainer config={demandConfig} className="h-56 w-full">
          <LineChart accessibilityLayer data={DEMAND} margin={{ left: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              dataKey="postings"
              stroke="var(--color-postings)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
        <p className="text-sm leading-relaxed">
          <span className="font-medium">Up 56%</span>{" "}
          <span className="text-muted-foreground">since March.</span>
        </p>
      </Card>
    </section>
  )
}

/** A city getting cheaper is a city to post in — which is what `change` is for. */
function Change({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-muted-foreground tabular-nums">—</span>
  }

  return (
    <span
      className={cn(
        "tabular-nums",
        value > 0 ? "text-warning" : "text-success"
      )}
    >
      {value > 0 ? "+" : ""}
      {value}%
    </span>
  )
}

function GeographyCard() {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="Where the people are"
        description="Share of profiles, and what they cost there"
      />
      <Card className="gap-0 p-4">
        {CITIES.map((row, index) => (
          <div key={row.city}>
            {index > 0 && <Separator className="my-2" />}
            <div className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm">{row.city}</span>
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(row.share / 44.4) * 100}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                {row.share}%
              </span>
              <span className="w-16 shrink-0 text-right text-sm tabular-nums">
                ₹{row.medianLakh}L
              </span>
              <span className="w-14 shrink-0 text-right text-sm">
                <Change value={row.change} />
              </span>
            </div>
          </div>
        ))}
      </Card>
    </section>
  )
}

/**
 * A LIST WITH SHARE BARS, NOT A SANKEY. The ribbon diagram Calculus draws is
 * the same two rankings with a curve between them, and the curve is the part
 * nobody can read a number off.
 */
function FlowCard({
  title,
  hint,
  rows,
}: {
  title: string
  hint: string
  rows: { company: string; share: number }[]
}) {
  const top = rows[0].share

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title={title} description={hint} />
      <Card className="gap-3 p-4">
        {rows.map((row) => (
          <div key={row.company} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-sm">
              {row.company}
            </span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(row.share / top) * 100}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
              {row.share}%
            </span>
          </div>
        ))}
      </Card>
    </section>
  )
}

function InsightsPage() {
  return (
    <div className="@container/main flex flex-col gap-6 px-4 lg:px-6">
      <QueryBar />

      <div className="flex flex-col gap-6 @4xl/main:flex-row @4xl/main:items-start">
        <FacetRail />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <AppliedBar />
          <Advisory />

          <div className="grid gap-6 @3xl/main:grid-cols-2">
            <SalaryCard />
            <DemandCard />
          </div>

          <GeographyCard />

          <div className="grid gap-6 @3xl/main:grid-cols-2">
            <FlowCard
              title="Where they come from"
              hint="Previous employer of people now in this role"
              rows={FLOW_IN}
            />
            <FlowCard
              title="Where they go"
              hint="Who hires them next"
              rows={FLOW_OUT}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: "Compositions/Insights",
  parameters: {
    design: designComposition("insights"),
    layout: "fullscreen",
    docs: {
      description: {
        component: `
The market for a role — what it pays, where the people are, whether demand is
rising. Mirrors \`apps/web/src/routes/insights.tsx\`.

**This is not the Dashboard.** Insights reads the same for whoever searches
it; the Dashboard is about your own postings. The nav item was renamed from
Analytics rather than one page trying to answer both.

Three departures from \`calculus.hirist.tech\`, which this is modelled on:

1. **The advisory sits at the top**, not under the charts it summarises, and
   every line carries the evidence a recruiter would need to check it.
2. **Pay is one chart at matching percentiles**, not two cards whose x-axes
   disagree — the comparison anybody wants is current against expected.
3. **The flows are ranked lists with share bars**, not a Sankey. A ribbon is
   the same two rankings with a curve between them, and the curve is the part
   nobody can read a number off.

Every facet is a URL param, comma separated and absent when empty — this page
has no account behind it, so a link to it shows the recipient exactly what the
sender was looking at.

> The charts use \`--chart-1\`…\`--chart-5\`, which are a neutral zinc ramp
> shared across brands and themes. See Components → Chart.
        `,
      },
    },
  },
} satisfies StoryMeta

export default meta

type Story = StoryObj<typeof meta>

export const FullPage: Story = {
  name: "Insights — full page",
  render: () => <InsightsPage />,
}

const padded: Decorator = (Story) => (
  <div className="@container/main mx-auto max-w-4xl p-6">
    <Story />
  </div>
)

export const QueryBarStory: Story = {
  name: "Query bar",
  decorators: [padded],
  render: () => <QueryBar />,
}

export const AdvisoryStory: Story = {
  name: "Advisory",
  decorators: [padded],
  render: () => <Advisory />,
}

export const PayStory: Story = {
  name: "What it pays",
  decorators: [padded],
  render: () => <SalaryCard />,
}

export const GeographyStory: Story = {
  name: "Where the people are",
  decorators: [padded],
  render: () => <GeographyCard />,
}

export const FlowStory: Story = {
  name: "Where they come from",
  decorators: [padded],
  render: () => (
    <FlowCard
      title="Where they come from"
      hint="Previous employer of people now in this role"
      rows={FLOW_IN}
    />
  ),
}

export const FacetRailStory: Story = {
  name: "Facet rail",
  decorators: [padded],
  render: () => <FacetRail />,
}
