import * as React from "react"
import { Link, useSearchParams } from "react-router"
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

import { useBrand } from "@workspace/ui/components/brand-provider"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Item, ItemContent } from "@workspace/ui/components/item"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  jobStatusesFor,
  toJobStatus,
  type ClosedJob,
  type Job,
  type LiveJob,
  type PendingJob,
  type RejectedJob,
} from "@/lib/jobs"
import { JobListSkeleton } from "@/components/skeletons"
import { usePageLoading } from "@/lib/use-page-loading"

/**
 * Every posting on the account, split by the state it is in.
 *
 * FOUR TABS, NOT A FILTER DROPDOWN. The states are disjoint and there are only
 * four of them, so the tab strip can carry a count on each one — which means a
 * recruiter can see that two jobs are stuck in review, or that one was
 * rejected, without opening anything. A dropdown filter hides exactly that.
 *
 * THE PILL TRACK, NOT THE UNDERLINE. This is a segmented control switching one
 * list between four filtered views, which is what the pill is for; the
 * underline variant is for sectioning a page into parts that all belong to the
 * same thing (Applicants / Shortlist / Interviews on a single job).
 *
 * THE TAB IS IN THE URL. `/jobs?status=rejected` is the whole point — a design
 * review runs on pasted links, and a tab that only exists in component state
 * means "look at the rejected one" has to be said out loud every time. It
 * replaces rather than pushes, so Back leaves the page instead of walking back
 * through four tabs, the same call `App.tsx` makes on the index redirect.
 *
 * ROWS DIFFER BY STATUS, deliberately — see `lib/jobs.ts`. The shell is shared
 * (title, plan, and where the row goes); what hangs off it is not, because a
 * pending job has no applicants to count and a rejected one has nothing to say
 * except why.
 */
