import * as React from "react"
import type {
  Decorator,
  Meta as StoryMeta,
  StoryObj,
} from "@storybook/react-vite"
import {
  ArchiveIcon,
  ClockIcon,
  CopyIcon,
  EllipsisIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  Share2Icon,
  TriangleAlertIcon,
} from "lucide-react"

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
import { Item, ItemContent } from "@workspace/ui/components/item"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { designComposition } from "@workspace/ui/lib/figma"

/**
 * The jobs list — four states of a posting, one tab each.
 *
 * Mirrors `apps/web/src/routes/jobs.tsx`. Mock data is a copy of the iimjobs
 * roster in `apps/web/src/lib/jobs.ts`; `packages/ui` cannot import from the
 * app, and the app's version is per-brand.
 *
 * THE ROW IS A CARD, NOT A TABLE ROW. `ListCard` is right for a dashboard
 * panel where the list is the content of one card; here the list IS the page,
 * and a job is a thing you act on rather than a line in a table.
 *
 * THE CARD IS NOT THE LINK — THE TITLE IS. The overflow menu has to be a real
 * button, and a button inside an anchor is invalid markup that gives a
 * keyboard user two stops for one destination. So the title is the anchor and
 * stretches its hit area over the whole card with `after:inset-0`, while the
 * menu sits above that layer on `relative`.
 */

const LIVE = [
  {
    id: "j1",
    title: "Principal Engineer, Platform Infrastructure",
    location: "Bengaluru",
    plan: "Pro",
    expiresInDays: 6,
    applicants: 148,
    newSinceVisit: 32,
    followUp: 11,
  },
  {
    id: "j2",
    title: "Engineering Manager — Payments",
    location: "Multiple locations",
    plan: "Pro",
    expiresInDays: 3,
    applicants: 61,
    newSinceVisit: 0,
    followUp: 4,
  },
  {
    id: "j3",
    title: "Staff Data Scientist",
    location: "Remote (India)",
    plan: "Classified",
    expiresInDays: 21,
    applicants: 0,
    newSinceVisit: 0,
    followUp: 0,
  },
]

const PENDING = [
  {
    id: "j4",
    title: "VP Engineering",
    location: "Gurugram",
    plan: "Pro",
    awaitingReviewDays: 3,
  },
  {
    id: "j5",
    title: "Senior Product Manager, Growth",
    location: "Bengaluru",
    plan: "Classified",
    awaitingReviewDays: 0,
  },
]

const CLOSED = [
  {
    id: "j6",
    title: "Director of Engineering",
    location: "Mumbai",
    plan: "Pro",
    closedOn: "12 Aug",
    applicants: 204,
    outcome: "Filled",
  },
  {
    id: "j7",
    title: "Head of Design",
    location: "Bengaluru",
    plan: "Classified",
    closedOn: "29 Jul",
    applicants: 88,
    outcome: "Withdrawn",
  },
]

const REJECTED = [
  {
    id: "j8",
    title: "Growth Lead (equity only)",
    location: "Remote (India)",
    plan: "Classified",
    rejectedDaysAgo: 5,
    reason:
      "Compensation has to be stated as a salary range. Equity-only postings are not accepted on iimjobs.",
  },
]

