import * as React from "react"
import type {
  Decorator,
  Meta as StoryMeta,
  StoryObj,
} from "@storybook/react-vite"
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  CalendarPlusIcon,
  CheckIcon,
  DownloadIcon,
  GraduationCapIcon,
  MailIcon,
  PhoneIcon,
  XIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import { SectionHeader } from "@workspace/ui/components/section-header"
import { Separator } from "@workspace/ui/components/separator"
import { designComposition } from "@workspace/ui/lib/figma"

/**
 * One candidate, read properly.
 *
 * Mirrors `apps/web/src/routes/candidate.tsx` and
 * `apps/web/src/components/candidate-detail.tsx`.
 *
 * IT IS THE OTHER HALF OF THE RESPONSE MANAGER, not a bigger version of the
 * card. The card exists to be scanned 148 times and carries the four facts
 * that disqualify somebody; this exists to be read once and carries everything
 * the card had to leave out — the whole career rather than two roles of it,
 * education in full, every skill rather than three.
 *
 * IT IS NESTED UNDER THE JOB, at `/jobs/:jobId/applicants/:applicantId`,
 * because a candidate here is not a person in the abstract — they are a person
 * who applied to THIS posting. Skills match against this job's requirements,
 * the status is their status on this job, and "back" means back to these
 * responses.
 */

const REQUIRED = ["Kubernetes", "Go", "Kafka", "Terraform"]

const APPLICANT = {
  name: "Ananya Krishnan",
  title: "Staff Engineer",
  company: "Razorpay",
  location: "Bengaluru",
  appliedAgo: "2 days ago",
  experienceYears: 11,
  currentCtcLakh: 64,
  noticeDays: 60,
  email: "ananya.krishnan@example.com",
  phone: "+91 98450 11234",
  positions: [
    {
      title: "Staff Engineer",
      company: "Razorpay",
      from: 2021,
      to: null as number | null,
    },
    { title: "Senior Engineer", company: "Flipkart", from: 2017, to: 2021 },
    { title: "Software Engineer", company: "Zeta", from: 2014, to: 2017 },
  ],
  education: {
    school: "IIT Madras",
    degree: "B.Tech, Computer Science",
    from: 2010,
    to: 2014,
  },
  skills: ["Kubernetes", "Go", "Terraform", "gRPC", "PostgreSQL"],
}

const MATCHED = APPLICANT.skills.filter((skill) => REQUIRED.includes(skill))
const MISSING = REQUIRED.filter((skill) => !MATCHED.includes(skill))
const OTHER = APPLICANT.skills.filter((skill) => !MATCHED.includes(skill))

/** Two letters, so a name that is one word or four still yields two. */
function initials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase()
}

/** "4 yrs", or "1 yr". Present roles measure to the constant the data uses. */
function span(role: { from: number; to: number | null }) {
  const years = (role.to ?? 2026) - role.from
  return years === 1 ? "1 yr" : `${years} yrs`
}

/**
 * Name, where they are now, and every control that acts on them.
 *
 * THE DECISION CONTROLS ARE HERE TOO. Reading a profile is how you decide, so
 * making somebody go back to the list to act on what they just read would be
 * the screen refusing to finish its own sentence. In the app they write to the
 * same provider the list reads, so a shortlist taken here is a shortlist
 * there.
 */
