import * as React from "react"
import type {
  Decorator,
  Meta as StoryMeta,
  StoryObj,
} from "@storybook/react-vite"
import {
  ArrowLeftIcon,
  BookmarkIcon,
  CalendarCheckIcon,
  CalendarPlusIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  DownloadIcon,
  EllipsisIcon,
  LayoutListIcon,
  MailIcon,
  PanelsTopLeftIcon,
  SearchIcon,
  SparklesIcon,
  Table2Icon,
  XIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Chip } from "@workspace/ui/components/chip"
import { Item } from "@workspace/ui/components/item"
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
import { cn } from "@workspace/ui/lib/utils"
import { designComposition } from "@workspace/ui/lib/figma"

/**
 * The response manager — one job, and everybody who applied to it. The biggest
 * surface in the prototype.
 *
 * Mirrors `apps/web/src/routes/job.tsx`; the people are a hand-picked few in
 * the shape `apps/web/src/lib/applicants.ts` generates, and the counts are the
 * Principal Engineer job's, a couple of decisions into the day.
 *
 * IT IS A TRIAGE SCREEN, NOT A PROFILE READER. The question it answers is
 * "which of these 148 people are worth an hour", so a card carries only what
 * you judge on at a glance — the role they are in now, how long they have been
 * working, what they cost, how soon they could start — and the decision is on
 * the card rather than a round trip through a profile.
 *
 * IT IS ORGANISED BY DECISION, NOT BY READING. The page opens on To review —
 * everybody without a decision — with the people new since the last visit
 * first. Whether a card was opened is not something the screen tracks.
 */

type Status = "undecided" | "maybe" | "shortlisted" | "contacted" | "rejected"

/** When the recruiter was last here. One user, so a constant — as in the app. */
const LAST_VISIT = "yesterday, 4:10 pm"

const BUCKETS: { value: Status | "all"; label: string; count: number }[] = [
  { value: "undecided", label: "To review", count: 101 },
  { value: "maybe", label: "Maybe", count: 2 },
  { value: "shortlisted", label: "Shortlisted", count: 12 },
  { value: "contacted", label: "Contacted", count: 9 },
  { value: "rejected", label: "Not a fit", count: 24 },
  { value: "all", label: "All", count: 148 },
]

/** The heading counts for To review, from the same job. 30 + 71 = 101. */
const QUEUE = { fresh: 30, earlier: 71, done: 2, arrived: 32 }

const VIEWS = [
  { value: "cards", label: "Cards", icon: LayoutListIcon },
  { value: "table", label: "Table", icon: Table2Icon },
  { value: "split", label: "Split", icon: PanelsTopLeftIcon },
]

const REQUIRED_SKILLS = ["Kubernetes", "Go", "Kafka"]

type Applicant = {
  id: string
  name: string
  title: string
  company: string
  location: string
  appliedAgo: string
  /** Applied since the last visit. */
  fresh: boolean
  status: Status
  experience: string
  positions: { role: string; span: string }[]
  education: string
  skills: string[]
  salary: string
  notice: string
}

