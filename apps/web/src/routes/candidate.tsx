import * as React from "react"
import { Link, useParams } from "react-router"
import {
  ArrowLeftIcon,
  DownloadIcon,
  MailIcon,
  UserRoundIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { useBrand } from "@workspace/ui/components/brand-provider"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import {
  ApplicantStatusBadge,
  DecisionGroup,
} from "@/components/applicant-controls"
import { useAthenaContext } from "@/components/athena-provider"
import { useDecisions } from "@/components/decisions-provider"
import { CandidateDetail } from "@/components/candidate-detail"
import { CandidateSkeleton } from "@/components/skeletons"
import {
  careerSummary,
  draftToCandidate,
  matchOnPosting,
  similarToReview,
} from "@/lib/athena"
import {
  CandidateSourceContext,
  candidateHref,
  jobSource,
} from "@/lib/candidate-source"
import {
  applicantsFor,
  requiredSkillsFor,
  type Applicant,
  type ApplicantStatus,
} from "@/lib/applicants"
import { jobsFor, type Job } from "@/lib/jobs"
import { usePageLoading } from "@/lib/use-page-loading"

/**
 * One candidate, read properly.
 *
 * IT IS THE OTHER HALF OF THE RESPONSE MANAGER, not a bigger version of the
 * card. The card exists to be scanned a hundred and forty-eight times and
 * carries the four facts that disqualify somebody; this exists to be read once
 * and carries everything the card had to leave out — the whole career rather
 * than two roles of it, education in full, every skill rather than three.
 *
 * IT IS NESTED UNDER THE JOB, at `/jobs/:jobId/applicants/:applicantId`,
 * because a candidate here is not a person in the abstract — they are a person
 * who applied to THIS posting. Skills match against this job's requirements,
 * the status is their status on this job, and "back" means back to these
 * responses. The same human applying to two postings is two rows, which is what
 * the applicant ids already say by carrying the job's id.
 *
 * THE DECISION CONTROLS ARE HERE TOO. Reading a profile is how you decide, so
 * making somebody go back to the list to act on what they just read would be
 * the screen refusing to finish its own sentence. They write to the same
 * provider the list reads, so a shortlist taken here is a shortlist there.
 */
export function CandidatePage() {
  const { jobId, applicantId } = useParams()
  const { brand } = useBrand()
  const { decided, decide } = useDecisions()
  const loading = usePageLoading(500)

  const job = jobsFor(brand).find((candidate) => candidate.id === jobId)
  const applicant = React.useMemo(() => {
    if (!job) return undefined
    return applicantsFor(job).find((person) => person.id === applicantId)
  }, [job, applicantId])

  if (loading) return <CandidateSkeleton />
  if (!job || !applicant) return <CandidateNotFound jobId={jobId} />

  return <Profile job={job} applicant={decided(applicant)} onDecide={decide} />
}

function Profile({
  job,
  applicant,
  onDecide,
}: {
  job: Job
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  useAthenaOnApplication(job, applicant)

  return (
    // They applied to this job, so that is what an interview here is for.
    <CandidateSourceContext value={(person) => jobSource(job, person.id)}>
      <div className="flex flex-col gap-5 px-4 lg:px-6">
        <Header job={job} applicant={applicant} onDecide={onDecide} />

        <CandidateDetail
          applicant={applicant}
          required={requiredSkillsFor(job)}
        />
      </div>
    </CandidateSourceContext>
  )
}

/**
 * What Athena can answer about this person. Everybody else on the posting
 * comes along, with decisions laid over, because "how do they rank" and "who
 * else is like them" are questions about the rest of the list.
 */
function useAthenaOnApplication(job: Job, person: Applicant) {
  const { decided } = useDecisions()
  const people = React.useMemo(() => applicantsFor(job), [job]).map(decided)

  const application = {
    job,
    people,
    person,
    requiredSkills: requiredSkillsFor(job),
    hrefFor: (other: Applicant) =>
      candidateHref(jobSource(job, other.id), other.id),
  }

  useAthenaContext({
    label: person.name,
    detail: job.title,
    openers: [
      {
        prompt: "How do they match this posting?",
        answer: () => matchOnPosting(application),
      },
      {
        prompt: "Summarise their career",
        answer: () => careerSummary(application),
      },
      {
        prompt: "Who else still to review is like them?",
        answer: () => similarToReview(application),
      },
      {
        prompt: "Draft a message to them",
        answer: () => draftToCandidate(application),
      },
    ],
  })
}

/**
 * Name, where they are now, and every control that acts on them.
 *
 * The back link is a real link to the job's responses rather than
 * `history.back()`: this page is reachable from a pasted URL and from the
 * message dock, and "up to the list I came from" has to mean the list whether
 * or not the browser agrees.
 */
function Header({
  job,
  applicant,
  onDecide,
}: {
  job: Job
  applicant: Applicant
  onDecide: (id: string, status: ApplicantStatus) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="link"
        size="sm"
        nativeButton={false}
        className="h-auto w-fit gap-1.5 px-0 text-muted-foreground"
        render={<Link to={`/jobs/${job.id}`} />}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        {job.title}
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {/* The card's avatar, without the "new" dot. */}
          <Avatar className="size-12 shrink-0">
            {applicant.photo && <AvatarImage src={applicant.photo} alt="" />}
            <AvatarFallback>{initials(applicant.name)}</AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-xl font-medium">
                {applicant.name}
              </h2>
              <ApplicantStatusBadge status={applicant.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {applicant.title} at {applicant.company}
            </p>
            <Meta>
              <MetaItem>{applicant.location}</MetaItem>
              <MetaItem>Applied {applicant.appliedAgo}</MetaItem>
            </Meta>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DecisionGroup applicant={applicant} onDecide={onDecide} />
          <Button variant="outline" size="sm">
            <DownloadIcon data-icon="inline-start" />
            Download CV
          </Button>
          <Button size="sm" onClick={() => onDecide(applicant.id, "contacted")}>
            <MailIcon data-icon="inline-start" />
            Message
          </Button>
        </div>
      </div>
    </div>
  )
}

function CandidateNotFound({ jobId }: { jobId?: string }) {
  return (
    <div className="px-4 lg:px-6">
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UserRoundIcon />
          </EmptyMedia>
          <EmptyTitle>No such candidate</EmptyTitle>
          <EmptyDescription>
            This application does not exist on this posting — or it belongs to
            the other product, which has its own candidates.
          </EmptyDescription>
        </EmptyHeader>
        {jobId && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to={`/jobs/${jobId}`} />}
          >
            Back to responses
          </Button>
        )}
      </Empty>
    </div>
  )
}

/** Two letters, so a name that is one word or four still yields two. */
function initials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase()
}
