import * as React from "react"
import {
  ChevronDownIcon,
  LockIcon,
  SearchIcon,
  SlidersHorizontalIcon,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

import { SORTS } from "@/lib/applicants"
import {
  LAST_SEEN,
  SECTIONS,
  TOGGLES,
  activeFilterCount,
  readRange,
  writeRange,
  type ChecksSection,
  type GatedSection,
  type Profile,
  type RangeSection,
  type Section,
  type SelectSection,
} from "@/lib/database-filters"

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
}

/**
 * "Refine your search": the live hirist panel's filters, top to bottom in its
 * order, in a sticky column beside the cards.
 *
 * COLLAPSED BY DEFAULT, AS IT IS LIVE. Twenty open sections is a panel longer
 * than the page, so each is a disclosure and only the ones already doing
 * something open themselves — a filter that is on should be visible without
 * hunting for it. Each heading carries its own count, so the closed ones still
 * say which are narrowing the list.
 *
 * THE OPTIONS DO NOT SHRINK AS YOU FILTER. They come from everybody the search
 * found, not the people left, so ticking Pune does not make Bengaluru vanish
 * from the list you were about to tick it in.
 *
 * APPLIED AS YOU PICK, where the live page has an Apply button on its ranges.
 * That button exists because every change is a trip to the server; here it is
 * a click that changes nothing you can see until you make it.
 *
 * `drawer` is the same panel without the card and the sticky column, for the
 * widths where there is no room for a column and it opens from the toolbar.
 */
export function RefinePanel({
  layout = "column",
  ...props
}: PanelProps & { layout?: "column" | "drawer" }) {
  const { profiles, params, onUpdate, onClear, matched } = props
  const count = activeFilterCount(params)

  return (
    <aside
      aria-label="Refine your search"
      className={cn(
        "flex flex-col",
        layout === "column" &&
          "hidden shrink-0 rounded-2xl bg-card ring-1 ring-foreground/10 @4xl/main:sticky @4xl/main:top-4 @4xl/main:flex @4xl/main:max-h-[calc(100svh-var(--header-height)---spacing(8))] @4xl/main:w-72 @4xl/main:overflow-y-auto"
      )}
    >
      {/* The drawer carries the same heading and count in its own header. */}
      {layout === "column" && (
        <div className="flex flex-col gap-0.5 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Refine your search</h2>
            {count > 0 && (
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 text-xs"
                onClick={onClear}
              >
                Clear all
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {matched} of {profiles.length} profiles
          </p>
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-2.5 py-3",
          layout === "column" && "border-t border-border px-4"
        )}
      >
        {TOGGLES.map((toggle) => (
          <Label
            key={toggle.key}
            className="items-start gap-2 text-sm font-normal"
          >
            <Checkbox
              className="mt-0.5"
              checked={params.get(toggle.key) === "1"}
              onCheckedChange={(checked) =>
                onUpdate(toggle.key, checked ? "1" : null)
              }
            />
            <span className="flex flex-col gap-0.5">
              {toggle.label}
              {"hint" in toggle && (
                <span className="text-xs text-muted-foreground">
                  {toggle.hint}
                </span>
              )}
            </span>
          </Label>
        ))}
      </div>

      {SECTIONS.map((section) => (
        <FilterSection
          key={section.key}
          section={section}
          inset={layout === "column"}
          {...props}
        />
      ))}
    </aside>
  )
}

/** How many values a section has set — the number on its heading. */
function countFor(section: Section, params: URLSearchParams) {
  if (section.kind === "checks") return params.getAll(section.key).length
  if (section.kind === "gated") return 0
  return params.has(section.key) ? 1 : 0
}

/**
 * One disclosure. A native `<details>`: the design system has no accordion,
 * and a disclosure that the browser already knows how to open, close and
 * announce is not worth a component until a second screen wants one.
 */
function FilterSection({
  section,
  inset,
  profiles,
  params,
  onUpdate,
}: PanelProps & { section: Section; inset: boolean }) {
  const count = countFor(section, params)
  const [open, setOpen] = React.useState(count > 0)

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group/section border-t border-border"
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-2 py-2.5 text-sm transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset [&::-webkit-details-marker]:hidden",
          inset && "px-4"
        )}
      >
        <span className="min-w-0 flex-1">{section.label}</span>
        {section.kind === "gated" && (
          <Badge variant="secondary" className="font-normal">
            <LockIcon data-icon="inline-start" />
            {section.badge}
          </Badge>
        )}
        {count > 0 && (
          <Badge className="tabular-nums">
            {count}
            <span className="sr-only"> selected</span>
          </Badge>
        )}
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open/section:rotate-180" />
      </summary>

      <div className={cn("pb-3", inset && "px-4")}>
        {section.kind === "range" && (
          <RangeFilter section={section} params={params} onUpdate={onUpdate} />
        )}
        {section.kind === "checks" && (
          <ChecksFilter
            section={section}
            profiles={profiles}
            chosen={params.getAll(section.key)}
            onChange={(values) => onUpdate(section.key, values)}
          />
        )}
        {section.kind === "select" && (
          <SelectFilter
            section={section}
            value={params.get(section.key) ?? ""}
            onChange={(value) => onUpdate(section.key, value || null)}
          />
        )}
        {section.kind === "gated" && <GatedFilter section={section} />}
      </div>
    </details>
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
}: {
  section: ChecksSection
  profiles: Profile[]
  chosen: string[]
  onChange: (values: string[]) => void
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
    <div className="flex flex-col gap-2">
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

      <div className="-m-1 flex max-h-56 flex-col gap-2 overflow-y-auto p-1">
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
            <span className="min-w-0 flex-1">{option}</span>
          </Label>
        ))}
        {shown.length === 0 && (
          <p className="text-xs text-muted-foreground">Nothing matches.</p>
        )}
      </div>

      {chosen.length > 0 && (
        <Button
          variant="link"
          size="sm"
          className="h-auto self-start px-0 text-xs"
          onClick={() => onChange([])}
        >
          Clear
        </Button>
      )}
    </div>
  )
}

function SelectFilter({
  section,
  value,
  onChange,
}: {
  section: SelectSection
  value: string
  onChange: (value: string) => void
}) {
  return (
    <ChoiceSelect
      label={section.label}
      anyLabel="Any"
      value={value}
      options={section.options}
      onChange={onChange}
      className="w-full"
    />
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
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const count = activeFilterCount(params)

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

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Refine your search</DrawerTitle>
          <DrawerDescription>
            {matched} of {profiles.length} profiles
          </DrawerDescription>
          {count > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto self-center px-0 text-xs"
              onClick={panel.onClear}
            >
              Clear all
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
  return (
    <ToolbarField label="Sort">
      <Select
        items={SORTS.map(({ value, label }) => ({ value, label }))}
        value={params.get("sort") ?? defaultSort}
        onValueChange={(next) =>
          onUpdate("sort", String(next) === defaultSort ? null : String(next))
        }
      >
        <SelectTrigger size="sm" className="w-40" aria-label="Sort by">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORTS.map((sort) => (
            <SelectItem key={sort.value} value={sort.value}>
              {sort.label}
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