const APPLICANTS: Applicant[] = [
  {
    id: "c1",
    name: "Ananya Krishnan",
    title: "Staff Engineer",
    company: "Razorpay",
    location: "Bengaluru",
    appliedAgo: "2 hours ago",
    fresh: true,
    status: "undecided",
    experience: "11 yrs 4 mos",
    positions: [
      { role: "Staff Engineer, Razorpay", span: "2021 — present" },
      { role: "Senior Engineer, Flipkart", span: "2017 — 2021" },
    ],
    education: "B.Tech, IIT Madras",
    skills: ["Kubernetes", "Go", "Terraform", "Kafka"],
    salary: "₹64L",
    notice: "60 days",
  },
  {
    id: "c2",
    name: "Rohit Mehta",
    title: "Engineering Manager",
    company: "Swiggy",
    location: "Bengaluru",
    appliedAgo: "5 hours ago",
    fresh: true,
    status: "undecided",
    experience: "13 yrs 1 mo",
    positions: [
      { role: "Engineering Manager, Swiggy", span: "2020 — present" },
      { role: "Tech Lead, Myntra", span: "2016 — 2020" },
    ],
    education: "M.Tech, IISc Bangalore",
    skills: ["Kubernetes", "Java", "Kafka"],
    salary: "₹78L",
    notice: "90 days",
  },
  {
    id: "c3",
    name: "Meera Kulkarni",
    title: "Senior Engineer",
    company: "CRED",
    location: "Pune",
    appliedAgo: "6 days ago",
    fresh: false,
    status: "undecided",
    experience: "9 yrs 2 mos",
    positions: [
      { role: "Senior Engineer, CRED", span: "2022 — present" },
      { role: "Engineer, Zomato", span: "2018 — 2022" },
    ],
    education: "B.Tech, COEP",
    skills: ["Kafka", "Java", "Redis"],
    salary: "₹48L",
    notice: "30 days",
  },
  {
    id: "c4",
    name: "Priyanka Nair",
    title: "Principal Engineer",
    company: "Postman",
    location: "Remote",
    appliedAgo: "5 days ago",
    fresh: false,
    status: "shortlisted",
    experience: "14 yrs 8 mos",
    positions: [
      { role: "Principal Engineer, Postman", span: "2019 — present" },
      { role: "Architect, ThoughtWorks", span: "2014 — 2019" },
    ],
    education: "B.E., NIT Trichy",
    skills: ["Go", "Kubernetes", "gRPC"],
    salary: "₹92L",
    notice: "Immediate",
  },
  {
    id: "c5",
    name: "Varun Reddy",
    title: "Senior Staff Engineer",
    company: "PhonePe",
    location: "Hyderabad",
    appliedAgo: "2 weeks ago",
    fresh: false,
    status: "maybe",
    experience: "15 yrs 3 mos",
    positions: [
      { role: "Senior Staff Engineer, PhonePe", span: "2020 — present" },
      { role: "Staff Engineer, Amazon", span: "2015 — 2020" },
    ],
    education: "B.Tech, IIIT Hyderabad",
    skills: ["Go", "Kubernetes", "Envoy"],
    salary: "₹98L",
    notice: "90 days",
  },
]

/** New since the last visit AND still waiting — what the dot marks. */
const isNew = (applicant: Applicant) =>
  applicant.fresh && applicant.status === "undecided"

/** Two letters, so a name that is one word or four still yields two. */
function initials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase()
}

/**
 * A badge per decision, and none for the absence of one. Whether somebody is
 * NEW is the avatar's dot, not a badge — "Unread" is not a status any more.
 */
function StatusBadge({ status }: { status: Status }) {
  switch (status) {
    case "maybe":
      return <Badge variant="warning">Maybe</Badge>
    case "shortlisted":
      return <Badge variant="success">Shortlisted</Badge>
    case "contacted":
      return <Badge variant="secondary">Contacted</Badge>
    case "rejected":
      return <Badge variant="outline">Not a fit</Badge>
    case "undecided":
      return null
  }
}

/**
 * Initials, with the "new" dot on the top-right corner. The dot's ring is a
 * cut-out, so it takes the colour of the card it sits on.
 */
function ApplicantAvatar({
  applicant,
  className,
}: {
  applicant: Applicant
  className?: string
}) {
  return (
    <Avatar className={cn("shrink-0", className)}>
      <AvatarFallback>{initials(applicant.name)}</AvatarFallback>
      {isNew(applicant) && (
        <AvatarBadge aria-hidden className="top-0 bottom-auto ring-card" />
      )}
    </Avatar>
  )
}

/**
 * The job, restated at the top so you know whose responses these are.
 *
 * Deliberately thin — the facts that qualify a candidate against this posting
 * and nothing else. Editing the job lives back on the Jobs page; repeating it
 * here would give the same action two homes.
 *
 * The back control is centred against the whole two-line block rather than
 * sitting on the title's line: the block is one object, so the control that
 * leaves it belongs beside the object, not beside its first line.
 */
