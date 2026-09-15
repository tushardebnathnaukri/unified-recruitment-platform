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

/**
 * "Set up interviews" for everybody ticked on a list.
 *
 * ONE CALENDAR, THE NEXT FREE SLOTS. Booking twelve people one dialog at a
 * time is the chore a selection exists to remove, so this asks only what they
 * have in common — which calendar, from which day, and for a sourced person
 * which posting — and lays them into that calendar's free slots in the order
 * they were ticked. The plan is shown before anything is sent, with each
 * person's slot, and it skips rather than moves anybody who already has one:
 * rescheduling somebody is a decision about them, not about the batch.
 *
 * Invites go out as Awaiting Candidate Response, like the single dialog, and
 * the people booked move to Contacted when the dialog goes away — not before,
 * for the same reason: on a queue the decision takes them off the list the
 * selection bar is holding.
 */
export function BulkScheduleDialog({
  people,
  open,
  onClose,
}: {
  people: Applicant[]
  open: boolean
  /** `booked` says whether invites went out, so the caller can clear the selection. */
  onClose: (booked: boolean) => void
}) {
  const { decide } = useDecisions()
  const [session, setSession] = React.useState(0)
  const [wasOpen, setWasOpen] = React.useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setSession(session + 1)
  }

  /** Who was booked and still owes the Contacted decision. */
  const owed = React.useRef<Applicant[]>([])
  const settle = React.useCallback(() => {
    for (const person of owed.current)
      if (person.status !== "contacted") decide(person.id, "contacted")
    const booked = owed.current.length > 0
    owed.current = []
    return booked
  }, [decide])
  const settleRef = React.useRef(settle)
  React.useEffect(() => {
    settleRef.current = settle
  }, [settle])
  React.useEffect(() => () => void settleRef.current(), [])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose(settle())
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <BulkBookingForm
          key={session}
          people={people}
          onBooked={(booked) => {
            owed.current = booked
          }}
          onDone={() => onClose(settle())}
        />
      </DialogContent>
    </Dialog>
  )
}

type Planned =
  | { person: Applicant; kind: "new"; date: string; timeSlot: string }
  | { person: Applicant; kind: "booked"; existing: Interview }
  | { person: Applicant; kind: "full" }

