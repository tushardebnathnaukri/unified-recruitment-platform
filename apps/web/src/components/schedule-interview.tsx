import * as React from "react"
import { Link } from "react-router"
import { CalendarCheckIcon, TriangleAlertIcon } from "lucide-react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { useDecisions } from "@/components/decisions-provider"
import { useInterviews } from "@/components/interviews-provider"
import type { Applicant } from "@/lib/applicants"
import {
  CandidateSourceContext,
  candidateHref,
  type CandidateSource,
} from "@/lib/candidate-source"
import {
  CALENDAR_NAMES,
  DATES,
  SLOTS,
  interviewId,
  whenOf,
  type Interview,
} from "@/lib/interviews"
import { liveJobsFor } from "@/lib/jobs"

/**
 * "Set up interview", wherever it is drawn — a card's icon, the overflow menu,
 * the profile panel, the candidate page. The caller draws the trigger; this
 * owns the dialog and says whether the person already has a slot, so every
 * trigger can show it.
 *
 * BOOKED AGAINST A POSTING, WHICHEVER DOOR THEY CAME IN BY. Somebody who applied
 * is interviewed for that posting, so the job is fixed. Somebody a search found
 * has no posting yet, so the dialog asks which of the live ones. The source
 * comes from `CandidateSourceContext`, the same one the save menu reads.
 *
 * BOOKING IS REACHING OUT, so it moves the person to Contacted — but only when
 * the dialog closes. On a queue that decision takes the card away, and the
 * dialog lives in the card; deciding on submit would unmount the confirmation
 * before anybody read it.
 *
 * A new booking is Awaiting Candidate Response, the state an invite is in until
 * it is accepted. Booking somebody who already has a slot reschedules it.
 */
