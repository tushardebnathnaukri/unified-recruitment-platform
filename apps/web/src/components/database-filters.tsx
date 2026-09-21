import * as React from "react"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  LockIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Label } from "@workspace/ui/components/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

import { LocationPicker } from "@/components/location-picker"
import { sortOptions } from "@/lib/applicants"
import {
  LAST_SEEN,
  SECTIONS,
  TOGGLES,
  appliedFilters,
  readRange,
  writeRange,
  type ChecksSection,
  type GatedSection,
  type Profile,
  type RangeSection,
  type Section,
  type SelectSection,
} from "@/lib/database-filters"
import { useListCopy } from "@/lib/list-source"

/** Write one key: a list is written as repeated params, `null` deletes it. */
export type FilterUpdate = (
  key: string,
  value: string | string[] | null
) => void

type PanelProps = {
  /** Everybody the search found, before any filter — options come from here. */
  profiles: Profile[]
  params: URLSearchParams
  onUpdate: FilterUpdate
  onClear: () => void
  matched: number
  /** How many people a whole query string would leave. */
  count: (params: URLSearchParams) => number
}

/**
 * How many people `key` set to `value` would leave, everything else held as it
 * is — the number beside an option. Where there is no room for it (a table
 * header) the controls are handed none and draw none.
 */
type Leaves = (key: string, value: string | string[] | null) => number

function leavesFor(
  params: URLSearchParams,
  count: (params: URLSearchParams) => number
): Leaves {
  return (key, value) => {
    const next = new URLSearchParams(params)
    next.delete(key)
    if (Array.isArray(value)) value.forEach((item) => next.append(key, item))
    else if (value !== null) next.set(key, value)
    return count(next)
  }
}

/** Open on arrival: the three a recruiter reaches for first. */
const OPEN_BY_DEFAULT = ["xp", "cur", "pref"]

/**
 * "Refine your search": the live hirist panel's filters, top to bottom in its
 * order, in the column the response manager's cards view has.
 *
 * THE RESPONSE MANAGER'S RAIL, NOT A LOOKALIKE. The same fixed white column
 * flush against the nav, the same headings (sentence case, a `secondary`
 * count, a chevron that turns), the same controls for the same kinds of
 * question — radios with "Any" for one-of-a-list, `LocationPicker` for
 * cities — and the same count rule, one per value. So narrowing a list is a
 * thing a recruiter learns once. What differs is what is in it: a posting
 * asks four questions of its applicants, a search asks twenty of the database.
 *
 * THE NUMBER BESIDE AN OPTION is how many people the list would hold with it
 * picked, the other filters held as they are — which is what makes applying
 * as you pick safe. The live page has an Apply button because every change is
 * a trip to the server; here the count is the preview a draft would be for,
 * so an option that would leave nobody says 0 before the click is spent. On a
 * pick-many list it is the list WITH that value added, since a second value
 * widens rather than narrows.
 *
 * THE OPTIONS DO NOT SHRINK AS YOU FILTER. They come from everybody the search
 * found, not the people left, so ticking Pune does not make Bengaluru vanish
 * from the list you were about to tick it in — its count goes to what it is.
 *
 * NOT EVERY SECTION OPENS. The rail opens all five of its own; twenty open
 * sections is a panel several screens long, so the first three open and any
 * section already doing something opens itself. What each closed one is
 * doing is on the applied bar above the cards (`AppliedRefinements`).
 *
 * `drawer` is the same panel without the column and its chrome, for the widths
 * where there is no room beside the cards and it opens from the toolbar.
 */
