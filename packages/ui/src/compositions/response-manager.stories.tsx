import * as React from "react"
import type {
  Decorator,
  Meta as StoryMeta,
  StoryObj,
} from "@storybook/react-vite"
import {
  ArrowLeftIcon,
  CheckIcon,
  LayoutListIcon,
  MailIcon,
  PanelsTopLeftIcon,
  SearchIcon,
  Table2Icon,
  XIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
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
 * Mirrors `apps/web/src/routes/job.tsx`; the people are a copy of what
 * `apps/web/src/lib/applicants.ts` generates from a seeded LCG.
 *
 * IT IS A TRIAGE SCREEN, NOT A PROFILE READER. The question it answers is
 * "which of these 148 people are worth an hour", so a card carries only what
 * you judge on at a glance — the role they are in now, how long they have been
 * working, what they cost, how soon they could start — and the decision is two
 * buttons on the card rather than a round trip through a profile.
 */

const BUCKETS = [
  { value: "all", label: "All", count: 148 },
  { value: "unread", label: "Unread", count: 32 },
  { value: "reviewing", label: "Reviewing", count: 21 },
  { value: "shortlisted", label: "Shortlisted", count: 11 },
  { value: "contacted", label: "Contacted", count: 6 },
  { value: "rejected", label: "Not a fit", count: 78 },
]

const VIEWS = [
  { value: "cards", label: "Cards", icon: LayoutListIcon },
  { value: "table", label: "Table", icon: Table2Icon },
  { value: "split", label: "Split", icon: PanelsTopLeftIcon },
]

const REQUIRED_SKILLS = ["Kubernetes", "Go", "Kafka"]

const APPLICANTS = [
  {
    id: "c1",
    name: "Ananya Krishnan",
    title: "Staff Engineer",
    company: "Razorpay",
    location: "Bengaluru",
    appliedAgo: "2 days ago",
    status: "unread",
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
    appliedAgo: "3 days ago",
    status: "reviewing",
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
    name: "Priyanka Nair",
    title: "Principal Engineer",
    company: "Postman",
    location: "Remote",
    appliedAgo: "5 days ago",
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
]

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "unread":
      return <Badge>Unread</Badge>
    case "reviewing":
      return <Badge variant="warning">Reviewing</Badge>
    case "shortlisted":
      return <Badge variant="success">Shortlisted</Badge>
    case "contacted":
      return <Badge variant="secondary">Contacted</Badge>
    case "rejected":
      return <Badge variant="outline">Not a fit</Badge>
    default:
      return null
  }
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
 * ONE ROW OF PILLS, IN EVERY VIEW. This used to be a column beside the cards
 * and a row above the split view, which meant a recruiter changing view had to
 * find the filters again. The pills cost a row instead of a column, so the
 * view that could not afford 16rem of controls is no longer the odd one out —
 * and the panel they replaced lives on inside the drawer, which is what every
 * pill opens below `md`.
 *
 * It sits OUTSIDE the tab panels, not repeated in each: five copies of one
 * search box is five things a screen reader has to tell apart, and the query
 * would reset every time you changed tab.
 */
function FilterBar() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PillTrigger icon label="Search responses" marked />
      <PillTrigger label="Most recent" marked={false} />
      <PillTrigger label="9–14 yrs" marked />
      <PillTrigger label="Any notice period" marked={false} />
      <PillTrigger label="Any salary" marked={false} />
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

/**
 * LinkedIn Recruiter's shape: a column of labels down the left, the facts
 * beside them. Labels give the eye a fixed left edge to run down, so comparing
 * the education of the third and the ninth candidate is a vertical scan rather
 * than a hunt.
 *
 * ONE `grid`, NOT A TWO-COLUMN FLEX PER ROW. A fixed first track means every
 * label in the card shares an edge even when one value wraps to six lines.
 */
function BucketRows({ applicant }: { applicant: (typeof APPLICANTS)[number] }) {
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
}: {
  applicant: (typeof APPLICANTS)[number]
}) {
  return (
    <Item className="@container/card flex-col items-stretch gap-3 bg-card px-5 py-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* Initials, not a photograph. A recruiter screening on a face is
              the failure mode this whole screen should not encourage — the
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
              <StatusBadge status={applicant.status} />
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
        <div className="-my-1.5 -mr-2 flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Shortlist">
            <CheckIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Not a fit">
            <XIcon />
          </Button>
        </div>
      </div>

      <BucketRows applicant={applicant} />
      <CardActions />
    </Item>
  )
}

function CardList() {
  return (
    <div role="list" className="flex flex-col gap-3">
      {APPLICANTS.map((applicant) => (
        <ApplicantCard key={applicant.id} applicant={applicant} />
      ))}
    </div>
  )
}

/**
 * The same applicants, one to a line.
 *
 * THE COLUMNS ARE THE CARD'S FACTS, IN THE CARD'S ORDER, so switching view
 * moves the information around rather than changing what there is to know. The
 * skills are the one thing that does not come across: three badges per row is
 * the widest column on the table and the least comparable thing on it.
 *
 * Numbers are right-aligned and tabular so experience, pay and notice line up
 * — that alignment is the entire reason to be in this view.
 */
function ApplicantTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Candidate</TableHead>
          <TableHead>Now</TableHead>
          <TableHead className="text-right">Experience</TableHead>
          <TableHead className="text-right">Salary</TableHead>
          <TableHead className="text-right">Notice</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {APPLICANTS.map((applicant) => (
          <TableRow key={applicant.id}>
            <TableCell className="font-medium">{applicant.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {applicant.title} at {applicant.company}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {applicant.experience}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {applicant.salary}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {applicant.notice}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ResponseManager() {
  return (
    <div className="@container/main flex flex-col gap-4 px-4 lg:px-6">
      <JobHeader />

      <Tabs className="gap-4" defaultValue="all">
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
            <CardList />
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

**A triage screen, not a profile reader.** A card carries only what you judge
on at a glance, and the decision is two buttons on the card rather than a
round trip through a profile.

**Three views, three densities, none of them the winner.** Cards are for
scanning — four lines a person, enough to triage. The table is for comparing:
one line a person with every number in a column, which is the only way to
answer "who is on a short notice period" across 148 rows. Split is for
reading — a thin list beside a whole profile, for when the list is down to the
ten people worth an hour.

**The tabs are the same shape as the Jobs page**, down to the count on the
trigger. Two list screens one click apart should not have two different ideas
of what a tab is.

**One row of filter pills, in every view.** Each opens its own popover on a
pointer; below \`md\` every one of them opens the single drawer instead — the
same controls, in the shape each input can actually use. See Components →
Popover, Command and Drawer.

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
  render: () => <FilterBar />,
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

/** Every bucket can be empty, and each says something different when it is. */
export const StatusRange: Story = {
  name: "Status badges",
  decorators: [padded],
  render: () => (
    <div className="flex flex-wrap gap-2">
      {["unread", "reviewing", "shortlisted", "contacted", "rejected"].map(
        (status) => (
          <StatusBadge key={status} status={status} />
        )
      )}
    </div>
  ),
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
