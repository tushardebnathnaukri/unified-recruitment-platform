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

/** One row of a list card — used by the dashboard's projects and searches. */
function RowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-3.5 w-32" />
    </div>
  )
}

/**
 * The dashboard below the hero. The greeting and the requirement box stay put:
 * they are the same on both products, so blanking them would be inventing a
 * load that is not happening.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4 @3xl:gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
          >
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-36" />
        <div className="rounded-2xl bg-card ring-1 ring-foreground/10">
          {Array.from({ length: 3 }, (_, index) => (
            <RowSkeleton key={index} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 @3xl/main:grid-cols-2">
        {Array.from({ length: 2 }, (_, column) => (
          <div key={column} className="flex flex-col gap-3">
            <Skeleton className="h-4 w-32" />
            <div className="rounded-2xl bg-card ring-1 ring-foreground/10">
              {Array.from({ length: 3 }, (_, index) => (
                <RowSkeleton key={index} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
