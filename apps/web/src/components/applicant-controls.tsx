/**
 * The controls that take and show a decision about a candidate.
 *
 * They live here rather than in the response manager because the profile page
 * uses them too, and two implementations of "what a decision is" would drift
 * the first time one of them gained a state. `DECISIONS` is the shared table:
 * the group renders it and the badge reflects it.
 */
import type { LucideIcon } from "lucide-react"
import { CheckIcon, XIcon } from "lucide-react"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { cn } from "@workspace/ui/lib/utils"
import type { Applicant, ApplicantStatus } from "@/lib/applicants"

/**
 * The two decisions, as two labelled buttons: Reject, then Shortlist — the yes
 * last, at the right-hand end of the card's foot.
 *
 * WORDS, NOT ICONS (6 Oct 2026). They were a segmented control of bare icons
 * — a tick, a question mark and a cross, joined — with the names in tooltips.
 * Once Maybe went there were two, and two decisions read faster as two named
 * buttons than as glyphs to hover; the icon stays beside each word as the
 * colour cue. They sit apart (`spacing`) rather than joined, because "yes" and
 * "no" are not segments of one value.
 *
 * YES OR NO, NOTHING BETWEEN. There was a Maybe in the middle, for the pile a
 * recruiter cannot decide about; it was removed on 6 Oct 2026, so somebody not
 * yet a yes or a no simply stays in To review. "Reject" is the action; where
 * the person lands is still called Not a fit.
 *
 * DESELECTING IS UNDOING. Base UI lets you click the active item to clear the
 * group, which lands the candidate back on `undecided` — back in To review.
 * That is the right escape from a misclick on a screen built for fast
 * decisions, and it is why this is still a toggle group rather than two plain
 * buttons: the one in force shows pressed, and pressing it again takes it back.
 *
 * ONLY THE ICON IS TINTED AT REST, the word stays in the foreground, and the
 * button fills only when that decision is in force — so a page of cards does
 * not turn into a page of traffic lights.
 *
 * THEY ARE THE SEMANTIC TOKENS, NOT THE BRAND'S. `--success` is the green the
 * matched-skill chips already use; tying the tick to `--primary` instead would
 * make it emerald on iimjobs and ORANGE on hirist, where it would read as a
 * warning. A decision is not a place the two products differ, so it does not
 * read from the brand layer.
 */
const DECISIONS: {
  value: Extract<ApplicantStatus, "shortlisted" | "rejected">
  label: string
  icon: LucideIcon
  /** Tint when this one is the active decision. */
  active: string
  /** Tint when it is not — the icon only, until hover. */
  resting: string
}[] = [
  {
    value: "rejected",
    label: "Reject",
    icon: XIcon,
    active:
      "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive data-[pressed]:bg-destructive/10 data-[pressed]:text-destructive",
    resting:
      "[&_svg]:text-destructive hover:bg-destructive/10 hover:text-destructive",
  },
  {
    value: "shortlisted",
    label: "Shortlist",
    icon: CheckIcon,
    active:
      "bg-success/10 text-success hover:bg-success/20 hover:text-success data-[pressed]:bg-success/10 data-[pressed]:text-success",
    resting: "[&_svg]:text-success hover:bg-success/10 hover:text-success",
  },
]

/**
 * The decisions on their own, so the response manager's cards and the profile
 * page cannot end up with two ideas of what a decision is.
 */
export function DecisionGroup({
  applicant,
  onDecide,
  className,
}: {
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
  className?: string
}) {
  const decided = DECISIONS.some(
    (decision) => decision.value === applicant.status
  )

  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={2}
      aria-label={`Decision for ${applicant.name}`}
      className={className}
      value={decided ? [applicant.status] : []}
      onValueChange={(value) => {
        const next = value[0] as ApplicantStatus | undefined
        onDecide(applicant.id, next ?? "undecided")
      }}
    >
      {DECISIONS.map((decision) => (
        <ToggleGroupItem
          key={decision.value}
          value={decision.value}
          className={
            applicant.status === decision.value
              ? decision.active
              : decision.resting
          }
        >
          <decision.icon data-icon="inline-start" />
          {decision.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function ApplicantStatusBadge({ status }: { status: ApplicantStatus }) {
  switch (status) {
    case "shortlisted":
      return <Badge variant="success">Shortlisted</Badge>
    case "rejected":
      return <Badge variant="outline">Not a fit</Badge>
    // No badge for the absence of a decision. Whether they are NEW is the
    // avatar's dot — see `ApplicantAvatar`.
    case "undecided":
      return null
  }
}

/**
 * A candidate's photo, or their initials when they have none (about one in
 * five — see `Applicant.photo`), with the "new" dot on the top-right corner.
 *
 * This used to be initials only, on the argument that a face invites screening
 * on looks. The design team chose photos, to match what a real pool looks like
 * — so the mix of people with and without one is deliberate, and the card must
 * read just as well either way.
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
  photo,
  fresh,
  className,
  badgeClassName,
}: {
  name: string
  photo?: string
  /** Applied since the last visit and still undecided. */
  fresh: boolean
  className?: string
  badgeClassName?: string
}) {
  return (
    <Avatar className={cn("shrink-0", className)}>
      {photo && <AvatarImage src={photo} alt="" />}
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
