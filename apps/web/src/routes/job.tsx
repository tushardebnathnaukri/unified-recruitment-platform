import * as React from "react"
import { useParams, useSearchParams } from "react-router"
import {
  BriefcaseIcon,
  CheckIcon,
  ClockIcon,
  DownloadIcon,
  EllipsisIcon,
  LayoutListIcon,
  MailIcon,
  MapPinIcon,
  Table2Icon,
  UserRoundIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Item, ItemContent } from "@workspace/ui/components/item"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
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
  responseCounts,
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

  const applicants = React.useMemo(
    () =>
      generated.map((applicant) =>
        decisions[applicant.id]
          ? { ...applicant, status: decisions[applicant.id] }
          : applicant
      ),
    [generated, decisions]
  )

  const counts = React.useMemo(() => {
    const tally: Record<ResponseBucket, number> = {
      all: applicants.length,
      new: 0,
      shortlisted: 0,
      contacted: 0,
      rejected: 0,
    }
    for (const applicant of applicants) {
      if (applicant.status !== "reviewed") tally[applicant.status] += 1
    }
    return tally
  }, [applicants])

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
            setParams({ bucket: next === "all" ? null : next })
          }}
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

            <ViewSwitcher
              view={view}
              onChange={(next) =>
                setParams({ view: next === "cards" ? null : next })
              }
            />
          </div>

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
                onDecide={decide}
              />
            </TabsContent>
          ))}
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
 * There is no back control here any more. The header's breadcrumb is the way
 * up, and it is a real link rather than `history.back()` — this page is
 * reachable from a pasted URL, where browser-history back leaves the app.
 */
function JobHeader({ job }: { job: Job }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* One step above the applicant cards' `text-base` titles and one below
            what it was: at `text-xl` it was the loudest thing on a screen whose
            content is the list underneath it, and the breadcrumb overhead is
            already naming the same job. */}
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
  onDecide,
}: {
  applicants: Applicant[]
  bucket: { value: ResponseBucket; label: string }
  view: View
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
 * One applicant, as a card in the same language as a job card.
 *
 * FOUR FACTS AND THREE SKILLS. Experience, notice period and current pay are
 * the three things that disqualify somebody before anybody reads a CV, so they
 * are on the card; everything else about them is a click away. Notice period
 * gets called out when it is immediate, because "can start now" changes what
 * you do with the row and ninety days does not.
 *
 * THE CARD IS NOT A LINK. Its actions are the point, and the profile behind it
 * does not exist yet — a card that navigates to nothing is worse than one that
 * plainly does not navigate. When there is a profile screen, the name becomes
 * the stretched link and these buttons stay where they are.
 */
function ApplicantCard({
  applicant,
  onDecide,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  return (
    <Item className="flex-col items-stretch gap-1.5 bg-card px-5 py-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-heading text-base font-medium">
            {applicant.name}
          </span>
          <ApplicantStatusBadge status={applicant.status} />
        </div>

        <RowActions
          applicant={applicant}
          onDecide={onDecide}
          className="-my-1.5 -mr-2"
        />
      </div>

      <ItemContent className="min-w-0 gap-1.5">
        <Meta separator={false}>
          <MetaItem>
            <BriefcaseIcon />
            {applicant.title} at {applicant.company}
          </MetaItem>
          <MetaItem>
            <MapPinIcon />
            {applicant.location}
          </MetaItem>
        </Meta>

        {/* The same rule the job card carries, dividing the same kind of two
            halves: who this is above it, the numbers you judge them on below. */}
        <Meta className="mt-0.5 border-t border-border pt-2">
          <Fact value={applicant.experienceYears} label="yrs" />
          <Fact value={`₹${applicant.currentCtcLakh}L`} label="current" />
          {applicant.noticeDays === 0 ? (
            <MetaItem>Available now</MetaItem>
          ) : (
            <Fact value={applicant.noticeDays} label="days notice" />
          )}
          <MetaItem>Applied {applicant.appliedAgo}</MetaItem>
        </Meta>

        <div className="flex flex-wrap gap-1.5">
          {applicant.skills.map((skill) => (
            <Badge key={skill} variant="outline" className="font-normal">
              {skill}
            </Badge>
          ))}
        </div>
      </ItemContent>
    </Item>
  )
}

/**
 * A number and what it measures, styled the way the Jobs card styles its
 * counts: the figure in the accent at a step up in size and weight, the word
 * after it left at the grey line's own size.
 *
 * "Available now" stays a plain grey item rather than being forced into this
 * shape — it has no number in it, and inventing one to keep the row uniform
 * would be the tail wagging the dog.
 */
function Fact({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <MetaItem>
      <span className="text-sm font-semibold text-primary">{value}</span>
      {label}
    </MetaItem>
  )
}

function ApplicantStatusBadge({ status }: { status: ApplicantStatus }) {
  switch (status) {
    case "new":
      return <Badge>New</Badge>
    case "shortlisted":
      return <Badge variant="success">Shortlisted</Badge>
    case "contacted":
      return <Badge variant="secondary">Contacted</Badge>
    case "rejected":
      return <Badge variant="outline">Not a fit</Badge>
    case "reviewed":
      return null
  }
}

/**
 * A decision, as a toggle rather than a one-way door — pressing Shortlist on
 * somebody already shortlisted takes it back, because the alternative is a
 * misclick you cannot undo on a screen whose whole job is fast decisions.
 *
 * The pressed state is carried by `aria-pressed` as well as the fill, so it is
 * not colour alone doing the work.
 */
function DecisionButton({
  label,
  pressed,
  tone,
  onClick,
  children,
}: {
  label: string
  pressed: boolean
  tone: "success" | "destructive"
  onClick: () => void
  children: React.ReactNode
}) {
  const pressedClass =
    tone === "success"
      ? "bg-success/10 text-success hover:bg-success/20"
      : "bg-destructive/10 text-destructive hover:bg-destructive/20"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
            className={
              pressed
                ? `rounded-full ${pressedClass}`
                : "rounded-full text-muted-foreground"
            }
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
 * NOTE(design): as with the Jobs card menu, these items are a first guess so
 * the button opens something reviewable. What a recruiter can do to a response
 * — and which of these belong on the card instead — is the design team's call.
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

      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem>
          <UserRoundIcon />
          View profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DownloadIcon />
          Download CV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDecide(applicant.id, "contacted")}>
          <MailIcon />
          Send message
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
 * Shortlist, not a fit, and the overflow menu — the same three controls in both
 * views, so a decision is made the same way whichever one you are in.
 *
 * `relative` matters on the card, where it lifts the cluster above the layer a
 * stretched link would otherwise put over it; it is harmless in a table cell.
 */
function RowActions({
  applicant,
  onDecide,
  className,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
  className?: string
}) {
  const shortlisted = applicant.status === "shortlisted"
  const rejected = applicant.status === "rejected"

  return (
    <div className={cn("relative flex shrink-0 items-center gap-1", className)}>
      <DecisionButton
        label={shortlisted ? "Shortlisted" : "Shortlist"}
        pressed={shortlisted}
        tone="success"
        onClick={() =>
          onDecide(applicant.id, shortlisted ? "reviewed" : "shortlisted")
        }
      >
        <CheckIcon />
      </DecisionButton>

      <DecisionButton
        label={rejected ? "Marked not a fit" : "Not a fit"}
        pressed={rejected}
        tone="destructive"
        onClick={() =>
          onDecide(applicant.id, rejected ? "reviewed" : "rejected")
        }
      >
        <XIcon />
      </DecisionButton>

      <ApplicantActions applicant={applicant} onDecide={onDecide} />
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
