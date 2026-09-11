import * as React from "react"
import { Link, useNavigate } from "react-router"
import {
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  ClockIcon,
  MapPinIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { Item, ItemActions, ItemContent } from "@workspace/ui/components/item"
import { ListCard } from "@workspace/ui/components/list-card"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import { SectionHeader } from "@workspace/ui/components/section-header"
import { StatCard, StatGrid } from "@workspace/ui/components/stat-card"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { AuroraBand } from "@/components/aurora-band"
import {
  activeJobsFor,
  newSinceVisitFor,
  performanceFor,
  recentProjectsFor,
  statsFor,
  worstDrop,
  type DashboardJob,
  type FunnelStage,
  type RecentProject,
} from "@/lib/dashboard"
import { recentSearchesFor, searchHref } from "@/lib/database"
import { SearchRow } from "@/components/search-row"
import { DashboardSkeleton } from "@/components/skeletons"
import { usePageLoading } from "@/lib/use-page-loading"

/**
 * The recruiter dashboard.
 *
 * Same information as the live one — active jobs, upcoming interviews, the
 * counts across the top — reorganised around the question a recruiter opens
 * this page with, which is "what needs me today". The live page leads with a
 * Pro upsell and a customer testimonial and puts the work underneath.
 *
 * TWO EQUAL COLUMNS, NOT A COLUMN AND A RAIL. Jobs and interviews are the two
 * things on this page, and neither is subordinate to the other — a 20rem rail
 * said the interviews were an aside, which is wrong on a day with two of them.
 * Equal columns also means neither side has to be padded with cards to stop the
 * grid looking lopsided.
 *
 * RESPONSIVE ON THE CONTENT COLUMN, NOT THE VIEWPORT. Every breakpoint is an
 * `@container/main` query, because what actually changes width here is the
 * content column when the sidebar collapses — a viewport query would keep a
 * four-across stat row while the column beneath it narrowed by 200px.
 *
 * BUILT FROM THE DESIGN SYSTEM'S PARTS. The stat tiles, section heads, list
 * cards, meta lines and chips used to be local to this file; they are now
 * `packages/ui` patterns with stories, and Storybook's "Compositions →
 * Dashboard" is this same tree without the router or the aurora. If a change
 * here is about a row's shape rather than its content, it belongs there.
 *
 * The replica of the live page is still at /reference/dashboard for
 * comparison; it is a photograph and stays hardcoded. This one follows the
 * brand switcher and dark mode.
 */
export function DashboardPage() {
  // The tiles and the job list are the active product's, not a shared set.
  const { brand } = useBrand()
  const loading = usePageLoading()

  return (
    // `-mt-4 md:-mt-6` cancels the shell's top padding so the band can run edge
    // to edge under the header. The shell owns vertical rhythm for every other
    // page; this one takes it back for the hero only.
    <div className="-mt-4 flex flex-col md:-mt-6">
      {/* The band runs the app's Island Glow aurora over `bg-primary`, and
          falls back to the flat token if WebGL2 is missing. It reads `--primary`
          rather than the handoff's hardcoded green, so the curtains re-tune
          when the brand switches — see `aurora-band.tsx`.

          Its bottom padding is deeper than it looks because the card below
          overlaps back into it. The pair is tuned so the band's edge falls
          inside the card's WHITE half rather than its muted footer — the strip
          is meant to read as the hero ending behind the card, and a colour
          change part-way down a grey footer just looks like a seam. */}
      <AuroraBand className="pt-8 pb-28">
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-6">
          <Greeting />
        </div>
      </AuroraBand>

      {/* `relative` is load-bearing: the band above is a positioned element, so
            without it the band would paint over this whole column and swallow
            the card that is supposed to overlap it. */}
      <div className="relative mx-auto -mt-16 flex w-full max-w-7xl flex-col gap-6 px-4 lg:px-6">
        <RequirementBox />

        {loading ? (
          /* The greeting and the requirement box above this stay put: they are
             the same on both products, so blanking them would be inventing a
             load that is not happening. Everything below is the product's. */
          <DashboardSkeleton />
        ) : (
          <>
            {/* The grid rule (two across, four when there is room, never three)
              lives in StatGrid. Its query is unnamed, so it resolves against the
              nearest container — the shell's `@container/main`.

              NOTE(design): these four are parked. Three of them are standing
              totals that can never prompt an action; the agreed replacement is
              queues with an age on them. See the StatCard story. */}
            <StatGrid>
              {statsFor(brand).map((stat) => (
                <StatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  detail={stat.detail}
                  icon={<stat.icon />}
                />
              ))}
            </StatGrid>

            {/* Projects get the full width and sit above the other two, in the order
              the work moves: a project states what you need, then the job collects
              the people who come to you and the search finds the ones who do not.
              A mandate spans both of those, so a row that spans both of their
              columns is the honest shape for it.

              The pair below is matched: the row stretches, and each section is
              itself a grid of `auto` heading over `1fr` card, so the card fills
              whatever height the taller side sets. Projects keeps its content
              height — it is alone on its row, so there is nothing to match it to. */}
            <RecentProjects />

            <div className="grid gap-6 @3xl/main:grid-cols-2">
              <ActiveJobs />
              <RecentSearches />
            </div>

            {/* PERFORMANCE IS LAST, AND THAT IS THE POINT. Everything above is
                work waiting on you today; this is how the last quarter went.
                It belongs on the dashboard — a recruiter has nowhere else to
                ask "am I getting better at this" now that Insights means the
                market — but it does not belong above the eleven people who
                have not been looked at. */}
            <Performance />
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Sits on the accent band, so both lines take the on-primary pair rather than
 * the page's own foreground tokens — `muted-foreground` is mixed against the
 * page background and goes muddy on a saturated one.
 *
 * Contrast is measured against the animated aurora's own pixels, worst case
 * over fourteen frames with the band's scrim composited in: 4.36:1 behind the
 * heading and 4.83:1 behind the second line. The second line is 14px body text
 * and clears its 4.5:1 bar; the heading is 20px semibold, so it counts as large
 * text and clears the 3:1 that applies to it with room to spare.
 *
 * The heading measures lower than the line beneath it because it sits higher in
 * the band, where the curtains are brightest. That is the trade for an aurora
 * that is actually vivid — an earlier pass dimmed the whole thing to buy 6:1
 * and the band went grey and lifeless. The scrim, not a duller shader, is what
 * holds the floor.
 */
/**
 * How the recruiter's own hiring is going — the half of "analytics" that is
 * about them rather than the market.
 *
 * THREE NUMBERS, EACH WITH A COMPARISON. A figure on its own is not
 * performance: 38 days to fill is good or bad only against the 45 it used to
 * be, so nothing here is shown without what it moved from. The funnel is the
 * exception and gets its own treatment below.
 */
function Performance() {
  const { brand } = useBrand()
  const performance = performanceFor(brand)
  const drop = worstDrop(performance.funnel)
  const hires = performance.sources.reduce((sum, s) => sum + s.hires, 0)
  const sourced =
    performance.sources.find((s) => s.source.startsWith("Sourced"))?.hires ?? 0

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        title="How hiring is going"
        description="Your postings over the last quarter"
      />

      <div className="grid gap-6 @3xl/main:grid-cols-[minmax(0,1fr)_20rem]">
        <FunnelCard funnel={performance.funnel} drop={drop} />

        <div className="flex flex-col gap-6">
          <TrendCard
            label="Time to fill"
            value={`${performance.timeToFill} days`}
            from={performance.timeToFillLastQuarter}
            to={performance.timeToFill}
            /* Fewer days is better, so the arrow's meaning is inverted here. */
            lowerIsBetter
            detail={`was ${performance.timeToFillLastQuarter} days`}
          />

          <TrendCard
            label="Reply rate"
            value={`${performance.replyRate}%`}
            from={performance.replyRateLastQuarter}
            to={performance.replyRate}
            detail={`of everybody you contacted — was ${performance.replyRateLastQuarter}%`}
          />

          <SourceCard
            sources={performance.sources}
            hires={hires}
            sourced={sourced}
          />
        </div>
      </div>
    </section>
  )
}

const funnelConfig = {
  count: { label: "Candidates", color: "var(--chart-1)" },
} satisfies ChartConfig

/**
 * The pipeline, and the one step that loses the most.
 *
 * A funnel where every bar is shorter than the last says nothing — that is what
 * a funnel is. The callout under it is the card's actual output: the step where
 * doing something different would change the outcome.
 */
function FunnelCard({
  funnel,
  drop,
}: {
  funnel: FunnelStage[]
  drop: ReturnType<typeof worstDrop>
}) {
  return (
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
            width={88}
          />
          <XAxis type="number" hide />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>

      <p className="text-sm leading-relaxed">
        <span className="font-medium">
          {drop.lostPct}% drop between {drop.from.stage} and {drop.to.stage}
        </span>{" "}
        <span className="text-muted-foreground">
          — the steepest fall after the first read, and the step worth changing.
        </span>
      </p>
    </Card>
  )
}

/** A number that only means something next to the one it moved from. */
function TrendCard({
  label,
  value,
  from,
  to,
  detail,
  lowerIsBetter,
}: {
  label: string
  value: string
  from: number
  to: number
  detail: string
  lowerIsBetter?: boolean
}) {
  const change = Math.round(((to - from) / from) * 100)
  const better = lowerIsBetter ? to < from : to > from
  const Icon = to > from ? ArrowUpRightIcon : ArrowDownRightIcon

  return (
    <Card className="gap-2 p-4">
      <span className="text-sm text-muted-foreground">{label}</span>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-medium tabular-nums">{value}</span>
        {change !== 0 && (
          /* Coloured by whether it is GOOD, not by the sign. Time to fill
             falling is the best news on this card, and a red down-arrow would
             say the opposite. */
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs tabular-nums",
              better ? "text-success" : "text-warning"
            )}
          >
            <Icon className="size-3.5" />
            {Math.abs(change)}%
          </span>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </Card>
  )
}

/**
 * Which channel the accepted offers actually came from.
 *
 * This is the card that says whether the mandate's two channels are both
 * earning their place — a quarter where nothing was hired from the database is
 * a quarter where sourcing was theatre.
 */
function SourceCard({
  sources,
  hires,
  sourced,
}: {
  sources: { source: string; hires: number }[]
  hires: number
  sourced: number
}) {
  return (
    <Card className="gap-3 p-4">
      <span className="text-sm text-muted-foreground">
        Where {hires} hires came from
      </span>

      {sources.map((source) => (
        <div key={source.source} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm">{source.source}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {source.hires}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(source.hires / hires) * 100}%` }}
            />
          </div>
        </div>
      ))}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {Math.round((sourced / hires) * 100)}% came from people who never
        applied.
      </p>
    </Card>
  )
}

function Greeting() {
  const { brand } = useBrand()

  return (
    <div className="flex flex-col gap-1 text-primary-foreground">
      {/* The page title is in SiteHeader, so this is a greeting rather than a
          second heading competing with it. */}
      <p className="text-xl font-semibold">Good afternoon, Priya</p>
      {/* New since yesterday, not "haven't opened": the response manager
          sorts people by decision and arrival, and does not track reading. */}
      <p className="text-sm">
        Two interviews today, and {newSinceVisitFor(brand)} new applicants since
        yesterday.
      </p>
    </div>
  )
}

/**
 * Describe the role, then search for it.
 *
 * STRIPPED BACK FOR NOW. This box has carried a "Start project" button, four
 * action tiles with previews, and then a checklist of what the description
 * covers plus a tray of Search / Post a job / Get insights. The last two are
 * parked, not deleted: the checklist logic is `requirementParts` in
 * `lib/requirement.ts`, and the automatic project a role would be filed under
 * is `projectForRole` in `lib/dashboard.ts`.
 *
 * SEARCH IS THE ONE ACTION. The arrow and Enter both run it; Shift+Enter is the
 * newline. It is useful on a half-formed query, and it is what a recruiter does
 * most.
 *
 * The text is handed on in the query string rather than being kept here. The
 * database page owns parsing it, this page owns asking — and a link that
 * carries its own input survives being pasted to a colleague, which router
 * state does not. It goes as a natural-language search, which is what a
 * description is, through `searchHref` — so the city and years in it arrive as
 * filters, the same as a search started on the database page.
 */
function RequirementBox() {
  const navigate = useNavigate()
  const [draft, setDraft] = React.useState("")

  const text = draft.trim()
  const search = () => {
    if (text) navigate(searchHref({ mode: "natural", query: text }))
  }

  return (
    <Card className="gap-4 p-4 shadow-lg">
      {/* `rounded-none` is load-bearing. A textarea clips its text to its own
          rounded corners, and with the padding taken to zero the inherited
          `rounded-xl` curve cut the left edge off the first letter —
          "Describe" read as "Oescribe". */}
      <Textarea
        rows={2}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-label="Describe the role you are hiring for"
        placeholder="Describe who you're hiring for — seniority, location, and what they need to have actually done."
        className="min-h-12 resize-none rounded-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-sm dark:bg-transparent"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            search()
          }
        }}
      />

      <Button
        size="icon-sm"
        className="self-end rounded-full"
        aria-label="Search the database"
        disabled={!text}
        onClick={search}
      >
        <ArrowRightIcon />
      </Button>
    </Card>
  )
}

/**
 * The section action: a link that looks like a link, routed.
 *
 * `nativeButton={false}` because it renders as an anchor. Base UI logs an error
 * without it, and it is a real one — button semantics on a link cost the
 * middle-click and copy-link that navigation is expected to have.
 */
function SectionLink({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) {
  return (
    <Button
      variant="link"
      size="sm"
      className="px-0"
      nativeButton={false}
      render={<Link to={to} />}
    >
      {children}
      <ArrowRightIcon data-icon="inline-end" />
    </Button>
  )
}

function ActiveJobs() {
  const { brand } = useBrand()

  return (
    <section className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <SectionHeader
        title="Active jobs"
        action={<SectionLink to="/jobs">View all</SectionLink>}
      />

      <ListCard>
        {activeJobsFor(brand).map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </ListCard>
    </section>
  )
}

/**
 * The row wraps rather than truncating. A job title is the one thing on this
 * page a recruiter identifies the row by, and an ellipsis in the middle of
 * "Principal Engineer, Platform Infra…" costs more than a second line does —
 * which is why this skips `ItemTitle` and its one-line clamp.
 */
function JobRow({ job }: { job: DashboardJob }) {
  return (
    <Item render={<Link to="/jobs" />} className="items-start">
      <ItemContent className="min-w-0 basis-56 gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{job.title}</span>
          <Badge variant={job.plan === "Pro" ? "secondary" : "outline"}>
            {job.plan}
          </Badge>
        </div>

        <Meta separator={false}>
          <MetaItem>
            <MapPinIcon />
            {job.location}
          </MetaItem>
          {/* No warning tone under seven days. An expiry is a date, not a
              problem — the posting is doing what it was bought to do, and
              ambering every second row spends the colour on something nobody
              needs to act on. Matches the Jobs page, which dropped it first. */}
          <MetaItem>
            <ClockIcon />
            Expires in {job.expiresInDays} days
          </MetaItem>
        </Meta>
      </ItemContent>

      {/* Unread is the number that decides whether this row needs you, so it
          gets the emphasis and the total is the quiet one beside it. */}
      <ItemActions className="items-baseline">
        {job.newSinceVisit > 0 ? (
          <>
            <span className="text-lg font-medium tabular-nums">
              {job.newSinceVisit}
            </span>
            <span className="text-xs text-muted-foreground">
              new of {job.applicants}
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            {job.applicants} applicants
          </span>
        )}
      </ItemActions>
    </Item>
  )
}

function RecentSearches() {
  const { brand } = useBrand()

  return (
    <section className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <SectionHeader
        title="Recent searches"
        action={<SectionLink to="/database">New search</SectionLink>}
      />

      {/* Three, and the full list is on the database page. Each row re-runs
          its search there rather than opening an empty box. */}
      <ListCard>
        {recentSearchesFor(brand)
          .slice(0, 3)
          .map((search) => (
            <SearchRow key={search.id} search={search} />
          ))}
      </ListCard>
    </section>
  )
}

function RecentProjects() {
  const { brand } = useBrand()

  return (
    <section className="flex min-w-0 flex-col gap-3">
      {/* No "New project" link: projects are made by what you start in the
          box above, one per role, so there is nothing to create by hand. */}
      <SectionHeader
        title="Recent projects"
        description="One per role, from whatever you start above"
      />

      <ListCard>
        {recentProjectsFor(brand).map((project) => (
          <ProjectRow key={project.id} project={project} />
        ))}
      </ListCard>
    </section>
  )
}

/**
 * A project with channels but nobody contacted has stalled, and that is the
 * state worth spotting from a dashboard — so the row says so in words rather
 * than leaving a recruiter to infer it from two zeroes.
 */
function ProjectRow({ project }: { project: RecentProject }) {
  const notStarted = project.channels.length === 0
  const stalled = !notStarted && project.contacted === 0

  return (
    <Item render={<Link to="/projects/new" />}>
      <ItemContent className="min-w-0 basis-64 flex-row flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{project.name}</span>
        {notStarted ? (
          <Badge variant="outline" className="font-normal">
            Not started
          </Badge>
        ) : (
          project.channels.map((channel) => (
            <Badge key={channel} variant="secondary" className="font-normal">
              {channel}
            </Badge>
          ))
        )}
      </ItemContent>

      <Meta>
        <MetaItem>{project.shortlisted} shortlisted</MetaItem>
        <MetaItem tone={stalled ? "warning" : "default"}>
          {project.contacted} contacted
        </MetaItem>
        <MetaItem className="whitespace-nowrap">{project.updatedAgo}</MetaItem>
      </Meta>
    </Item>
  )
}
