import type { Applicant, Position } from "@/lib/applicants"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import { SectionHeader } from "@workspace/ui/components/section-header"
import { Separator } from "@workspace/ui/components/separator"
import {
  BriefcaseIcon,
  CalendarPlusIcon,
  GraduationCapIcon,
  MailIcon,
  PhoneIcon,
} from "lucide-react"
import * as React from "react"

import { useListCopy } from "@/lib/list-source"

/**
 * Everything a candidate's profile SAYS, without deciding where it sits.
 *
 * Two screens render this: the profile page, where it is the page, and the
 * split view on the response manager, where it is the right-hand pane. They
 * are the same facts read the same way — what differs is how you got there and
 * how much room there is — so it is one implementation with a `layout` prop
 * rather than two that agree until somebody edits one.
 */
export function CandidateDetail({
  applicant,
  required,
  layout = "page",
}: {
  applicant: Applicant
  /** The posting's requirements, for the skills match. */
  required: string[]
  /**
   * `page` puts the facts in a sticky column beside the career; `pane` stacks
   * them, because the pane is already a column and a column inside a column is
   * two scrollbars and no room for either.
   */
  layout?: "page" | "pane"
}) {
  const matched = applicant.skills.filter((skill) => required.includes(skill))

  /**
   * WHICH candidate's details were asked for, not whether some were.
   *
   * The disclosure has to reset when the split view selects somebody else —
   * carrying it across would show the next person's contact details unasked,
   * which is the one thing this control exists to prevent. Storing the id
   * makes that fall out of a comparison; the boolean version needed an effect
   * to clear it, and a synchronous `setState` in an effect is the cascading
   * render `react-hooks` rejects.
   */
  const [revealedFor, setRevealedFor] = React.useState<string | null>(null)
  const revealed = revealedFor === applicant.id

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
        <AtAGlance
          applicant={applicant}
          revealed={revealed}
          onReveal={() => setRevealedFor(applicant.id)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Experience applicant={applicant} />
        <Education applicant={applicant} />
        <Skills applicant={applicant} matched={matched} required={required} />
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
  const copy = useListCopy()
  const missing = required.filter((skill) => !matched.includes(skill))
  const other = applicant.skills.filter((skill) => !matched.includes(skill))

  // A search that named no skills asked for nothing, so there is nothing to
  // be matched or missing — just what they have.
  if (required.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <SectionHeader title="Skills" />
        <Card size="sm" className="gap-4 px-(--card-spacing)">
          <SkillRow label="Has" empty="None listed">
            {applicant.skills.map((skill) => (
              <Badge key={skill} variant="outline" className="font-normal">
                {skill}
              </Badge>
            ))}
          </SkillRow>
        </Card>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="Skills"
        description={`${matched.length} of the ${required.length} ${copy.askedFor}`}
      />

      <Card size="sm" className="gap-4 px-(--card-spacing)">
        <SkillRow label="Matched" empty={copy.noRequirementsMet}>
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

/** "4 yrs", or "1 yr". Present roles measure to the constant the data uses. */
function span(role: Position) {
  const years = (role.to ?? 2026) - role.from
  return years === 1 ? "1 yr" : `${years} yrs`
}
