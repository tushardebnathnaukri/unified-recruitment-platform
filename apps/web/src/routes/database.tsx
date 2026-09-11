import * as React from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { ArrowLeftIcon, ArrowUpIcon } from "lucide-react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd"
import { ListCard } from "@workspace/ui/components/list-card"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import { SectionHeader } from "@workspace/ui/components/section-header"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { BRANDS } from "@workspace/ui/lib/brands"
import { cn } from "@workspace/ui/lib/utils"

import { CandidateList } from "@/components/candidate-list"
import {
  RefinePanel,
  ResultsToolbar,
  type FilterUpdate,
} from "@/components/database-filters"
import { SearchRow } from "@/components/search-row"
import {
  SEARCH_MODES,
  headlineFor,
  modeFor,
  placeholderFor,
  recentSearchesFor,
  resultsFor,
  searchHref,
  toSearchMode,
  type SearchMode,
  type SearchResults,
} from "@/lib/database"
import { matchesFilters } from "@/lib/applicants"
import {
  defaultCriteria,
  scoreFor,
  verdictsFor,
  type Verdict,
} from "@/lib/criteria"
import {
  FILTER_KEYS,
  expansions,
  profileMatches,
  type Profile,
} from "@/lib/database-filters"
import { useFilterVariant } from "@/lib/filter-variant"
import { useDecisions } from "@/components/decisions-provider"
import { JuiceboxHeader, JuiceboxToolbar } from "@/components/juicebox-filters"

/**
 * The resume database — everybody on the product, not only the people who
 * applied. Jobs is who came to you; this is who you go and find.
 *
 * ONE BOX WITH THE MODES UNDER IT, NOT THREE TABS ABOVE THREE FORMS. The live
 * page makes a recruiter choose Keyword, Smart Text or Intelligent JD search
 * before they have typed anything, and each tab is a different form. Here the
 * box comes first and the mode is a property of it, the way Juicebox does it:
 * type or paste, then say how it should be read. The draft survives a switch,
 * so a JD pasted into the keyword box is one click from being read as a JD.
 *
 * WHAT WAS DROPPED FROM KEYWORD SEARCH, AND WHY. The live form carries "mark
 * all keywords as mandatory", "add exclude keywords" and a Boolean switch.
 * Boolean does both of the others — AND is mandatory, NOT is exclude — so it is
 * the one control kept. Experience and location filters are not on this page
 * at all: they belong on the results, where narrowing happens with the count
 * in view, and the two prose modes take them in the text anyway.
 *
 * EVERYTHING THAT DEFINES A SEARCH IS IN THE URL — `mode`, `boolean`, `q` —
 * so a recent row, a link pasted to a colleague and the back button all land on
 * the same search. `q` present means a search was run and the page is its
 * results; absent, the page is composing one and lists the recent ones
 * underneath.
 */