export function RefinePanel({
  layout = "column",
  ...props
}: PanelProps & { layout?: "column" | "drawer" }) {
  const { params, onUpdate, onClear, count: countOf } = props
  const column = layout === "column"
  const count = appliedFilters(params).length
  const leaves = leavesFor(params, countOf)

  const [open, setOpen] = React.useState(
    () =>
      new Set([
        ...OPEN_BY_DEFAULT,
        ...SECTIONS.filter((section) => countFor(section, params) > 0).map(
          (section) => section.key
        ),
      ])
  )
  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  // A FIXED COLUMN, NOT A FLOATING CARD — `FilterRail`'s own classes. Flush
  // against the nav (the negative left margin cancels the page gutter) and
  // against the top bar (the negative top margin cancels the shell's padding,
  // which it can only do because this screen's header is in the bar), exactly
  // as tall as the screen, and sticky there.
  return (
    <aside
      aria-label="Refine your search"
      className={cn(
        "flex flex-col",
        column &&
          "hidden shrink-0 border-r bg-background @4xl/main:sticky @4xl/main:top-0 @4xl/main:-mt-4 @4xl/main:-ml-4 @4xl/main:flex @4xl/main:h-svh @4xl/main:w-64 md:@4xl/main:-mt-6 lg:@4xl/main:-ml-6"
      )}
    >
      {/* The drawer carries the same heading and count in its own header. */}
      {column && (
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
      )}

      {/* Only the sections scroll, the way the rail's do. The gutter is here
        rather than on each row, so a section's rule runs the column's width
        inside it; in the drawer the sheet already supplies one. */}
      <div
        className={cn(
          "flex flex-col",
          column && "min-h-0 flex-1 overflow-y-auto px-4 pb-4"
        )}
      >
        <div className="flex flex-col gap-2.5 py-3">
          {TOGGLES.map((toggle) => {
            const on = params.get(toggle.key) === "1"
            return (
              <Label
                key={toggle.key}
                className="items-start gap-2 text-sm font-normal"
              >
                <Checkbox
                  className="mt-0.5"
                  checked={on}
                  onCheckedChange={(checked) =>
                    onUpdate(toggle.key, checked ? "1" : null)
                  }
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {toggle.label}
                  {"hint" in toggle && (
                    <span className="text-xs text-muted-foreground">
                      {toggle.hint}
                    </span>
                  )}
                </span>
                <OptionCount value={leaves(toggle.key, "1")} />
              </Label>
            )
          })}
        </div>

        {SECTIONS.map((section) => (
          <FilterSection
            key={section.key}
            section={section}
            open={open.has(section.key)}
            onToggle={() => toggle(section.key)}
            leaves={leaves}
            {...props}
          />
        ))}
      </div>
    </aside>
  )
}

/** How many values a section has set — the number on its heading. */
function countFor(section: Section, params: URLSearchParams) {
  if (section.kind === "checks") return params.getAll(section.key).length
  if (section.kind === "gated") return 0
  return params.has(section.key) ? 1 : 0
}

/** The count beside an option, drawn as the rail draws it. */
function OptionCount({ value }: { value?: number }) {
  if (value === undefined) return null
  return (
    <span className="text-xs text-muted-foreground tabular-nums">{value}</span>
  )
}

/**
 * One section, in the rail's heading: a rule above, the label in medium, a
 * `secondary` count and a faded chevron that points right when closed and
 * down when open. Its controls are only rendered while it is open, so the
 * counts are only worked out for sections somebody is looking at.
 */
