import * as React from "react"
import type {
  Decorator,
  Meta as StoryMeta,
  StoryObj,
} from "@storybook/react-vite"
import {
  ArrowLeftIcon,
  CheckIcon,
  CircleHelpIcon,
  LayoutListIcon,
  MailIcon,
  PanelsTopLeftIcon,
  SearchIcon,
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

function ApplicantCard({ applicant }: { applicant: Applicant }) {
  return (
    <Item className="@container/card flex-col items-stretch gap-3 bg-card px-5 py-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
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

function CardList({ bucket }: { bucket: Status | "all" }) {
  if (bucket === "undecided") {
    const queue = APPLICANTS.filter((a) => a.status === "undecided")
    return (
      <div className="flex flex-col gap-3">
        {RUNS.map((run) => (
          <React.Fragment key={run.key}>
            <QueueHeading
              title={run.title}
              count={run.count}
              aside={run.aside}
            />
            <div role="list" className="flex flex-col gap-3">
              {queue.filter(run.test).map((applicant) => (
                <ApplicantCard key={applicant.id} applicant={applicant} />
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
              <TableCell colSpan={6} className="py-2 whitespace-normal">
                <QueueHeading
                  title={run.title}
                  count={run.count}
                  aside={run.aside}
                />
              </TableCell>
            </TableRow>
            {queue.filter(run.test).map((applicant) => (
              <TableRow key={applicant.id}>
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
function UndoBar() {
  return (
    <div
      role="status"
      className="flex w-fit items-center gap-2 rounded-full bg-foreground py-1.5 pr-1.5 pl-4 text-sm whitespace-nowrap text-background shadow-lg"
    >
      <span>Ananya Krishnan moved to Shortlisted</span>
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

function ResponseManager() {
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
            <CardList bucket={bucket.value} />
          </TabsContent>
        ))}
      </Tabs>
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
  name: "Undo bar",
  decorators: [padded],
  render: () => <UndoBar />,
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
