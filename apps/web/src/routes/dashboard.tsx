import * as React from "react"
import { Link, useNavigate } from "react-router"
import {
  ArrowRightIcon,
  ClockIcon,
  MapPinIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { AuroraBand } from "@/components/aurora-band"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import {
  ACTIVE_JOBS,
  RECENT_PROJECTS,
  RECENT_SEARCHES,
  STATS,
  SUGGESTED_REQUIREMENTS,
  type DashboardJob,
  type RecentProject,
  type RecentSearch,
} from "@/lib/dashboard"

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
 * The replica of the live page is still at /reference/dashboard for
 * comparison; it is a photograph and stays hardcoded. This one is built out of
 * the design system, so it follows the brand switcher and dark mode.
 */
export function DashboardPage() {
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

        <StatRow />

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
function Greeting() {
  return (
    <div className="flex flex-col gap-1 text-primary-foreground">
      {/* The page title is in SiteHeader, so this is a greeting rather than a
          second heading competing with it. */}
      <p className="text-xl font-semibold">Good afternoon, Priya</p>
      <p className="text-sm">
        Two interviews today, and 48 applicants you haven&rsquo;t opened.
      </p>
    </div>
  )
}

/**
 * Start a project by describing the role, straight off the dashboard.
 *
 * IT REPLACED THE "CREATE PROJECT" BUTTON THAT SAT IN THE GREETING. Both went
 * to the same route, and a button beside a box that does the same thing better
 * is a choice the recruiter has to make for no reason. The sidebar still keeps
 * a global create action for every other page.
 *
 * NO ACCENT TINT. This was a `bg-primary/5` card, and 5% of a green over a
 * near-white page is not emphasis — it reads as a panel that has been greyed
 * out. The box earns its prominence from position and size instead, and the
 * only saturated thing on it is the button, which is the thing you press.
 *
 * The text is handed on in the query string rather than being kept here. The
 * mandate page owns parsing it, this page owns asking — and a link that carries
 * its own input survives being pasted to a colleague, which router state does
 * not.
 */
function RequirementBox() {
  const navigate = useNavigate()
  const [draft, setDraft] = React.useState("")

  const start = () => {
    const value = draft.trim()
    if (!value) return
    navigate(`/projects/new?mandate=${encodeURIComponent(value)}`)
  }

  return (
    <Card className="gap-0 overflow-hidden p-0 shadow-lg">
      <label className="flex cursor-text items-start gap-3 p-4">
        <SparklesIcon className="mt-1 size-4 shrink-0 text-primary" />
        <Textarea
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Describe the role you are hiring for"
          placeholder="Describe who you're hiring for — seniority, location, and what they need to have actually done."
          className="min-h-14 resize-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-sm dark:bg-transparent"
          onKeyDown={(event) => {
            // Cmd/Ctrl+Enter starts; a bare Enter has to stay a newline,
            // because the useful version of this input runs to two sentences.
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              start()
            }
          }}
        />
      </label>

      {/* A tinted footer rather than a tinted card: the strip separates the
          input from its actions and keeps the primary button findable, without
          washing colour across the thing you are trying to type into. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Try</span>
          {SUGGESTED_REQUIREMENTS.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => setDraft(suggestion.text)}
              className="rounded-4xl border border-border bg-background px-2.5 py-1 text-xs transition-colors hover:bg-muted"
            >
              {suggestion.label}
            </button>
          ))}
        </div>

        <Button
          type="button"
          size="sm"
          disabled={draft.trim() === ""}
          onClick={start}
        >
          Start project
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </Card>
  )
}

/**
 * Two across on a narrow column, four when there is room. Never three — an
 * orphan tile on the second row reads as a rendering fault.
 */
function StatRow() {
  return (
    <div className="grid grid-cols-2 gap-3 @3xl/main:grid-cols-4 @3xl/main:gap-4">
      {STATS.map((stat) => {
        const Icon = stat.icon

        return (
          <Card key={stat.label} className="gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                {stat.label}
              </span>
              <Icon className="size-4 shrink-0 text-muted-foreground" />
            </div>
            <p className="text-2xl font-medium tabular-nums">{stat.value}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {stat.detail}
            </p>
          </Card>
        )
      })}
    </div>
  )
}

function SectionHead({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <h2 className="text-sm font-medium">{title}</h2>
      {action}
    </div>
  )
}

function ActiveJobs() {
  return (
    <section className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <SectionHead
        title="Active jobs"
        action={
          <Link
            to="/jobs"
            className={cn(
              buttonVariants({ variant: "link", size: "sm" }),
              "px-0"
            )}
          >
            View all
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        }
      />

      <Card className="gap-0 p-0">
        {ACTIVE_JOBS.map((job, index) => (
          <JobRow key={job.id} job={job} first={index === 0} />
        ))}
      </Card>
    </section>
  )
}

/**
 * The row wraps rather than truncating. A job title is the one thing on this
 * page a recruiter identifies the row by, and an ellipsis in the middle of
 * "Principal Engineer, Platform Infra…" costs more than a second line does.
 */
function JobRow({ job, first }: { job: DashboardJob; first: boolean }) {
  const expiringSoon = job.expiresInDays <= 7

  return (
    <Link
      to="/jobs"
      className={cn(
        "flex flex-wrap items-start gap-x-4 gap-y-3 p-4 transition-colors hover:bg-muted/50",
        !first && "border-t border-border"
      )}
    >
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{job.title}</span>
          <Badge variant={job.plan === "Pro" ? "secondary" : "outline"}>
            {job.plan}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPinIcon className="size-3.5" />
            {job.location}
          </span>
          <span
            className={cn(
              "flex items-center gap-1",
              expiringSoon && "text-warning"
            )}
          >
            <ClockIcon className="size-3.5" />
            Expires in {job.expiresInDays} days
          </span>
        </div>
      </div>

      {/* Unread is the number that decides whether this row needs you, so it
          gets the emphasis and the total is the quiet one beside it. */}
      <div className="flex items-baseline gap-2">
        {job.unread > 0 ? (
          <>
            <span className="text-lg font-medium tabular-nums">
              {job.unread}
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
      </div>
    </Link>
  )
}

function RecentSearches() {
  return (
    <section className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <SectionHead
        title="Recent searches"
        action={
          <Link
            to="/database"
            className={cn(
              buttonVariants({ variant: "link", size: "sm" }),
              "px-0"
            )}
          >
            New search
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        }
      />

      <Card className="gap-0 p-0">
        {RECENT_SEARCHES.map((search, index) => (
          <SearchRow key={search.id} search={search} first={index === 0} />
        ))}
      </Card>
    </section>
  )
}

/**
 * The query is the row's identity, so it gets the weight; the filters sit under
 * it as chips because two searches with the same keywords and different
 * locations are different searches and nothing else would tell them apart.
 */
function SearchRow({
  search,
  first,
}: {
  search: RecentSearch
  first: boolean
}) {
  return (
    <Link
      to="/database"
      className={cn(
        "flex flex-col gap-2 p-4 transition-colors hover:bg-muted/50",
        !first && "border-t border-border"
      )}
    >
      <div className="flex items-start gap-2">
        <SearchIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 text-sm font-medium">
          {search.query}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {search.filters.map((filter) => (
          <Badge key={filter} variant="outline" className="font-normal">
            {filter}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="tabular-nums">{search.matches} matches</span>
        <span aria-hidden="true">&middot;</span>
        <span>{search.ranAgo}</span>
        {/* The only reason to re-run a saved search, so it is the only thing
            here that gets a colour. */}
        {search.newSince > 0 && (
          <Badge variant="success" className="font-normal">
            {search.newSince} new
          </Badge>
        )}
      </div>
    </Link>
  )
}

function RecentProjects() {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <SectionHead
        title="Recent projects"
        action={
          <Link
            to="/projects/new"
            className={cn(
              buttonVariants({ variant: "link", size: "sm" }),
              "px-0"
            )}
          >
            New project
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        }
      />

      <Card className="gap-0 p-0">
        {RECENT_PROJECTS.map((project, index) => (
          <ProjectRow key={project.id} project={project} first={index === 0} />
        ))}
      </Card>
    </section>
  )
}

/**
 * A project with channels but nobody contacted has stalled, and that is the
 * state worth spotting from a dashboard — so the row says so in words rather
 * than leaving a recruiter to infer it from two zeroes.
 */
function ProjectRow({
  project,
  first,
}: {
  project: RecentProject
  first: boolean
}) {
  const notStarted = project.channels.length === 0
  const stalled = !notStarted && project.contacted === 0

  return (
    <Link
      to="/projects/new"
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 p-4 transition-colors hover:bg-muted/50",
        !first && "border-t border-border"
      )}
    >
      <div className="flex min-w-0 flex-1 basis-64 flex-wrap items-center gap-2">
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
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="tabular-nums">{project.shortlisted} shortlisted</span>
        <span aria-hidden="true">&middot;</span>
        <span className={cn("tabular-nums", stalled && "text-warning")}>
          {project.contacted} contacted
        </span>
        <span aria-hidden="true">&middot;</span>
        <span className="whitespace-nowrap">{project.updatedAgo}</span>
      </div>
    </Link>
  )
}