export function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const active = toJobStatus(searchParams.get("status"))
  // The postings are the active product's; the four states are not.
  const { brand } = useBrand()
  const statuses = jobStatusesFor(brand)
  const loading = usePageLoading()

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <Tabs
        className="gap-4"
        value={active}
        onValueChange={(value) => {
          // Live is the default, so it stays a bare /jobs — the tidiest URL is
          // the one a recruiter lands on without choosing anything.
          const next = String(value)
          setSearchParams(next === "live" ? {} : { status: next }, {
            replace: true,
          })
        }}
      >
        {/* The create action rides on the tab row rather than sitting above it.
            It is the only thing on this page that is not the list, and giving
            it its own band would push the list a whole row further down for a
            single button. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="max-w-full overflow-x-auto">
            {statuses.map((status) => (
              <TabsTrigger key={status.value} value={status.value}>
                {status.label}
                {/* The count is the reason the tabs are worth having. It stays
                    grey on the active tab too — you are already looking at the
                    list it counts, so it has nothing left to tell you there. */}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {status.jobs.length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* `nativeButton={false}` because this renders as an anchor — Base UI
              warns otherwise, and the warning is right: a link with button
              semantics loses the middle-click and copy-link a recruiter
              expects from something that navigates. */}
          <Button
            size="sm"
            nativeButton={false}
            render={<Link to="/jobs/new" />}
          >
            <PlusIcon data-icon="inline-start" />
            Post a job
          </Button>
        </div>

        {statuses.map((status) => (
          <TabsContent key={status.value} value={status.value}>
            {loading ? (
              // Rows to match what is coming, not what is there: the other
              // product has its own number of postings in this state.
              <JobListSkeleton rows={Math.max(status.jobs.length, 3)} />
            ) : status.jobs.length > 0 ? (
              // A card each, not one card of hairline-divided rows. `ListCard`
              // is the right shape for a dashboard panel where the list is the
              // content of one card; here the list IS the page, and a job is a
              // thing you act on rather than a line in a table.
              <div role="list" className="flex flex-col gap-3">
                {status.jobs.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <Empty className="rounded-2xl border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <status.icon />
                  </EmptyMedia>
                  <EmptyTitle>{status.empty.title}</EmptyTitle>
                  <EmptyDescription>
                    {status.empty.description}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function JobRow({ job }: { job: Job }) {
  switch (job.status) {
    case "live":
      return <LiveRow job={job} />
    case "pending":
      return <PendingRow job={job} />
    case "closed":
      return <ClosedRow job={job} />
    case "rejected":
      return <RejectedRow job={job} />
  }
}

/**
 * What every card shares: the title it is identified by, the plan it was posted
 * on, an overflow menu, and the fact that the card is the way into the job.
 *
 * THE CARD IS NOT THE LINK ANY MORE — THE TITLE IS. The menu has to be a real
 * button, and a button inside an anchor is invalid markup that gives a keyboard
 * user two stops for one destination. So the title is the anchor and stretches
 * its own hit area over the whole card with `after:inset-0`; the menu sits
 * above that layer on `relative`, so clicking it opens the menu rather than
 * navigating. One anchor, one accessible name, the whole card clickable, and
 * the menu still works.
 *
 * The states move with it: the card lights on `hover`, and takes the focus ring
 * through `has-[a:focus-visible]` when the stretched link inside it is tabbed
 * to — otherwise a keyboard user would see nothing happen at all.
 *
 * The title wraps rather than truncating, for the reason the dashboard's job
 * row does — an ellipsis through "Principal Engineer, Platform Infra…" costs
 * more than a second line.
 */
function JobRowShell({
  job,
  details,
  trailing,
}: {
  job: Job
  details: React.ReactNode
  trailing?: React.ReactNode
}) {
  return (
    <Item className="relative flex-col items-stretch gap-1.5 bg-card px-5 py-4 ring-1 ring-foreground/10 hover:bg-muted has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {/* `font-heading text-base font-medium` is `CardTitle`'s own type —
              these rows are cards now, so the title takes the size the design
              system already gives a card its title, rather than staying at the
              14px it had as a list row. `--font-heading` aliases `--font-sans`
              today, so this is a size change now and a face change for free if
              the system ever takes a display face. */}
          <Link
            to={`/jobs/${job.id}`}
            className="font-heading text-base font-medium after:absolute after:inset-0"
          >
            {job.title}
          </Link>
          <Badge variant={job.plan === "Pro" ? "secondary" : "outline"}>
            {job.plan}
          </Badge>
        </div>

        {/* `relative` lifts this clear of the stretched link's ::after, which
            otherwise covers the whole card including the button under it.

            The negative margins keep a 32px button from setting the height of
            a 20px title row — without them every card gained twelve pixels of
            gap under its title — and pull it nearer the corner than the card's
            text gutter, which is where an overflow menu belongs. */}
        <div className="relative -my-1.5 -mr-2 flex shrink-0 items-center gap-2">
          {trailing}
          <JobActions job={job} />
        </div>
      </div>

      <ItemContent className="min-w-0 gap-1.5">{details}</ItemContent>
    </Item>
  )
}

/**
 * The card's overflow menu.
 *
 * NOTE(design): the items are a first guess, not a decision. What a recruiter
 * can do to a posting differs by state — a rejected job wants "edit and
 * resubmit", a closed one wants "repost" — and which of those exist is the
 * design team's call, not this file's. They are here so the button opens
 * something reviewable rather than being an ellipsis that does nothing.
 */
function JobActions({ job }: { job: Job }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-muted-foreground"
            aria-label={`Actions for ${job.title}`}
          />
        }
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <PencilIcon />
            {job.status === "rejected" ? "Edit and resubmit" : "Edit posting"}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CopyIcon />
            Duplicate
          </DropdownMenuItem>
          {job.status === "live" && (
            <DropdownMenuItem>
              <Share2Icon />
              Share link
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {job.status === "closed" ? (
            <DropdownMenuItem>
              <SendIcon />
              Repost
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive">
              <ArchiveIcon />
              {job.status === "pending" ? "Withdraw" : "Close job"}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Location, on every row, in the same place. */
function Where({ children }: { children: React.ReactNode }) {
  return (
    <MetaItem>
      <MapPinIcon />
      {children}
    </MetaItem>
  )
}

/**
 * The counts sit on a second grey line under the location and the expiry,
 * rather than in tiles down the right-hand side.
 *
 * THE TILES WERE MORE STRUCTURE THAN THE NUMBERS DESERVED. Three of them on
 * every row is a small table with no header, and it made a job row — which is
 * a title and a few facts about it — look like a dashboard. Read as a sentence
 * the same facts take one line, and the title gets the row back.
 *
 * THE NUMBERS CARRY THE WEIGHT, THE WORDS STAY GREY. "148" in the foreground
 * against a muted "applications" is what makes this scannable as a column of
 * counts rather than a paragraph, and it is the only hierarchy the line needs.
 *
 * WHAT IS ZERO SAYS SO IN WORDS. "No applications yet" rather than a bare 0,
 * which reads as a fault rather than as a posting nobody has found yet.
 *
 * A RULE SEPARATES THE TWO HALVES. Above it is which job this is — title,
 * where, how long it runs. Below it is the state of the work inside it. They
 * are different questions and the row was running them together as two grey
 * lines that looked like one wrapped sentence.
 *
 * NOTHING ON THE CARD IS COLOURED AS A WARNING. The expiry went first — it
 * read as an alarm on every second row, and an expiry is a date, not a problem;
 * the posting is doing exactly what it was bought to do. The age of the oldest
 * follow-up followed it. The counts in the accent are the only colour left, so
 * the card is now read for what it holds rather than scanned for what is wrong.
 * NOTE: the dashboard's job row still ambers its expiry under seven days; if
 * this is the right call, that one should follow.
 *
 * Recommendations and the follow-up age have both come off the card. Both are
 * still in `lib/jobs.ts` — nothing reads `followUpOldestDays` now — if this
 * line should carry either again.
 */
function LiveRow({ job }: { job: LiveJob }) {
  return (
    <JobRowShell
      job={job}
      details={
        <>
          <Meta separator={false}>
            <Where>{job.location}</Where>
            <MetaItem>
              <ClockIcon />
              Expires in {job.expiresInDays} days
            </MetaItem>
          </Meta>

          {/* The rule runs the width of the content column, not the card — it
              divides the two halves of the row's text, and stopping short of
              the chevron is what keeps it reading as that rather than as a
              second row starting. */}
          <Meta className="mt-0.5 border-t border-border pt-2">
            {job.applicants === 0 ? (
              <MetaItem>No applications yet</MetaItem>
            ) : (
              <Count value={job.applicants} label="applications" />
            )}
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
  )
}

/**
 * A count and the thing it counts.
 *
 * The number takes the accent and a step up in size and weight; the noun stays
 * at the grey line's own size. Two type sizes inside one meta item is the
 * cheapest prominence available here — it lifts the counts clear of the
 * location and the expiry above them without growing the row or turning the
 * whole line black, which would just have put a second title under the title.
 *
 * `text-primary`, never a written-in colour: it follows the brand switcher.
 * NOTE(design): on hirist that lands on an orange 18° of hue from `--warning`,
 * so a count and an expiry warning are nearly the same colour on that brand.
 * On iimjobs they read as clearly different things. Worth a look on both before
 * this ships anywhere.
 */
function Count({ value, label }: { value: number; label: string }) {
  return (
    <MetaItem>
      <span className="text-sm font-semibold text-primary">{value}</span>
      {label}
    </MetaItem>
  )
}

/**
 * There is one fact about a pending job — how long it has been waiting — so it
 * is the only thing the row carries. Review is meant to clear inside a working
 * day, so anything past that turns amber: it has stopped being a wait and
 * started being a thing to chase.
 *
 * THE BADGE IS GREY, NOT AMBER. It says "In review", which is true of every row
 * in this tab and of a job submitted ten minutes ago — a colour on a state that
 * never varies is decoration, and it was competing with the amber on the wait
 * time, which is the part that actually differs row to row.
 */
function PendingRow({ job }: { job: PendingJob }) {
  const heldUp = job.awaitingReviewDays >= 2

  return (
    <JobRowShell
      job={job}
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
      trailing={<Badge variant="secondary">In review</Badge>}
    />
  )
}

/**
 * A closed job is history, so its applicant count moves down into the grey line
 * with everything else — it is no longer a number you act on. The outcome is
 * the one thing that separates two closed rows, so it is the one thing left in
 * the emphasis slot, and only a job you actually filled gets a colour.
 */
function ClosedRow({ job }: { job: ClosedJob }) {
  return (
    <JobRowShell
      job={job}
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
  )
}

/**
 * The reason gets its own panel, not a tooltip and not a truncated meta item —
 * it is the only actionable thing on the card, and a recruiter who cannot read
 * it has to resubmit blind.
 *
 * It sits in a tinted box because that is what stops a red sentence reading as
 * an error thrown by the app: bounded and tinted, it is plainly a quoted note
 * about the posting rather than something the page is complaining about.
 */
function RejectedRow({ job }: { job: RejectedJob }) {
  return (
    <JobRowShell
      job={job}
      details={
        <>
          <Meta separator={false}>
            <Where>{job.location}</Where>
            <MetaItem>
              <ClockIcon />
              Rejected {job.rejectedDaysAgo} days ago
            </MetaItem>
          </Meta>
          {/* `bg-warning/10`, the token pair `Badge`'s warning variant already
              uses, not a written-in amber-50 — it follows the theme into dark
              mode, where a literal amber-50 would be a pale rectangle sitting
              on a dark card.

              THE TEXT IS NOT AMBER. Amber on amber-50 measures 2.85:1, and this
              is 12px body copy, which needs 4.5:1 — the reason is the one thing
              on this card a recruiter has to be able to read. The panel and the
              icon carry the tone; the sentence takes the page's own foreground
              and clears the bar with room to spare. */}
          <div className="mt-0.5 flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs leading-relaxed dark:bg-warning/20">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <span>{job.reason}</span>
          </div>
        </>
      }
      trailing={<Badge variant="destructive">Rejected</Badge>}
    />
  )
}
