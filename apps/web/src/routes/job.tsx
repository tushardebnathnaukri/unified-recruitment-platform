import * as React from "react"
import { Link, useParams } from "react-router"
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  ClockIcon,
  MapPinIcon,
  UserRoundIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import { useBrand } from "@workspace/ui/components/brand-provider"
import { CandidateList } from "@/components/candidate-list"
import { applicantsFor, requiredSkillsFor } from "@/lib/applicants"
import { jobsFor, type Job } from "@/lib/jobs"

/**
 * The response manager: one job, and everybody who applied to it.
 *
 * IT IS A TRIAGE SCREEN, NOT A PROFILE READER. The question it answers is
 * "which of these 148 people are worth an hour", so a card carries only what
 * you judge on at a glance — the role they are in now, how long they have been
 * working, what they cost, and how soon they could start — and the decision is
 * two buttons on the card rather than a round trip through a profile. Reading a
 * CV is a screen we have not designed; it is the obvious next one.
 *
 * THE DECISIONS ACTUALLY STICK, in component state. Shortlisting somebody moves
 * them out of To review and into Shortlisted and the tab counts follow, because a
 * review of a triage screen where nothing can be triaged tells you nothing
 * about whether the triage works. It resets on reload — there is no backend and
 * this is not pretending otherwise.
 *
 * THE TABS ARE THE SAME SHAPE AS THE JOBS PAGE, down to the count on the
 * trigger and the state living in `?status=`. Two list screens one click apart
 * should not have two different ideas of what a tab is.
 */
export function JobDetailPage() {
  const { jobId } = useParams()
  const { brand } = useBrand()
  // Scoped to the active product: a job id from the other one is not found
  // here, which is right — it is a posting on a different product.
  const job = jobsFor(brand).find((candidate) => candidate.id === jobId)

  if (!job) return <JobNotFound />

  // Keyed on the job so switching jobs starts from that job's own data rather
  // than carrying one job's decisions onto another's applicants.
  return <ResponseManager key={job.id} job={job} />
}

/**
 * The posting's people, handed to the shared list. Everything about triage —
 * tabs, views, filters, the panel — is `CandidateList`; what is this page's own
 * is who the people are, what the posting asks for, and the header.
 */
function ResponseManager({ job }: { job: Job }) {
  const people = React.useMemo(() => applicantsFor(job), [job])
  const requiredSkills = React.useMemo(() => requiredSkillsFor(job), [job])

  return (
    <CandidateList
      people={people}
      requiredSkills={requiredSkills}
      header={<JobHeader job={job} />}
      empty={<NoResponsesYet job={job} />}
    />
  )
}

/**
 * The job, restated at the top so you know whose responses these are.
 *
 * It is deliberately thin — the facts that qualify a candidate against this
 * posting (where it is, how long it runs) and nothing else. The job's own
 * editing lives back on the Jobs page; repeating it here would give the same
 * action two homes.
 *
 * The back button is a real link rather than `history.back()`. This page is
 * reachable from a pasted URL and from the message dock, and browser-history
 * back from a fresh tab leaves the app entirely — "up to the list" is a fixed
 * destination, not wherever you happened to come from.
 *
 * It is centred against the whole two-line block rather than sitting on the
 * title's line. The block is one object — a job and the facts about it — so the
 * control that leaves it belongs beside the object, not beside its first line.
 */
function JobHeader({ job }: { job: Job }) {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        nativeButton={false}
        aria-label="Back to all jobs"
        className="shrink-0 rounded-full"
        render={<Link to="/jobs" />}
      >
        <ArrowLeftIcon />
      </Button>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* One step above the applicant cards' `text-base` titles and one
              below what it was: at `text-xl` it was the loudest thing on a
              screen whose content is the list underneath it. */}
          <h2 className="font-heading text-lg font-medium">{job.title}</h2>
          <Badge variant={job.plan === "Pro" ? "secondary" : "outline"}>
            {job.plan}
          </Badge>
          <JobStatusBadge job={job} />
        </div>

        <Meta separator={false}>
          <MetaItem>
            <MapPinIcon />
            {job.location}
          </MetaItem>
          {job.status === "live" && (
            <MetaItem>
              <ClockIcon />
              Expires in {job.expiresInDays} days
            </MetaItem>
          )}
          {job.status === "closed" && (
            <MetaItem>
              <ClockIcon />
              Closed {job.closedOn}
            </MetaItem>
          )}
        </Meta>
      </div>
    </div>
  )
}

function JobStatusBadge({ job }: { job: Job }) {
  switch (job.status) {
    case "live":
      return <Badge variant="success">Live</Badge>
    case "pending":
      return <Badge variant="secondary">In review</Badge>
    case "closed":
      return <Badge variant="outline">{job.outcome}</Badge>
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>
  }
}

/**
 * A posting with no responses, said in the terms of why it has none. A pending
 * job is not empty, it is unpublished — and a recruiter staring at five zeroed
 * tabs would reasonably think something had broken.
 */
function NoResponsesYet({ job }: { job: Job }) {
  const reason =
    job.status === "pending"
      ? "This posting is still with moderation. Applications can only start once it goes live."
      : job.status === "rejected"
        ? "This posting was turned down, so it never went live and never collected applications. Fix the reason and resubmit it."
        : "It has gone live and nobody has applied yet. Recommendations from the database are the faster way in on day one."

  return (
    <Empty className="rounded-2xl border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserRoundIcon />
        </EmptyMedia>
        <EmptyTitle>No responses yet</EmptyTitle>
        <EmptyDescription>{reason}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function JobNotFound() {
  return (
    <div className="px-4 lg:px-6">
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BriefcaseIcon />
          </EmptyMedia>
          <EmptyTitle>No such job</EmptyTitle>
          <EmptyDescription>
            This posting does not exist, or it was removed from the account.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
