import { Skeleton } from "@workspace/ui/components/skeleton"

/**
 * Placeholders for the three surfaces, while a product loads.
 *
 * THEY ARE SHAPED LIKE WHAT THEY REPLACE — same card, same ring, same rows in
 * the same places. A skeleton's whole job is to say "the thing you asked for is
 * coming and it will look like this"; generic grey bars say "something is
 * happening", which is a different and less useful sentence, and it makes the
 * arrival a re-layout rather than a fill.
 *
 * THE WIDTHS VARY DOWN THE LIST. Every row identical reads as a repeating
 * pattern rather than as content, and the eye stops treating it as text-shaped.
 * The variation is a fixed cycle, not random, so two renders of the same
 * loading state do not disagree — a design review looks at these too.
 */
const TITLE_WIDTHS = ["w-64", "w-52", "w-72", "w-56", "w-60", "w-48"]

/** The job cards on /jobs — title, a meta line, and the counts under a rule. */
export function JobListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-2xl bg-card px-5 py-4 ring-1 ring-foreground/10"
        >
          <div className="flex items-center gap-2">
            <Skeleton className={`h-5 ${TITLE_WIDTHS[index % 6]}`} />
            <Skeleton className="h-5 w-10 rounded-4xl" />
          </div>
          <Skeleton className="h-3.5 w-56" />
          <div className="border-t border-border pt-3">
            <Skeleton className="h-3.5 w-72" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** The candidate cards — avatar, name, then the bucket grid and the actions. */
export function ApplicantListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-2xl bg-card px-5 py-4 ring-1 ring-foreground/10"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className={`h-4 ${TITLE_WIDTHS[index % 6]}`} />
              <Skeleton className="h-3.5 w-48" />
            </div>
            <Skeleton className="h-8 w-28 rounded-4xl" />
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <Skeleton className="h-3.5 w-80" />
            <Skeleton className="h-3.5 w-64" />
            <Skeleton className="h-3.5 w-56" />
          </div>

          <div className="flex gap-2 border-t border-border pt-3">
            <Skeleton className="h-8 w-28 rounded-4xl" />
            <Skeleton className="h-8 w-24 rounded-4xl" />
            <Skeleton className="h-8 w-32 rounded-4xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The candidate profile: header, then the career column beside the facts
 * column, in the same two-column shape the real page uses.
 */
export function CandidateSkeleton() {
  return (
    <div className="flex flex-col gap-5 px-4 lg:px-6" aria-hidden="true">
      <Skeleton className="h-4 w-56" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-4xl" />
          <Skeleton className="h-8 w-32 rounded-4xl" />
          <Skeleton className="h-8 w-28 rounded-4xl" />
        </div>
      </div>

      <div className="flex flex-col gap-5 @4xl/main:flex-row @4xl/main:items-start">
        <div className="flex shrink-0 flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 @4xl/main:order-last @4xl/main:w-72">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex justify-between gap-3">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
          <Skeleton className="mt-1 h-8 w-full rounded-4xl" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {[4, 1, 3].map((rows, section) => (
            <div key={section} className="flex flex-col gap-3">
              <Skeleton className="h-4 w-28" />
              <div className="rounded-2xl bg-card ring-1 ring-foreground/10">
                {Array.from({ length: rows }, (_, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-1.5 px-4 py-3.5"
                  >
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-3.5 w-40" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
