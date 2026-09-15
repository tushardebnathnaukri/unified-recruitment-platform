import * as React from "react"
import { Link, useSearchParams } from "react-router"
import {
  BriefcaseIcon,
  CalendarIcon,
  DatabaseIcon,
  EllipsisIcon,
  PencilIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { SectionHeader } from "@workspace/ui/components/section-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { useInterviews } from "@/components/interviews-provider"
import { RescheduleDialog } from "@/components/schedule-interview"
import {
  CALENDAR_NAMES,
  INTERVIEW_STATUSES,
  RECOMMENDATIONS,
  toInterviewStatus,
  whenOf,
  type Interview,
  type InterviewFeedback,
  type Recommendation,
} from "@/lib/interviews"

const CALENDAR_OPTIONS = [
  { value: "all", label: "All calendars" },
  ...CALENDAR_NAMES.map((name) => ({ value: name, label: name })),
]

/**
 * Booked interview slots, modelled on hirist's own "My Interviews".
 *
 * ONE TABLE, ONE STATUS AT A TIME — a dropdown above it rather than tabs,
 * because that is the live page's own control and there is no count to put
 * on a tab that would be worth the extra chrome: three states, not four, and
 * none of them is a queue a recruiter clears the way To review is.
 *
 * "Select Calendar" and "Manage Calendar" sit exactly where the live page
 * has them but go nowhere, the same as Settings' Get Help button — which
 * calendar integrations this connects to is a decision for whoever designs
 * that flow, not this file.
 */
export function InterviewsPage() {
  const [params, setParams] = useSearchParams()
  const status = toInterviewStatus(params.get("status"))

  // The seeded diary plus whatever was booked from a posting or a search.
  const { interviews } = useInterviews()
  // Held here, not in the row: either action can take the row out of the
  // table it is in while its dialog is still open — see `RescheduleDialog`.
  const [rescheduling, setRescheduling] = React.useState<Interview | null>(null)
  const [cancelling, setCancelling] = React.useState<Interview | null>(null)
  const [reviewing, setReviewing] = React.useState<Interview | null>(null)
  const filtered = interviews.filter((interview) => interview.status === status)
  const statusLabel =
    INTERVIEW_STATUSES.find((option) => option.value === status)?.label ?? ""

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <SectionHeader title="Booked slots" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          items={INTERVIEW_STATUSES}
          value={status}
          onValueChange={(next) => {
            const params2 = new URLSearchParams(params)
            if (String(next) === "confirmed") params2.delete("status")
            else params2.set("status", String(next))
            setParams(params2, { replace: true })
          }}
        >
          <SelectTrigger
            className="w-full sm:w-72"
            aria-label="Interview status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERVIEW_STATUSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap items-center gap-2">
          <Select items={CALENDAR_OPTIONS} defaultValue="all">
            <SelectTrigger className="w-44" aria-label="Select calendar">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALENDAR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline">Manage Calendar</Button>

          <Button variant="outline" size="icon" aria-label="Calendar view">
            <CalendarIcon />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarIcon />
            </EmptyMedia>
            <EmptyTitle>No slots here</EmptyTitle>
            <EmptyDescription>
              Nothing matches "{statusLabel}" right now.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Date &amp; Time</TableHead>
                <TableHead>Candidate Details</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((interview) => (
                <InterviewRow
                  key={interview.id}
                  interview={interview}
                  onReschedule={() => setRescheduling(interview)}
                  onCancel={() => setCancelling(interview)}
                  onFeedback={() => setReviewing(interview)}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <RescheduleDialog
        interview={rescheduling}
        onOpenChange={(open) => !open && setRescheduling(null)}
      />
      <CancelDialog
        interview={cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
      />
      <FeedbackDialog
        interview={reviewing}
        onOpenChange={(open) => !open && setReviewing(null)}
      />
    </div>
  )
}

/**
 * Cancelling tells the candidate, so it asks first — the one action on this
 * page that reaches somebody outside it and cannot be quietly put back.
 */
function CancelDialog({
  interview,
  onOpenChange,
}: {
  interview: Interview | null
  onOpenChange: (open: boolean) => void
}) {
  const { cancel } = useInterviews()
  // Kept while the dialog animates shut, after `interview` has gone to null.
  const [shown, setShown] = React.useState(interview)
  if (interview && interview !== shown) setShown(interview)

  return (
    <Dialog open={Boolean(interview)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {shown && (
          <>
            <DialogHeader>
              <DialogTitle>Cancel this interview?</DialogTitle>
              <DialogDescription>
                {shown.candidateName}, {whenOf(shown)} with {shown.calendarName}
                , for {shown.jobTitle}. They are told the slot is off, and it
                comes off your calendar.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Keep interview
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => {
                  cancel(shown.id)
                  onOpenChange(false)
                }}
              >
                Cancel interview
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Feedback on an interview: write it, or read what was written.
 *
 * WRITING IT COMPLETES THE INTERVIEW. Feedback is only ever about one that
 * happened, so submitting moves the slot to Completed — there is no separate
 * "mark as done" to forget. Held by the page, like the other two dialogs,
 * because that move filters the row out from under it.
 *
 * It does not decide anything about the candidate. "Strong hire" is the
 * panel's view, and turning it into a shortlist or a rejection is still the
 * recruiter's call on the posting.
 */
function FeedbackDialog({
  interview,
  onOpenChange,
}: {
  interview: Interview | null
  onOpenChange: (open: boolean) => void
}) {
  const [shown, setShown] = React.useState(interview)
  const [session, setSession] = React.useState(0)
  if (interview && interview !== shown) {
    setShown(interview)
    setSession(session + 1)
  }

  return (
    <Dialog open={Boolean(interview)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {shown &&
          (shown.feedback ? (
            <ReadFeedback
              interview={shown}
              feedback={shown.feedback}
              onDone={() => onOpenChange(false)}
            />
          ) : (
            <WriteFeedback
              key={session}
              interview={shown}
              onDone={() => onOpenChange(false)}
            />
          ))}
      </DialogContent>
    </Dialog>
  )
}

function FeedbackHeading({ interview }: { interview: Interview }) {
  return (
    <DialogDescription>
      {interview.candidateName} · {interview.jobTitle} · {whenOf(interview)}
    </DialogDescription>
  )
}

function WriteFeedback({
  interview,
  onDone,
}: {
  interview: Interview
  onDone: () => void
}) {
  const { book } = useInterviews()
  const [recommendation, setRecommendation] = React.useState<
    Recommendation | undefined
  >()
  const [notes, setNotes] = React.useState("")
  const [sent, setSent] = React.useState(false)

  const ready = Boolean(recommendation) && notes.trim().length > 0

  if (sent) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Feedback saved</DialogTitle>
          <DialogDescription>
            {interview.candidateName}'s interview is marked Completed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to={interview.candidateHref} />}
          >
            Open candidate
          </Button>
          <Button onClick={onDone}>Done</Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!recommendation || !ready) return
        book({
          ...interview,
          status: "completed",
          feedback: {
            recommendation,
            notes: notes.trim(),
            by: "Anurag Yadav",
            at: "just now",
          },
        })
        setSent(true)
      }}
    >
      <DialogHeader>
        <DialogTitle>Interview feedback</DialogTitle>
        <FeedbackHeading interview={interview} />
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label id="recommendation-label">Recommendation</Label>
        <ToggleGroup
          variant="outline"
          aria-labelledby="recommendation-label"
          value={recommendation ? [recommendation] : []}
          onValueChange={(value) => {
            const next = value[0] as Recommendation | undefined
            if (next) setRecommendation(next)
          }}
          className="flex-wrap"
        >
          {RECOMMENDATIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="feedback-notes">Notes</Label>
        <Textarea
          id="feedback-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="What stood out, what worried you, and what a next round should probe."
          className="min-h-28"
        />
      </div>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={!ready}>
          Submit feedback
        </Button>
      </DialogFooter>
    </form>
  )
}

function ReadFeedback({
  interview,
  feedback,
  onDone,
}: {
  interview: Interview
  feedback: InterviewFeedback
  onDone: () => void
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Interview feedback</DialogTitle>
        <FeedbackHeading interview={interview} />
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <RecommendationBadge value={feedback.recommendation} />
        <p className="text-sm leading-relaxed">{feedback.notes}</p>
        <p className="text-xs text-muted-foreground">
          {feedback.by} · {feedback.at}
        </p>
      </div>

      <DialogFooter>
        <Button onClick={onDone}>Close</Button>
      </DialogFooter>
    </>
  )
}

/** Hires read green, no-hires read red; the strong ends are filled. */
function RecommendationBadge({ value }: { value: Recommendation }) {
  const label = RECOMMENDATIONS.find((option) => option.value === value)?.label
  const variant =
    value === "strong-yes"
      ? "success"
      : value === "yes"
        ? "outline"
        : value === "no"
          ? "outline"
          : "destructive"

  return (
    <Badge
      variant={variant}
      className={cn(
        "w-fit font-normal",
        value === "yes" && "text-success",
        value === "no" && "text-destructive"
      )}
    >
      {label}
    </Badge>
  )
}

function InterviewRow({
  interview,
  onReschedule,
  onCancel,
  onFeedback,
}: {
  interview: Interview
  onReschedule: () => void
  onCancel: () => void
  onFeedback: () => void
}) {
  return (
    <TableRow className="last:border-b-0">
      {/* When and where in one column — the day is what you scan down; the
          slot and whose calendar are read once you have found it. Three
          columns of this cost the table its feedback and actions at laptop
          width. */}
      <TableCell className="pl-5 whitespace-nowrap">
        <p className="font-medium">{interview.date}</p>
        <p className="text-xs text-muted-foreground">{interview.timeSlot}</p>
        <p className="text-xs text-muted-foreground">
          {interview.calendarName}
        </p>
      </TableCell>

      <TableCell className="min-w-48">
        <Link
          to={interview.candidateHref}
          className="font-medium hover:underline"
        >
          {interview.candidateName}
        </Link>
        <p className="text-xs text-muted-foreground">
          {interview.candidateTitle}
        </p>
      </TableCell>

      {/* Capped, so a long search name ends in an ellipsis instead of pushing
          Feedback and the actions off the edge. The full text is one hover
          away in the link's title. */}
      <TableCell className="max-w-60 min-w-48">
        <Link to={`/jobs/${interview.jobId}`} className="hover:underline">
          {interview.jobTitle}
        </Link>
        {/* Which door they came in by. Applied needs no link — it is the job
            above; sourced links back to the search that found them. */}
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {interview.source.kind === "job" ? (
            <>
              <BriefcaseIcon className="size-3 shrink-0" aria-hidden />
              Applied
            </>
          ) : (
            <>
              <DatabaseIcon className="size-3 shrink-0" aria-hidden />
              <span className="shrink-0">Sourced from</span>
              <Link
                to={interview.source.href}
                title={interview.source.label}
                className="truncate hover:text-foreground hover:underline"
              >
                {interview.source.label}
              </Link>
            </>
          )}
        </p>
      </TableCell>

      <TableCell>
        {/* Written: the verdict, which opens the notes. Not yet: only once
            the candidate has accepted — nobody interviews an open invite. */}
        {interview.feedback ? (
          <button
            type="button"
            onClick={onFeedback}
            className="rounded-4xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label={`Read feedback on ${interview.candidateName}`}
          >
            <RecommendationBadge value={interview.feedback.recommendation} />
          </button>
        ) : interview.status === "pending" ? (
          <span className="text-xs text-muted-foreground">
            After they accept
          </span>
        ) : (
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0 text-xs"
            onClick={onFeedback}
          >
            Add feedback
          </Button>
        )}
      </TableCell>

      <TableCell className="pr-5 text-right">
        {/* A completed interview has nothing left to move or call off. */}
        {interview.status !== "completed" && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full text-muted-foreground"
                  aria-label={`Actions for ${interview.candidateName}'s interview`}
                />
              }
            >
              <EllipsisIcon />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem onClick={onReschedule}>
                <PencilIcon />
                Reschedule
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onCancel}>
                <XIcon />
                Cancel interview
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  )
}
