import * as React from "react"
import { Link } from "react-router"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { SectionHeader } from "@workspace/ui/components/section-header"
import { StatCard, StatGrid } from "@workspace/ui/components/stat-card"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { AuroraBand } from "@/components/aurora-band"
import { activeJobsFor, newSinceVisitFor, statsFor } from "@/lib/dashboard"
import { recentSearchesFor } from "@/lib/database"
import { LiveRow } from "@/routes/jobs"
import { SearchRow } from "@/components/search-row"
import { DashboardSkeleton } from "@/components/skeletons"
import { usePageLoading } from "@/lib/use-page-loading"

/**
 * The recruiter dashboard.
 *
 * Same information as the live one — active jobs, upcoming interviews, the
 * counts across the top — reorganised around the question a recruiter opens
 * this page with, which is "what needs me today". The live page leads with a
 * Pro upsell and a customer testimonial and puts the work underneath.
 *
 * TWO EQUAL COLUMNS, NOT A COLUMN AND A RAIL. Jobs and interviews are the two
 * things on this page, and neither is subordinate to the other — a 20rem rail
 * said the interviews were an aside, which is wrong on a day with two of them.
 * Equal columns also means neither side has to be padded with cards to stop the
 * grid looking lopsided.
 *
 * RESPONSIVE ON THE CONTENT COLUMN, NOT THE VIEWPORT. Every breakpoint is an
 * `@container/main` query, because what actually changes width here is the
 * content column when the sidebar collapses — a viewport query would keep a
 * four-across stat row while the column beneath it narrowed by 200px.
 *
 * BUILT FROM THE DESIGN SYSTEM'S PARTS. The stat tiles, section heads, list
 * cards, meta lines and chips used to be local to this file; they are now
 * `packages/ui` patterns with stories, and Storybook's "Compositions →
 * Dashboard" is this same tree without the router or the aurora. If a change
 * here is about a row's shape rather than its content, it belongs there.
 *
 * The replica of the live page is still at /reference/dashboard for
 * comparison; it is a photograph and stays hardcoded. This one follows the
 * brand switcher and dark mode.
 */
export function DashboardPage() {
  // The tiles and the job list are the active product's, not a shared set.
  const { brand } = useBrand()
  const loading = usePageLoading()

  return (
    // `-mt-4 md:-mt-6` cancels the shell's top padding so the band can run edge
    // to edge under the header. The shell owns vertical rhythm for every other
    // page; this one takes it back for the hero only.
    <div className="-mt-4 flex flex-col md:-mt-6">
      {/* The band runs the app's Island Glow aurora over `bg-primary`, and
          falls back to the flat token if WebGL2 is missing. It reads `--primary`
          rather than the handoff's hardcoded green, so the curtains re-tune
          when the brand switches — see `aurora-band.tsx`.

          Its bottom padding is deeper than it looks because the card below
          overlaps back into it. The pair is tuned so the band's edge falls
          inside the card's WHITE half rather than its muted footer — the strip
          is meant to read as the hero ending behind the card, and a colour
          change part-way down a grey footer just looks like a seam. */}
      <AuroraBand className="pt-8 pb-28">
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-6">
          <Greeting />
        </div>
      </AuroraBand>

      {/* `relative` is load-bearing: the band above is a positioned element, so
            without it the band would paint over this whole column and swallow
            the card that is supposed to overlap it. */}
      <div className="relative mx-auto -mt-16 flex w-full max-w-7xl flex-col gap-6 px-4 lg:px-6">
        {loading ? (
          /* The greeting above this stays put: it is the same on both
             products, so blanking it would be inventing a load that is not
             happening. Everything below is the product's. */
          <DashboardSkeleton />
        ) : (
          <>
            {/* The grid rule (two across, four when there is room, never three)
              lives in StatGrid. Its query is unnamed, so it resolves against the
              nearest container — the shell's `@container/main`.

              NOTE(design): these four are parked. Three of them are standing
              totals that can never prompt an action; the agreed replacement is
              queues with an age on them. See the StatCard story. */}
            <StatGrid>
              {/* Each tile is a link to the page behind its number. The anchor
                  carries the focus ring and the card takes the hover — a lift
                  and a shadow, not the Jobs rows' `bg-muted`, which went muddy
                  on a tile this size. */}
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

            <ActiveJobs />
            <RecentSearches />
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Sits on the accent band, so both lines take the on-primary pair rather than
 * the page's own foreground tokens — `muted-foreground` is mixed against the
 * page background and goes muddy on a saturated one.
 *
 * Contrast is measured against the animated aurora's own pixels, worst case
 * over fourteen frames with the band's scrim composited in: 4.36:1 behind the
 * heading and 4.83:1 behind the second line. The second line is 14px body text
 * and clears its 4.5:1 bar; the heading is 20px semibold, so it counts as large
 * text and clears the 3:1 that applies to it with room to spare.
 *
 * The heading measures lower than the line beneath it because it sits higher in
 * the band, where the curtains are brightest. That is the trade for an aurora
 * that is actually vivid — an earlier pass dimmed the whole thing to buy 6:1
 * and the band went grey and lifeless. The scrim, not a duller shader, is what
 * holds the floor.
 */
function Greeting() {
  const { brand } = useBrand()

  return (
    <div className="flex flex-col gap-1 text-primary-foreground">
      {/* The page title is in SiteHeader, so this is a greeting rather than a
          second heading competing with it. */}
      <p className="text-xl font-semibold">Good afternoon, Anurag</p>
      {/* New since yesterday, not "haven't opened": the response manager
          sorts people by decision and arrival, and does not track reading. */}
      <p className="text-sm">
        2 jobs went live, and {newSinceVisitFor(brand)} new applicants since
        yesterday.
      </p>
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

function ActiveJobs() {
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
