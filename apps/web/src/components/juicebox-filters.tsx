import * as React from "react"
import { Link } from "react-router"
import type { LucideIcon } from "lucide-react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BriefcaseIcon,
  Building2Icon,
  CircleXIcon,
  FactoryIcon,
  GraduationCapIcon,
  IndianRupeeIcon,
  LanguagesIcon,
  ListFilterIcon,
  LockIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  WandSparklesIcon,
  XIcon,
  ZapIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

import {
  ChoiceSelect,
  SortSelect,
  type FilterUpdate,
} from "@/components/database-filters"
import {
  EXCLUSIONS,
  LAST_SEEN,
  SECTIONS,
  TOGGLES,
  activeFilterCount,
  readRange,
  writeRange,
  type Expansion,
  type Profile,
  type Section,
} from "@/lib/database-filters"
import {
  headlineFor,
  modeFor,
  searchHref,
  type SearchMode,
} from "@/lib/database"

/**
 * The Juicebox version of the database's filters — one of the two on
 * /settings, beside the live hirist refine column.
 *
 * THE SEARCH IS A SENTENCE, AND EVERYTHING ELSE IS A BUTTON NEXT TO IT. Where
 * the refine column keeps twenty sections on screen, this keeps the results
 * the whole width and puts the query in a pill, the filters behind a button
 * that counts them, and the criteria behind another. Narrowing is something
 * you go and do, not something that sits beside every card.
 *
 * THREE IDEAS COME WITH IT, each from Juicebox's own results page:
 *
 * - Filters are EDITED, THEN SAVED. The dialog shows how many would match as
 *   you change it and only touches the list on Save, so trying a combination
 *   costs nothing.
 * - Criteria are RANKED SENTENCES, not filters. They do not remove anybody;
 *   they decide what the cards highlight and who comes first on Best match,
 *   most important first.
 * - "Expand pool" says what loosening each filter would find, as a number,
 *   and does it in one click.
 */

type FilterProps = {
  /** Everybody the search found — where the options come from. */
  profiles: Profile[]
  params: URLSearchParams
  /** How many would match under a query string. For the live counts. */
  count: (params: URLSearchParams) => number
  /** Replace every filter in the URL with the ones in `next`. */
  onApply: (next: URLSearchParams) => void
}

/**
 * The query as a pill, then Filters and Criteria, then the chips that widen
 * the pool. The pill is the way back to the box — it is the search, and
 * pressing it is how you change it.
 */
export function JuiceboxHeader({
  mode,
  boolean,
  query,
  criteria,
  onCriteria,
  readSkills,
  expansions,
  ...filters
}: FilterProps & {
  mode: SearchMode
  boolean: boolean
  query: string
  criteria: string[]
  onCriteria: (next: string[]) => void
  readSkills: (text: string) => string[]
  expansions: Expansion[]
}) {
  const option = modeFor(mode)
  const headline = headlineFor(query, mode)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          aria-label={`Edit search: ${headline}`}
          className="h-9 max-w-full min-w-0 shrink justify-start rounded-full sm:max-w-2xl"
          render={<Link to={searchHref({ mode, boolean })} />}
        >
          <option.icon
            data-icon="inline-start"
            className="text-muted-foreground"
          />
          <span
            className={cn("min-w-0 truncate", boolean && "font-mono text-xs")}
          >
            {headline}
          </span>
        </Button>

        <FiltersDialog {...filters} />
        <CriteriaDialog
          criteria={criteria}
          onUpdate={onCriteria}
          readSkills={readSkills}
        />
      </div>

      <ExpandPool
        expansions={expansions}
        onApply={(next) => filters.onApply(next)}
      />
    </div>
  )
}

/** A trigger with its count — "Filters 6", "Criteria 2". */
function CountButton({
  icon: Icon,
  label,
  count,
  ...props
}: React.ComponentProps<typeof Button> & {
  icon: LucideIcon
  label: string
  count: number
}) {
  return (
    <Button variant="outline" className="h-9 rounded-full" {...props}>
      <Icon data-icon="inline-start" />
      {label}
      {count > 0 && (
        <Badge variant="secondary" className="tabular-nums">
          {count}
        </Badge>
      )}
    </Button>
  )
}