function Header() {
  return (
    <div className="flex flex-col gap-4">
      {/* A real link to the job's responses, not `history.back()`: this page
          is reachable from a pasted URL and from the message dock, and "up to
          the list I came from" has to mean the list whether or not the
          browser agrees. */}
      <Button
        variant="link"
        size="sm"
        className="h-auto w-fit gap-1.5 px-0 text-muted-foreground"
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Principal Engineer, Platform Infrastructure
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {/* Initials, not a photograph — the same call the card makes, and
              for the same reason. */}
          <Avatar className="size-12 shrink-0">
            <AvatarFallback>{initials(APPLICANT.name)}</AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-xl font-medium">
                {APPLICANT.name}
              </h2>
              <Badge>Unread</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {APPLICANT.title} at {APPLICANT.company}
            </p>
            <Meta>
              <MetaItem>{APPLICANT.location}</MetaItem>
              <MetaItem>Applied {APPLICANT.appliedAgo}</MetaItem>
            </Meta>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <CheckIcon data-icon="inline-start" />
            Shortlist
          </Button>
          <Button variant="outline" size="sm">
            <XIcon data-icon="inline-start" />
            Not a fit
          </Button>
          <Button variant="outline" size="sm">
            <DownloadIcon data-icon="inline-start" />
            Download CV
          </Button>
          <Button size="sm">
            <MailIcon data-icon="inline-start" />
            Message
          </Button>
        </div>
      </div>
    </div>
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
 * The facts a decision actually turns on, in a column that stays put.
 *
 * They are all on the card too — this is not new information, it is the same
 * information not scrolling away while you read six roles. Contact details are
 * the one thing here the card gates, and they are gated the same way: what a
 * posting is being paid for is not printed beside a name.
 */
function AtAGlance() {
  const [revealed, setRevealed] = React.useState(false)

  return (
    <Card size="sm" className="gap-4 px-(--card-spacing)">
      <Fact label="Experience">
        {APPLICANT.experienceYears} yrs across {APPLICANT.positions.length}{" "}
        roles
      </Fact>
      <Fact label="Current pay">₹{APPLICANT.currentCtcLakh}L</Fact>
      <Fact label="Notice">{APPLICANT.noticeDays} days</Fact>
      <Fact label="Location">{APPLICANT.location}</Fact>

      <Separator />

      {revealed ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Contact
          </span>
          <a
            href={`mailto:${APPLICANT.email}`}
            className="inline-flex items-center gap-2 text-sm hover:underline"
          >
            <MailIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{APPLICANT.email}</span>
          </a>
          <a
            href="tel:+919845011234"
            className="inline-flex items-center gap-2 text-sm hover:underline"
          >
            <PhoneIcon className="size-3.5 shrink-0 text-muted-foreground" />
            {APPLICANT.phone}
          </a>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setRevealed(true)}>
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

/**
 * The whole career, not the two roles the card had room for.
 *
 * Each role carries its span in years, because "2019–2022" makes a reader do
 * arithmetic on every line and the answer — did they stay anywhere — is the
 * thing being looked for.
 */
function Experience() {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Experience" />
      <Card className="gap-0 py-0">
        {APPLICANT.positions.map((role, index) => (
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

function Education() {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Education" />
      <Card className="gap-0 py-0">
        <div className="flex gap-3 px-4 py-3.5">
          <GraduationCapIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium">
              {APPLICANT.education.school}
            </span>
            <span className="text-sm text-muted-foreground">
              {APPLICANT.education.degree}
            </span>
            <Meta>
              <MetaItem>
                {APPLICANT.education.from}–{APPLICANT.education.to}
              </MetaItem>
            </Meta>
          </div>
        </div>
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

/**
 * Matched first, then the rest.
 *
 * The card shows three skills and says how many of the posting's four they
 * have; this shows the posting's requirements in full, INCLUDING THE ONES THEY
 * DO NOT HAVE — which is the question a profile gets opened to answer and the
 * one thing here the card genuinely cannot hold.
 */
function Skills() {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="Skills"
        description={`${MATCHED.length} of the ${REQUIRED.length} this posting asks for`}
      />
      <Card size="sm" className="gap-4 px-(--card-spacing)">
        <SkillRow label="Matched" empty="None of the posting's requirements">
          {MATCHED.map((skill) => (
            <Badge key={skill} variant="success" className="font-normal">
              {skill}
            </Badge>
          ))}
        </SkillRow>

        <SkillRow label="Not listed" empty="Nothing missing">
          {MISSING.map((skill) => (
            <Badge key={skill} variant="outline" className="font-normal">
              {skill}
            </Badge>
          ))}
        </SkillRow>

        <SkillRow label="Also has" empty="Nothing beyond the requirements">
          {OTHER.map((skill) => (
            <Badge key={skill} variant="outline" className="font-normal">
              {skill}
            </Badge>
          ))}
        </SkillRow>
      </Card>
    </section>
  )
}

/**
 * `page` puts the facts in a sticky column beside the career; `pane` stacks
 * them, because the pane is already a column and a column inside a column is
 * two scrollbars and no room for either.
 */
function CandidateDetail({ layout = "page" }: { layout?: "page" | "pane" }) {
  return (
    <div
      className={
        layout === "page"
          ? "flex flex-col gap-5 @4xl/main:flex-row @4xl/main:items-start"
          : "flex flex-col gap-5"
      }
    >
      <div
        className={
          layout === "page"
            ? "flex shrink-0 flex-col gap-5 @4xl/main:sticky @4xl/main:top-4 @4xl/main:order-last @4xl/main:w-72"
            : "flex flex-col gap-5"
        }
      >
        <AtAGlance />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Experience />
        <Education />
        <Skills />
      </div>
    </div>
  )
}

function CandidatePage() {
  return (
    <div className="@container/main flex flex-col gap-5 px-4 lg:px-6">
      <Header />
      <CandidateDetail />
    </div>
  )
}

const meta = {
  title: "Compositions/Candidate profile",
  parameters: {
    design: designComposition("candidate-profile"),
    layout: "fullscreen",
    docs: {
      description: {
        component: `
One candidate, read properly — the other half of the response manager.
Mirrors \`apps/web/src/routes/candidate.tsx\` and
\`apps/web/src/components/candidate-detail.tsx\`.

**The card triages, this reads.** The card carries the four facts that
disqualify somebody, scanned 148 times; this carries everything the card had
to leave out — the whole career, education in full, every skill.

**Skills show what is MISSING, not just what matched.** That is the question a
profile gets opened to answer, and the one thing the card genuinely cannot
hold.

**Contact details are gated**, the same way the card gates them: what a
posting is being paid for is not printed beside a name. The disclosure stores
*which* candidate was asked for rather than a boolean, so selecting somebody
else in the split view resets it — carrying it across would show the next
person's details unasked.

**The decision controls are on this page too.** Reading a profile is how you
decide; sending somebody back to the list to act on what they just read would
be the screen refusing to finish its own sentence.

The same component serves the profile PANE in the split view — pass
\`layout="pane"\` and the sticky facts column stacks instead, because a column
inside a column is two scrollbars and no room for either.
        `,
      },
    },
  },
} satisfies StoryMeta

export default meta

type Story = StoryObj<typeof meta>

export const FullPage: Story = {
  name: "Candidate — full page",
  render: () => <CandidatePage />,
}

const padded: Decorator = (Story) => (
  <div className="@container/main mx-auto max-w-4xl p-6">
    <Story />
  </div>
)

export const HeaderStory: Story = {
  name: "Header",
  decorators: [padded],
  render: () => <Header />,
}

export const AtAGlanceStory: Story = {
  name: "At a glance",
  decorators: [padded],
  render: () => (
    <div className="max-w-72">
      <AtAGlance />
    </div>
  ),
}

export const ExperienceStory: Story = {
  name: "Experience",
  decorators: [padded],
  render: () => <Experience />,
}

export const SkillsStory: Story = {
  name: "Skills",
  decorators: [padded],
  render: () => <Skills />,
}

/** The same detail, stacked for the split view's profile pane. */
export const PaneLayout: Story = {
  name: "Pane layout",
  decorators: [padded],
  render: () => (
    <div className="max-w-md">
      <CandidateDetail layout="pane" />
    </div>
  ),
}
