import { Link } from "react-router"

import { buttonVariants } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { BrandSwitcher } from "@/components/brand-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { PROTOTYPE_ITEMS } from "@/lib/nav"

/**
 * Prototype settings — the two controls that decide how the design system
 * renders. Everything a real settings page would carry (account,
 * notifications, team) is product surface the design team has not scoped yet.
 */
export function SettingsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6 px-4 lg:px-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Prototype-level settings. These control how the design system renders,
        not anything a real recruiter would configure.
      </p>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
            <h2 className="text-sm font-medium">Brand</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Swaps the accent token layer only. Components, neutrals, radii and
              type are shared between iimjobs and hirist.
            </p>
          </div>

          <BrandSwitcher />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
            <h2 className="text-sm font-medium">Theme</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Light and dark only — no system mode, so a shared preview link
              renders the same for everyone. Press{" "}
              <kbd className="rounded border border-border px-1 font-mono text-xs">
                d
              </kbd>{" "}
              anywhere to flip it without coming back here.
            </p>
          </div>

          <ThemeToggle />
        </div>

        <Separator />

        <p className="text-xs leading-relaxed text-muted-foreground">
          Both persist to <code className="font-mono">localStorage</code> and
          sync across tabs, so a shared preview link opens on whichever brand
          and theme you last picked.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">Prototype pages</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Kept out of the sidebar so it only carries recruiter surfaces. These
            two describe the prototype itself.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PROTOTYPE_ITEMS.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.to}
                to={item.to}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Icon data-icon="inline-start" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
