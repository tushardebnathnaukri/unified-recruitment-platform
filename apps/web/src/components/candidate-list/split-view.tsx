import * as React from "react"
import {
  ApplicantAvatar,
  ApplicantStatusBadge,
  DecisionGroup,
} from "@/components/applicant-controls"
import { CandidateCv } from "@/components/candidate-cv"
import {
  SnapshotSkills,
  SnapshotStats,
} from "@/components/candidate-list/applicant-card"
import { SaveToList } from "@/components/save-to-list"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import { cn } from "@workspace/ui/lib/utils"
import { isNew, type Applicant, type ApplicantStatus } from "@/lib/applicants"
import { type ListRun, SPLIT_CHROME } from "@/components/candidate-list/shared"

/**
 * The split view — a thin list of people beside the whole of one of them.
 */

/**
 * The Outlook shape: a compact list on the left, the selected candidate filling
 * the right.
 *
 * IT IS THE READING VIEW, where cards are the scanning one and the table is the
 * comparing one. A card gives you enough to triage and no more; this gives you
 * the CV without leaving the list, under a summary of what it does not say at a
 * glance — which is what you want once the list is down to the ten people worth
 * actually reading. See `CardThenCv`.
 *
 * THE ROWS ARE DELIBERATELY THIN. Name, current role, and the one number that
 * decides whether to open somebody — everything else is three inches to the
 * right the moment you click. A list column that repeats what the pane already
 * shows is a card list with a pane bolted on, which is the failure mode of
 * every master-detail screen that grew from a list.
 *
 * THE SELECTION IS IN THE URL. `?candidate=` makes a specific person in a
 * specific list a link somebody can send — the same reason the tab, the view,
 * the sort and the filters are all in there. It also means the pane survives a
 * reload, which a `useState` selection would not.
 */
