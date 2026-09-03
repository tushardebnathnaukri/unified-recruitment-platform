import * as React from "react"
import { Link, useParams } from "react-router"
import {
  ArrowRightIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ClipboardCheckIcon,
  ClockIcon,
  DownloadIcon,
  EllipsisIcon,
  MapPinIcon,
  PencilIcon,
  SearchIcon,
  SendIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  StarIcon,
  TagIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query"
import { cn } from "@workspace/ui/lib/utils"
import { CandidateFilters } from "@/components/candidate-filters"
import { CandidateRow } from "@/components/candidate-row"
import {
  activeChips,
  CANDIDATES,
  compareBy,
  countFilters,
  defaultSortFor,
  facetCounts,
  facetsForStage,
  matchesFilters,
  matchesSearch,
  nextStage,
  NO_FILTERS,
  PIPELINE,
  sortsForStage,
  stageLabel,
  TERMINAL,
  type Candidate,
  type Filters,
  type Sort,
  type Stage,
} from "@/lib/candidates"
import {
  EXPIRY_WARNING_DAYS,
  formatExperience,
  JOB_TIER,
  JOBS,
} from "@/lib/jobs"

/**
 * The width the seven stages need as a tab bar. Below it they collapse into a
 * dropdown, the same trade the jobs list makes with its status filter: a
 * horizontal scroller hides the thing it holds, and Offered and Hired are
 * exactly the stages that would end up off-screen.
 *
 * Measured with the counts on: the five pipeline tabs come to ~470px, the
 * separator and the two terminal buttons another ~200, and the content column
 * is ~700px at 1024 with the sidebar inline.
 */
const TABS_FIT = "(min-width: 1100px)"

/**
 * The width the rail needs beside the list. A SEPARATE NUMBER FROM `TABS_FIT`
 * on purpose — same lesson the jobs page learned when one "is this wide?" flag
 * was doing two unrelated jobs. Below this the rail moves into a sheet behind a
 * Filters button; the list needs about 560px before its action row starts
 * wrapping, and the rail takes 256 plus a 24 gutter.
 */
const RAIL_FITS = "(min-width: 960px)"

/**
 * The height of the sticky pipeline bar, which the rail sticks underneath.
 *
 * A CSS variable rather than a number in two places, for the same reason
 * `AppShell` sets `--sidebar-width` and `--header-height` on the provider: the
 * bar and the rail have to read the same figure or the rail slides under it.
 *
 * MEASURED, and the bar is pinned to it rather than merely starting there —
 * drift between the two is invisible until you scroll, and clipping is not.
 * 12px padding + a 36px control + 12px padding + the two `border-y` hairlines
 * comes to 62. The row does not wrap at any width where the rail is inline:
 * at 1100, the tightest, its contents want 678px of the 756px available.
 *
 * Re-measure it if a stage is added, if the terminal buttons change, or if the
 * controls stop being `h-9` — 78px of slack is four characters of tab label.
 */
const PIPELINE_HEIGHT = "62px"

/**
 * A job's applicants, as a pipeline.
 *
 * The three structural moves against the live page, all visible from here:
 *
 * 1. Stages, not flags. Shortlisted / Rejected / Saved were three checkboxes on
 *    one list and the product ended at the shortlist. `PIPELINE` is ordered, a
 *    row's primary action is the next stage along, and Rejected and Saved sit
 *    past a separator because neither is on the path.
 * 2. A filter rail, whose facets change with the stage — see `facetsForStage`.
 * 3. Filters apply live, and every applied one is a removable chip over the
 *    list, so the distance between "9 shown" and the stage count always has a
 *    stated reason. There is no Apply button: with the counts on the rail
 *    already telling you what a tick is worth, a second click to commit it buys
 *    nothing.
 */
export function JobCandidatesPage() {
  const { id } = useParams()
  const job = JOBS.find((entry) => entry.id === id)

  const [stage, setStage] = React.useState<Stage>("applied")
  const [filters, setFilters] = React.useState<Filters>(NO_FILTERS)
  const [sort, setSort] = React.useState<Sort>(defaultSortFor("applied"))
  const [search, setSearch] = React.useState("")
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(new Set())
  const [railOpen, setRailOpen] = React.useState(false)

  /**
   * Where the recruiter has moved people, over the top of the roster. Held as
   * `to` and `from` so a rejection can be undone back to wherever it came from
   * rather than always landing in Applied.
   *
   * This is what makes the pipeline demonstrable rather than decorative: the
   * tab counts, the rail counts and the list all read from the same derived
   * roster, so shortlisting a row moves it and every number follows.
   */
  const [moves, setMoves] = React.useState<
    Record<string, { to: Stage; from: Stage }>
  >({})

  const tabsFit = useMediaQuery(TABS_FIT)
  const railFits = useMediaQuery(RAIL_FITS)

  // No manual memoization anywhere in here: the React Compiler is on for this
  // app, and hand-written `useMemo` around these derivations makes it bail out
  // rather than help. The whole roster is twenty-eight rows.
  const roster: Candidate[] = CANDIDATES.map((candidate) =>
    moves[candidate.id]
      ? { ...candidate, stage: moves[candidate.id].to }
      : candidate
  )

  const move = (ids: readonly string[], to: Stage) => {
    setMoves((current) => {
      const next = { ...current }
      for (const id of ids) {
        const candidate = CANDIDATES.find((entry) => entry.id === id)
        if (!candidate) continue
        next[id] = { to, from: current[id]?.to ?? candidate.stage }
      }
      return next
    })
    setSelected(new Set())
  }

  const stageCounts: Partial<Record<Stage, number>> = {}
  for (const candidate of roster)
    stageCounts[candidate.stage] = (stageCounts[candidate.stage] ?? 0) + 1

  const facets = facetsForStage(stage)

  // Search first, then facets: the rail's counts have to be counts of what the
  // search already narrowed to, or a filter promises rows the query has removed.
  const searched = roster.filter(
    (candidate) => candidate.stage === stage && matchesSearch(candidate, search)
  )
  const counts = facetCounts(searched, facets, filters)
  const listed = searched
    .filter((candidate) => matchesFilters(candidate, facets, filters))
    .sort(compareBy(sort))

  const chips = activeChips(facets, filters)
  const filterCount = countFilters(facets, filters)

  // Selection is scoped to what is on screen. A row that filters away, or that
  // a bulk move pushed into another stage, drops out of the bar on its own —
  // there is no way to act on a candidate you cannot currently see.
  const selectedIds = listed
    .filter((candidate) => selected.has(candidate.id))
    .map((candidate) => candidate.id)

  /**
   * Switching stage resets the rail, the sort and the selection.
   *
   * All three for the same reason: they are answers to the previous stage's
   * question. The facets are literally different objects, the default sort
   * changes (Interviewing leads with the calendar), and a selection carried
   * across would let a bulk action move rows that are no longer listed.
   */
  const changeStage = (next: Stage) => {
    setStage(next)
    setFilters(NO_FILTERS)
    setSort(defaultSortFor(next))
    setSelected(new Set())
    setRailOpen(false)
  }

  const toggleFacet = (facetId: string, value: string) =>
    setFilters((current) => {
      const chosen = current.facets[facetId] ?? []
      return {
        ...current,
        facets: {
          ...current.facets,
          [facetId]: chosen.includes(value)
            ? chosen.filter((entry) => entry !== value)
            : [...chosen, value],
        },
      }
    })

  const removeChip = (facetId: string, value: string) => {
    if (facetId === "experience") {
      setFilters((current) => ({ ...current, minYears: "", maxYears: "" }))
      return
    }
    toggleFacet(facetId, value)
  }

  const rail = (hideRailHeader: boolean) => (
    <CandidateFilters
      // Keyed on the stage so the open sections come from the new facets'
      // defaults rather than from sections that no longer exist.
      key={stage}
      facets={facets}
      filters={filters}
      counts={counts}
      onToggle={toggleFacet}
      onExperienceChange={(which, value) =>
        setFilters((current) => ({ ...current, [which]: value }))
      }
      onReset={() => setFilters(NO_FILTERS)}
      activeCount={filterCount}
      hideHeader={hideRailHeader}
    />
  )

  if (!job) {
    return (
      <div className="flex w-full flex-col gap-3 px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Job not found</h2>
        <p className="text-sm text-muted-foreground">
          Nothing on this account matches job {id}.
        </p>
        <Link
          to="/jobs"
          className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
        >
          Back to jobs
        </Link>
      </div>
    )
  }

  const expiring =
    job.daysToExpiry !== null && job.daysToExpiry <= EXPIRY_WARNING_DAYS

  return (
    <div
      className="flex w-full flex-col gap-4"
      style={{ "--pipeline-height": PIPELINE_HEIGHT } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link
            to="/jobs"
            className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeftIcon className="size-3.5" />
            All jobs
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-pretty">{job.title}</h2>
            <Badge variant="outline">{JOB_TIER[job.tier].label}</Badge>
          </div>

          {/* No applicant count here on purpose. `Job.applicants` and the
              roster behind the tabs are two different numbers for the same
              thing, and the tabs are the ones a recruiter can act on. */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <JobFact icon={MapPinIcon}>{job.location}</JobFact>
            <JobFact icon={BriefcaseIcon}>
              {formatExperience(job.experience)}
            </JobFact>
            {job.daysToExpiry === null ? (
              <JobFact icon={CalendarIcon}>Created {job.createdOn}</JobFact>
            ) : (
              <JobFact
                icon={ClockIcon}
                className={cn(expiring && "font-medium text-warning")}
              >
                Expires in {job.daysToExpiry} days
              </JobFact>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* The legacy header scatters a calendar link picker, an assessment
              picker and an auto-scheduler toggle across the top of the list.
              They are job settings, not list controls, so they go behind one
              door and give the row back to the pipeline. */}
          <Button variant="outline" size="sm">
            <Settings2Icon data-icon="inline-start" />
            Job settings
          </Button>
          <Button variant="outline" size="sm">
            <PencilIcon data-icon="inline-start" />
            Edit job
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm">
                  <EllipsisIcon />
                  <span className="sr-only">More actions for this job</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <DownloadIcon />
                Export applicants
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sticky so the pipeline stays reachable down a long list. Negative
          gutters so the border spans the content column rather than stopping
          inside the page padding — same trick as the jobs page's filter bar. */}
      <div className="sticky top-0 z-10 flex h-(--pipeline-height) items-center border-y border-border bg-background px-4 lg:px-6">
        {tabsFit ? (
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              value={stage}
              onValueChange={(next) => changeStage(next as Stage)}
            >
              <TabsList>
                {PIPELINE.map((entry) => (
                  <TabsTrigger key={entry.value} value={entry.value}>
                    {entry.label}
                    <span className="text-xs tabular-nums opacity-60">
                      {stageCounts[entry.value] ?? 0}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Separator
              orientation="vertical"
              className="h-4 data-vertical:self-auto"
            />

            {/* Buttons, not tabs. Rejected and Saved are not steps on the way
                anywhere, and giving them tab affordances inside the same list
                is what made the legacy strip read as four equal filters. */}
            {TERMINAL.map((entry) => (
              <Button
                key={entry.value}
                variant={stage === entry.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => changeStage(entry.value)}
              >
                {entry.label}
                <span className="text-xs tabular-nums opacity-60">
                  {stageCounts[entry.value] ?? 0}
                </span>
              </Button>
            ))}
          </div>
        ) : (
          <Select
            value={stage}
            onValueChange={(next) => changeStage(next as Stage)}
          >
            <SelectTrigger aria-label="Pipeline stage">
              <SelectValue>
                {(value) => (
                  <>
                    {stageLabel(value as Stage)}
                    <span className="text-xs tabular-nums opacity-60">
                      {stageCounts[value as Stage] ?? 0}
                    </span>
                  </>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[...PIPELINE, ...TERMINAL].map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>
                  {entry.label}
                  <span className="text-xs tabular-nums opacity-60">
                    {stageCounts[entry.value] ?? 0}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-start gap-6 px-4 lg:px-6">
        {/* Sticks under the pipeline bar, and scrolls itself rather than with
            the page: the rail is taller than the gap it sits in on a laptop
            (894px of facets against 838px of room at 900px tall), and a sticky
            element taller than its viewport parks its own last sections
            permanently out of reach. The page keeps its own scrollbar. */}
        {railFits && (
          <aside className="sticky top-(--pipeline-height) max-h-[calc(100svh-var(--pipeline-height))] w-64 shrink-0 overflow-y-auto pb-6">
            {rail(false)}
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="relative min-w-56 flex-1 sm:max-w-sm">
              <SearchIcon className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, skill or company"
                aria-label="Search candidates"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </span>

            {!railFits && (
              <Sheet open={railOpen} onOpenChange={setRailOpen}>
                <SheetTrigger
                  render={
                    <Button variant="outline">
                      <SlidersHorizontalIcon data-icon="inline-start" />
                      Filters
                      {filterCount > 0 && (
                        <Badge variant="secondary" className="px-1.5">
                          {filterCount}
                        </Badge>
                      )}
                    </Button>
                  }
                />
                <SheetContent side="left" className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>
                      Narrowing {stageLabel(stage)}.
                    </SheetDescription>
                    {filterCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 w-fit"
                        onClick={() => setFilters(NO_FILTERS)}
                      >
                        Reset all {filterCount}
                      </Button>
                    )}
                  </SheetHeader>
                  {/* The sheet already titles itself, so the rail drops its
                      own header rather than saying "Filters" twice. */}
                  <div className="px-4 pb-6">{rail(true)}</div>
                </SheetContent>
              </Sheet>
            )}

            <Select
              value={sort}
              onValueChange={(next) => setSort(next as Sort)}
            >
              <SelectTrigger className="ml-auto w-fit" aria-label="Sort by">
                <SelectValue>
                  {(value) =>
                    sortsForStage(stage).find((entry) => entry.value === value)
                      ?.label
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {sortsForStage(stage).map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ResultLine
            listed={listed}
            total={stageCounts[stage] ?? 0}
            stage={stage}
            chips={chips}
            allSelected={
              listed.length > 0 && selectedIds.length === listed.length
            }
            onSelectAll={(checked) =>
              setSelected(
                checked
                  ? new Set(listed.map((candidate) => candidate.id))
                  : new Set()
              )
            }
            onRemoveChip={removeChip}
            onClear={() => setFilters(NO_FILTERS)}
          />

          {selectedIds.length > 0 && (
            <BulkBar
              stage={stage}
              count={selectedIds.length}
              onMove={(to) => move(selectedIds, to)}
              onClear={() => setSelected(new Set())}
            />
          )}

          {listed.length === 0 ? (
            <EmptyState
              stage={stage}
              filtered={filterCount > 0 || search.trim() !== ""}
              onReset={() => {
                setFilters(NO_FILTERS)
                setSearch("")
              }}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {listed.map((candidate) => (
                <li key={candidate.id}>
                  <CandidateRow
                    candidate={candidate}
                    selected={selected.has(candidate.id)}
                    onSelectedChange={(checked) =>
                      setSelected((current) => {
                        const next = new Set(current)
                        if (checked) next.add(candidate.id)
                        else next.delete(candidate.id)
                        return next
                      })
                    }
                    onMove={(to) => move([candidate.id], to)}
                    onUndo={() =>
                      move(
                        [candidate.id],
                        moves[candidate.id]?.from ?? "applied"
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function JobFact({
  icon: Icon,
  children,
  className,
}: {
  icon: typeof MapPinIcon
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
 * How many rows, out of how many, and why. The count is the only place the gap
 * between the tab and the list is explained, so the chips live on the same line
 * as the number rather than in a row of their own.
 */
function ResultLine({
  listed,
  total,
  stage,
  chips,
  allSelected,
  onSelectAll,
  onRemoveChip,
  onClear,
}: {
  listed: Candidate[]
  total: number
  stage: Stage
  chips: ReturnType<typeof activeChips>
  allSelected: boolean
  onSelectAll: (checked: boolean) => void
  onRemoveChip: (facetId: string, value: string) => void
  onClear: () => void
}) {
  const narrowed = listed.length !== total

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Checkbox
        checked={allSelected}
        onCheckedChange={onSelectAll}
        aria-label={`Select all ${listed.length} candidates`}
      />

      <span className="text-sm">
        <span className="font-semibold tabular-nums">{listed.length}</span>
        {narrowed && (
          <span className="text-muted-foreground"> of {total}</span>
        )}{" "}
        <span className="text-muted-foreground">in {stageLabel(stage)}</span>
      </span>

      {chips.length > 0 && (
        <>
          <Separator
            orientation="vertical"
            className="h-4 data-vertical:self-auto"
          />
          {chips.map((chip) => (
            <Badge
              key={chip.key}
              variant="outline"
              render={
                <button
                  type="button"
                  onClick={() => onRemoveChip(chip.facetId, chip.value)}
                />
              }
            >
              {chip.label}
              <XIcon className="opacity-60" />
              <span className="sr-only">— remove this filter</span>
            </Badge>
          ))}
          <Button variant="link" size="xs" className="px-0" onClick={onClear}>
            Clear
          </Button>
        </>
      )}
    </div>
  )
}

/**
 * Bulk actions, which appear only once something is selected.
 *
 * The lead action is the pipeline move, so bulk shortlisting is the easy thing
 * and bulk rejection sits at the far end of the bar. The legacy page selects by
 * page range — "1 – 100", a database offset wearing a checkbox — which makes
 * rejecting a hundred people you have never looked at a two-click operation.
 * Here selection can only come from rows that are on screen.
 */
function BulkBar({
  stage,
  count,
  onMove,
  onClear,
}: {
  stage: Stage
  count: number
  onMove: (stage: Stage) => void
  onClear: () => void
}) {
  const advance = nextStage(stage)

  return (
    <Card size="sm" className="gap-0 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium tabular-nums">
          {count} selected
        </span>
        <Button variant="link" size="xs" className="px-0" onClick={onClear}>
          Clear
        </Button>

        <Separator
          orientation="vertical"
          className="mx-1 h-4 data-vertical:self-auto"
        />

        {advance && (
          <Button size="sm" onClick={() => onMove(advance)}>
            Move to {stageLabel(advance)}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        )}
        <Button variant="outline" size="sm">
          <SendIcon data-icon="inline-start" />
          Send message
        </Button>
        <Button variant="outline" size="sm">
          <ClipboardCheckIcon data-icon="inline-start" />
          Send assessment
        </Button>

        {/* Save, Tag and Download are real but rare, and seven buttons wrap the
            bar onto a second line at every width the rail leaves room for.
            Behind a menu the bar holds one line and the two ends of it — the
            advance and the rejection — stay where the eye expects them. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="icon-sm">
                <EllipsisIcon />
                <span className="sr-only">More bulk actions</span>
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onMove("saved")}>
              <StarIcon />
              Save for later
            </DropdownMenuItem>
            <DropdownMenuItem>
              <TagIcon />
              Add tag
            </DropdownMenuItem>
            <DropdownMenuItem>
              <DownloadIcon />
              Download resumes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="destructive"
          size="sm"
          className="ml-auto"
          onClick={() => onMove("rejected")}
        >
          <XIcon data-icon="inline-start" />
          Reject
        </Button>
      </div>
    </Card>
  )
}

/**
 * Two different empty states, because they are two different problems. An empty
 * stage is the pipeline telling you where the work is; an empty filtered list
 * is a dead end that needs a way out of itself.
 */
function EmptyState({
  stage,
  filtered,
  onReset,
}: {
  stage: Stage
  filtered: boolean
  onReset: () => void
}) {
  return (
    <Card className="items-center gap-2 px-6 py-12 text-center">
      <p className="text-sm font-medium">
        {filtered
          ? "No candidates match these filters"
          : `Nobody is in ${stageLabel(stage).toLowerCase()} yet`}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {filtered
          ? "Loosen a filter or clear the search to see the rest of this stage."
          : "Candidates arrive here as you move them along the pipeline."}
      </p>
      {filtered && (
        <Button variant="outline" size="sm" className="mt-1" onClick={onReset}>
          Clear filters and search
        </Button>
      )}
    </Card>
  )
}
