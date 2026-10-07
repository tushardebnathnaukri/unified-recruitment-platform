import * as React from "react"
import { SearchIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { LocationPicker } from "@/components/location-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import { cn } from "@workspace/ui/lib/utils"
import {
  EXPERIENCE_BANDS,
  matchesFilters,
  NOTICE_BANDS,
  sortOptions,
  type Applicant,
  type Filters,
} from "@/lib/applicants"
import { useListCopy } from "@/lib/list-source"
import { EMPTY_FILTERS, sameFilters } from "@/components/candidate-list/shared"
import { FilterPanel } from "@/components/candidate-list/filter-panel"

/**
 * The filters as a row of pills, for every view that cannot spare a column.
 */

/**
 * How every view narrows its list: a search icon, a pill per control, and one
 * drawer behind all of them.
 *
 * IT SETTLED A SMELL THIS FILE USED TO ADMIT TO. The controls were a column
 * beside the cards and a row above the split view, because split spends its
 * width on a list and a profile and could not afford a third column. That left
 * the same controls in two places depending on the view, so changing view
 * meant finding them again. A row of pills costs no column at all, which
 * removes the reason the two layouts existed — and `FilterPanel` is not gone,
 * it is what the drawer opens onto, so there is still exactly one
 * implementation of what a filter is.
 *
 * WHAT A PILL SHOWS IS ITS VALUE, NOT ITS NAME. "Any experience" rather than
 * "Experience", so the row reads as a sentence about the list underneath it
 * instead of five labels that say nothing until each is opened.
 */
export function FilterBar({
  people,
  ...props
}: Omit<React.ComponentProps<typeof FilterPanel>, "layout"> & {
  /** Everybody on the list, for the drawer's "Show N results". */
  people: Applicant[]
}) {
  // The bar takes exactly what the panel takes, because it hands the whole lot
  // straight to it in the drawer — `layout` is the one thing it decides.
  const {
    filters,
    sort,
    locations,
    preferredLocations,
    matched,
    total,
    onChange,
    onSort,
    onClear,
  } = props
  const isMobile = useIsMobile()
  const { searchLabel, filterTitle } = useListCopy()
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  /**
   * A PICK APPLIES AS IT IS MADE, the way the rail beside the cards does. It
   * was a draft applied on an Apply button (with Clear beside it) until 6 Oct
   * 2026, so that "12+ years, in Pune" landed as one change rather than two.
   * It was dropped because most pills close on a single pick, so batching
   * saved almost nothing; because the rail already applied as you picked, so
   * the same filters behaved differently by view; and because the two buttons
   * sat disabled most of the time — a greyed button in the brand colour, with
   * nothing to press.
   *
   * TWO PLACES STILL HOLD A DRAFT. The location pickers are the only pick-many
   * pills, so each popover applies when it closes (`picking`) — three cities
   * land as one change. And the drawer on a phone covers the list, so it is
   * edited as a draft (`draft`) and applied by "Show N results", the way a
   * sheet of filters usually is. Sort is never in either: it orders the list
   * and removes nobody.
   */
  const [draft, setDraft] = React.useState<Filters>(filters)
  const [picking, setPicking] = React.useState<{
    key: "location" | "preferred"
    chosen: string[]
  } | null>(null)

  const openDrawer = () => {
    setDraft(filters)
    setDrawerOpen(true)
  }
  const editDraft = (updates: Partial<Filters>) =>
    setDraft((current) => ({ ...current, ...updates }))
  const showResults = () => {
    if (!sameFilters(draft, filters)) onChange(draft)
    setDrawerOpen(false)
  }
  const draftMatches = React.useMemo(
    () => people.filter((person) => matchesFilters(person, draft)).length,
    [people, draft]
  )

  /** Whether anything applied is narrowing the list — what Clear is for. */
  const active =
    Boolean(filters.q) ||
    Boolean(filters.exp) ||
    Boolean(filters.notice) ||
    filters.location.length > 0 ||
    filters.preferred.length > 0

  /**
   * Each pill carries its own options, so the same array drives the label it
   * shows and the list it opens — a pill cannot say "Any location" while its
   * menu thinks otherwise.
   *
   * The reset is an OPTION, not a separate control. "Any experience" sitting at
   * the top of the list is how you undo the filter, which means the menu holds
   * every state the filter has rather than most of them plus a clear button
   * somewhere else.
   */
  const pills: FilterPill[] = [
    {
      key: "sort",
      title: "Sort by",
      value: sort,
      options: sortOptions(sort),
      onSelect: onSort,
      narrows: false,
    },
    {
      key: "exp",
      title: "Experience",
      value: filters.exp,
      options: [
        { value: "", label: "Any experience" },
        ...EXPERIENCE_BANDS.map(({ value, label }) => ({ value, label })),
      ],
      onSelect: (exp: string) => onChange({ exp }),
      narrows: true,
    },
    {
      key: "notice",
      title: "Notice period",
      value: filters.notice,
      options: [
        { value: "", label: "Any notice period" },
        ...NOTICE_BANDS.map(({ value, label }) => ({ value, label })),
      ],
      onSelect: (notice: string) => onChange({ notice }),
      narrows: true,
    },
  ]

  /**
   * The two location pills. They are not in `pills` because they are not one
   * of a list any more — each opens a picker, and its label has to say how
   * many cities are in it rather than name the one.
   */
  const places: {
    key: "location" | "preferred"
    title: string
    empty: string
    one: (city: string) => string
    many: (count: number) => string
    options: string[]
  }[] = [
    {
      key: "location",
      title: "Current location",
      empty: "Any current location",
      one: (city) => city,
      many: (count) => `${count} current locations`,
      options: locations,
    },
    {
      key: "preferred",
      title: "Preferred location",
      empty: "Any preferred location",
      one: (city) => `Open to ${city}`,
      many: (count) => `Open to ${count} locations`,
      options: preferredLocations,
    },
  ]

  return (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
      {/* Not sticky itself — it rides inside the tab row's sticky block, which
          owns the background, border and bleed. */}
      <div className="flex flex-wrap items-center gap-2">
        {/* SEARCH IS AN ICON. Shrinking it to a glyph is only safe because the
            field it stands for is one click away in both modes — a popover on
            a pointer, the drawer on a phone. The dot says a query is running
            while the box is not on screen to say so itself. */}
        {isMobile ? (
          <PillTrigger
            icon
            label={`${searchLabel} and filter`}
            marked={Boolean(filters.q)}
            onClick={openDrawer}
          />
        ) : (
          <Popover>
            <PopoverTrigger
              render={
                <PillTrigger
                  icon
                  label={searchLabel}
                  marked={Boolean(filters.q)}
                />
              }
            />
            <PopoverContent align="start" className="w-72 p-2">
              {/* Narrows as you type, like the rail's own search box. */}
              <Input
                autoFocus
                value={filters.q}
                onChange={(event) => onChange({ q: event.target.value })}
                placeholder="Search name, role or skill"
                aria-label={searchLabel}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* ON A POINTER EACH PILL OPENS ITS OWN OPTIONS. Changing one filter is
            the common case and a popover answers it in one click, right under
            the control that asked. On a phone there is no room to anchor five
            of those, so every pill opens the one drawer instead — the same
            controls, in the shape each input can actually use. */}
        {pills.map((pill) => {
          const current =
            pill.options.find((option) => option.value === pill.value) ??
            pill.options[0]
          const marked = pill.narrows && Boolean(pill.value)

          if (isMobile) {
            return (
              <PillTrigger
                key={pill.key}
                label={current.label}
                marked={marked}
                onClick={openDrawer}
              />
            )
          }

          return (
            <DropdownMenu key={pill.key}>
              <DropdownMenuTrigger
                render={<PillTrigger label={current.label} marked={marked} />}
              />
              {/* A RADIO GROUP, NOT A LIST OF BUTTONS. These were hand-rolled
                  buttons in a `role="dialog"` popover, which looked right and
                  behaved wrong: no arrow keys, no `aria-checked`, and a menu
                  announced as a dialog. Picking one of a set is exactly what a
                  menu radio group is, and the component was already here — the
                  check mark, the roving focus and the selected state all come
                  with it instead of being drawn. */}
              <DropdownMenuContent align="start" className="min-w-56">
                <DropdownMenuRadioGroup
                  value={pill.value}
                  onValueChange={(value) => pill.onSelect(String(value))}
                >
                  {/* INSIDE the radio group, not above it. `DropdownMenuLabel`
                      is Base UI's `Menu.GroupLabel`, which reads the group
                      context to label it — outside one it throws rather than
                      rendering unlabelled, which is how this took the page
                      white rather than just losing a heading. */}
                  <DropdownMenuLabel>{pill.title}</DropdownMenuLabel>
                  {pill.options.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value || "any"}
                      value={option.value}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        })}

        {/* THE PLACES ARE PICKERS, NOT MENUS. Every other pill picks one of a
            fixed set of bands written in `applicants.ts`; these are built from
            the cities the applicants actually live in, so the list is data,
            and each holds several. On a pointer the pill opens the picker in
            a popover; on a phone it opens the drawer with everything else,
            because five popovers have nowhere to anchor at that width. */}
        {places.map((place) => {
          const applied = filters[place.key]
          // While its popover is open the picker holds a draft; the label and
          // the list follow what is applied until it closes.
          const chosen = picking?.key === place.key ? picking.chosen : applied
          const label =
            applied.length === 0
              ? place.empty
              : applied.length === 1
                ? place.one(applied[0])
                : place.many(applied.length)

          if (isMobile) {
            return (
              <PillTrigger
                key={place.key}
                label={label}
                marked={applied.length > 0}
                onClick={openDrawer}
              />
            )
          }

          return (
            <Popover
              key={place.key}
              onOpenChange={(open) => {
                if (open) {
                  setPicking({ key: place.key, chosen: applied })
                  return
                }
                // Closing applies the cities picked while it was open, as one
                // change.
                if (
                  picking?.key === place.key &&
                  picking.chosen.join() !== applied.join()
                )
                  onChange({ [place.key]: picking.chosen })
                setPicking(null)
              }}
            >
              <PopoverTrigger
                render={
                  <PillTrigger label={label} marked={applied.length > 0} />
                }
              />
              <PopoverContent align="start" className="w-64 gap-0 p-3">
                <LocationPicker
                  label={place.title}
                  placeholder="Search locations"
                  options={place.options}
                  chosen={chosen}
                  onChange={(next) =>
                    setPicking({ key: place.key, chosen: next })
                  }
                />
              </PopoverContent>
            </Popover>
          )
        })}

        {active && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {matched} of {total} match
          </span>
        )}

        {/* ONLY WHEN SOMETHING IS ON, and quiet: a reset that is there when
            there is something to reset, not a disabled button the rest of the
            time. Each pill's own "Any …" option still undoes that one. Right
            of the row, so the pills read left to right as the filter and this
            is what you do about it. */}
        {active && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground"
            onClick={onClear}
          >
            Clear
          </Button>
        )}
      </div>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{filterTitle}</DrawerTitle>
          <DrawerDescription>
            Nothing changes until you show the results.
          </DrawerDescription>
        </DrawerHeader>

        {/* A draft, started from what is applied each time the drawer opens.
            The panel's own Clear resets the draft; the list follows only on
            "Show N results". */}
        <div className="overflow-y-auto px-4 pb-4">
          <FilterPanel
            {...props}
            filters={draft}
            onChange={editDraft}
            onClear={() => setDraft(EMPTY_FILTERS)}
            layout="drawer"
          />
        </div>

        <DrawerFooter>
          <Button onClick={showResults}>
            Show {draftMatches} {draftMatches === 1 ? "result" : "results"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

type FilterPill = {
  key: string
  title: string
  value: string
  options: { value: string; label: string }[]
  onSelect: (value: string) => void
  /** Sort always has a value, so it never counts as narrowing anything. */
  narrows: boolean
}

/**
 * The pill itself, and the search glyph, which is the same control with its
 * label read out instead of drawn.
 *
 * `render`-friendly: Base UI hands a trigger its props, so this spreads
 * whatever it is given rather than owning its own click.
 */
function PillTrigger({
  label,
  marked,
  icon,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  label: string
  /** The filter is doing something — accent border, or a dot on the glyph. */
  marked: boolean
  icon?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={icon ? label : undefined}
      className={cn(
        "relative h-8 rounded-4xl border text-sm whitespace-nowrap transition-colors",
        icon ? "grid w-8 place-items-center" : "px-3",
        marked && !icon
          ? "border-primary bg-primary/10 font-medium text-foreground"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      {...props}
    >
      {icon ? <SearchIcon className="size-4" /> : label}
      {icon && marked && (
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />
      )}
    </button>
  )
}
