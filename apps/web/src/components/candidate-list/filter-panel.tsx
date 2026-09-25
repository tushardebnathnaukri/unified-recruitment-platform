import * as React from "react"
import { SearchIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { LocationPicker } from "@/components/location-picker"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import { Separator } from "@workspace/ui/components/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"
import {
  EXPERIENCE_BANDS,
  NOTICE_BANDS,
  sortOptions,
  type Filters,
} from "@/lib/applicants"
import { useListCopy } from "@/lib/list-source"

/**
 * One implementation of what a filter is.
 *
 * The drawer behind the pills opens onto it, and both the rail and the applied
 * bar take their props from it, so what can be narrowed — and in what words —
 * is decided once, here, rather than three times over.
 */

/**
 * Sort and the three filters, in a column beside the list.
 *
 * IT IS NOT A SECOND `SidebarProvider`. Two of them share one `sidebar_state`
 * cookie and both bind Cmd+B to `window`, so the filter panel would overwrite
 * the nav's remembered state and one keystroke would toggle both. This is the
 * same idea without those two collisions: a panel that holds its own column,
 * sticky under the header, scrolling with its own overflow when the list runs
 * long.
 *
 * SEARCH IS IN HERE TOO, not left inline above the list. Splitting them puts
 * "narrow this list" in two places, and a recruiter who has typed a query then
 * has to look somewhere else to add a notice-period filter to it.
 */
export function FilterPanel({
  filters,
  sort,
  locations,
  preferredLocations,
  matched,
  total,
  onChange,
  onSort,
  onClear,
  layout = "column",
}: {
  filters: Filters
  sort: string
  /** Drawn from the people actually here, so no option can return nothing. */
  locations: string[]
  /** Everywhere they would go, "Anywhere" excluded — see `CandidateListBody`. */
  preferredLocations: string[]
  matched: number
  total: number
  onChange: (updates: Partial<Filters>) => void
  onSort: (sort: string) => void
  onClear: () => void
  /**
   * `column` is the panel beside the list. `drawer` is the same controls with
   * the card chrome and the sticky column taken off, because inside a drawer
   * they would be a card in a card and a sticky element in something that does
   * not scroll. One implementation, the way `CandidateDetail` handles the same
   * problem — two copies would agree until somebody edited one.
   */
  layout?: "column" | "drawer"
}) {
  const { searchLabel } = useListCopy()
  const active =
    Boolean(filters.q) ||
    Boolean(filters.exp) ||
    Boolean(filters.notice) ||
    filters.location.length > 0 ||
    filters.preferred.length > 0

  return (
    <aside
      aria-label="Sort and filter"
      className={cn(
        "flex flex-col gap-4",
        layout === "column" &&
          "shrink-0 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 @4xl/main:sticky @4xl/main:top-4 @4xl/main:max-h-[calc(100svh-var(--header-height)---spacing(8))] @4xl/main:w-64 @4xl/main:overflow-y-auto"
      )}
    >
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(event) => onChange({ q: event.target.value })}
          placeholder="Search name, role or skill"
          aria-label={searchLabel}
          className="pl-9"
        />
      </div>

      <PanelRadios
        name="sort"
        label="Sort by"
        value={sort}
        options={sortOptions(sort)}
        onChange={onSort}
      />

      <Separator />

      <PanelField label="Experience">
        <FilterSelect
          label="Experience"
          value={filters.exp}
          options={EXPERIENCE_BANDS}
          onChange={(exp) => onChange({ exp })}
        />
      </PanelField>

      <PanelField label="Notice period">
        <FilterSelect
          label="Notice period"
          value={filters.notice}
          options={NOTICE_BANDS}
          onChange={(notice) => onChange({ notice })}
        />
      </PanelField>

      <PanelField label="Current location">
        <LocationPicker
          label="Current location"
          placeholder="Search locations"
          options={locations}
          chosen={filters.location}
          onChange={(location) => onChange({ location })}
        />
      </PanelField>

      <PanelField label="Preferred location">
        <LocationPicker
          label="Preferred location"
          placeholder="Search locations"
          options={preferredLocations}
          chosen={filters.preferred}
          onChange={(preferred) => onChange({ preferred })}
        />
      </PanelField>

      {/* Only when something is on. The counts on the tabs follow the filter,
          so without this line a recruiter would have no way of telling a bucket
          that is genuinely small from one that is merely narrowed. */}
      {active && (
        <>
          <Separator />
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {matched} of {total} match
            </span>
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0 text-xs"
              onClick={onClear}
            >
              Clear
            </Button>
          </div>
        </>
      )}
    </aside>
  )
}

/** A labelled row in the panel. The label is visible, not just an aria one. */
function PanelField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

/**
 * A named set of radios in the panel's column.
 *
 * Both of the panel's "pick one of a short list" controls go through this, so
 * Showing and Sort by cannot drift apart in spacing or label weight — which
 * they would, being two blocks of near-identical JSX written a week apart.
 *
 * RADIOS RATHER THAN A SELECT for these two, and selects for the three below
 * them. The difference is not arbitrary: these two have three or four options
 * that each fit on one line, and they are the controls that decide what the
 * list even is — worth the rows they cost to have visible at a glance. The
 * filters underneath have a location list that would run to a dozen rows, and
 * they are answers to "and also…", which is what a closed select is for.
 */
function PanelRadios({
  name,
  label,
  value,
  options,
  onChange,
}: {
  /** Scopes the generated ids, so two groups on one panel cannot collide. */
  name: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <PanelField label={label}>
      <RadioGroup
        aria-label={label}
        className="gap-2"
        value={value}
        onValueChange={(next) => onChange(String(next))}
      >
        {options.map((option) => {
          const id = `${name}-${option.value || "all"}`

          return (
            <div key={id} className="flex items-center gap-2">
              <RadioGroupItem id={id} value={option.value} />
              <Label htmlFor={id} className="text-sm font-normal">
                {option.label}
              </Label>
            </div>
          )
        })}
      </RadioGroup>
    </PanelField>
  )
}

/**
 *  has no built-in "any" — an empty string is not a selectable value in
 * Base UI — so every one of these carries an explicit reset item at the top.
 * Without it a filter is a one-way door: you can narrow, and then you are stuck.
 */
function FilterSelect({
  label,
  value,
  options,
  onChange,
  className = "w-full",
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  /** The panel wants a full-width column; the bar wants a pill. */
  className?: string
}) {
  const items = [
    { value: "any", label: `Any ${label.toLowerCase()}` },
    ...options,
  ]

  return (
    <Select
      items={items}
      value={value || "any"}
      onValueChange={(next) =>
        onChange(String(next) === "any" ? "" : String(next))
      }
    >
      <SelectTrigger className={className} aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
