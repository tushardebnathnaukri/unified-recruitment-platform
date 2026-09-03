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
 * Measured, with the column widths below: nothing collides — the fixed action
 * column guarantees its own room — so what degrades is the title. At 1024 it
 * wraps to 2 lines and at 1280 it fits on one.
 *
 * Those numbers were 4 lines and 2 until the Expires column folded into the
 * facts row and handed its width back to the title, which makes 1024 a
 * conservative floor now rather than a tight one. Left where it is because it
 * has not been measured below 1024; re-measure before moving it.
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

/**
 * The row's title, and the row's link. The tier badge used to sit with it —
 * trailing it inline, then above it — until it earned a column of its own,
 * which is also what finally gives every title a common left edge to scan down.
 *
 * Titles wrap rather than truncate: the legacy page cuts location mid-word, and
 * a clipped title is unreadable.
 *
 * Every title reads the same regardless of status. The legacy page links
 * published titles and greys the rest, which hides the rule until you click;
 * here it is one link per row, whatever state the job is in.
 *
 * `after:inset-0` stretches the hit target over the whole row while the link
 * wraps only the title, so a screen reader's link list reads as a list of job
 * names rather than repeating each row's contents. Anything else interactive in
 * the row has to sit above this with `relative z-10`.
 */
function JobTitle({ job }: { job: Job }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="text-sm font-medium text-pretty after:absolute after:inset-0 after:content-['']"
    >
      {job.title}
    </Link>
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
    // `relative z-10` for the same reason as the overflow menu: this sits
    // inside the row's stretched link and has to stay clickable itself.
    <details className="group/reason relative z-10 mt-1 w-fit">
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
 * Every fact about a job that is not its title or applicant count. Shared by
 * both views so a job reads the same either way.
 *
 * Icon + label rather than bullet-joined text, from the reference design: the
 * facts stay legible as they wrap, and each one labels itself instead of
 * relying on position.
 *
 * Expiry gets its own line rather than joining the wrapping run above it. It
 * had a column of its own until this, and before that it ran fourth of four
 * inside that run, which is where it was genuinely buried. A line to itself is
 * the middle: no column to pay for, but the warning colour lands on its own
 * row instead of in a queue behind two facts nobody is scanning for.
 *
 * Created takes that line only when there is no expiry to take it. It drives no
 * decision, so it never competes with the date that does — but stripping it
 * would leave the under review, paused and rejected rows with no point in time
 * at all. One date per row, and it is expiry whenever there is one.
 */
function JobFacts({ job }: { job: Job }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <MetaFact icon={MapPinIcon}>{job.location}</MetaFact>
        <MetaFact icon={BriefcaseIcon}>
          {formatExperience(job.experience)}
        </MetaFact>
      </div>

      {job.daysToExpiry === null ? (
        <MetaFact icon={CalendarIcon} className="text-xs text-muted-foreground">
          Created {job.createdOn}
        </MetaFact>
      ) : (
        <JobExpiry job={job} />
      )}
    </div>
  )
}

/**
 * Expiry, and nothing else — `null` for the rows that have none. Lives inside
 * `JobFacts`, which owns the choice between this and the created date.
 *
 * The warning colour is the whole point: it is the only fact on the row that
 * changes what the recruiter should do today, so it is the only one allowed to
 * shout.
 */
function JobExpiry({ job }: { job: Job }) {
  if (job.daysToExpiry === null) return null

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
            {/* "Job type" rather than "Tier" or "Plan" — it is what the posting
                form calls this field, and one name per field beats a better
                name in one place. Sized to "Pro + Boost", the widest label. */}
            <TableHead className="w-32">Job type</TableHead>
            {/* Keeps a three-digit count and its "N new" badge on one line, so
                the column does not reflow row to row. */}
            <TableHead className="w-32">Applicants</TableHead>
            {/* Only the overflow trigger lives here now that the row itself
                carries the primary action. Sized to the header rather than to
                the button: "Actions" is 51px of text, and at the 64px this was
                it had 40px of content box, so the label overflowed 11px to the
                left — right-aligned text spills leftward — and bled into the
                applicants column. 80px fits the word with the cell's usual
                12px either side. */}
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id} className="relative cursor-pointer">
              <TableCell className="align-top">
                <div className="flex max-w-lg flex-col gap-1.5">
                  <JobTitle job={job} />
                  <JobFacts job={job} />
                  <NotPublishedReason job={job} />
                </div>
              </TableCell>

              <TableCell className="align-top">
                <Badge variant="outline">{JOB_TIER[job.tier].label}</Badge>
              </TableCell>

              <TableCell className="align-top">
                <ApplicantCount job={job} />
              </TableCell>

              <TableCell className="align-top">
                {/* `relative z-10` to sit above the title's stretched hit
                    target — without it the menu trigger navigates. */}
                <div className="relative z-10 flex items-center justify-end">
                  <JobOverflowMenu job={job} />
                </div>
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
        const hasStats =
          job.status === "published" || job.status === "unpublished"
        // The footer used to hang off the stats alone, so a rejected job — the
        // one row that always has something to do — got no action at all.
        const hasAction = primaryActionFor(job) !== null

        return (
          <li key={job.id}>
            <Card className="gap-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <Badge variant="outline">{JOB_TIER[job.tier].label}</Badge>

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
    <div className="flex w-full flex-col gap-4 px-4 lg:px-6">
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
              same call as the sidebar's other CTAs. */}
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
