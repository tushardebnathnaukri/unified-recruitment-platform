import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Item } from "@workspace/ui/components/item"
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
  isNew,
  tagsFor,
  type Position,
  type Applicant,
  type ApplicantStatus,
} from "@/lib/applicants"
import { useListCopy } from "@/lib/list-source"
import type { Verdict } from "@/lib/criteria"
import { CriteriaEvidence } from "@/components/criteria-evidence"
import { PickBox } from "@/components/candidate-list/selection"
import {
  CardActions,
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
  CardVariant,
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
  const Buckets = BUCKETS_FOR[variant]
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