/**
 * The refine panel's filters, regrouped the way Juicebox groups its own —
 * General, Locations, Job, Company and so on — so the recruiter looks for a
 * filter by what it is about rather than down a list of twenty.
 */
const CATEGORIES: {
  id: string
  label: string
  icon: LucideIcon
  keys: string[]
}[] = [
  {
    id: "general",
    label: "General",
    icon: SlidersHorizontalIcon,
    keys: ["xp", "age", "np", "seen", "exclude"],
  },
  {
    id: "locations",
    label: "Locations",
    icon: MapPinIcon,
    keys: ["cur", "pref", "relocate"],
  },
  { id: "job", label: "Job", icon: BriefcaseIcon, keys: ["fn", "team"] },
  {
    id: "company",
    label: "Company",
    icon: Building2Icon,
    keys: ["org", "cluster"],
  },
  { id: "industry", label: "Industry", icon: FactoryIcon, keys: ["ind"] },
  {
    id: "pay",
    label: "Compensation",
    icon: IndianRupeeIcon,
    keys: ["ctc", "ectc"],
  },
  {
    id: "education",
    label: "Education",
    icon: GraduationCapIcon,
    keys: ["inst", "deg", "course", "batch"],
  },
  { id: "languages", label: "Languages", icon: LanguagesIcon, keys: ["lang"] },
  {
    id: "power",
    label: "Power filters",
    icon: ZapIcon,
    keys: ["unique", "permit", "diversity"],
  },
]

/** What a min/max pair counts in, said under each box as Juicebox does. */
const RANGE_UNITS: Record<string, string> = {
  xp: "years",
  age: "years",
  batch: "graduation year",
  ctc: "₹ lakh",
  ectc: "₹ lakh",
}

/** The label a field is shown and searched by. */
function fieldLabel(key: string) {
  if (key === "seen") return "Last seen"
  if (key === "exclude") return "Exclude profiles"
  if (key === "unique") return "Unique profiles"
  return SECTIONS.find((section) => section.key === key)?.label ?? key
}

/** Whether a field narrows anything under this query string. */
function isActive(key: string, params: URLSearchParams) {
  if (key === "exclude") return params.has("hide") || params.has("ex")
  if (key === "diversity") return false
  return params.has(key)
}

/**
 * "Edit your search filters". Categories down the left, every field in one
 * scrolling form on the right, and a count in the header that follows the
 * draft rather than the list.
 *
 * THE DRAFT IS A COPY OF THE URL, taken when the dialog opens. Nothing is
 * written until Save, and closing any other way throws it away — the list
 * behind the dialog does not move while you are deciding.
 *
 * "Hide inactive filters" and the search box are Juicebox's answers to the
 * same problem the refine panel's collapsed sections answer: a form of twenty
 * fields is a lot to look through for the three you care about.
 */
