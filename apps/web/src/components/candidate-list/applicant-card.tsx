import * as React from "react"
import { CheckIcon, ChevronDownIcon, MinusIcon, TagIcon } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Item } from "@workspace/ui/components/item"
import { cn } from "@workspace/ui/lib/utils"
import {
  useCardVariant,
  type CardVariant,
} from "@/components/card-variant-provider"
import {
  ApplicantAvatar,
  ApplicantStatusBadge,
} from "@/components/applicant-controls"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import {
  CURRENT_YEAR,
  isNew,
  tagsFor,
  type Position,
  type Applicant,
  type ApplicantStatus,
} from "@/lib/applicants"
import { toProfile } from "@/lib/database-filters"
import { useListCopy } from "@/lib/list-source"
import type { Verdict } from "@/lib/criteria"
import { CriteriaEvidence } from "@/components/criteria-evidence"
import { PickBox } from "@/components/candidate-list/selection"
import { TargetCitiesContext } from "@/components/candidate-list/shared"
import {
  CardActions,
  QuietCardActions,
  RowActions,
} from "@/components/candidate-list/applicant-actions"

/**
 * One person as a card, and the buckets of facts inside it.
 *
 * THE LAYOUTS AND THEIR BUCKETS ARE ONE FILE because the buckets are what the
 * layouts differ about: rows, columns and bands draw the same contents in a
 * different arrangement, so a fact that moves has to move in all of them at
 * once.
 */

/**
 * Which layout draws the buckets, keyed by the /settings choice.
 *
 * A MAP RATHER THAN A CHAIN OF TERNARIES, because `Record<CardVariant, …>` makes
 * it exhaustive: adding a variant to `card-variant-provider.tsx` and forgetting
 * to draw it is a type error here rather than a card that silently falls back
 * to Stacked. All three take the same props for the same reason the buckets are
 * shared — a variant decides where a fact sits, never what the card knows.
 */
const BUCKETS_FOR: Record<
  Exclude<CardVariant, "snapshot" | "screening">,
  (props: BucketProps) => React.ReactNode
