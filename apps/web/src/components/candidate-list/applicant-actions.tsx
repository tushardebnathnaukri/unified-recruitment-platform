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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
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
import { useMessageTo } from "@/components/messages-provider"
import { cn } from "@workspace/ui/lib/utils"
import type { Applicant, ApplicantStatus } from "@/lib/applicants"
import { useListCopy } from "@/lib/list-source"
import { PickingContext } from "@/components/candidate-list/shared"

/**
 * What a recruiter can do to one person: the decisions, the actions, and the ⋯
 * menu behind them.
 *
 * Its own file because the card and the table row both draw them. The same menu
 * in two shapes is one implementation, and putting it in either would make the
 * other import a neighbour for one component. The table row draws `RowActions`
 * (the decisions and the menu side by side); a card draws `CardTools` at its
 * top and `CardDecisions` at its foot.
 */

export function RowActions({
  applicant,
  onDecide,
  className,
  decisionClassName,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
  className?: string
  /** Passed to `DecisionGroup` — the Snapshot card stretches it on a phone. */
  decisionClassName?: string
}) {
  return (
    <div className={cn("relative flex shrink-0 items-center gap-2", className)}>
      <DecisionGroup
        applicant={applicant}
        onDecide={onDecide}
        className={decisionClassName}
      />

      <ApplicantActions applicant={applicant} />
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
function ApplicantActions({ applicant }: { applicant: Applicant }) {
  const copy = useListCopy()
  const picking = React.useContext(PickingContext)
  const messageTo = useMessageTo()

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
            {/* Message and the interview, at every width. They were icon
            buttons on the card (folding in here below 768px) until 6 Oct 2026;
            now the card's top row is Save, View contact and this menu. */}
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => messageTo(applicant)}>
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

            <DropdownMenuSeparator />

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
              {/* In here rather than on the card because it is rarer than
              Message. It does nothing in the prototype yet; it used to move
              the row to Contacted, which was removed on 6 Oct 2026. */}
              <DropdownMenuItem>
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
 * What you do to a candidate, at the TOP of a card: Save, View contact, and the
 * ⋯ menu — Message, the interview, and the rarer ones.
 *
 * THE ACTIONS AND THE DECISIONS SWAPPED ENDS on 6 Oct 2026: these were the
 * card's footer and Shortlist / Reject sat beside the name. Now the card reads
 * who, then the facts, then the decision — the order a decision is made in,
 * and the tab order too. View profile went down with the decisions
 * (`CardDecisions`), and View contact came up here as a modal. Message and the
 * interview were icon buttons here too, and moved into the ⋯ menu the same
 * day.
 *
 * THEY ARE NOT THE DECISION BUTTONS. Those answer "is this person worth my
 * time"; these answer "then what". Keeping them at opposite ends of the card is
 * what stops a recruiter reading a row of controls and having to work out
 * which two are one question.
 *
 * `quiet` is Snapshot's and Screening's weights: Save and View contact as
 * ghosts. Without it both are outlined, as Stacked, Columns and Sections always
 * drew them.
 */
export function CardTools({
  applicant,
  quiet = false,
  className,
}: {
  applicant: Applicant
  quiet?: boolean
  className?: string
}) {
  const appearance = quiet ? "ghost" : "outline"

  return (
    <div
      className={cn(
        "flex shrink-0 items-center",
        quiet ? "gap-1" : "gap-2",
        className
      )}
    >
      {/* Labelled at every width: it is a menu, so it cannot fold into the ⋯
          menu, and its label is its state — "Saved" is the only place a card
          says so. */}
      <SaveToList applicant={applicant} appearance={appearance} />

      <ContactDetails applicant={applicant} appearance={appearance} />

      <ApplicantActions applicant={applicant} />
    </div>
  )
}

/**
 * View contact, and the modal it opens: the email and the phone, each a link
 * (`mailto:` / `tel:`). The modal's title still says "Contact details".
 *
 * A MODAL, NOT A REVEAL IN PLACE (6 Oct 2026). It used to swap the button for
 * the details inline at the foot of the card; up in the tools row beside the
 * name there is no room for an email address to appear, so it opens over the
 * card instead.
 *
 * SAVE'S TREATMENT EXACTLY — a ghost where `quiet` makes Save one, outlined
 * where Save is — in the foreground, never muted: drawn as a muted ghost it
 * read as disabled beside a Save that was not.
 *
 * STILL GATED. Contact details are what a posting is actually being paid for,
 * so a prototype that prints an email beside every name has quietly designed
 * the business model away. Asking for them is one click — the honest shape for
 * whatever this costs in the real product, whether that is a credit, a plan,
 * or nothing.
 */
function ContactDetails({
  applicant,
  appearance,
}: {
  applicant: Applicant
  /** Save's, so the two read as a pair. */
  appearance: "ghost" | "outline"
}) {
  const rows = [
    {
      icon: MailIcon,
      label: "Email",
      value: applicant.email,
      href: `mailto:${applicant.email}`,
    },
    {
      icon: PhoneIcon,
      label: "Phone",
      value: applicant.phone,
      href: `tel:${applicant.phone.replace(/\s/g, "")}`,
    },
  ]

  return (
    <Dialog>
      <DialogTrigger render={<Button variant={appearance} size="sm" />}>
        <EyeIcon data-icon="inline-start" />
        View contact
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Contact details</DialogTitle>
          <DialogDescription>
            {applicant.name} · {applicant.title} at {applicant.company}
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.label}>
              <a
                href={row.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-foreground/10 transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <row.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-xs text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {row.value}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The decision, at the FOOT of a card: Shortlist and Reject on the right, View
 * profile on the left.
 *
 * VIEW PROFILE IS DOWN HERE BECAUSE IT IS THE OTHER WAY TO FINISH READING A
 * CARD: decide on what the card says, or open the profile for more before
 * deciding. It stays although the name opens the same panel — a name that is a
 * link is not a discoverable way to learn there is a profile. Outlined on every
 * layout, the one non-decision here.
 *
 * `decisionClassName` lets Snapshot and Screening stretch the two decisions
 * across a phone-width card.
 */
export function CardDecisions({
  applicant,
  onDecide,
  onOpenProfile,
  decisionClassName,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
  /** Opens the panel. */
  onOpenProfile: (id: string) => void
  decisionClassName?: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
      <Button
        variant="outline"
        size="sm"
        className="mr-auto"
        onClick={() => onOpenProfile(applicant.id)}
      >
        <UserRoundIcon data-icon="inline-start" />
        View profile
      </Button>

      <DecisionGroup
        applicant={applicant}
        onDecide={onDecide}
        className={decisionClassName}
      />
    </div>
  )
}
