import type { LucideIcon } from "lucide-react"
import { BriefcaseIcon, PlusIcon } from "lucide-react"
import { Link } from "react-router"

import { buttonVariants } from "@workspace/ui/components/button"

/**
 * The routes with a designed page behind them. Kept here rather than in
 * `nav.ts` because the blurbs are home-page copy — `nav.ts` carries nav labels,
 * and Post a job deliberately has no sidebar entry at all.
 */
const FLOWS: { to: string; label: string; icon: LucideIcon; blurb: string }[] =
  [
    {
      to: "/jobs",
      label: "Jobs",
      icon: BriefcaseIcon,
      blurb:
        "The posted-jobs list, in a table view and a card view, with status filters across the top.",
    },
    {
      to: "/post-job",
      label: "Post a job",
      icon: PlusIcon,
      blurb:
        "The posting form end to end — role details, candidate targeting, and the plan picker.",
    },
  ]

export function HomePage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6 px-4 lg:px-6">
      <div className="flex flex-col gap-2">
        {/* The page title lives in SiteHeader — a second <h1> here would
            compete with it for screen readers. */}
        <p className="text-sm leading-relaxed text-muted-foreground">
          A playground for the iimjobs and hirist design team. Components come
          from the shared design system in{" "}
          <code className="font-mono text-xs text-foreground">packages/ui</code>
          ; the brand switcher on Settings swaps only token layers, never
          components.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Designed so far</h2>

        <ul className="flex flex-col gap-2">
          {FLOWS.map((flow) => (
            <li
              key={flow.to}
              className="relative flex gap-3 rounded-lg border border-border p-4 transition-colors focus-within:border-ring hover:bg-accent"
            >
              <flow.icon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />

              <div className="flex flex-col gap-1">
                {/* The link wraps only its label so a screen reader's link list
                    stays scannable; `after:inset-0` stretches the hit target
                    over the whole row without pulling the blurb into the link
                    text. */}
                <Link
                  to={flow.to}
                  className="text-sm font-medium after:absolute after:inset-0 after:content-['']"
                >
                  {flow.label}
                </Link>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {flow.blurb}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Dashboard, Analytics and Search hold sidebar slots but have nothing
          designed behind them yet.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* These navigate, so they stay links and only borrow the button's
            styling. Composing `Button` with `render` would work, but Base UI
            stamps `role="button"` on any non-native element, which would
            announce a navigation as a button. */}
        <Link to="/playground" className={buttonVariants()}>
          Open the playground
        </Link>
        <Link to="/settings" className={buttonVariants({ variant: "outline" })}>
          Brand and theme
        </Link>
      </div>
    </div>
  )
}
