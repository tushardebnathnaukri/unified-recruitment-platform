import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { useSearchParams } from "react-router"
import {
  CalendarPlusIcon,
  ChevronDownIcon,
  DownloadIcon,
  EllipsisIcon,
  EyeIcon,
  LayoutListIcon,
  MailIcon,
  MinusIcon,
  PanelsTopLeftIcon,
  PhoneIcon,
  SearchIcon,
  Table2Icon,
  ThumbsUpIcon,
  Trash2Icon,
  TrophyIcon,
  UserRoundIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Input } from "@workspace/ui/components/input"
import { Item } from "@workspace/ui/components/item"
import { Label } from "@workspace/ui/components/label"
import { useCardVariant } from "@/components/card-variant-provider"
import {
  ApplicantAvatar,
  ApplicantStatusBadge,
  DecisionGroup,
} from "@/components/applicant-controls"
import { CandidateCv } from "@/components/candidate-cv"
import { CandidatePanel } from "@/components/candidate-panel"
import { CandidateDetail } from "@/components/candidate-detail"
import { useDecisions } from "@/components/decisions-provider"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import { Separator } from "@workspace/ui/components/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { useSidebar } from "@workspace/ui/components/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import {
  EXPERIENCE_BANDS,
  isNew,
  matchesFilters,
  NOTICE_BANDS,
  sortApplicants,
  SORTS,
  type Filters,
  type Position,
  type Applicant,
  type ApplicantStatus,
  type ResponseBucket,
} from "@/lib/applicants"
import {
  ListSourceContext,
  useListCopy,
  type ListSource,
} from "@/lib/list-source"
import type { Verdict } from "@/lib/criteria"
import { ApplicantListSkeleton } from "@/components/skeletons"
import { usePageLoading } from "@/lib/use-page-loading"

/** How many cards a page of responses is. */
const PAGE_SIZE = 20

/**
 * Cards or a table, over the same people in the same order.
 *
 * They are not three designs of one thing, they are three densities, and each
 * answers a different question. Cards are for scanning: four lines a person,
 * enough to triage and no more. The table is for comparing: one line a person
 * with every number in a column, which is the only way to answer "who here is
 * on a short notice period" across a hundred and forty-eight rows. Split is for
 * reading: a thin list beside a whole profile, for when the list is down to the
 * ten people worth an hour. None of them wins.
 */
type View = "cards" | "table" | "split"

const VIEWS: { value: View; label: string; icon: LucideIcon }[] = [
  { value: "cards", label: "Cards", icon: LayoutListIcon },
  { value: "table", label: "Table", icon: Table2Icon },
  { value: "split", label: "Split", icon: PanelsTopLeftIcon },
]

/**
 * TO REVIEW FIRST, AND IT IS WHERE THE PAGE OPENS. A recruiter comes here each
 * day to get through who is waiting on a decision, so that queue is the page;
 * the rest are where decisions land. Not a fit and All go last — you rarely go
 * back to a rejection, and All is for finding one particular person.
 */
const BUCKETS: { value: ResponseBucket; label: string }[] = [
  { value: "undecided", label: "To review" },
  { value: "maybe", label: "Maybe" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "contacted", label: "Contacted" },
  { value: "rejected", label: "Not a fit" },
  { value: "all", label: "All" },
]

const DEFAULT_BUCKET: ResponseBucket = "undecided"

/**
 * The To review queue's order: everybody new since the last visit, then
 * everybody older. The sort applies inside each half, never across them — a
 * better match from three weeks ago does not jump ahead of today's arrivals.
 * `filter` is stable, so each half keeps the order the sort already gave it.
 */
function queueOrder(applicants: Applicant[]) {
  return [
    ...applicants.filter((applicant) => applicant.newSinceVisit),
    ...applicants.filter((applicant) => !applicant.newSinceVisit),
  ]
}

/**
 * People to decide on: the response manager's whole screen below its header.
 *
 * IT WAS THE RESPONSE MANAGER, AND IT STILL IS — it moved out of `routes/job.tsx`
 * when the database's search results turned out to be the same screen. People
 * who applied to a posting and people a search found are triaged the same way:
 * a To review queue headed by whoever is new, three decisions on every card,
 * cards / table / split, the same filter pills and the same profile panel. One
 * component means a change to how triage works lands on both, which two copies
 * would not.
 *
 * WHAT THE CALLER OWNS is only what genuinely differs: the people, the skills
 * they are matched against, the header that says whose list this is, what to
 * show when there is nobody, and the words (`source`, see `lib/list-source.ts`).
 * Everything else — tab, view, sort, filters, selection, open profile — is in
 * the query string, merged with whatever the page already keeps there.
 */
export function CandidateList({
  people: generated,
  requiredSkills,
  header,
  empty,
  source = "posting",
  defaultSort = "recent",
  searchKey = "q",
  layout = "queue",
  sidebar,
  toolbar,
  verdicts,
}: {
  /** Everybody on the list, before this session's decisions are laid over. */
  people: Applicant[]
  /** What the skills bucket and the profile match people against. */
  requiredSkills: string[]
  header: React.ReactNode
  /** Shown instead of the tabs when `people` is empty. */
  empty: React.ReactNode
  source?: ListSource
  /** The sort a plain URL means. Most recent for a queue, best match for a search. */
  defaultSort?: string
  /**
   * The query-string key of the search-within-the-list box. `q` on a posting;
   * the database already spends `q` on the search itself.
   */
  searchKey?: string
  /**
   * `queue` is the response manager: decision tabs, three views, a row of
   * filter pills. A posting's responses are a queue to clear, so they are
   * split by decision and a decision moves somebody to another tab.
   *
   * `results` is a search's: one list of cards, with the caller's `sidebar`
   * beside it and its `toolbar` above it. Results are not a queue — they are a
   * ranked list you read down and narrow as you go — so there are no tabs and
   * a decision is the badge on the card rather than a move off it.
   *
   * One prop rather than a flag per part, because the parts only make sense
   * together: tabs without the table, or pills without tabs, are layouts
   * nobody has designed.
   */
  layout?: "queue" | "results"
  /**
   * `results` only. The filters are the caller's, not this component's: a
   * posting is narrowed by three facts that rule people out, a database search
   * by the twenty its product has always offered. What this list shows is
   * whatever `people` the caller has already narrowed to.
   */
  sidebar?: React.ReactNode
  /** `results` only: the row above the cards — search within, sort, and so on. */
  toolbar?: React.ReactNode
  /**
   * `results` only: each person's verdict on the search's criteria, printed on
   * their card as a line of evidence per criterion. Absent, cards have none —
   * a posting has no criteria, only the skills it asks for.
   */
  verdicts?: (applicant: Applicant) => Verdict[]
}) {
  return (
    <ListSourceContext value={source}>
      <CandidateListBody
        generated={generated}
        requiredSkills={requiredSkills}
        header={header}
        empty={empty}
        defaultSort={defaultSort}
        searchKey={searchKey}
        layout={layout}
        sidebar={sidebar}
        toolbar={toolbar}
        verdicts={verdicts}
      />
    </ListSourceContext>
  )
}