function FilterSection({
  section,
  open,
  onToggle,
  leaves,
  profiles,
  params,
  onUpdate,
}: PanelProps & {
  section: Section
  open: boolean
  onToggle: () => void
  leaves: Leaves
}) {
  const count = countFor(section, params)
  const Chevron = open ? ChevronDownIcon : ChevronRightIcon
  const id = `refine-${section.key}`

  return (
    <div className="border-t border-border py-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium"
      >
        <span className="flex min-w-0 items-center gap-2">
          {section.label}
          {count > 0 && (
            <Badge variant="secondary" className="px-1.5 tabular-nums">
              {count}
              <span className="sr-only"> selected</span>
            </Badge>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {section.kind === "gated" && (
            <Badge variant="secondary" className="font-normal">
              <LockIcon data-icon="inline-start" />
              {section.badge}
            </Badge>
          )}
          <Chevron className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div id={id} className="mt-2.5">
          {section.kind === "gated" ? (
            <GatedFilter section={section} />
          ) : (
            <SectionBody
              section={section}
              profiles={profiles}
              params={params}
              onUpdate={onUpdate}
              leaves={leaves}
            />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * A section's controls, by its kind. Shared by the panel and the results
 * table's column headers, which pass no `leaves` and so draw no counts.
 */
function SectionBody({
  section,
  profiles,
  params,
  onUpdate,
  leaves,
}: {
  section: Exclude<Section, GatedSection>
  profiles: Profile[]
  params: URLSearchParams
  onUpdate: FilterUpdate
  leaves?: Leaves
}) {
  if (section.kind === "range")
    return <RangeFilter section={section} params={params} onUpdate={onUpdate} />
  if (section.kind === "select")
    return (
      <OneOfFilter
        section={section}
        value={params.get(section.key) ?? ""}
        onChange={(value) => onUpdate(section.key, value || null)}
        countFor={leaves && ((value) => leaves(section.key, value || null))}
      />
    )

  const chosen = params.getAll(section.key)
  const onChange = (values: string[]) => onUpdate(section.key, values)
  // With the value added, not instead of the ones already picked.
  const countFor =
    leaves &&
    ((value: string) =>
      leaves(section.key, chosen.includes(value) ? chosen : [...chosen, value]))

  if (section.picker)
    return (
      <LocationPicker
        label={section.label}
        placeholder={section.search ?? "Search locations"}
        options={section.options(profiles)}
        chosen={chosen}
        onChange={onChange}
        countFor={countFor}
      />
    )

  return (
    <ChecksFilter
      section={section}
      profiles={profiles}
      chosen={chosen}
      onChange={onChange}
      countFor={countFor}
    />
  )
}

/**
 * Min and max, as two selects. Each only offers values that leave the pair
 * possible — a max of 3 years does not offer a min of 10 — so the range can
 * never be one that matches nobody by construction.
 */
function RangeFilter({
  section,
  params,
  onUpdate,
}: {
  section: RangeSection
  params: URLSearchParams
  onUpdate: FilterUpdate
}) {
  const { min, max } = readRange(params, section.key)
  const options = (keep: (value: number) => boolean) =>
    section.values.filter(keep).map((value) => ({
      value: String(value),
      label: section.format(value),
    }))

  return (
    <div className="grid grid-cols-2 gap-2">
      <ChoiceSelect
        label={`Minimum ${section.label.toLowerCase()}`}
        anyLabel="Min"
        value={min === null ? "" : String(min)}
        options={options((value) => max === null || value <= max)}
        onChange={(value) =>
          onUpdate(section.key, writeRange(value ? Number(value) : null, max))
        }
      />
      <ChoiceSelect
        label={`Maximum ${section.label.toLowerCase()}`}
        anyLabel="Max"
        value={max === null ? "" : String(max)}
        options={options((value) => min === null || value >= min)}
        onChange={(value) =>
          onUpdate(section.key, writeRange(min, value ? Number(value) : null))
        }
      />
    </div>
  )
}

/**
 * A list of checkboxes, with a search box above it when the list is long
 * enough to need one — organizations and institutes run to dozens.
 *
 * `p-1` on the scroller is load-bearing: a checkbox's focus ring is drawn
 * outside it, and `overflow-y-auto` clips both axes, so without room the ring
 * loses its left edge.
 */
function ChecksFilter({
  section,
  profiles,
  chosen,
  onChange,
  countFor,
}: {
  section: ChecksSection
  profiles: Profile[]
  chosen: string[]
  onChange: (values: string[]) => void
  countFor?: (value: string) => number
}) {
  const [query, setQuery] = React.useState("")
  const options = React.useMemo(
    () => section.options(profiles),
    [section, profiles]
  )
  const needle = query.trim().toLowerCase()
  const shown = needle
    ? options.filter((option) => option.toLowerCase().includes(needle))
    : options

  return (
    <div className="flex flex-col gap-2.5">
      {section.hint && (
        <p className="text-xs text-muted-foreground">{section.hint}</p>
      )}

      {section.search && (
        <InputGroup className="h-8">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={section.search}
            aria-label={section.search}
          />
        </InputGroup>
      )}

      <div className="-m-1 flex max-h-56 flex-col gap-2.5 overflow-y-auto p-1">
        {shown.map((option) => (
          <Label
            key={option}
            className="items-center gap-2 text-sm font-normal"
          >
            <Checkbox
              checked={chosen.includes(option)}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...chosen, option]
                    : chosen.filter((value) => value !== option)
                )
              }
            />
            <span className="min-w-0 flex-1 truncate">{option}</span>
            <OptionCount value={countFor?.(option)} />
          </Label>
        ))}
        {shown.length === 0 && (
          <p className="text-xs text-muted-foreground">Nothing matches.</p>
        )}
      </div>
    </div>
  )
}

/**
 * One section's controls by its key, outside the panel — the results table's
 * column headers use these, so a header filter on Search Resume is the refine
 * panel's own filter rather than a second one. No counts: a header has no
 * room to say them, and the rule is to leave a count out rather than show it
 * wrong.
 */
export function SectionControl({
  sectionKey,
  profiles,
  params,
  onUpdate,
}: {
  sectionKey: string
  profiles: Profile[]
  params: URLSearchParams
  onUpdate: FilterUpdate
}) {
  const section = SECTIONS.find((candidate) => candidate.key === sectionKey)
  if (!section || section.kind === "gated") return null
  return (
    <SectionBody
      section={section}
      profiles={profiles}
      params={params}
      onUpdate={onUpdate}
    />
  )
}

/**
 * One of a list, as the rail asks it: radios, with "Any …" at the top so the
 * filter can be taken off from where it was put on.
 */
function OneOfFilter({
  section,
  value,
  onChange,
  countFor,
}: {
  section: SelectSection
  value: string
  onChange: (value: string) => void
  countFor?: (value: string) => number
}) {
  const options = [{ value: "", label: section.any }, ...section.options]

  return (
    <RadioGroup
      aria-label={section.label}
      className="gap-2.5"
      value={value}
      onValueChange={(next) => onChange(String(next))}
    >
      {options.map((option) => {
        const id = `refine-${section.key}-${option.value || "any"}`
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
            <OptionCount value={countFor?.(option.value)} />
          </Label>
        )
      })}
    </RadioGroup>
  )
}

/**
 * What the recruiter would get, drawn and unusable, with the reason. The live
 * page shows the options and then a request-access form; a form that goes
 * nowhere is worse in a prototype than a sentence saying who to ask.
 */
function GatedFilter({ section }: { section: GatedSection }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{section.note}</p>
      {section.groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {group.title}
          </span>
          {group.options.map((option) => (
            <Label
              key={option}
              className="items-center gap-2 text-sm font-normal text-muted-foreground"
            >
              <Checkbox disabled />
              {option}
            </Label>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * A select with an explicit "Any" at the top. Base UI has no empty value, so
 * without it a filter is a one-way door — the same reason `FilterSelect` on the
 * response manager carries one.
 */
export function ChoiceSelect({
  label,
  anyLabel,
  value,
  options,
  onChange,
  className = "w-full",
}: {
  label: string
  anyLabel: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  className?: string
}) {
  const items = [{ value: "any", label: anyLabel }, ...options]

  return (
    <Select
      items={items}
      value={value || "any"}
      onValueChange={(next) =>
        onChange(String(next) === "any" ? "" : String(next))
      }
    >
      <SelectTrigger size="sm" className={className} aria-label={label}>
        <SelectValue />
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

/**
 * The row above the cards, as the live page has it: search within the results
 * on the left, "last seen" on the right — plus the sort, which the live page
 * does not offer and this list has always had.
 *
 * Below the width that fits the column, a Filters button opens the same panel
 * in a drawer; the count on it says how many are on while the panel is out of
 * sight.
 */
export function ResultsToolbar({
  defaultSort,
  ...panel
}: PanelProps & { defaultSort: string }) {
  const { params, onUpdate, matched, profiles } = panel
  const { filterTitle } = useListCopy()
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const count = appliedFilters(params).length

  return (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="@4xl/main:hidden"
          onClick={() => setDrawerOpen(true)}
        >
          <SlidersHorizontalIcon data-icon="inline-start" />
          Filters
          {count > 0 && <Badge className="tabular-nums">{count}</Badge>}
        </Button>

        <InputGroup className="h-8 max-w-sm min-w-48 flex-1">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={params.get("find") ?? ""}
            onChange={(event) => onUpdate("find", event.target.value || null)}
            placeholder="Search within results"
            aria-label="Search within results"
          />
        </InputGroup>

        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
          <ToolbarField label="Last seen">
            <ChoiceSelect
              label="Filter by last seen"
              anyLabel="All"
              value={params.get("seen") ?? ""}
              options={LAST_SEEN.filter((option) => option.value)}
              onChange={(value) => onUpdate("seen", value || null)}
              className="w-36"
            />
          </ToolbarField>
          <SortSelect
            params={params}
            onUpdate={onUpdate}
            defaultSort={defaultSort}
          />
        </div>
      </div>

      {/* The response manager's drawer heading, word for word. */}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{filterTitle}</DrawerTitle>
          <DrawerDescription>
            {matched} of {profiles.length} match
          </DrawerDescription>
          {count > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto self-center px-0 text-xs"
              onClick={panel.onClear}
            >
              Reset all
            </Button>
          )}
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4">
          <RefinePanel {...panel} layout="drawer" />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/**
 * What the panel is narrowing by, as chips above the cards — the response
 * manager's applied bar, the same shape and words. Each chip removes its one
 * value, so undoing a filter does not mean finding its section in a column of
 * twenty, most of them closed.
 *
 * ONLY BESIDE THE COLUMN. Below @4xl the panel is in a drawer and the Filters
 * button carries the count, as the response manager's pills do. Sort is not a
 * chip: it orders the list but leaves everybody in it.
 */
export function AppliedRefinements({
  params,
  matched,
  total,
  onUpdate,
  onClear,
}: {
  params: URLSearchParams
  matched: number
  total: number
  onUpdate: FilterUpdate
  onClear: () => void
}) {
  const chips = appliedFilters(params)
  if (chips.length === 0) return null

  return (
    <div className="hidden flex-wrap items-center gap-2 @4xl/main:flex">
      <span className="text-sm">
        <span className="font-medium tabular-nums">{matched}</span>{" "}
        <span className="text-muted-foreground">of {total} match</span>
      </span>

      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onUpdate(chip.key, chip.without)}
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

/** The list's sort, as a labelled select. Shared by both filter designs. */
export function SortSelect({
  params,
  onUpdate,
  defaultSort,
}: {
  params: URLSearchParams
  onUpdate: FilterUpdate
  defaultSort: string
}) {
  // A table header can sort by a column no named order covers; the select
  // shows that too rather than falling blank.
  const sort = params.get("sort") ?? defaultSort
  const options = sortOptions(sort)

  return (
    <ToolbarField label="Sort">
      <Select
        items={options}
        value={sort}
        onValueChange={(next) =>
          onUpdate("sort", String(next) === defaultSort ? null : String(next))
        }
      >
        <SelectTrigger size="sm" className="w-40" aria-label="Sort by">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </ToolbarField>
  )
}

function ToolbarField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground" aria-hidden>
        {label}
      </span>
      {children}
    </div>
  )
}