export function DatabasePage() {
  const { brand } = useBrand()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const mode = toSearchMode(params.get("mode"))
  const boolean = mode === "keywords" && params.get("boolean") === "1"
  const query = params.get("q")?.trim() ?? ""

  // The box follows the URL when the URL brings a query — a recent row, a
  // pasted link, the back button. It does NOT empty when the query goes away,
  // so leaving the results for the recents keeps the text you were refining.
  const [draft, setDraft] = React.useState(query)
  const [followed, setFollowed] = React.useState(query)
  if (query !== followed) {
    setFollowed(query)
    if (query) setDraft(query)
  }

  // Changing how the box reads its text is composing a new search, not
  // re-running the old one, so it drops `q`. Replace, not push: a toggle is
  // not somewhere the back button should stop.
  const configure = (next: { mode: SearchMode; boolean: boolean }) =>
    navigate(searchHref(next), { replace: true })

  const run = () => {
    const text = draft.trim()
    if (text) navigate(searchHref({ mode, boolean, query: text }))
  }

  if (query) {
    // Keyed on everything that deals the people, so a different search — or
    // the same one on the other product — starts from its own list rather than
    // inheriting the last one's tab, undo bar and page of cards.
    return (
      <SearchResultsPage
        key={`${brand}:${mode}:${query}`}
        mode={mode}
        boolean={boolean}
        query={query}
      />
    )
  }

  const label = BRANDS.find((entry) => entry.id === brand)?.label ?? brand

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 pb-12 lg:px-6 @3xl/main:pt-8">
      <div className="flex flex-col gap-4">
        {/* The page title is in SiteHeader, so this is a prompt, not an h1. */}
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-2xl font-semibold tracking-tight text-balance">
            Who are you looking for?
          </p>
          <p className="text-sm text-muted-foreground">
            Search everyone on {label} — not only the people who applied.
          </p>
        </div>

        <SearchBox
          mode={mode}
          boolean={boolean}
          value={draft}
          placeholder={placeholderFor(brand, mode, boolean)}
          onChange={setDraft}
          onBooleanChange={(next) => configure({ mode, boolean: next })}
          onSubmit={run}
        />

        <div className="flex flex-col items-center gap-2">
          <ModePicker
            mode={mode}
            onChange={(next) => configure({ mode: next, boolean })}
          />
          {/* Replaces the live page's BETA badges with what the mode does,
              which is the thing a recruiter needs to pick one. */}
          <p className="text-center text-xs text-muted-foreground">
            {modeFor(mode).hint}
          </p>
        </div>
      </div>

      <RecentSearches />
    </div>
  )
}

/**
 * The box. Same construction as the dashboard's requirement box — a borderless
 * textarea inside a raised card — so the two read as the same thing, which they
 * are: the dashboard's hands its text over as a natural-language search.
 *
 * ENTER RUNS IT, EXCEPT FOR A JD. Keywords and a description are one line of
 * intent, so Enter searches and Shift+Enter is the newline. A JD is paragraphs
 * someone is likely editing after the paste, so Enter is a newline there and
 * ⌘/Ctrl+Enter searches — and the box says so, because that is the one
 * exception nobody would guess.
 */
function SearchBox({
  mode,
  boolean,
  value,
  placeholder,
  onChange,
  onBooleanChange,
  onSubmit,
}: {
  mode: SearchMode
  boolean: boolean
  value: string
  placeholder: string
  onChange: (value: string) => void
  onBooleanChange: (value: boolean) => void
  onSubmit: () => void
}) {
  const jd = mode === "jd"

  return (
    <Card className="gap-3 p-4 shadow-lg focus-within:ring-2 focus-within:ring-ring/50">
      {/* `rounded-none` is load-bearing, as on the dashboard: a textarea clips
          its text to its own corners, and with no padding the inherited curve
          shaves the first letter. The height caps keep a long JD scrolling
          inside the card instead of pushing the modes off the screen. */}
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={
          jd
            ? "Job description"
            : mode === "keywords"
              ? "Search keywords"
              : "Describe who you're looking for"
        }
        placeholder={placeholder}
        className={cn(
          "resize-none rounded-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-sm dark:bg-transparent",
          jd ? "max-h-96 min-h-48" : "max-h-48 min-h-12",
          boolean && "font-mono"
        )}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          const submits = jd ? event.metaKey || event.ctrlKey : !event.shiftKey
          if (submits) {
            event.preventDefault()
            onSubmit()
          }
        }}
      />

      <div className="flex min-h-8 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {mode === "keywords" && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch
                size="sm"
                checked={boolean}
                onCheckedChange={(checked) => onBooleanChange(checked)}
              />
              Boolean
            </label>
          )}
          {jd && (
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>↵</Kbd>
              </KbdGroup>
              to search
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* The live page's "Clear Text", kept: a pasted JD is a lot of text
              to select and delete by hand. */}
          {value && (
            <Button variant="ghost" size="sm" onClick={() => onChange("")}>
              Clear
            </Button>
          )}
          <Button
            size="icon-sm"
            className="rounded-full"
            aria-label="Search the database"
            disabled={!value.trim()}
            onClick={onSubmit}
          >
            <ArrowUpIcon />
          </Button>
        </div>
      </div>
    </Card>
  )
}

