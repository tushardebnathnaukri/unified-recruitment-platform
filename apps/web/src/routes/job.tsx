import * as React from "react"
import { Link, useParams, useSearchParams } from "react-router"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  CalendarPlusIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleHelpIcon,
  ClockIcon,
  DownloadIcon,
  EllipsisIcon,
  EyeIcon,
  LayoutListIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  Trash2Icon,
  TrophyIcon,
  Table2Icon,
  UserRoundIcon,
  XIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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
  applicantsFor,
  EXPERIENCE_BANDS,
  matchesFilters,
  NOTICE_BANDS,
  SHOWING,
  requiredSkillsFor,
  sortApplicants,
  SORTS,
  responseCounts,
  type Filters,
  type Position,
  type Applicant,
  type ApplicantStatus,
  type ResponseBucket,
} from "@/lib/applicants"
import { JOBS, type Job } from "@/lib/jobs"

/** How many cards a page of responses is. */
const PAGE_SIZE = 20

/**
 * Cards or a table, over the same people in the same order.
 *
 * They are not two designs of one thing, they are two densities. A card gives
 * every applicant four lines and room for their skills — good for a shortlist
 * you are reading properly. A table gives them one line and aligns every number
 * into a column, which is the only way to answer "who here is on a short notice
 * period" across a hundred and forty-eight rows. Neither wins; which one you
 * want depends on whether you are reading or comparing.
 */
type View = "cards" | "table"

const BUCKETS: { value: ResponseBucket; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "contacted", label: "Contacted" },
  { value: "rejected", label: "Not a fit" },
]

/**
 * The response manager: one job, and everybody who applied to it.
 *
 * IT IS A TRIAGE SCREEN, NOT A PROFILE READER. The question it answers is
 * "which of these 148 people are worth an hour", so a card carries only what
 * you judge on at a glance — the role they are in now, how long they have been
 * working, what they cost, and how soon they could start — and the decision is
 * two buttons on the card rather than a round trip through a profile. Reading a
 * CV is a screen we have not designed; it is the obvious next one.
 *
 * THE DECISIONS ACTUALLY STICK, in component state. Shortlisting somebody moves
 * them out of New and into Shortlisted and the tab counts follow, because a
 * review of a triage screen where nothing can be triaged tells you nothing
 * about whether the triage works. It resets on reload — there is no backend and
 * this is not pretending otherwise.
 *
 * THE TABS ARE THE SAME SHAPE AS THE JOBS PAGE, down to the count on the
 * trigger and the state living in `?status=`. Two list screens one click apart
 * should not have two different ideas of what a tab is.
 */
export function JobDetailPage() {
  const { jobId } = useParams()
  const job = JOBS.find((candidate) => candidate.id === jobId)

  if (!job) return <JobNotFound />

  // Keyed on the job so switching jobs starts from that job's own data rather
  // than carrying one job's decisions onto another's applicants.
  return <ResponseManager key={job.id} job={job} />
}

