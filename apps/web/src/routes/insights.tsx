import * as React from "react"
import { useSearchParams } from "react-router"
import {
  ArrowDownRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XIcon,
  ArrowUpRightIcon,
  LightbulbIcon,
  MinusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { SectionHeader } from "@workspace/ui/components/section-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import {
  ADVICE,
  CITIES,
  DEMAND,
  FACETS,
  FLOW_IN,
  FLOW_OUT,
  NATIONAL_MEDIAN,
  POOL_SIZE,
  SALARY_PERCENTILES,
  SALARY_SUMMARY,
  poolFor,
  type Advice,
  type Facet,
  type FlowRow,
} from "@/lib/insights"

/**
 * Insights — what the market for a role looks like, before you post for it.
 *
 * IT IS NOT ANALYTICS, WHICH IS WHY IT IS NOT CALLED THAT. A recruiter reads
 * "analytics" as "how is my hiring going", and that question is answered on the
 * Dashboard by numbers about their own postings. This page knows nothing about
 * them — it is a market, searched by keyword, and the answer is the same
 * whoever asks it.
 *
 * MODELLED ON CALCULUS, WITH TWO DELIBERATE DEPARTURES.
 *
 * The advisory is at the TOP. On the live tool it is the last thing on the
 * page, under thirteen charts it summarises — which puts the only element that
 * says what to DO behind everything that requires interpreting. Nothing else
 * about the reordering matters as much as that.
 *
 * There are FIVE cards, not thirteen. Thirteen at equal weight is a page with
 * no hierarchy, where the chart that decides your salary band sits beside one
 * you will never act on. These five each answer a question a recruiter takes a
 * decision from: what does it pay, where are they, is demand rising, who do I
 * take them from, and who takes them from me.
 */
export function InsightsPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get("q") ?? "Engineering Manager"

  /**
   * One param per facet, comma separated, absent when nothing is picked — so
   * the plain URL stays plain and a narrowed one is a link somebody can send.
   * That matters more here than anywhere else in the app: this page has no
   * account behind it, so a link to it shows the recipient exactly what the
   * sender was looking at.
   */
  const selected: Record<string, string[]> = Object.fromEntries(
    FACETS.map((facet) => [
      facet.id,
      params.get(facet.id)?.split(",").filter(Boolean) ?? [],
    ])
  )

  const setFacet = (id: string, values: string[]) => {
    const next = new URLSearchParams(params)
    if (values.length) next.set(id, values.join(","))
    else next.delete(id)
    setParams(next, { replace: true })
  }

  const toggle = (id: string, value: string) => {
    const current = selected[id]
    setFacet(
      id,
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    )
  }

  const clearAll = () => {
    const next = new URLSearchParams()
    if (params.get("q")) next.set("q", params.get("q")!)
    setParams(next, { replace: true })
  }

  const matched = poolFor(selected)
  const applied = FACETS.flatMap((facet) =>
    selected[facet.id].map((value) => ({
      facetId: facet.id,
      value,
      label:
        facet.options.find((option) => option.value === value)?.label ?? value,
    }))
  )

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <QueryBar
        query={query}
        onQueryChange={(next) => {
          const params2 = new URLSearchParams(params)
          if (next) params2.set("q", next)
          else params2.delete("q")
          setParams(params2, { replace: true })
        }}
      />

      <div className="flex flex-col gap-6 @4xl/main:flex-row @4xl/main:items-start">
        <FacetRail selected={selected} onToggle={toggle} onClear={clearAll} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <AppliedBar
            matched={matched}
            applied={applied}
            onRemove={toggle}
            onClear={clearAll}
          />

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

/**
 * The same shape the resume Database search uses — a keyword and a Boolean
 * toggle. That is not a coincidence worth hiding: searching the market and
 * searching the database are the same query asked of two different things, and
 * a recruiter who learns one should not have to learn the other.
 */
function QueryBar({
  query,
  onQueryChange,
}: {
  query: string
  onQueryChange: (query: string) => void
}) {
  return (
    <Card className="gap-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            aria-label="Role or skill to look up"
            placeholder="A role or a skill — Engineering Manager, Kafka"
            className="pl-9"
          />
        </div>
        <Button>Search</Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Everything below describes people matching this, not your postings.
      </p>
    </Card>
  )
}

/**
 * The rail.
 *
 * Sections are a button plus conditional content rather than `<details>`: the
 * open set has to survive a selection and be reset by the caller, and a
 * controlled `open` attribute fights the browser's own toggling. `aria-expanded`
 * says the same thing to a screen reader.
 *
 * THREE OPEN BY DEFAULT, NINE SHUT. Calculus shows fourteen facets as a flat
 * list of equals, which is a rail you scroll rather than one you use. Location,
 * experience and salary are the three a recruiter narrows by first; the rest
 * are there when the question is more specific than that.
 */
