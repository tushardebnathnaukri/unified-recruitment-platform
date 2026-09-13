import * as React from "react"
import { Link, useSearchParams } from "react-router"
import { CalendarIcon, EllipsisIcon, PencilIcon, XIcon } from "lucide-react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
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
import {
  CALENDAR_NAMES,
  INTERVIEW_STATUSES,
  interviewsFor,
  toInterviewStatus,
  type Interview,
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
  const { brand } = useBrand()
  const [params, setParams] = useSearchParams()
  const status = toInterviewStatus(params.get("status"))

  const interviews = React.useMemo(() => interviewsFor(brand), [brand])
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
                <TableHead className="pl-5">Interview Date</TableHead>
                <TableHead>Time Slot</TableHead>
                <TableHead>Calendar Name</TableHead>
                <TableHead>Candidate Details</TableHead>
                <TableHead>Applied To Job</TableHead>
                <TableHead>Interview Feedback</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((interview) => (
                <InterviewRow key={interview.id} interview={interview} />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function InterviewRow({ interview }: { interview: Interview }) {
  return (
    <TableRow className="last:border-b-0">
      <TableCell className="pl-5 font-medium whitespace-nowrap">
        {interview.date}
      </TableCell>

      <TableCell className="whitespace-nowrap text-muted-foreground">
        {interview.timeSlot}
      </TableCell>

      <TableCell className="text-muted-foreground">
        {interview.calendarName}
      </TableCell>

      <TableCell className="min-w-48">
        <Link
          to={`/jobs/${interview.jobId}/applicants/${interview.candidateId}`}
          className="font-medium hover:underline"
        >
          {interview.candidateName}
        </Link>
        <p className="text-xs text-muted-foreground">
          {interview.candidateTitle}
        </p>
      </TableCell>

      <TableCell className="min-w-40">
        <Link to={`/jobs/${interview.jobId}`} className="hover:underline">
          {interview.jobTitle}
        </Link>
      </TableCell>

      <TableCell>
        {interview.feedback === "submitted" ? (
          <Badge variant="secondary" className="font-normal">
            Submitted
          </Badge>
        ) : (
          <Button variant="link" size="sm" className="h-auto px-0 text-xs">
            Add feedback
          </Button>
        )}
      </TableCell>

      <TableCell className="pr-5 text-right">
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
            <DropdownMenuItem>
              <PencilIcon />
              Reschedule
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <XIcon />
              Cancel interview
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