export function SplitView({
  top,
  applicants,
  sections,
  requiredSkills,
  selectedId,
  onSelect,
  onDecide,
}: {
  /** Height of the sticky tab block, which is all that is above this. */
  top: number
  applicants: Applicant[]
  /** The same people, under their run headings — see `ApplicantList`. */
  sections: ListRun[]
  requiredSkills: string[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  // The first row rather than nothing: an empty pane beside a full list is a
  // screen asking you to do something before it will show you anything.
  const selected =
    applicants.find((applicant) => applicant.id === selectedId) ?? applicants[0]

  return (
    // `-mt-4`: the list column below is flush against the tab toolbar, the way
    // the cards view's filter rail is, so this block starts where the toolbar
    // ends rather than a gap below it. The CV pane puts the gap back for
    // itself with `pt-4`.
    //
    // THE HEIGHT IS MEASURED, NOT GUESSED, AND IT REACHES THE BOTTOM EDGE. It
    // used to be `100svh` minus the header and a hand-counted constant, which
    // was wrong by however much the tab block's own height differed from the
    // guess — and that block wraps, so its height is data. `top` is its
    // measured height (the same number the filter rail sticks below), and the
    // block sits directly under the header, so the two together are everything
    // above this: the height is the rest of the screen.
    //
    // `SPLIT_CHROME` is then cancelled as a NEGATIVE BOTTOM MARGIN rather than
    // taken off the height. It is the page's own padding, and this view wants
    // the edge — subtracting it instead left the columns stopping 44px short
    // with a band of mist under them.
    <div
      style={
        {
          "--split-top": `calc(var(--header-height) + ${top}px)`,
          "--split-chrome": `${SPLIT_CHROME}px`,
        } as React.CSSProperties
      }
      className="flex flex-col gap-4 @3xl/main:-mt-4 @3xl/main:mb-[calc(var(--split-chrome)*-1)] @3xl/main:h-[calc(100svh-var(--split-top))] @3xl/main:flex-row"
    >
      {/* Each column scrolls on its own, which is the whole point of the
          layout — reading a career should not move the list you are working
          through. Below the breakpoint they stack and the page scrolls
          normally, because two scroll areas on a phone is a trap.

          THE LIST IS THE FILTER RAIL'S COLUMN, not a floating card. Both are
          "the column beside the work", so at `@3xl` this drops the rounding,
          the ring and the card fill, runs flush against the nav (the negative
          margin cancels the page gutter) and divides with a `border-r` — and
          its run headings pin themselves the way the rail's heading does. A
          rounded card here and a flush column one view away was the same
          furniture in two shapes. Below the breakpoint the columns stack and
          it goes back to being a card, because nothing is beside it to be a
          column against. */}
      <div
        role="list"
        className="relative flex shrink-0 flex-col gap-1 overflow-y-auto rounded-2xl bg-card p-1.5 ring-1 ring-foreground/10 @3xl/main:-ml-4 @3xl/main:w-80 @3xl/main:gap-0 @3xl/main:rounded-none @3xl/main:border-r @3xl/main:bg-background @3xl/main:p-0 @3xl/main:ring-0 lg:@3xl/main:-ml-6"
      >
        {sections.map((section) => (
          <React.Fragment key={section.key}>
            {section.heading}
            {section.rows.map((applicant) => (
              <SplitRow
                key={applicant.id}
                applicant={applicant}
                selected={applicant.id === selected?.id}
                onSelect={() => onSelect(applicant.id)}
              />
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* `p-px` is load-bearing. The cards below are ringed, and a ring is a
          box-shadow drawn OUTSIDE the border box — so with a card filling this
          pane edge to edge, its outline lands in the overflow and
          `overflow-y-auto` (which clips both axes, not just the one named)
          cuts all four sides off. One pixel gives the ring somewhere to sit. */}
      <div className="relative min-w-0 flex-1 overflow-y-auto p-px @3xl/main:pt-4">
        {selected ? (
          <CardThenCv
            key={selected.id}
            applicant={selected}
            requiredSkills={requiredSkills}
            onDecide={onDecide}
          />
        ) : null}
      </div>
    </div>
  )
}

/**
 * Who this is and what they do: the name, the current role, the decisions and
 * Save, at the head of the summary card.
 *
 * NO "OPEN PROFILE". The summary under it is the profile's at-a-glance facts,
 * so a button opening the same facts in a panel over them was a second way to
 * the thing on screen.
 */
function PaneHeader({
  applicant,
  onDecide,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {/* The card's header, so the same size as the card's avatar. */}
        <ApplicantAvatar
          name={applicant.name}
          photo={applicant.photo}
          fresh={isNew(applicant)}
          className="size-12"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-base font-medium">
              {applicant.name}
            </span>
            {isNew(applicant) ? (
              <span className="sr-only">New</span>
            ) : (
              <ApplicantStatusBadge status={applicant.status} />
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {applicant.title} at {applicant.company}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DecisionGroup applicant={applicant} onDecide={onDecide} />
        <SaveToList applicant={applicant} />
      </div>
    </div>
  )
}

/**
 * The pane: a short summary card, then the CV — one column, one scroll.
 *
 * IT WAS PICKED OVER TWO OTHER PANES, both tried as /settings variants and
 * removed on 6 Oct 2026: the CV and the profile behind tabs, one at a time,
 * and the two side by side in columns that scrolled on their own.
 *
 * THE SUMMARY IS ONLY WHAT THE CV DOES NOT SAY AT A GLANCE. The header, the
 * four numbers everybody compares (Snapshot's strip: experience, notice, pay,
 * location against the posting's cities) and the skills against what the
 * posting asked for. The career, the school and the tags are left out, because
 * the page directly under it is the career and the school — the full card from
 * the cards view was tried here first and said all of it twice.
 *
 * Its own parts rather than a card layout, so it does not change with the
 * Candidate card setting: Snapshot's strip and skills are borrowed because
 * they are already the compact form of those two facts.
 */
function CardThenCv({
  applicant,
  requiredSkills,
  onDecide,
}: {
  applicant: Applicant
  requiredSkills: string[]
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  const matched = applicant.skills.filter((skill) =>
    requiredSkills.includes(skill)
  )

  return (
    <div className="flex flex-col gap-4">
      {/* `@container/card`: the strip goes four across by the card's width,
          as it does on a Snapshot card. */}
      <section
        aria-label={`${applicant.name}, summary`}
        className="@container/card flex flex-col gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
      >
        <PaneHeader applicant={applicant} onDecide={onDecide} />
        <SnapshotStats applicant={applicant} />
        <SnapshotSkills
          applicant={applicant}
          requiredSkills={requiredSkills}
          matched={matched}
        />
      </section>

      <section
        aria-label="CV"
        className="flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
      >
        <h3 className="text-sm font-medium">CV</h3>
        <CandidateCv applicant={applicant} required={requiredSkills} />
      </section>
    </div>
  )
}

/**
 * One line of the list. `aria-current` rather than a pressed button: this
 * selects what the pane shows, it does not act on anybody.
 */
function SplitRow({
  applicant,
  selected,
  onSelect,
}: {
  applicant: Applicant
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group/split flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors @3xl/main:rounded-none",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        selected ? "bg-muted" : "hover:bg-muted/60"
      )}
    >
      {/* The dot's cut-out follows the row's own background, which is muted
          when selected or hovered rather than the card's. */}
      <ApplicantAvatar
        name={applicant.name}
        photo={applicant.photo}
        fresh={isNew(applicant)}
        className="size-10"
        badgeClassName={
          selected ? "ring-muted" : "group-hover/split:ring-muted"
        }
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {applicant.name}
          </span>
          {isNew(applicant) ? (
            <span className="sr-only">New</span>
          ) : (
            <ApplicantStatusBadge status={applicant.status} />
          )}
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {applicant.title} at {applicant.company}
        </span>
        <Meta className="text-[0.6875rem]">
          <MetaItem>{applicant.experienceYears} yrs</MetaItem>
          <MetaItem>
            {applicant.noticeDays === 0
              ? "Available now"
              : `${applicant.noticeDays}d notice`}
          </MetaItem>
        </Meta>
      </div>
    </button>
  )
}