function CandidateListBody({
  generated,
  requiredSkills,
  header,
  empty,
  defaultSort,
  searchKey,
  layout,
  sidebar,
  toolbar,
  verdicts,
}: {
  generated: Applicant[]
  requiredSkills: string[]
  header: React.ReactNode
  empty: React.ReactNode
  defaultSort: string
  searchKey: string
  layout: "queue" | "results"
  sidebar: React.ReactNode
  toolbar: React.ReactNode
  verdicts?: (applicant: Applicant) => Verdict[]
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const bucketParam = searchParams.get("bucket")
  const results = layout === "results"
  // No tabs means the one list is everybody, whatever `?bucket=` says.
  const active: ResponseBucket = results
    ? "all"
    : BUCKETS.some((b) => b.value === bucketParam)
      ? (bucketParam as ResponseBucket)
      : DEFAULT_BUCKET
  // Normalised against the real list rather than a two-way check — a third
  // view arrived and the `=== "table" ? … : "cards"` version silently ate it.
  const viewParam = searchParams.get("view")
  // Results are cards and nothing else, whatever `?view=` says.
  const view: View =
    !results && VIEWS.some((option) => option.value === viewParam)
      ? (viewParam as View)
      : "cards"
  const sort = searchParams.get("sort") ?? defaultSort

  // The filter panel needs a column of its own; on anything short of a very
  // wide screen that column has to come out of the nav.
  useCollapseNavBelow(1400)

  /**
   * Both the tab and the view live in the query string, so they have to be
   * merged rather than written over each other — setting `{ bucket }` wholesale
   * silently dropped `view`, which showed up as the table snapping back to
   * cards every time you changed tab. A param at its default is deleted rather
   * than written, so the plain URL stays plain.
   */
  const setParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next, { replace: true })
  }

  // Session decisions live in a provider, so the profile page and this list
  // agree about who has been shortlisted — see `decisions-provider.tsx`.
  const { decided, decide } = useDecisions()
  const all = React.useMemo(() => generated.map(decided), [generated, decided])

  const filters: Filters = {
    q: searchParams.get(searchKey) ?? "",
    exp: searchParams.get("exp") ?? "",
    notice: searchParams.get("notice") ?? "",
    location: searchParams.get("location") ?? "",
  }

  /**
   * THE FILTER RUNS BEFORE THE BUCKETS ARE COUNTED, so a tab's number is always
   * the number of rows behind it. The alternative — true bucket totals over a
   * filtered list — puts "To review 32" above four rows, and a count that does not
   * describe what it sits on top of is worse than no count.
   */
  const applicants = React.useMemo(
    () =>
      sortApplicants(
        all.filter((applicant) => matchesFilters(applicant, filters)),
        sort
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, sort, filters.q, filters.exp, filters.notice, filters.location]
  )

  /** Only the places somebody actually applied from. */
  const locations = React.useMemo(
    () => [...new Set(all.map((applicant) => applicant.location))].sort(),
    [all]
  )

  const counts = React.useMemo(() => {
    const tally: Record<ResponseBucket, number> = {
      all: applicants.length,
      undecided: 0,
      maybe: 0,
      shortlisted: 0,
      contacted: 0,
      rejected: 0,
    }
    for (const applicant of applicants) tally[applicant.status] += 1
    return tally
  }, [applicants])

  /**
   * How far through today's arrivals the recruiter is. Over everybody, not the
   * filtered list: it is the day's job, and narrowing the list to Pune does
   * not make any of today's applicants less new.
   */
  const progress = React.useMemo(() => {
    const arrived = all.filter((applicant) => applicant.newSinceVisit)
    return {
      total: arrived.length,
      done: arrived.filter((applicant) => applicant.status !== "undecided")
        .length,
    }
  }, [all])

  /**
   * The last decision, for the undo bar. A decision takes the card out of the
   * list you are looking at the instant you make it — that is what makes the
   * queue shrink — so a misclick has to be recoverable from where you are,
   * not by finding the person again in another tab.
   */
  const [undo, setUndo] = React.useState<{
    id: string
    name: string
    from: ApplicantStatus
    to: ApplicantStatus
    at: number
  } | null>(null)

  const decideWithUndo = (id: string, status: ApplicantStatus) => {
    const applicant = all.find((candidate) => candidate.id === id)
    // Without tabs the card stays put with its decision on it, and pressing
    // the decision again clears it — there is nothing to bring back.
    if (!results && applicant && applicant.status !== status) {
      setUndo({
        id,
        name: applicant.name,
        from: applicant.status,
        to: status,
        at: Date.now(),
      })
    }
    decide(id, status)
  }

  React.useEffect(() => {
    if (!undo) return
    const timer = window.setTimeout(() => setUndo(null), 6000)
    return () => window.clearTimeout(timer)
  }, [undo])

  const selectedId = searchParams.get("candidate")
  // Which of the pane's two documents is open. In the query string with
  // everything else this screen holds, so "look at his CV" is a link — and
  // deliberately NOT reset when the selection changes: picking CV once and
  // arrowing down the list is how you compare CVs.
  const doc = searchParams.get("doc") === "cv" ? "cv" : "profile"
  // Who the profile panel is showing. In the query string like the rest of
  // this screen, so a panel someone is looking at is a link they can send.
  const profileId = searchParams.get("profile")
  const profiled =
    applicants.find((applicant) => applicant.id === profileId) ?? null

  /**
   * The panel's Back/Next walk THE LIST YOU ARE LOOKING AT, which is the active
   * bucket after filtering, in the order it is drawn — not every applicant.
   * Stepping out of To review into somebody already decided would be the panel
   * disagreeing with the tab.
   *
   * Looked up by index rather than held in state so a decision taken inside the
   * panel cannot desync it. `-1` is a real case: shortlisting somebody while
   * To review is open drops them out of this list while they are still on
   * screen, and both ends going quiet is the honest answer to "what is next"
   * when the thing you were walking no longer contains you.
   */
  const listFor = (bucket: ResponseBucket) =>
    bucket === "all"
      ? applicants
      : bucket === "undecided"
        ? queueOrder(applicants.filter((a) => a.status === "undecided"))
        : applicants.filter((a) => a.status === bucket)
  const walkable = listFor(active)
  const at = profiled
    ? walkable.findIndex((applicant) => applicant.id === profiled.id)
    : -1
  const step = (delta: number) => {
    const next = walkable[at + delta]
    if (next) setParams({ profile: next.id })
  }

  /**
   * Built once and handed to whichever layout is rendering, so the panel and
   * the bar cannot drift into filtering differently — the only thing that
   * differs between them is arrangement.
   */
  const filterProps = {
    filters,
    sort,
    locations,
    matched: applicants.length,
    total: all.length,
    // `q` is the filter's own name for the box; the URL may call it something
    // else (see `searchKey`), so it is renamed on the way out.
    onChange: (updates: Partial<Filters>) =>
      setParams(
        Object.fromEntries(
          Object.entries(updates).map(([key, value]) => [
            key === "q" ? searchKey : key,
            value ? value : null,
          ])
        )
      ),
    onSort: (next: string) =>
      setParams({ sort: next === defaultSort ? null : next }),
    onClear: () =>
      setParams({
        [searchKey]: null,
        exp: null,
        notice: null,
        location: null,
      }),
  }
  const loading = usePageLoading(550)

  const openProfile = (id: string) => setParams({ profile: id })

  return (
    <div className="flex flex-col gap-5 px-4 lg:px-6">
      {/* Mounted at the page rather than inside a view, because it is the same
          panel whichever of the three is rendering and closing it must not
          depend on which one opened it. */}
      <CandidatePanel
        applicant={profiled}
        requiredSkills={requiredSkills}
        onDecide={decideWithUndo}
        onClose={() => setParams({ profile: null })}
        onPrev={at > 0 ? () => step(-1) : undefined}
        onNext={at >= 0 && at < walkable.length - 1 ? () => step(1) : undefined}
        position={at >= 0 ? { index: at + 1, total: walkable.length } : null}
      />

      {header}

      {/* Results keep their filters on screen with nobody left under them —
          otherwise narrowing to zero would take away the controls that undo
          it. The empty list says so in its own words instead. */}
      {generated.length === 0 && !results ? (
        empty
      ) : results ? (
        <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-start">
          {/* `items-start` is load-bearing: stretched to the row's height, a
              sticky sidebar has nowhere to stick. */}
          {sidebar}

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {toolbar}
            {loading ? (
              <ApplicantListSkeleton />
            ) : (
              <ApplicantList
                applicants={listFor("all")}
                bucket={BUCKETS.find((bucket) => bucket.value === "all")!}
                progress={null}
                view="cards"
                verdicts={verdicts}
                requiredSkills={requiredSkills}
                selectedId={selectedId}
                onSelect={(id) => setParams({ candidate: id })}
                doc={doc}
                onDocChange={(next) =>
                  setParams({ doc: next === "profile" ? null : next })
                }
                onOpenProfile={openProfile}
                onDecide={decideWithUndo}
              />
            )}
          </div>
        </div>
      ) : (
        <Tabs
          className="gap-4"
          value={active}
          onValueChange={(value) => {
            const next = String(value)
            setParams({ bucket: next === DEFAULT_BUCKET ? null : next })
          }}
        >
          {/* THE TAB ROW SPANS BOTH COLUMNS. The buckets are not a property of
              the list column — they are which of five lists this whole screen
              is showing, and the filter panel narrows whichever one you pick.
              Sitting the tabs inside the list column said the opposite: that
              the filters were a peer of the tabs rather than something applied
              underneath them. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="max-w-full overflow-x-auto">
              {BUCKETS.map((bucket) => (
                <TabsTrigger key={bucket.value} value={bucket.value}>
                  {bucket.label}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {counts[bucket.value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            <ViewSwitcher
              view={view}
              onChange={(next) =>
                setParams({ view: next === "cards" ? null : next })
              }
            />
          </div>

          {/* The panel that narrows the list, then the list, side by side above
              896px of CONTENT width — a container query, not a viewport one,
              because the thing that has to fit both is the content column, and
              it changes width when the nav sidebar collapses.

              ONE ROW OF PILLS, IN EVERY VIEW. This used to be a column beside
              the cards and a row above the split view, which meant a recruiter
              changing view had to find the filters again — a smell the old
              comment here admitted to and left standing. The pills settle it:
              they cost a row instead of a column, so the view that could not
              afford 16rem of controls is no longer the odd one out, and the
              panel they used to be lives on inside the drawer.

              It is OUTSIDE the tab panels, not repeated in each: five copies of
              one search box is five things a screen reader has to tell apart,
              and the query would reset every time you changed tab. */}
          <FilterBar {...filterProps} />

          <div className="flex flex-col">
            <div className="flex min-w-0 flex-1 flex-col">
              {loading ? (
                <ApplicantListSkeleton />
              ) : (
                BUCKETS.map((bucket) => (
                  <TabsContent key={bucket.value} value={bucket.value}>
                    <ApplicantList
                      applicants={listFor(bucket.value)}
                      bucket={bucket}
                      progress={bucket.value === "undecided" ? progress : null}
                      view={view}
                      requiredSkills={requiredSkills}
                      selectedId={selectedId}
                      onSelect={(id) => setParams({ candidate: id })}
                      doc={doc}
                      onDocChange={(next) =>
                        setParams({ doc: next === "profile" ? null : next })
                      }
                      onOpenProfile={openProfile}
                      onDecide={decideWithUndo}
                    />
                  </TabsContent>
                ))
              )}
            </div>
          </div>
        </Tabs>
      )}

      {/* The live region is always mounted and only its contents change, so
          a screen reader announces the decision rather than missing an
          element that arrived already filled. */}
      <div role="status" aria-live="polite">
        {undo && (
          <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground py-1.5 pr-1.5 pl-4 text-sm whitespace-nowrap text-background shadow-lg">
            <span>
              {undo.name} {undo.to === "undecided" ? "back in" : "moved to"}{" "}
              {BUCKETS.find((bucket) => bucket.value === undo.to)?.label}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-background hover:bg-background/15 hover:text-background dark:hover:bg-background/15"
              onClick={() => {
                decide(undo.id, undo.from)
                setUndo(null)
              }}
            >
              Undo
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/** One run of the list under its own heading — see `ApplicantList`. */
type Section = {
  key: string
  heading: React.ReactNode
  rows: Applicant[]
}

/**
 * A page of responses, with more on demand.
 *
 * IT PAGES RATHER THAN RENDERING ALL 148. Not for the render cost — this is a
 * prototype and 148 cards would be fine — but because an infinite column of
 * cards is not what the real screen will be, and a design review of a list
 * should be looking at the same amount of list a recruiter gets. The footer
 * says what is on screen out of what exists, which is the number people
 * actually want when they are a third of the way down.
 *
 * TO REVIEW IS TWO RUNS UNDER HEADINGS: New since the last visit, then Earlier.
 * The day's work in the order you do it — clear today's arrivals, then the
 * backlog — and the same split in all three views, so switching view does not
 * lose the line between them. Every other tab is one run with no heading.
 *
 * `visible` resets when the bucket changes because each tab renders its own
 * copy of this component.
 */
function ApplicantList({
  applicants,
  bucket,
  progress,
  view,
  requiredSkills,
  selectedId,
  onSelect,
  doc,
  onDocChange,
  onOpenProfile,
  onDecide,
  verdicts,
}: {
  applicants: Applicant[]
  bucket: { value: ResponseBucket; label: string }
  /** Today's arrivals, done out of total. Only To review has one. */
  progress: { total: number; done: number } | null
  view: View
  requiredSkills: string[]
  selectedId: string | null
  onSelect: (id: string) => void
  doc: "profile" | "cv"
  onDocChange: (next: "profile" | "cv") => void
  onOpenProfile: (id: string) => void
  onDecide: (id: string, status: ApplicantStatus) => void
  verdicts?: (applicant: Applicant) => Verdict[]
}) {
  const [visible, setVisible] = React.useState(PAGE_SIZE)
  const copy = useListCopy()

  if (applicants.length === 0) return <EmptyBucket bucket={bucket} />

  const shown = applicants.slice(0, visible)

  /**
   * The headings count the whole run, not the page of it on screen — "Earlier
   * · 71" over the first eight of them is the number you want to know.
   */
  const sectionsOf = (rows: Applicant[], compact = false): Section[] => {
    if (!progress) return [{ key: "all", heading: null, rows }]

    const fresh = applicants.filter((applicant) => applicant.newSinceVisit)
    const earlier = applicants.length - fresh.length
    const sections: Section[] = []

    // New keeps its heading after its last card has gone, so clearing it
    // reads as finishing something rather than as the section vanishing.
    if (progress.total > 0) {
      sections.push({
        key: "new",
        heading: (
          <QueueHeading
            title={copy.newSince}
            count={fresh.length}
            aside={`${progress.done} of ${progress.total} done`}
            note={
              fresh.length > 0
                ? undefined
                : progress.done === progress.total
                  ? `You are through all ${progress.total} of them.`
                  : "None of them match these filters."
            }
            compact={compact}
          />
        ),
        rows: rows.filter((applicant) => applicant.newSinceVisit),
      })
    }

    // Only once the page reaches them: a heading with no rows under it,
    // straight above "Load more", reads as an empty section.
    if (earlier > 0 && rows.some((applicant) => !applicant.newSinceVisit)) {
      sections.push({
        key: "earlier",
        heading: (
          <QueueHeading
            title="Earlier"
            count={earlier}
            aside="Skipped, or not reached yet"
            compact={compact}
          />
        ),
        rows: rows.filter((applicant) => !applicant.newSinceVisit),
      })
    }

    return sections
  }

  return (
    <div className="flex flex-col gap-3">
      {view === "split" ? (
        // The whole bucket, not a page of it: the list column scrolls on its
        // own, so there is nothing for "Load more" to be at the bottom of.
        <SplitView
          applicants={applicants}
          sections={sectionsOf(applicants, true)}
          requiredSkills={requiredSkills}
          selectedId={selectedId}
          onSelect={onSelect}
          doc={doc}
          onDocChange={onDocChange}
          onOpenProfile={onOpenProfile}
          onDecide={onDecide}
        />
      ) : view === "table" ? (
        <ApplicantTable sections={sectionsOf(shown)} onDecide={onDecide} />
      ) : (
        sectionsOf(shown).map((section) => (
          <React.Fragment key={section.key}>
            {section.heading}
            {section.rows.length > 0 && (
              <div role="list" className="flex flex-col gap-3">
                {section.rows.map((applicant) => (
                  <ApplicantCard
                    key={applicant.id}
                    applicant={applicant}
                    requiredSkills={requiredSkills}
                    verdicts={verdicts?.(applicant)}
                    onDecide={onDecide}
                    onOpenProfile={onOpenProfile}
                  />
                ))}
              </div>
            )}
          </React.Fragment>
        ))
      )}

      <div
        className={cn(
          "flex flex-col items-center gap-3 py-2",
          view === "split" && "hidden"
        )}
      >
        <p className="text-xs text-muted-foreground tabular-nums">
          Showing {shown.length} of {applicants.length}
        </p>
        {visible < applicants.length && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisible((current) => current + PAGE_SIZE)}
          >
            Load more
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * The heading over one run of To review. The count is the run's own; the aside
 * is what the run is — for New, how far through it you are.
 *
 * `compact` is the split view's list, which is narrow and sits inside a card,
 * so the heading takes the rows' own inset rather than the page's.
 */
function QueueHeading({
  title,
  count,
  aside,
  note,
  compact,
}: {
  title: string
  count: number
  aside: string
  /** Said under the heading when the run has nothing left to show. */
  note?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        compact ? "px-3 pt-2.5 pb-1" : "pt-2 first:pt-0"
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h3 className="text-sm font-medium">
          {title}{" "}
          <span className="font-normal text-muted-foreground tabular-nums">
            · {count}
          </span>
        </h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {aside}
        </span>
      </div>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </div>
  )
}

function EmptyBucket({
  bucket,
}: {
  bucket: { value: ResponseBucket; label: string }
}) {
  const copy = useListCopy().empty

  return (
    <Empty className="rounded-2xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserRoundIcon />
        </EmptyMedia>
        <EmptyTitle>{copy[bucket.value].title}</EmptyTitle>
        <EmptyDescription>{copy[bucket.value].body}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

/**
 * One applicant, bucketed the way LinkedIn Recruiter buckets a candidate: a
 * column of labels down the left, the facts beside them.
 *
 * WHY IT BEATS THE GREY LINE IT REPLACED. The old card ran everything together
 * as two meta lines — "16 yrs · ₹93L current · 15 days notice" — which reads
 * fine on one card and turns to mush over twenty. Labels give the eye something
 * fixed to navigate by. It is the same reason the table view works, applied
 * inside a card.
 *
 * TWO LAYOUTS OF THE SAME BUCKETS, chosen on /settings: labels down the left,
 * or the buckets across. The header, the actions and the four buckets'
 * CONTENTS are shared — only where they sit changes, which is what makes the
 * two comparable at all. See `BucketRows` and `BucketColumns`.
 *
 * The card is still not a link — its actions are the point, and the profile
 * behind it does not exist yet. See `RowActions`.
 */
function ApplicantCard({
  applicant,
  requiredSkills,
  verdicts,
  onDecide,
  onOpenProfile,
}: {
  applicant: Applicant
  requiredSkills: string[]
  /** One line of evidence per criterion, in rank order. Search results only. */
  verdicts?: Verdict[]
  onDecide: (id: string, status: ApplicantStatus) => void
  onOpenProfile: (id: string) => void
}) {
  const { variant } = useCardVariant()
  const copy = useListCopy()
  const [showAllRoles, setShowAllRoles] = React.useState(false)
  const roles = showAllRoles
    ? applicant.positions
    : applicant.positions.slice(0, 2)
  const matched = applicant.skills.filter((skill) =>
    requiredSkills.includes(skill)
  )

  return (
    <Item className="@container/card flex-col items-stretch gap-3 bg-card px-5 py-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ApplicantAvatar
            name={applicant.name}
            fresh={isNew(applicant)}
            className="size-12"
          />

          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-base font-medium">
                {applicant.name}
              </span>
              {isNew(applicant) ? (
                <span className="sr-only">New</span>
              ) : (
                <ApplicantStatusBadge status={applicant.status} />
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {applicant.title} at {applicant.company}
            </span>
            <Meta>
              <MetaItem>{applicant.location}</MetaItem>
              <MetaItem>
                {copy.arrived} {applicant.appliedAgo}
              </MetaItem>
            </Meta>
          </div>
        </div>

        <RowActions
          applicant={applicant}
          onDecide={onDecide}
          className="-my-1.5 -mr-2"
        />
      </div>

      {variant === "columns" ? (
        <BucketColumns
          applicant={applicant}
          roles={roles}
          matched={matched}
          asked={requiredSkills.length > 0}
          showAllRoles={showAllRoles}
          onToggleRoles={() => setShowAllRoles((shown) => !shown)}
        />
      ) : (
        <BucketRows
          applicant={applicant}
          roles={roles}
          matched={matched}
          asked={requiredSkills.length > 0}
          showAllRoles={showAllRoles}
          onToggleRoles={() => setShowAllRoles((shown) => !shown)}
        />
      )}

      {verdicts && verdicts.length > 0 && (
        <CriteriaEvidence verdicts={verdicts} />
      )}

      <CardActions
        applicant={applicant}
        onDecide={onDecide}
        onOpenProfile={onOpenProfile}
      />
    </Item>
  )
}

/**
 * Juicebox's lines under a result: each criterion, most important first, with
 * a chip saying whether they meet it and one sentence saying why.
 *
 * AFTER THE FACTS, BEFORE THE ACTIONS. The buckets are what anybody would read
 * off the profile; these are the search's opinion of it, so they come second —
 * and they are the last thing read before deciding, which is where the reason
 * to shortlist belongs.
 *
 * A met criterion takes the success chip and a thumbs-up; an unmet one goes
 * outline and muted, so a card's fit is legible from its colour down the left
 * before a word is read. The chips share one column width, so the sentences
 * start on the same edge on every card.
 */
function CriteriaEvidence({ verdicts }: { verdicts: Verdict[] }) {
  return (
    <ul
      aria-label="How they meet the criteria"
      className="flex flex-col gap-2 border-t border-border pt-3 text-sm"
    >
      {verdicts.map((verdict) => (
        <li
          key={verdict.criterion}
          className="grid items-start gap-x-3 gap-y-1 sm:grid-cols-[9rem_minmax(0,1fr)]"
        >
          <Badge
            variant={verdict.met ? "success" : "outline"}
            className="max-w-full justify-self-start font-normal"
            title={verdict.criterion}
          >
            {verdict.met ? (
              <ThumbsUpIcon data-icon="inline-start" />
            ) : (
              <MinusIcon data-icon="inline-start" />
            )}
            <span className="sr-only">
              {verdict.met ? "Meets" : "Does not meet"}:{" "}
            </span>
            <span className="truncate">{verdict.label}</span>
          </Badge>
          <span
            className={cn(
              "min-w-0 leading-5",
              !verdict.met && "text-muted-foreground"
            )}
          >
            {verdict.evidence}
          </span>
        </li>
      ))}
    </ul>
  )
}

type BucketProps = {
  applicant: Applicant
  roles: Position[]
  matched: string[]
  /** Whether anything was asked for — a search that named no skills was not. */
  asked: boolean
  showAllRoles: boolean
  onToggleRoles: () => void
}

/**
 * LinkedIn Recruiter's shape: a column of labels down the left, the facts
 * beside them.
 *
 * Labels give the eye a fixed left edge to run down, so comparing the education
 * of the third and the ninth candidate is a vertical scan rather than a hunt.
 * The cost is height — four buckets is four rows whatever is in them, and a
 * six-role history pushes the next candidate off the screen.
 *
 * ONE `grid`, NOT A TWO-COLUMN FLEX PER ROW. A fixed first track means every
 * label in the card shares an edge even when one value wraps to six lines;
 * per-row flex would let each row set its own.
 */
function BucketRows({
  applicant,
  roles,
  matched,
  asked,
  showAllRoles,
  onToggleRoles,
}: BucketProps) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-border pt-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        Experience
      </dt>
      <dd className="flex min-w-0 flex-col items-start gap-0.5 leading-6">
        <ExperienceBucket
          applicant={applicant}
          roles={roles}
          showAllRoles={showAllRoles}
          onToggleRoles={onToggleRoles}
        />
      </dd>

      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        Education
      </dt>
      <dd className="min-w-0 leading-6">
        <EducationBucket applicant={applicant} />
      </dd>

      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        {asked ? "Skills match" : "Skills"}
      </dt>
      <dd className="min-w-0 leading-6">
        <SkillsBucket applicant={applicant} matched={matched} asked={asked} />
      </dd>

      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        Availability
      </dt>
      <dd className="min-w-0 leading-6">
        <AvailabilityBucket applicant={applicant} />
      </dd>
    </dl>
  )
}

/**
 * The same four buckets turned ninety degrees: label over value, side by side
 * across the card.
 *
 * IT TRADES DEPTH FOR HEIGHT. Four buckets in a row is one row tall however
 * much is in them, so a card is a fixed ~140px and roughly twice as many
 * candidates fit on a screen — which matters on a list of a hundred and
 * forty-eight. What it gives up is the vertical label edge: the labels now run
 * across, so comparing one bucket between two candidates means reading across
 * to the same column rather than straight down.
 *
 * EXPERIENCE GETS THE WIDEST TRACK because it is the only bucket with a list in
 * it. Splitting the width evenly put every role onto two lines and made the row
 * taller than the stacked version it is meant to compress.
 *
 * TWO BY TWO IS THE REAL LAYOUT; four across is the upgrade. Measured, a card
 * on a 1500px screen with the filter panel open is 880px, which splits into
 * four 166px tracks — not enough for "Jadavpur University, B.E. · 2016–2020" to
 * stay on one line. Four across needs a card past 1024px, which is a monitor,
 * not a laptop.
 *
 * NOTE(design): a fixed-height version of this was tried and reverted — three
 * equal rows in 136px, filled column-wise, so every card came out the same
 * height. It did make the list scannable, and it is worth another look if this
 * variant wins; it went because the height had to be tuned by hand and any
 * bucket that grew a line would have collided with the one under it.
 *
 * IT MEASURES THE CARD, NOT THE PAGE. The queries are `@…/card`, against a
 * container declared on the card itself — an unnamed `@2xl` resolved against
 * the shell's `@container/main` instead, so the buckets went four-across inside
 * a card half that wide.
 *
 * The roles collapse to two here with no "show all": the expander is what makes
 * a card grow, and a fixed height is the entire point of this variant. The full
 * history is one click away in the stacked layout, or on the profile when there
 * is one.
 */
function BucketColumns({ applicant, roles, matched, asked }: BucketProps) {
  return (
    <dl className="grid gap-x-8 gap-y-3 border-t border-border pt-3 text-sm @2xl/card:grid-cols-2 @5xl/card:grid-cols-[1.6fr_1fr_1fr_1fr]">
      <div className="flex min-w-0 flex-col gap-1">
        <dt className="text-xs font-medium text-muted-foreground">
          Experience
        </dt>
        <dd className="flex min-w-0 flex-col gap-0.5">
          <ExperienceBucket applicant={applicant} roles={roles.slice(0, 2)} />
        </dd>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <dt className="text-xs font-medium text-muted-foreground">Education</dt>
        <dd className="min-w-0">
          <EducationBucket applicant={applicant} />
        </dd>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <dt className="text-xs font-medium text-muted-foreground">
          {asked ? "Skills match" : "Skills"}
        </dt>
        <dd className="min-w-0">
          <SkillsBucket applicant={applicant} matched={matched} asked={asked} />
        </dd>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <dt className="text-xs font-medium text-muted-foreground">
          Availability
        </dt>
        <dd className="min-w-0">
          <AvailabilityBucket applicant={applicant} />
        </dd>
      </div>
    </dl>
  )
}

/**
 * The four buckets' contents, shared by both layouts — which is the point of
 * splitting them out. A variant should change where a fact sits, never what it
 * says, and two copies of "16 yrs across 6 roles" would drift the first time
 * one of them was edited.
 */
function ExperienceBucket({
  applicant,
  roles,
  showAllRoles,
  onToggleRoles,
}: {
  applicant: Applicant
  roles: Position[]
  showAllRoles?: boolean
  onToggleRoles?: () => void
}) {
  return (
    <>
      <span className="text-muted-foreground">
        <span className="font-medium text-foreground">
          {applicant.experienceYears} yrs
        </span>{" "}
        across {applicant.positions.length} roles
      </span>
      {roles.map((role) => (
        <div key={`${role.company}-${role.from}`}>
          <span className="font-medium">{role.title}</span>{" "}
          <span className="text-muted-foreground">
            at {role.company} · {role.from}–{role.to ?? "Present"}
          </span>
        </div>
      ))}
      {onToggleRoles && applicant.positions.length > 2 && (
        <Button
          variant="link"
          size="sm"
          className="h-auto w-fit px-0 text-sm font-normal text-muted-foreground"
          onClick={onToggleRoles}
        >
          {showAllRoles
            ? "Show fewer"
            : `Show all (${applicant.positions.length})`}
          <ChevronDownIcon
            data-icon="inline-end"
            className={showAllRoles ? "rotate-180" : undefined}
          />
        </Button>
      )}
    </>
  )
}

function EducationBucket({ applicant }: { applicant: Applicant }) {
  return (
    <span>
      {applicant.education.school},{" "}
      <span className="text-muted-foreground">
        {applicant.education.degree} · {applicant.education.from}–
        {applicant.education.to}
      </span>
    </span>
  )
}

/**
 * The one bucket that is about this JOB rather than this person: which of the
 * posting's four requirements they actually have. The matched ones take the
 * accent, the rest of their skills stay outline — a skill they have that nobody
 * asked for is context, not a match.
 */
function SkillsBucket({
  applicant,
  matched,
  asked,
}: {
  applicant: Applicant
  matched: string[]
  asked: boolean
}) {
  const copy = useListCopy()

  // Nothing asked for is not nothing matched: a search that named no skills
  // lists everybody's as they are rather than calling each of them a miss.
  if (asked && matched.length === 0) {
    return <span className="text-muted-foreground">{copy.noSkillsMatched}</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {matched.map((skill) => (
        <Badge key={skill} variant="success" className="font-normal">
          {skill}
        </Badge>
      ))}
      {applicant.skills
        .filter((skill) => !matched.includes(skill))
        .map((skill) => (
          <Badge key={skill} variant="outline" className="font-normal">
            {skill}
          </Badge>
        ))}
    </div>
  )
}

function AvailabilityBucket({ applicant }: { applicant: Applicant }) {
  return (
    <span className="text-muted-foreground">
      <span className="font-medium text-foreground">
        {applicant.noticeDays === 0
          ? "Available now"
          : `${applicant.noticeDays} days notice`}
      </span>{" "}
      · &#8377;{applicant.currentCtcLakh}L current
    </span>
  )
}

/**
 * Cards or table, as a two-item toggle rather than a menu or a tab.
 *
 * Two states with an icon each read at a glance and cost one click either way;
 * a dropdown would hide which one you are in behind a label. It is a
 * `ToggleGroup` rather than two buttons so the pair is one control to a screen
 * reader, and an empty selection is ignored — Base UI lets you deselect the
 * active item, and a view switcher with no view is not a state this page has.
 */
function ViewSwitcher({
  view,
  onChange,
}: {
  view: View
  onChange: (view: View) => void
}) {
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      aria-label="View"
      value={[view]}
      onValueChange={(value) => {
        const next = value[0] as View | undefined
        if (next) onChange(next)
      }}
    >
      {VIEWS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={option.label}
        >
          <option.icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/**
 * The same applicants, one to a line.
 *
 * THE COLUMNS ARE THE CARD'S FACTS, IN THE CARD'S ORDER, so switching view
 * moves the information around rather than changing what there is to know.
 * Name and current role share the first cell, stacked as they are on the card,
 * rather than taking a column each. The
 * skills are the one thing that does not come across: three badges per row is
 * the widest column on the table and the least comparable thing on it, and a
 * table earns its keep by being scannable down a column.
 *
 * Numbers are right-aligned and tabular so experience, pay and notice actually
 * line up — that alignment is the entire reason to be in this view.
 *
 * It scrolls sideways inside its own card rather than widening the page; `Table`
 * brings its own `overflow-x-auto` container.
 */
function ApplicantTable({
  sections,
  onDecide,
}: {
  sections: Section[]
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  const copy = useListCopy()

  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Candidate</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Exp</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">Notice</TableHead>
            <TableHead>{copy.arrivedColumn}</TableHead>
            {/* Pinned: the decision buttons are the point of the row, and on
                a table this wide they were the first thing to scroll out of
                sight. The cell carries the row's own background so the columns
                pass underneath it rather than showing through. */}
            <TableHead className="sticky right-0 border-l border-border bg-card">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sections.map((section) => (
            <React.Fragment key={section.key}>
              {/* A run's heading is a row of its own spanning the table, so
                  New and Earlier stay one table with one set of columns
                  rather than two tables that line up by coincidence. */}
              {section.heading && (
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={7} className="py-2 whitespace-normal">
                    {section.heading}
                  </TableCell>
                </TableRow>
              )}
              {section.rows.map((applicant) => (
                <TableRow key={applicant.id} className="group/row">
                  {/* Who they are and where they are now, as one cell: the role is
                  how a recruiter tells two names apart, and as its own column it
                  was the widest thing on the table.

                  New is a dot, not a badge — the inbox convention, and on a
                  table where the first rows are all new a column of filled
                  pills was the loudest thing on it. Every row reserves the
                  dot's slot so the names line up whether it is there or not;
                  the other statuses keep their badges, because those are
                  decisions and a dot cannot say which one. */}
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          isNew(applicant) ? "bg-primary" : "invisible"
                        )}
                      />
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{applicant.name}</span>
                          {isNew(applicant) ? (
                            <span className="sr-only">New</span>
                          ) : (
                            <ApplicantStatusBadge status={applicant.status} />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {applicant.title} at {applicant.company}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {applicant.location}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {applicant.experienceYears}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    ₹{applicant.currentCtcLakh}L
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {applicant.noticeDays === 0 ? (
                      <span className="text-muted-foreground">Now</span>
                    ) : (
                      `${applicant.noticeDays}d`
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {applicant.appliedAgo}
                  </TableCell>
                  <TableCell className="sticky right-0 border-l border-border bg-card py-1 group-hover/row:bg-muted/50">
                    <RowActions
                      applicant={applicant}
                      onDecide={onDecide}
                      className="justify-end"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function RowActions({
  applicant,
  onDecide,
  className,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
  className?: string
}) {
  return (
    <div className={cn("relative flex shrink-0 items-center gap-2", className)}>
      <DecisionGroup applicant={applicant} onDecide={onDecide} />

      <ApplicantActions applicant={applicant} onDecide={onDecide} />
    </div>
  )
}

/**
 * Everything that is not a triage decision.
 *
 * It stays a menu rather than joining the group beside it: these are things you
 * do to a candidate, one at a time and rarely, while the group is a single
 * choice you make on every card. Putting "Call" next to "Shortlist" would make
 * the row of buttons look like five equal options when three of them are one
 * question.
 *
 * NOTE(design): the items are a first guess. What a recruiter can do to a
 * response — and which of these deserve to be on the card instead — is the
 * design team's call, not this file's.
 */
function ApplicantActions({
  applicant,
  onDecide,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  const copy = useListCopy()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-muted-foreground"
            aria-label={`More actions for ${applicant.name}`}
          />
        }
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-52">
        {/* The card's two icon buttons, spelled out, for the widths where the
            footer has no room for them. `md:hidden` is the exact inverse of
            what hides them there, so they are in one place or the other and
            never both. */}
        <DropdownMenuGroup className="md:hidden">
          <DropdownMenuItem onClick={() => onDecide(applicant.id, "contacted")}>
            <MailIcon />
            Message
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CalendarPlusIcon />
            Set up interview
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="md:hidden" />

        <DropdownMenuGroup>
          <DropdownMenuItem>
            <DownloadIcon />
            Download CV
          </DropdownMenuItem>
          {/* Calling is reaching out, so it moves the row the way Message
              does — it is in here rather than on the card only because it is
              the rarer of the two. */}
          <DropdownMenuItem onClick={() => onDecide(applicant.id, "contacted")}>
            <PhoneIcon />
            Call
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {/* The end of the funnel, and the only thing in here worth an accent
              — everything above it is a step, this one is the outcome. */}
          <DropdownMenuItem className="text-primary focus:text-primary">
            <TrophyIcon />
            Mark as hired
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive">
            <Trash2Icon />
            {copy.remove}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function useCollapseNavBelow(minWidth: number) {
  const { open, setOpen } = useSidebar()

  /**
   * Both of these are refs so the effect below can depend on `minWidth` alone.
   *
   * `setOpen` is a `useCallback` keyed on `open`, so it gets a new identity
   * every time the sidebar moves. With it in the dependency array the effect
   * tore down and re-ran on its own state change — and since teardown is what
   * restores the sidebar, that was: collapse, cleanup, expand, collapse,
   * "Maximum update depth exceeded". Reading both through refs makes this a
   * mount-once effect, which is what it always meant to be, and cleanup then
   * happens only on the way out of the page.
   */
  const openRef = React.useRef(open)
  const setOpenRef = React.useRef(setOpen)
  React.useEffect(() => {
    openRef.current = open
    setOpenRef.current = setOpen
  }, [open, setOpen])

  const collapsedByUs = React.useRef(false)

  React.useEffect(() => {
    const query = window.matchMedia(`(max-width: ${minWidth - 1}px)`)

    const apply = () => {
      if (query.matches) {
        if (openRef.current) {
          collapsedByUs.current = true
          setOpenRef.current(false)
        }
      } else if (collapsedByUs.current) {
        collapsedByUs.current = false
        setOpenRef.current(true)
      }
    }

    apply()
    query.addEventListener("change", apply)

    return () => {
      query.removeEventListener("change", apply)
      // Give it back on the way out: the next screen does not need the room.
      if (collapsedByUs.current) {
        collapsedByUs.current = false
        setOpenRef.current(true)
      }
    }
  }, [minWidth])
}

/**
 * Sort and the three filters, in a column beside the list.
 *
 * IT IS NOT A SECOND `SidebarProvider`. Two of them share one `sidebar_state`
 * cookie and both bind Cmd+B to `window`, so the filter panel would overwrite
 * the nav's remembered state and one keystroke would toggle both. This is the
 * same idea without those two collisions: a panel that holds its own column,
 * sticky under the header, scrolling with its own overflow when the list runs
 * long.
 *
 * SEARCH IS IN HERE TOO, not left inline above the list. Splitting them puts
 * "narrow this list" in two places, and a recruiter who has typed a query then
 * has to look somewhere else to add a notice-period filter to it.
 */
function FilterPanel({
  filters,
  sort,
  locations,
  matched,
  total,
  onChange,
  onSort,
  onClear,
  layout = "column",
}: {
  filters: Filters
  sort: string
  /** Drawn from the people actually here, so no option can return nothing. */
  locations: string[]
  matched: number
  total: number
  onChange: (updates: Partial<Filters>) => void
  onSort: (sort: string) => void
  onClear: () => void
  /**
   * `column` is the panel beside the list. `drawer` is the same controls with
   * the card chrome and the sticky column taken off, because inside a drawer
   * they would be a card in a card and a sticky element in something that does
   * not scroll. One implementation, the way `CandidateDetail` handles the same
   * problem — two copies would agree until somebody edited one.
   */
  layout?: "column" | "drawer"
}) {
  const { searchLabel } = useListCopy()
  const active =
    Boolean(filters.q) ||
    Boolean(filters.exp) ||
    Boolean(filters.notice) ||
    Boolean(filters.location)

  return (
    <aside
      aria-label="Sort and filter"
      className={cn(
        "flex flex-col gap-4",
        layout === "column" &&
          "shrink-0 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 @4xl/main:sticky @4xl/main:top-4 @4xl/main:max-h-[calc(100svh-var(--header-height)---spacing(8))] @4xl/main:w-64 @4xl/main:overflow-y-auto"
      )}
    >
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(event) => onChange({ q: event.target.value })}
          placeholder="Search name, role or skill"
          aria-label={searchLabel}
          className="pl-9"
        />
      </div>

      <PanelRadios
        name="sort"
        label="Sort by"
        value={sort}
        options={SORTS}
        onChange={onSort}
      />

      <Separator />

      <PanelField label="Experience">
        <FilterSelect
          label="Experience"
          value={filters.exp}
          options={EXPERIENCE_BANDS}
          onChange={(exp) => onChange({ exp })}
        />
      </PanelField>

      <PanelField label="Notice period">
        <FilterSelect
          label="Notice period"
          value={filters.notice}
          options={NOTICE_BANDS}
          onChange={(notice) => onChange({ notice })}
        />
      </PanelField>

      <PanelField label="Location">
        <FilterSelect
          label="Location"
          value={filters.location}
          options={locations.map((location) => ({
            value: location,
            label: location,
          }))}
          onChange={(location) => onChange({ location })}
        />
      </PanelField>

      {/* Only when something is on. The counts on the tabs follow the filter,
          so without this line a recruiter would have no way of telling a bucket
          that is genuinely small from one that is merely narrowed. */}
      {active && (
        <>
          <Separator />
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {matched} of {total} match
            </span>
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0 text-xs"
              onClick={onClear}
            >
              Clear
            </Button>
          </div>
        </>
      )}
    </aside>
  )
}

/** A labelled row in the panel. The label is visible, not just an aria one. */
function PanelField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

/**
 * A named set of radios in the panel's column.
 *
 * Both of the panel's "pick one of a short list" controls go through this, so
 * Showing and Sort by cannot drift apart in spacing or label weight — which
 * they would, being two blocks of near-identical JSX written a week apart.
 *
 * RADIOS RATHER THAN A SELECT for these two, and selects for the three below
 * them. The difference is not arbitrary: these two have three or four options
 * that each fit on one line, and they are the controls that decide what the
 * list even is — worth the rows they cost to have visible at a glance. The
 * filters underneath have a location list that would run to a dozen rows, and
 * they are answers to "and also…", which is what a closed select is for.
 */
function PanelRadios({
  name,
  label,
  value,
  options,
  onChange,
}: {
  /** Scopes the generated ids, so two groups on one panel cannot collide. */
  name: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <PanelField label={label}>
      <RadioGroup
        aria-label={label}
        className="gap-2"
        value={value}
        onValueChange={(next) => onChange(String(next))}
      >
        {options.map((option) => {
          const id = `${name}-${option.value || "all"}`

          return (
            <div key={id} className="flex items-center gap-2">
              <RadioGroupItem id={id} value={option.value} />
              <Label htmlFor={id} className="text-sm font-normal">
                {option.label}
              </Label>
            </div>
          )
        })}
      </RadioGroup>
    </PanelField>
  )
}

/**
 *  has no built-in "any" — an empty string is not a selectable value in
 * Base UI — so every one of these carries an explicit reset item at the top.
 * Without it a filter is a one-way door: you can narrow, and then you are stuck.
 */
function FilterSelect({
  label,
  value,
  options,
  onChange,
  className = "w-full",
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  /** The panel wants a full-width column; the bar wants a pill. */
  className?: string
}) {
  const items = [
    { value: "any", label: `Any ${label.toLowerCase()}` },
    ...options,
  ]

  return (
    <Select
      items={items}
      value={value || "any"}
      onValueChange={(next) =>
        onChange(String(next) === "any" ? "" : String(next))
      }
    >
      <SelectTrigger className={className} aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * The three things you do to a candidate once you have decided they are worth
 * doing something about.
 *
 * THEY ARE NOT THE DECISION BUTTONS. The group at the top of the card answers
 * "is this person worth my time"; these answer "then what". Keeping them at
 * opposite ends of the card is what stops a recruiter reading five controls in
 * a row and having to work out which three are one question.
 *
 * THEY CAME OUT OF THE OVERFLOW MENU, and are gone from it — an action in two
 * places is one the design has not decided about. What is left in the menu is
 * the occasional half: downloading a CV, a phone call, the end of the funnel,
 * and removing somebody. These three are the ones you reach for on most cards,
 * and a menu is two clicks.
 *
 * VIEW CONTACT DETAILS IS THE ODD ONE OUT and stays last: the other three open
 * something, it discloses something, and once it has there is nothing left to
 * press. That is why it swaps itself for the details rather than sitting there
 * looking pressable next to the answer it already gave.
 *
 * All outline, none primary. A filled accent button is the right weight for one
 * action on a page; a hundred and forty-eight of them down a list is a wall,
 * and the accent on this screen is already spent on the counts and the skills
 * that matched.
 */
function CardActions({
  applicant,
  onDecide,
  onOpenProfile,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
  /** Opens the panel. The card used to link to the profile page instead. */
  onOpenProfile: (id: string) => void
}) {
  const [revealed, setRevealed] = React.useState(false)

  return (
    /**
     * RIGHT-ALIGNED, under the decision group it shares an edge with. The card
     * now has one column of controls down its right side — decide at the top,
     * act at the bottom — instead of controls in one corner and a row starting
     * from the opposite one. On a list this long the right edge is the only
     * part of a card whose position is predictable, which is what makes a
     * column of buttons scannable at all.
     *
     * Contact details are the exception, pinned left by `mr-auto`. It is not a
     * peer of the other three: they act on a candidate, it discloses a fact
     * about them, and once pressed it is replaced by that fact. Keeping the
     * button on the left means the reveal happens exactly where the button was
     * rather than jumping across the card — and the details, being content,
     * read from the left like every other line on it.
     */
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
      {/* GATED, AND IT REVEALS RATHER THAN NAVIGATES. Contact details are what
          a posting is actually being paid for, so a prototype that prints an
          email beside every name has quietly designed the business model away.
          Asking for them is one click and they appear in place — which is also
          the honest shape for whatever this costs in the real product, whether
          that is a credit, a plan, or nothing. */}
      {revealed ? (
        <div className="mr-auto flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <MailIcon className="size-3.5 text-muted-foreground" />
            {applicant.email}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <PhoneIcon className="size-3.5 text-muted-foreground" />
            {applicant.phone}
          </span>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mr-auto"
          onClick={() => setRevealed(true)}
        >
          <EyeIcon data-icon="inline-start" />
          View contact details
        </Button>
      )}

      {/* ICONS, NOT LABELS, for these two. They are the two actions on the card
          with a conventional icon each — an envelope and a calendar — and
          spelling them out gave four labelled buttons of near-equal weight,
          which is a row you read rather than scan. The two that keep their
          words are the two whose icons would be guesses — an eye does not say
          "contact details" and a person does not say "profile".
          Reaching out is what Contacted means, so Message moves the row. */}
      {/* ONE UNIT, `shrink-0`, SO IT CANNOT COME APART. Revealed contact
          details are wide enough to squeeze this row, and with three loose
          children the wrap put the two icons on one line and View profile
          alone on the next — a button group that has lost its own shape reads
          as a layout fault, which it was. Grouped, either everything fits on
          the details' line or the whole group drops to the next one, still
          right-aligned and still intact. `min-w-0` on the details is the other
          half: without it they refuse to wrap and force the break every
          time. */}
      <div className="flex shrink-0 items-center gap-2">
        {/* GONE UNDER 768px, WHERE THEY REAPPEAR IN THE OVERFLOW MENU. On a
            phone the footer is the width of the card, and four controls plus a
            revealed email on that width is a row that wraps into a shape
            nobody designed. These two are the ones to move because they are
            already icons — a menu item spells them out, which is what they
            lost to fit here in the first place.

            The breakpoint is the VIEWPORT, not the card. The menu renders in a
            portal, outside the card's container, so `@…/card` cannot reach it
            and the two halves of one decision would answer to different
            widths. 768px is the width the sidebar already becomes a Sheet at,
            so the card agrees with the shell about what a phone is. */}
        <div className="hidden items-center gap-2 md:flex">
          <IconAction
            label="Message"
            onClick={() => onDecide(applicant.id, "contacted")}
          >
            <MailIcon />
          </IconAction>

          <IconAction label="Set up interview">
            <CalendarPlusIcon />
          </IconAction>
        </div>

        {/* LAST, WHICH IS THE PROMINENT END OF A RIGHT-ALIGNED ROW. Opening
            the profile is what a recruiter does after reading the card and
            deciding they want more than it holds — the one action here that
            continues the task rather than finishing it. */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenProfile(applicant.id)}
        >
          <UserRoundIcon data-icon="inline-start" />
          View profile
        </Button>
      </div>
    </div>
  )
}

/** An outline icon button that says what it is on hover and to a screen reader. */
function IconAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * The Outlook shape: a compact list on the left, the selected candidate filling
 * the right.
 *
 * IT IS THE READING VIEW, where cards are the scanning one and the table is the
 * comparing one. A card gives you enough to triage and no more; this gives you
 * a whole profile without leaving the list, which is what you want once the
 * list is down to the ten people worth actually reading.
 *
 * THE ROWS ARE DELIBERATELY THIN. Name, current role, and the one number that
 * decides whether to open somebody — everything else is three inches to the
 * right the moment you click. A list column that repeats what the pane already
 * shows is a card list with a pane bolted on, which is the failure mode of
 * every master-detail screen that grew from a list.
 *
 * THE SELECTION IS IN THE URL. `?candidate=` makes a specific person in a
 * specific list a link somebody can send — the same reason the tab, the view,
 * the sort and the filters are all in there. It also means the pane survives a
 * reload, which a `useState` selection would not.
 */
function SplitView({
  applicants,
  sections,
  requiredSkills,
  selectedId,
  onSelect,
  doc,
  onDocChange,
  onOpenProfile,
  onDecide,
}: {
  applicants: Applicant[]
  /** The same people, under their run headings — see `ApplicantList`. */
  sections: Section[]
  requiredSkills: string[]
  selectedId: string | null
  onSelect: (id: string) => void
  doc: "profile" | "cv"
  onDocChange: (next: "profile" | "cv") => void
  onOpenProfile: (id: string) => void
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  // The first row rather than nothing: an empty pane beside a full list is a
  // screen asking you to do something before it will show you anything.
  const selected =
    applicants.find((applicant) => applicant.id === selectedId) ?? applicants[0]

  return (
    <div className="flex flex-col gap-4 @3xl/main:h-[calc(100svh-var(--header-height)---spacing(24))] @3xl/main:flex-row">
      {/* Each column scrolls on its own, which is the whole point of the
          layout — reading a career should not move the list you are working
          through. Below the breakpoint they stack and the page scrolls
          normally, because two scroll areas on a phone is a trap. */}
      <div
        role="list"
        className="flex shrink-0 flex-col gap-1 overflow-y-auto rounded-2xl bg-card p-1.5 ring-1 ring-foreground/10 @3xl/main:w-80"
      >
        {sections.map((section) => (
          <React.Fragment key={section.key}>
            {section.heading}
            {section.rows.map((applicant) => (
              <SplitRow
                key={applicant.id}
                applicant={applicant}
                selected={applicant.id === selected?.id}
                onSelect={() => onSelect(applicant.id)}
              />
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* `p-px` is load-bearing. The card below is ringed, and a ring is a
          box-shadow drawn OUTSIDE the border box — so with the card filling
          this pane edge to edge, its outline lands in the overflow and
          `overflow-y-auto` (which clips both axes, not just the one named)
          cuts all four sides off. One pixel gives the ring somewhere to sit. */}
      <div className="min-w-0 flex-1 overflow-y-auto p-px">
        {selected ? (
          <div className="flex flex-col gap-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                {/* The card's header, so the same size as the card's avatar. */}
                <ApplicantAvatar
                  name={selected.name}
                  fresh={isNew(selected)}
                  className="size-12"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-base font-medium">
                      {selected.name}
                    </span>
                    {isNew(selected) ? (
                      <span className="sr-only">New</span>
                    ) : (
                      <ApplicantStatusBadge status={selected.status} />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {selected.title} at {selected.company}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DecisionGroup applicant={selected} onDecide={onDecide} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenProfile(selected.id)}
                >
                  <UserRoundIcon data-icon="inline-start" />
                  Open profile
                </Button>
              </div>
            </div>

            {/* The tabs sit under the header, not above it: the name, the
                decision buttons and Open profile act on the person whichever
                document is showing, so they belong outside the thing that
                swaps. */}
            <Tabs
              className="gap-4"
              value={doc}
              onValueChange={(value) =>
                onDocChange(String(value) === "cv" ? "cv" : "profile")
              }
            >
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="cv">CV</TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <CandidateDetail
                  applicant={selected}
                  required={requiredSkills}
                  layout="pane"
                />
              </TabsContent>

              <TabsContent value="cv">
                <CandidateCv applicant={selected} />
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * One line of the list. `aria-current` rather than a pressed button: this
 * selects what the pane shows, it does not act on anybody.
 */
function SplitRow({
  applicant,
  selected,
  onSelect,
}: {
  applicant: Applicant
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group/split flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        selected ? "bg-muted" : "hover:bg-muted/60"
      )}
    >
      {/* The dot's cut-out follows the row's own background, which is muted
          when selected or hovered rather than the card's. */}
      <ApplicantAvatar
        name={applicant.name}
        fresh={isNew(applicant)}
        className="size-10"
        badgeClassName={
          selected ? "ring-muted" : "group-hover/split:ring-muted"
        }
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {applicant.name}
          </span>
          {isNew(applicant) ? (
            <span className="sr-only">New</span>
          ) : (
            <ApplicantStatusBadge status={applicant.status} />
          )}
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {applicant.title} at {applicant.company}
        </span>
        <Meta className="text-[0.6875rem]">
          <MetaItem>{applicant.experienceYears} yrs</MetaItem>
          <MetaItem>
            {applicant.noticeDays === 0
              ? "Available now"
              : `${applicant.noticeDays}d notice`}
          </MetaItem>
        </Meta>
      </div>
    </button>
  )
}

/**
 * How every view narrows its list: a search icon, a pill per control, and one
 * drawer behind all of them.
 *
 * IT SETTLED A SMELL THIS FILE USED TO ADMIT TO. The controls were a column
 * beside the cards and a row above the split view, because split spends its
 * width on a list and a profile and could not afford a third column. That left
 * the same controls in two places depending on the view, so changing view
 * meant finding them again. A row of pills costs no column at all, which
 * removes the reason the two layouts existed — and `FilterPanel` is not gone,
 * it is what the drawer opens onto, so there is still exactly one
 * implementation of what a filter is.
 *
 * WHAT A PILL SHOWS IS ITS VALUE, NOT ITS NAME. "Any experience" rather than
 * "Experience", so the row reads as a sentence about the list underneath it
 * instead of five labels that say nothing until each is opened.
 */
function FilterBar(
  // The bar takes exactly what the panel takes, because it hands the whole lot
  // straight to it — `layout` is the one thing it decides for itself.
  props: Omit<React.ComponentProps<typeof FilterPanel>, "layout">
) {
  const {
    filters,
    sort,
    locations,
    matched,
    total,
    onChange,
    onSort,
    onClear,
  } = props
  const isMobile = useIsMobile()
  const { searchLabel, filterTitle } = useListCopy()
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  const active =
    Boolean(filters.q) ||
    Boolean(filters.exp) ||
    Boolean(filters.notice) ||
    Boolean(filters.location)

  /**
   * Each pill carries its own options, so the same array drives the label it
   * shows and the list it opens — a pill cannot say "Any location" while its
   * menu thinks otherwise.
   *
   * The reset is an OPTION, not a separate control. "Any experience" sitting at
   * the top of the list is how you undo the filter, which means the menu holds
   * every state the filter has rather than most of them plus a clear button
   * somewhere else.
   */
  const pills: FilterPill[] = [
    {
      key: "sort",
      title: "Sort by",
      value: sort,
      options: SORTS.map(({ value, label }) => ({ value, label })),
      onSelect: onSort,
      narrows: false,
    },
    {
      key: "exp",
      title: "Experience",
      value: filters.exp,
      options: [
        { value: "", label: "Any experience" },
        ...EXPERIENCE_BANDS.map(({ value, label }) => ({ value, label })),
      ],
      onSelect: (exp: string) => onChange({ exp }),
      narrows: true,
    },
    {
      key: "notice",
      title: "Notice period",
      value: filters.notice,
      options: [
        { value: "", label: "Any notice period" },
        ...NOTICE_BANDS.map(({ value, label }) => ({ value, label })),
      ],
      onSelect: (notice: string) => onChange({ notice }),
      narrows: true,
    },
    {
      key: "location",
      title: "Location",
      value: filters.location,
      options: [
        { value: "", label: "Any location" },
        ...locations.map((location) => ({ value: location, label: location })),
      ],
      onSelect: (location: string) => onChange({ location }),
      narrows: true,
    },
  ]

  return (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
      <div className="flex flex-wrap items-center gap-2">
        {/* SEARCH IS AN ICON. Shrinking it to a glyph is only safe because the
            field it stands for is one click away in both modes — a popover on
            a pointer, the drawer on a phone. The dot says a query is running
            while the box is not on screen to say so itself. */}
        {isMobile ? (
          <PillTrigger
            icon
            label={`${searchLabel} and filter`}
            marked={Boolean(filters.q)}
            onClick={() => setDrawerOpen(true)}
          />
        ) : (
          <Popover>
            <PopoverTrigger
              render={
                <PillTrigger
                  icon
                  label={searchLabel}
                  marked={Boolean(filters.q)}
                />
              }
            />
            <PopoverContent align="start" className="w-72 p-2">
              <Input
                autoFocus
                value={filters.q}
                onChange={(event) => onChange({ q: event.target.value })}
                placeholder="Search name, role or skill"
                aria-label={searchLabel}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* ON A POINTER EACH PILL OPENS ITS OWN OPTIONS. Changing one filter is
            the common case and a popover answers it in one click, right under
            the control that asked. On a phone there is no room to anchor five
            of those, so every pill opens the one drawer instead — the same
            controls, in the shape each input can actually use. */}
        {pills.map((pill) => {
          const current =
            pill.options.find((option) => option.value === pill.value) ??
            pill.options[0]
          const marked = pill.narrows && Boolean(pill.value)

          if (isMobile) {
            return (
              <PillTrigger
                key={pill.key}
                label={current.label}
                marked={marked}
                onClick={() => setDrawerOpen(true)}
              />
            )
          }

          // LOCATION IS THE ONE THAT CAN GROW. Every other pill picks from a
          // fixed set of bands written in `applicants.ts`; this one is built
          // from the cities the applicants actually live in, so its length is
          // data rather than a decision. That is what a search box is for, and
          // why exactly one of the five has one.
          if (pill.key === "location") {
            return (
              <LocationFilter
                key={pill.key}
                pill={pill}
                current={current}
                marked={marked}
              />
            )
          }

          return (
            <DropdownMenu key={pill.key}>
              <DropdownMenuTrigger
                render={<PillTrigger label={current.label} marked={marked} />}
              />
              {/* A RADIO GROUP, NOT A LIST OF BUTTONS. These were hand-rolled
                  buttons in a `role="dialog"` popover, which looked right and
                  behaved wrong: no arrow keys, no `aria-checked`, and a menu
                  announced as a dialog. Picking one of a set is exactly what a
                  menu radio group is, and the component was already here — the
                  check mark, the roving focus and the selected state all come
                  with it instead of being drawn. */}
              <DropdownMenuContent align="start" className="min-w-56">
                <DropdownMenuRadioGroup
                  value={pill.value}
                  onValueChange={(value) => pill.onSelect(String(value))}
                >
                  {/* INSIDE the radio group, not above it. `DropdownMenuLabel`
                      is Base UI's `Menu.GroupLabel`, which reads the group
                      context to label it — outside one it throws rather than
                      rendering unlabelled, which is how this took the page
                      white rather than just losing a heading. */}
                  <DropdownMenuLabel>{pill.title}</DropdownMenuLabel>
                  {pill.options.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value || "any"}
                      value={option.value}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        })}

        {active && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {matched} of {total} match
            </span>
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0 text-xs"
              onClick={onClear}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{filterTitle}</DrawerTitle>
          <DrawerDescription>
            {matched} of {total} match
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-4">
          <FilterPanel {...props} layout="drawer" />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

type FilterPill = {
  key: string
  title: string
  value: string
  options: { value: string; label: string }[]
  onSelect: (value: string) => void
  /** Sort always has a value, so it never counts as narrowing anything. */
  narrows: boolean
}

/**
 * Location, as a searchable list.
 *
 * Its own open state, because picking has to close it — a menu closes itself,
 * a popover does not, and a filter that stays open after you have chosen is a
 * panel you then have to dismiss.
 *
 * `value` on the item is the LABEL, since that is what cmdk matches typing
 * against; the id the filter actually stores goes through `onSelect`'s closure
 * instead. For locations the two are the same string, but writing it this way
 * means the next filter that gets a search box does not have to have matching
 * ids and labels to work.
 */
function LocationFilter({
  pill,
  current,
  marked,
}: {
  pill: FilterPill
  current: { value: string; label: string }
  marked: boolean
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<PillTrigger label={current.label} marked={marked} />}
      />
      <PopoverContent align="start" className="w-56 gap-0 p-0">
        <Command>
          <CommandInput placeholder="Search locations" />
          <CommandList>
            <CommandEmpty>No matching location.</CommandEmpty>
            {pill.options.map((option) => (
              <CommandItem
                key={option.value || "any"}
                value={option.label}
                data-checked={option.value === pill.value}
                onSelect={() => {
                  pill.onSelect(option.value)
                  setOpen(false)
                }}
              >
                {option.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/**
 * The pill itself, and the search glyph, which is the same control with its
 * label read out instead of drawn.
 *
 * `render`-friendly: Base UI hands a trigger its props, so this spreads
 * whatever it is given rather than owning its own click.
 */
function PillTrigger({
  label,
  marked,
  icon,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  label: string
  /** The filter is doing something — accent border, or a dot on the glyph. */
  marked: boolean
  icon?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={icon ? label : undefined}
      className={cn(
        "relative h-8 rounded-4xl border text-sm whitespace-nowrap transition-colors",
        icon ? "grid w-8 place-items-center" : "px-3",
        marked && !icon
          ? "border-primary bg-primary/10 font-medium text-foreground"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      {...props}
    >
      {icon ? <SearchIcon className="size-4" /> : label}
      {icon && marked && (
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />
      )}
    </button>
  )
}
