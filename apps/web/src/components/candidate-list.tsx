import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { useSearchParams } from "react-router"
import {
  columnVisibilityFeature,
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import {
  CalendarCheckIcon,
  CalendarPlusIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  BookmarkIcon,
  ListPlusIcon,
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
  SlidersHorizontalIcon,
  SparklesIcon,
  Table2Icon,
  ThumbsUpIcon,
  Trash2Icon,
  TrophyIcon,
  UserRoundIcon,
  XIcon,
  FunnelXIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Empty,
  EmptyContent,
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
import { useAthena } from "@/components/athena-provider"
import { useDecisions } from "@/components/decisions-provider"
import { useMessages } from "@/components/messages-provider"
import { NewListDialog, SaveToList } from "@/components/save-to-list"
import { DataTableColumnHeader } from "@/components/data-table/column-header"
import { DataTableViewOptions } from "@/components/data-table/view-options"
import {
  TABLE_COLUMNS,
  visibilityFrom,
  visibilityParams,
  type ColumnVisibility,
} from "@/lib/table-columns"
import { useSavedLists } from "@/components/saved-lists-provider"
import { firstMessageTo } from "@/lib/messages"
import {
  BulkScheduleDialog,
  ScheduleInterview,
} from "@/components/schedule-interview"
import { aboutCandidate, compareCandidates } from "@/lib/athena"
import {
  CandidateSourceContext,
  candidateHref,
  type CandidateSource,
} from "@/lib/candidate-source"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@workspace/ui/components/combobox"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
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
  parseSort,
  sortApplicants,
  sortOptions,
  tagsFor,
  sortParam,
  type Filters,
  type SortColumn,
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
import { toast } from "@workspace/ui/components/toast"
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
/**
 * Who is ticked, and asking Athena about people — handed down to the cards and
 * table rows by context rather than threaded through four layers of props. The
 * split view does not take part: its list already has a selection, the person
 * whose CV is open, and a second kind of selected in the same narrow column
 * would be two highlights meaning two things.
 */
type Picking = {
  isPicked: (id: string) => boolean
  toggle: (id: string) => void
  /** Ticks or unticks a whole run at once — "Select all" over a tab. */
  setMany: (ids: string[], on: boolean) => void
  askAbout: (people: Applicant[]) => void
}

const PickingContext = React.createContext<Picking | null>(null)

/** How many people a comparison holds: three columns is what the pane fits. */
const COMPARE_MAX = 3

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
 * A page whose header has gone to the top bar (`page-header.tsx`, as the
 * response manager's has) passes none, and the white band does not draw.
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
  annotate,
  candidateSource,
  tableView = false,
  tableFilters,
}: {
  /** Everybody on the list, before this session's decisions are laid over. */
  people: Applicant[]
  /** What the skills bucket and the profile match people against. */
  requiredSkills: string[]
  /** The white band above the list. Omitted where the page's header is in the top bar. */
  header?: React.ReactNode
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
  /**
   * `results` only: a last block on each card, above its actions, for what the
   * caller knows about a person that the list does not — on My Lists, where
   * they were saved from and the recruiter's note.
   */
  annotate?: (applicant: Applicant) => React.ReactNode
  /**
   * How the people on this screen came in — the posting, or the search. What
   * a save records as "saved from", and what an interview is booked against.
   * My Lists passes none: everybody on it already carries their own.
   */
  candidateSource?: (applicant: Applicant) => CandidateSource
  /**
   * `results` only: offer the table view beside the cards. A queue always has
   * it. Search Resume turns it on; My Lists does not yet.
   */
  tableView?: boolean
  /**
   * The table's header filters where the caller's filters are not this
   * component's — Search Resume's are its refine panel's keys (`cur`, `xp`…),
   * so its headers must write those or the two would be different filters.
   * Columns absent here fall back to the list's own (`exp`, `notice`,
   * `location`, and the search box).
   */
  tableFilters?: TableFilters
}) {
  return (
    <CandidateSourceContext value={candidateSource}>
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
          annotate={annotate}
          tableView={tableView}
          tableFilters={tableFilters}
        />
      </ListSourceContext>
    </CandidateSourceContext>
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
  annotate,
  tableView,
  tableFilters,
}: {
  tableView: boolean
  tableFilters?: TableFilters
  generated: Applicant[]
  requiredSkills: string[]
  /** The white band above the list. Omitted where the page's header is in the top bar. */
  header?: React.ReactNode
  empty: React.ReactNode
  defaultSort: string
  searchKey: string
  layout: "queue" | "results"
  sidebar: React.ReactNode
  toolbar: React.ReactNode
  verdicts?: (applicant: Applicant) => Verdict[]
  annotate?: (applicant: Applicant) => React.ReactNode
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
  // Results are cards and nothing else, whatever `?view=` says — and so is a
  // phone: a nine-column table and a two-pane split have no layout at that
  // width. The param is left in the URL rather than cleared, so a link opened
  // on a phone still shows the table when it is opened again on a desktop.
  const isMobile = useIsMobile()
  // Results offer cards and, where the caller asks, the table — never the
  // split view, whose list column is a queue's.
  const views = results
    ? VIEWS.filter(
        (option) =>
          option.value === "cards" || (tableView && option.value === "table")
      )
    : VIEWS
  const view: View =
    !isMobile && views.some((option) => option.value === viewParam)
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
  const setParams = (updates: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      // A list is repeated params, the way the database panel writes its
      // multi-selects — `?location=Pune&location=Noida`, not a joined string,
      // so a city with a comma in its name could never break it.
      next.delete(key)
      if (Array.isArray(value)) value.forEach((item) => next.append(key, item))
      else if (value !== null) next.set(key, value)
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
    location: searchParams.getAll("location"),
    preferred: searchParams.getAll("preferred"),
  }

  // `getAll` hands back a new array every render, so the arrays themselves are
  // never equal and the memo below would rerun on every keystroke elsewhere on
  // the page. These are what it actually keys on.
  const inCities = filters.location.join()
  const openTo = filters.preferred.join()

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
        sort,
        requiredSkills
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      all,
      sort,
      requiredSkills,
      filters.q,
      filters.exp,
      filters.notice,
      inCities,
      openTo,
    ]
  )

  /** Only the places somebody actually applied from. */
  const locations = React.useMemo(
    () => [...new Set(all.map((applicant) => applicant.location))].sort(),
    [all]
  )

  /**
   * Everywhere somebody would go. "Anywhere" is kept out of the options: as a
   * filter value it would mean "only people who said Anywhere", which is not
   * a question a recruiter asks — they ask about a city, and the people who
   * said Anywhere answer yes to all of them (see `matchesFilters`).
   */
  const preferredLocations = React.useMemo(
    () =>
      [...new Set(all.flatMap((applicant) => applicant.preferredLocations))]
        .filter((place) => place !== "Anywhere")
        .sort(),
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
   * The way back from a decision. A decision takes the card out of the list
   * you are looking at the instant you make it — that is what makes the queue
   * shrink — so a misclick has to be recoverable from where you are, not by
   * finding the person again in another tab.
   *
   * IT IS A TOAST NOW, not a bar this screen draws. It was a fixed pill that
   * had to know about everything else in the bottom of the window: centred,
   * but re-centred on the content column when Athena took hers, and lifted to
   * `bottom-20` when the selection bar was up. That is a lot of knowledge for
   * one message, and none of it was about the message. `Toaster` is mounted
   * once in `AppShell` and owns the corner, the stacking and the six seconds;
   * this hands it a sentence and the way back.
   *
   * `toast.close(id)` inside the handler reads as using `id` before it exists,
   * and does not: the click can only happen after `add` has returned.
   */
  const undoDecision = (
    moved: {
      id: string
      name: string
      photo?: string
      from: ApplicantStatus
    }[],
    to: ApplicantStatus
  ) => {
    const who = moved.length === 1 ? moved[0].name : `${moved.length} people`
    const where = BUCKETS.find((bucket) => bucket.value === to)?.label
    const id = toast.add({
      title: `${who} ${to === "undecided" ? "back in" : "moved to"} ${where}`,
      // WHO IT WAS ABOUT, as a face. A decision takes the card off the screen,
      // so by the time this arrives the only trace of the person is their name
      // in a sentence — and a row of names all move to Shortlisted alike. The
      // faces are capped at three because past that the count in the sentence
      // is doing the work.
      data: {
        faces: moved.slice(0, 3).map((entry) => ({
          name: entry.name,
          photo: entry.photo,
        })),
      },
      actionProps: {
        children: "Undo",
        onClick() {
          moved.forEach((entry) => decide(entry.id, entry.from))
          toast.close(id)
        },
      },
    })
  }

  const decideWithUndo = (id: string, status: ApplicantStatus) => {
    const applicant = all.find((candidate) => candidate.id === id)
    // Without tabs the card stays put with its decision on it, and pressing
    // the decision again clears it — there is nothing to bring back.
    if (!results && applicant && applicant.status !== status) {
      undoDecision(
        [
          {
            id,
            name: applicant.name,
            photo: applicant.photo,
            from: applicant.status,
          },
        ],
        status
      )
    }
    decide(id, status)
  }

  /**
   * A decision for everybody ticked. ALWAYS UNDOABLE, results included: one
   * card's decision on a results list is a badge you can see and press again,
   * but twelve at once is not something anybody can take back by hand.
   */
  const decideMany = (people: Applicant[], status: ApplicantStatus) => {
    const moved = people
      .filter((person) => person.status !== status)
      .map((person) => ({
        id: person.id,
        name: person.name,
        photo: person.photo,
        from: person.status,
      }))
    if (moved.length === 0) return
    moved.forEach((entry) => decide(entry.id, status))
    undoDecision(moved, status)
  }

  const selectedId = searchParams.get("candidate")
  // Which of the pane's two documents is open. In the query string with
  // everything else this screen holds, so "look at his CV" is a link — and
  // deliberately NOT reset when the selection changes: picking a document
  // once and arrowing down the list is how you compare people.
  //
  // CV is the default, as it is in the profile panel: it is what a recruiter
  // reads first, and the profile is the second look. So the param records
  // Profile, and `?doc=cv` from an older link still lands on the CV.
  const doc = searchParams.get("doc") === "profile" ? "profile" : "cv"
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
  /**
   * How many people in a bucket the filters are hiding, so an empty tab can
   * say it is empty BECAUSE of them — "You are all caught up" over a queue of
   * forty that Chennai happens to rule out is the screen lying.
   */
  const hiddenIn = (bucket: ResponseBucket) =>
    (bucket === "all"
      ? all.length
      : all.filter((a) => a.status === bucket).length) - listFor(bucket).length
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
    preferredLocations,
    matched: applicants.length,
    total: all.length,
    // `q` is the filter's own name for the box; the URL may call it something
    // else (see `searchKey`), so it is renamed on the way out.
    onChange: (updates: Partial<Filters>) =>
      setParams(
        Object.fromEntries(
          Object.entries(updates).map(([key, value]) => [
            key === "q" ? searchKey : key,
            // An empty list clears the key, the same as an empty string.
            Array.isArray(value)
              ? value.length > 0
                ? value
                : null
              : value
                ? value
                : null,
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
        preferred: null,
      }),
  }
  /**
   * What the table's headers read and write. The same URL keys as the pills,
   * so a header filter and a pill are one filter in two places.
   */
  const columnVisibility = visibilityFrom(searchParams)
  const tableControls: TableControls = {
    filters,
    locations,
    sort,
    onFilter: filterProps.onChange,
    onSort: (column, desc) => {
      const next = desc === null ? defaultSort : sortParam(column, desc)
      setParams({ sort: next === defaultSort ? null : next })
    },
    visibility: columnVisibility,
    onVisibility: (next) => setParams(visibilityParams(next)),
    headerFilters: tableFilters ?? {},
  }

  /** Columns and the view toggle, where a list has more than one view. */
  const viewControls =
    !isMobile && views.length > 1 ? (
      <div className="flex items-center gap-2">
        {view === "table" && (
          <DataTableViewOptions
            visibility={columnVisibility}
            onChange={tableControls.onVisibility}
          />
        )}
        <ViewSwitcher
          views={views}
          view={view}
          onChange={(next) =>
            setParams({ view: next === "cards" ? null : next })
          }
        />
      </div>
    ) : null

  /**
   * The tab block is sticky at the top, so the filter rail has to stick BELOW
   * it rather than at `top-4`, or it slides underneath once both are stuck. Its
   * height changes with wrapping and the pill row, so it is measured.
   */
  const [stickyHeight, setStickyHeight] = React.useState(0)
  // A callback ref rather than an effect, so the observer follows the node
  // itself — through remounts and HMR — instead of whatever it was on mount.
  const stickyRef = React.useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const observer = new ResizeObserver(() =>
      setStickyHeight(node.getBoundingClientRect().height)
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const loading = usePageLoading(550)

  const openProfile = (id: string) => setParams({ profile: id })

  /**
   * TICKED PEOPLE, IN THE URL like everything else on this screen, so "compare
   * these three" is a link. In the order they were ticked, which is the order
   * their columns take. Kept across tabs and through decisions: somebody you
   * shortlisted a second ago is still somebody you meant to compare.
   */
  const pickedIds = (searchParams.get("picked") ?? "")
    .split(",")
    .filter(Boolean)
  const picked = pickedIds
    .map((id) => all.find((applicant) => applicant.id === id))
    .filter((applicant): applicant is Applicant => Boolean(applicant))
  const setPicked = (ids: string[]) =>
    setParams({ picked: ids.length > 0 ? ids.join(",") : null })

  const { ask, open: athenaOpen } = useAthena()
  const sourceFor = React.useContext(CandidateSourceContext)
  const askAbout = (people: Applicant[]) => {
    const context = {
      people,
      requiredSkills,
      hrefFor: (person: Applicant) =>
        sourceFor ? candidateHref(sourceFor(person), person.id) : undefined,
    }
    const firsts = people.map((person) => person.name.split(" ")[0])
    ask(
      people.length === 1
        ? {
            prompt: `Tell me about ${people[0].name}`,
            answer: () => aboutCandidate(context),
          }
        : {
            prompt: `Compare ${firsts.slice(0, -1).join(", ")} and ${firsts.at(-1)}`,
            answer: () => compareCandidates(context),
          }
    )
  }

  const picking: Picking = {
    isPicked: (id) => pickedIds.includes(id),
    // From the URL as it is now, not as this render saw it: two ticks in quick
    // succession would otherwise both start from the same list and the second
    // would undo the first.
    toggle: (id) =>
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          const ids = (current.get("picked") ?? "").split(",").filter(Boolean)
          const updated = ids.includes(id)
            ? ids.filter((other) => other !== id)
            : [...ids, id]
          if (updated.length > 0) next.set("picked", updated.join(","))
          else next.delete("picked")
          return next
        },
        { replace: true }
      ),
    setMany: (ids, on) =>
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          const before = (current.get("picked") ?? "")
            .split(",")
            .filter(Boolean)
          const updated = on
            ? [...before, ...ids.filter((id) => !before.includes(id))]
            : before.filter((id) => !ids.includes(id))
          if (updated.length > 0) next.set("picked", updated.join(","))
          else next.delete("picked")
          return next
        },
        { replace: true }
      ),
    askAbout,
  }

  return (
    <PickingContext value={picking}>
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
          onNext={
            at >= 0 && at < walkable.length - 1 ? () => step(1) : undefined
          }
          position={at >= 0 ? { index: at + 1, total: walkable.length } : null}
        />

        {/* THE HEADER IS A WHITE BAND, edge to edge, under the white SiteHeader
          and over the mist content column. The negative margins cancel the
          shell's top padding and this column's own gutter, the way the aurora
          bands reach the edges. On a queue it runs straight into the tab
          toolbar (itself a white sticky band with the border), so `-mb-5`
          cancels the gap and it draws no border of its own. Results, and a
          queue showing its empty state, have grey under the header instead,
          so there it ends with its own border.

          WITHOUT A HEADER there is no band at all: the page put its header in
          the top bar, and an empty white strip under it would be the band
          still claiming the room it no longer fills. The tab toolbar takes
          over the join instead — see its own margin below. */}
        {header && (
          <div
            className={cn(
              "-mx-4 -mt-4 bg-background px-4 pt-5 md:-mt-6 lg:-mx-6 lg:px-6",
              !results && generated.length > 0 ? "-mb-5 pb-3" : "border-b pb-5"
            )}
          >
            {header}
          </div>
        )}

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
              {viewControls ? (
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">{toolbar}</div>
                  {viewControls}
                </div>
              ) : (
                toolbar
              )}
              {loading ? (
                <ApplicantListSkeleton />
              ) : (
                <ApplicantList
                  top={stickyHeight}
                  applicants={listFor("all")}
                  bucket={BUCKETS.find((bucket) => bucket.value === "all")!}
                  hidden={hiddenIn("all")}
                  onClearFilters={filterProps.onClear}
                  table={tableControls}
                  progress={null}
                  view={view}
                  verdicts={verdicts}
                  annotate={annotate}
                  requiredSkills={requiredSkills}
                  selectedId={selectedId}
                  onSelect={(id) => setParams({ candidate: id })}
                  doc={doc}
                  onDocChange={(next) =>
                    setParams({ doc: next === "cv" ? null : next })
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
            {/* THE TABS AND THE PILLS STICK AS ONE BLOCK. Two separately sticky
              rows would need the second offset by the first's height, and the
              gap between them would let cards show through once stuck.
              `sticky top-0`, not offset by `--header-height`: `SiteHeader` is
              a plain flow element, not pinned, so by the time this block would
              overlap it the header has already scrolled past. `bg-card` is
              load-bearing once stuck, and the negative margin bleeds it across
              `CandidateList`'s own `px-4 lg:px-6` gutter so the cards' rings
              are covered edge to edge. `z-20`, not `z-10`: `AvatarBadge` is
              `z-10` and later in the DOM, so a tie puts the new dot on top. */}
            {/* `-mt-4 md:-mt-6` ONLY WITHOUT A HEADER, where this block is the
              first thing in the column: it cancels the shell's top padding so
              the white toolbar runs straight into the white SiteHeader, the
              way it used to run into the header band. With a band above, that
              band has already cancelled the padding and this must not do it
              twice. */}
            <div
              ref={stickyRef}
              className={cn(
                "sticky top-0 z-20 -mx-4 flex flex-col gap-4 border-b border-border bg-card px-4 py-2 lg:-mx-6 lg:px-6",
                !header && "-mt-4 md:-mt-6"
              )}
            >
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

                {viewControls}
              </div>

              {/* The panel that narrows the list, then the list, side by side above
              896px of CONTENT width — a container query, not a viewport one,
              because the thing that has to fit both is the content column, and
              it changes width when the nav sidebar collapses.

              ONE ROW OF PILLS, IN EVERY VIEW — except wide cards, below. This used to be a column beside
              the cards and a row above the split view, which meant a recruiter
              changing view had to find the filters again — a smell the old
              comment here admitted to and left standing. The pills settle it:
              they cost a row instead of a column, so the view that could not
              afford 16rem of controls is no longer the odd one out, and the
              panel they used to be lives on inside the drawer.

              It is OUTSIDE the tab panels, not repeated in each: five copies of
              one search box is five things a screen reader has to tell apart,
              and the query would reset every time you changed tab. */}
              {/* THE CARDS VIEW TAKES THE FILTERS AS A RAIL, the way Insights
                does, once the content column has room for one (@4xl). The pills
                stay for the table and split view, which cannot spare 16rem, and
                for cards below @4xl, where the rail is hidden. */}
              <div className={cn(view === "cards" && "@4xl/main:hidden")}>
                <FilterBar {...filterProps} />
              </div>
            </div>

            <div
              className={cn(
                "flex flex-col",
                view === "cards" &&
                  "gap-4 @4xl/main:-mt-4 @4xl/main:flex-row @4xl/main:items-start"
              )}
            >
              {view === "cards" && (
                <FilterRail {...filterProps} people={all} top={stickyHeight} />
              )}

              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col",
                  view === "cards" && "@4xl/main:pt-4"
                )}
              >
                {view === "cards" && <AppliedFilters {...filterProps} />}
                {loading ? (
                  <ApplicantListSkeleton />
                ) : (
                  BUCKETS.map((bucket) => (
                    <TabsContent key={bucket.value} value={bucket.value}>
                      <ApplicantList
                        top={stickyHeight}
                        applicants={listFor(bucket.value)}
                        bucket={bucket}
                        hidden={hiddenIn(bucket.value)}
                        onClearFilters={filterProps.onClear}
                        table={tableControls}
                        progress={
                          bucket.value === "undecided" ? progress : null
                        }
                        view={view}
                        requiredSkills={requiredSkills}
                        selectedId={selectedId}
                        onSelect={(id) => setParams({ candidate: id })}
                        doc={doc}
                        onDocChange={(next) =>
                          setParams({ doc: next === "cv" ? null : next })
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

        {picked.length > 0 && (
          <SelectionBar
            beside={athenaOpen}
            picked={picked}
            onAsk={() => askAbout(picked)}
            onDecide={(status) => {
              decideMany(picked, status)
              // On a queue they have just left the tab you are looking at;
              // keeping them ticked would be a selection you cannot see.
              setPicked([])
            }}
            onClear={() => setPicked([])}
          />
        )}
      </div>
    </PickingContext>
  )
}

/**
 * Centred on what is left of the window once Athena has her column, not on the
 * window. Centred on the window, the bars ran under the message dock's
 * launcher, which moves aside for her and lands at the content's right edge.
 * Above `md` only, where she is a column rather than a cover.
 */
const BAR_BESIDE_ATHENA = "md:left-[calc((100vw-var(--athena-width))/2)]"

const BULK_DECISIONS: {
  value: Extract<ApplicantStatus, "shortlisted" | "maybe" | "rejected">
  label: string
  icon: LucideIcon
}[] = [
  { value: "shortlisted", label: "Shortlist", icon: CheckIcon },
  { value: "maybe", label: "Maybe", icon: CircleHelpIcon },
  { value: "rejected", label: "Not a fit", icon: XIcon },
]

/** Ghost controls on the dark pill, where the system's ghost would vanish. */
const ON_BAR =
  "rounded-full text-background hover:bg-background/15 hover:text-background aria-expanded:bg-background/15 aria-expanded:text-background dark:hover:bg-background/15"

/**
 * What to do with the ticked people.
 *
 * DECISIONS AND ATHENA ON THE BAR, THE REST BEHIND ⋯. The three decisions are
 * the card's own yes / maybe / no, in the same order and icons, because they
 * are what a recruiter ticks a dozen people to do. Athena is the other thing
 * worth a button — and only for one to three people, the most a comparison
 * holds; past that she steps off the bar rather than sitting there disabled.
 * Save, message and download are occasional, and a pill that carries all of
 * them is too wide to sit beside Athena's pane.
 *
 * The bottom lane is its own: toasts sit above it (`app-toaster.tsx`), because
 * a toast is about the last thing you did and this is about what you are
 * about to do.
 */
function SelectionBar({
  beside,
  picked,
  onAsk,
  onDecide,
  onClear,
}: {
  /** Athena is open, so centre on the content rather than the window. */
  beside: boolean
  picked: Applicant[]
  onAsk: () => void
  onDecide: (status: ApplicantStatus) => void
  onClear: () => void
}) {
  return (
    <div
      role="region"
      aria-label="Selected candidates"
      className={cn(
        "fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full bg-foreground py-1.5 pr-1.5 pl-4 text-sm whitespace-nowrap text-background shadow-lg",
        beside && BAR_BESIDE_ATHENA
      )}
    >
      <span className="mr-1 tabular-nums">{picked.length} selected</span>

      {BULK_DECISIONS.map((decision) => (
        <Tooltip key={decision.value}>
          <TooltipTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`${decision.label} ${picked.length}`}
                className={ON_BAR}
                onClick={() => onDecide(decision.value)}
              />
            }
          >
            <decision.icon />
          </TooltipTrigger>
          <TooltipContent>{decision.label}</TooltipContent>
        </Tooltip>
      ))}

      <BulkMore picked={picked} onDone={onClear} />

      {picked.length <= COMPARE_MAX && (
        <Button size="sm" className="ml-1 rounded-full" onClick={onAsk}>
          <SparklesIcon data-icon="inline-start" />
          {picked.length === 1 ? "Ask Athena" : "Compare in Athena"}
        </Button>
      )}

      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Clear selection"
        className={ON_BAR}
        onClick={onClear}
      >
        <XIcon />
      </Button>
    </div>
  )
}

/**
 * The bar's occasional actions. SAVE FILES, IT DOES NOT TOGGLE: the card's
 * menu ticks and unticks one person's lists, but a dozen people are in a dozen
 * different lists already, so picking a list here adds everybody to it and
 * takes nobody out of anything. MESSAGE WRITES DRAFTS, one per thread, and
 * opens the dock on them — the same promise Athena's drafts make, that nothing
 * goes until the recruiter sends it.
 *
 * The new-list dialog sits outside the menu, which unmounts when it closes.
 */
function BulkMore({
  picked,
  onDone,
}: {
  picked: Applicant[]
  onDone: () => void
}) {
  const { lists, listsOf, setLists, createList } = useSavedLists()
  const { fillDrafts } = useMessages()
  const sourceFor = React.useContext(CandidateSourceContext)
  const [naming, setNaming] = React.useState(false)
  const [scheduling, setScheduling] = React.useState(false)
  // Held while the dialog is open: the selection is cleared on save, and the
  // dialog must still know who it is filing.
  const [filing, setFiling] = React.useState<Applicant[]>([])

  const fileAll = (people: Applicant[], listId: string) => {
    for (const person of people) {
      const current = listsOf(person.id)
      if (!current.includes(listId))
        setLists(person, [...current, listId], sourceFor?.(person))
    }
    onDone()
  }

  const messageAll = () => {
    fillDrafts(
      picked.map((person) => {
        const source = sourceFor?.(person)
        return {
          to: {
            id: person.id,
            name: person.name,
            role: source?.label ?? person.title,
            photo: person.photo,
          },
          body: firstMessageTo(person.name, source),
        }
      })
    )
    onDone()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="More actions for the selected"
              className={ON_BAR}
            />
          }
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="center" className="min-w-56">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <BookmarkIcon />
              Save to list
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
              {/* The label inside the group: Base UI's GroupLabel throws
                  outside one (see CLAUDE.md). */}
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  Add {picked.length}{" "}
                  {picked.length === 1 ? "person" : "people"} to
                </DropdownMenuLabel>
                {lists.map((list) => (
                  <DropdownMenuItem
                    key={list.id}
                    onClick={() => fileAll(picked, list.id)}
                  >
                    <span className="truncate">{list.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setFiling(picked)
                  setNaming(true)
                }}
              >
                <ListPlusIcon />
                New list…
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem onClick={() => setScheduling(true)}>
            <CalendarPlusIcon />
            Set up{" "}
            {picked.length === 1 ? "interview" : `${picked.length} interviews`}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={messageAll}>
            <MailIcon />
            Message {picked.length}
          </DropdownMenuItem>

          {/* A no-op, like the card's own: there are no CVs to download. */}
          <DropdownMenuItem>
            <DownloadIcon />
            Download {picked.length === 1 ? "CV" : `${picked.length} CVs`}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Outside the menu, like the list dialog. The selection is kept while
          it is open and cleared only if invites went out — cancelling leaves
          the ticks where they were. */}
      <BulkScheduleDialog
        people={picked}
        open={scheduling}
        onClose={(booked) => {
          setScheduling(false)
          if (booked) onDone()
        }}
      />

      <NewListDialog
        open={naming}
        onOpenChange={setNaming}
        description={`Name it by what it is for. The ${filing.length} selected go straight in.`}
        onCreate={(name) => fileAll(filing, createList(name))}
      />
    </>
  )
}

/**
 * Ticks everybody in the tab — ALL OF IT, NOT THE PAGE ON SCREEN, and it says
 * the number so that is not a surprise. Half-ticked when some are. `compact` is
 * the table's header cell, where the column is the label.
 */
function SelectAll({
  people,
  compact = false,
}: {
  people: Applicant[]
  compact?: boolean
}) {
  const picking = React.useContext(PickingContext)
  if (!picking || people.length === 0) return null

  const ids = people.map((person) => person.id)
  const count = ids.filter((id) => picking.isPicked(id)).length
  const every = count === ids.length
  const label = every ? "Clear selection" : `Select all ${ids.length}`

  const box = (
    <Checkbox
      checked={every}
      indeterminate={count > 0 && !every}
      onCheckedChange={() => picking.setMany(ids, !every)}
      aria-label={label}
    />
  )

  if (compact) return box

  return (
    <Label className="flex w-fit items-center gap-2 px-5 text-sm font-normal text-muted-foreground">
      {box}
      {label}
    </Label>
  )
}

/** A card's or row's tick. Absent outside a list that can pick. */
function PickBox({
  applicant,
  className,
}: {
  applicant: Applicant
  className?: string
}) {
  const picking = React.useContext(PickingContext)
  if (!picking) return null

  return (
    <Checkbox
      checked={picking.isPicked(applicant.id)}
      onCheckedChange={() => picking.toggle(applicant.id)}
      aria-label={`Select ${applicant.name}`}
      className={className}
    />
  )
}

/**
 * The page chrome under the split view — its `py-6` bottom and the rest of the
 * gutter the shell puts around a page — cancelled with a negative bottom
 * margin so the two columns run to the bottom of the screen. Only the md+
 * figure, because the split view is not offered below it: `useIsMobile` sends
 * that width to the cards.
 */
const SPLIT_CHROME = 44

const EMPTY_FILTERS: Filters = {
  q: "",
  exp: "",
  notice: "",
  location: [],
  preferred: [],
}

/** Whether two filter sets ask the same thing — what "unapplied" is measured against. */
function sameFilters(a: Filters, b: Filters) {
  return (
    a.q === b.q &&
    a.exp === b.exp &&
    a.notice === b.notice &&
    a.location.join() === b.location.join() &&
    a.preferred.join() === b.preferred.join()
  )
}

/** One run of the list under its own heading — see `ApplicantList`. */
type ListRun = {
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
  annotate,
  hidden,
  onClearFilters,
  table,
  top,
}: {
  applicants: Applicant[]
  bucket: { value: ResponseBucket; label: string }
  /** People in this bucket the filters are hiding. */
  hidden: number
  onClearFilters: () => void
  /** The table view's header controls. Only a queue has a table. */
  table?: TableControls
  /** Height of the sticky tab block, measured — what the split view sizes against. */
  top: number
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
  annotate?: (applicant: Applicant) => React.ReactNode
}) {
  const [visible, setVisible] = React.useState(PAGE_SIZE)
  const copy = useListCopy()

  if (applicants.length === 0)
    return (
      <EmptyBucket
        bucket={bucket}
        hidden={hidden}
        onClearFilters={onClearFilters}
      />
    )

  const shown = applicants.slice(0, visible)

  /**
   * The headings count the whole run, not the page of it on screen — "Earlier
   * · 71" over the first eight of them is the number you want to know.
   */
  const sectionsOf = (rows: Applicant[], compact = false): ListRun[] => {
    if (!progress) return [{ key: "all", heading: null, rows }]

    const fresh = applicants.filter((applicant) => applicant.newSinceVisit)
    const earlier = applicants.length - fresh.length
    const sections: ListRun[] = []

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
          top={top}
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
      ) : view === "table" && table ? (
        <ApplicantTable
          sections={sectionsOf(shown)}
          everyone={applicants}
          requiredSkills={requiredSkills}
          onDecide={onDecide}
          onOpenProfile={onOpenProfile}
          controls={table}
        />
      ) : (
        <>
          <SelectAll people={applicants} />
          {sectionsOf(shown).map((section) => (
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
                      annotation={annotate?.(applicant)}
                      onDecide={onDecide}
                      onOpenProfile={onOpenProfile}
                    />
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </>
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
        // In the split column the heading is a bar the rows scroll under, the
        // way "Filters" is in the rail — so it carries its own background and
        // border rather than riding along with the list.
        //
        // `z-20`, not `z-10`, for the same reason the tab toolbar is: the "new"
        // dot on an avatar is `AvatarBadge`'s own `z-10` and sits later in the
        // DOM, so a tie paints it over the bar it is scrolling under.
        compact
          ? "px-3 pt-2.5 pb-1 @3xl/main:sticky @3xl/main:top-0 @3xl/main:z-20 @3xl/main:border-b @3xl/main:bg-background @3xl/main:py-2.5"
          : "pt-2 first:pt-0"
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
  hidden,
  onClearFilters,
}: {
  bucket: { value: ResponseBucket; label: string }
  hidden: number
  onClearFilters: () => void
}) {
  const copy = useListCopy().empty

  // Empty because of the filters, not because the work is done. Only when
  // they actually hide somebody: a tab that is empty unfiltered keeps its own
  // words, filters or not.
  if (hidden > 0) {
    return (
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FunnelXIcon />
          </EmptyMedia>
          <EmptyTitle>Nobody matches these filters</EmptyTitle>
          <EmptyDescription>
            {hidden === 1 ? "1 person" : `${hidden} people`} in {bucket.label}{" "}
            {hidden === 1 ? "is" : "are"} hidden by the filters you have on.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

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
  annotation,
  onDecide,
  onOpenProfile,
}: {
  applicant: Applicant
  requiredSkills: string[]
  /** One line of evidence per criterion, in rank order. Search results only. */
  verdicts?: Verdict[]
  /** The caller's own block, after the evidence — see `annotate`. */
  annotation?: React.ReactNode
  onDecide: (id: string, status: ApplicantStatus) => void
  onOpenProfile: (id: string) => void
}) {
  const { variant } = useCardVariant()
  const copy = useListCopy()
  const [showAllRoles, setShowAllRoles] = React.useState(false)
  const roles = showAllRoles
    ? applicant.positions
    : applicant.positions.slice(0, 2)
  const tags = React.useMemo(() => tagsFor(applicant), [applicant])
  const matched = applicant.skills.filter((skill) =>
    requiredSkills.includes(skill)
  )

  return (
    <Item className="@container/card flex-col items-stretch gap-3 bg-card px-5 py-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* Beside the photo, vertically on its middle: the tick is about the
              person, and the photo is the person at a glance. */}
          <PickBox applicant={applicant} className="mt-4" />
          <ApplicantAvatar
            name={applicant.name}
            photo={applicant.photo}
            fresh={isNew(applicant)}
            className="size-12"
          />

          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* THE NAME OPENS THE PROFILE, as it does in the table's
                  `CandidateCell`. Reading somebody is the one thing a card
                  cannot do in place, and the name is where anybody clicks to
                  do it — "View profile" at the foot of the card stays, because
                  a name that happens to be a link is not a discoverable way to
                  find out there is a profile at all. The card itself is not
                  clickable: it already carries three decisions, a checkbox and
                  a menu, and a click target wrapped around those is a click
                  target you cannot avoid hitting. */}
              <button
                type="button"
                onClick={() => onOpenProfile(applicant.id)}
                className="rounded-sm text-left font-heading text-base font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {applicant.name}
              </button>
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
          tags={tags}
          matched={matched}
          asked={requiredSkills.length > 0}
          showAllRoles={showAllRoles}
          onToggleRoles={() => setShowAllRoles((shown) => !shown)}
        />
      ) : (
        <BucketRows
          applicant={applicant}
          roles={roles}
          tags={tags}
          matched={matched}
          asked={requiredSkills.length > 0}
          showAllRoles={showAllRoles}
          onToggleRoles={() => setShowAllRoles((shown) => !shown)}
        />
      )}

      {verdicts && verdicts.length > 0 && (
        <CriteriaEvidence verdicts={verdicts} />
      )}

      {annotation}

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
  /** Derived, not dealt — see `tagsFor`. Empty means the row does not draw. */
  tags: string[]
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
  tags,
  matched,
  asked,
  showAllRoles,
  onToggleRoles,
}: BucketProps) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-border pt-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
      {tags.length > 0 && (
        <>
          <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
            Tags
          </dt>
          <dd className="min-w-0 leading-6">
            <TagsBucket tags={tags} />
          </dd>
        </>
      )}

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
        Location
      </dt>
      <dd className="min-w-0 leading-6">
        <LocationBucket applicant={applicant} />
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
function BucketColumns({
  applicant,
  roles,
  tags,
  matched,
  asked,
}: BucketProps) {
  return (
    <dl className="grid gap-x-8 gap-y-3 border-t border-border pt-3 text-sm @2xl/card:grid-cols-2 @5xl/card:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
      {/* A band across the top rather than a sixth column: tags are a row of
          chips of no fixed length, and a column that narrow would wrap every
          one of them onto its own line. */}
      {tags.length > 0 && (
        <div className="col-span-full flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium text-muted-foreground">Tags</dt>
          <dd className="min-w-0">
            <TagsBucket tags={tags} />
          </dd>
        </div>
      )}

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
        <dt className="text-xs font-medium text-muted-foreground">Location</dt>
        <dd className="min-w-0">
          <LocationBucket applicant={applicant} />
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

/** A table row's matched skills — the accent badges, or a dash for none. */
function MatchedSkills({ skills }: { skills: string[] }) {
  if (skills.length === 0) {
    return (
      <span className="text-muted-foreground">
        <span aria-hidden>—</span>
        <span className="sr-only">None</span>
      </span>
    )
  }

  return (
    <div className="flex max-w-64 flex-wrap gap-1">
      {skills.map((skill) => (
        <Badge key={skill} variant="success" className="font-normal">
          {skill}
        </Badge>
      ))}
    </div>
  )
}

/**
 * Where they are, and where else they would go.
 *
 * THE CURRENT CITY IS ALREADY ON THE CARD, in the meta line under the name, so
 * this row exists for the second half: a posting is in one place, and "would
 * they come here" is not answered by where they are now. The current city is
 * repeated as the emphasis anyway, because the two only mean anything read
 * together — "Pune, open to Bengaluru" is a different candidate from "Pune".
 *
 * `preferredLocations` leads with their own city (see `applicants.ts`), so it
 * is dropped here rather than said twice. Somebody who named nowhere else gets
 * the city alone; "Anywhere" is said as it is, because it is what they said.
 */
/**
 * The short facts about the shape of a career, above everything else on the
 * card — see `tagsFor`.
 *
 * ABOVE EXPERIENCE BECAUSE IT IS THE SUMMARY OF IT. "Leads a team", "Moves
 * often" and "Top institute" are what a recruiter would come away with after
 * reading the roles and the school; put under them it would be a conclusion
 * after its own evidence.
 *
 * `secondary`, NOT the skills' `success`. Green is spent on "this is one of
 * the skills the posting asked for", which is a match against a requirement;
 * a tag is a fact about the person and nobody asked for it, so it stays
 * neutral and lets the green keep meaning one thing on the card.
 */
/**
 * How many tags a card shows before it starts counting. Three is a row you
 * read without meaning to; the rest are behind `+N`, which is a number rather
 * than a sentence and costs the eye nothing.
 */
const TAGS_SHOWN = 3

function TagsBucket({ tags }: { tags: string[] }) {
  const shown = tags.slice(0, TAGS_SHOWN)
  const rest = tags.slice(TAGS_SHOWN)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((tag) => (
        <Badge key={tag} variant="secondary" className="font-normal">
          {tag}
        </Badge>
      ))}

      {/* `+2` IS A HANDLE, NOT A FULL STOP. Truncating silently would leave a
          card that has more to say looking like one that does not, and a
          count you cannot open is the same thing with a number on it — so the
          rest are on hover, in the order they would have been drawn. */}
      {rest.length > 0 && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge
                variant="outline"
                className="font-normal text-muted-foreground"
              />
            }
          >
            +{rest.length}
            <span className="sr-only"> more: {rest.join(", ")}</span>
          </TooltipTrigger>
          <TooltipContent>{rest.join(" · ")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function LocationBucket({ applicant }: { applicant: Applicant }) {
  const elsewhere = applicant.preferredLocations.filter(
    (place) => place !== applicant.location
  )

  return (
    <span className="text-muted-foreground">
      <span className="font-medium text-foreground">{applicant.location}</span>
      {elsewhere.length > 0 && <> · open to {elsewhere.join(", ")}</>}
    </span>
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
  views,
  view,
  onChange,
}: {
  views: typeof VIEWS
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
      {views.map((option) => (
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
/** What the table's headers need from the list: the URL's filters and sort. */
type TableControls = {
  filters: Filters
  locations: string[]
  sort: string
  onFilter: (updates: Partial<Filters>) => void
  /** `null` clears back to the list's default order. */
  onSort: (column: SortColumn, desc: boolean | null) => void
  visibility: ColumnVisibility
  onVisibility: (next: ColumnVisibility) => void
  headerFilters: TableFilters
}

/** A column header's filter: whether it is on, and its controls. */
export type TableFilters = Partial<
  Record<
    SortColumn,
    { filtered: boolean; render: (close: () => void) => React.ReactNode }
  >
>

const tableFeaturesUsed = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
})
const columnHelper = createColumnHelper<typeof tableFeaturesUsed, Applicant>()
const labelOf = (id: string) =>
  TABLE_COLUMNS.find((column) => column.id === id)?.label ?? id

/**
 * What the column renderers read. A CONTEXT, NOT CLOSURES: the column
 * definitions below are one module-level constant, so a header's popover is
 * never remounted by a filter changing underneath it — built inside the
 * component, every keystroke in the Candidate search rebuilt the columns and
 * threw the box (and its focus) away.
 */
const ApplicantTableContext = React.createContext<{
  controls: TableControls
  everyone: Applicant[]
  requiredSkills: string[]
  onDecide: (id: string, status: ApplicantStatus) => void
  onOpenProfile: (id: string) => void
} | null>(null)

function useApplicantTable() {
  const context = React.useContext(ApplicantTableContext)
  if (!context) throw new Error("Outside ApplicantTable")
  return context
}

const NUMERIC_COLUMNS: SortColumn[] = ["experience", "pay", "notice", "match"]

/** A sortable column's heading, with the filter that column carries, if any. */
function ColumnHead({ id }: { id: SortColumn }) {
  const { controls } = useApplicantTable()
  const { filters, locations, onFilter, visibility, onVisibility } = controls
  const { searchLabel, arrivedColumn } = useListCopy()
  const parsed = parseSort(controls.sort)
  const sorted =
    parsed?.column === id ? (parsed.desc ? "desc" : "asc") : (false as const)

  const radios =
    (
      label: string,
      value: string,
      options: { value: string; label: string }[],
      onChange: (value: string) => void
    ) =>
    (close: () => void) => (
      <HeaderRadios
        label={label}
        value={value}
        options={options}
        onChange={(next) => {
          onChange(next)
          close()
        }}
      />
    )

  const filter =
    id === "candidate"
      ? {
          filtered: Boolean(filters.q),
          render: () => (
            <Input
              autoFocus
              value={filters.q}
              onChange={(event) => onFilter({ q: event.target.value })}
              placeholder="Search name, role or skill"
              aria-label={searchLabel}
            />
          ),
        }
      : id === "location"
        ? {
            filtered: filters.location.length > 0,
            // The picker, not radios — the same control the rail and the pill
            // carry, so a header and the rail stay one filter in two places.
            // It stays open on a pick, because picking several is the point.
            render: () => (
              <LocationPicker
                label="Current location"
                placeholder="Search locations"
                options={locations}
                chosen={filters.location}
                onChange={(location) => onFilter({ location })}
              />
            ),
          }
        : id === "experience"
          ? {
              filtered: Boolean(filters.exp),
              render: radios(
                "Experience",
                filters.exp,
                [
                  { value: "", label: "Any experience" },
                  ...EXPERIENCE_BANDS.map(({ value, label }) => ({
                    value,
                    label,
                  })),
                ],
                (exp) => onFilter({ exp })
              ),
            }
          : id === "notice"
            ? {
                filtered: Boolean(filters.notice),
                render: radios(
                  "Notice period",
                  filters.notice,
                  [
                    { value: "", label: "Any notice period" },
                    ...NOTICE_BANDS.map(({ value, label }) => ({
                      value,
                      label,
                    })),
                  ],
                  (notice) => onFilter({ notice })
                ),
              }
            : null

  const chosen = controls.headerFilters[id] ?? filter

  return (
    <DataTableColumnHeader
      title={id === "applied" ? arrivedColumn : labelOf(id)}
      align={NUMERIC_COLUMNS.includes(id) ? "end" : "start"}
      sorted={sorted}
      onSort={(desc) => controls.onSort(id, desc)}
      filter={chosen?.render}
      filtered={chosen?.filtered}
      onHide={
        TABLE_COLUMNS.find((column) => column.id === id)?.hideable
          ? () => onVisibility({ ...visibility, [id]: false })
          : undefined
      }
    />
  )
}

function SelectAllHead() {
  return <SelectAll people={useApplicantTable().everyone} compact />
}

/**
 * Who they are and where they are now, as one cell: the role is how a
 * recruiter tells two names apart, and as its own column it was the widest
 * thing on the table. The photo is here as on the cards, and New is the
 * avatar's dot, not a badge — the other statuses keep their badges, because
 * those are decisions and a dot cannot say which one.
 */
function CandidateCell({ applicant }: { applicant: Applicant }) {
  const { onOpenProfile } = useApplicantTable()

  return (
    <div className="flex items-center gap-3">
      <ApplicantAvatar
        name={applicant.name}
        photo={applicant.photo}
        fresh={isNew(applicant)}
        className="size-9"
      />
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          {/* The row's click is mouse-only, so the name is the same action as
              a real button — the keyboard and screen-reader way in. */}
          <button
            type="button"
            onClick={() => onOpenProfile(applicant.id)}
            className="rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {applicant.name}
          </button>
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
  )
}

/**
 * Only the matches, unlike the card's skills bucket: the column is here to
 * answer "do they have what the job needs".
 */
function MatchedCell({ applicant }: { applicant: Applicant }) {
  const { requiredSkills } = useApplicantTable()
  return (
    <MatchedSkills
      skills={applicant.skills.filter((skill) =>
        requiredSkills.includes(skill)
      )}
    />
  )
}

function ActionsCell({ applicant }: { applicant: Applicant }) {
  const { onDecide } = useApplicantTable()
  return (
    <RowActions
      applicant={applicant}
      onDecide={onDecide}
      className="justify-end"
    />
  )
}

const TABLE_COLUMN_DEFS = columnHelper.columns([
  columnHelper.display({
    id: "select",
    header: () => <SelectAllHead />,
    cell: ({ row }) => <PickBox applicant={row.original} />,
  }),
  columnHelper.accessor((applicant) => applicant.name, {
    id: "candidate",
    enableHiding: false,
    header: () => <ColumnHead id="candidate" />,
    cell: ({ row }) => <CandidateCell applicant={row.original} />,
  }),
  // Sorted upstream by count; the accessor only makes the column sortable.
  columnHelper.accessor((applicant) => applicant.skills.length, {
    id: "matched",
    header: () => <ColumnHead id="matched" />,
    cell: ({ row }) => <MatchedCell applicant={row.original} />,
  }),
  columnHelper.accessor((applicant) => applicant.location, {
    id: "location",
    header: () => <ColumnHead id="location" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.location}</span>
    ),
  }),
  columnHelper.accessor((applicant) => applicant.experienceYears, {
    id: "experience",
    header: () => <ColumnHead id="experience" />,
    cell: ({ row }) => row.original.experienceYears,
  }),
  columnHelper.accessor((applicant) => applicant.currentCtcLakh, {
    id: "pay",
    header: () => <ColumnHead id="pay" />,
    cell: ({ row }) => `₹${row.original.currentCtcLakh}L`,
  }),
  columnHelper.accessor((applicant) => applicant.noticeDays, {
    id: "notice",
    header: () => <ColumnHead id="notice" />,
    cell: ({ row }) =>
      row.original.noticeDays === 0 ? (
        <span className="text-muted-foreground">Now</span>
      ) : (
        `${row.original.noticeDays}d`
      ),
  }),
  columnHelper.accessor((applicant) => applicant.appliedDaysAgo, {
    id: "applied",
    header: () => <ColumnHead id="applied" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.appliedAgo}</span>
    ),
  }),
  columnHelper.accessor((applicant) => applicant.match, {
    id: "match",
    header: () => <ColumnHead id="match" />,
    cell: ({ row }) => `${row.original.match}%`,
  }),
  columnHelper.accessor((applicant) => applicant.education.school, {
    id: "education",
    header: () => <ColumnHead id="education" />,
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span>{row.original.education.school}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.education.degree}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor((applicant) => applicant.status, {
    id: "status",
    header: () => <ColumnHead id="status" />,
    cell: ({ row }) => <ApplicantStatusBadge status={row.original.status} />,
  }),
  columnHelper.display({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <ActionsCell applicant={row.original} />,
  }),
])

function ApplicantTable({
  sections,
  everyone,
  requiredSkills,
  onDecide,
  onOpenProfile,
  controls,
}: {
  sections: ListRun[]
  /** The whole tab, not the page of it on screen — what "select all" ticks. */
  everyone: Applicant[]
  requiredSkills: string[]
  onDecide: (id: string, status: ApplicantStatus) => void
  onOpenProfile: (id: string) => void
  controls: TableControls
}) {
  const { visibility } = controls

  // A click anywhere on a row opens the profile, except on the things in it
  // that do something else. Two traps: React bubbles events out of PORTALS
  // along the component tree, so a click inside a dialog or menu opened from
  // the row's actions would reach this handler too — the `contains` check
  // drops those, because a portal is not inside the row in the DOM. And a
  // drag to copy a name ends in a click; leaving that alone is the difference
  // between a table you can read and one that fights you.
  const onRowClick = (event: React.MouseEvent<HTMLElement>, id: string) => {
    const target = event.target as Element
    if (!event.currentTarget.contains(target)) return
    if (target.closest("button, a, input, [role=menuitem], [data-row-actions]"))
      return
    if (window.getSelection()?.toString()) return
    onOpenProfile(id)
  }

  /**
   * TANSTACK OWNS THE COLUMNS, NOT THE ROWS. The list arrives already filtered
   * and sorted by `CandidateList`, because the cards, the split view, the tab
   * counts, Athena and the New/Earlier runs all read that same order — a table
   * that sorted its own copy would disagree with the tab it sits in. So the
   * table is `manualSorting`, its sort state is read back off the URL only to
   * draw the header arrows, and the rows are drawn by section below.
   */
  const parsed = parseSort(controls.sort)
  const sorting = parsed ? [{ id: parsed.column, desc: parsed.desc }] : []

  const rows = React.useMemo(
    () => sections.flatMap((section) => section.rows),
    [sections]
  )

  const table = useTable({
    features: tableFeaturesUsed,
    columns: TABLE_COLUMN_DEFS,
    data: rows,
    getRowId: (applicant) => applicant.id,
    manualSorting: true,
    state: { sorting, columnVisibility: visibility },
  })

  const rowsById = new Map(table.getRowModel().rows.map((row) => [row.id, row]))
  const span = table.getVisibleLeafColumns().length

  /** Per-column cell classes: numbers right-aligned, the edges tight. */
  const cellClass = (id: string, head = false) =>
    cn(
      id === "select" && "w-10 pr-0",
      id === "matched" && !head && "min-w-40 whitespace-normal",
      ["experience", "pay", "match"].includes(id) &&
        !head &&
        "text-right font-medium tabular-nums",
      id === "notice" && !head && "text-right tabular-nums",
      ["experience", "pay", "notice", "match"].includes(id) &&
        head &&
        "text-right",
      // Pinned: the decision buttons are the point of the row, and on a table
      // this wide they were the first thing to scroll out of sight. The cell
      // carries the row's own background so the columns pass underneath.
      id === "actions" && "sticky right-0 border-l border-border bg-card",
      id === "actions" &&
        !head &&
        "cursor-default py-1 group-hover/row:bg-muted/50"
    )

  const context = {
    controls,
    everyone,
    requiredSkills,
    onDecide,
    onOpenProfile,
  }

  return (
    <ApplicantTableContext.Provider value={context}>
      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((head) => (
                  <TableHead
                    key={head.id}
                    className={cellClass(head.column.id, true)}
                  >
                    {head.isPlaceholder ? null : (
                      <table.FlexRender header={head} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {sections.map((section) => (
              <React.Fragment key={section.key}>
                {/* A run's heading is a row of its own spanning the table, so
                  New and Earlier stay one table with one set of columns
                  rather than two tables that line up by coincidence. */}
                {section.heading && (
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell
                      colSpan={span}
                      className="py-2 whitespace-normal"
                    >
                      {section.heading}
                    </TableCell>
                  </TableRow>
                )}
                {section.rows.map((applicant) => {
                  const row = rowsById.get(applicant.id)
                  if (!row) return null
                  return (
                    <TableRow
                      key={applicant.id}
                      className="group/row cursor-pointer"
                      onClick={(event) => onRowClick(event, applicant.id)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          data-row-actions={
                            cell.column.id === "select" ||
                            cell.column.id === "actions"
                              ? true
                              : undefined
                          }
                          className={cellClass(cell.column.id)}
                        >
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </ApplicantTableContext.Provider>
  )
}

/** A header filter's options, one of which is always picked ("Any …"). */
function HeaderRadios({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const name = React.useId()

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        Filter by {label.toLowerCase()}
      </span>
      <RadioGroup
        aria-label={label}
        className="max-h-56 gap-2 overflow-y-auto p-px"
        value={value}
        onValueChange={(next) => onChange(String(next))}
      >
        {options.map((option) => {
          const id = `${name}-${option.value || "any"}`
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
  const picking = React.useContext(PickingContext)

  return (
    // Around the whole menu, not inside it: a menu's items unmount when it
    // closes, and the dialog one of them opens has to outlive that.
    <ScheduleInterview applicant={applicant}>
      {(interview) => (
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
              <DropdownMenuItem
                onClick={() => onDecide(applicant.id, "contacted")}
              >
                <MailIcon />
                Message
              </DropdownMenuItem>
              <DropdownMenuItem onClick={interview.open}>
                {interview.booking ? (
                  <CalendarCheckIcon />
                ) : (
                  <CalendarPlusIcon />
                )}
                {interview.booking
                  ? "Reschedule interview"
                  : "Set up interview"}
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="md:hidden" />

            <DropdownMenuGroup>
              {picking && (
                <DropdownMenuItem onClick={() => picking.askAbout([applicant])}>
                  <SparklesIcon />
                  Ask Athena
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <DownloadIcon />
                Download CV
              </DropdownMenuItem>
              {/* Calling is reaching out, so it moves the row the way Message
              does — it is in here rather than on the card only because it is
              the rarer of the two. */}
              <DropdownMenuItem
                onClick={() => onDecide(applicant.id, "contacted")}
              >
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
      )}
    </ScheduleInterview>
  )
}

function useCollapseNavBelow(minWidth: number) {
  const { open, setOpen } = useSidebar()
  // Giving the nav back goes through Athena, who may be using the room.
  const { restoreNav } = useAthena()

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
  const restoreNavRef = React.useRef(restoreNav)
  React.useEffect(() => {
    openRef.current = open
    setOpenRef.current = setOpen
    restoreNavRef.current = restoreNav
  }, [open, setOpen, restoreNav])

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
        restoreNavRef.current()
      }
    }

    apply()
    query.addEventListener("change", apply)

    return () => {
      query.removeEventListener("change", apply)
      // Give it back on the way out: the next screen does not need the room.
      if (collapsedByUs.current) {
        collapsedByUs.current = false
        restoreNavRef.current()
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
  preferredLocations,
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
  /** Everywhere they would go, "Anywhere" excluded — see `CandidateListBody`. */
  preferredLocations: string[]
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
    filters.location.length > 0 ||
    filters.preferred.length > 0

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
        options={sortOptions(sort)}
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

      <PanelField label="Current location">
        <LocationPicker
          label="Current location"
          placeholder="Search locations"
          options={locations}
          chosen={filters.location}
          onChange={(location) => onChange({ location })}
        />
      </PanelField>

      <PanelField label="Preferred location">
        <LocationPicker
          label="Preferred location"
          placeholder="Search locations"
          options={preferredLocations}
          chosen={filters.preferred}
          onChange={(preferred) => onChange({ preferred })}
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
        {/* LABELLED, AND KEPT AT EVERY WIDTH. It is a menu, so it cannot fold
            into the overflow menu the way the two icons below do, and its
            label is its state — "Saved" is the only place a card says so. */}
        <SaveToList applicant={applicant} />

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

          <ScheduleInterview applicant={applicant}>
            {(interview) => (
              <IconAction label={interview.label} onClick={interview.open}>
                {interview.booking ? (
                  <CalendarCheckIcon />
                ) : (
                  <CalendarPlusIcon />
                )}
              </IconAction>
            )}
          </ScheduleInterview>
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
  top,
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
  /** Height of the sticky tab block, which is all that is above this. */
  top: number
  applicants: Applicant[]
  /** The same people, under their run headings — see `ApplicantList`. */
  sections: ListRun[]
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
    // `-mt-4`: the list column below is flush against the tab toolbar, the way
    // the cards view's filter rail is, so this block starts where the toolbar
    // ends rather than a gap below it. The CV pane puts the gap back for
    // itself with `pt-4`.
    //
    // THE HEIGHT IS MEASURED, NOT GUESSED, AND IT REACHES THE BOTTOM EDGE. It
    // used to be `100svh` minus the header and a hand-counted constant, which
    // was wrong by however much the tab block's own height differed from the
    // guess — and that block wraps, so its height is data. `top` is its
    // measured height (the same number the filter rail sticks below), and the
    // block sits directly under the header, so the two together are everything
    // above this: the height is the rest of the screen.
    //
    // `SPLIT_CHROME` is then cancelled as a NEGATIVE BOTTOM MARGIN rather than
    // taken off the height. It is the page's own padding, and this view wants
    // the edge — subtracting it instead left the columns stopping 44px short
    // with a band of mist under them.
    <div
      style={
        {
          "--split-top": `calc(var(--header-height) + ${top}px)`,
          "--split-chrome": `${SPLIT_CHROME}px`,
        } as React.CSSProperties
      }
      className="flex flex-col gap-4 @3xl/main:-mt-4 @3xl/main:mb-[calc(var(--split-chrome)*-1)] @3xl/main:h-[calc(100svh-var(--split-top))] @3xl/main:flex-row"
    >
      {/* Each column scrolls on its own, which is the whole point of the
          layout — reading a career should not move the list you are working
          through. Below the breakpoint they stack and the page scrolls
          normally, because two scroll areas on a phone is a trap.

          THE LIST IS THE FILTER RAIL'S COLUMN, not a floating card. Both are
          "the column beside the work", so at `@3xl` this drops the rounding,
          the ring and the card fill, runs flush against the nav (the negative
          margin cancels the page gutter) and divides with a `border-r` — and
          its run headings pin themselves the way the rail's heading does. A
          rounded card here and a flush column one view away was the same
          furniture in two shapes. Below the breakpoint the columns stack and
          it goes back to being a card, because nothing is beside it to be a
          column against. */}
      <div
        role="list"
        className="relative flex shrink-0 flex-col gap-1 overflow-y-auto rounded-2xl bg-card p-1.5 ring-1 ring-foreground/10 @3xl/main:-ml-4 @3xl/main:w-80 @3xl/main:gap-0 @3xl/main:rounded-none @3xl/main:border-r @3xl/main:bg-background @3xl/main:p-0 @3xl/main:ring-0 lg:@3xl/main:-ml-6"
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
      <div className="relative min-w-0 flex-1 overflow-y-auto p-px @3xl/main:pt-4">
        {selected ? (
          <div className="flex flex-col gap-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                {/* The card's header, so the same size as the card's avatar. */}
                <ApplicantAvatar
                  name={selected.name}
                  photo={selected.photo}
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
                <SaveToList applicant={selected} />
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
                onDocChange(String(value) === "profile" ? "profile" : "cv")
              }
            >
              {/* CV first, in the same order as the profile panel's tabs. */}
              <TabsList>
                <TabsTrigger value="cv">CV</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <CandidateDetail
                  applicant={selected}
                  required={requiredSkills}
                  layout="pane"
                />
              </TabsContent>

              <TabsContent value="cv">
                <CandidateCv applicant={selected} required={requiredSkills} />
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
        "group/split flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors @3xl/main:rounded-none",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        selected ? "bg-muted" : "hover:bg-muted/60"
      )}
    >
      {/* The dot's cut-out follows the row's own background, which is muted
          when selected or hovered rather than the card's. */}
      <ApplicantAvatar
        name={applicant.name}
        photo={applicant.photo}
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
/**
 * The cards view's filters as a rail beside the list — the Refine card on
 * Insights, holding the same sort, search and three filters as `FilterBar`.
 *
 * SAME SHAPE AS INSIGHTS: a "Refine" heading with a count of what is on and a
 * Clear all that only exists when there is something to clear, then one
 * collapsible section per filter. The difference is that these filters pick ONE
 * value (the URL holds a single `exp`, `notice`, `location`), so the options are
 * radios with "Any" at the top rather than checkboxes.
 *
 * THE NUMBER BESIDE AN OPTION is how many people on this posting it would leave,
 * with the other filters held as they are — Insights' share, in the unit this
 * screen counts in. An option that would leave nobody says 0 before you spend
 * the click finding out.
 */
function FilterRail({
  filters,
  sort,
  locations,
  preferredLocations,
  people,
  top,
  onChange,
  onSort,
  onClear,
}: Omit<React.ComponentProps<typeof FilterPanel>, "layout"> & {
  people: Applicant[]
  /** Height of the sticky tab block the rail sticks beneath. */
  top: number
}) {
  const { searchLabel } = useListCopy()
  const [open, setOpen] = React.useState(
    () => new Set(["sort", "exp", "notice", "location", "preferred"])
  )

  const count =
    (filters.q ? 1 : 0) +
    (filters.exp ? 1 : 0) +
    (filters.notice ? 1 : 0) +
    filters.location.length +
    filters.preferred.length

  const leaves = (updates: Partial<Filters>) =>
    people.filter((person) =>
      matchesFilters(person, { ...filters, ...updates })
    ).length

  /**
   * A section is radios by default. `render` replaces them where the filter is
   * not one-of-a-list — the two location pickers — and `on` is how many values
   * it holds, for the badge on the heading, which radios answer with 1.
   */
  const sections: {
    key: string
    title: string
    value?: string
    options?: { value: string; label: string; count?: number }[]
    onSelect?: (value: string) => void
    render?: React.ReactNode
    on?: number
  }[] = [
    {
      key: "sort",
      title: "Sort by",
      value: sort,
      options: sortOptions(sort),
      onSelect: onSort,
    },
    {
      key: "exp",
      title: "Experience",
      value: filters.exp,
      options: [
        { value: "", label: "Any experience", count: leaves({ exp: "" }) },
        ...EXPERIENCE_BANDS.map(({ value, label }) => ({
          value,
          label,
          count: leaves({ exp: value }),
        })),
      ],
      onSelect: (exp) => onChange({ exp }),
    },
    {
      key: "notice",
      title: "Notice period",
      value: filters.notice,
      options: [
        {
          value: "",
          label: "Any notice period",
          count: leaves({ notice: "" }),
        },
        ...NOTICE_BANDS.map(({ value, label }) => ({
          value,
          label,
          count: leaves({ notice: value }),
        })),
      ],
      onSelect: (notice) => onChange({ notice }),
    },
    {
      key: "location",
      title: "Current location",
      on: filters.location.length,
      render: (
        <LocationPicker
          label="Current location"
          placeholder="Search locations"
          options={locations}
          chosen={filters.location}
          onChange={(location) => onChange({ location })}
          // What the list would hold with this city added, not instead of the
          // ones already picked — a second city widens the list.
          countFor={(city) => leaves({ location: [...filters.location, city] })}
        />
      ),
    },
    // WHERE THEY WOULD GO, not where they are. On a posting in one city this
    // is the question that finds the people worth a conversation who are not
    // there yet, and the count beside each city says how many that is before
    // you spend the click.
    {
      key: "preferred",
      title: "Preferred location",
      on: filters.preferred.length,
      render: (
        <LocationPicker
          label="Preferred location"
          placeholder="Search locations"
          options={preferredLocations}
          chosen={filters.preferred}
          onChange={(preferred) => onChange({ preferred })}
          countFor={(city) =>
            leaves({ preferred: [...filters.preferred, city] })
          }
        />
      ),
    },
  ]

  // A FIXED COLUMN, NOT A FLOATING CARD. It is flush against the nav edge and
  // the tab block (the negative margin cancels the page gutter), exactly as
  // tall as the screen below that block, and sticky there — so the heading and
  // search never move and only the sections scroll, inside it.
  return (
    <aside
      aria-label="Sort and filter"
      style={{ top, height: `calc(100svh - ${top}px)` }}
      className="hidden shrink-0 flex-col border-r bg-background @4xl/main:sticky @4xl/main:-ml-4 @4xl/main:flex @4xl/main:w-64 lg:@4xl/main:-ml-6"
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
        <span className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
          Filters
          {count > 0 && (
            <Badge variant="secondary" className="px-1.5">
              {count}
            </Badge>
          )}
        </span>

        {count > 0 && (
          <Button variant="link" size="sm" className="px-0" onClick={onClear}>
            Reset all
          </Button>
        )}
      </div>

      <div className="relative shrink-0 px-4 pt-3 pb-3">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(event) => onChange({ q: event.target.value })}
          placeholder="Search name, role or skill"
          aria-label={searchLabel}
          className="pl-9"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {sections.map((section) => {
          const isOpen = open.has(section.key)
          const Chevron = isOpen ? ChevronDownIcon : ChevronRightIcon
          const on =
            section.on ?? (section.key !== "sort" && section.value ? 1 : 0)

          return (
            <div key={section.key} className="border-t border-border py-3">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpen((current) => {
                    const next = new Set(current)
                    if (next.has(section.key)) next.delete(section.key)
                    else next.add(section.key)
                    return next
                  })
                }
                className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium"
              >
                <span className="flex items-center gap-2">
                  {section.title}
                  {on > 0 && (
                    <Badge variant="secondary" className="px-1.5">
                      {on}
                    </Badge>
                  )}
                </span>
                <Chevron
                  className="size-4 shrink-0 opacity-50"
                  aria-hidden="true"
                />
              </button>

              {isOpen && section.render && (
                <div className="mt-2.5">{section.render}</div>
              )}

              {isOpen && section.options && (
                <RadioGroup
                  aria-label={section.title}
                  className="mt-2.5 gap-2.5"
                  value={section.value}
                  onValueChange={(next) => section.onSelect?.(String(next))}
                >
                  {section.options.map((option) => {
                    const id = `rail-${section.key}-${option.value || "any"}`

                    return (
                      <Label
                        key={id}
                        htmlFor={id}
                        className="items-center gap-2 font-normal"
                      >
                        <RadioGroupItem id={id} value={option.value} />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {option.label}
                        </span>
                        {option.count !== undefined && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {option.count}
                          </span>
                        )}
                      </Label>
                    )
                  })}
                </RadioGroup>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

/**
 * What the rail is narrowing by, as chips above the cards — the Insights
 * applied bar. Each chip removes its one filter, so undoing a filter does not
 * mean scrolling the rail back to the section it lives in.
 *
 * ONLY BESIDE THE RAIL. Below @4xl the pills are showing instead, and a pill
 * already says its value and resets from its own menu; two rows saying the
 * same thing would be one too many. Sort is not a chip: it orders the list but
 * leaves everybody in it.
 */
function AppliedFilters({
  filters,
  matched,
  total,
  onChange,
  onClear,
}: Omit<React.ComponentProps<typeof FilterPanel>, "layout">) {
  const chips = [
    filters.q && {
      key: "q",
      label: `“${filters.q}”`,
      remove: () => onChange({ q: "" }),
    },
    filters.exp && {
      key: "exp",
      label:
        EXPERIENCE_BANDS.find((band) => band.value === filters.exp)?.label ??
        filters.exp,
      remove: () => onChange({ exp: "" }),
    },
    filters.notice && {
      key: "notice",
      label:
        NOTICE_BANDS.find((band) => band.value === filters.notice)?.label ??
        filters.notice,
      remove: () => onChange({ notice: "" }),
    },
    // ONE CHIP PER CITY, not one per filter: the filters hold lists now, and a
    // single "3 locations" chip would make dropping one of them a trip back to
    // the rail.
    ...filters.location.map((city) => ({
      key: `location:${city}`,
      label: city,
      remove: () =>
        onChange({ location: filters.location.filter((c) => c !== city) }),
    })),
    ...filters.preferred.map((city) => ({
      key: `preferred:${city}`,
      // Said with its sense, because "Pune" alone would read as the current
      // city chip that may be sitting right beside it.
      label: `Open to ${city}`,
      remove: () =>
        onChange({ preferred: filters.preferred.filter((c) => c !== city) }),
    })),
  ].filter(Boolean) as { key: string; label: string; remove: () => void }[]

  if (chips.length === 0) return null

  return (
    <div className="mb-4 hidden flex-wrap items-center gap-2 @4xl/main:flex">
      <span className="text-sm">
        <span className="font-medium tabular-nums">{matched}</span>{" "}
        <span className="text-muted-foreground">of {total} match</span>
      </span>

      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          className="inline-flex items-center gap-1 rounded-4xl border border-border bg-muted/40 py-1 pr-1.5 pl-2.5 text-xs transition-colors hover:bg-muted"
        >
          {chip.label}
          <XIcon className="size-3 text-muted-foreground" />
          <span className="sr-only">Remove {chip.label}</span>
        </button>
      ))}

      <Button
        variant="link"
        size="sm"
        className="h-auto px-0 text-xs"
        onClick={onClear}
      >
        Clear all
      </Button>
    </div>
  )
}

function FilterBar(
  // The bar takes exactly what the panel takes, because it hands the whole lot
  // straight to it — `layout` is the one thing it decides for itself.
  props: Omit<React.ComponentProps<typeof FilterPanel>, "layout">
) {
  const {
    filters,
    sort,
    locations,
    preferredLocations,
    matched,
    total,
    onChange,
    onSort,
    onClear,
  } = props
  const isMobile = useIsMobile()
  const { searchLabel, filterTitle } = useListCopy()
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  /**
   * THE BAR IS A DRAFT, APPLIED ON A BUTTON. Picking a band no longer moves
   * the list under you: the pills and the drawer write here, and only Apply
   * puts it in the URL. Two filters that belong together — "12+ years, in
   * Pune" — can be set as one thought and land as one change, instead of the
   * list shuffling and the counts moving twice on the way to a question that
   * was never asked.
   *
   * SORT IS NOT IN IT. It orders the list and removes nobody, so there is
   * nothing to weigh before committing to it; holding it back behind Apply
   * would be a button in front of a control that is already reversible by
   * picking again.
   *
   * It FOLLOWS the URL when the URL changes from somewhere else — a chip
   * dropped from the applied bar, a table header, the rail at a wider size, a
   * pasted link. Derived during render rather than in an effect, the way the
   * database's search box follows its query.
   */
  const [draft, setDraft] = React.useState<Filters>(filters)
  const [followed, setFollowed] = React.useState<Filters>(filters)
  if (!sameFilters(followed, filters)) {
    setFollowed(filters)
    setDraft(filters)
  }

  const edit = (updates: Partial<Filters>) =>
    setDraft((current) => ({ ...current, ...updates }))

  const dirty = !sameFilters(draft, filters)
  const active =
    Boolean(draft.q) ||
    Boolean(draft.exp) ||
    Boolean(draft.notice) ||
    draft.location.length > 0 ||
    draft.preferred.length > 0

  const apply = () => {
    onChange(draft)
    setDrawerOpen(false)
  }
  const clear = () => {
    setDraft(EMPTY_FILTERS)
    onClear()
    setDrawerOpen(false)
  }

  /** Apply and Clear, in the bar and again in the drawer's footer. */
  const actions = (
    <>
      <Button size="sm" disabled={!dirty} onClick={apply}>
        Apply
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!active && !dirty}
        onClick={clear}
      >
        Clear
      </Button>
    </>
  )

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
      options: sortOptions(sort),
      onSelect: onSort,
      narrows: false,
    },
    {
      key: "exp",
      title: "Experience",
      value: draft.exp,
      options: [
        { value: "", label: "Any experience" },
        ...EXPERIENCE_BANDS.map(({ value, label }) => ({ value, label })),
      ],
      onSelect: (exp: string) => edit({ exp }),
      narrows: true,
    },
    {
      key: "notice",
      title: "Notice period",
      value: draft.notice,
      options: [
        { value: "", label: "Any notice period" },
        ...NOTICE_BANDS.map(({ value, label }) => ({ value, label })),
      ],
      onSelect: (notice: string) => edit({ notice }),
      narrows: true,
    },
  ]

  /**
   * The two location pills. They are not in `pills` because they are not one
   * of a list any more — each opens a picker, and its label has to say how
   * many cities are in it rather than name the one.
   */
  const places: {
    key: string
    title: string
    empty: string
    one: (city: string) => string
    many: (count: number) => string
    options: string[]
    chosen: string[]
    onChange: (next: string[]) => void
  }[] = [
    {
      key: "location",
      title: "Current location",
      empty: "Any current location",
      one: (city) => city,
      many: (count) => `${count} current locations`,
      options: locations,
      chosen: draft.location,
      onChange: (location) => edit({ location }),
    },
    {
      key: "preferred",
      title: "Preferred location",
      empty: "Any preferred location",
      one: (city) => `Open to ${city}`,
      many: (count) => `Open to ${count} locations`,
      options: preferredLocations,
      chosen: draft.preferred,
      onChange: (preferred) => edit({ preferred }),
    },
  ]

  return (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
      {/* Not sticky itself — it rides inside the tab row's sticky block, which
          owns the background, border and bleed. */}
      <div className="flex flex-wrap items-center gap-2">
        {/* SEARCH IS AN ICON. Shrinking it to a glyph is only safe because the
            field it stands for is one click away in both modes — a popover on
            a pointer, the drawer on a phone. The dot says a query is running
            while the box is not on screen to say so itself. */}
        {isMobile ? (
          <PillTrigger
            icon
            label={`${searchLabel} and filter`}
            marked={Boolean(draft.q)}
            onClick={() => setDrawerOpen(true)}
          />
        ) : (
          <Popover>
            <PopoverTrigger
              render={
                <PillTrigger
                  icon
                  label={searchLabel}
                  marked={Boolean(draft.q)}
                />
              }
            />
            <PopoverContent align="start" className="w-72 p-2">
              {/* Enter applies, so the common case — type a name, press
                  Return — costs no trip to the button. */}
              <Input
                autoFocus
                value={draft.q}
                onChange={(event) => edit({ q: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && dirty) apply()
                }}
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

        {/* THE PLACES ARE PICKERS, NOT MENUS. Every other pill picks one of a
            fixed set of bands written in `applicants.ts`; these are built from
            the cities the applicants actually live in, so the list is data,
            and each holds several. On a pointer the pill opens the picker in
            a popover; on a phone it opens the drawer with everything else,
            because five popovers have nowhere to anchor at that width. */}
        {places.map((place) => {
          const label =
            place.chosen.length === 0
              ? place.empty
              : place.chosen.length === 1
                ? place.one(place.chosen[0])
                : place.many(place.chosen.length)

          if (isMobile) {
            return (
              <PillTrigger
                key={place.key}
                label={label}
                marked={place.chosen.length > 0}
                onClick={() => setDrawerOpen(true)}
              />
            )
          }

          return (
            <Popover key={place.key}>
              <PopoverTrigger
                render={
                  <PillTrigger label={label} marked={place.chosen.length > 0} />
                }
              />
              <PopoverContent align="start" className="w-64 gap-0 p-3">
                <LocationPicker
                  label={place.title}
                  placeholder="Search locations"
                  options={place.options}
                  chosen={place.chosen}
                  onChange={place.onChange}
                />
              </PopoverContent>
            </Popover>
          )
        })}

        {/* THE COUNT IS OF THE APPLIED LIST, so it steps aside while there are
            unapplied changes rather than sitting beside pills it does not
            describe. Apply is what makes it true again. */}
        {active && !dirty && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {matched} of {total} match
          </span>
        )}

        {/* Right of the row, so the pills read left to right as the filter and
            the buttons are what you do about it. */}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{filterTitle}</DrawerTitle>
          <DrawerDescription>
            {dirty ? "Not applied yet" : `${matched} of ${total} match`}
          </DrawerDescription>
        </DrawerHeader>

        {/* The same draft the pills write, so opening the drawer after setting
            a pill shows what is pending rather than what is applied. */}
        <div className="overflow-y-auto px-4 pb-4">
          <FilterPanel
            {...props}
            filters={draft}
            onChange={edit}
            onClear={clear}
            layout="drawer"
          />
        </div>

        <DrawerFooter className="flex-row justify-end">{actions}</DrawerFooter>
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
 * CITIES ARE PICKED, NOT CHOSEN ONE AT A TIME: a box you type into, the list
 * narrowing as you do, and a chip for each city you take — shadcn's Combobox
 * in its `multiple` shape (`ComboboxChips` + `ComboboxChipsInput`), which is
 * the control this already wanted to be.
 *
 * It replaced radios. A role in one city is usually open to the ones around
 * it, and with one value per filter seeing who was in reach of three cities
 * meant running the list three times. The chips are also the only "clear" this
 * needs: removing the last one turns the filter off, so there is no "Any city"
 * option sitting at the top of a list pretending to be a city.
 *
 * THE COMPONENT BRINGS WHAT A HAND-ROLLED ONE DID NOT: Backspace deletes the
 * chip behind the caret, the chips are a real focusable list rather than
 * buttons, and the popup anchors, flips and sizes itself against the input. A
 * first pass built this out of `Command` and had none of it.
 *
 * `autoHighlight` is not decoration. Without it nothing is highlighted until
 * you press an arrow key, so typing "pun" and pressing Return did nothing at
 * all — and typing then Return is how anybody uses a box like this.
 *
 * `countFor` is the rail's "how many people this would leave" — the count for
 * the list AS IT WOULD BE with this city added, since a second city widens
 * rather than narrows. Where there is no room for it (a popover, a table
 * header) it is left out rather than shown wrong.
 */
function LocationPicker({
  label,
  placeholder,
  options,
  chosen,
  onChange,
  countFor,
}: {
  label: string
  placeholder: string
  options: string[]
  chosen: string[]
  onChange: (next: string[]) => void
  countFor?: (city: string) => number
}) {
  return (
    <Combobox
      items={options}
      multiple
      autoHighlight
      value={chosen}
      onValueChange={onChange}
    >
      <ComboboxChips className="w-full" aria-label={label}>
        <ComboboxValue>
          {chosen.map((city) => (
            <ComboboxChip key={city} aria-label={city}>
              {city}
            </ComboboxChip>
          ))}
        </ComboboxValue>
        {/* The placeholder goes once there are chips: it is the label for an
            empty box, and beside three cities it reads as a fourth. */}
        <ComboboxChipsInput
          placeholder={chosen.length > 0 ? "" : placeholder}
        />
      </ComboboxChips>

      <ComboboxContent>
        <ComboboxEmpty>No matching location.</ComboboxEmpty>
        <ComboboxList>
          {(city: string) => (
            <ComboboxItem key={city} value={city}>
              <span className="min-w-0 flex-1 truncate">{city}</span>
              {countFor && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {countFor(city)}
                </span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
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