export function ScheduleInterview({
  applicant,
  children,
}: {
  applicant: Applicant
  children: (trigger: {
    open: () => void
    booking: Interview | undefined
    label: string
  }) => React.ReactNode
}) {
  const { bookingFor } = useInterviews()
  const { decide } = useDecisions()
  const sourceOf = React.useContext(CandidateSourceContext)
  const [open, setOpen] = React.useState(false)
  // Remounts the form on every open, so it starts from the current booking
  // rather than whatever was picked last time and cancelled.
  const [session, setSession] = React.useState(0)

  /**
   * The Contacted decision a booking owes, held until the dialog goes away —
   * closed, Done, or "View in Interviews" navigating off the page (hence the
   * unmount effect as well as the close handler).
   */
  const owed = React.useRef(false)
  const settle = React.useCallback(() => {
    if (owed.current && applicant.status !== "contacted")
      decide(applicant.id, "contacted")
    owed.current = false
  }, [applicant.id, applicant.status, decide])
  const settleRef = React.useRef(settle)
  React.useEffect(() => {
    settleRef.current = settle
  }, [settle])
  React.useEffect(() => () => settleRef.current(), [])

  const close = (next: boolean) => {
    setOpen(next)
    if (!next) settle()
  }

  const booking = bookingFor(applicant.id)
  const label = booking
    ? `Interview booked — ${whenOf(booking)}`
    : "Set up interview"

  return (
    <>
      {children({
        open: () => {
          setSession((current) => current + 1)
          setOpen(true)
        },
        booking,
        label,
      })}

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-md">
          <BookingForm
            key={session}
            candidate={candidateOf(applicant)}
            source={sourceOf?.(applicant)}
            existing={booking}
            onBooked={() => {
              owed.current = true
            }}
            onDone={() => close(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Reschedule a booked interview from /interviews, where there is a row but no
 * `Applicant`. Controlled by the page rather than owned by the row: moving a
 * confirmed slot makes it Awaiting Candidate Response, which filters the row
 * out of the table while the dialog is still open, and a dialog inside the row
 * would go with it.
 */
export function RescheduleDialog({
  interview,
  onOpenChange,
}: {
  /** The slot being moved; `null` is closed. */
  interview: Interview | null
  onOpenChange: (open: boolean) => void
}) {
  // The last one opened, so the dialog keeps its content while it animates shut.
  const [shown, setShown] = React.useState(interview)
  // Bumped per opening, so reopening the same row starts a fresh form.
  const [session, setSession] = React.useState(0)
  if (interview && interview !== shown) {
    setShown(interview)
    setSession(session + 1)
  }

  return (
    <Dialog open={Boolean(interview)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {shown && (
          <BookingForm
            key={session}
            candidate={{
              id: shown.candidateId,
              name: shown.candidateName,
              headline: shown.candidateTitle,
              title: shown.candidateTitle,
            }}
            existing={shown}
            onBooked={() => {}}
            onDone={() => onOpenChange(false)}
            linkToInterviews={false}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Who is being booked — an `Applicant`, or a row on /interviews. */
type BookingCandidate = {
  id: string
  name: string
  /** Under the dialog's title: "General Manager at ICICI Bank". */
  headline: string
  /** What the Interviews table prints: "General Manager, ICICI Bank". */
  title: string
}

function candidateOf(applicant: Applicant): BookingCandidate {
  return {
    id: applicant.id,
    name: applicant.name,
    headline: `${applicant.title} at ${applicant.company}`,
    title: `${applicant.title}, ${applicant.company}`,
  }
}

function BookingForm({
  candidate: applicant,
  source: given,
  existing: current,
  onBooked,
  onDone,
  linkToInterviews = true,
}: {
  candidate: BookingCandidate
  /** How they came in, for a first booking. A reschedule keeps the booking's. */
  source?: CandidateSource
  existing: Interview | undefined
  onBooked: () => void
  onDone: () => void
  /** Off on /interviews itself, where the booking is already on screen. */
  linkToInterviews?: boolean
}) {
  // The booking as it was when the dialog opened. Read live, a fresh booking
  // turns into "the existing one" the moment it is made, and the confirmation
  // says "rescheduled" about an interview that never had a slot.
  const [existing] = React.useState(current)
  const { brand } = useBrand()
  const { interviews, book } = useInterviews()

  const jobs = liveJobsFor(brand)
  const source: CandidateSource = existing?.source ??
    given ?? {
      kind: "search",
      label: "Search Resume",
      href: "/database",
    }
  const fixedJob = source.kind === "job" ? source.jobId : undefined

  const [jobId, setJobId] = React.useState(
    existing?.jobId ?? fixedJob ?? jobs[0]?.id ?? ""
  )
  const [date, setDate] = React.useState(existing?.date ?? DATES[0])
  const [slot, setSlot] = React.useState(existing?.timeSlot ?? SLOTS[0])
  const [calendar, setCalendar] = React.useState(
    existing?.calendarName ?? CALENDAR_NAMES[0]
  )
  const [booked, setBooked] = React.useState<Interview | null>(null)

  const job = jobs.find((option) => option.id === jobId)
  const id = interviewId(jobId, applicant.id)

  /** Somebody else already in that calendar at that time. */
  const clash = interviews.find(
    (row) =>
      row.id !== id &&
      row.id !== existing?.id &&
      row.status !== "completed" &&
      row.calendarName === calendar &&
      row.date === date &&
      row.timeSlot === slot
  )

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!job || clash) return

    const interview: Interview = {
      id,
      date,
      timeSlot: slot,
      calendarName: calendar,
      candidateId: applicant.id,
      candidateName: applicant.name,
      candidateTitle: applicant.title,
      candidateHref: candidateHref(source, applicant.id),
      jobId: job.id,
      jobTitle: job.title,
      source,
      status: "pending",
      feedback: null,
    }
    book(interview, existing?.id)
    setBooked(interview)
    onBooked()
  }

  if (booked) {
    return (
      <>
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted">
            <CalendarCheckIcon className="size-5" />
          </div>
          <DialogTitle>
            {existing ? "Interview rescheduled" : "Invite sent"}
          </DialogTitle>
          <DialogDescription>
            {applicant.name} is invited to interview for {booked.jobTitle}. It
            shows as Awaiting Candidate Response until they accept.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl bg-muted/50 p-3 text-sm">
          <dt className="text-muted-foreground">When</dt>
          <dd>{whenOf(booked)}</dd>
          <dt className="text-muted-foreground">Calendar</dt>
          <dd>{booked.calendarName}</dd>
        </dl>

        <DialogFooter>
          {linkToInterviews && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/interviews?status=pending" />}
            >
              View in Interviews
            </Button>
          )}
          <Button onClick={onDone}>Done</Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>
          {existing ? "Reschedule interview" : "Set up interview"}
        </DialogTitle>
        <DialogDescription>
          {applicant.name} · {applicant.headline}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Job" className="col-span-2">
          {fixedJob ? (
            // Applied to it, so it is not a choice.
            <p className="flex h-9 items-center text-sm">
              {job?.title ?? source.label}
              <span className="ml-2 text-xs text-muted-foreground">
                Applied
              </span>
            </p>
          ) : (
            <Choice
              label="Job"
              value={jobId}
              onChange={setJobId}
              options={jobs.map((option) => ({
                value: option.id,
                label: option.title,
              }))}
            />
          )}
        </Field>

        <Field label="Date">
          <Choice
            label="Date"
            value={date}
            onChange={setDate}
            options={DATES}
          />
        </Field>
        <Field label="Time">
          <Choice
            label="Time"
            value={slot}
            onChange={setSlot}
            options={SLOTS}
          />
        </Field>
        <Field label="Calendar" className="col-span-2">
          <Choice
            label="Calendar"
            value={calendar}
            onChange={setCalendar}
            options={CALENDAR_NAMES}
          />
        </Field>
      </div>

      {clash && (
        <p
          role="alert"
          className="flex items-start gap-2 text-sm text-destructive"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          {calendar} already has {clash.candidateName} then. Pick another time
          or calendar.
        </p>
      )}

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={!job || Boolean(clash)}>
          {existing ? "Reschedule" : "Send invite"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 text-xs text-muted-foreground" aria-hidden>
        {label}
      </Label>
      {children}
    </div>
  )
}

function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: (string | { value: string; label: string })[]
}) {
  const items = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  )

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => onChange(String(next))}
    >
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
