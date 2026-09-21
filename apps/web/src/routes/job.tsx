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
import { Separator } from "@workspace/ui/components/separator"
import { useBrand } from "@workspace/ui/components/brand-provider"
import { useAthenaContext } from "@/components/athena-provider"
import { CandidateList } from "@/components/candidate-list"
import { PageHeader } from "@/components/page-header"
import { useDecisions } from "@/components/decisions-provider"
import {
  applicantsFor,
  requiredSkillsFor,
  type Applicant,
} from "@/lib/applicants"
import {
  clearNoSkillMatches,
  draftToShortlisted,
  strongestToReview,
  summariseResponses,
} from "@/lib/athena"
import { candidateHref, jobSource } from "@/lib/candidate-source"
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
 *
 * THE HEADER GOES TO THE TOP BAR rather than into the list's own band. The bar
 * was naming the section ("Jobs") directly above a band naming the job, which
 * spent two rows of a triage screen saying where you were; the list is what
 * this page is for and it starts at the top of the content column now. The
 * list takes no `header`, so its white band does not draw.
 */
function ResponseManager({ job }: { job: Job }) {
  const people = React.useMemo(() => applicantsFor(job), [job])
  const requiredSkills = React.useMemo(() => requiredSkillsFor(job), [job])
  useAthenaOnPosting(job, people, requiredSkills)

  return (
    <>
      <PageHeader>
        <JobHeader job={job} />
      </PageHeader>

      <CandidateList
        people={people}
        requiredSkills={requiredSkills}
        empty={<NoResponsesYet job={job} />}
        candidateSource={(applicant) => jobSource(job, applicant.id)}
      />
    </>
  )
}

/**
 * What Athena can answer about this posting. The people handed to her carry
 * this session's decisions, the same overlay `CandidateList` reads, so her
 * "still to review" and the To review tab are one number.
 */
function useAthenaOnPosting(
  job: Job,
  generated: Applicant[],
  requiredSkills: string[]
) {
  const { decided } = useDecisions()
  const people = generated.map(decided)
  const toReview = people.filter(
    (person) => person.status === "undecided"
  ).length

  const posting = {
    job,
    people,
    requiredSkills,
    hrefFor: (person: Applicant) =>
      candidateHref(jobSource(job, person.id), person.id),
  }

  useAthenaContext({
    label: job.title,
    detail: people.length > 0 ? `${toReview} to review` : undefined,
    openers: [
      {
        prompt: "Who are the strongest five still to review?",
        answer: () => strongestToReview(posting),
      },
      {
        prompt: "Clear out people with none of the skills",
        answer: () => clearNoSkillMatches(posting),
      },
      {
        prompt: "Summarise the responses",
        answer: () => summariseResponses(posting),
      },
      {
        prompt: "Draft a message to the shortlisted",
        answer: () => draftToShortlisted(posting),
      },
    ],
  })
}

/**
 * The job, in the top bar, so you know whose responses these are.
 *
 * It is deliberately thin — the facts that qualify a candidate against this
 * posting (where it is, how long it runs) and nothing else. The job's own
 * editing lives back on the Jobs page; repeating it here would give the same
 * action two homes.
 *
 * THE BAR IS ONE ROW AT `--header-height`, so what was a two-line block is a
 * single line: the title at the bar's own `text-base` rather than `text-lg`,
 * the back button a ghost icon rather than an outlined circle, and the meta
 * behind a separator instead of under the title. Under `lg` the meta drops
 * entirely — the title and its status are what the bar is for, and the same
 * facts are a click away on the Jobs list.
 *
 * The back button is a real link rather than `history.back()`. This page is
 * reachable from a pasted URL and from the message dock, and browser-history
 * back from a fresh tab leaves the app entirely — "up to the list" is a fixed
 * destination, not wherever you happened to come from.
 */
function JobHeader({ job }: { job: Job }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        nativeButton={false}
        aria-label="Back to all jobs"
        className="-ml-2 size-8 shrink-0 rounded-full"
        render={<Link to="/jobs" />}
      >
        <ArrowLeftIcon />
      </Button>

      {/* The bar's own size, not the band's `text-lg`: it is a header now, not
          the loudest thing on the page. */}
      <h1 className="min-w-0 truncate font-heading text-base font-medium">
        {job.title}
      </h1>

      <Badge
        variant={job.plan === "Pro" ? "secondary" : "outline"}
        className="shrink-0"
      >
        {job.plan}
      </Badge>
      <JobStatusBadge job={job} />

      <Separator
        orientation="vertical"
        className="mx-1 hidden h-4 lg:block data-vertical:self-auto"
      />
      <Meta separator={false} className="hidden shrink-0 lg:flex">
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
  )
}

function JobStatusBadge({ job }: { job: Job }) {
  switch (job.status) {
    case "live":
      return (
        <Badge variant="success" className="shrink-0">
          Live
        </Badge>
      )
    case "pending":
      return (
        <Badge variant="secondary" className="shrink-0">
          In review
        </Badge>
      )
    case "closed":
      return (
        <Badge variant="outline" className="shrink-0">
          {job.outcome}
        </Badge>
      )
    case "rejected":
      return (
        <Badge variant="destructive" className="shrink-0">
          Rejected
        </Badge>
      )
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
