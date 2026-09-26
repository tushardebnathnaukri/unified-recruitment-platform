import * as React from "react"
import { useSearchParams } from "react-router"
import { CandidatePanel } from "@/components/candidate-panel"
import { useAthena } from "@/components/athena-provider"
import { useDecisions } from "@/components/decisions-provider"
import { DataTableViewOptions } from "@/components/data-table/view-options"
import { visibilityFrom, visibilityParams } from "@/lib/table-columns"
import { aboutCandidate, compareCandidates } from "@/lib/athena"
import {
  CandidateSourceContext,
  candidateHref,
  type CandidateSource,
} from "@/lib/candidate-source"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
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
import { cn } from "@workspace/ui/lib/utils"
import {
  matchesFilters,
  sortApplicants,
  sortParam,
  type Filters,
  type Applicant,
  type ApplicantStatus,
  type ResponseBucket,
} from "@/lib/applicants"
import { ListSourceContext, type ListSource } from "@/lib/list-source"
import { toast } from "@workspace/ui/components/toast"
import type { Verdict } from "@/lib/criteria"
import { ApplicantListSkeleton } from "@/components/skeletons"
import { usePageLoading } from "@/lib/use-page-loading"
import {
  BUCKETS,
  DEFAULT_BUCKET,
  type Picking,
  PickingContext,
  type TableControls,
  type TableFilters,
  VIEWS,
  type View,
  queueOrder,
} from "@/components/candidate-list/shared"
import { useCollapseNavBelow } from "@/components/use-collapse-nav"
import { SelectionBar } from "@/components/candidate-list/selection"
import { ApplicantList } from "@/components/candidate-list/applicant-list"
import {
  AppliedFilters,
  FilterRail,
} from "@/components/candidate-list/filter-rail"
import { FilterBar } from "@/components/candidate-list/filter-bar"

/**
 * The response manager: the screen itself, and the state each part of it reads.
 *
 * THE PARTS ARE SIBLINGS IN THIS FOLDER — the card, the table, the split view,
 * the list that pages them, the selection bar, and the three shapes the filters
 * take. This file owns the URL, the decisions and the arrangement; each of them
 * owns what it draws. `shared.ts` holds whatever more than one of them needs,
 * so the imports run one way and nothing reaches back up to the screen.
 */

/** The table's header filters are a caller's to supply — see `CandidateList`. */
export type { TableFilters }

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
