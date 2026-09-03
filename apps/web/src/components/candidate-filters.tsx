import * as React from "react"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  LockIcon,
  SlidersHorizontalIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import type { Facet, Filters } from "@/lib/candidates"

/**
 * The filter rail.
 *
 * Sections are a button plus conditional content rather than `<details>`, which
 * is the idiom the jobs table uses for its rejection reason. `<details>` is
 * right there because the panel is inert prose that opens and shuts on its own;
 * here the open set has to survive a stage change and be reset by the caller,
 * and a controlled `open` attribute on `<details>` fights the browser's own
 * toggling. `aria-expanded` on a button says the same thing to a screen reader.
 *
 * THE RAIL RESETS PER STAGE. The caller keys this component on the stage, so
 * moving from Applied to Interviewing rebuilds the open set from the new
 * facets' own defaults rather than leaving sections open that no longer exist.
 */
export function CandidateFilters({
  facets,
  filters,
  counts,
  onToggle,
  onExperienceChange,
  onReset,
  activeCount,
  hideHeader = false,
}: {
  facets: Facet[]
  filters: Filters
  counts: Record<string, Record<string, number>>
  onToggle: (facetId: string, value: string) => void
  onExperienceChange: (which: "minYears" | "maxYears", value: string) => void
  onReset: () => void
  activeCount: number
  /** Set when the surface around the rail already titles it — the sheet does. */
  hideHeader?: boolean
}) {
  const [open, setOpen] = React.useState(
    () => new Set(facets.filter((facet) => facet.defaultOpen).map((f) => f.id))
  )

  const toggleSection = (id: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Partitioned on the facet's OWN default rather than on what is open right
  // now, so opening a section never makes it jump up the rail.
  const leading = facets.filter((facet) => facet.defaultOpen)
  const trailing = facets.filter((facet) => !facet.defaultOpen)

  const section = (facet: Facet) => (
    <FacetSection
      key={facet.id}
      facet={facet}
      open={open.has(facet.id)}
      onToggleSection={() => toggleSection(facet.id)}
      chosen={filters.facets[facet.id] ?? []}
      counts={counts[facet.id] ?? {}}
      onToggle={onToggle}
    />
  )

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "flex h-8 items-center justify-between gap-2",
          hideHeader && "hidden"
        )}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="px-1.5">
              {activeCount}
            </Badge>
          )}
        </span>

        {/* Hidden rather than disabled with nothing on: a permanently greyed
            "Reset all" is a control that never does anything. */}
        {activeCount > 0 && (
          <Button variant="link" size="xs" className="px-0" onClick={onReset}>
            Reset all
          </Button>
        )}
      </div>

      {/* When the header is hidden the first section's top border has nothing
          to separate it from, so it goes too. */}
      <div className={cn(hideHeader && "[&>div:first-child]:border-t-0")}>
        {leading.map(section)}
      </div>

      {/* Experience sits after the sections that open by default and before the
          ones that do not — the position it had in the wireframe, and the one
          that keeps the three expanded facets together at the top. */}
      <div className="border-t border-border py-3.5">
        <p className="text-sm font-medium">Experience</p>
        <div className="mt-2.5 flex items-center gap-2">
          <ExperienceInput
            label="Minimum years of experience"
            value={filters.minYears}
            onValueChange={(value) => onExperienceChange("minYears", value)}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <ExperienceInput
            label="Maximum years of experience"
            value={filters.maxYears}
            onValueChange={(value) => onExperienceChange("maxYears", value)}
          />
        </div>
      </div>

      {trailing.map(section)}
    </div>
  )
}

/**
 * Both ends of the experience range. `inputMode="numeric"` rather than
 * `type="number"` — the spinner arrows are useless at this width and Firefox
 * lets a number field hold text anyway, so the guard is the filter treating a
 * non-number as "no bound", not the input type.
 */
function ExperienceInput({
  label,
  value,
  onValueChange,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <span className="relative flex-1">
      <Input
        aria-label={label}
        inputMode="numeric"
        placeholder="Any"
        className="h-8 pr-9 text-sm"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
        yrs
      </span>
    </span>
  )
}

function FacetSection({
  facet,
  open,
  onToggleSection,
  chosen,
  counts,
  onToggle,
}: {
  facet: Facet
  open: boolean
  onToggleSection: () => void
  chosen: string[]
  counts: Record<string, number>
  onToggle: (facetId: string, value: string) => void
}) {
  // A locked facet has nothing to open. It stays on the rail so a recruiter can
  // see the filter exists — hiding it makes the paywall invisible rather than
  // absent — but it renders as a statement, not a control.
  if (facet.lockedBadge) {
    return (
      <div className="flex items-center justify-between gap-2 border-t border-border py-3.5">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {facet.label}
          <Badge variant="secondary">{facet.lockedBadge}</Badge>
        </span>
        <LockIcon className="size-3.5 text-muted-foreground" />
      </div>
    )
  }

  const Chevron = open ? ChevronDownIcon : ChevronRightIcon

  return (
    <div className="border-t border-border py-3.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggleSection}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          {facet.label}
          {chosen.length > 0 && (
            <Badge variant="secondary" className="px-1.5">
              {chosen.length}
            </Badge>
          )}
        </span>
        <Chevron className="size-4 shrink-0 opacity-50" aria-hidden="true" />
      </button>

      {open && (
        <div className="mt-2.5 flex flex-col gap-2.5">
          {facet.options.map((option) => {
            const count = counts[option.value] ?? 0
            const checked = chosen.includes(option.value)

            return (
              <label
                key={option.value}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  // Zero rows behind an unticked option, so it is dimmed rather
                  // than removed: options that come and go as you filter make
                  // the rail impossible to aim at.
                  count === 0 && !checked && "text-muted-foreground"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(facet.id, option.value)}
                />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {count}
                </span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
