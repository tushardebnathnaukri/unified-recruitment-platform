import * as React from "react"
import { Link } from "react-router"
import { ArrowRightIcon } from "lucide-react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { Button } from "@workspace/ui/components/button"
import { SectionHeader } from "@workspace/ui/components/section-header"
import { StatCard, StatGrid } from "@workspace/ui/components/stat-card"

import { SearchRow } from "@/components/search-row"
import { activeJobsFor, statsFor } from "@/lib/dashboard"
import { recentSearchesFor } from "@/lib/database"
import { LiveRow } from "@/routes/jobs"

/**
 * The recruiter's own overview — the four tiles, Live jobs and Recent
 * searches — as parts, because two screens draw them: the Dashboard, and the
 * Agent's chat landing under its box. One implementation, so a tile or a job
 * row cannot read differently depending on where a recruiter meets it.
 */

/**
 * The four tiles.
 *
 * The grid rule (two across, four when there is room, never three) lives in
 * StatGrid. Its query is unnamed, so it resolves against the nearest
 * container — the shell's `@container/main`.
 *
 * NOTE(design): these four are parked. Three of them are standing totals that
 * can never prompt an action; the agreed replacement is queues with an age on
 * them. See the StatCard story.
 */
export function StatTiles() {
  const { brand } = useBrand()

  return (
    <StatGrid>
      {/* Each tile is a link to the page behind its number. The anchor carries
          the focus ring and the card takes the hover — a lift and a shadow,
          not the Jobs rows' `bg-muted`, which went muddy on a tile this size. */}
      {statsFor(brand).map((stat) => (
        <Link
          key={stat.label}
          to={stat.to}
          className="group/stat rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <StatCard
            label={stat.label}
            value={stat.value}
            detail={stat.detail}
            icon={<stat.icon />}
            className="h-full transition-[box-shadow,scale] group-hover/stat:shadow-lg group-hover/stat:shadow-foreground/5 motion-safe:group-hover/stat:scale-[1.02]"
          />
        </Link>
      ))}
    </StatGrid>
  )
}

/**
 * Live jobs and Recent searches, side by side once the content column can
 * hold two cards and stacked below that. Each section is
 * `grid-rows-[auto_1fr]`, so the two headers line up across the row.
 */
export function WorkSections() {
  return (
    <div className="grid gap-6 @5xl/main:grid-cols-2">
      <LiveJobs />
      <RecentSearches />
    </div>
  )
}

/**
 * The section action: a link that looks like a link, routed.
 *
 * `nativeButton={false}` because it renders as an anchor. Base UI logs an error
 * without it, and it is a real one — button semantics on a link cost the
 * middle-click and copy-link that navigation is expected to have.
 */
function SectionLink({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) {
  return (
    <Button
      variant="link"
      size="sm"
      className="px-0"
      nativeButton={false}
      render={<Link to={to} />}
    >
      {children}
      <ArrowRightIcon data-icon="inline-end" />
    </Button>
  )
}

function LiveJobs() {
  const { brand } = useBrand()

  return (
    <section className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <SectionHeader
        title="Live jobs"
        action={<SectionLink to="/jobs">View all</SectionLink>}
      />

      {/* Same card as the Jobs page's Live tab (`LiveRow` in `routes/jobs.tsx`)
          rather than a lighter row of its own, so a job reads identically
          wherever a recruiter meets it. */}
      <div role="list" className="flex flex-col gap-3">
        {activeJobsFor(brand).map((job) => (
          <LiveRow key={job.id} job={job} />
        ))}
      </div>
    </section>
  )
}

function RecentSearches() {
  const { brand } = useBrand()

  return (
    <section className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <SectionHeader
        title="Recent searches"
        action={<SectionLink to="/database">New search</SectionLink>}
      />

      {/* Three, and the full list is on the database page. Each row re-runs
          its search there rather than opening an empty box. */}
      <div role="list" className="flex flex-col gap-3">
        {recentSearchesFor(brand)
          .slice(0, 3)
          .map((search) => (
            <SearchRow key={search.id} search={search} />
          ))}
      </div>
    </section>
  )
}
