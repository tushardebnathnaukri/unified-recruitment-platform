import * as React from "react"
import { UserRoundIcon, FunnelXIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { cn } from "@workspace/ui/lib/utils"
import type {
  Applicant,
  ApplicantStatus,
  ResponseBucket,
} from "@/lib/applicants"
import { useListCopy } from "@/lib/list-source"
import type { Verdict } from "@/lib/criteria"
import {
  type ListRun,
  PAGE_SIZE,
  type TableControls,
  type View,
} from "@/components/candidate-list/shared"
import { SelectAll } from "@/components/candidate-list/selection"
import { ApplicantCard } from "@/components/candidate-list/applicant-card"
import { ApplicantTable } from "@/components/candidate-list/applicant-table"
import { SplitView } from "@/components/candidate-list/split-view"

/**
 * Whichever of the three views is showing, under the runs the list is read in.
 *
 * The tab picks the people and this picks how they are drawn, so the three
 * views share the paging, the run headings and the empty state rather than
 * each arriving at them separately.
 */

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
export function ApplicantList({
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