function BulkBookingForm({
  people,
  onBooked,
  onDone,
}: {
  people: Applicant[]
  onBooked: (booked: Applicant[]) => void
  onDone: () => void
}) {
  const { brand } = useBrand()
  const { interviews, bookingFor, book } = useInterviews()
  const sourceOf = React.useContext(CandidateSourceContext)
  const jobs = liveJobsFor(brand)

  const sourceFor = (person: Applicant): CandidateSource =>
    sourceOf?.(person) ?? {
      kind: "search",
      label: "Search Resume",
      href: "/database",
    }
  // Only a sourced person needs a posting picked; an applicant has theirs.
  const needsJob = people.some((person) => sourceFor(person).kind !== "job")

  const [calendar, setCalendar] = React.useState(CALENDAR_NAMES[0])
  const [from, setFrom] = React.useState(DATES[0])
  const [jobId, setJobId] = React.useState(jobs[0]?.id ?? "")
  const [sent, setSent] = React.useState<Interview[] | null>(null)

  const taken = new Set(
    interviews
      .filter(
        (row) => row.status !== "completed" && row.calendarName === calendar
      )
      .map((row) => `${row.date}|${row.timeSlot}`)
  )
  const free = DATES.slice(DATES.indexOf(from))
    .flatMap((date) => SLOTS.map((timeSlot) => ({ date, timeSlot })))
    .filter((slot) => !taken.has(`${slot.date}|${slot.timeSlot}`))

  const plan: Planned[] = people.map((person) => {
    const existing = bookingFor(person.id)
    if (existing) return { person, kind: "booked", existing }
    const slot = free.shift()
    return slot ? { person, kind: "new", ...slot } : { person, kind: "full" }
  })
  const booking = plan.filter(
    (entry): entry is Extract<Planned, { kind: "new" }> => entry.kind === "new"
  )
  const full = plan.filter((entry) => entry.kind === "full").length
  const already = plan.filter((entry) => entry.kind === "booked").length

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (booking.length === 0) return

    const made = booking.flatMap(({ person, date, timeSlot }) => {
      const source = sourceFor(person)
      const job = jobs.find(
        (option) => option.id === (source.kind === "job" ? source.jobId : jobId)
      )
      if (!job) return []
      const interview: Interview = {
        id: interviewId(job.id, person.id),
        date,
        timeSlot,
        calendarName: calendar,
        candidateId: person.id,
        candidateName: person.name,
        candidateTitle: `${person.title}, ${person.company}`,
        candidateHref: candidateHref(source, person.id),
        jobId: job.id,
        jobTitle: job.title,
        source,
        status: "pending",
        feedback: null,
      }
      book(interview)
      return [interview]
    })
    setSent(made)
    onBooked(
      booking
        .map((entry) => entry.person)
        .filter((person) => made.some((row) => row.candidateId === person.id))
    )
  }

  if (sent) {
    return (
      <>
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted">
            <CalendarCheckIcon className="size-5" />
          </div>
          <DialogTitle>
            {sent.length === 1 ? "Invite sent" : `${sent.length} invites sent`}
          </DialogTitle>
          <DialogDescription>
            They show as Awaiting Candidate Response until each candidate
            accepts.
          </DialogDescription>
        </DialogHeader>

        <PlanList
          rows={sent.map((row) => ({
            key: row.id,
            name: row.candidateName,
            detail: `${whenOf(row)} · ${row.calendarName}`,
          }))}
        />

        <DialogFooter>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/interviews?status=pending" />}
          >
            View in Interviews
          </Button>
          <Button onClick={onDone}>Done</Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>
          Set up{" "}
          {people.length === 1 ? "an interview" : `${people.length} interviews`}
        </DialogTitle>
        <DialogDescription>
          Each person gets the next free slot in one calendar, in the order you
          ticked them. Nothing is sent until you press Send.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        {needsJob && (
          <Field label="Job for people from a search" className="col-span-2">
            <Choice
              label="Job"
              value={jobId}
              onChange={setJobId}
              options={jobs.map((option) => ({
                value: option.id,
                label: option.title,
              }))}
            />
          </Field>
        )}
        <Field label="Calendar">
          <Choice
            label="Calendar"
            value={calendar}
            onChange={setCalendar}
            options={CALENDAR_NAMES}
          />
        </Field>
        <Field label="From">
          <Choice
            label="From"
            value={from}
            onChange={setFrom}
            options={DATES}
          />
        </Field>
      </div>

      <PlanList
        rows={plan.map((entry) => ({
          key: entry.person.id,
          name: entry.person.name,
          detail:
            entry.kind === "new"
              ? `${entry.date.replace(/ \d{4}$/, "")}, ${entry.timeSlot}`
              : entry.kind === "booked"
                ? `Skipped — already booked ${whenOf(entry.existing)}`
                : `Skipped — no free slot left in ${calendar}`,
          muted: entry.kind !== "new",
        }))}
      />

      {full > 0 && (
        <p
          role="alert"
          className="flex items-start gap-2 text-sm text-destructive"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          {calendar} runs out of slots for{" "}
          {full === 1 ? "one person" : `${full} people`}. Book them from another
          calendar afterwards.
        </p>
      )}

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={booking.length === 0}>
          {booking.length === 0
            ? "Nobody to invite"
            : `Send ${booking.length === 1 ? "invite" : `${booking.length} invites`}`}
        </Button>
      </DialogFooter>
      {already > 0 && booking.length === 0 && (
        <p className="text-right text-xs text-muted-foreground">
          Everybody ticked already has a slot.
        </p>
      )}
    </form>
  )
}

/** Who gets which slot — the plan before sending, and what was sent after. */
function PlanList({
  rows,
}: {
  rows: { key: string; name: string; detail: string; muted?: boolean }[]
}) {
  return (
    <ul className="flex max-h-64 flex-col divide-y overflow-y-auto rounded-xl bg-muted/50 text-sm">
      {rows.map((row) => (
        <li
          key={row.key}
          className="flex items-baseline justify-between gap-3 px-3 py-2"
        >
          <span className={row.muted ? "text-muted-foreground" : undefined}>
            {row.name}
          </span>
          <span
            className={
              row.muted
                ? "text-right text-xs text-muted-foreground"
                : "text-right text-xs tabular-nums"
            }
          >
            {row.detail}
          </span>
        </li>
      ))}
    </ul>
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