function JobHeader() {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Back to jobs"
        className="shrink-0"
      >
        <ArrowLeftIcon />
      </Button>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-base font-medium">
            Principal Engineer, Platform Infrastructure
          </span>
          <Badge variant="success">Live</Badge>
        </div>
        <Meta>
          <MetaItem>Bengaluru</MetaItem>
          <MetaItem>Expires in 6 days</MetaItem>
        </Meta>
      </div>
    </div>
  )
}

/**
 * The pill itself, and the search glyph — the same control with its label read
 * out instead of drawn.
 */
function PillTrigger({
  label,
  marked,
  icon,
}: {
  label: string
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
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon ? <SearchIcon className="size-4" /> : label}
      {icon && marked && (
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />
      )}
    </button>
  )
}

/**
 * ONE ROW OF PILLS, IN EVERY VIEW: search, sort, experience, notice, location.
 * They cost a row instead of a column, so no view is the odd one out — and the
 * panel they replaced lives on inside the drawer, which is what every pill
 * opens below `md`.
 *
 * The sort pill switches between MOST RECENT and BEST MATCH (plus most
 * experience and soonest available). In To review it sorts inside New and
 * inside Earlier, never across them. There is no salary filter, deliberately:
 * filtering on current pay ranks people by their last employer's budget.
 *
 * It sits OUTSIDE the tab panels, not repeated in each: five copies of one
 * search box is five things a screen reader has to tell apart, and the query
 * would reset every time you changed tab.
 */
function FilterBar({ sort = "Most recent" }: { sort?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PillTrigger icon label="Search responses" marked />
      <PillTrigger label={sort} marked={false} />
      <PillTrigger label="12+ yrs" marked />
      <PillTrigger label="Any notice period" marked={false} />
      <PillTrigger label="Bengaluru" marked />
    </div>
  )
}