> = {
  stacked: BucketRows,
  columns: BucketColumns,
  sections: BucketSections,
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
 * THREE LAYOUTS OF THE SAME BUCKETS, chosen on /settings: labels down the left,
 * the buckets across, or full-width bands with a rule between. The header, the
 * actions and the buckets' CONTENTS are shared — only where they sit changes,
 * which is what makes the three comparable at all. See `BucketRows`,
 * `BucketColumns` and `BucketSections`.
 *
 * The card is still not a link — its actions are the point, and the profile
 * behind it does not exist yet. See `RowActions`.
 */
export function ApplicantCard({
  applicant,
  requiredSkills,
  verdicts,
  annotation,
  onDecide,
  onOpenProfile,
}: {
  applicant: Applicant
  requiredSkills: string[]
  /** One line of evidence per criterion, in rank order. Search results only. */
  verdicts?: Verdict[]
  /** The caller's own block, after the evidence — see `annotate`. */
  annotation?: React.ReactNode
  onDecide: (id: string, status: ApplicantStatus) => void
  onOpenProfile: (id: string) => void
}) {
  const { variant } = useCardVariant()

  // SNAPSHOT AND SCREENING ARE WHOLE CARDS, NOT ANOTHER SET OF BUCKETS: they
  // move the decisions and the header too, so they cannot be drawn by swapping
  // the block in the middle the way the other three are. They still read the
  // same facts.
  if (variant === "snapshot" || variant === "screening") {
    const props = {
      applicant,
      requiredSkills,
      verdicts,
      annotation,
      onDecide,
      onOpenProfile,
    }
    return variant === "snapshot" ? (
      <SnapshotCard {...props} />
    ) : (
      <ScreeningCard {...props} />
    )
  }

  return (
    <BucketCard
      Buckets={BUCKETS_FOR[variant]}
      applicant={applicant}
      requiredSkills={requiredSkills}
      verdicts={verdicts}
      annotation={annotation}
      onDecide={onDecide}
      onOpenProfile={onOpenProfile}
    />
  )
}

type CardProps = {
  applicant: Applicant
  requiredSkills: string[]
  verdicts?: Verdict[]
  annotation?: React.ReactNode
  onDecide: (id: string, status: ApplicantStatus) => void
  onOpenProfile: (id: string) => void
}

/** Stacked, Columns and Sections: one header and footer, three middles. */
function BucketCard({
  Buckets,
  applicant,
  requiredSkills,
  verdicts,
  annotation,
  onDecide,
  onOpenProfile,
}: CardProps & { Buckets: (props: BucketProps) => React.ReactNode }) {
  const copy = useListCopy()
  const [showAllRoles, setShowAllRoles] = React.useState(false)
  const roles = showAllRoles
    ? applicant.positions
    : applicant.positions.slice(0, 2)
  const tags = React.useMemo(() => tagsFor(applicant), [applicant])
  const matched = applicant.skills.filter((skill) =>
    requiredSkills.includes(skill)
  )

  return (
    <Item className="@container/card flex-col items-stretch gap-3 bg-card px-5 py-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* Beside the photo, vertically on its middle: the tick is about the
              person, and the photo is the person at a glance. */}
          <PickBox applicant={applicant} className="mt-4" />
          <ApplicantAvatar
            name={applicant.name}
            photo={applicant.photo}
            fresh={isNew(applicant)}
            className="size-12"
          />

          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* THE NAME OPENS THE PROFILE, as it does in the table's
                  `CandidateCell`. Reading somebody is the one thing a card
                  cannot do in place, and the name is where anybody clicks to
                  do it — "View profile" at the foot of the card stays, because
                  a name that happens to be a link is not a discoverable way to
                  find out there is a profile at all. The card itself is not
                  clickable: it already carries three decisions, a checkbox and
                  a menu, and a click target wrapped around those is a click
                  target you cannot avoid hitting. */}
              <button
                type="button"
                onClick={() => onOpenProfile(applicant.id)}
                className="rounded-sm text-left font-heading text-base font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {applicant.name}
              </button>
              {isNew(applicant) ? (
                <span className="sr-only">New</span>
              ) : (
                <ApplicantStatusBadge status={applicant.status} />
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {applicant.title} at {applicant.company}
            </span>
            <Meta>
              <MetaItem>{applicant.location}</MetaItem>
              <MetaItem>
                {copy.arrived} {applicant.appliedAgo}
              </MetaItem>
            </Meta>
          </div>
        </div>

        <RowActions
          applicant={applicant}
          onDecide={onDecide}
          className="-my-1.5 -mr-2"
        />
      </div>

      <Buckets
        applicant={applicant}
        roles={roles}
        tags={tags}
        matched={matched}
        asked={requiredSkills.length > 0}
        showAllRoles={showAllRoles}
        onToggleRoles={() => setShowAllRoles((shown) => !shown)}
      />

      {verdicts && verdicts.length > 0 && (
        <CriteriaEvidence verdicts={verdicts} />
      )}

      {annotation}

      <CardActions
        applicant={applicant}
        onDecide={onDecide}
        onOpenProfile={onOpenProfile}
      />
    </Item>
  )
}

/**
 * Snapshot: the card a recruiter reads in two seconds and decides from.
 *
 * READ TOP TO BOTTOM IT ANSWERS THE QUESTIONS IN THE ORDER THEY ARE ASKED:
 * who is this, the numbers I compare, do they have what this job asks for, how
 * did they get here, and then the decision. The order was set by an audit of
 * the first version, which had the fit to the posting — the one fact on the
 * card about THIS job — last, under a career and an education.
 *
 * THE FOUR NUMBERS EVERYBODY COMPARES SIT IN ONE STRIP, in the same place on
 * every card — experience, notice, current pay, location. The other layouts
 * put them in sentences ("45 days notice · ₹110L current"), which is fine on
 * one card and has to be re-read on the next; a strip with each figure at the
 * same x is a column down the list, so "who can join soonest" is a glance down
 * the second cell rather than a read of twenty lines.
 *
 * THREE TEXT LEVELS, NO MORE, AND EACH LOOKS DIFFERENT. The name is the one
 * 18px thing on the card, so it outranks the strip's 16px figures rather than
 * tying with them. Section headings ("Skills match", "Previously") are 14px
 * semibold in the foreground; the strip's cell labels are 12px muted. They were
 * both small and grey, a weight apart, which read as one level.
 *
 * NOTHING IS SAID TWICE. The current role is the header's ("… at ICICI Bank ·
 * since 2023"), so the timeline starts at the role BEFORE it, under
 * "Previously"; "Top institute" sits on the school it is about rather than
 * among the tags 60px from it.
 *
 * ON A PHONE THE DECISIONS GO TO THE FOOT, WITH WORDS. Beside the name they cost
 * the name its width (on 343px the group and the ⋯ leave ~150px for a name and
 * a title), and three bare icons are a guess on a screen with no hover to
 * explain them. At the foot they are full-width, labelled, and under the thumb
 * — and they come after the facts, which is the order a decision is made in.
 * On a card wider than `@xl` they go back up to the top-right corner the other
 * layouts use, icons only. It is ONE `RowActions` moved by the grid, not two
 * copies shown and hidden, so its interview dialog and menu exist once — and
 * since it is after the facts in the DOM, the tab order is read, then decide.
 *
 * Everything measures the CARD (`@…/card`), not the window, for the reason
 * `BucketColumns` gives: the card is half the screen beside the filter rail.
 */
function SnapshotCard({
  applicant,
  requiredSkills,
  verdicts,
  annotation,
  onDecide,
  onOpenProfile,
}: CardProps) {
  const copy = useListCopy()
  const [showAllRoles, setShowAllRoles] = React.useState(false)
  const allTags = React.useMemo(() => tagsFor(applicant), [applicant])
  const topInstitute = allTags.includes(TOP_INSTITUTE)
  const tags = allTags.filter((tag) => tag !== TOP_INSTITUTE)
  const matched = applicant.skills.filter((skill) =>
    requiredSkills.includes(skill)
  )
  const [current, ...earlier] = applicant.positions
  const since = current && current.to === null ? current.from : null

  return (
    <Item className="@container/card flex-col items-stretch bg-card px-4 py-4 ring-1 ring-foreground/10 @xl/card:px-5">
      {/* The grid is a child because a container query cannot style the
          container itself. One column until `@xl`; then a second, `auto`,
          which only the decisions use — `grid-area: 1/2` lifts them beside the
          name while everything else spans both. It is `grid-area` with `!`
          because the span-everything rule is on the parent's `[&>*]`, and a
          `col-span-1!` would have reset the column start with it. */}
      <div className="grid w-full grid-cols-[minmax(0,1fr)] gap-4 @xl/card:grid-cols-[minmax(0,1fr)_auto] [&>*]:col-span-full">
        {/* WHO AND WHAT, nothing else: the name with when they arrived beside
            it, and the role with how long they have held it. "New" is left to
            the dot on the photo, as on every other card. */}
        <div className="flex min-w-0 items-center gap-3.5 @xl/card:[grid-area:1/1]!">
          <PickBox applicant={applicant} />
          <ApplicantAvatar
            name={applicant.name}
            photo={applicant.photo}
            fresh={isNew(applicant)}
            className="size-12"
          />

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5">
              {/* The name opens the profile — see the note in `BucketCard`. */}
              <button
                type="button"
                onClick={() => onOpenProfile(applicant.id)}
                className="min-w-0 truncate rounded-sm text-left font-heading text-lg leading-6 font-semibold outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {applicant.name}
              </button>
              <ApplicantStatusBadge status={applicant.status} />
              <span className="text-xs text-muted-foreground">
                {/* The dot on the photo says new; this is for a screen
                    reader, which cannot see it. */}
                {isNew(applicant) && <span className="sr-only">New, </span>}
                {copy.arrived} {applicant.appliedAgo}
              </span>
            </div>
            <p className="line-clamp-2 text-sm leading-5">
              <span className="font-medium">{applicant.title}</span>{" "}
              <span className="text-muted-foreground">
                at {applicant.company}
                {since !== null && <> · since {since}</>}
              </span>
            </p>
          </div>
        </div>

        <SnapshotStats applicant={applicant} />

        <SnapshotSkills
          applicant={applicant}
          requiredSkills={requiredSkills}
          matched={matched}
        />

        <div className="grid gap-x-8 gap-y-4 @2xl/card:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {earlier.length > 0 && (
            <section className="flex min-w-0 flex-col gap-2">
              <h3 className="text-sm leading-5 font-semibold">Previously</h3>
              <CareerTimeline
                roles={earlier}
                showAll={showAllRoles}
                onToggle={() => setShowAllRoles((shown) => !shown)}
              />
            </section>
          )}

          {/* Education and the tags share the narrower column: beside a
              career it was mostly air, and a line of tags under it costs the
              card no height at all. */}
          <div className="flex min-w-0 flex-col gap-4">
            <section className="flex min-w-0 flex-col gap-2">
              <h3 className="text-sm leading-5 font-semibold">Education</h3>
              <div className="flex flex-col items-start text-sm leading-5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">
                    {applicant.education.school}
                  </span>
                  {/* The tag, on the school it is about. */}
                  {topInstitute && (
                    <Badge variant="secondary" className="font-normal">
                      {TOP_INSTITUTE}
                    </Badge>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {applicant.education.degree} · {applicant.education.from}–
                  {applicant.education.to}
                </span>
              </div>
            </section>
            {/* THE TAGS ARE A LINE OF WORDS, not chips, and last of the facts.
                As chips they were a third family beside the matched skills and
                the other skills, all pills, and read as more skills at a
                glance; on the strip they read as part of the numbers. Words
                with a tag glyph say "a description", which is what they are. */}
            {tags.length > 0 && (
              <p className="flex items-start gap-2 text-sm leading-5 text-muted-foreground">
                <TagIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="sr-only">Tags: </span>
                  {tags.join(" · ")}
                </span>
              </p>
            )}
          </div>
        </div>

        {verdicts && verdicts.length > 0 && (
          <CriteriaEvidence verdicts={verdicts} />
        )}

        {annotation}

        {/* Full width with words at the foot of a narrow card, icons in the
            top-right corner of a wide one. The words stay in the DOM as
            `sr-only` up there; the `aria-label` names each one regardless. */}
        <RowActions
          applicant={applicant}
          onDecide={onDecide}
          className="border-t border-border pt-4 @xl/card:-my-1.5 @xl/card:-mr-2 @xl/card:self-start @xl/card:border-t-0 @xl/card:pt-0 @xl/card:[grid-area:1/2]!"
          decisionClassName="flex-1 *:flex-1 *:shrink @xl/card:flex-none @xl/card:*:flex-none @xl/card:*:shrink-0"
          labelClassName="@xl/card:sr-only"
        />

        <QuietCardActions
          applicant={applicant}
          onDecide={onDecide}
          onOpenProfile={onOpenProfile}
        />
      </div>
    </Item>
  )
}

/**
 * The strip. Two by two on a phone, four across from `@lg`, where a rule
 * between the cells takes over from the gap. A cell is a label, the figure and
 * an optional line of context under it — a cell with no context leaves the
 * line out rather than padding it, so the figures still share a baseline.
 *
 * Pay is "₹110L/yr" in one figure: "per annum" under it was a line as loud as
 * the label above it that said nothing a recruiter in this market does not
 * already assume.
 */
export function SnapshotStats({ applicant }: { applicant: Applicant }) {
  const targets = React.useContext(TargetCitiesContext)
  const fit = locationFit(applicant, targets)

  const cells: {
    label: string
    value: string
    unit?: string
    detail?: string
    /** Whether the detail answers the posting's question yes or no. */
    verdict?: "yes" | "no"
  }[] = [
    {
      label: "Experience",
      value: `${applicant.experienceYears} yrs`,
      detail: `${applicant.positions.length} roles`,
    },
    {
      label: "Notice",
      value:
        applicant.noticeDays === 0
          ? "Immediate"
          : `${applicant.noticeDays} days`,
      detail: applicant.noticeDays === 0 ? "Can join now" : undefined,
    },
    {
      label: "Current pay",
      value: `₹${applicant.currentCtcLakh}L`,
      unit: "/yr",
    },
    {
      label: "Location",
      value: applicant.location,
      detail: fit.detail,
      verdict: fit.verdict,
    },
  ]

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-muted/60 px-4 py-3 @lg/card:grid-cols-4 @lg/card:gap-x-0 @lg/card:[&>div]:pr-4 @lg/card:[&>div+div]:border-l @lg/card:[&>div+div]:border-border @lg/card:[&>div+div]:pl-4">
      {cells.map((cell) => (
        <div key={cell.label} className="flex min-w-0 flex-col">
          <dt className="text-xs text-muted-foreground">{cell.label}</dt>
          <dd className="truncate text-base leading-6 font-semibold tabular-nums">
            {cell.value}
            {cell.unit && (
              <span className="text-xs font-normal text-muted-foreground">
                {cell.unit}
              </span>
            )}
          </dd>
          {cell.detail && (
            <dd
              className={cn(
                "flex min-w-0 items-start gap-1 text-xs leading-4",
                cell.verdict === "yes"
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
              title={cell.detail}
            >
              {cell.verdict === "yes" && (
                <CheckIcon aria-hidden className="mt-0.5 size-3 shrink-0" />
              )}
              {cell.verdict === "no" && (
                <MinusIcon aria-hidden className="mt-0.5 size-3 shrink-0" />
              )}
              <span className="line-clamp-2">{cell.detail}</span>
            </dd>
          )}
        </div>
      ))}
    </dl>
  )
}

/** How many of their other skills show before the rest are counted. */
const OTHER_SKILLS_SHOWN = 4

/**
 * The fit to the posting, straight under the strip: the score, then the chips.
 *
 * THE SCORE IS READ FIRST, so it is the section's own figure — "1 of 4" at the
 * heading's size beside the heading, with the bar — rather than 12px pushed to
 * the far edge. Then the matched chips, a few of their own skills in plain
 * outline, and the asked-for ones they lack as a line of words: dashed chips
 * beside solid ones were too quiet a difference to read as "not there", and a
 * gap should not look like something they have.
 *
 * NO GREEN HERE, unlike the other layouts. On iimjobs the brand is emerald, so
 * the checkbox, the new dot, the bookmark and "this skill matched" all came out
 * the same green and the match stopped meaning anything. Matched is a filled
 * chip with a tick and weight in the foreground; their other skills are
 * outlines in muted text; the bar fills in the foreground. Fill against
 * outline is the difference, and it reads the same on both brands and in dark.
 *
 * With nothing asked (a search that named no skills) there is no score to keep,
 * so it is the person's skills alone under a plain "Skills".
 */
export function SnapshotSkills({
  applicant,
  requiredSkills,
  matched,
}: {
  applicant: Applicant
  requiredSkills: string[]
  matched: string[]
}) {
  const asked = requiredSkills.length > 0
  const missing = requiredSkills.filter((skill) => !matched.includes(skill))
  const others = applicant.skills.filter((skill) => !matched.includes(skill))
  const shown = others.slice(0, OTHER_SKILLS_SHOWN)
  const rest = others.slice(OTHER_SKILLS_SHOWN)

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-sm leading-5 font-semibold">
          {asked ? "Skills match" : "Skills"}
        </h3>
        {asked && (
          <div className="flex items-center gap-2">
            <div
              role="meter"
              aria-label="Skills matched"
              aria-valuemin={0}
              aria-valuemax={requiredSkills.length}
              aria-valuenow={matched.length}
              className="flex gap-0.5"
            >
              {requiredSkills.map((skill, index) => (
                <span
                  key={skill}
                  className={
                    index < matched.length
                      ? "h-1.5 w-5 rounded-full bg-foreground"
                      : "h-1.5 w-5 rounded-full bg-muted"
                  }
                />
              ))}
            </div>
            <span className="text-sm leading-5 text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">
                {matched.length}
              </span>{" "}
              of {requiredSkills.length}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {matched.map((skill) => (
          <Badge key={skill} variant="secondary">
            <CheckIcon data-icon="inline-start" />
            {skill}
            <span className="sr-only"> (asked for)</span>
          </Badge>
        ))}
        {shown.map((skill) => (
          <Badge
            key={skill}
            variant="outline"
            className="font-normal text-muted-foreground"
          >
            {skill}
          </Badge>
        ))}
        {rest.length > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Badge
                  variant="outline"
                  className="font-normal text-muted-foreground"
                />
              }
            >
              +{rest.length}
              <span className="sr-only"> more: {rest.join(", ")}</span>
            </TooltipTrigger>
            <TooltipContent>{rest.join(" · ")}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {asked && missing.length > 0 && (
        <p className="text-xs leading-5 text-muted-foreground">
          Missing <span className="text-foreground">{missing.join(" · ")}</span>
        </p>
      )}
    </section>
  )
}

/**
 * Screening: the card a recruiter shortlists from.
 *
 * IT BEGAN AS A REORGANISATION OF SNAPSHOT, after reading how recruiters
 * screen, and is kept beside it rather than replacing it so the two can be
 * compared: the same facts, Snapshot ordered by what is easiest to compare,
 * this one by the order a decision is made in.
 *
 * IT IS ORDERED BY HOW A SHORTLIST IS ACTUALLY MADE, which is two passes, not
 * one read. The first pass is knockouts — the handful of must-haves a person
 * either clears or does not: the skills, whether they can be in the city, when
 * they could start, whether the pay can work — and it takes seconds. Only the
 * people who clear it get the second pass, which is the record: who they have
 * worked for and for how long, rising or drifting, and where they studied. So
 * the card is three blocks in that order: who this is, the gates, the record.
 *
 * WHO is the name and the current title, employer and time in the role. The
 * Ladders eye-tracking study (2018) found a recruiter's first look at a CV goes
 * to exactly that — name, current title and employer, its dates — then the
 * previous role and the education, which are the third block.
 *
 * THE GATES ARE ONE GREY PANEL (`ScreeningGates`), so "do they clear what this
 * posting asks" is one place to look rather than three. The comparable figures
 * run across it in the same positions on every card, and under them the
 * posting's own skills, in the posting's own order, each ticked or not.
 *
 * THE RECORD is the roles before this one, each with how long it lasted; the
 * signals `tagsFor` reads off them; and the school, with "Top institute" on it.
 *
 * Every verdict on the card is a tick or a minus in the card's own greys —
 * never green, which on iimjobs is the brand, and never red, which would make
 * a missing skill look like an error rather than an answer.
 *
 * The decisions, the footer and the grid that moves them are Snapshot's, for
 * Snapshot's reasons — see `SnapshotCard`.
 */
function ScreeningCard({
  applicant,
  requiredSkills,
  verdicts,
  annotation,
  onDecide,
  onOpenProfile,
}: CardProps) {
  const copy = useListCopy()
  const [showAllRoles, setShowAllRoles] = React.useState(false)
  const allTags = React.useMemo(() => tagsFor(applicant), [applicant])
  const topInstitute = allTags.includes(TOP_INSTITUTE)
  const signals = allTags.filter((tag) => tag !== TOP_INSTITUTE)
  const [current, ...earlier] = applicant.positions
  const inRole =
    current && current.to === null ? CURRENT_YEAR - current.from : null

  return (
    <Item className="@container/card flex-col items-stretch bg-card px-4 py-4 ring-1 ring-foreground/10 @xl/card:px-5">
      {/* The grid is a child because a container query cannot style the
          container itself. One column until `@xl`; then a second, `auto`,
          which only the decisions use — `grid-area: 1/2` lifts them beside the
          name while everything else spans both. It is `grid-area` with `!`
          because the span-everything rule is on the parent's `[&>*]`, and a
          `col-span-1!` would have reset the column start with it. */}
      <div className="grid w-full grid-cols-[minmax(0,1fr)] gap-4 @xl/card:grid-cols-[minmax(0,1fr)_auto] [&>*]:col-span-full">
        {/* WHO: the name with when they arrived beside it, and the role with
            how long they have held it — a duration, so nobody subtracts.
            "New" is left to the dot on the photo, as on every other card. */}
        <div className="flex min-w-0 items-center gap-3.5 @xl/card:[grid-area:1/1]!">
          <PickBox applicant={applicant} />
          <ApplicantAvatar
            name={applicant.name}
            photo={applicant.photo}
            fresh={isNew(applicant)}
            className="size-12"
          />

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5">
              {/* The name opens the profile — see the note in `BucketCard`. */}
              <button
                type="button"
                onClick={() => onOpenProfile(applicant.id)}
                className="min-w-0 truncate rounded-sm text-left font-heading text-lg leading-6 font-semibold outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {applicant.name}
              </button>
              <ApplicantStatusBadge status={applicant.status} />
              <span className="text-xs text-muted-foreground">
                {/* The dot on the photo says new; this is for a screen
                    reader, which cannot see it. */}
                {isNew(applicant) && <span className="sr-only">New, </span>}
                {copy.arrived} {applicant.appliedAgo}
              </span>
            </div>
            <p className="line-clamp-2 text-sm leading-5">
              <span className="font-medium">{applicant.title}</span>{" "}
              <span className="text-muted-foreground">
                at {applicant.company}
                {inRole !== null && <> · {yearsSaid(inRole)} in role</>}
              </span>
            </p>
          </div>
        </div>

        <ScreeningGates applicant={applicant} requiredSkills={requiredSkills} />

        {/* A search's criteria are gates too — what the search asked of each
            person, answered — so they follow the panel rather than the
            record. */}
        {verdicts && verdicts.length > 0 && (
          <CriteriaEvidence verdicts={verdicts} />
        )}

        {/* THE RECORD, the second pass. The roles take the wide column
            because they are the list; the signals and the school share the
            narrow one, signals first because they are read off the roles
            beside them and change a decision more often than a degree does. */}
        <div className="grid gap-x-8 gap-y-4 @2xl/card:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {earlier.length > 0 && (
            <section className="flex min-w-0 flex-col gap-2">
              <h3 className="text-sm leading-5 font-semibold">Previously</h3>
              <CareerTimeline
                roles={earlier}
                showAll={showAllRoles}
                onToggle={() => setShowAllRoles((shown) => !shown)}
                durations
              />
            </section>
          )}

          <div className="flex min-w-0 flex-col gap-4">
            {signals.length > 0 && (
              <section className="flex min-w-0 flex-col gap-2">
                <h3 className="text-sm leading-5 font-semibold">Signals</h3>
                <p className="text-sm leading-5">{signals.join(" · ")}</p>
              </section>
            )}

            <section className="flex min-w-0 flex-col gap-2">
              <h3 className="text-sm leading-5 font-semibold">Education</h3>
              <div className="flex flex-col items-start text-sm leading-5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">
                    {applicant.education.school}
                  </span>
                  {/* The tag, on the school it is about. */}
                  {topInstitute && (
                    <Badge variant="secondary" className="font-normal">
                      {TOP_INSTITUTE}
                    </Badge>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {applicant.education.degree} · {applicant.education.from}–
                  {applicant.education.to}
                </span>
              </div>
            </section>
          </div>
        </div>

        {annotation}

        {/* Full width with words at the foot of a narrow card, icons in the
            top-right corner of a wide one. The words stay in the DOM as
            `sr-only` up there; the `aria-label` names each one regardless. */}
        <RowActions
          applicant={applicant}
          onDecide={onDecide}
          className="border-t border-border pt-4 @xl/card:-my-1.5 @xl/card:-mr-2 @xl/card:self-start @xl/card:border-t-0 @xl/card:pt-0 @xl/card:[grid-area:1/2]!"
          decisionClassName="flex-1 *:flex-1 *:shrink @xl/card:flex-none @xl/card:*:flex-none @xl/card:*:shrink-0"
          labelClassName="@xl/card:sr-only"
        />

        <QuietCardActions
          applicant={applicant}
          onDecide={onDecide}
          onOpenProfile={onOpenProfile}
        />
      </div>
    </Item>
  )
}

/** The `tagsFor` tag Snapshot draws on the school rather than with the rest. */
const TOP_INSTITUTE = "Top institute"

/** A tenure as a duration — "2 yrs" — so nobody subtracts one year from another. */
function yearsSaid(years: number) {
  if (years < 1) return "under 1 yr"
  return years === 1 ? "1 yr" : `${years} yrs`
}

/**
 * The gates: everything a first pass asks of a person, in one panel.
 *
 * THE FIGURES RUN ACROSS IN FIXED POSITIONS — experience, location, notice,
 * expected pay — two by two on a phone, four across from `@lg`, with a rule
 * between. The same figure at the same x on every card is a column down the
 * list, so "who can join soonest" is a glance down the third cell rather than
 * a read of twenty sentences.
 *
 * EXPECTED PAY, NOT CURRENT, IS THE FIGURE. Recruiters in this market check
 * the expected CTC against the budget before anything is scheduled, and the
 * current one is the context for it — so current is the line under it, with
 * the jump between them ("now ₹110L · +25%"), where a 60% ask stands out on
 * its own. It is `toProfile`'s figure, the same one Search Resume's Expected
 * CTC filter narrows on, so the card and that filter cannot disagree.
 *
 * THE SKILLS ARE THE POSTING'S, NOT THE PERSON'S — see `SkillsChecklist`.
 *
 * Only location and skills carry a verdict, because they are the only two
 * things a posting here says it wants. A posting does not yet carry an
 * experience band, a notice limit or a budget (`lib/jobs.ts`); when it does,
 * those three cells take a tick or a minus the same way location does.
 */
function ScreeningGates({
  applicant,
  requiredSkills,
}: {
  applicant: Applicant
  requiredSkills: string[]
}) {
  const copy = useListCopy()
  const targets = React.useContext(TargetCitiesContext)
  const fit = locationFit(applicant, targets)
  const expected = React.useMemo(
    () => toProfile(applicant).expectedCtcLakh,
    [applicant]
  )
  const jump = Math.round((expected / applicant.currentCtcLakh - 1) * 100)

  const cells: {
    label: string
    value: string
    unit?: string
    detail?: string
    /** Whether the detail answers the posting's question yes or no. */
    verdict?: "yes" | "no"
  }[] = [
    {
      label: "Experience",
      value: `${applicant.experienceYears} yrs`,
      detail: `${applicant.positions.length} roles`,
    },
    {
      label: "Location",
      value: applicant.location,
      detail: fit.detail,
      verdict: fit.verdict,
    },
    {
      label: "Notice",
      value:
        applicant.noticeDays === 0
          ? "Immediate"
          : `${applicant.noticeDays} days`,
      detail: applicant.noticeDays === 0 ? "Can join now" : undefined,
    },
    {
      label: "Expected pay",
      value: `₹${expected}L`,
      unit: "/yr",
      detail: `now ₹${applicant.currentCtcLakh}L · ${jump >= 0 ? "+" : ""}${jump}%`,
    },
  ]

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-muted/60 px-4 py-3">
      <h3 className="sr-only">Against what {copy.askedFor}</h3>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 @lg/card:grid-cols-4 @lg/card:gap-x-0 @lg/card:[&>div]:pr-4 @lg/card:[&>div+div]:border-l @lg/card:[&>div+div]:border-border @lg/card:[&>div+div]:pl-4">
        {cells.map((cell) => (
          <div key={cell.label} className="flex min-w-0 flex-col">
            <dt className="text-xs text-muted-foreground">{cell.label}</dt>
            <dd className="truncate text-base leading-6 font-semibold tabular-nums">
              {cell.value}
              {cell.unit && (
                <span className="text-xs font-normal text-muted-foreground">
                  {cell.unit}
                </span>
              )}
            </dd>
            {cell.detail && (
              <dd
                className={cn(
                  "flex min-w-0 items-start gap-1 text-xs leading-4",
                  cell.verdict === "yes"
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
                title={cell.detail}
              >
                {cell.verdict === "yes" && (
                  <CheckIcon aria-hidden className="mt-0.5 size-3 shrink-0" />
                )}
                {cell.verdict === "no" && (
                  <MinusIcon aria-hidden className="mt-0.5 size-3 shrink-0" />
                )}
                <span className="line-clamp-2">{cell.detail}</span>
              </dd>
            )}
          </div>
        ))}
      </dl>

      <div className="border-t border-border pt-3">
        <SkillsChecklist
          applicant={applicant}
          requiredSkills={requiredSkills}
        />
      </div>
    </section>
  )
}

/**
 * The posting's skills, in the posting's order, each ticked or not — a
 * checklist, not a pile of chips.
 *
 * THE SAME NAMES IN THE SAME ORDER ON EVERY CARD is the point. The first
 * version drew the person's matched skills first and the missing ones as a
 * line under them, so the order changed from card to card and "has Channel
 * sales" was somewhere different each time. Fixed, the eye learns where each
 * requirement sits and reads the pattern of ticks down the list — the same
 * reason the figures above sit in fixed cells.
 *
 * Had is a white chip with a tick; missing is a dashed outline with a minus,
 * in muted text. The dashed outline alone was too quiet to read as "not
 * there" when it was the only difference; with the tick and the minus it is
 * the second cue, not the only one. Their other skills — ones nobody asked for
 * — are context, so they are a count with the names on hover.
 *
 * With nothing asked (a search that named no skills) there is nothing to tick
 * against, so it is the person's skills as they are.
 *
 * The count sits in the panel's first column, label over figure like the cells
 * above, and the chips start after the same rule — so on a wide card the first
 * divider runs down through both rows.
 */
function SkillsChecklist({
  applicant,
  requiredSkills,
}: {
  applicant: Applicant
  requiredSkills: string[]
}) {
  const copy = useListCopy()
  const has = (skill: string) => applicant.skills.includes(skill)
  const matched = requiredSkills.filter(has)
  const others = applicant.skills.filter(
    (skill) => !requiredSkills.includes(skill)
  )

  if (requiredSkills.length === 0) {
    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">Skills</span>
        <div className="flex flex-wrap gap-1.5">
          {applicant.skills.map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className="bg-card font-normal"
            >
              {skill}
            </Badge>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-y-2 @lg/card:grid-cols-4">
      <div className="flex min-w-0 flex-col @lg/card:pr-4">
        <span className="text-xs text-muted-foreground">Skills</span>
        <span className="text-base leading-6 font-semibold tabular-nums">
          {matched.length} of {requiredSkills.length}
          <span className="sr-only"> skills {copy.askedFor}</span>
        </span>
      </div>

      <ul className="flex min-w-0 flex-wrap content-center items-center gap-1.5 @lg/card:col-span-3 @lg/card:border-l @lg/card:border-border @lg/card:pl-4">
        {requiredSkills.map((skill) =>
          has(skill) ? (
            <li key={skill}>
              <Badge
                variant="outline"
                className="border-foreground/15 bg-card font-medium text-foreground"
              >
                <CheckIcon data-icon="inline-start" />
                {skill}
                <span className="sr-only">, has it</span>
              </Badge>
            </li>
          ) : (
            <li key={skill}>
              <Badge
                variant="outline"
                className="border-dashed border-foreground/25 bg-transparent font-normal text-muted-foreground"
              >
                <MinusIcon data-icon="inline-start" />
                {skill}
                <span className="sr-only">, missing</span>
              </Badge>
            </li>
          )
        )}

        {others.length > 0 && (
          <li>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge
                    variant="outline"
                    className="border-transparent bg-transparent font-normal text-muted-foreground"
                  />
                }
              >
                +{others.length} other{" "}
                {others.length === 1 ? "skill" : "skills"}
                <span className="sr-only">: {others.join(", ")}</span>
              </TooltipTrigger>
              <TooltipContent>{others.join(" · ")}</TooltipContent>
            </Tooltip>
          </li>
        )}
      </ul>
    </div>
  )
}

/**
 * Cities a posting's location covers. A posting says "Delhi NCR"; the people
 * say Gurugram or Noida — the same split `LOCATION_GROUPS` in
 * `lib/database-filters.ts` makes for the refine panel.
 */
const CITY_REGIONS: Record<string, string[]> = {
  "Delhi NCR": ["Delhi NCR", "Gurugram", "Noida"],
}

/**
 * The location cell's second line, answering the question the posting asks —
 * are they there, or would they go there — rather than only where else they
 * would go. A check or a minus in the card's own greys (see `ScreeningCard`).
 *
 * "Not open to Pune" is what the data says, not a guess: `preferredLocations`
 * is every city they would take a job in. Without a target (a search, My
 * Lists, a posting in several cities) it says where else they would go, as the
 * other layouts do.
 */
function locationFit(
  applicant: Applicant,
  targets: string[]
): { detail: string; verdict?: "yes" | "no" } {
  const elsewhere = applicant.preferredLocations.filter(
    (place) => place !== applicant.location
  )

  if (targets.length === 0) {
    return {
      detail:
        elsewhere.length === 0
          ? "Not open to moving"
          : elsewhere.includes("Anywhere")
            ? "Open to anywhere"
            : `Open to ${elsewhere.join(", ")}`,
    }
  }

  const covers = (place: string) =>
    targets.some((target) => (CITY_REGIONS[target] ?? [target]).includes(place))
  const job = targets.join(" / ")

  if (covers(applicant.location)) {
    return { detail: `In ${job}`, verdict: "yes" }
  }
  if (
    applicant.preferredLocations.includes("Anywhere") ||
    applicant.preferredLocations.some(covers)
  ) {
    return { detail: `Open to ${job}`, verdict: "yes" }
  }
  return { detail: `Not open to ${job}`, verdict: "no" }
}

/** How many earlier roles show before "Show N more". */
const EARLIER_SHOWN = 2

/**
 * The roles BEFORE the current one — the header already names that one — as
 * hollow dots joined by a line. The line stops at the last role shown, so a
 * collapsed history does not trail off into a line to nowhere; "Show N more"
 * says there is more.
 *
 * `durations` adds how long each role lasted, which Screening asks for:
 * stability is read off it, and two years read faster than 2021–2023.
 */
function CareerTimeline({
  roles,
  showAll,
  onToggle,
  durations = false,
}: {
  roles: Position[]
  showAll: boolean
  onToggle: () => void
  durations?: boolean
}) {
  const shown = showAll ? roles : roles.slice(0, EARLIER_SHOWN)

  return (
    <div className="flex flex-col items-start gap-1">
      <ol className="flex w-full flex-col">
        {shown.map((role, index) => {
          const last = index === shown.length - 1

          return (
            <li
              key={`${role.company}-${role.from}`}
              className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-3"
            >
              <div className="flex flex-col items-center pt-1.5" aria-hidden>
                <span className="size-2.5 shrink-0 rounded-full border-2 border-muted-foreground/50 bg-card" />
                {!last && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className={last ? "min-w-0" : "min-w-0 pb-3"}>
                <div className="text-sm leading-5 font-medium">
                  {role.title}
                </div>
                <div className="text-sm leading-5 text-muted-foreground">
                  {role.company} · {role.from}–{role.to ?? "Present"}
                  {durations && (
                    <> · {yearsSaid((role.to ?? CURRENT_YEAR) - role.from)}</>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {roles.length > EARLIER_SHOWN && (
        <Button
          variant="link"
          size="sm"
          className="h-auto w-fit pl-6 text-sm font-normal text-muted-foreground"
          onClick={onToggle}
        >
          {showAll ? "Show fewer" : `Show ${roles.length - EARLIER_SHOWN} more`}
          <ChevronDownIcon
            data-icon="inline-end"
            className={showAll ? "rotate-180" : undefined}
          />
        </Button>
      )}
    </div>
  )
}

type BucketProps = {
  applicant: Applicant
  roles: Position[]
  /** Derived, not dealt — see `tagsFor`. Empty means the row does not draw. */
  tags: string[]
  matched: string[]
  /** Whether anything was asked for — a search that named no skills was not. */
  asked: boolean
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
  tags,
  matched,
  asked,
  showAllRoles,
  onToggleRoles,
}: BucketProps) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-border pt-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
      {tags.length > 0 && (
        <>
          <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
            Tags
          </dt>
          <dd className="min-w-0 leading-6">
            <TagsBucket tags={tags} />
          </dd>
        </>
      )}

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
        {asked ? "Skills match" : "Skills"}
      </dt>
      <dd className="min-w-0 leading-6">
        <SkillsBucket applicant={applicant} matched={matched} asked={asked} />
      </dd>

      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        Location
      </dt>
      <dd className="min-w-0 leading-6">
        <LocationBucket applicant={applicant} />
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
function BucketColumns({
  applicant,
  roles,
  tags,
  matched,
  asked,
}: BucketProps) {
  return (
    <dl className="grid gap-x-8 gap-y-3 border-t border-border pt-3 text-sm @2xl/card:grid-cols-2 @5xl/card:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
      {/* A band across the top rather than a sixth column: tags are a row of
          chips of no fixed length, and a column that narrow would wrap every
          one of them onto its own line. */}
      {tags.length > 0 && (
        <div className="col-span-full flex min-w-0 flex-col gap-1">
          <dt className="text-xs font-medium text-muted-foreground">Tags</dt>
          <dd className="min-w-0">
            <TagsBucket tags={tags} />
          </dd>
        </div>
      )}

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
          {asked ? "Skills match" : "Skills"}
        </dt>
        <dd className="min-w-0">
          <SkillsBucket applicant={applicant} matched={matched} asked={asked} />
        </dd>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <dt className="text-xs font-medium text-muted-foreground">Location</dt>
        <dd className="min-w-0">
          <LocationBucket applicant={applicant} />
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
 * The same facts as full-width bands, each under its own heading, with a rule
 * between.
 *
 * NO LABEL COLUMN, WHICH IS THE WHOLE DIFFERENCE. Stacked spends a fixed 7rem
 * on labels so the eye has a left edge to run down; that edge costs the width
 * of the longest label on every row, and on a card beside the filter rail it is
 * close to a third of it. Here the heading sits above its own band and the
 * value gets the full width — which is what stops a six-role history and a line
 * of skill chips wrapping.
 *
 * THE RULES DO THE WORK THE LABEL COLUMN DID. Without them this is six
 * paragraphs at one size and the eye has nothing to catch on; with them each
 * fact is a block to land on or skip. It is the same argument as the labels
 * themselves, paid for in horizontal lines rather than horizontal space.
 *
 * A BAND MAY HOLD MORE THAN ONE BUCKET, and two of them do. A band is a
 * question, not a field: experience and education are both "where have they
 * been", location and availability are both "where and when could they start".
 * Giving each bucket its own band cost 69px and read as six things to check
 * rather than four things to know.
 *
 * IT IS STILL THE TALLEST OF THE THREE, which is the trade. Measured on a 916px
 * card — the width beside the filter rail at 1500px — Columns is 420px, Stacked
 * 440px and this 479px, because each band buys its rule at 24px of `py-3` where
 * Stacked's rows cost 8px of `gap-y`. So it is the variant to reach for when
 * the complaint about the others is wrapping, and the wrong one when the
 * complaint is scrolling.
 *
 * TAGS ARE THE FIRST BAND AND CARRY NO HEADING. They are the summary of
 * everything below them (see `tagsFor`), and a chip reading "Fintech" does not
 * need a word above it announcing that the chips are tags. The heading is still
 * there for a screen reader, which cannot see that they are chips.
 *
 * LOCATION AND AVAILABILITY SHARE THE LAST BAND. Apart, each is a band holding
 * one short line under a heading longer than its value — two rules bought for
 * no reading. Together they are also one question rather than two: where they
 * would go, and when they could go there. They are divided by a rule rather
 * than another `·`, because both values already spend `·` inside themselves and
 * a third at the same weight turns the line into one run.
 *
 * THE ROLES KEEP THEIR EXPANDER, unlike `BucketColumns`. That variant drops it
 * because a fixed card height is the point of it; this one is not promising a
 * height, so a card growing four lines costs nothing it had claimed.
 */
function BucketSections({
  applicant,
  roles,
  tags,
  matched,
  asked,
  showAllRoles,
  onToggleRoles,
}: BucketProps) {
  return (
    <dl className="flex flex-col divide-y divide-border border-t border-border text-sm [&>div]:py-3 [&>div:last-child]:pb-0">
      {tags.length > 0 && (
        <div>
          <dt className="sr-only">Tags</dt>
          <dd className="min-w-0">
            <TagsBucket tags={tags} />
          </dd>
        </div>
      )}

      {/* EXPERIENCE AND EDUCATION SHARE A BAND. Education is one short line, and
          a band of its own gave it a heading, a rule and the card's whole width
          to say "IIM Ahmedabad, CA · 2004–2008" — the emptiest band on the card
          next to the fullest. Side by side they also read as the one question
          they answer together: where this person has been.

          `grid-flow-col` OVER TWO EXPLICIT ROWS, rather than a div per column.
          A `dl` may hold `div`s that hold `dt`/`dd`, but not `div`s of `div`s,
          so the column is made by the flow — heading and value fill column one,
          then column two — and the pairs stay direct children. `auto_1fr`, not
          `grid-rows-2`, or the two rows would split the height evenly and the
          heading would take half the band.

          Experience gets the wider track for the reason it does in
          `BucketColumns`: it is the only one of the two with a list in it. */}
      <div className="grid gap-x-8 gap-y-1 @2xl/card:grid-flow-col @2xl/card:grid-cols-[1.6fr_1fr] @2xl/card:grid-rows-[auto_1fr]">
        <dt className="text-xs font-medium text-muted-foreground">
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

        {/* Stacked, this heading would sit 4px under the value above it and the
            two groups would blur into one; beside it, the margin would push it
            off the top edge the other heading sits on. */}
        <dt className="mt-2 text-xs font-medium text-muted-foreground @2xl/card:mt-0">
          Education
        </dt>
        <dd className="min-w-0 leading-6">
          <EducationBucket applicant={applicant} />
        </dd>
      </div>

      <div className="flex flex-col gap-1">
        <dt className="text-xs font-medium text-muted-foreground">
          {asked ? "Skills match" : "Skills"}
        </dt>
        <dd className="min-w-0 leading-6">
          <SkillsBucket applicant={applicant} matched={matched} asked={asked} />
        </dd>
      </div>

      <div className="flex flex-col gap-1">
        <dt className="text-xs font-medium text-muted-foreground">
          Location &amp; availability
        </dt>
        <dd className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 leading-6">
          <LocationBucket applicant={applicant} />
          <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
          <AvailabilityBucket applicant={applicant} />
        </dd>
      </div>
    </dl>
  )
}

/**
 * The buckets' contents, shared by every layout — which is the point of
 * splitting them out. A variant should change where a fact sits, never what it
 * says, and three copies of "16 yrs across 6 roles" would drift the first time
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
  asked,
}: {
  applicant: Applicant
  matched: string[]
  asked: boolean
}) {
  const copy = useListCopy()

  // Nothing asked for is not nothing matched: a search that named no skills
  // lists everybody's as they are rather than calling each of them a miss.
  if (asked && matched.length === 0) {
    return <span className="text-muted-foreground">{copy.noSkillsMatched}</span>
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

/** A table row's matched skills — the accent badges, or a dash for none. */
export function MatchedSkills({ skills }: { skills: string[] }) {
  if (skills.length === 0) {
    return (
      <span className="text-muted-foreground">
        <span aria-hidden>—</span>
        <span className="sr-only">None</span>
      </span>
    )
  }

  return (
    <div className="flex max-w-64 flex-wrap gap-1">
      {skills.map((skill) => (
        <Badge key={skill} variant="success" className="font-normal">
          {skill}
        </Badge>
      ))}
    </div>
  )
}

/**
 * How many tags a card shows before it starts counting. Three is a row you
 * read without meaning to; the rest are behind `+N`, which is a number rather
 * than a sentence and costs the eye nothing.
 */
const TAGS_SHOWN = 3

/**
 * The short facts about the shape of a career, above everything else on the
 * card — see `tagsFor`.
 *
 * ABOVE EXPERIENCE BECAUSE IT IS THE SUMMARY OF IT. "Leads a team", "Moves
 * often" and "Top institute" are what a recruiter would come away with after
 * reading the roles and the school; put under them it would be a conclusion
 * after its own evidence.
 *
 * `secondary`, NOT the skills' `success`. Green is spent on "this is one of
 * the skills the posting asked for", which is a match against a requirement;
 * a tag is a fact about the person and nobody asked for it, so it stays
 * neutral and lets the green keep meaning one thing on the card.
 */
function TagsBucket({ tags }: { tags: string[] }) {
  const shown = tags.slice(0, TAGS_SHOWN)
  const rest = tags.slice(TAGS_SHOWN)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((tag) => (
        <Badge key={tag} variant="secondary" className="font-normal">
          {tag}
        </Badge>
      ))}

      {/* `+2` IS A HANDLE, NOT A FULL STOP. Truncating silently would leave a
          card that has more to say looking like one that does not, and a
          count you cannot open is the same thing with a number on it — so the
          rest are on hover, in the order they would have been drawn. */}
      {rest.length > 0 && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge
                variant="outline"
                className="font-normal text-muted-foreground"
              />
            }
          >
            +{rest.length}
            <span className="sr-only"> more: {rest.join(", ")}</span>
          </TooltipTrigger>
          <TooltipContent>{rest.join(" · ")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

/**
 * Where they are, and where else they would go.
 *
 * THE CURRENT CITY IS ALREADY ON THE CARD, in the meta line under the name, so
 * this row exists for the second half: a posting is in one place, and "would
 * they come here" is not answered by where they are now. The current city is
 * repeated as the emphasis anyway, because the two only mean anything read
 * together — "Pune, open to Bengaluru" is a different candidate from "Pune".
 *
 * `preferredLocations` leads with their own city (see `applicants.ts`), so it
 * is dropped here rather than said twice. Somebody who named nowhere else gets
 * the city alone; "Anywhere" is said as it is, because it is what they said.
 */
function LocationBucket({ applicant }: { applicant: Applicant }) {
  const elsewhere = applicant.preferredLocations.filter(
    (place) => place !== applicant.location
  )

  return (
    <span className="text-muted-foreground">
      <span className="font-medium text-foreground">{applicant.location}</span>
      {elsewhere.length > 0 && <> · open to {elsewhere.join(", ")}</>}
    </span>
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