/**
 * The three ways of reading the box, under it.
 *
 * Unselected pills are muted so the one in use is unmistakable — it changes
 * what the text means, and the outline toggle's own pressed state is only a
 * background tint.
 */
function ModePicker({
  mode,
  onChange,
}: {
  mode: SearchMode
  onChange: (mode: SearchMode) => void
}) {
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      aria-label="How to read the search"
      value={[mode]}
      onValueChange={(value) => {
        // A radio, not a checkbox: pressing the selected pill must not leave
        // the box with no mode at all.
        const next = value[0] as SearchMode | undefined
        if (next) onChange(next)
      }}
      className="flex-wrap justify-center"
    >
      {SEARCH_MODES.map((option) => (
        <ToggleGroupItem
          key={option.id}
          value={option.id}
          className="text-muted-foreground aria-pressed:text-foreground"
        >
          <option.icon data-icon="inline-start" />
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function RecentSearches() {
  const { brand } = useBrand()

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <SectionHeader
        title="Recent searches"
        description="Run one again to see who has joined since"
      />

      <ListCard>
        {recentSearchesFor(brand).map((search) => (
          <SearchRow key={search.id} search={search} />
        ))}
      </ListCard>
    </section>
  )
}

/**
 * A search's results: the response manager's screen, with a search where the
 * job used to be.
 *
 * THE SAME CARDS ON PURPOSE. Deciding on people a search found is the same
 * work as deciding on people who applied — who is worth an hour, who is a
 * maybe, who is out — so it is the same `CandidateList`: the same card, three
 * decisions on it, the same filters and the same profile panel. Somebody who
 * has learned one has learned both, and a change to the card lands on both.
 *
 * LAID OUT AS RESULTS, NOT A QUEUE (`layout="results"`). No decision tabs — a
 * search is a ranked list you read down, so a decision is a badge on the card
 * rather than a move to another tab. Cards only, no table or split. And the
 * filters are a sticky column beside the cards rather than a row of pills,
 * because narrowing is most of what you do to a search. Who is new since you
 * last ran it is the avatar's dot.
 *
 * The rest is said in words: people "updated" rather than "applied", the
 * skills are the ones you searched for, and it opens on Best match — a search
 * has no arrival order worth reading in.
 *
 * `find` is the search-within-results box's key. `q` is already the search.
 */
function SearchResultsPage({
  mode,
  boolean,
  query,
}: {
  mode: SearchMode
  boolean: boolean
  query: string
}) {
  const { brand } = useBrand()
  const [params, setParams] = useSearchParams()
  const results = React.useMemo(
    () => resultsFor(brand, { query, mode }),
    [brand, query, mode]
  )

  /**
   * Who has had their profile opened, for "Hide viewed profiles". Read off the
   * `profile` param as it changes rather than threaded through the list's
   * open handler — the panel is the one place a profile is opened, and the URL
   * already says whose it is.
   */
  const open = params.get("profile")
  const [viewed, setViewed] = React.useState<Set<string>>(() => new Set())
  if (open && !viewed.has(open)) setViewed(new Set(viewed).add(open))

  const { variant } = useFilterVariant()
  const { decided } = useDecisions()

  /**
   * Everything a query string asks of a profile: the panel's filters, the
   * search within, and "Exclude profiles" by what has been decided. One
   * function, because the list, the dialog's live count and every "Expand
   * pool" number have to agree about who matches.
   */
  const matches = React.useCallback(
    (profile: Profile, query: URLSearchParams) =>
      profileMatches(profile, query, viewed, open) &&
      !query.getAll("ex").includes(decided(profile).status) &&
      matchesFilters(profile, {
        q: query.get("find") ?? "",
        exp: "",
        notice: "",
        location: "",
      }),
    [viewed, open, decided]
  )

  /**
   * Juicebox's criteria: `?crit=` repeated, in rank order. Absent means the
   * ones the search implies — a sentence per skill it named — so a fresh
   * search opens with its criteria written out rather than an empty dialog.
   * An explicitly emptied list is kept as one empty `crit`.
   */
  // Joined into a string so the memo below keys on the criteria's text, not
  // on a fresh array from every render.
  const written = params.getAll("crit").join("\n")
  const explicit = params.has("crit")
  const criteria = React.useMemo(
    () =>
      explicit
        ? written.split("\n").filter(Boolean)
        : defaultCriteria(results.requiredSkills),
    [explicit, written, results.requiredSkills]
  )
  const juicebox = variant === "juicebox"

  /**
   * Under Juicebox the criteria decide what is highlighted and who is the best
   * match: every skill a criterion names turns green, and `match` is re-scored
   * with the first criterion weighing most. The refine panel keeps the search's
   * own skills and score.
   */
  const requiredSkills = React.useMemo(
    () =>
      juicebox
        ? [...new Set(criteria.flatMap((text) => results.readSkills(text)))]
        : results.requiredSkills,
    [juicebox, criteria, results]
  )
  /**
   * Each person's verdict on each criterion, worked out once. The cards print
   * them as evidence and `match` is summed from them, so the lines on a card
   * are the reason it ranks where it does.
   */
  const verdicts = React.useMemo(() => {
    const byId = new Map<string, Verdict[]>()
    if (juicebox)
      for (const profile of results.people)
        byId.set(profile.id, verdictsFor(profile, criteria, results.readSkills))
    return byId
  }, [juicebox, criteria, results])

  const scored = React.useMemo(
    () =>
      !juicebox || criteria.length === 0
        ? results.people
        : results.people.map((profile) => ({
            ...profile,
            match: scoreFor(verdicts.get(profile.id) ?? [], profile.match),
          })),
    [juicebox, criteria, results, verdicts]
  )

  const people = React.useMemo(
    () => scored.filter((profile) => matches(profile, params)),
    [scored, matches, params]
  )
  const count = React.useCallback(
    (query: URLSearchParams) =>
      scored.filter((profile) => matches(profile, query)).length,
    [scored, matches]
  )

  /** Merged into the URL, not written over it — the search itself lives there. */
  const update: FilterUpdate = (key, value) => {
    const next = new URLSearchParams(params)
    next.delete(key)
    if (Array.isArray(value)) value.forEach((item) => next.append(key, item))
    else if (value) next.set(key, value)
    setParams(next, { replace: true })
  }
  const clear = () => {
    const next = new URLSearchParams(params)
    for (const key of [...FILTER_KEYS, "find"]) next.delete(key)
    setParams(next, { replace: true })
  }
  /** Every filter from `next`, nothing else — the search and view stay. */
  const apply = (next: URLSearchParams) => {
    const merged = new URLSearchParams(params)
    for (const key of FILTER_KEYS) merged.delete(key)
    for (const key of FILTER_KEYS)
      next.getAll(key).forEach((value) => merged.append(key, value))
    setParams(merged, { replace: true })
  }
  const setCriteria = (next: string[]) => {
    const merged = new URLSearchParams(params)
    merged.delete("crit")
    if (next.length === 0) merged.append("crit", "")
    else next.forEach((text) => merged.append("crit", text))
    setParams(merged, { replace: true })
  }

  const expanded = React.useMemo(
    () => (juicebox ? expansions(params, scored, count) : []),
    [juicebox, params, scored, count]
  )

  const panel = {
    profiles: results.people,
    params,
    onUpdate: update,
    onClear: clear,
    matched: people.length,
  }

  if (juicebox) {
    return (
      <CandidateList
        source="search"
        people={people}
        requiredSkills={requiredSkills}
        defaultSort="match"
        searchKey="find"
        layout="results"
        verdicts={(applicant) => verdicts.get(applicant.id) ?? []}
        toolbar={
          <JuiceboxToolbar
            matched={people.length}
            params={params}
            onUpdate={update}
            defaultSort="match"
          />
        }
        header={
          <JuiceboxHeader
            mode={mode}
            boolean={boolean}
            query={query}
            criteria={criteria}
            onCriteria={setCriteria}
            readSkills={results.readSkills}
            expansions={expanded}
            profiles={results.people}
            params={params}
            count={count}
            onApply={apply}
          />
        }
        empty={<NoMatches mode={mode} boolean={boolean} />}
      />
    )
  }

  return (
    <CandidateList
      source="search"
      people={people}
      requiredSkills={requiredSkills}
      defaultSort="match"
      searchKey="find"
      layout="results"
      sidebar={<RefinePanel {...panel} />}
      toolbar={<ResultsToolbar {...panel} defaultSort="match" />}
      header={
        <SearchHeader
          mode={mode}
          boolean={boolean}
          query={query}
          results={results}
        />
      }
      empty={<NoMatches mode={mode} boolean={boolean} />}
    />
  )
}

/**
 * The search, restated where the job's title sits on a posting — same back
 * button, same two lines — so the two screens are recognisably one.
 *
 * BACK IS EDIT. It returns to the box with this search's text still in it,
 * which is where you would go to change it; a separate "Edit search" beside it
 * would be the same destination twice.
 *
 * THE THIRD LINE IS HOW THE SEARCH WAS READ. The skills it names are the green
 * chips on every card below, so they are said once up here — without that, a
 * recruiter meets "Kafka" highlighted on forty cards and has to work out why.
 * A search that named none has no third line, and no green on its cards.
 */
function SearchHeader({
  mode,
  boolean,
  query,
  results,
}: {
  mode: SearchMode
  boolean: boolean
  query: string
  results: SearchResults
}) {
  const option = modeFor(mode)

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        nativeButton={false}
        aria-label="Back to the search box"
        className="shrink-0 rounded-full"
        render={<Link to={searchHref({ mode, boolean })} />}
      >
        <ArrowLeftIcon />
      </Button>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Clamped: a natural-language search can run to a paragraph, and a
              pasted JD always does. The whole text is one click back. */}
          <h2
            className={cn(
              "line-clamp-2 font-heading text-lg font-medium",
              boolean && "font-mono text-base"
            )}
          >
            {headlineFor(query, mode)}
          </h2>
          <Badge variant="secondary">
            <option.icon data-icon="inline-start" />
            {option.label}
          </Badge>
        </div>

        <Meta>
          <MetaItem className="tabular-nums">
            {results.people.length} profiles
          </MetaItem>
          {results.chips.map((chip) => (
            <MetaItem key={chip}>{chip}</MetaItem>
          ))}
          {results.ranAgo && <MetaItem>Last run {results.ranAgo}</MetaItem>}
        </Meta>

        {results.requiredSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Looking for</span>
            {results.requiredSkills.map((skill) => (
              <Badge key={skill} variant="success" className="font-normal">
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NoMatches({ mode, boolean }: { mode: SearchMode; boolean: boolean }) {
  const option = modeFor(mode)

  return (
    <Empty className="rounded-2xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <option.icon />
        </EmptyMedia>
        <EmptyTitle>Nobody matches</EmptyTitle>
        <EmptyDescription>
          Nobody on the database matches this search. Take a word out, or try it
          as a different kind of search.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to={searchHref({ mode, boolean })} />}
        >
          Edit the search
        </Button>
      </EmptyContent>
    </Empty>
  )
}