function ViewSwitcher() {
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      aria-label="View"
      defaultValue={["cards"]}
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

const DECISIONS = [
  {
    value: "shortlisted",
    label: "Shortlist",
    icon: CheckIcon,
    active: "bg-success/10 text-success data-[pressed]:bg-success/10",
  },
  {
    value: "maybe",
    label: "Maybe",
    icon: CircleHelpIcon,
    active: "bg-warning/10 text-warning data-[pressed]:bg-warning/10",
  },
  {
    value: "rejected",
    label: "Not a fit",
    icon: XIcon,
    active:
      "bg-destructive/10 text-destructive data-[pressed]:bg-destructive/10",
  },
]

/**
 * Yes, maybe, no — one segmented control, because they are one question.
 * Clicking the active one clears it, which puts the candidate back in To
 * review.
 */
function Decisions({ applicant }: { applicant: Applicant }) {
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      aria-label={`Decision for ${applicant.name}`}
      defaultValue={
        DECISIONS.some((decision) => decision.value === applicant.status)
          ? [applicant.status]
          : []
      }
    >
      {DECISIONS.map((decision) => (
        <ToggleGroupItem
          key={decision.value}
          value={decision.value}
          aria-label={decision.label}
          className={
            applicant.status === decision.value
              ? decision.active
              : "text-muted-foreground"
          }
        >
          <decision.icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/**
 * LinkedIn Recruiter's shape: a column of labels down the left, the facts
 * beside them. Labels give the eye a fixed left edge to run down, so comparing
 * the education of the third and the ninth candidate is a vertical scan rather
 * than a hunt.
 *
 * ONE `grid`, NOT A TWO-COLUMN FLEX PER ROW. A fixed first track means every
 * label in the card shares an edge even when one value wraps to six lines.
 */
function BucketRows({ applicant }: { applicant: Applicant }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-border pt-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        Experience
      </dt>
      <dd className="flex min-w-0 flex-col items-start gap-0.5 leading-6">
        <span>{applicant.experience}</span>
        {applicant.positions.map((position) => (
          <span key={position.role} className="text-muted-foreground">
            {position.role} · {position.span}
          </span>
        ))}
      </dd>

      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        Education
      </dt>
      <dd className="min-w-0 leading-6">{applicant.education}</dd>

      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        Skills
      </dt>
      <dd className="flex min-w-0 flex-wrap gap-1.5">
        {applicant.skills.map((skill) => (
          <Badge
            key={skill}
            variant={REQUIRED_SKILLS.includes(skill) ? "secondary" : "outline"}
          >
            {skill}
          </Badge>
        ))}
      </dd>

      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        Availability
      </dt>
      <dd className="min-w-0 leading-6">
        {applicant.salary} · {applicant.notice} notice
      </dd>
    </dl>
  )
}

/**
 * RIGHT-ALIGNED, under the decision group it shares an edge with. The card has
 * one column of controls down its right side — decide at the top, act at the
 * bottom — instead of controls in one corner and a row starting from the
 * opposite one. On a list this long the right edge is the only part of a card
 * whose position is predictable.
 *
 * Contact details are the exception, pinned left by `mr-auto`: the other three
 * act on a candidate, this discloses a fact about them, and once pressed it is
 * replaced by that fact — so the reveal happens where the button was.
 */
function CardActions() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <Button variant="ghost" size="sm" className="mr-auto">
        Show contact details
      </Button>
      <Button variant="ghost" size="sm">
        <MailIcon data-icon="inline-start" />
        Message
      </Button>
      <Button variant="outline" size="sm">
        View profile
      </Button>
    </div>
  )
}

function ApplicantCard({
  applicant,
  picked = false,
}: {
  applicant: Applicant
  /** Ticked for the selection bar. Every card carries the box. */
  picked?: boolean
}) {
  return (
    <Item className="@container/card flex-col items-stretch gap-3 bg-card px-5 py-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* Beside the photo, on its middle: the tick is about the person. */}
          <Checkbox
            defaultChecked={picked}
            aria-label={`Select ${applicant.name}`}
            className="mt-4"
          />
          {/* Initials, not a photograph. A recruiter screening on a face is
              the failure mode this whole screen should not encourage — the
              avatar is here to anchor the row, not to show anybody. */}
          <ApplicantAvatar applicant={applicant} className="size-12" />

          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-base font-medium">
                {applicant.name}
              </span>
              {isNew(applicant) ? (
                <span className="sr-only">New</span>
              ) : (
                <StatusBadge status={applicant.status} />
              )}
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

        {/* Decide, at the top of the right-hand column. */}
        <div className="-my-1.5 -mr-2 shrink-0">
          <Decisions applicant={applicant} />
        </div>
      </div>

      <BucketRows applicant={applicant} />
      <CardActions />
    </Item>
  )
}

/**
 * The heading over one run of To review. The count is the run's own; the aside
 * is what the run is — for New, how far through today's arrivals you are.
 */
function QueueHeading({
  title,
  count,
  aside,
}: {
  title: string
  count: number
  aside: string
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 pt-2 first:pt-0">
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
  )
}

/**
 * TO REVIEW IS TWO RUNS UNDER HEADINGS — New since the last visit, then
 * Earlier: the day's work in the order you do it. Every other tab is one run
 * of that tab's people, with no heading.
 */
const RUNS = [
  {
    key: "new",
    title: `New since ${LAST_VISIT}`,
    count: QUEUE.fresh,
    aside: `${QUEUE.done} of ${QUEUE.arrived} done`,
    test: (applicant: Applicant) => applicant.fresh,
  },
  {
    key: "earlier",
    title: "Earlier",
    count: QUEUE.earlier,
    aside: "Skipped, or not reached yet",
    test: (applicant: Applicant) => !applicant.fresh,
  },
]

/**
 * Ticks everybody in the tab — all of it, not the page on screen, which is why
 * it says the number. Half-ticked when some are.
 */
function SelectAll({ count, picked = 0 }: { count: number; picked?: number }) {
  const every = picked === count
  return (
    <label className="flex w-fit items-center gap-2 px-5 text-sm text-muted-foreground">
      <Checkbox
        checked={every}
        indeterminate={picked > 0 && !every}
        aria-label={every ? "Clear selection" : `Select all ${count}`}
      />
      {every ? "Clear selection" : `Select all ${count}`}
    </label>
  )
}

function CardList({
  bucket,
  picked = [],
}: {
  bucket: Status | "all"
  /** Ids ticked, for the selection stories. */
  picked?: string[]
}) {
  if (bucket === "undecided") {
    const queue = APPLICANTS.filter((a) => a.status === "undecided")
    return (
      <div className="flex flex-col gap-3">
        <SelectAll
          count={BUCKETS.find((b) => b.value === "undecided")!.count}
          picked={picked.length}
        />
        {RUNS.map((run) => (
          <React.Fragment key={run.key}>
            <QueueHeading
              title={run.title}
              count={run.count}
              aside={run.aside}
            />
            <div role="list" className="flex flex-col gap-3">
              {queue.filter(run.test).map((applicant) => (
                <ApplicantCard
                  key={applicant.id}
                  applicant={applicant}
                  picked={picked.includes(applicant.id)}
                />
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    )
  }

  const people =
    bucket === "all"
      ? APPLICANTS
      : APPLICANTS.filter((applicant) => applicant.status === bucket)

  return (
    <div role="list" className="flex flex-col gap-3">
      {people.map((applicant) => (
        <ApplicantCard key={applicant.id} applicant={applicant} />
      ))}
    </div>
  )
}

/**
 * The same applicants, one to a line.
 *
 * THE COLUMNS ARE THE CARD'S FACTS, IN THE CARD'S ORDER, so switching view
 * moves the information around rather than changing what there is to know.
 * Name and current role share the first cell, stacked as on the card. The
 * skills are the one thing that does not come across: three badges per row is
 * the widest column on the table and the least comparable thing on it.
 *
 * New is a dot in a slot every row reserves, so the names line up whether it is
 * there or not. To review's two runs are heading rows spanning the table, so
 * New and Earlier stay one table with one set of columns.
 *
 * Numbers are right-aligned and tabular so pay and notice line up — that
 * alignment is the entire reason to be in this view.
 */
function ApplicantTable() {
  const queue = APPLICANTS.filter((a) => a.status === "undecided")

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-10 pr-0">
            <Checkbox aria-label="Select all 101" />
          </TableHead>
          <TableHead>Candidate</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="text-right">Exp</TableHead>
          <TableHead className="text-right">Current</TableHead>
          <TableHead className="text-right">Notice</TableHead>
          <TableHead>Applied</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {RUNS.map((run) => (
          <React.Fragment key={run.key}>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableCell colSpan={7} className="py-2 whitespace-normal">
                <QueueHeading
                  title={run.title}
                  count={run.count}
                  aside={run.aside}
                />
              </TableCell>
            </TableRow>
            {queue.filter(run.test).map((applicant) => (
              <TableRow key={applicant.id}>
                <TableCell className="w-10 pr-0">
                  <Checkbox aria-label={`Select ${applicant.name}`} />
                </TableCell>
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
                      <span className="font-medium">
                        {applicant.name}
                        {isNew(applicant) && (
                          <span className="sr-only">, new</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {applicant.title} at {applicant.company}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {applicant.location}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {applicant.experience}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {applicant.salary}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {applicant.notice}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {applicant.appliedAgo}
                </TableCell>
              </TableRow>
            ))}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * A decision takes the card out of the list the instant it is made — that is
 * what makes the queue shrink — so a misclick is undone from where you are,
 * not by finding the person again in another tab. In the app it sits fixed at
 * the bottom of the screen for six seconds; here it is drawn in place.
 */
function UndoBar({
  message = "Ananya Krishnan moved to Shortlisted",
}: {
  message?: string
}) {
  return (
    <div
      role="status"
      className="flex w-fit items-center gap-2 rounded-full bg-foreground py-1.5 pr-1.5 pl-4 text-sm whitespace-nowrap text-background shadow-lg"
    >
      <span>{message}</span>
      <Button
        size="sm"
        variant="ghost"
        className="rounded-full text-background hover:bg-background/15 hover:text-background dark:hover:bg-background/15"
      >
        Undo
      </Button>
    </div>
  )
}

/** Ghost controls on the dark pill, where the system's ghost would vanish. */
const ON_BAR =
  "rounded-full text-background hover:bg-background/15 hover:text-background dark:hover:bg-background/15"

/**
 * What to do with the ticked people. The card's three decisions, in the same
 * order and icons, with one Undo for the whole batch; a ⋯ menu for the rarer
 * actions; and Athena, for one to three people only — a comparison holds three,
 * so past that she steps off the bar rather than sitting there disabled.
 */
function SelectionBar({ count }: { count: number }) {
  return (
    <div
      role="region"
      aria-label="Selected candidates"
      className="flex w-fit items-center gap-1 rounded-full bg-foreground py-1.5 pr-1.5 pl-4 text-sm whitespace-nowrap text-background shadow-lg"
    >
      <span className="mr-1 tabular-nums">{count} selected</span>
      {DECISIONS.map((decision) => (
        <Button
          key={decision.value}
          size="icon-sm"
          variant="ghost"
          aria-label={`${decision.label} ${count}`}
          className={ON_BAR}
        >
          <decision.icon />
        </Button>
      ))}
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="More actions for the selected"
        className={ON_BAR}
      >
        <EllipsisIcon />
      </Button>
      {count <= 3 && (
        <Button size="sm" className="ml-1 rounded-full">
          <SparklesIcon data-icon="inline-start" />
          {count === 1 ? "Ask Athena" : "Compare in Athena"}
        </Button>
      )}
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Clear selection"
        className={ON_BAR}
      >
        <XIcon />
      </Button>
    </div>
  )
}

const MENU =
  "flex w-60 flex-col rounded-2xl bg-popover p-1 text-popover-foreground shadow-2xl ring-1 ring-foreground/5 dark:ring-foreground/10"
const MENU_ITEM =
  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm [&_svg]:size-4 [&_svg]:shrink-0"

/**
 * The bar's ⋯ menu, drawn open with Save to list's submenu beside it. Save
 * ADDS everybody to a list and removes nobody from any — the card's own menu
 * toggles one person's lists, but a dozen people are already in a dozen lists.
 * Message writes a draft into each thread; Set up interviews opens the plan
 * below.
 */
function SelectionMenu({ count }: { count: number }) {
  return (
    <div className="flex items-end gap-1">
      <div className={MENU}>
        <div className={cn(MENU_ITEM, "bg-accent text-accent-foreground")}>
          <BookmarkIcon />
          Save to list
          <ChevronRightIcon className="ml-auto" />
        </div>
        <div className={MENU_ITEM}>
          <CalendarPlusIcon />
          Set up {count} interviews
        </div>
        <div className={MENU_ITEM}>
          <MailIcon />
          Message {count}
        </div>
        <div className={MENU_ITEM}>
          <DownloadIcon />
          Download {count} CVs
        </div>
      </div>
      <div className={MENU}>
        <p className="px-3 py-2.5 text-xs text-muted-foreground">
          Add {count} people to
        </p>
        {["Bench — Principal Engineer", "Silver medalists", "Referrals"].map(
          (list) => (
            <div key={list} className={MENU_ITEM}>
              {list}
            </div>
          )
        )}
        <div className="-mx-1 my-1 h-px bg-border" />
        <div className={MENU_ITEM}>New list…</div>
      </div>
    </div>
  )
}

/**
 * "Set up N interviews", drawn in place rather than as a modal. It asks only
 * what the batch shares — one calendar and a start day — and lays people into
 * that calendar's free slots in tick order, skipping slots already taken. The
 * plan is shown before Send; somebody who already has a slot is skipped, not
 * moved, and somebody who does not fit says so.
 */
function BulkInterviews() {
  const plan = [
    { name: "Kavya Sharma", when: "16 Sep, 10:00 – 10:30 AM" },
    { name: "Shreya Iyer", when: "16 Sep, 11:30 AM – 12:00 PM" },
    { name: "Aman Pillai", when: "16 Sep, 2:00 – 2:30 PM" },
    {
      name: "Siddharth Desai",
      when: "Skipped — already booked 18 Sep, 4:00 – 4:30 PM",
      muted: true,
    },
    { name: "Sneha Reddy", when: "16 Sep, 4:00 – 4:30 PM" },
  ]

  const field = (label: string, value: string) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex h-9 items-center justify-between rounded-4xl border border-input bg-input/30 px-3 text-sm">
        {value}
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </div>
    </div>
  )

  return (
    <div className="flex w-full max-w-lg flex-col gap-4 rounded-4xl bg-background p-6 shadow-2xl ring-1 ring-foreground/5">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-base font-medium">
          Set up 5 interviews
        </h2>
        <p className="text-sm text-muted-foreground">
          Each person gets the next free slot in one calendar, in the order you
          ticked them. Nothing is sent until you press Send.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("Calendar", "Anurag Yadav")}
        {field("From", "16 Sep 2026")}
      </div>
      <ul className="flex flex-col divide-y rounded-xl bg-muted/50 text-sm">
        {plan.map((row) => (
          <li
            key={row.name}
            className="flex items-baseline justify-between gap-3 px-3 py-2"
          >
            <span className={row.muted ? "text-muted-foreground" : undefined}>
              {row.name}
            </span>
            <span
              className={cn(
                "text-right text-xs",
                row.muted ? "text-muted-foreground" : "tabular-nums"
              )}
            >
              {row.when}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>
          <CalendarCheckIcon data-icon="inline-start" />
          Send 4 invites
        </Button>
      </div>
    </div>
  )
}

function ResponseManager({ picked = [] }: { picked?: string[] }) {
  return (
    <div className="@container/main flex flex-col gap-4 px-4 lg:px-6">
      <JobHeader />

      <Tabs className="gap-4" defaultValue="undecided">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="max-w-full overflow-x-auto">
            {BUCKETS.map((bucket) => (
              <TabsTrigger key={bucket.value} value={bucket.value}>
                {bucket.label}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {bucket.count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <ViewSwitcher />
        </div>

        <FilterBar />

        {BUCKETS.map((bucket) => (
          <TabsContent key={bucket.value} value={bucket.value}>
            <CardList bucket={bucket.value} picked={picked} />
          </TabsContent>
        ))}
      </Tabs>

      {/* Fixed to the bottom of the screen in the app; sticky here, so a
          story scrolls with the bar in view. */}
      {picked.length > 0 && (
        <div className="sticky bottom-6 flex justify-center">
          <SelectionBar count={picked.length} />
        </div>
      )}
    </div>
  )
}

const meta = {
  title: "Compositions/Response manager",
  parameters: {
    design: designComposition("response-manager"),
    layout: "fullscreen",
    docs: {
      description: {
        component: `
One job, and everybody who applied to it. Mirrors
\`apps/web/src/routes/job.tsx\` — the biggest surface in the prototype.

**Organised by decision, not by reading.** A recruiter comes back each day to
the same question: who still needs a decision from me, and who arrived since I
was last here. So the page opens on **To review** — everybody without a
decision — and the tabs after it are where decisions land: Maybe, Shortlisted,
Contacted, then Not a fit and All last. Whether a card was *opened* is not
something the screen tracks.

**To review is two runs.** *New since yesterday, 4:10 pm*, with how many of
today's arrivals are done, then *Earlier* — skipped, or not reached yet. The
line between them is fixed for the whole visit, so refreshing cannot quietly
empty New. The same two runs head the cards, the table and the split list.

**The dot means new** — applied since the last visit and still undecided — on
the avatar's corner, or in a reserved slot in the table. Decisions keep their
badges; no decision gets none.

**A decision leaves the list at once**, which is what makes the queue shrink,
with an undo bar for the misclick.

**Every card and row has a checkbox**, and "Select all N" ticks the whole tab.
Ticking brings up the selection bar: the three decisions for everybody at once
(one Undo for the batch), a ⋯ menu with Save to list, Set up interviews,
Message and Download CVs, and Athena — Ask for one person, Compare for two or
three. Nothing in the menu sends anything: Message writes drafts, and Set up
interviews shows its plan before Send. See **Compositions → Athena** for what
she answers with.

**Most recent or Best match.** The sort pill switches between them; in To
review it sorts inside New and inside Earlier, never across.

**A triage screen, not a profile reader.** A card carries only what you judge
on at a glance, and the decision — yes, maybe, no — is on the card.

**Three views, three densities, none of them the winner.** Cards are for
scanning. The table is for comparing: one line a person with every number in a
column. Split is for reading — a thin list beside a whole profile.

**One row of filter pills, in every view.** Each opens its own popover on a
pointer; below \`md\` every one of them opens the single drawer instead. See
Components → Popover, Command and Drawer.

In the app the tab, view, sort, filters, selected candidate, open profile
panel and CV/profile tab all live in the query string, so any state worth
showing someone is in the URL.
        `,
      },
    },
  },
} satisfies StoryMeta

export default meta

type Story = StoryObj<typeof meta>

export const FullPage: Story = {
  name: "Response manager — full page",
  render: () => <ResponseManager />,
}

const padded: Decorator = (Story) => (
  <div className="@container/main mx-auto max-w-4xl p-6">
    <Story />
  </div>
)

export const JobHeaderStory: Story = {
  name: "Job header",
  decorators: [padded],
  render: () => <JobHeader />,
}

export const FilterPills: Story = {
  name: "Filter pills",
  decorators: [padded],
  render: () => (
    <div className="flex flex-col gap-3">
      <FilterBar />
      <FilterBar sort="Best match" />
    </div>
  ),
}

export const Card: Story = {
  name: "Applicant card",
  decorators: [padded],
  render: () => <ApplicantCard applicant={APPLICANTS[0]} />,
}

export const TableView: Story = {
  name: "Table view",
  decorators: [padded],
  render: () => <ApplicantTable />,
}

/**
 * Every decision has a badge; no decision has none. "New" is the avatar's dot,
 * shown here beside them.
 */
export const StatusRange: Story = {
  name: "Status badges",
  decorators: [padded],
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <ApplicantAvatar applicant={APPLICANTS[0]} className="size-12" />
      {(["maybe", "shortlisted", "contacted", "rejected"] as const).map(
        (status) => (
          <StatusBadge key={status} status={status} />
        )
      )}
    </div>
  ),
}

export const UndoBarStory: Story = {
  name: "Undo bar — one person and a batch",
  decorators: [padded],
  render: () => (
    <div className="flex flex-col gap-3">
      <UndoBar />
      <UndoBar message="103 people moved to Maybe" />
    </div>
  ),
}

export const Selecting: Story = {
  name: "Selecting candidates",
  render: () => <ResponseManager picked={["c1", "c2"]} />,
}

/**
 * One person gets Ask Athena, two or three get Compare, and past three Athena
 * leaves the bar — the decisions and the menu stay.
 */
export const SelectionBarStory: Story = {
  name: "Selection bar — one, three and twelve",
  decorators: [padded],
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <SelectionBar count={1} />
      <SelectionBar count={3} />
      <SelectionBar count={12} />
    </div>
  ),
}

export const SelectionMenuStory: Story = {
  name: "Selection bar menu, open",
  decorators: [padded],
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <SelectionMenu count={12} />
      <SelectionBar count={12} />
    </div>
  ),
}

export const BulkInterviewsStory: Story = {
  name: "Set up interviews for the selected",
  decorators: [padded],
  render: () => <BulkInterviews />,
}

/** The skills the posting asked for, as the card marks them. */
export const RequiredSkills: Story = {
  name: "Required skills",
  decorators: [padded],
  render: () => (
    <div className="flex flex-wrap gap-1.5">
      {["Kubernetes", "Go", "Terraform", "Kafka"].map((skill) => (
        <Badge
          key={skill}
          variant={REQUIRED_SKILLS.includes(skill) ? "secondary" : "outline"}
        >
          {skill}
        </Badge>
      ))}
      <Chip>+3 more</Chip>
    </div>
  ),
}
