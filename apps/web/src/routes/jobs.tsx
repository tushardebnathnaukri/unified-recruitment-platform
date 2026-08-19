import * as React from "react"
import type { LucideIcon } from "lucide-react"
import {
  BriefcaseIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  CopyIcon,
  EllipsisIcon,
  InfoIcon,
  LayoutListIcon,
  MapPinIcon,
  PauseIcon,
  PencilIcon,
  PlusIcon,
  Share2Icon,
  TableIcon,
} from "lucide-react"

import { Link } from "react-router"

import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query"
import { cn } from "@workspace/ui/lib/utils"
import {
  compareByAttention,
  EXPIRY_WARNING_DAYS,
  formatExperience,
  JOB_STATUS,
  primaryActionFor,
  JOB_TIER,
  JOBS,
  STATUS_FILTERS,
  type Job,
} from "@/lib/jobs"

/**
 * The width the tab bar needs. Below it the filter becomes a dropdown.
 *
 * Measured at 768: four tabs come to ~404px and the content column is ~472px
 * there, the sidebar being inline from that width up. Narrower than this the
 * sidebar is an off-canvas sheet, so the column is nearly the whole viewport
 * and the tabs keep fitting well below 768 — but that is phone territory, and
 * a dropdown is the better control there regardless of whether tabs would
 * squeeze in. So this is the sidebar's own breakpoint, deliberately.
 *
 * It has been wrong twice, both times by outliving its reason. It was 1024 to
 * clear the table's four columns, which was right until the table went; and it
 * was written for five tabs, which was right until "All jobs" went and took
 * ~140px with it. Re-measure it when the tab set changes.
 */
const TABS_FIT = "(min-width: 768px)"

/**
 * The width the table needs. Below it the card view is the only one on offer,
 * and the view switch is hidden rather than left pointing at something broken.
 *
 * A SEPARATE NUMBER FROM `TABS_FIT` ON PURPOSE. These were one constant once,
 * and folding two unrelated constraints into a single "is this a wide screen"
 * flag is what let the tab bar keep a threshold sized for the table long after
 * the tabs were the only thing left asking for room.
 *
 * Measured, with the column widths below: nothing collides at 1024, 1152 or
 * 1280 — the fixed action column guarantees its own room — so what degrades is
 * the title, which wraps to 4 lines at 1024, 3 at 1152 and 2 at 1280. This is
 * a legibility line, not a breakage one.
 */
const TABLE_FITS = "(min-width: 1024px)"

type ViewMode = "table" | "cards"

/**
 * `JOBS` is static, so the tab and menu counts are settled before first paint
 * rather than refiltered per render in both filter shapes.
 */
const STATUS_COUNTS = STATUS_FILTERS.map((filter) => ({
  ...filter,
  count: JOBS.filter((job) => job.status === filter.status).length,
}))

type StatusFilterProps = {
  value: string
  onValueChange: (value: string) => void
}