/** The card's overflow menu. Items differ by state. */
function JobActions({ title, status }: { title: string; status: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-muted-foreground"
            aria-label={`Actions for ${title}`}
          />
        }
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <PencilIcon />
            {status === "rejected" ? "Edit and resubmit" : "Edit posting"}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CopyIcon />
            Duplicate
          </DropdownMenuItem>
          {status === "live" && (
            <DropdownMenuItem>
              <Share2Icon />
              Share link
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {status === "closed" ? (
            <DropdownMenuItem>
              <SendIcon />
              Repost
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive">
              <ArchiveIcon />
              {status === "pending" ? "Withdraw" : "Close job"}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function JobRowShell({
  title,
  plan,
  status,
  details,
  trailing,
}: {
  title: string
  plan: string
  status: string
  details: React.ReactNode
  trailing?: React.ReactNode
}) {
  return (
    <Item className="relative flex-col items-stretch gap-1.5 bg-card px-5 py-4 ring-1 ring-foreground/10 hover:bg-muted has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <a
            href="#"
            className="font-heading text-base font-medium after:absolute after:inset-0"
          >
            {title}
          </a>
          <Badge variant={plan === "Pro" ? "secondary" : "outline"}>
            {plan}
          </Badge>
        </div>

        {/* `relative` lifts this clear of the stretched link's ::after. The
            negative margins keep a 32px button from setting the height of a
            20px title row. */}
        <div className="relative -my-1.5 -mr-2 flex shrink-0 items-center gap-2">
          {trailing}
          <JobActions title={title} status={status} />
        </div>
      </div>

      <ItemContent className="min-w-0 gap-1.5">{details}</ItemContent>
    </Item>
  )
}

function Where({ children }: { children: React.ReactNode }) {
  return (
    <MetaItem>
      <MapPinIcon />
      {children}
    </MetaItem>
  )
}

/**
 * A count and the thing it counts. Two type sizes inside one meta item is the
 * cheapest prominence available here — it lifts the counts clear of the
 * location above them without growing the row.
 *
 * `text-primary`, never a written-in colour: it follows the brand switcher.
 */
function Count({ value, label }: { value: number; label: string }) {
  return (
    <MetaItem>
      <span className="text-sm font-semibold text-primary">{value}</span>
      {label}
    </MetaItem>
  )
}

function LiveList() {
  return (
    <div role="list" className="flex flex-col gap-3">
      {LIVE.map((job) => (
        <JobRowShell
          key={job.id}
          title={job.title}
          plan={job.plan}
          status="live"
          details={
            <>
              <Meta separator={false}>
                <Where>{job.location}</Where>
                <MetaItem>
                  <ClockIcon />
                  Expires in {job.expiresInDays} days
                </MetaItem>
              </Meta>

              {/* The rule runs the width of the content column, not the card
                  — it divides the two halves of the row's text. */}
              <Meta className="mt-0.5 border-t border-border pt-2">
                {job.applicants === 0 ? (
                  <MetaItem>No applications yet</MetaItem>
                ) : (
                  <Count value={job.applicants} label="applications" />
                )}
                {/* New since the last visit — the same number the response
                    manager heads its To review queue with. */}
                {job.newSinceVisit > 0 && (
                  <Count value={job.newSinceVisit} label="new" />
                )}
                {job.followUp === 0 ? (
                  <MetaItem>Nobody to follow up</MetaItem>
                ) : (
                  <Count value={job.followUp} label="to follow up" />
                )}
              </Meta>
            </>
          }
        />
      ))}
    </div>
  )
}

function PendingList() {
  return (
    <div role="list" className="flex flex-col gap-3">
      {PENDING.map((job) => {
        const heldUp = job.awaitingReviewDays >= 2

        return (
          <JobRowShell
            key={job.id}
            title={job.title}
            plan={job.plan}
            status="pending"
            details={
              <Meta separator={false}>
                <Where>{job.location}</Where>
                <MetaItem tone={heldUp ? "warning" : "default"}>
                  <SendIcon />
                  {job.awaitingReviewDays === 0
                    ? "Submitted today"
                    : `Waiting ${job.awaitingReviewDays} days for review`}
                </MetaItem>
              </Meta>
            }
            /* THE BADGE IS GREY, NOT AMBER. "In review" is true of every row
               in this tab — a colour on a state that never varies is
               decoration, and it competed with the amber on the wait time,
               which is the part that actually differs row to row. */
            trailing={<Badge variant="secondary">In review</Badge>}
          />
        )
      })}
    </div>
  )
}

function ClosedList() {
  return (
    <div role="list" className="flex flex-col gap-3">
      {CLOSED.map((job) => (
        <JobRowShell
          key={job.id}
          title={job.title}
          plan={job.plan}
          status="closed"
          details={
            <Meta separator={false}>
              <Where>{job.location}</Where>
              <MetaItem>
                <ArchiveIcon />
                Closed {job.closedOn}
              </MetaItem>
              <MetaItem>{job.applicants} applicants</MetaItem>
            </Meta>
          }
          trailing={
            <Badge variant={job.outcome === "Filled" ? "success" : "outline"}>
              {job.outcome}
            </Badge>
          }
        />
      ))}
    </div>
  )
}

function RejectedList() {
  return (
    <div role="list" className="flex flex-col gap-3">
      {REJECTED.map((job) => (
        <JobRowShell
          key={job.id}
          title={job.title}
          plan={job.plan}
          status="rejected"
          details={
            <>
              <Meta separator={false}>
                <Where>{job.location}</Where>
                <MetaItem>
                  <ClockIcon />
                  Rejected {job.rejectedDaysAgo} days ago
                </MetaItem>
              </Meta>
              {/* `bg-warning/10` — the token pair Badge's warning variant
                  uses — not a written-in amber-50, which would be a pale
                  rectangle on a dark card.

                  THE TEXT IS NOT AMBER. Amber on amber-50 measures 2.85:1 and
                  this is 12px body copy, which needs 4.5:1. The panel and the
                  icon carry the tone; the sentence takes the page's own
                  foreground. */}
              <div className="mt-0.5 flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs leading-relaxed dark:bg-warning/20">
                <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <span>{job.reason}</span>
              </div>
            </>
          }
          trailing={<Badge variant="destructive">Rejected</Badge>}
        />
      ))}
    </div>
  )
}

const TABS = [
  { value: "live", label: "Live", count: LIVE.length, list: <LiveList /> },
  {
    value: "pending",
    label: "Pending",
    count: PENDING.length,
    list: <PendingList />,
  },
  {
    value: "closed",
    label: "Closed",
    count: CLOSED.length,
    list: <ClosedList />,
  },
  {
    value: "rejected",
    label: "Rejected",
    count: REJECTED.length,
    list: <RejectedList />,
  },
]

function JobsPage() {
  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <Tabs className="gap-4" defaultValue="live">
        {/* The create action rides on the tab row rather than sitting above
            it. It is the only thing on this page that is not the list, and
            giving it its own band would push the list a whole row down for a
            single button. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="max-w-full overflow-x-auto">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                {/* The count stays grey on the active tab too — you are
                    already looking at the list it counts. */}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {tab.count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <Button size="sm">
            <PlusIcon data-icon="inline-start" />
            Post a job
          </Button>
        </div>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.list}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

const meta = {
  title: "Compositions/Jobs list",
  parameters: {
    design: designComposition("jobs-list"),
    layout: "fullscreen",
    docs: {
      description: {
        component: `
Every posting a recruiter has, in the four states one can be in. Mirrors
\`apps/web/src/routes/jobs.tsx\`.

**Each tab carries a different row**, because each state has a different
useful fact. Live has counts you act on; Pending has one — how long it has
been waiting; Closed has the outcome; Rejected has the reason, which is the
only actionable thing on that card and gets a tinted panel rather than a
tooltip.

**Nothing branches on brand.** The postings differ between iimjobs and hirist
because they are different products with different rosters — that is a
\`Record<Brand, Job[]>\` lookup in the app, not a fork of this row.
        `,
      },
    },
  },
} satisfies StoryMeta

export default meta

type Story = StoryObj<typeof meta>

export const FullPage: Story = {
  name: "Jobs — full page",
  render: () => <JobsPage />,
}

const padded: Decorator = (Story) => (
  <div className="mx-auto max-w-3xl p-6">
    <Story />
  </div>
)

export const LiveRows: Story = {
  name: "Live rows",
  decorators: [padded],
  render: () => <LiveList />,
}

export const PendingRows: Story = {
  name: "Pending rows",
  decorators: [padded],
  render: () => <PendingList />,
}

export const ClosedRows: Story = {
  name: "Closed rows",
  decorators: [padded],
  render: () => <ClosedList />,
}

export const RejectedRows: Story = {
  name: "Rejected rows",
  decorators: [padded],
  render: () => <RejectedList />,
}

/** Every tab can be empty, and each says something different when it is. */
export const EmptyState: Story = {
  name: "Empty tab",
  decorators: [padded],
  render: () => (
    <Empty className="rounded-2xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ArchiveIcon />
        </EmptyMedia>
        <EmptyTitle>Nothing closed yet</EmptyTitle>
        <EmptyDescription>
          Jobs you close, fill or let expire end up here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
}
