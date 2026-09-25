import * as React from "react"
import {
  ChevronRightIcon,
  ChevronDownIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { LocationPicker } from "@/components/location-picker"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import {
  EXPERIENCE_BANDS,
  matchesFilters,
  NOTICE_BANDS,
  sortOptions,
  type Filters,
  type Applicant,
} from "@/lib/applicants"
import { useListCopy } from "@/lib/list-source"
import { FilterPanel } from "@/components/candidate-list/filter-panel"

/**
 * The filters as a column beside the cards, and what is applied above them.
 */

/**
 * The cards view's filters as a rail beside the list — the Refine card on
 * Insights, holding the same sort, search and three filters as `FilterBar`.
 *
 * SAME SHAPE AS INSIGHTS: a "Refine" heading with a count of what is on and a
 * Clear all that only exists when there is something to clear, then one
 * collapsible section per filter. The difference is that these filters pick ONE
 * value (the URL holds a single `exp`, `notice`, `location`), so the options are
 * radios with "Any" at the top rather than checkboxes.
 *
 * THE NUMBER BESIDE AN OPTION is how many people on this posting it would leave,
 * with the other filters held as they are — Insights' share, in the unit this
 * screen counts in. An option that would leave nobody says 0 before you spend
 * the click finding out.
 */
export function FilterRail({
  filters,
  sort,
  locations,
  preferredLocations,
  people,
  top,
  onChange,
  onSort,
  onClear,
}: Omit<React.ComponentProps<typeof FilterPanel>, "layout"> & {
  people: Applicant[]
  /** Height of the sticky tab block the rail sticks beneath. */
  top: number
}) {
  const { searchLabel } = useListCopy()
  const [open, setOpen] = React.useState(
    () => new Set(["sort", "exp", "notice", "location", "preferred"])
  )

  const count =
    (filters.q ? 1 : 0) +
    (filters.exp ? 1 : 0) +
    (filters.notice ? 1 : 0) +
    filters.location.length +
    filters.preferred.length

  const leaves = (updates: Partial<Filters>) =>
    people.filter((person) =>
      matchesFilters(person, { ...filters, ...updates })
    ).length

  /**
   * A section is radios by default. `render` replaces them where the filter is
   * not one-of-a-list — the two location pickers — and `on` is how many values
   * it holds, for the badge on the heading, which radios answer with 1.
   */
  const sections: {
    key: string
    title: string
    value?: string
    options?: { value: string; label: string; count?: number }[]
    onSelect?: (value: string) => void
    render?: React.ReactNode
    on?: number
  }[] = [
    {
      key: "sort",
      title: "Sort by",
      value: sort,
      options: sortOptions(sort),
      onSelect: onSort,
    },
    {
      key: "exp",
      title: "Experience",
      value: filters.exp,
      options: [
        { value: "", label: "Any experience", count: leaves({ exp: "" }) },
        ...EXPERIENCE_BANDS.map(({ value, label }) => ({
          value,
          label,
          count: leaves({ exp: value }),
        })),
      ],
      onSelect: (exp) => onChange({ exp }),
    },
    {
      key: "notice",
      title: "Notice period",
      value: filters.notice,
      options: [
        {
          value: "",
          label: "Any notice period",
          count: leaves({ notice: "" }),
        },
        ...NOTICE_BANDS.map(({ value, label }) => ({
          value,
          label,
          count: leaves({ notice: value }),
        })),
      ],
      onSelect: (notice) => onChange({ notice }),
    },
    {
      key: "location",
      title: "Current location",
      on: filters.location.length,
      render: (
        <LocationPicker
          label="Current location"
          placeholder="Search locations"
          options={locations}
          chosen={filters.location}
          onChange={(location) => onChange({ location })}
          // What the list would hold with this city added, not instead of the
          // ones already picked — a second city widens the list.
          countFor={(city) => leaves({ location: [...filters.location, city] })}
        />
      ),
    },
    // WHERE THEY WOULD GO, not where they are. On a posting in one city this
    // is the question that finds the people worth a conversation who are not
    // there yet, and the count beside each city says how many that is before
    // you spend the click.
    {
      key: "preferred",
      title: "Preferred location",
      on: filters.preferred.length,
      render: (
        <LocationPicker
          label="Preferred location"
          placeholder="Search locations"
          options={preferredLocations}
          chosen={filters.preferred}
          onChange={(preferred) => onChange({ preferred })}
          countFor={(city) =>
            leaves({ preferred: [...filters.preferred, city] })
          }
        />
      ),
    },
  ]

  // A FIXED COLUMN, NOT A FLOATING CARD. It is flush against the nav edge and
  // the tab block (the negative margin cancels the page gutter), exactly as
  // tall as the screen below that block, and sticky there — so the heading and
  // search never move and only the sections scroll, inside it.
  return (
    <aside
      aria-label="Sort and filter"
      style={{ top, height: `calc(100svh - ${top}px)` }}
      className="hidden shrink-0 flex-col border-r bg-background @4xl/main:sticky @4xl/main:-ml-4 @4xl/main:flex @4xl/main:w-64 lg:@4xl/main:-ml-6"
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
        <span className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
          Filters
          {count > 0 && (
            <Badge variant="secondary" className="px-1.5">
              {count}
            </Badge>
          )}
        </span>

        {count > 0 && (
          <Button variant="link" size="sm" className="px-0" onClick={onClear}>
            Reset all
          </Button>
        )}
      </div>

      <div className="relative shrink-0 px-4 pt-3 pb-3">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(event) => onChange({ q: event.target.value })}
          placeholder="Search name, role or skill"
          aria-label={searchLabel}
          className="pl-9"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {sections.map((section) => {
          const isOpen = open.has(section.key)
          const Chevron = isOpen ? ChevronDownIcon : ChevronRightIcon
          const on =
            section.on ?? (section.key !== "sort" && section.value ? 1 : 0)

          return (
            <div key={section.key} className="border-t border-border py-3">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpen((current) => {
                    const next = new Set(current)
                    if (next.has(section.key)) next.delete(section.key)
                    else next.add(section.key)
                    return next
                  })
                }
                className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium"
              >
                <span className="flex items-center gap-2">
                  {section.title}
                  {on > 0 && (
                    <Badge variant="secondary" className="px-1.5">
                      {on}
                    </Badge>
                  )}
                </span>
                <Chevron
                  className="size-4 shrink-0 opacity-50"
                  aria-hidden="true"
                />
              </button>

              {isOpen && section.render && (
                <div className="mt-2.5">{section.render}</div>
              )}

              {isOpen && section.options && (
                <RadioGroup
                  aria-label={section.title}
                  className="mt-2.5 gap-2.5"
                  value={section.value}
                  onValueChange={(next) => section.onSelect?.(String(next))}
                >
                  {section.options.map((option) => {
                    const id = `rail-${section.key}-${option.value || "any"}`

                    return (
                      <Label
                        key={id}
                        htmlFor={id}
                        className="items-center gap-2 font-normal"
                      >
                        <RadioGroupItem id={id} value={option.value} />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {option.label}
                        </span>
                        {option.count !== undefined && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {option.count}
                          </span>
                        )}
                      </Label>
                    )
                  })}
                </RadioGroup>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

/**
 * What the rail is narrowing by, as chips above the cards — the Insights
 * applied bar. Each chip removes its one filter, so undoing a filter does not
 * mean scrolling the rail back to the section it lives in.
 *
 * ONLY BESIDE THE RAIL. Below @4xl the pills are showing instead, and a pill
 * already says its value and resets from its own menu; two rows saying the
 * same thing would be one too many. Sort is not a chip: it orders the list but
 * leaves everybody in it.
 */
export function AppliedFilters({
  filters,
  matched,
  total,
  onChange,
  onClear,
}: Omit<React.ComponentProps<typeof FilterPanel>, "layout">) {
  const chips = [
    filters.q && {
      key: "q",
      label: `“${filters.q}”`,
      remove: () => onChange({ q: "" }),
    },
    filters.exp && {
      key: "exp",
      label:
        EXPERIENCE_BANDS.find((band) => band.value === filters.exp)?.label ??
        filters.exp,
      remove: () => onChange({ exp: "" }),
    },
    filters.notice && {
      key: "notice",
      label:
        NOTICE_BANDS.find((band) => band.value === filters.notice)?.label ??
        filters.notice,
      remove: () => onChange({ notice: "" }),
    },
    // ONE CHIP PER CITY, not one per filter: the filters hold lists now, and a
    // single "3 locations" chip would make dropping one of them a trip back to
    // the rail.
    ...filters.location.map((city) => ({
      key: `location:${city}`,
      label: city,
      remove: () =>
        onChange({ location: filters.location.filter((c) => c !== city) }),
    })),
    ...filters.preferred.map((city) => ({
      key: `preferred:${city}`,
      // Said with its sense, because "Pune" alone would read as the current
      // city chip that may be sitting right beside it.
      label: `Open to ${city}`,
      remove: () =>
        onChange({ preferred: filters.preferred.filter((c) => c !== city) }),
    })),
  ].filter(Boolean) as { key: string; label: string; remove: () => void }[]

  if (chips.length === 0) return null

  return (
    <div className="mb-4 hidden flex-wrap items-center gap-2 @4xl/main:flex">
      <span className="text-sm">
        <span className="font-medium tabular-nums">{matched}</span>{" "}
        <span className="text-muted-foreground">of {total} match</span>
      </span>

      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          className="inline-flex items-center gap-1 rounded-4xl border border-border bg-muted/40 py-1 pr-1.5 pl-2.5 text-xs transition-colors hover:bg-muted"
        >
          {chip.label}
          <XIcon className="size-3 text-muted-foreground" />
          <span className="sr-only">Remove {chip.label}</span>
        </button>
      ))}

      <Button
        variant="link"
        size="sm"
        className="h-auto px-0 text-xs"
        onClick={onClear}
      >
        Clear all
      </Button>
    </div>
  )
}