function FacetRail({
  selected,
  onToggle,
  onClear,
}: {
  selected: Record<string, string[]>
  onToggle: (facetId: string, value: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = React.useState(
    () => new Set(FACETS.filter((facet) => facet.defaultOpen).map((f) => f.id))
  )

  const count = Object.values(selected).reduce(
    (sum, values) => sum + values.length,
    0
  )

  return (
    <Card className="h-fit gap-0 p-4 @4xl/main:sticky @4xl/main:top-4 @4xl/main:max-h-[calc(100svh---spacing(24))] @4xl/main:w-64 @4xl/main:shrink-0 @4xl/main:overflow-y-auto">
      <div className="flex h-8 items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
          Refine
          {count > 0 && (
            <Badge variant="secondary" className="px-1.5">
              {count}
            </Badge>
          )}
        </span>

        {/* Hidden rather than greyed out: a permanently disabled "Clear all" is
            a control that never does anything. */}
        {count > 0 && (
          <Button variant="link" size="sm" className="px-0" onClick={onClear}>
            Clear all
          </Button>
        )}
      </div>

      {FACETS.map((facet) => (
        <FacetSection
          key={facet.id}
          facet={facet}
          open={open.has(facet.id)}
          chosen={selected[facet.id]}
          onToggleSection={() =>
            setOpen((current) => {
              const next = new Set(current)
              if (next.has(facet.id)) next.delete(facet.id)
              else next.add(facet.id)
              return next
            })
          }
          onToggle={onToggle}
        />
      ))}
    </Card>
  )
}

function FacetSection({
  facet,
  open,
  chosen,
  onToggleSection,
  onToggle,
}: {
  facet: Facet
  open: boolean
  chosen: string[]
  onToggleSection: () => void
  onToggle: (facetId: string, value: string) => void
}) {
  const Chevron = open ? ChevronDownIcon : ChevronRightIcon

  return (
    <div className="border-t border-border py-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggleSection}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          {facet.label}
          {chosen.length > 0 && (
            <Badge variant="secondary" className="px-1.5">
              {chosen.length}
            </Badge>
          )}
        </span>
        <Chevron className="size-4 shrink-0 opacity-50" aria-hidden="true" />
      </button>

      {open && (
        <div className="mt-2.5 flex flex-col gap-2.5">
          {facet.options.map((option) => (
            <Label
              key={option.value}
              className="items-center gap-2 font-normal"
            >
              <Checkbox
                checked={chosen.includes(option.value)}
                onCheckedChange={() => onToggle(facet.id, option.value)}
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                {option.label}
              </span>
              {/* The share is what makes an option choosable rather than a
                  guess — "Other, 60%" tells you the filter will barely narrow
                  anything before you spend a click finding out. */}
              <span className="text-xs text-muted-foreground tabular-nums">
                {Math.round(option.share * 100)}%
              </span>
            </Label>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * What is currently narrowing the page, and how much is left.
 *
 * ABOVE THE RESULTS, NOT ONLY IN THE RAIL. On a narrow column the rail sits
 * above the cards and scrolls away; without this a recruiter reads numbers for
 * a slice of the market with no reminder that they asked for a slice.
 */
function AppliedBar({
  matched,
  applied,
  onRemove,
  onClear,
}: {
  matched: number
  applied: { facetId: string; value: string; label: string }[]
  onRemove: (facetId: string, value: string) => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">
        <span className="font-medium tabular-nums">
          {matched.toLocaleString("en-IN")}
        </span>{" "}
        <span className="text-muted-foreground">
          {applied.length > 0
            ? `of ${POOL_SIZE.toLocaleString("en-IN")} profiles`
            : "profiles"}
        </span>
      </span>

      {applied.map((chip) => (
        <button
          key={`${chip.facetId}-${chip.value}`}
          type="button"
          onClick={() => onRemove(chip.facetId, chip.value)}
          className="inline-flex items-center gap-1 rounded-4xl border border-border bg-muted/40 py-1 pr-1.5 pl-2.5 text-xs transition-colors hover:bg-muted"
        >
          {chip.label}
          <XIcon className="size-3 text-muted-foreground" />
          <span className="sr-only">Remove {chip.label}</span>
        </button>
      ))}

      {applied.length > 0 && (
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0 text-xs"
          onClick={onClear}
        >
          Clear all
        </Button>
      )}
    </div>
  )
}

/**
 * The advisory, first on the page.
 *
 * Every line pairs a recommendation with the number under it. An advisory a
 * recruiter cannot check is one they either take on faith or ignore, and both
 * are worse than showing them the chart.
 */
function Advisory() {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="What this means" />

      <div className="grid gap-3 @2xl/main:grid-cols-2">
        {ADVICE.map((advice) => (
          <AdviceRow key={advice.id} advice={advice} />
        ))}
      </div>
    </section>
  )
}

function AdviceRow({ advice }: { advice: Advice }) {
  return (
    <Card className="flex-row items-start gap-3 p-4">
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
  )
}

/**
 * THE ACCENT GOES ON THE ASK, not on what they earn now. `--chart-1` is the
 * brand token, so whichever series holds it is the one the card is pointing
 * at — and the number a recruiter sets a band from is the ask, not the
 * current pay it is measured against.
 */
const salaryConfig = {
  current: { label: "Earning now", color: "var(--chart-2)" },
  expected: { label: "Asking for", color: "var(--chart-1)" },
} satisfies ChartConfig

/**
 * Current against expected pay, in ONE chart at matching percentiles.
 *
 * Calculus draws these as two cards side by side, and their x-axes disagree
 * — 18–29 against 17–29 — so the one comparison anybody wants cannot be read
 * across them. Percentiles rather than salary bands is the other half: bands
 * change with the data, percentiles are the same question every time, and
 * "what does the 75th percentile ask for" is the number a band is set from.
 */
function SalaryCard() {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="What it pays"
        description={`National median ₹${NATIONAL_MEDIAN}L`}
      />

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
          <span className="font-medium">
            ₹{SALARY_SUMMARY.medianCurrent}L earned, ₹
            {SALARY_SUMMARY.medianExpected}L asked
          </span>{" "}
          <span className="text-muted-foreground">
            at the median — a {SALARY_SUMMARY.uplift}% uplift to beat.
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
  const first = DEMAND[0].postings
  const last = DEMAND[DEMAND.length - 1].postings
  const change = Math.round(((last - first) / first) * 100)

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="Whether demand is rising"
        description="Postings for this role, per month"
      />

      <Card className="gap-4 p-4">
        <ChartContainer config={demandConfig} className="h-56 w-full">
          <LineChart
            accessibilityLayer
            data={DEMAND}
            margin={{ left: 8, right: 8 }}
          >
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
          <span className="font-medium">
            {change > 0 ? "Up" : "Down"} {Math.abs(change)}% since{" "}
            {DEMAND[0].month}
          </span>{" "}
          <span className="text-muted-foreground">
            — {last} postings competing for these people this month.
          </span>
        </p>
      </Card>
    </section>
  )
}

/**
 * Where the people are, and what they cost there.
 *
 * `% change` is the column that turns this from a table into a decision: a city
 * whose median is falling is a city to post in, and it is the one number on the
 * page that says "here is an opportunity" without anybody having to compute it.
 */
function GeographyCard() {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="Where they are"
        description={`Share of profiles and median pay, against a national ₹${NATIONAL_MEDIAN}L`}
      />

      <Card className="gap-0 overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">City</TableHead>
              <TableHead className="text-right">Share</TableHead>
              <TableHead className="text-right">Median</TableHead>
              <TableHead className="pr-5 text-right">Year on year</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {CITIES.map((city) => (
              <TableRow key={city.city} className="last:border-b-0">
                <TableCell className="pl-5 font-medium">{city.city}</TableCell>

                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {city.share}%
                </TableCell>

                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    city.medianLakh > NATIONAL_MEDIAN && "font-medium"
                  )}
                >
                  ₹{city.medianLakh}L
                </TableCell>

                <TableCell className="pr-5 text-right">
                  <Change value={city.change} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}

/**
 * Falling pay is GOOD NEWS to a recruiter, which is the opposite of what a
 * green-up/red-down convention would say. Coloured by what it means for the
 * person reading rather than by the sign of the number.
 */
function Change({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground tabular-nums">
        <MinusIcon className="size-3.5" />
        Flat
      </span>
    )
  }

  const rising = value > 0
  const Icon = rising ? ArrowUpRightIcon : ArrowDownRightIcon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        rising ? "text-warning" : "text-success"
      )}
    >
      <Icon className="size-3.5" />
      {Math.abs(value)}%
    </span>
  )
}

/**
 * A ranked list with share bars, where Calculus draws a Sankey.
 *
 * The ribbon diagram is these two rankings with a curve between them, and the
 * curve is the part you cannot read a number off. Split in two, each side
 * answers a question directly — who to poach from, who is poaching from you —
 * and both survive being half a column wide.
 */
function FlowCard({
  title,
  hint,
  rows,
}: {
  title: string
  hint: string
  rows: FlowRow[]
}) {
  const top = Math.max(...rows.map((row) => row.share))

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title={title} description={hint} />

      <Card className="gap-3 p-4">
        {rows.map((row) => (
          <div key={row.company} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm">{row.company}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {row.share}%
              </span>
            </div>
            {/* Scaled to the biggest row, not to 100: these are the top five of
                a long tail, so a bar against 100 would render every one of them
                as a stub and hide the differences between them. */}
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(row.share / top) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </Card>
    </section>
  )
}
