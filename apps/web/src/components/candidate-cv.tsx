import type { ReactNode } from "react"
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
export function CandidateCv({ applicant }: { applicant: Applicant }) {
  const filename = `${applicant.name.toLowerCase().replace(/\s+/g, "-")}-cv.pdf`
  const roles = applicant.positions.length

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
              {applicant.title} · {applicant.company}
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
              {applicant.experienceYears} years across {roles}{" "}
              {roles === 1 ? "role" : "roles"}, currently {applicant.title} at{" "}
              {applicant.company}. Based in {applicant.location}
              {applicant.noticeDays === 0
                ? ", available immediately"
                : `, ${applicant.noticeDays} days' notice`}
              .
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
                    <span className="text-sm font-semibold">{role.title}</span>
                    <span className="text-xs text-[#6a6a6a] tabular-nums">
                      {role.from}–{role.to ?? "Present"}
                    </span>
                  </div>
                  <span className="text-sm text-[#4a4a4a]">{role.company}</span>
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
              {applicant.skills.join(" · ")}
            </p>
          </CvSection>
        </article>
      </div>
    </div>
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
