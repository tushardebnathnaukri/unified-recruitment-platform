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
  NOTICE_BANDS,
  sortOptions,
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
export function FilterBar(
  // The bar takes exactly what the panel takes, because it hands the whole lot
  // straight to it — `layout` is the one thing it decides for itself.
  props: Omit<React.ComponentProps<typeof FilterPanel>, "layout">
) {
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
   * THE BAR IS A DRAFT, APPLIED ON A BUTTON. Picking a band no longer moves
   * the list under you: the pills and the drawer write here, and only Apply
   * puts it in the URL. Two filters that belong together — "12+ years, in
   * Pune" — can be set as one thought and land as one change, instead of the
   * list shuffling and the counts moving twice on the way to a question that
   * was never asked.
   *
   * SORT IS NOT IN IT. It orders the list and removes nobody, so there is
   * nothing to weigh before committing to it; holding it back behind Apply
   * would be a button in front of a control that is already reversible by
   * picking again.
   *
   * It FOLLOWS the URL when the URL changes from somewhere else — a chip
   * dropped from the applied bar, a table header, the rail at a wider size, a
   * pasted link. Derived during render rather than in an effect, the way the
   * database's search box follows its query.
   */
  const [draft, setDraft] = React.useState<Filters>(filters)
  const [followed, setFollowed] = React.useState<Filters>(filters)
  if (!sameFilters(followed, filters)) {
    setFollowed(filters)
    setDraft(filters)
  }

  const edit = (updates: Partial<Filters>) =>
    setDraft((current) => ({ ...current, ...updates }))

  const dirty = !sameFilters(draft, filters)
  const active =
    Boolean(draft.q) ||
    Boolean(draft.exp) ||
    Boolean(draft.notice) ||
    draft.location.length > 0 ||
    draft.preferred.length > 0

  const apply = () => {
    onChange(draft)
    setDrawerOpen(false)
  }
  const clear = () => {
    setDraft(EMPTY_FILTERS)
    onClear()
    setDrawerOpen(false)
  }

  /** Apply and Clear, in the bar and again in the drawer's footer. */
  const actions = (
    <>
      <Button size="sm" disabled={!dirty} onClick={apply}>
        Apply
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!active && !dirty}
        onClick={clear}
      >
        Clear
      </Button>
    </>
  )

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
      value: draft.exp,
      options: [
        { value: "", label: "Any experience" },
        ...EXPERIENCE_BANDS.map(({ value, label }) => ({ value, label })),
      ],
      onSelect: (exp: string) => edit({ exp }),
      narrows: true,
    },
    {
      key: "notice",
      title: "Notice period",
      value: draft.notice,
      options: [
        { value: "", label: "Any notice period" },
        ...NOTICE_BANDS.map(({ value, label }) => ({ value, label })),
      ],
      onSelect: (notice: string) => edit({ notice }),
      narrows: true,
    },
  ]

  /**
   * The two location pills. They are not in `pills` because they are not one
   * of a list any more — each opens a picker, and its label has to say how
   * many cities are in it rather than name the one.
   */
  const places: {
    key: string
    title: string
    empty: string
    one: (city: string) => string
    many: (count: number) => string
    options: string[]
    chosen: string[]
    onChange: (next: string[]) => void
  }[] = [
    {
      key: "location",
      title: "Current location",
      empty: "Any current location",
      one: (city) => city,
      many: (count) => `${count} current locations`,
      options: locations,
      chosen: draft.location,
      onChange: (location) => edit({ location }),
    },
    {
      key: "preferred",
      title: "Preferred location",
      empty: "Any preferred location",
      one: (city) => `Open to ${city}`,
      many: (count) => `Open to ${count} locations`,
      options: preferredLocations,
      chosen: draft.preferred,
      onChange: (preferred) => edit({ preferred }),
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
            marked={Boolean(draft.q)}
            onClick={() => setDrawerOpen(true)}
          />
        ) : (
          <Popover>
            <PopoverTrigger
              render={
                <PillTrigger
                  icon
                  label={searchLabel}
                  marked={Boolean(draft.q)}
                />
              }
            />
            <PopoverContent align="start" className="w-72 p-2">
              {/* Enter applies, so the common case — type a name, press
                  Return — costs no trip to the button. */}
              <Input
                autoFocus
                value={draft.q}
                onChange={(event) => edit({ q: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && dirty) apply()
                }}
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
                onClick={() => setDrawerOpen(true)}
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
          const label =
            place.chosen.length === 0
              ? place.empty
              : place.chosen.length === 1
                ? place.one(place.chosen[0])
                : place.many(place.chosen.length)

          if (isMobile) {
            return (
              <PillTrigger
                key={place.key}
                label={label}
                marked={place.chosen.length > 0}
                onClick={() => setDrawerOpen(true)}
              />
            )
          }

          return (
            <Popover key={place.key}>
              <PopoverTrigger
                render={
                  <PillTrigger label={label} marked={place.chosen.length > 0} />
                }
              />
              <PopoverContent align="start" className="w-64 gap-0 p-3">
                <LocationPicker
                  label={place.title}
                  placeholder="Search locations"
                  options={place.options}
                  chosen={place.chosen}
                  onChange={place.onChange}
                />
              </PopoverContent>
            </Popover>
          )
        })}

        {/* THE COUNT IS OF THE APPLIED LIST, so it steps aside while there are
            unapplied changes rather than sitting beside pills it does not
            describe. Apply is what makes it true again. */}
        {active && !dirty && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {matched} of {total} match
          </span>
        )}

        {/* Right of the row, so the pills read left to right as the filter and
            the buttons are what you do about it. */}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{filterTitle}</DrawerTitle>
          <DrawerDescription>
            {dirty ? "Not applied yet" : `${matched} of ${total} match`}
          </DrawerDescription>
        </DrawerHeader>

        {/* The same draft the pills write, so opening the drawer after setting
            a pill shows what is pending rather than what is applied. */}
        <div className="overflow-y-auto px-4 pb-4">
          <FilterPanel
            {...props}
            filters={draft}
            onChange={edit}
            onClear={clear}
            layout="drawer"
          />
        </div>

        <DrawerFooter className="flex-row justify-end">{actions}</DrawerFooter>
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
