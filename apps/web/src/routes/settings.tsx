import { Link } from "react-router"

import { buttonVariants } from "@workspace/ui/components/button"
import { Kbd } from "@workspace/ui/components/kbd"
import { Separator } from "@workspace/ui/components/separator"
import { BrandSwitcher } from "@/components/brand-switcher"
import { CardVariantSwitcher } from "@/components/card-variant-switcher"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import {
  FILTER_VARIANTS,
  useFilterVariant,
  type FilterVariant,
} from "@/lib/filter-variant"
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
              renders the same for everyone. Press <Kbd>d</Kbd> anywhere to flip
              it without coming back here.
            </p>
          </div>

          <ThemeToggle />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
            <h2 className="text-sm font-medium">Candidate card</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Two layouts for the same facts on the response manager. Stacked
              runs the labels down the left and reads like a profile; Columns
              lays the buckets across the card and fits roughly twice as many
              candidates on a screen. A real recruiter would never see this
              control — it is here so the two can be compared before one wins.
            </p>
          </div>

          <CardVariantSwitcher />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
            <h2 className="text-sm font-medium">Database filters</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Two ways to narrow a database search. Juicebox puts the query in a
              pill with the filters in a dialog, ranked criteria and chips that
              widen the pool; Refine panel is the live hirist column, every
              filter on screen beside the results.
            </p>
          </div>

          <FilterVariantSwitcher />
        </div>

        <Separator />

        <p className="text-xs leading-relaxed text-muted-foreground">
          All four persist to <code className="font-mono">localStorage</code>{" "}
          and sync across tabs, so a shared preview link opens on whichever
          brand, theme, card layout and filters you last picked.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">Prototype pages</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Kept out of the sidebar so it only carries recruiter surfaces — this
            describes the prototype itself rather than the product.
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

/** Same shape as `CardVariantSwitcher`: two words, one toggle, no empty state. */
function FilterVariantSwitcher() {
  const { variant, setVariant } = useFilterVariant()

  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      aria-label="Database filters"
      value={[variant]}
      onValueChange={(value) => {
        const next = value[0] as FilterVariant | undefined
        if (next) setVariant(next)
      }}
    >
      {FILTER_VARIANTS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
