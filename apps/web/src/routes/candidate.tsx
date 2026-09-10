import * as React from "react"
import { Link, useParams } from "react-router"
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  CalendarPlusIcon,
  DownloadIcon,
  GraduationCapIcon,
  MailIcon,
  PhoneIcon,
  UserRoundIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { useBrand } from "@workspace/ui/components/brand-provider"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import { SectionHeader } from "@workspace/ui/components/section-header"
import { Separator } from "@workspace/ui/components/separator"
import {
  ApplicantStatusBadge,
  DecisionGroup,
} from "@/components/applicant-controls"
import { useDecisions } from "@/components/decisions-provider"
import { CandidateSkeleton } from "@/components/skeletons"
import {
  applicantsFor,
  requiredSkillsFor,
  type Applicant,
  type ApplicantStatus,
  type Position,
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
  const [revealed, setRevealed] = React.useState(false)
  const required = requiredSkillsFor(job)
  const matched = applicant.skills.filter((skill) => required.includes(skill))

  return (
    <div className="flex flex-col gap-5 px-4 lg:px-6">
      <Header job={job} applicant={applicant} onDecide={onDecide} />

      {/* Two columns above 896px of CONTENT width: the career on the left
          because it is what you came to read, the facts you decide on pinned
          to the right where they stay visible while you scroll the career.
          Stacked below that, facts first — on a phone you would otherwise
          scroll past six roles to find the notice period. */}
      <div className="flex flex-col gap-5 @4xl/main:flex-row @4xl/main:items-start">
        <div className="flex shrink-0 flex-col gap-5 @4xl/main:sticky @4xl/main:top-4 @4xl/main:order-last @4xl/main:w-72">
          <AtAGlance
            applicant={applicant}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Experience applicant={applicant} />
          <Education applicant={applicant} />
          <Skills applicant={applicant} matched={matched} required={required} />
        </div>
      </div>
    </div>
  )
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
          {/* Initials, not a photograph — the same call the card makes, and
              for the same reason: screening on a face is the failure mode this
              screen should not encourage. */}
          <Avatar className="size-12 shrink-0">
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

/**
 * The facts a decision actually turns on, in a column that stays put.
 *
 * They are all on the card too — this is not new information, it is the same
 * information not scrolling away while you read six roles. Contact details are
 * the one thing here the card gates, and they are gated the same way: what a
 * posting is being paid for is not printed beside a name.
 */
function AtAGlance({
  applicant,
  revealed,
  onReveal,
}: {
  applicant: Applicant
  revealed: boolean
  onReveal: () => void
}) {
  return (
    <Card size="sm" className="gap-4 px-(--card-spacing)">
      <Fact label="Experience">
        {applicant.experienceYears} yrs across {applicant.positions.length}{" "}
        roles
      </Fact>
      <Fact label="Current pay">&#8377;{applicant.currentCtcLakh}L</Fact>
      <Fact label="Notice">
        {applicant.noticeDays === 0
          ? "Available now"
          : `${applicant.noticeDays} days`}
      </Fact>
      <Fact label="Location">{applicant.location}</Fact>

      <Separator />

      {revealed ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Contact
          </span>
          <a
            href={`mailto:${applicant.email}`}
            className="inline-flex items-center gap-2 text-sm hover:underline"
          >
            <MailIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{applicant.email}</span>
          </a>
          <a
            href={`tel:${applicant.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-2 text-sm hover:underline"
          >
            <PhoneIcon className="size-3.5 shrink-0 text-muted-foreground" />
            {applicant.phone}
          </a>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={onReveal}>
          View contact details
        </Button>
      )}

      <Button variant="outline" size="sm">
        <CalendarPlusIcon data-icon="inline-start" />
        Set up interview
      </Button>
    </Card>
  )
}

function Fact({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{children}</span>
    </div>
  )
}

/**
 * The whole career, not the two roles the card had room for.
 *
 * Each role carries its span in years, because "2019–2022" makes a reader do
 * arithmetic on every line and the answer — did they stay anywhere — is the
 * thing being looked for. Present roles say Present rather than the year.
 */
function Experience({ applicant }: { applicant: Applicant }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Experience" />

      <Card className="gap-0 py-0">
        {applicant.positions.map((role, index) => (
          <div
            key={`${role.company}-${role.from}`}
            className="flex gap-3 px-4 py-3.5 not-first:border-t not-first:border-border"
          >
            <BriefcaseIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">{role.title}</span>
              <span className="text-sm text-muted-foreground">
                {role.company}
              </span>
              <Meta>
                <MetaItem>
                  {role.from}–{role.to ?? "Present"}
                </MetaItem>
                <MetaItem>{span(role)}</MetaItem>
                {index === 0 && <MetaItem>Current</MetaItem>}
              </Meta>
            </div>
          </div>
        ))}
      </Card>
    </section>
  )
}

function Education({ applicant }: { applicant: Applicant }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Education" />

      <Card className="gap-0 py-0">
        <div className="flex gap-3 px-4 py-3.5">
          <GraduationCapIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium">
              {applicant.education.school}
            </span>
            <span className="text-sm text-muted-foreground">
              {applicant.education.degree}
            </span>
            <Meta>
              <MetaItem>
                {applicant.education.from}–{applicant.education.to}
              </MetaItem>
            </Meta>
          </div>
        </div>
      </Card>
    </section>
  )
}

/**
 * Matched first, then the rest.
 *
 * The card shows three skills and says how many of the posting's four they
 * have; this shows the posting's requirements in full, including the ones they
 * do NOT have — which is the question a profile gets opened to answer and the
 * one thing here the card genuinely cannot hold.
 */
function Skills({
  applicant,
  matched,
  required,
}: {
  applicant: Applicant
  matched: string[]
  required: string[]
}) {
  const missing = required.filter((skill) => !matched.includes(skill))
  const other = applicant.skills.filter((skill) => !matched.includes(skill))

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="Skills"
        description={`${matched.length} of the ${required.length} this posting asks for`}
      />

      <Card size="sm" className="gap-4 px-(--card-spacing)">
        <SkillRow label="Matched" empty="None of the posting's requirements">
          {matched.map((skill) => (
            <Badge key={skill} variant="success" className="font-normal">
              {skill}
            </Badge>
          ))}
        </SkillRow>

        <SkillRow label="Not listed" empty="Nothing missing">
          {missing.map((skill) => (
            <Badge key={skill} variant="outline" className="font-normal">
              {skill}
            </Badge>
          ))}
        </SkillRow>

        <SkillRow label="Also has" empty="Nothing beyond the requirements">
          {other.map((skill) => (
            <Badge key={skill} variant="outline" className="font-normal">
              {skill}
            </Badge>
          ))}
        </SkillRow>
      </Card>
    </section>
  )
}

function SkillRow({
  label,
  empty,
  children,
}: {
  label: string
  empty: string
  children: React.ReactNode[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">{children}</div>
      ) : (
        <span className="text-sm text-muted-foreground">{empty}</span>
      )}
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

/** "4 yrs", or "1 yr". Present roles measure to the constant the data uses. */
function span(role: Position) {
  const years = (role.to ?? 2026) - role.from
  return years === 1 ? "1 yr" : `${years} yrs`
}

/** Two letters, so a name that is one word or four still yields two. */
function initials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase()
}
