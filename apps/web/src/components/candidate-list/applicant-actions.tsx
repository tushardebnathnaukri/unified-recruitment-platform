import * as React from "react"
import {
  CalendarCheckIcon,
  CalendarPlusIcon,
  DownloadIcon,
  EllipsisIcon,
  EyeIcon,
  MailIcon,
  PhoneIcon,
  SparklesIcon,
  Trash2Icon,
  TrophyIcon,
  UserRoundIcon,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { DecisionGroup } from "@/components/applicant-controls"
import { SaveToList } from "@/components/save-to-list"
import { ScheduleInterview } from "@/components/schedule-interview"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import type { Applicant, ApplicantStatus } from "@/lib/applicants"
import { useListCopy } from "@/lib/list-source"
import { PickingContext } from "@/components/candidate-list/shared"

/**
 * What a recruiter can do to one person: the three decisions, and the ⋯ menu
 * behind them.
 *
 * Its own file because the card and the table row both draw it. The same menu
 * in two shapes is one implementation, and putting it in either would make the
 * other import a neighbour for one component.
 */

export function RowActions({
  applicant,
  onDecide,
  className,
  decisionClassName,
  labelClassName,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
  className?: string
  /** Passed to `DecisionGroup` — the Snapshot card stretches it on a phone. */
  decisionClassName?: string
  labelClassName?: string
}) {
  return (
    <div className={cn("relative flex shrink-0 items-center gap-2", className)}>
      <DecisionGroup
        applicant={applicant}
        onDecide={onDecide}
        className={decisionClassName}
        labelClassName={labelClassName}
      />

      <ApplicantActions applicant={applicant} onDecide={onDecide} />
    </div>
  )
}

/**
 * Everything that is not a triage decision.
 *
 * It stays a menu rather than joining the group beside it: these are things you
 * do to a candidate, one at a time and rarely, while the group is a single
 * choice you make on every card. Putting "Call" next to "Shortlist" would make
 * the row of buttons look like five equal options when three of them are one
 * question.
 *
 * NOTE(design): the items are a first guess. What a recruiter can do to a
 * response — and which of these deserve to be on the card instead — is the
 * design team's call, not this file's.
 */
function ApplicantActions({
  applicant,
  onDecide,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  const copy = useListCopy()
  const picking = React.useContext(PickingContext)

  return (
    // Around the whole menu, not inside it: a menu's items unmount when it
    // closes, and the dialog one of them opens has to outlive that.
    <ScheduleInterview applicant={applicant}>
      {(interview) => (
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

          <DropdownMenuContent align="end" className="min-w-52">
            {/* The card's two icon buttons, spelled out, for the widths where the
            footer has no room for them. `md:hidden` is the exact inverse of
            what hides them there, so they are in one place or the other and
            never both. */}
            <DropdownMenuGroup className="md:hidden">
              <DropdownMenuItem
                onClick={() => onDecide(applicant.id, "contacted")}
              >
                <MailIcon />
                Message
              </DropdownMenuItem>
              <DropdownMenuItem onClick={interview.open}>
                {interview.booking ? (
                  <CalendarCheckIcon />
                ) : (
                  <CalendarPlusIcon />
                )}
                {interview.booking
                  ? "Reschedule interview"
                  : "Set up interview"}
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="md:hidden" />

            <DropdownMenuGroup>
              {picking && (
                <DropdownMenuItem onClick={() => picking.askAbout([applicant])}>
                  <SparklesIcon />
                  Ask Athena
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <DownloadIcon />
                Download CV
              </DropdownMenuItem>
              {/* Calling is reaching out, so it moves the row the way Message
              does — it is in here rather than on the card only because it is
              the rarer of the two. */}
              <DropdownMenuItem
                onClick={() => onDecide(applicant.id, "contacted")}
              >
                <PhoneIcon />
                Call
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              {/* The end of the funnel, and the only thing in here worth an accent
              — everything above it is a step, this one is the outcome. */}
              <DropdownMenuItem className="text-primary focus:text-primary">
                <TrophyIcon />
                Mark as hired
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive">
                <Trash2Icon />
                {copy.remove}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </ScheduleInterview>
  )
}

/**
 * The three things you do to a candidate once you have decided they are worth
 * doing something about.
 *
 * THEY ARE NOT THE DECISION BUTTONS. The group at the top of the card answers
 * "is this person worth my time"; these answer "then what". Keeping them at
 * opposite ends of the card is what stops a recruiter reading five controls in
 * a row and having to work out which three are one question.
 *
 * THEY CAME OUT OF THE OVERFLOW MENU, and are gone from it — an action in two
 * places is one the design has not decided about. What is left in the menu is
 * the occasional half: downloading a CV, a phone call, the end of the funnel,
 * and removing somebody. These three are the ones you reach for on most cards,
 * and a menu is two clicks.
 *
 * VIEW CONTACT DETAILS IS THE ODD ONE OUT and stays last: the other three open
 * something, it discloses something, and once it has there is nothing left to
 * press. That is why it swaps itself for the details rather than sitting there
 * looking pressable next to the answer it already gave.
 *
 * All outline, none primary. A filled accent button is the right weight for one
 * action on a page; a hundred and forty-eight of them down a list is a wall,
 * and the accent on this screen is already spent on the counts and the skills
 * that matched.
 */
export function CardActions({
  applicant,
  onDecide,
  onOpenProfile,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
  /** Opens the panel. The card used to link to the profile page instead. */
  onOpenProfile: (id: string) => void
}) {
  const [revealed, setRevealed] = React.useState(false)

  return (
    /**
     * RIGHT-ALIGNED, under the decision group it shares an edge with. The card
     * now has one column of controls down its right side — decide at the top,
     * act at the bottom — instead of controls in one corner and a row starting
     * from the opposite one. On a list this long the right edge is the only
     * part of a card whose position is predictable, which is what makes a
     * column of buttons scannable at all.
     *
     * Contact details are the exception, pinned left by `mr-auto`. It is not a
     * peer of the other three: they act on a candidate, it discloses a fact
     * about them, and once pressed it is replaced by that fact. Keeping the
     * button on the left means the reveal happens exactly where the button was
     * rather than jumping across the card — and the details, being content,
     * read from the left like every other line on it.
     */
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
      {/* GATED, AND IT REVEALS RATHER THAN NAVIGATES. Contact details are what
          a posting is actually being paid for, so a prototype that prints an
          email beside every name has quietly designed the business model away.
          Asking for them is one click and they appear in place — which is also
          the honest shape for whatever this costs in the real product, whether
          that is a credit, a plan, or nothing. */}
      {revealed ? (
        <div className="mr-auto flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <MailIcon className="size-3.5 text-muted-foreground" />
            {applicant.email}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <PhoneIcon className="size-3.5 text-muted-foreground" />
            {applicant.phone}
          </span>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mr-auto"
          onClick={() => setRevealed(true)}
        >
          <EyeIcon data-icon="inline-start" />
          View contact details
        </Button>
      )}

      {/* ICONS, NOT LABELS, for these two. They are the two actions on the card
          with a conventional icon each — an envelope and a calendar — and
          spelling them out gave four labelled buttons of near-equal weight,
          which is a row you read rather than scan. The two that keep their
          words are the two whose icons would be guesses — an eye does not say
          "contact details" and a person does not say "profile".
          Reaching out is what Contacted means, so Message moves the row. */}
      {/* ONE UNIT, `shrink-0`, SO IT CANNOT COME APART. Revealed contact
          details are wide enough to squeeze this row, and with three loose
          children the wrap put the two icons on one line and View profile
          alone on the next — a button group that has lost its own shape reads
          as a layout fault, which it was. Grouped, either everything fits on
          the details' line or the whole group drops to the next one, still
          right-aligned and still intact. `min-w-0` on the details is the other
          half: without it they refuse to wrap and force the break every
          time. */}
      <div className="flex shrink-0 items-center gap-2">
        {/* LABELLED, AND KEPT AT EVERY WIDTH. It is a menu, so it cannot fold
            into the overflow menu the way the two icons below do, and its
            label is its state — "Saved" is the only place a card says so. */}
        <SaveToList applicant={applicant} />

        {/* GONE UNDER 768px, WHERE THEY REAPPEAR IN THE OVERFLOW MENU. On a
            phone the footer is the width of the card, and four controls plus a
            revealed email on that width is a row that wraps into a shape
            nobody designed. These two are the ones to move because they are
            already icons — a menu item spells them out, which is what they
            lost to fit here in the first place.

            The breakpoint is the VIEWPORT, not the card. The menu renders in a
            portal, outside the card's container, so `@…/card` cannot reach it
            and the two halves of one decision would answer to different
            widths. 768px is the width the sidebar already becomes a Sheet at,
            so the card agrees with the shell about what a phone is. */}
        <div className="hidden items-center gap-2 md:flex">
          <IconAction
            label="Message"
            onClick={() => onDecide(applicant.id, "contacted")}
          >
            <MailIcon />
          </IconAction>

          <ScheduleInterview applicant={applicant}>
            {(interview) => (
              <IconAction label={interview.label} onClick={interview.open}>
                {interview.booking ? (
                  <CalendarCheckIcon />
                ) : (
                  <CalendarPlusIcon />
                )}
              </IconAction>
            )}
          </ScheduleInterview>
        </div>

        {/* LAST, WHICH IS THE PROMINENT END OF A RIGHT-ALIGNED ROW. Opening
            the profile is what a recruiter does after reading the card and
            deciding they want more than it holds — the one action here that
            continues the task rather than finishing it. */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenProfile(applicant.id)}
        >
          <UserRoundIcon data-icon="inline-start" />
          View profile
        </Button>
      </div>
    </div>
  )
}

/**
 * The Snapshot card's footer: the same actions as `CardActions`, in three
 * weights instead of one.
 *
 * CardActions draws five outline buttons of equal weight, which beside the
 * decision group made nine controls on the card that all looked as pressable
 * as each other. Here only View profile keeps its outline — it is the one that
 * continues the task, so it is the one the eye should find — and Save, Message
 * and the interview are ghost buttons: there when wanted, quiet otherwise.
 * Contact details is a ghost too, at the left where it reveals in place.
 *
 * View profile stays although the name opens the same panel: a name that is a
 * link is not a discoverable way to learn there is a profile (see
 * `ApplicantCard`). Message and the interview fold into the ⋯ menu below
 * 768px exactly as in `CardActions`, for the reasons given there.
 */
export function QuietCardActions({
  applicant,
  onDecide,
  onOpenProfile,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
  onOpenProfile: (id: string) => void
}) {
  const [revealed, setRevealed] = React.useState(false)

  return (
    <div className="flex flex-wrap items-center justify-end gap-1 border-t border-border pt-3">
      {revealed ? (
        <div className="mr-auto flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <MailIcon className="size-3.5 text-muted-foreground" />
            {applicant.email}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <PhoneIcon className="size-3.5 text-muted-foreground" />
            {applicant.phone}
          </span>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="mr-auto -ml-2 text-muted-foreground"
          onClick={() => setRevealed(true)}
        >
          <EyeIcon data-icon="inline-start" />
          View contact details
        </Button>
      )}

      <div className="flex shrink-0 items-center gap-1">
        <SaveToList applicant={applicant} appearance="ghost" />

        <div className="hidden items-center gap-1 md:flex">
          <IconAction
            label="Message"
            appearance="ghost"
            onClick={() => onDecide(applicant.id, "contacted")}
          >
            <MailIcon />
          </IconAction>

          <ScheduleInterview applicant={applicant}>
            {(interview) => (
              <IconAction
                label={interview.label}
                appearance="ghost"
                onClick={interview.open}
              >
                {interview.booking ? (
                  <CalendarCheckIcon />
                ) : (
                  <CalendarPlusIcon />
                )}
              </IconAction>
            )}
          </ScheduleInterview>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="ml-1"
          onClick={() => onOpenProfile(applicant.id)}
        >
          <UserRoundIcon data-icon="inline-start" />
          View profile
        </Button>
      </div>
    </div>
  )
}

/** An icon button that says what it is on hover and to a screen reader. */
function IconAction({
  label,
  onClick,
  appearance = "outline",
  children,
}: {
  label: string
  onClick?: () => void
  appearance?: "outline" | "ghost"
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={appearance}
            size="icon-sm"
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
