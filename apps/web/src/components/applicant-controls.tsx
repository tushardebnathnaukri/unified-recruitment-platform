/**
 * The controls that take and show a decision about a candidate.
 *
 * They live here rather than in the response manager because the profile page
 * uses them too, and two implementations of "what a decision is" would drift
 * the first time one of them gained a state. `DECISIONS` is the shared table:
 * the group renders it and the badge reflects it.
 */
import type { LucideIcon } from "lucide-react"
import { CheckIcon, CircleHelpIcon, XIcon } from "lucide-react"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import type { Applicant, ApplicantStatus } from "@/lib/applicants"

/**
 * The three decisions, as one segmented control, and the overflow menu beside
 * it.
 *
 * THEY ARE A GROUP BECAUSE THEY ARE ONE QUESTION. Three floating ghost circles
 * said "here are three unrelated buttons"; joined into a segmented control they
 * say "pick one of these", which is what a triage decision is. It is the same
 * `ToggleGroup` the cards/table switcher uses — `variant="outline"` with
 * `spacing={0}` — so the two controls on this screen that mean "choose one"
 * look the same.
 *
 * THE MAYBE IN THE MIDDLE IS THE POINT. Yes and no are the easy half; the
 * reason a recruiter stalls on a list of 148 is the pile they cannot decide
 * about, and with only two buttons that pile has nowhere to go but back on the
 * list to be read again. The order is deliberate too: yes, maybe, no reads as a
 * scale rather than three options in an arbitrary row.
 *
 * DESELECTING IS UNDOING. Base UI lets you click the active item to clear the
 * group, which lands the candidate back on `undecided` — back in To review.
 * That is the right escape from a misclick on a screen built for fast
 * decisions, and it is why this is a toggle group rather than a radio group.
 */
const DECISIONS: {
  value: Extract<ApplicantStatus, "shortlisted" | "maybe" | "rejected">
  label: string
  icon: LucideIcon
  /** Tint when this one is the active decision. */
  active: string
}[] = [
  {
    value: "shortlisted",
    label: "Shortlist",
    icon: CheckIcon,
    active:
      "bg-success/10 text-success hover:bg-success/20 hover:text-success data-[pressed]:bg-success/10 data-[pressed]:text-success",
  },
  {
    value: "maybe",
    label: "Maybe",
    icon: CircleHelpIcon,
    active:
      "bg-warning/10 text-warning hover:bg-warning/20 hover:text-warning data-[pressed]:bg-warning/10 data-[pressed]:text-warning",
  },
  {
    value: "rejected",
    label: "Not a fit",
    icon: XIcon,
    active:
      "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive data-[pressed]:bg-destructive/10 data-[pressed]:text-destructive",
  },
]

/**
 * The segmented control on its own, so the response manager's cards and the
 * profile page cannot end up with two ideas of what a decision is.
 */
export function DecisionGroup({
  applicant,
  onDecide,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  const decided = DECISIONS.some(
    (decision) => decision.value === applicant.status
  )

  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      aria-label={`Decision for ${applicant.name}`}
      value={decided ? [applicant.status] : []}
      onValueChange={(value) => {
        const next = value[0] as ApplicantStatus | undefined
        onDecide(applicant.id, next ?? "undecided")
      }}
    >
      {DECISIONS.map((decision) => (
        <Tooltip key={decision.value}>
          <TooltipTrigger
            render={
              <ToggleGroupItem
                value={decision.value}
                aria-label={decision.label}
                className={
                  applicant.status === decision.value
                    ? decision.active
                    : "text-muted-foreground"
                }
              />
            }
          >
            <decision.icon />
          </TooltipTrigger>
          <TooltipContent>{decision.label}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  )
}

export function ApplicantStatusBadge({ status }: { status: ApplicantStatus }) {
  switch (status) {
    case "maybe":
      return <Badge variant="warning">Maybe</Badge>
    case "shortlisted":
      return <Badge variant="success">Shortlisted</Badge>
    case "contacted":
      return <Badge variant="secondary">Contacted</Badge>
    case "rejected":
      return <Badge variant="outline">Not a fit</Badge>
    // No badge for the absence of a decision. Whether they are NEW is the
    // avatar's dot — see `ApplicantAvatar`.
    case "undecided":
      return null
  }
}

/**
 * A candidate's initials, with the "new" dot on the top-right corner.
 *
 * Initials, not a photograph. A recruiter screening on a face is the failure
 * mode this product should not encourage; the avatar is here to anchor a row,
 * not to show anybody.
 *
 * THE DOT MEANS NEW — applied since the last visit and still undecided (see
 * `isNew`) — wherever an avatar is shown: the card, the split view's list and
 * pane, the side panel. The table has no avatar and draws its own. Callers keep
 * a screen-reader "New" beside the name, because the dot itself is decoration.
 *
 * The dot's ring is a cut-out, so it has to be the colour of whatever the
 * avatar sits on: the card's by default, `badgeClassName` for anywhere else
 * (the sheet is `popover`, a selected list row is `muted`).
 */
export function ApplicantAvatar({
  name,
  fresh,
  className,
  badgeClassName,
}: {
  name: string
  /** Applied since the last visit and still undecided. */
  fresh: boolean
  className?: string
  badgeClassName?: string
}) {
  return (
    <Avatar className={cn("shrink-0", className)}>
      <AvatarFallback>{initials(name)}</AvatarFallback>
      {fresh && (
        <AvatarBadge
          aria-hidden
          className={cn("top-0 bottom-auto ring-card", badgeClassName)}
        />
      )}
    </Avatar>
  )
}

/** Two letters, so a name that is one word or four still yields two. */
function initials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase()
}
