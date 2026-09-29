import * as React from "react"
import { Link } from "react-router"
import { ArrowRightIcon, LockIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { JobForm } from "@/components/job-form"
import {
  formFrom,
  payOf,
  spanOf,
  stillNeeded,
  type JobFormValue,
} from "@/lib/job-form"
import {
  encodeRanked,
  payLabel,
  yearsLabel,
  type FieldId,
  type IntakeState,
  type PostingDraft,
} from "@/lib/job-intake"
import { briefRows, encodeChange } from "@/lib/job-refine"
import type { RailModel } from "@/lib/posting-rail"

/**
 * The post-a-job form beside the posting conversation — the "Form beside
 * chat" variant of the Dashboard's posting flow (`lib/posting-variant.ts`).
 *
 * THE CHAT FILLS THE FORM; THE FORM TALKS BACK. Six of the form's fields are
 * ones the chat gathers (title, location, experience, skills, pay, and Work
 * from Home for a remote role), and this panel keeps them in step both ways.
 * When a reading lands the draft changes, and the form is set from it — the
 * chat is the source of what the chat knows. When the recruiter changes one
 * of those fields by hand and is done with it (`onCommit`), the change is
 * sent into the conversation as a `Change:` turn, exactly as the rail's
 * pencil does, so it is recorded, replayed on reload and reflected in the
 * transcript. The other fields — industry, category, salary units, the whole
 * second step — are the form's alone, as they are on `/jobs/new`.
 *
 * THE DRAFT IS FOLLOWED DURING RENDER, NOT IN AN EFFECT, the way the
 * database's search box follows its query: a change in what the chat has
 * read is derived, and a keystroke in the form is not.
 *
 * A FIELD THE CHAT KNOWS CANNOT BE EMPTIED FROM THE FORM. Clearing the
 * locations sends nothing (there is no change to read), and the next reading
 * puts the chat's value back. Emptying a fact is a thing to say to the chat.
 */
export function PostingFormPanel({
  posting,
  people,
  reading,
  onAsk,
  className,
  onStatus,
}: {
  posting: IntakeState
  /** The rail's own count, so the two variants say the same number. */
  people: RailModel["people"]
  reading: boolean
  onAsk: (prompt: string) => void
  /** The required fields still empty, in the form's words — for the chat's status card. */
  onStatus?: (missing: string[]) => void
  className?: string
}) {
  const { draft, brief } = posting
  const [value, setValue] = React.useState(() =>
    formFrom(draft, brief.industries)
  )

  // A new reading: the chat's fields into the form, the rest left alone.
  const known = JSON.stringify([draft, brief.industries])
  const [seen, setSeen] = React.useState(known)
  if (seen !== known) {
    setSeen(known)
    setValue((current) => withDraft(current, draft, brief.industries))
  }

  // What the form still needs, told to the chat whenever it changes.
  const missing = stillNeeded(value).join("\u0000")
  React.useEffect(() => {
    onStatus?.(missing ? missing.split("\u0000") : [])
  }, [missing, onStatus])
  // Gone from the screen, the form needs nothing.
  React.useEffect(() => () => onStatus?.([]), [onStatus])

  const commit = (field: FieldId | "screening", next: JobFormValue) => {
    const change = changeFor(field, next, draft)
    if (change !== null) onAsk(encodeChange({ [field]: change }))
  }

  const rows = briefRows(posting)

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 lg:px-6">
          <p className="text-sm text-muted-foreground">
            Filled in as the chat goes. Change anything — it goes back into the
            conversation.
          </p>
          <JobForm value={value} onChange={setValue} onCommit={commit} />

          {rows.length ? (
            <section className="-mt-2 flex flex-col gap-2 rounded-2xl border bg-background p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium">Selection criteria</h2>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <LockIcon className="size-3" />
                  Private
                </span>
              </div>
              <dl className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-3 gap-y-1 text-sm">
                {rows.map((row) => (
                  <div key={row.label} className="contents">
                    <dt className="leading-5 text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="min-w-0 leading-5 break-words">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-muted-foreground">
                Used to search and screen, never shown on the posting.
              </p>
            </section>
          ) : null}
        </div>
      </div>

      {/* The rail's count, at the foot of the column — the one thing from
          the rail the form cannot say for itself. */}
      {people ? (
        <div className="flex items-center justify-between gap-3 border-t bg-background px-4 py-3 lg:px-6">
          <p className="text-sm">
            <span
              className={cn(
                "font-semibold tabular-nums transition-opacity",
                reading && "opacity-40"
              )}
            >
              {people.matching.toLocaleString("en-IN")}
            </span>
            <span className="text-muted-foreground">
              {" "}
              of {people.total.toLocaleString("en-IN")} people this would find
            </span>
          </p>
          <Link
            to={people.href}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Open the search
            <ArrowRightIcon className="size-3" />
          </Link>
        </div>
      ) : null}
    </div>
  )
}

/** The chat's fields written into the form; everything else as it was. */
function withDraft(
  value: JobFormValue,
  draft: PostingDraft,
  industries: string[]
): JobFormValue {
  const fresh = formFrom(draft, industries)
  return {
    ...value,
    title: fresh.title,
    locations: fresh.locations,
    xpMin: fresh.xpMin,
    xpMax: fresh.xpMax,
    skills: fresh.skills,
    pay: fresh.pay,
    // The chat only ever ADDS Work from Home; the other four chips are the
    // recruiter's.
    diversity:
      draft.mode === "remote" && !value.diversity.includes(fresh.diversity[0])
        ? [...value.diversity, ...fresh.diversity]
        : value.diversity,
    industries: value.industries.length ? value.industries : fresh.industries,
    description: value.description.trim()
      ? value.description
      : fresh.description,
    questions: fresh.questions,
  }
}

/**
 * A field's new value in the words the chat's reader takes — the same words
 * the rail's pencil sends — or null when there is nothing to change.
 */
function changeFor(
  field: FieldId | "screening",
  value: JobFormValue,
  draft: PostingDraft
): string | null {
  const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b)
  switch (field) {
    case "title": {
      const title = value.title.trim()
      return title && title !== draft.title ? title : null
    }
    case "locations":
      return value.locations.length && !same(value.locations, draft.locations)
        ? value.locations.join(", ")
        : null
    case "experience": {
      const span = spanOf(value.xpMin, value.xpMax)
      return span && !same(span, draft.experience) ? yearsLabel(span) : null
    }
    case "pay": {
      const span = payOf(value.pay)
      return span && !same(span, draft.pay)
        ? payLabel(span).replace(/ a year$/, "")
        : null
    }
    case "skills": {
      const list = value.skills
      if (!list.length || same(list, [...draft.skills, ...draft.niceSkills]))
        return null
      // The form has one list; the split survives for skills the chat had
      // already placed below the line, and anything new is a must-have.
      const nice = list.filter(
        (skill) =>
          draft.niceSkills.includes(skill) && !draft.skills.includes(skill)
      )
      return encodeRanked(
        list.filter((skill) => !nice.includes(skill)),
        nice
      )
    }
    case "screening": {
      // One question per line, as the card sends them; an empty list is a
      // real change here (no questions), unlike the fields above.
      const list = value.questions.map((q) => q.trim()).filter(Boolean)
      return same(list, draft.screening) ? null : list.join("\n")
    }
    case "mode":
      return null
  }
}
