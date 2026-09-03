import type { LucideIcon } from "lucide-react"
import {
  ArrowRightIcon,
  CalendarClockIcon,
  CheckIcon,
  CirclePlayIcon,
  ClipboardCheckIcon,
  ClockIcon,
  DownloadIcon,
  EllipsisIcon,
  EyeIcon,
  FileTextIcon,
  GraduationCapIcon,
  IndianRupeeIcon,
  MapPinIcon,
  MessageCircleIcon,
  PencilIcon,
  PhoneIcon,
  PlayIcon,
  SendIcon,
  SparklesIcon,
  StarIcon,
  TagIcon,
  Undo2Icon,
  UsersIcon,
  VideoIcon,
  XIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"
import {
  formatDuration,
  formatNotice,
  formatPay,
  formatTenure,
  nextStage,
  stageLabel,
  type Candidate,
  type InterviewMode,
  type Stage,
} from "@/lib/candidates"

const MODE_LABEL: Record<InterviewMode, string> = {
  video: "Video interview",
  "in-person": "Face to face",
  phone: "Telephonic",
}

const MODE_ICON: Record<InterviewMode, LucideIcon> = {
  video: VideoIcon,
  "in-person": UsersIcon,
  phone: PhoneIcon,
}

/**
 * One applicant, built to the CMP hand-off card.
 *
 * What came from that design, and why each part earns its place here:
 *
 * - A LABELLED ATTRIBUTE GRID instead of a run of chips. Every value sits
 *   against a term in a fixed left column, so the eye scans down one edge and
 *   reads "match, gap, resume" on every card in the same place. It is the one
 *   idea the legacy page most needs: its rows are a wall of undifferentiated
 *   fields with nothing saying which is which.
 * - THE AGE PILL UNDER THE AVATAR, which turns "how long has this person been
 *   waiting" from a date you have to subtract into a glance.
 * - THE ACTION ROW SPLIT ACROSS THE CARD, negative on the left and the filled
 *   primary hard right. At four hundred rows an hour that distance is the
 *   safeguard against a mis-click, and it is why Reject moved from beside
 *   Shortlist to the far end.
 *
 * What did NOT come from it: its tokens. The reference is 8px radii, a #2563eb
 * primary and its own chip fills; this renders in ours — `Card`, `Badge`,
 * `Button` — so the two brands keep working and nothing here has to be
 * revisited when hirist's palette lands.
 *
 * The shape still changes with the stage. The grid gains an Interview row while
 * someone is being interviewed and an Outcome row once there is one, and the
 * actions offer the move that stage allows.
 */
export function CandidateRow({
  candidate,
  selected,
  onSelectedChange,
  onMove,
  onUndo,
}: {
  candidate: Candidate
  selected: boolean
  onSelectedChange: (selected: boolean) => void
  onMove: (stage: Stage) => void
  onUndo: () => void
}) {
  if (candidate.stage === "rejected") {
    return (
      <RejectedRow
        candidate={candidate}
        selected={selected}
        onSelectedChange={onSelectedChange}
        onUndo={onUndo}
      />
    )
  }

  return (
    // Sections run the full width of the card rather than being inset under the
    // name, so the dividers and the attribute labels share the card's left
    // edge — the reference's own arrangement, and what gives the grid a column
    // to line up against.
    <Card className="gap-3 p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          className="mt-2.5"
          checked={selected}
          onCheckedChange={onSelectedChange}
          aria-label={`Select ${candidate.name}`}
        />

        <AvatarWithAge candidate={candidate} />

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-medium text-pretty">
                {candidate.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {candidate.role} · {candidate.company} ·{" "}
                {formatTenure(candidate.tenureMonths)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <StageBadge candidate={candidate} />
              <RowMenu candidate={candidate} />
            </div>
          </div>

          <BasicDetails candidate={candidate} />
        </div>
      </div>

      <Attributes candidate={candidate} />

      <RowActions candidate={candidate} onMove={onMove} />
    </Card>
  )
}

/**
 * Avatar with the waiting time tucked under it, overlapping, exactly as the
 * reference has it. It reads as one object rather than as a fact that had to
 * find room in the metadata row — and it frees "Applied 15 Oct" from that row,
 * where it was the least actionable thing on the line.
 */
function AvatarWithAge({ candidate }: { candidate: Candidate }) {
  return (
    <span className="flex shrink-0 flex-col items-center">
      <Avatar size="lg">
        <AvatarFallback>{initials(candidate.name)}</AvatarFallback>
        {candidate.media.video && (
          <AvatarBadge>
            <PlayIcon />
            <span className="sr-only">Has a video resume</span>
          </AvatarBadge>
        )}
      </Avatar>

      <span className="-mt-1.5 flex items-center gap-1 rounded-4xl bg-muted px-1.5 py-0.5 text-xs leading-4 font-medium text-muted-foreground ring-2 ring-card">
        <ClockIcon className="size-2.5" aria-hidden="true" />
        {candidate.appliedDaysAgo}d
        <span className="sr-only">{` since applying, on ${candidate.appliedOn}`}</span>
      </span>
    </span>
  )
}

/** Icon + label fact, the shape the jobs table uses for a job's metadata. */
function Fact({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
      {children}
    </span>
  )
}

/**
 * The line under the name: where they are, what they studied, what they cost,
 * when they can start. Four facts, all of them things a recruiter screens on
 * before opening anything — the reference carries three and this adds notice,
 * which is the one that decides whether a strong profile is any use this
 * quarter.
 */
function BasicDetails({ candidate }: { candidate: Candidate }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Fact icon={MapPinIcon}>{candidate.location}</Fact>
      <Fact icon={GraduationCapIcon}>
        {candidate.education.institute} · {candidate.education.qualification}
      </Fact>
      <Fact icon={IndianRupeeIcon}>{formatPay(candidate)}</Fact>
      <Fact
        icon={CalendarClockIcon}
        className={cn(candidate.noticeDays === 0 && "font-medium text-success")}
      >
        {formatNotice(candidate.noticeDays)}
      </Fact>
    </div>
  )
}

/**
 * One term and its values. A real `<dl>` rather than two divs: the label IS the
 * term for the row beside it, and saying so gives a screen reader the pairing
 * that the fixed column gives the eye.
 *
 * Returned as a fragment so `<dt>`/`<dd>` land as direct children of the grid —
 * wrapping each pair in a div would collapse the shared column that makes the
 * whole thing scan.
 */
function Attribute({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <>
      <dt className="pt-0.5 text-xs font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="flex flex-wrap items-center gap-2">{children}</dd>
    </>
  )
}

function Attributes({ candidate }: { candidate: Candidate }) {
  const shown = candidate.matchedOn.slice(0, 4)
  const rest = candidate.matchedOn.length - shown.length
  const ModeIcon = candidate.interview
    ? MODE_ICON[candidate.interview.mode]
    : null

  return (
    // `auto` on the term column sizes it to the longest label present, so the
    // stages that carry an Interview row indent a little further than the ones
    // that do not — the alternative is a hardcoded width that is either too
    // tight for one stage or padded on all the others.
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2.5 border-t border-border pt-3">
      {candidate.interview && ModeIcon && (
        <Attribute label="Interview">
          <Badge variant="outline">
            <ModeIcon />
            {MODE_LABEL[candidate.interview.mode]}
          </Badge>
          <Badge variant="outline">{candidate.interview.when}</Badge>
          <Badge variant="outline">
            with {candidate.interview.interviewer}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Round {candidate.interview.round} of {candidate.interview.ofRounds}
          </span>
        </Attribute>
      )}

      {candidate.outcome && (
        <Attribute label="Outcome">
          <Badge variant="success">{candidate.outcome.label}</Badge>
          <span className="text-sm text-muted-foreground">
            {candidate.outcome.detail}
          </span>
        </Attribute>
      )}

      <Attribute label="Match">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <SparklesIcon className="size-3.5 shrink-0" aria-hidden="true" />
          {candidate.match}%
        </span>
        {shown.map((skill) => (
          <Badge key={skill} variant="outline">
            {skill}
          </Badge>
        ))}
        {rest > 0 && (
          <Button variant="link" size="xs" className="px-0">
            +{rest} more
          </Button>
        )}
      </Attribute>

      {/* Its own row rather than a chip pushed to the end of the match line.
          The gap is the half that makes the score honest, and a score with
          nothing against it is the same black box as Magic Sort. */}
      {candidate.gap && (
        <Attribute label="Gap">
          <Badge variant="warning">{candidate.gap}</Badge>
        </Attribute>
      )}

      <Attribute label="Resume">
        {candidate.media.video && candidate.media.videoSeconds && (
          <Button variant="link" size="xs" className="px-0">
            <CirclePlayIcon data-icon="inline-start" />
            {formatDuration(candidate.media.videoSeconds)}
            <span className="sr-only">{` video resume from ${candidate.name}`}</span>
          </Button>
        )}
        <Button variant="link" size="xs" className="px-0">
          <FileTextIcon data-icon="inline-start" />
          Resume
          <span className="sr-only">{` for ${candidate.name}`}</span>
        </Button>
        {candidate.media.coverLetter && (
          <Button variant="link" size="xs" className="px-0">
            <FileTextIcon data-icon="inline-start" />
            Cover letter
            <span className="sr-only">{` from ${candidate.name}`}</span>
          </Button>
        )}
      </Attribute>
    </dl>
  )
}

function StageBadge({ candidate }: { candidate: Candidate }) {
  const { interview, outcome, stage, review } = candidate

  if (interview) {
    if (interview.feedback === "due")
      return <Badge variant="destructive">Feedback due</Badge>
    if (interview.status === "awaiting")
      return <Badge variant="warning">Awaiting response</Badge>
    if (interview.status === "confirmed")
      return <Badge variant="success">Confirmed</Badge>
    return <Badge variant="secondary">Feedback in</Badge>
  }

  if (outcome) return <Badge variant="success">{outcome.label}</Badge>
  if (stage === "saved") return <Badge variant="secondary">Saved</Badge>
  if (stage === "shortlisted")
    return <Badge variant="secondary">Shortlisted</Badge>
  if (review === "unread") return <Badge variant="success">Unread</Badge>
  if (review === "contacted") return <Badge variant="outline">Contacted</Badge>

  return null
}

/**
 * Reject at one end, the stage's move at the other, filled and last.
 *
 * The arrangement is the reference's — Remove on the left, Call hard right —
 * and it is a change from what this row did before, which sat Shortlist and
 * Reject side by side. Adjacency is right when the two are one decision; a
 * card's width apart is right when one of them is irreversible and the hand
 * is moving fast. Hired keeps no Reject at all: there is nothing left to undo
 * from here that belongs on a row.
 */
function RowActions({
  candidate,
  onMove,
}: {
  candidate: Candidate
  onMove: (stage: Stage) => void
}) {
  const advance = nextStage(candidate.stage)

  const primary =
    candidate.stage === "applied" ? (
      <Button size="sm" onClick={() => onMove("shortlisted")}>
        <CheckIcon data-icon="inline-start" />
        Shortlist
        <span className="sr-only">{` ${candidate.name}`}</span>
      </Button>
    ) : advance ? (
      <Button size="sm" onClick={() => onMove(advance)}>
        Move to {stageLabel(advance)}
        <ArrowRightIcon data-icon="inline-end" />
        <span className="sr-only">{` — ${candidate.name}`}</span>
      </Button>
    ) : null

  const secondary: React.ReactNode[] = []

  if (candidate.interview) {
    const { interview } = candidate

    if (interview.feedback === "due")
      secondary.push(
        <Button key="feedback" variant="outline" size="sm">
          <PencilIcon data-icon="inline-start" />
          Add feedback
        </Button>
      )
    else if (interview.status === "awaiting")
      secondary.push(
        <Button key="resend" variant="outline" size="sm">
          <SendIcon data-icon="inline-start" />
          Resend invite
        </Button>
      )
    else if (interview.mode === "video")
      secondary.push(
        <Button key="join" variant="outline" size="sm">
          <VideoIcon data-icon="inline-start" />
          Join call
        </Button>
      )

    secondary.push(
      <Button key="reschedule" variant="outline" size="sm">
        <CalendarClockIcon data-icon="inline-start" />
        Reschedule
      </Button>
    )
  } else {
    secondary.push(
      <Button key="contact" variant="outline" size="sm">
        <EyeIcon data-icon="inline-start" />
        Contact
        <span className="sr-only">{` details for ${candidate.name}`}</span>
      </Button>,
      <Button key="message" variant="outline" size="sm">
        <MessageCircleIcon data-icon="inline-start" />
        Message
        <span className="sr-only">{` ${candidate.name}`}</span>
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      {candidate.stage !== "hired" && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onMove("rejected")}
        >
          <XIcon data-icon="inline-start" />
          Reject
          <span className="sr-only">{` ${candidate.name}`}</span>
        </Button>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {secondary}
        {primary}
      </div>
    </div>
  )
}

/**
 * A rejected row collapses to one line and keeps three things: that it was
 * rejected, why, and a way back. The legacy page renders the full card in its
 * Rejected tab and records no reason at all, so a shared job gives no answer to
 * "why did we pass on this person" a week later.
 */
function RejectedRow({
  candidate,
  selected,
  onSelectedChange,
  onUndo,
}: {
  candidate: Candidate
  selected: boolean
  onSelectedChange: (selected: boolean) => void
  onUndo: () => void
}) {
  return (
    <Card className="gap-0 p-4 opacity-75 transition-opacity hover:opacity-100">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onSelectedChange}
          aria-label={`Select ${candidate.name}`}
        />

        <Avatar size="lg" className="opacity-60">
          <AvatarFallback>{initials(candidate.name)}</AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {candidate.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {candidate.role} · {candidate.company}
            </p>
          </div>

          <Badge variant="destructive">Rejected</Badge>

          {candidate.decision && (
            <span className="text-xs text-muted-foreground">
              {candidate.decision.reason} · by {candidate.decision.by},{" "}
              {candidate.decision.on}
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={onUndo}
          >
            <Undo2Icon data-icon="inline-start" />
            Undo
            <span className="sr-only">{` the rejection of ${candidate.name}`}</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}

/**
 * Everything that is real but rare. The legacy row spends five buttons and a
 * menu on the same set; here the menu holds what is not part of a decision, so
 * the row itself stays scannable.
 */
function RowMenu({ candidate }: { candidate: Candidate }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <EllipsisIcon />
            <span className="sr-only">More actions for {candidate.name}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <CalendarClockIcon />
          Send interview invite
        </DropdownMenuItem>
        <DropdownMenuItem>
          <ClipboardCheckIcon />
          Send assessment
        </DropdownMenuItem>
        <DropdownMenuItem>
          <SendIcon />
          Send message
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <StarIcon />
          Save for later
        </DropdownMenuItem>
        <DropdownMenuItem>
          <TagIcon />
          Add tag
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DownloadIcon />
          Download resume
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Two letters at most — three initials in a 40px circle is unreadable. */
function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}
