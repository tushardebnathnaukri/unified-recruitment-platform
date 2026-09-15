import { Fragment, type ReactNode } from "react"
import { DownloadIcon, ExternalLinkIcon, LockIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import type { Applicant } from "@/lib/applicants"

/**
 * The CV tab of a candidate's detail pane — the document, not the profile.
 *
 * TODO(design): THE PAGE IS DRAWN, NOT EMBEDDED. There are no uploaded files in
 * this prototype, so rather than an empty `<iframe>` this renders a CV laid out
 * from the same mock applicant the profile tab reads. What is worth reviewing
 * here is the viewer — does a recruiter want the document at all, does it
 * belong beside the profile or instead of it, is a page this size readable in a
 * pane — and none of that needs a real PDF to answer. When files exist, the
 * `<article>` below is replaced by the embed and the chrome around it stays.
 *
 * CONTACT DETAILS ARE REDACTED ON THE PAGE. A real CV carries an email and a
 * phone number in its header, which is exactly the thing `Applicant` says is
 * gated — "the thing a posting is really being paid for". A CV tab that prints
 * them un-gated would hand over, in one click, what the profile tab makes you
 * ask for. The reveal stays on the profile's own control rather than being
 * duplicated here, because two controls for one disclosure is two places to get
 * it wrong.
 */
export function CandidateCv({
  applicant,
  required = [],
}: {
  applicant: Applicant
  /** What the posting or search asked for. The ones this person has are
   *  highlighted wherever they appear on the page. */
  required?: string[]
}) {
  const filename = `${applicant.name.toLowerCase().replace(/\s+/g, "-")}-cv.pdf`
  const roles = applicant.positions.length
  // Only what they actually match: highlighting an asked-for skill they do not
  // list would be marking the page for something it does not say.
  const matched = applicant.skills.filter((skill) => required.includes(skill))
  const mark = (text: string) => <Highlight text={text} terms={matched} />
  const summary =
    `${applicant.experienceYears} years across ${roles} ` +
    `${roles === 1 ? "role" : "roles"}, currently ${applicant.title} at ` +
    `${applicant.company}. Based in ${applicant.location}` +
    (applicant.noticeDays === 0
      ? ", available immediately."
      : `, ${applicant.noticeDays} days' notice.`)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {filename}
        </span>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <DownloadIcon data-icon="inline-start" />
            Download
          </Button>
          <Button variant="outline" size="sm">
            <ExternalLinkIcon data-icon="inline-start" />
            Open
          </Button>
        </div>
      </div>

      {/* The viewer's ground. A document sits ON something — without it the
          page has no edge and stops reading as a page. */}
      <div className="rounded-xl bg-muted/50 p-3 ring-1 ring-foreground/10 sm:p-6">
        {/*
          Explicit white and near-black, not tokens, and not themed. A PDF
          renders the same in dark mode as in light because it is a document
          rather than part of the interface — a page that inverts with the app
          is the one thing this would never do in a real viewer.
        */}
        <article className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-md bg-white p-8 text-[#1a1a1a] shadow-md sm:p-10">
          <header className="flex flex-col gap-2 border-b border-black/10 pb-5">
            <h3 className="font-heading text-2xl font-semibold">
              {applicant.name}
            </h3>
            <p className="text-sm text-[#4a4a4a]">
              {mark(`${applicant.title} · ${applicant.company}`)}
            </p>

            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6a6a6a]">
              <span>{applicant.location}</span>
              <span aria-hidden="true">·</span>
              {/* Masked rather than removed: the recruiter should see that the
                  CV has contact details and that they are behind the same gate
                  as everywhere else, not that this candidate supplied none. */}
              <span className="flex items-center gap-1.5">
                <LockIcon className="size-3" aria-hidden="true" />
                <span className="rounded-sm bg-black/10 px-2 py-0.5 text-[#6a6a6a] select-none">
                  Contact details hidden
                </span>
              </span>
            </p>
          </header>

          <CvSection title="Summary">
            <p className="text-sm leading-relaxed text-[#3a3a3a]">
              {mark(summary)}
            </p>
          </CvSection>

          <CvSection title="Experience">
            <ol className="flex flex-col gap-4">
              {applicant.positions.map((role) => (
                <li
                  key={`${role.company}-${role.from}`}
                  className="flex flex-col gap-0.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="text-sm font-semibold">
                      {mark(role.title)}
                    </span>
                    <span className="text-xs text-[#6a6a6a] tabular-nums">
                      {role.from}–{role.to ?? "Present"}
                    </span>
                  </div>
                  <span className="text-sm text-[#4a4a4a]">
                    {mark(role.company)}
                  </span>
                </li>
              ))}
            </ol>
          </CvSection>

          <CvSection title="Education">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <span className="text-sm font-semibold">
                {applicant.education.degree}
              </span>
              <span className="text-xs text-[#6a6a6a] tabular-nums">
                {applicant.education.from}–{applicant.education.to}
              </span>
            </div>
            <span className="text-sm text-[#4a4a4a]">
              {applicant.education.school}
            </span>
          </CvSection>

          <CvSection title="Skills">
            <p className="text-sm leading-relaxed text-[#3a3a3a]">
              {/* Compared whole, not searched as text: "Sales" asked for is
                  not a match for a listed "Channel sales". */}
              {applicant.skills.map((skill, index) => (
                <Fragment key={skill}>
                  {index > 0 && " · "}
                  {matched.includes(skill) ? <Mark>{skill}</Mark> : skill}
                </Fragment>
              ))}
            </p>
          </CvSection>
        </article>
      </div>
    </div>
  )
}

/**
 * A highlighter stroke, as if the recruiter had marked the printout.
 *
 * Yellow and hardcoded, like the page's white: it is ink on the document, not
 * part of the interface, and a brand-coloured highlight would read as a link
 * or a control on a page that has neither.
 */
function Mark({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded-[2px] bg-[#fde68a] px-0.5 text-inherit">
      {children}
    </mark>
  )
}

/**
 * Marks every whole-word occurrence of any term in running text, case
 * insensitively. Longest terms first, so "Key accounts" wins over a shorter
 * term inside it.
 */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return text

  const escaped = [...terms]
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const pattern = new RegExp(`(?<!\\w)(${escaped.join("|")})(?!\\w)`, "gi")

  return text.split(pattern).map((part, index) =>
    // split with one capture group alternates plain, match, plain…
    index % 2 === 1 ? <Mark key={index}>{part}</Mark> : part
  )
}

function CvSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold tracking-widest text-[#6a6a6a] uppercase">
        {title}
      </h4>
      {children}
    </section>
  )
}