/** Wide layout: every status on show, and any of them one click away. */
function StatusTabs({ value, onValueChange }: StatusFilterProps) {
  return (
    <Tabs value={value} onValueChange={(next) => onValueChange(next as string)}>
      <TabsList>
        {STATUS_COUNTS.map((filter) => (
          <TabsTrigger key={filter.value} value={filter.value}>
            {filter.label}
            <span className="text-xs tabular-nums opacity-60">
              {filter.count}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

/**
 * Narrow layout. Laid out flat the five tabs either clip or become a horizontal
 * scroller, and a scroller hides the thing it holds: two of the five statuses
 * sit off-screen until you happen to swipe a row of controls that does not
 * look swipeable. A dropdown spends one control's width saying which filter is
 * on, and opens to all five at once.
 *
 * It also frees the row — the trigger and Post a job now share a line where the
 * tab bar took one of its own, which is a whole line of a sticky bar back on
 * the screen that can least afford it.
 */
function StatusSelect({ value, onValueChange }: StatusFilterProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next as string)}
    >
      {/* The trigger states the filter rather than labelling itself, so it
          needs the name a visible label would have given it. */}
      <SelectTrigger aria-label="Filter jobs by status">
        <SelectValue>
          {(selected) => {
            const filter = STATUS_COUNTS.find((f) => f.value === selected)
            if (!filter) return null

            return (
              <>
                {filter.label}
                <span className="text-xs tabular-nums opacity-60">
                  {filter.count}
                </span>
              </>
            )
          }}
        </SelectValue>
      </SelectTrigger>

      <SelectContent>
        {STATUS_COUNTS.map((filter) => (
          <SelectItem key={filter.value} value={filter.value}>
            {filter.label}
            <span className="text-xs tabular-nums opacity-60">
              {filter.count}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Title plus tier badge — the pair the eye lands on first in either view. */
function JobTitle({ job }: { job: Job }) {
  return (
    // Inline flow rather than a flex row. Real titles run long and often
    // restate the experience range, so the badge has to wrap along with the
    // text instead of being pinned to the far edge of the column. Titles wrap
    // rather than truncate — the legacy page cuts location mid-word, and a
    // clipped title is unreadable.
    //
    // Every title reads the same regardless of status. The legacy page links
    // published titles and greys the rest, which hides the rule until you
    // click. Linking waits on a job-detail route.
    <p className="text-sm font-medium text-pretty">
      {job.title}{" "}
      <Badge variant="outline" className="align-middle">
        {JOB_TIER[job.tier].label}
      </Badge>
    </p>
  )
}

/**
 * Rejection reasons are per-job, so unlike the review notice they cannot be
 * collapsed into one banner. Kept shut by default: the reason only matters on
 * the row it belongs to, and an open paragraph on every such row is exactly the
 * bloat this redesign removed.
 */
function NotPublishedReason({ job }: { job: Job }) {
  if (job.status !== "not-published" || !job.notPublishedReason) return null

  return (
    <details className="group/reason mt-1">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ChevronRightIcon className="size-3 transition-transform group-open/reason:rotate-90" />
        What needs changing?
      </summary>
      {/* No max-width: under `table-fixed` a paragraph wider than its cell
          overflows the column instead of wrapping inside it. */}
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {job.notPublishedReason}
      </p>
    </details>
  )
}

/** One icon + label fact. Each is self-labelling, so the row can wrap freely. */
function MetaFact({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
      {children}
    </span>
  )
}

/**
 * Every fact about a job that is not its title, status or applicant count, as
 * one wrapping row. Shared by both views so a job reads the same either way.
 *
 * Icon + label rather than bullet-joined text, from the reference design: the
 * facts stay legible as they wrap, and each one labels itself instead of
 * relying on position. Created is context rather than a decision input, so it
 * sits here rather than earning a column; expiry sits beside it because that is
 * the date worth acting on.
 */
function JobFacts({ job }: { job: Job }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <MetaFact icon={MapPinIcon}>{job.location}</MetaFact>
      <MetaFact icon={BriefcaseIcon}>
        {formatExperience(job.experience)}
      </MetaFact>
    </div>
  )
}

/**
 * The one date the row carries, sat next to status rather than in the facts
 * row. Expiry is the only genuinely time-critical fact here and it used to run
 * fourth of four, behind location, experience and a created date that drives no
 * decision at all — the most urgent thing on the row in the position hardest to
 * see. It answers the same question status does, so it sits with it.
 *
 * One date, not two: expiry while there is one, created otherwise. That keeps
 * the rows with no expiry (under review, paused, rejected) anchored in time
 * instead of stripping their date, and it keeps every row the same shape —
 * badge, then one line — rather than some carrying twice as much as others.
 */
function JobDate({ job }: { job: Job }) {
  if (job.daysToExpiry === null) {
    return (
      <MetaFact icon={CalendarIcon} className="text-xs text-muted-foreground">
        Created {job.createdOn}
      </MetaFact>
    )
  }

  const expiring = job.daysToExpiry <= EXPIRY_WARNING_DAYS

  return (
    <MetaFact
      icon={ClockIcon}
      className={cn(
        "text-xs text-muted-foreground",
        expiring && "font-medium text-warning"
      )}
    >
      Expires in {job.daysToExpiry} days
    </MetaFact>
  )
}

/**
 * Applicants replaces the legacy "Engagement" column, which read "N/A" on most
 * rows and counted views on the rest. Applications are what the recruiter opens
 * this page to check.
 *
 * Weighted up from body text, following the reference card: the number is what
 * a recruiter scans this column for, so it should not read at the same size as
 * the location beside it. The unreviewed count is a badge rather than grey
 * caption text because it is the part that asks for action.
 */
function ApplicantCount({ job }: { job: Job }) {
  if (job.status === "under-review" || job.status === "not-published") {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-base leading-none font-semibold tabular-nums">
        {job.applicants}
      </span>
      {job.unreviewed > 0 && (
        <Badge variant="success" className="px-1.5">
          {job.unreviewed} new
        </Badge>
      )}
    </span>
  )
}

/**
 * The row's next step, whatever that is for this status — see
 * `primaryActionFor` for why each row gets one and why under review gets none.
 *
 * It used to be a single button for a single case, and it used to carry the
 * count too ("View candidates · 148"), copied from a reference card that has no
 * applicants column. This page does, so the number was printed twice on one
 * row, a column apart in the table and a card's width apart in cards. The
 * column keeps it: aligned down an edge it can be compared row to row, which is
 * the whole reason it earns a column, whereas inside a button it can only be
 * read one row at a time.
 */
function JobPrimaryAction({
  job,
  variant = "outline",
}: {
  job: Job
  variant?: "outline" | "default"
}) {
  const label = primaryActionFor(job)
  if (!label) return null

  return (
    <Button variant={variant} size="sm">
      {label}
      {/* Without this the buttons are a run of identical "View candidates" and
          "Set live" entries in a screen reader's button list — same fix the
          overflow menu already carries. The leading space is load-bearing: name
          computation joins the two text runs, so without it the name reads
          "View candidatesfor …". */}
      <span className="sr-only">{` for ${job.title}`}</span>
    </Button>
  )
}

/**
 * Overflow menu. Sharing and reposting are real but rare, so they sit here
 * where they cost no scanning — rather than as six bare icons per row.
 */
function JobOverflowMenu({ job }: { job: Job }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <EllipsisIcon />
            <span className="sr-only">More actions for {job.title}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <PencilIcon />
          Edit job
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CopyIcon />
          Duplicate
        </DropdownMenuItem>
        {job.status === "published" && (
          <DropdownMenuItem>
            <Share2Icon />
            Share
          </DropdownMenuItem>
        )}
        {job.status === "published" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <PauseIcon />
              Pause
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Table rows keep the action and the menu together in one right-aligned cell. */
function JobActions({ job }: { job: Job }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <JobPrimaryAction job={job} />
      <JobOverflowMenu job={job} />
    </div>
  )
}

function JobsTable({ jobs }: { jobs: Job[] }) {
  return (
    <div className="rounded-lg border border-border">
      {/* `table-fixed` so the column widths below are honoured exactly. Under
          auto layout the browser weighs each column's max-content width, and a
          long title or an expanded rejection reason drags the job column wide
          enough to push the actions off the edge. */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {/* The job cell holds the only unbounded content, so it takes the
                remainder and the other three are fixed. This was the other way
                round once — job at 44%, actions on the leftovers — which
                quietly made the actions column a function of the window,
                `0.56 × width − 272px`: 76px at 1024, not enough for a button,
                so the action overlapped the applicant count instead of the
                column simply being narrow. Fixed widths turn that hard failure
                into a soft one — below the breakpoint the title wraps more, and
                nothing lands on top of anything else. */}
            <TableHead>Job</TableHead>
            {/* Fits "Expires in 21 days" on one line under the badge; wrapping
                the date would make every row taller. */}
            <TableHead className="w-40">Status</TableHead>
            {/* Keeps a three-digit count and its "N new" badge on one line, so
                the column does not reflow row to row. */}
            <TableHead className="w-32">Applicants</TableHead>
            {/* Sized to the longest action, "Edit and resubmit", plus the
                overflow trigger. */}
            <TableHead className="w-48 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="align-top">
                <div className="flex max-w-lg flex-col gap-1.5">
                  <JobTitle job={job} />
                  <JobFacts job={job} />
                  <NotPublishedReason job={job} />
                </div>
              </TableCell>

              <TableCell className="align-top">
                <div className="flex flex-col items-start gap-1.5">
                  <Badge variant={JOB_STATUS[job.status].variant}>
                    {JOB_STATUS[job.status].label}
                  </Badge>
                  <JobDate job={job} />
                </div>
              </TableCell>

              <TableCell className="align-top">
                <ApplicantCount job={job} />
              </TableCell>

              <TableCell className="align-top">
                <JobActions job={job} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * A counted stat, sized to be read at a glance. The reference card makes its
 * numbers the loudest thing after the title — a recruiter scanning for "which
 * job needs me" is looking for a number, not a label.
 */
function StatTile({
  value,
  label,
  badge,
  className,
}: {
  value: string
  label: string
  badge?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border px-3 py-2",
        className
      )}
    >
      <span className="flex items-center gap-1.5">
        <span className="text-lg leading-none font-semibold tabular-nums">
          {value}
        </span>
        {badge && (
          <Badge variant="success" className="px-1.5">
            {badge}
          </Badge>
        )}
      </span>
      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

/**
 * Card view, restructured against the reference design. Three things came from
 * it and are worth naming:
 *
 * 1. Status and tier sit ABOVE the title, not beside it. The title then owns a
 *    full line at a larger size and can never collide with a badge — the exact
 *    problem that forced the table's title to wrap inline.
 * 2. Metadata is icon + label pairs rather than bullet-joined text, so facts
 *    stay legible as they wrap and each one labels itself.
 * 3. The count moves into the CTA and a stat tile, so the number is the thing
 *    you see rather than a cell reading "—" on half the cards.
 */
function JobsCards({ jobs }: { jobs: Job[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {jobs.map((job) => {
        const status = JOB_STATUS[job.status]
        const hasStats =
          job.status === "published" || job.status === "unpublished"
        // The footer used to hang off the stats alone, so a rejected job — the
        // one row that always has something to do — got no action at all.
        const hasAction = primaryActionFor(job) !== null

        return (
          <li key={job.id}>
            <Card className="gap-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <Badge variant="outline">{JOB_TIER[job.tier].label}</Badge>
                  <JobDate job={job} />
                </div>

                <JobOverflowMenu job={job} />
              </div>

              <p className="mt-1 text-base font-semibold text-pretty">
                {job.title}
              </p>

              <div className="mt-2">
                <JobFacts job={job} />
              </div>

              <NotPublishedReason job={job} />

              {(hasStats || hasAction) && (
                // `justify-end` plus `mr-auto` rather than `justify-between`:
                // the action has to stay pinned right on the cards that carry
                // no stat tile to hold the other end.
                <div className="mt-3 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-3">
                  {hasStats && (
                    <StatTile
                      className="mr-auto"
                      value={String(job.applicants)}
                      label="Applicants"
                      badge={
                        job.unreviewed > 0 ? `${job.unreviewed} new` : undefined
                      }
                    />
                  )}

                  <JobPrimaryAction job={job} variant="default" />
                </div>
              )}
            </Card>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Recruiter job list. Search and sort are still out of scope; this pass adds
 * the status filter (the legacy dropdown, re-cut as tabs) and a table/card
 * view switch.
 */
export function JobsPage() {
  // The landing tab is whichever status leads `STATUS_FILTERS`, so the order
  // there decides it rather than a second copy of the answer drifting here.
  const [statusFilter, setStatusFilter] = React.useState(
    STATUS_FILTERS[0].value
  )
  const [chosenView, setChosenView] = React.useState<ViewMode>("table")
  const tabsFit = useMediaQuery(TABS_FIT)
  const tableFits = useMediaQuery(TABLE_FITS)

  // The choice is overridden rather than seeded. Seeding it would let someone
  // pick the table on a wide window, narrow it, and be stranded in a view the
  // width cannot hold, with the switch that would rescue them now hidden.
  // Overriding means a narrow window always resolves to cards and a wide one
  // hands the recruiter their preference back untouched.
  const view: ViewMode = tableFits ? chosenView : "cards"

  const active = STATUS_FILTERS.find((f) => f.value === statusFilter)
  // There is no unfiltered branch any more: every tab names a status.
  const listed = JOBS.filter((job) => job.status === active?.status)
  // Copied because `sort` mutates and `JOBS` is module state shared with every
  // other consumer.
  const jobs = [...listed].sort(compareByAttention)

  // Whether the ranking actually moved anything. Inside a single status it
  // often does not — the two under-review jobs tie on every term and come out
  // in source order — and a caption claiming an order the list is not in is
  // worse than no caption at all.
  const reordered = jobs.some((job, i) => listed[i] !== job)

  return (
    // One measure for the whole page, not just the list: the tabs, the notice
    // and both views share it, so switching table/cards never changes how wide
    // the page is. Capped because a card stretched across a 1600px window puts
    // its status badge and its actions a screen apart — but left-aligned rather
    // than centred, so the content stays anchored to the sidebar.
    <div className="flex w-full max-w-6xl flex-col gap-4 px-4 lg:px-6">
      {/* Sticky so the filter and the view switch stay reachable down a long
          list. The negative margins cancel the page gutters, so the background
          spans the full content column and rows scroll under it rather than
          through the padding on either side. `top-0` because SiteHeader is not
          itself sticky — this bar takes over the top edge once it scrolls off. */}
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-4 py-3 lg:-mx-6 lg:px-6">
        {tabsFit ? (
          <StatusTabs value={statusFilter} onValueChange={setStatusFilter} />
        ) : (
          <StatusSelect value={statusFilter} onValueChange={setStatusFilter} />
        )}

        <div className="flex items-center gap-2">
          <ToggleGroup
            spacing={0}
            variant="outline"
            size="sm"
            className="hidden lg:flex"
            value={[view]}
            onValueChange={(value) => {
              // Base UI allows deselecting the pressed item, which would leave
              // the page with no view at all — ignore the empty case.
              if (value.length > 0) setChosenView(value[0] as ViewMode)
            }}
          >
            <ToggleGroupItem value="table">
              <TableIcon />
              <span className="sr-only">Table view</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="cards">
              <LayoutListIcon />
              <span className="sr-only">Card view</span>
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Navigates, so it stays a link wearing the button's styling —
              same call as the Overview CTA. */}
          <Link to="/post-job" className={buttonVariants()}>
            <PlusIcon data-icon="inline-start" />
            Post a job
          </Link>
        </div>
      </div>

      {/* The legacy page repeats this paragraph inside every under-review row.
          Said once, above the list, it costs one line instead of four rows.

          Scoped to the Under review tab now that there is no combined list. It
          explains rows the recruiter is looking at, and on any other tab there
          are none — it would be answering a question nothing on screen asks. */}
      {statusFilter === "under-review" && jobs.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Jobs under review usually go live within a few hours. We will email
            you when they do and applications start arriving.
          </p>
        </div>
      )}

      {/* Reordering the list silently would read as an arbitrary shuffle, so
          the rule gets stated. TODO(design): this becomes the label of a real
          sort control once sorting is in scope — until then it is a caption,
          not a disabled affordance pretending to be one. */}
      {reordered && (
        <p className="text-xs text-muted-foreground">
          Sorted by what needs you first — unread applicants, then jobs that are
          blocked or expiring.
        </p>
      )}

      {jobs.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {/* Was "No {label} jobs", which the status rename turns into "No
                needs changes jobs" — the labels are no longer all adjectives. */}
            No jobs match this filter.
          </p>
        </div>
      ) : view === "table" ? (
        <JobsTable jobs={jobs} />
      ) : (
        <JobsCards jobs={jobs} />
      )}
    </div>
  )
}