function FiltersDialog({ profiles, params, count, onApply }: FilterProps) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(params)
  const [find, setFind] = React.useState("")
  const [onlyActive, setOnlyActive] = React.useState(false)
  const pane = React.useRef<HTMLDivElement>(null)

  const update: FilterUpdate = (key, value) => {
    setDraft((current) => {
      const next = new URLSearchParams(current)
      next.delete(key)
      if (Array.isArray(value)) value.forEach((item) => next.append(key, item))
      else if (value) next.set(key, value)
      return next
    })
  }

  const needle = find.trim().toLowerCase()
  const visible = (category: (typeof CATEGORIES)[number]) =>
    category.keys.filter(
      (key) =>
        (!onlyActive || isActive(key, draft)) &&
        (!needle ||
          fieldLabel(key).toLowerCase().includes(needle) ||
          category.label.toLowerCase().includes(needle))
    )

  return (
    <>
      <CountButton
        icon={ListFilterIcon}
        label="Filters"
        count={activeFilterCount(params)}
        onClick={() => {
          setDraft(new URLSearchParams(params))
          setOpen(true)
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[min(44rem,calc(100svh-4rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        >
          <div className="flex items-center gap-3 border-b border-border px-5 py-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <DialogTitle className="text-base font-medium">
                Edit your search filters
              </DialogTitle>
              <DialogDescription className="text-xs tabular-nums">
                {count(draft)} matches
              </DialogDescription>
            </div>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onApply(draft)
                setOpen(false)
              }}
            >
              Save changes
            </Button>
          </div>

          <div className="flex min-h-0 flex-1">
            <nav
              aria-label="Filter categories"
              className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border p-3 sm:flex"
            >
              <InputGroup className="mb-2 h-8">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  value={find}
                  onChange={(event) => setFind(event.target.value)}
                  placeholder="Search filters"
                  aria-label="Search filters"
                />
              </InputGroup>

              <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      pane.current
                        ?.querySelector(`[data-category="${category.id}"]`)
                        ?.scrollIntoView({ block: "start", behavior: "smooth" })
                    }
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <category.icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">{category.label}</span>
                    {/* The dot is the category's own "something here is on". */}
                    {category.keys.some((key) => isActive(key, draft)) && (
                      <span className="size-2 rounded-full bg-primary">
                        <span className="sr-only">active</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <Label className="mt-2 items-center gap-2 border-t border-border pt-3 text-sm font-normal">
                <Checkbox
                  checked={onlyActive}
                  onCheckedChange={(checked) => setOnlyActive(checked)}
                />
                Hide inactive filters
              </Label>
            </nav>

            <div
              ref={pane}
              className="min-w-0 flex-1 overflow-y-auto px-5 py-4"
            >
              <div className="flex flex-col gap-8">
                {CATEGORIES.map((category) => {
                  const keys = visible(category)
                  if (keys.length === 0) return null

                  return (
                    <section
                      key={category.id}
                      data-category={category.id}
                      className="flex scroll-mt-4 flex-col gap-5"
                    >
                      <h3 className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        <category.icon className="size-3.5" />
                        {category.label}
                      </h3>
                      {keys.map((key) => (
                        <Field
                          key={key}
                          fieldKey={key}
                          draft={draft}
                          profiles={profiles}
                          onUpdate={update}
                        />
                      ))}
                    </section>
                  )
                })}
                {CATEGORIES.every(
                  (category) => visible(category).length === 0
                ) && (
                  <p className="text-sm text-muted-foreground">
                    {onlyActive
                      ? "No filters are on."
                      : "No filter goes by that name."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** One labelled field, with Clear beside the label once it is doing anything. */
function Field({
  fieldKey,
  draft,
  profiles,
  onUpdate,
}: {
  fieldKey: string
  draft: URLSearchParams
  profiles: Profile[]
  onUpdate: FilterUpdate
}) {
  const section = SECTIONS.find((candidate) => candidate.key === fieldKey)
  const active = isActive(fieldKey, draft)
  const clear = () => {
    if (fieldKey === "exclude") {
      onUpdate("hide", null)
      onUpdate("ex", null)
    } else onUpdate(fieldKey, null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          {fieldLabel(fieldKey)}
          {section?.kind === "gated" && (
            <Badge variant="secondary" className="font-normal">
              <LockIcon data-icon="inline-start" />
              {section.badge}
            </Badge>
          )}
        </span>
        {active && (
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0 text-xs"
            onClick={clear}
          >
            Clear
          </Button>
        )}
      </div>

      {section ? (
        <SectionControl
          section={section}
          draft={draft}
          profiles={profiles}
          onUpdate={onUpdate}
        />
      ) : fieldKey === "seen" ? (
        <ChoiceSelect
          label="Last seen"
          anyLabel="Any time"
          value={draft.get("seen") ?? ""}
          options={LAST_SEEN.filter((option) => option.value)}
          onChange={(value) => onUpdate("seen", value || null)}
          className="w-full sm:w-64"
        />
      ) : fieldKey === "exclude" ? (
        <div className="flex flex-col gap-2">
          <ExcludeRow
            label="Viewed"
            checked={draft.get("hide") === "1"}
            onChange={(checked) => onUpdate("hide", checked ? "1" : null)}
          />
          {EXCLUSIONS.map((exclusion) => {
            const chosen = draft.getAll("ex")
            return (
              <ExcludeRow
                key={exclusion.value}
                label={exclusion.label}
                checked={chosen.includes(exclusion.value)}
                onChange={(checked) =>
                  onUpdate(
                    "ex",
                    checked
                      ? [...chosen, exclusion.value]
                      : chosen.filter((value) => value !== exclusion.value)
                  )
                }
              />
            )
          })}
        </div>
      ) : fieldKey === "unique" ? (
        <ExcludeRow
          label={TOGGLES[1].hint}
          checked={draft.get("unique") === "1"}
          onChange={(checked) => onUpdate("unique", checked ? "1" : null)}
        />
      ) : null}
    </div>
  )
}

function ExcludeRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Label className="items-center gap-2 text-sm font-normal">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      {label}
    </Label>
  )
}

function SectionControl({
  section,
  draft,
  profiles,
  onUpdate,
}: {
  section: Section
  draft: URLSearchParams
  profiles: Profile[]
  onUpdate: FilterUpdate
}) {
  if (section.kind === "range") {
    const { min, max } = readRange(draft, section.key)
    const unit = RANGE_UNITS[section.key] ?? ""
    const set = (which: "min" | "max", raw: string) => {
      const value = raw === "" ? null : Number(raw)
      onUpdate(
        section.key,
        which === "min" ? writeRange(value, max) : writeRange(min, value)
      )
    }

    return (
      <div className="grid grid-cols-2 gap-3">
        {(["min", "max"] as const).map((which) => (
          <Label
            key={which}
            className="flex-col items-stretch gap-1.5 text-xs font-normal text-muted-foreground"
          >
            {which === "min" ? "Minimum" : "Maximum"} ({unit})
            <Input
              type="number"
              inputMode="numeric"
              value={(which === "min" ? min : max) ?? ""}
              onChange={(event) => set(which, event.target.value)}
              placeholder={which === "min" ? "No minimum" : "No maximum"}
              className="text-foreground"
            />
          </Label>
        ))}
      </div>
    )
  }

  if (section.kind === "checks") {
    return (
      <TokenField
        label={section.label}
        options={section.options(profiles)}
        chosen={draft.getAll(section.key)}
        onChange={(values) => onUpdate(section.key, values)}
      />
    )
  }

  if (section.kind === "select") {
    return (
      <ChoiceSelect
        label={section.label}
        anyLabel="Any"
        value={draft.get(section.key) ?? ""}
        options={section.options}
        onChange={(value) => onUpdate(section.key, value || null)}
        className="w-full sm:w-64"
      />
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border p-3">
      <p className="text-xs text-muted-foreground">{section.note}</p>
      <div className="flex flex-wrap gap-1.5">
        {section.groups.map((group) => (
          <Badge key={group.title} variant="outline" className="font-normal">
            {group.title}
          </Badge>
        ))}
      </div>
    </div>
  )
}

/**
 * Chosen values as chips inside the field, and an Add that opens a searchable
 * list — Juicebox's shape for "Job Titles" and "Companies". It stays open
 * after a pick, because picking three cities is the usual case, not the rare
 * one.
 */
function TokenField({
  label,
  options,
  chosen,
  onChange,
}: {
  label: string
  options: string[]
  chosen: string[]
  onChange: (values: string[]) => void
}) {
  const left = options.filter((option) => !chosen.includes(option))

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-2xl border border-input bg-input/30 p-1.5">
      {chosen.map((value) => (
        <Badge
          key={value}
          variant="secondary"
          className="gap-1 pr-0.5 font-normal"
        >
          {value}
          <button
            type="button"
            aria-label={`Remove ${value}`}
            onClick={() => onChange(chosen.filter((item) => item !== value))}
            className="grid size-4 place-items-center rounded-full hover:bg-foreground/10"
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}

      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-6 rounded-full px-2 text-muted-foreground"
              disabled={left.length === 0}
            />
          }
        >
          <PlusIcon data-icon="inline-start" />
          {chosen.length > 0 ? "Add" : `Add ${label.toLowerCase()}`}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 gap-0 p-0">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}`} />
            <CommandList>
              <CommandEmpty>Nothing matches.</CommandEmpty>
              {left.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => onChange([...chosen, option])}
                >
                  {option}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/**
 * Ranked criteria — "The candidate has hands-on project experience with
 * Python", most important first.
 *
 * THEY RANK, THEY DO NOT FILTER. Nobody leaves the list because of a
 * criterion. What changes is which skills the cards highlight — any a
 * criterion names — and the Best match order, which weighs the first
 * criterion most. A criterion that names no skill we know is still counted;
 * a real model would read the whole profile for it, and this mock deals a
 * stable yes or no per person instead.
 *
 * Edited as a draft and applied on Update, like the filters. Reordering is a
 * pair of arrows rather than a drag: the same result, and it works from a
 * keyboard without a drag-and-drop library.
 */
function CriteriaDialog({
  criteria,
  onUpdate,
  readSkills,
}: {
  criteria: string[]
  onUpdate: (next: string[]) => void
  readSkills: (text: string) => string[]
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(criteria)

  const move = (from: number, to: number) =>
    setDraft((current) => {
      const next = [...current]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })

  return (
    <>
      <CountButton
        icon={SparklesIcon}
        label="Criteria"
        count={criteria.length}
        onClick={() => {
          setDraft(criteria)
          setOpen(true)
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-4 sm:max-w-xl">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-medium">
              Criteria
            </DialogTitle>
            <DialogDescription className="text-xs">
              What makes somebody a good match, most important first. They order
              the results; they do not remove anybody.
            </DialogDescription>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Most important
            </span>

            {draft.map((text, index) => {
              const skills = readSkills(text)
              return (
                <div key={index} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 shrink-0 text-center text-xs text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <Input
                      value={text}
                      autoFocus={text === ""}
                      onChange={(event) =>
                        setDraft((current) =>
                          current.map((item, i) =>
                            i === index ? event.target.value : item
                          )
                        )
                      }
                      aria-label={`Criterion ${index + 1}`}
                      placeholder="Has run a payments team through an audit"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Move down"
                      disabled={index === draft.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove criterion"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setDraft((current) =>
                          current.filter((_, i) => i !== index)
                        )
                      }
                    >
                      <CircleXIcon />
                    </Button>
                  </div>
                  {/* Says what the criterion will actually do to the cards,
                      so a sentence that names no known skill is not a
                      surprise when nothing turns green. */}
                  {text.trim() && (
                    <p className="pl-5.5 text-xs text-muted-foreground">
                      {skills.length > 0
                        ? `Highlights ${skills.join(", ")}`
                        : "Judged from the whole profile"}
                    </p>
                  )}
                </div>
              )
            })}

            {draft.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No criteria. The results keep their order.
              </p>
            )}

            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Least important
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDraft((current) => [...current, ""])}
            >
              <PlusIcon data-icon="inline-start" />
              Add criterion
            </Button>
            <Button
              onClick={() => {
                onUpdate(draft.map((text) => text.trim()).filter(Boolean))
                setOpen(false)
              }}
            >
              Update
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * "Expand pool" and its chips. Nothing when there is nothing to widen — a
 * search with no filters on is already as wide as it goes.
 */
function ExpandPool({
  expansions,
  onApply,
}: {
  expansions: Expansion[]
  onApply: (next: URLSearchParams) => void
}) {
  if (expansions.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <WandSparklesIcon className="size-3.5" />
        Expand pool
      </span>
      {expansions.map((expansion) => (
        <Button
          key={expansion.label}
          variant="outline"
          size="sm"
          className="h-7 rounded-full text-xs font-normal"
          onClick={() => onApply(expansion.params)}
        >
          {expansion.label}
          <span className="font-medium text-primary tabular-nums">
            +{expansion.gain}
          </span>
        </Button>
      ))}
    </div>
  )
}

/**
 * The bar over the cards: how many match, a search within them, and the sort.
 * Last seen lives in the dialog's General section here, with everything else
 * that narrows.
 */
export function JuiceboxToolbar({
  matched,
  params,
  onUpdate,
  defaultSort,
}: {
  matched: number
  params: URLSearchParams
  onUpdate: FilterUpdate
  defaultSort: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border pb-3">
      <h2 className="text-sm font-medium">
        Matches{" "}
        <span className="font-normal text-muted-foreground tabular-nums">
          ({matched})
        </span>
      </h2>

      <InputGroup className="ml-auto h-8 max-w-xs min-w-48 flex-1">
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

      <SortSelect
        params={params}
        onUpdate={onUpdate}
        defaultSort={defaultSort}
      />
    </div>
  )
}