function ResponseManager({ job }: { job: Job }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const bucketParam = searchParams.get("bucket")
  const active: ResponseBucket = BUCKETS.some((b) => b.value === bucketParam)
    ? (bucketParam as ResponseBucket)
    : "all"
  const view: View = searchParams.get("view") === "table" ? "table" : "cards"
  const sort = searchParams.get("sort") ?? "recent"

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

  const generated = React.useMemo(() => applicantsFor(job), [job])

  /**
   * Decisions taken in this session, laid over the generated data. An overlay
   * rather than a mutated copy of the list: the list is derived from the job,
   * and only what a recruiter actually changed needs storing.
   */
  const [decisions, setDecisions] = React.useState<
    Record<string, ApplicantStatus>
  >({})

  const all = React.useMemo(
    () =>
      generated.map((applicant) =>
        decisions[applicant.id]
          ? { ...applicant, status: decisions[applicant.id] }
          : applicant
      ),
    [generated, decisions]
  )

  const filters: Filters = {
    q: searchParams.get("q") ?? "",
    showing: searchParams.get("showing") ?? "",
    exp: searchParams.get("exp") ?? "",
    notice: searchParams.get("notice") ?? "",
    location: searchParams.get("location") ?? "",
  }

  /**
   * THE FILTER RUNS BEFORE THE BUCKETS ARE COUNTED, so a tab's number is always
   * the number of rows behind it. The alternative — true bucket totals over a
   * filtered list — puts "New 32" above four rows, and a count that does not
   * describe what it sits on top of is worse than no count.
   */
  const applicants = React.useMemo(
    () =>
      sortApplicants(
        all.filter((applicant) => matchesFilters(applicant, filters)),
        sort
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      all,
      sort,
      filters.q,
      filters.showing,
      filters.exp,
      filters.notice,
      filters.location,
    ]
  )

  /** Only the places somebody actually applied from. */
  const locations = React.useMemo(
    () => [...new Set(all.map((applicant) => applicant.location))].sort(),
    [all]
  )

  const counts = React.useMemo(() => {
    const tally: Record<ResponseBucket, number> = {
      all: applicants.length,
      new: 0,
      reviewing: 0,
      shortlisted: 0,
      contacted: 0,
      rejected: 0,
    }
    for (const applicant of applicants) {
      if (applicant.status !== "seen") tally[applicant.status] += 1
    }
    return tally
  }, [applicants])

  const requiredSkills = React.useMemo(() => requiredSkillsFor(job), [job])

  const decide = (id: string, status: ApplicantStatus) =>
    setDecisions((current) => ({ ...current, [id]: status }))

  return (
    <div className="flex flex-col gap-5 px-4 lg:px-6">
      <JobHeader job={job} />

      {responseCounts(job).all === 0 ? (
        <NoResponsesYet job={job} />
      ) : (
        <Tabs
          className="gap-4"
          value={active}
          onValueChange={(value) => {
            const next = String(value)
            // The scope goes with the tab that owns it. Leaving `showing` set
            // while its control is hidden is a filter narrowing the list from
            // somewhere the recruiter cannot see, which is the worst kind.
            setParams({
              bucket: next === "all" ? null : next,
              showing: next === "all" ? filters.showing || null : null,
            })
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

              THE PANEL IS ON THE LEFT, beside the nav rather than opposite it,
              so the page reads left to right in the order you use it: where am
              I, what am I looking at, and then the things themselves.

              No `order` needed: written first, it stacks above the list on a
              narrow column too, which is where the controls belong when the
              alternative is scrolling past a hundred cards to find them.

              The panel is OUTSIDE the panels, not repeated in each: five
              copies of one search box is five things a screen reader has to
              tell apart, and the input would lose what you typed every time
              you changed tab. */}
          <div className="flex flex-col gap-5 @4xl/main:flex-row @4xl/main:items-start">
            <FilterPanel
              filters={filters}
              scoped={active === "all"}
              sort={sort}
              locations={locations}
              matched={applicants.length}
              total={all.length}
              onChange={(updates) =>
                setParams(
                  Object.fromEntries(
                    Object.entries(updates).map(([key, value]) => [
                      key,
                      value ? value : null,
                    ])
                  )
                )
              }
              onSort={(next) =>
                setParams({ sort: next === "recent" ? null : next })
              }
              onClear={() =>
                setParams({
                  q: null,
                  showing: null,
                  exp: null,
                  notice: null,
                  location: null,
                })
              }
            />

            <div className="flex min-w-0 flex-1 flex-col">
              {BUCKETS.map((bucket) => (
                <TabsContent key={bucket.value} value={bucket.value}>
                  <ApplicantList
                    applicants={
                      bucket.value === "all"
                        ? applicants
                        : applicants.filter((a) => a.status === bucket.value)
                    }
                    bucket={bucket}
                    view={view}
                    requiredSkills={requiredSkills}
                    onDecide={decide}
                  />
                </TabsContent>
              ))}
            </div>
          </div>
        </Tabs>
      )}
    </div>
  )
}

/**
 * The job, restated at the top so you know whose responses these are.
 *
 * It is deliberately thin — the facts that qualify a candidate against this
 * posting (where it is, how long it runs) and nothing else. The job's own
 * editing lives back on the Jobs page; repeating it here would give the same
 * action two homes.
 *
 * The back button is a real link rather than `history.back()`. This page is
 * reachable from a pasted URL and from the message dock, and browser-history
 * back from a fresh tab leaves the app entirely — "up to the list" is a fixed
 * destination, not wherever you happened to come from.
 *
 * It is centred against the whole two-line block rather than sitting on the
 * title's line. The block is one object — a job and the facts about it — so the
 * control that leaves it belongs beside the object, not beside its first line.
 */
function JobHeader({ job }: { job: Job }) {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        nativeButton={false}
        aria-label="Back to all jobs"
        className="shrink-0 rounded-full"
        render={<Link to="/jobs" />}
      >
        <ArrowLeftIcon />
      </Button>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* One step above the applicant cards' `text-base` titles and one
              below what it was: at `text-xl` it was the loudest thing on a
              screen whose content is the list underneath it. */}
          <h2 className="font-heading text-lg font-medium">{job.title}</h2>
          <Badge variant={job.plan === "Pro" ? "secondary" : "outline"}>
            {job.plan}
          </Badge>
          <JobStatusBadge job={job} />
        </div>

        <Meta separator={false}>
          <MetaItem>
            <MapPinIcon />
            {job.location}
          </MetaItem>
          {job.status === "live" && (
            <MetaItem>
              <ClockIcon />
              Expires in {job.expiresInDays} days
            </MetaItem>
          )}
          {job.status === "closed" && (
            <MetaItem>
              <ClockIcon />
              Closed {job.closedOn}
            </MetaItem>
          )}
        </Meta>
      </div>
    </div>
  )
}

function JobStatusBadge({ job }: { job: Job }) {
  switch (job.status) {
    case "live":
      return <Badge variant="success">Live</Badge>
    case "pending":
      return <Badge variant="secondary">In review</Badge>
    case "closed":
      return <Badge variant="outline">{job.outcome}</Badge>
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>
  }
}

/**
 * A posting with no responses, said in the terms of why it has none. A pending
 * job is not empty, it is unpublished — and a recruiter staring at five zeroed
 * tabs would reasonably think something had broken.
 */
function NoResponsesYet({ job }: { job: Job }) {
  const reason =
    job.status === "pending"
      ? "This posting is still with moderation. Applications can only start once it goes live."
      : job.status === "rejected"
        ? "This posting was turned down, so it never went live and never collected applications. Fix the reason and resubmit it."
        : "It has gone live and nobody has applied yet. Recommendations from the database are the faster way in on day one."

  return (
    <Empty className="rounded-2xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserRoundIcon />
        </EmptyMedia>
        <EmptyTitle>No responses yet</EmptyTitle>
        <EmptyDescription>{reason}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
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
 * `visible` resets when the bucket changes because each tab renders its own
 * copy of this component.
 */
function ApplicantList({
  applicants,
  bucket,
  view,
  requiredSkills,
  onDecide,
}: {
  applicants: Applicant[]
  bucket: { value: ResponseBucket; label: string }
  view: View
  requiredSkills: string[]
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  const [visible, setVisible] = React.useState(PAGE_SIZE)

  if (applicants.length === 0) return <EmptyBucket bucket={bucket} />

  const shown = applicants.slice(0, visible)

  return (
    <div className="flex flex-col gap-3">
      {view === "table" ? (
        <ApplicantTable applicants={shown} onDecide={onDecide} />
      ) : (
        <div role="list" className="flex flex-col gap-3">
          {shown.map((applicant) => (
            <ApplicantCard
              key={applicant.id}
              applicant={applicant}
              requiredSkills={requiredSkills}
              onDecide={onDecide}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-3 py-2">
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

function EmptyBucket({
  bucket,
}: {
  bucket: { value: ResponseBucket; label: string }
}) {
  const copy: Record<ResponseBucket, string> = {
    all: "Nobody has applied to this posting yet.",
    new: "Everybody who has applied has been looked at. Nothing is waiting on a first read.",
    reviewing:
      "Nobody is under consideration. The middle button on a card puts somebody here — the pile you want to come back to rather than decide on now.",
    shortlisted:
      "Nobody is shortlisted. Shortlisting somebody from any tab moves them here.",
    contacted:
      "You have not reached out to anybody yet. Contacted candidates are the ones waiting on a reply from you.",
    rejected: "You have not turned anybody down on this posting.",
  }

  return (
    <Empty className="rounded-2xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserRoundIcon />
        </EmptyMedia>
        <EmptyTitle>Nothing in {bucket.label}</EmptyTitle>
        <EmptyDescription>{copy[bucket.value]}</EmptyDescription>
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
  onDecide,
}: {
  applicant: Applicant
  requiredSkills: string[]
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  const { variant } = useCardVariant()
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
          {/* Initials, not a photograph. A recruiter screening on a face is
              the failure mode this whole screen should not encourage, and the
              avatar is here to anchor the row, not to show anybody. */}
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="text-xs">
              {initials(applicant.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-base font-medium">
                {applicant.name}
              </span>
              <ApplicantStatusBadge status={applicant.status} />
            </div>
            <span className="text-sm text-muted-foreground">
              {applicant.title} at {applicant.company}
            </span>
            <Meta>
              <MetaItem>{applicant.location}</MetaItem>
              <MetaItem>Applied {applicant.appliedAgo}</MetaItem>
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
          showAllRoles={showAllRoles}
          onToggleRoles={() => setShowAllRoles((shown) => !shown)}
        />
      ) : (
        <BucketRows
          applicant={applicant}
          roles={roles}
          matched={matched}
          showAllRoles={showAllRoles}
          onToggleRoles={() => setShowAllRoles((shown) => !shown)}
        />
      )}

      <CardActions applicant={applicant} onDecide={onDecide} />
    </Item>
  )
}

type BucketProps = {
  applicant: Applicant
  roles: Position[]
  matched: string[]
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
        Skills match
      </dt>
      <dd className="min-w-0 leading-6">
        <SkillsBucket applicant={applicant} matched={matched} />
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
function BucketColumns({ applicant, roles, matched }: BucketProps) {
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
          Skills match
        </dt>
        <dd className="min-w-0">
          <SkillsBucket applicant={applicant} matched={matched} />
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
}: {
  applicant: Applicant
  matched: string[]
}) {
  if (matched.length === 0) {
    return (
      <span className="text-muted-foreground">
        None of the four the posting asks for
      </span>
    )
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

/** Two letters, so a name that is one word or four still yields two. */
function initials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase()
}

function ApplicantStatusBadge({ status }: { status: ApplicantStatus }) {
  switch (status) {
    case "new":
      return <Badge>New</Badge>
    case "reviewing":
      return <Badge variant="warning">Reviewing</Badge>
    case "shortlisted":
      return <Badge variant="success">Shortlisted</Badge>
    case "contacted":
      return <Badge variant="secondary">Contacted</Badge>
    case "rejected":
      return <Badge variant="outline">Not a fit</Badge>
    case "seen":
      return null
  }
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
      <ToggleGroupItem value="cards" aria-label="Cards">
        <LayoutListIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="table" aria-label="Table">
        <Table2Icon />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

/**
 * The same applicants, one to a line.
 *
 * THE COLUMNS ARE THE CARD'S FACTS, IN THE CARD'S ORDER, so switching view
 * moves the information around rather than changing what there is to know. The
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
  applicants,
  onDecide,
}: {
  applicants: Applicant[]
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Candidate</TableHead>
            <TableHead>Current role</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Exp</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">Notice</TableHead>
            <TableHead>Applied</TableHead>
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
          {applicants.map((applicant) => (
            <TableRow key={applicant.id} className="group/row">
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{applicant.name}</span>
                  <ApplicantStatusBadge status={applicant.status} />
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {applicant.title} at {applicant.company}
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
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * The three decisions, as one segmented control, and the overflow menu beside
 * it.
 *
 * THEY ARE A GROUP BECAUSE THEY ARE ONE QUESTION. Three floating ghost circles
 * said "here are three unrelated buttons"; joined into a segmented control they
 * say "pick one of these", which is what a triage decision is. It is the same
 * `ToggleGroup` the cards/table switcher uses — `variant="outline"` with
 * `spacing={0}` — so the two controls on this screen that mean "choose one"
 * look the same.
 *
 * THE MAYBE IN THE MIDDLE IS THE POINT. Yes and no are the easy half; the
 * reason a recruiter stalls on a list of 148 is the pile they cannot decide
 * about, and with only two buttons that pile has nowhere to go but back on the
 * list to be read again. The order is deliberate too: yes, maybe, no reads as a
 * scale rather than three options in an arbitrary row.
 *
 * DESELECTING IS UNDOING. Base UI lets you click the active item to clear the
 * group, which lands the candidate back on `reviewed` — seen, no decision.
 * That is the right escape from a misclick on a screen built for fast
 * decisions, and it is why this is a toggle group rather than a radio group.
 */
const DECISIONS: {
  value: Extract<ApplicantStatus, "shortlisted" | "reviewing" | "rejected">
  label: string
  icon: LucideIcon
  /** Tint when this one is the active decision. */
  active: string
}[] = [
  {
    value: "shortlisted",
    label: "Shortlist",
    icon: CheckIcon,
    active:
      "bg-success/10 text-success hover:bg-success/20 hover:text-success data-[pressed]:bg-success/10 data-[pressed]:text-success",
  },
  {
    value: "reviewing",
    label: "Reviewing",
    icon: CircleHelpIcon,
    active:
      "bg-warning/10 text-warning hover:bg-warning/20 hover:text-warning data-[pressed]:bg-warning/10 data-[pressed]:text-warning",
  },
  {
    value: "rejected",
    label: "Not a fit",
    icon: XIcon,
    active:
      "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive data-[pressed]:bg-destructive/10 data-[pressed]:text-destructive",
  },
]

function RowActions({
  applicant,
  onDecide,
  className,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
  className?: string
}) {
  const decided = DECISIONS.some(
    (decision) => decision.value === applicant.status
  )

  return (
    <div className={cn("relative flex shrink-0 items-center gap-2", className)}>
      <ToggleGroup
        variant="outline"
        spacing={0}
        aria-label={`Decision for ${applicant.name}`}
        value={decided ? [applicant.status] : []}
        onValueChange={(value) => {
          const next = value[0] as ApplicantStatus | undefined
          onDecide(applicant.id, next ?? "seen")
        }}
      >
        {DECISIONS.map((decision) => (
          <Tooltip key={decision.value}>
            <TooltipTrigger
              render={
                <ToggleGroupItem
                  value={decision.value}
                  aria-label={decision.label}
                  className={
                    applicant.status === decision.value
                      ? decision.active
                      : "text-muted-foreground"
                  }
                />
              }
            >
              <decision.icon />
            </TooltipTrigger>
            <TooltipContent>{decision.label}</TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>

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
            Remove from this job
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
  scoped,
  sort,
  locations,
  matched,
  total,
  onChange,
  onSort,
  onClear,
}: {
  filters: Filters
  /** Whether the scope radios belong here — see below. */
  scoped: boolean
  sort: string
  /** Drawn from the people actually here, so no option can return nothing. */
  locations: string[]
  matched: number
  total: number
  onChange: (updates: Partial<Filters>) => void
  onSort: (sort: string) => void
  onClear: () => void
}) {
  const active =
    Boolean(filters.q) ||
    Boolean(filters.showing) ||
    Boolean(filters.exp) ||
    Boolean(filters.notice) ||
    Boolean(filters.location)

  return (
    <aside
      aria-label="Sort and filter"
      className="flex shrink-0 flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 @4xl/main:sticky @4xl/main:top-4 @4xl/main:max-h-[calc(100svh-var(--header-height)---spacing(8))] @4xl/main:w-64 @4xl/main:overflow-y-auto"
    >
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(event) => onChange({ q: event.target.value })}
          placeholder="Search name, role or skill"
          aria-label="Search responses"
          className="pl-9"
        />
      </div>

      {/* ONLY ON THE ALL TAB. Every other tab IS a scope — New, Shortlisted,
          Not a fit — so a second scope control sitting above it would be two
          answers to one question, and most of the pairs are contradictions:
          "Showing: Reviewed" on the New tab is a guaranteed empty list. All is
          the one tab that has not already narrowed anything, so it is the one
          place these four have something to do. */}
      {scoped && (
        <>
          <PanelRadios
            name="showing"
            label="Showing"
            value={filters.showing}
            options={SHOWING}
            onChange={(showing) => onChange({ showing })}
          />

          <Separator />
        </>
      )}

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
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
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
      <SelectTrigger className="w-full" aria-label={label}>
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
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  const [revealed, setRevealed] = React.useState(false)

  return (
    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
      <Button variant="outline" size="sm">
        <UserRoundIcon data-icon="inline-start" />
        View profile
      </Button>

      {/* Reaching out is what Contacted means, so the button that does it is
          the button that moves the row. */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDecide(applicant.id, "contacted")}
      >
        <MailIcon data-icon="inline-start" />
        Message
      </Button>

      <Button variant="outline" size="sm">
        <CalendarPlusIcon data-icon="inline-start" />
        Set up interview
      </Button>

      {/* GATED, AND IT REVEALS RATHER THAN NAVIGATES. Contact details are what
          a posting is actually being paid for, so a prototype that prints an
          email beside every name has quietly designed the business model away.
          Asking for them is one click and they appear in place — which is also
          the honest shape for whatever this costs in the real product, whether
          that is a credit, a plan, or nothing. */}
      {revealed ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 self-center text-sm">
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
        <Button variant="outline" size="sm" onClick={() => setRevealed(true)}>
          <EyeIcon data-icon="inline-start" />
          View contact details
        </Button>
      )}
    </div>
  )
}

function JobNotFound() {
  return (
    <div className="px-4 lg:px-6">
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BriefcaseIcon />
          </EmptyMedia>
          <EmptyTitle>No such job</EmptyTitle>
          <EmptyDescription>
            This posting does not exist, or it was removed from the account.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
