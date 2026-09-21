import * as React from "react"
import type {
  Decorator,
  Meta as StoryMeta,
  StoryObj,
} from "@storybook/react-vite"
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  BookmarkIcon,
  CalendarCheckIcon,
  CalendarPlusIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  CircleHelpIcon,
  ClockIcon,
  Columns3Icon,
  DownloadIcon,
  EllipsisIcon,
  EyeOffIcon,
  LayoutListIcon,
  MailIcon,
  MapPinIcon,
  PanelsTopLeftIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  Table2Icon,
  UserRoundIcon,
  XIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Chip } from "@workspace/ui/components/chip"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@workspace/ui/components/combobox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Item } from "@workspace/ui/components/item"
import { Label } from "@workspace/ui/components/label"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import { Separator } from "@workspace/ui/components/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  useToastManager,
} from "@workspace/ui/components/toast"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { designComposition } from "@workspace/ui/lib/figma"

/**
 * The response manager — one job, and everybody who applied to it. The biggest
 * surface in the prototype.
 *
 * Mirrors `apps/web/src/routes/job.tsx`; the people are a hand-picked few in
 * the shape `apps/web/src/lib/applicants.ts` generates, and the counts are the
 * Principal Engineer job's, a couple of decisions into the day.
 *
 * IT IS A TRIAGE SCREEN, NOT A PROFILE READER. The question it answers is
 * "which of these 148 people are worth an hour", so a card carries only what
 * you judge on at a glance — the role they are in now, how long they have been
 * working, what they cost, how soon they could start — and the decision is on
 * the card rather than a round trip through a profile.
 *
 * IT IS ORGANISED BY DECISION, NOT BY READING. The page opens on To review —
 * everybody without a decision — with the people new since the last visit
 * first. Whether a card was opened is not something the screen tracks.
 */

type Status = "undecided" | "maybe" | "shortlisted" | "contacted" | "rejected"

/** When the recruiter was last here. One user, so a constant — as in the app. */
const LAST_VISIT = "yesterday, 4:10 pm"

const BUCKETS: { value: Status | "all"; label: string; count: number }[] = [
  { value: "undecided", label: "To review", count: 101 },
  { value: "maybe", label: "Maybe", count: 2 },
  { value: "shortlisted", label: "Shortlisted", count: 12 },
  { value: "contacted", label: "Contacted", count: 9 },
  { value: "rejected", label: "Not a fit", count: 24 },
  { value: "all", label: "All", count: 148 },
]

/** The heading counts for To review, from the same job. 30 + 71 = 101. */
const QUEUE = { fresh: 30, earlier: 71, done: 2, arrived: 32 }

const VIEWS = [
  { value: "cards", label: "Cards", icon: LayoutListIcon },
  { value: "table", label: "Table", icon: Table2Icon },
  { value: "split", label: "Split", icon: PanelsTopLeftIcon },
]

const REQUIRED_SKILLS = ["Kubernetes", "Go", "Kafka"]

type Applicant = {
  id: string
  name: string
  title: string
  company: string
  location: string
  /** Where they would go, their own city first. */
  preferredLocations: string[]
  /**
   * Derived from the roles, title, school and dates below — never dealt, so a
   * tag cannot disagree with the block under it. `tagsFor` in the app returns
   * ALL of them, in order; how many fit is the card's business.
   */
  tags: string[]
  appliedAgo: string
  /** Applied since the last visit. */
  fresh: boolean
  status: Status
  experience: string
  positions: { role: string; span: string }[]
  education: string
  skills: string[]
  salary: string
  notice: string
}

const APPLICANTS: Applicant[] = [
  {
    id: "c1",
    name: "Ananya Krishnan",
    title: "Staff Engineer",
    company: "Razorpay",
    location: "Bengaluru",
    preferredLocations: ["Bengaluru", "Pune"],
    tags: ["Fintech", "Top institute", "Long tenure"],
    appliedAgo: "2 hours ago",
    fresh: true,
    status: "undecided",
    experience: "11 yrs 4 mos",
    positions: [
      { role: "Staff Engineer, Razorpay", span: "2021 — present" },
      { role: "Senior Engineer, Flipkart", span: "2017 — 2021" },
    ],
    education: "B.Tech, IIT Madras",
    skills: ["Kubernetes", "Go", "Terraform", "Kafka"],
    salary: "₹64L",
    notice: "60 days",
  },
  {
    id: "c2",
    name: "Rohit Mehta",
    title: "Engineering Manager",
    company: "Swiggy",
    location: "Bengaluru",
    preferredLocations: ["Bengaluru"],
    tags: ["Leads a team", "E-commerce", "Top institute", "Long tenure"],
    appliedAgo: "5 hours ago",
    fresh: true,
    status: "undecided",
    experience: "13 yrs 1 mo",
    positions: [
      { role: "Engineering Manager, Swiggy", span: "2020 — present" },
      { role: "Tech Lead, Myntra", span: "2016 — 2020" },
    ],
    education: "M.Tech, IISc Bangalore",
    skills: ["Kubernetes", "Java", "Kafka"],
    salary: "₹78L",
    notice: "90 days",
  },
  {
    id: "c3",
    name: "Meera Kulkarni",
    title: "Senior Engineer",
    company: "CRED",
    location: "Pune",
    preferredLocations: ["Pune", "Bengaluru", "Anywhere"],
    tags: ["Fintech", "Long tenure"],
    appliedAgo: "6 days ago",
    fresh: false,
    status: "undecided",
    experience: "9 yrs 2 mos",
    positions: [
      { role: "Senior Engineer, CRED", span: "2022 — present" },
      { role: "Engineer, Zomato", span: "2018 — 2022" },
    ],
    education: "B.Tech, COEP",
    skills: ["Kafka", "Java", "Redis"],
    salary: "₹48L",
    notice: "30 days",
  },
  {
    id: "c4",
    name: "Priyanka Nair",
    title: "Principal Engineer",
    company: "Postman",
    location: "Remote",
    preferredLocations: ["Anywhere"],
    tags: [
      "Leads a team",
      "SaaS",
      "One sector",
      "Top institute",
      "Long tenure",
    ],
    appliedAgo: "5 days ago",
    fresh: false,
    status: "shortlisted",
    experience: "14 yrs 8 mos",
    positions: [
      { role: "Principal Engineer, Postman", span: "2019 — present" },
      { role: "Architect, ThoughtWorks", span: "2014 — 2019" },
    ],
    education: "B.E., NIT Trichy",
    skills: ["Go", "Kubernetes", "gRPC"],
    salary: "₹92L",
    notice: "Immediate",
  },
  {
    id: "c5",
    name: "Varun Reddy",
    title: "Senior Staff Engineer",
    company: "PhonePe",
    location: "Hyderabad",
    preferredLocations: ["Hyderabad", "Bengaluru"],
    tags: ["Fintech", "Top institute", "Long tenure"],
    appliedAgo: "2 weeks ago",
    fresh: false,
    status: "maybe",
    experience: "15 yrs 3 mos",
    positions: [
      { role: "Senior Staff Engineer, PhonePe", span: "2020 — present" },
      { role: "Staff Engineer, Amazon", span: "2015 — 2020" },
    ],
    education: "B.Tech, IIIT Hyderabad",
    skills: ["Go", "Kubernetes", "Envoy"],
    salary: "₹98L",
    notice: "90 days",
  },
]

/** Stable identities, so the toast effects below do not re-fire each render. */
const ONE_FACE = [APPLICANTS[0]!]
const THREE_FACES = [APPLICANTS[0]!, APPLICANTS[1]!, APPLICANTS[2]!]

/** New since the last visit AND still waiting — what the dot marks. */
const isNew = (applicant: Applicant) =>
  applicant.fresh && applicant.status === "undecided"

/** Two letters, so a name that is one word or four still yields two. */
function initials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase()
}

/**
 * A badge per decision, and none for the absence of one. Whether somebody is
 * NEW is the avatar's dot, not a badge — "Unread" is not a status any more.
 */
function StatusBadge({ status }: { status: Status }) {
  switch (status) {
    case "maybe":
      return <Badge variant="warning">Maybe</Badge>
    case "shortlisted":
      return <Badge variant="success">Shortlisted</Badge>
    case "contacted":
      return <Badge variant="secondary">Contacted</Badge>
    case "rejected":
      return <Badge variant="outline">Not a fit</Badge>
    case "undecided":
      return null
  }
}

/**
 * Initials, with the "new" dot on the top-right corner. The dot's ring is a
 * cut-out, so it takes the colour of the card it sits on.
 */
function ApplicantAvatar({
  applicant,
  className,
}: {
  applicant: Applicant
  className?: string
}) {
  return (
    <Avatar className={cn("shrink-0", className)}>
      <AvatarFallback>{initials(applicant.name)}</AvatarFallback>
      {isNew(applicant) && (
        <AvatarBadge aria-hidden className="top-0 bottom-auto ring-card" />
      )}
    </Avatar>
  )
}

/**
 * THE JOB IS THE TOP BAR, NOT A BAND UNDER IT. It used to be a white block
 * above the tabs while the bar said "Jobs" — two rows to say where you are. In
 * the app this is `PageHeader`, a portal into a slot in `SiteHeader`, and the
 * route title stands down while anything fills it.
 *
 * Fitting one row inside `--header-height` costs the band's other two lines:
 * the title takes the bar's own `text-base` and truncates instead of clamping,
 * the back button is a ghost circle rather than an outlined one, and the meta
 * sits behind a separator that hides below `lg`.
 *
 * Deliberately thin — the facts that qualify a candidate against this posting
 * and nothing else. Editing the job lives back on the Jobs page; repeating it
 * here would give the same action two homes.
 */
function JobHeader() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Back to all jobs"
        className="-ml-2 size-8 shrink-0 rounded-full"
      >
        <ArrowLeftIcon />
      </Button>

      <h1 className="min-w-0 truncate font-heading text-base font-medium">
        Principal Engineer, Platform Infrastructure
      </h1>

      <Badge variant="secondary" className="shrink-0">
        Pro
      </Badge>
      <Badge variant="success" className="shrink-0">
        Live
      </Badge>

      <Separator
        orientation="vertical"
        className="mx-1 hidden h-4 lg:block data-vertical:self-auto"
      />
      <Meta separator={false} className="hidden shrink-0 lg:flex">
        <MetaItem>
          <MapPinIcon />
          Bengaluru
        </MetaItem>
        <MetaItem>
          <ClockIcon />
          Expires in 6 days
        </MetaItem>
      </Meta>
    </div>
  )
}

/**
 * The shell's bar, so the story can show what the header now sits inside. In
 * the app this is `SiteHeader` and the page reaches it through a portal; here
 * it is drawn, because the composition has no shell around it.
 */
function TopBar({ children }: { children: React.ReactNode }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background px-4 lg:px-6">
      {children}
      <Button variant="ghost" size="sm" className="ml-auto shrink-0">
        <SparklesIcon data-icon="inline-start" />
        Athena
      </Button>
    </header>
  )
}

/**
 * The pill itself, and the search glyph — the same control with its label read
 * out instead of drawn.
 */
function PillTrigger({
  label,
  marked,
  icon,
}: {
  label: string
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
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon ? <SearchIcon className="size-4" /> : label}
      {icon && marked && (
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />
      )}
    </button>
  )
}

/**
 * ONE ROW OF PILLS, IN EVERY VIEW: search, sort, experience, notice, location.
 * They cost a row instead of a column, so no view is the odd one out — and the
 * panel they replaced lives on inside the drawer, which is what every pill
 * opens below `md`.
 *
 * The sort pill switches between MOST RECENT and BEST MATCH (plus most
 * experience and soonest available). In To review it sorts inside New and
 * inside Earlier, never across them. There is no salary filter, deliberately:
 * filtering on current pay ranks people by their last employer's budget.
 *
 * It sits OUTSIDE the tab panels, not repeated in each: five copies of one
 * search box is five things a screen reader has to tell apart, and the query
 * would reset every time you changed tab.
 */
function FilterBar({
  sort = "Most recent",
  /** A pill has been changed and not yet applied. */
  dirty = false,
}: {
  sort?: string
  dirty?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PillTrigger icon label="Search responses" marked />
      <PillTrigger label={sort} marked={false} />
      <PillTrigger label={dirty ? "8+ yrs" : "12+ yrs"} marked />
      <PillTrigger label="Any notice period" marked={false} />
      {/* TWO LOCATION FILTERS, because they are two questions: where they are,
          and where they would go. Both are pick-many, so a pill can carry a
          city, a count, or neither. */}
      <PillTrigger label="Bengaluru" marked />
      <PillTrigger label="Open to 2 locations" marked />

      {/* THE COUNT IS OF THE APPLIED LIST, so it steps aside while there are
          unapplied changes rather than sitting beside pills it does not
          describe. Apply is what makes it true again. */}
      {!dirty && (
        <span className="text-xs text-muted-foreground tabular-nums">
          64 of 101 match
        </span>
      )}

      {/* Right of the row, so the pills read left to right as the filter and
          the buttons are what you do about it. */}
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" disabled={!dirty}>
          Apply
        </Button>
        <Button variant="outline" size="sm">
          Clear
        </Button>
      </div>
    </div>
  )
}

/**
 * The cities the rail and the pills offer. "Anywhere" is a real value on a
 * candidate and matches every city a recruiter can pick, but is kept out of
 * the options: as a value it would mean "only people who said Anywhere", which
 * is not a question anybody asks.
 */
const CITIES = [
  "Bengaluru",
  "Chennai",
  "Delhi NCR",
  "Hyderabad",
  "Mumbai",
  "Pune",
]

/**
 * Both location filters, through one control — shadcn's Combobox in its
 * `multiple` shape. They are the only two filters here that are not
 * one-of-a-list, so they are the only two that do not go through the radios: a
 * role in one city is usually open to the ones around it, and with a single
 * value seeing who was in reach of three cities meant running the list three
 * times.
 *
 * **In the rail each option carries what the list would hold with that city
 * added**, since a second city widens rather than narrows. In a popover or a
 * table header the count is left out rather than shown wrong.
 */
function LocationPicker({
  label,
  placeholder,
  defaultValue = [],
  counts,
}: {
  label: string
  placeholder: string
  defaultValue?: string[]
  counts?: Record<string, number>
}) {
  const [chosen, setChosen] = React.useState<string[]>(defaultValue)

  return (
    <Combobox
      items={CITIES}
      multiple
      autoHighlight
      value={chosen}
      onValueChange={setChosen}
    >
      <ComboboxChips className="w-full" aria-label={label}>
        <ComboboxValue>
          {chosen.map((city) => (
            <ComboboxChip key={city} aria-label={city}>
              {city}
            </ComboboxChip>
          ))}
        </ComboboxValue>
        {/* The placeholder goes once there are chips: it is the label for an
            empty box, and beside three cities it reads as a fourth. */}
        <ComboboxChipsInput
          placeholder={chosen.length > 0 ? "" : placeholder}
        />
      </ComboboxChips>

      <ComboboxContent>
        <ComboboxEmpty>No matching location.</ComboboxEmpty>
        <ComboboxList>
          {(city: string) => (
            <ComboboxItem key={city} value={city}>
              <span className="min-w-0 flex-1 truncate">{city}</span>
              {counts && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {counts[city]}
                </span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

const REACH: Record<string, number> = {
  Bengaluru: 64,
  Chennai: 71,
  "Delhi NCR": 78,
  Hyderabad: 74,
  Mumbai: 80,
  Pune: 69,
}

/** The height of the sticky tab block. Measured through a ref in the app. */
const TAB_BLOCK = 56

/**
 * THE CARDS VIEW TAKES ITS FILTERS AS A RAIL, once the content column has room
 * for one (`@4xl`). The pills stay for the table and split views, which cannot
 * spare 16rem, and for cards below that width.
 *
 * A FIXED COLUMN, NOT A FLOATING CARD: flush against the nav edge and the tab
 * block (the negative margin cancels the page gutter), exactly as tall as the
 * screen below that block, and sticky there — so the heading and the search
 * never move and only the sections scroll, inside it.
 *
 * **Radios, because each of these filters holds one value**, with "Any …"
 * first, and beside each option how many people it would leave. **There is no
 * Apply**: the rail applies as you pick, because the number beside each choice
 * is the preview a draft would otherwise be for. The two location sections are
 * the exception to the radios — they are pick-many.
 */
function FilterRail() {
  const [open, setOpen] = React.useState(
    () => new Set(["sort", "exp", "notice", "location", "preferred"])
  )

  const sections: {
    key: string
    title: string
    on?: number
    options?: { label: string; count: number; checked?: boolean }[]
    render?: React.ReactNode
  }[] = [
    {
      key: "sort",
      title: "Sort by",
      options: [
        { label: "Most recent", count: 101, checked: true },
        { label: "Best match", count: 101 },
        { label: "Most experience", count: 101 },
        { label: "Soonest available", count: 101 },
      ],
    },
    {
      key: "exp",
      title: "Experience",
      on: 1,
      options: [
        { label: "Any experience", count: 101 },
        { label: "0–3 yrs", count: 4 },
        { label: "4–8 yrs", count: 22 },
        { label: "9–14 yrs", count: 51 },
        { label: "15+ yrs", count: 24, checked: true },
      ],
    },
    {
      key: "notice",
      title: "Notice period",
      options: [
        { label: "Any notice period", count: 101, checked: true },
        { label: "Immediate", count: 9 },
        { label: "30 days", count: 28 },
        { label: "60 days", count: 34 },
      ],
    },
    {
      key: "location",
      title: "Current location",
      on: 1,
      render: (
        <LocationPicker
          label="Current location"
          placeholder="Search locations"
          defaultValue={["Bengaluru"]}
          counts={REACH}
        />
      ),
    },
    {
      key: "preferred",
      title: "Preferred location",
      on: 2,
      render: (
        <LocationPicker
          label="Preferred location"
          placeholder="Search locations"
          defaultValue={["Pune", "Hyderabad"]}
          counts={REACH}
        />
      ),
    },
  ]

  return (
    <aside
      aria-label="Sort and filter"
      style={{ top: TAB_BLOCK, height: `calc(100svh - ${TAB_BLOCK}px)` }}
      className="hidden shrink-0 flex-col border-r bg-background @4xl/main:sticky @4xl/main:-ml-4 @4xl/main:flex @4xl/main:w-64 lg:@4xl/main:-ml-6"
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
        <span className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
          Filters
          <Badge variant="secondary" className="px-1.5">
            4
          </Badge>
        </span>
        <Button variant="link" size="sm" className="px-0">
          Reset all
        </Button>
      </div>

      <div className="relative shrink-0 px-4 py-3">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue=""
          placeholder="Search name, role or skill"
          aria-label="Search responses"
          className="pl-9"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {sections.map((section) => {
          const isOpen = open.has(section.key)
          const Chevron = isOpen ? ChevronDownIcon : ChevronRightIcon

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
                  {section.on && (
                    <Badge variant="secondary" className="px-1.5">
                      {section.on}
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
                  defaultValue={
                    section.options.find((option) => option.checked)?.label
                  }
                >
                  {section.options.map((option) => {
                    const id = `rail-${section.key}-${option.label}`
                    return (
                      <Label
                        key={id}
                        htmlFor={id}
                        className="items-center gap-2 font-normal"
                      >
                        <RadioGroupItem id={id} value={option.label} />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {option.label}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {option.count}
                        </span>
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
 * Insights' applied bar, above the cards: how many match, a removable chip per
 * active filter, and Clear all. **One chip per city, not one per filter** — the
 * two location filters hold lists, and a single "3 locations" chip would make
 * dropping one of them a trip back to the rail. The preferred ones are said
 * with their sense ("Open to Pune"), because the bare city would read as the
 * current-location chip that may be sitting right beside it.
 *
 * Sort is not here: it removes nobody, so there is nothing to undo.
 */
function AppliedFilters() {
  const chips = ["15+ yrs", "Bengaluru", "Open to Pune", "Open to Hyderabad"]

  return (
    <div className="mb-4 hidden flex-wrap items-center gap-2 @4xl/main:flex">
      <span className="text-sm">
        <span className="font-medium tabular-nums">64</span>{" "}
        <span className="text-muted-foreground">of 101 match</span>
      </span>

      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          className="inline-flex items-center gap-1 rounded-4xl border border-border bg-muted/40 py-1 pr-1.5 pl-2.5 text-xs transition-colors hover:bg-muted"
        >
          {chip}
          <XIcon className="size-3 text-muted-foreground" />
          <span className="sr-only">Remove {chip}</span>
        </button>
      ))}

      <Button variant="link" size="sm" className="px-0">
        Clear all
      </Button>
    </div>
  )
}

function ViewSwitcher({ value = "cards" }: { value?: string }) {
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      aria-label="View"
      defaultValue={[value]}
    >
      {VIEWS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={option.label}
        >
          <option.icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/**
 * THE SEMANTIC TOKENS, NOT THE BRAND'S. Tying the tick to `--primary` would
 * make it orange on hirist — the same colour as the Maybe beside it, which is
 * the one pair on this control that must never agree.
 *
 * `resting` is the icon's colour before anything is pressed: only the glyph is
 * tinted, the surface stays clear, so a page of cards does not become a page of
 * traffic lights. `active` fills the same token at `/10` behind it.
 */
const DECISIONS = [
  {
    value: "shortlisted",
    label: "Shortlist",
    icon: CheckIcon,
    resting: "text-success hover:bg-success/10 hover:text-success",
    active: "bg-success/10 text-success data-[pressed]:bg-success/10",
  },
  {
    value: "maybe",
    label: "Maybe",
    icon: CircleHelpIcon,
    resting: "text-warning hover:bg-warning/10 hover:text-warning",
    active: "bg-warning/10 text-warning data-[pressed]:bg-warning/10",
  },
  {
    value: "rejected",
    label: "Not a fit",
    icon: XIcon,
    resting: "text-destructive hover:bg-destructive/10 hover:text-destructive",
    active:
      "bg-destructive/10 text-destructive data-[pressed]:bg-destructive/10",
  },
]

/**
 * Yes, maybe, no — one segmented control, because they are one question.
 * Clicking the active one clears it, which puts the candidate back in To
 * review.
 */
function Decisions({ applicant }: { applicant: Applicant }) {
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      aria-label={`Decision for ${applicant.name}`}
      defaultValue={
        DECISIONS.some((decision) => decision.value === applicant.status)
          ? [applicant.status]
          : []
      }
    >
      {DECISIONS.map((decision) => (
        <ToggleGroupItem
          key={decision.value}
          value={decision.value}
          aria-label={decision.label}
          className={
            applicant.status === decision.value
              ? decision.active
              : decision.resting
          }
        >
          <decision.icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** How many tags a card draws before the rest become a count. */
const TAGS_SHOWN = 3

function TagsBucket({ tags }: { tags: string[] }) {
  const shown = tags.slice(0, TAGS_SHOWN)
  const rest = tags.slice(TAGS_SHOWN)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((tag) => (
        <Badge key={tag} variant="secondary" className="font-normal">
          {tag}
        </Badge>
      ))}

      {/* `+2` IS A HANDLE, NOT A FULL STOP. Truncating silently would leave a
          card that has more to say looking like one that does not, and a count
          you cannot open is the same thing with a number on it — so the rest
          are on hover, in the order they would have been drawn. */}
      {rest.length > 0 && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge
                variant="outline"
                className="font-normal text-muted-foreground"
              />
            }
          >
            +{rest.length}
            <span className="sr-only"> more: {rest.join(", ")}</span>
          </TooltipTrigger>
          <TooltipContent>{rest.join(" · ")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function LocationBucket({ applicant }: { applicant: Applicant }) {
  const elsewhere = applicant.preferredLocations.filter(
    (place) => place !== applicant.location
  )

  return (
    <span className="text-muted-foreground">
      <span className="font-medium text-foreground">{applicant.location}</span>
      {elsewhere.length > 0 && <> · open to {elsewhere.join(", ")}</>}
    </span>
  )
}

/**
 * LinkedIn Recruiter's shape: a column of labels down the left, the facts
 * beside them. Labels give the eye a fixed left edge to run down, so comparing
 * the education of the third and the ninth candidate is a vertical scan rather
 * than a hunt.
 *
 * ONE `grid`, NOT A TWO-COLUMN FLEX PER ROW. A fixed first track means every
 * label in the card shares an edge even when one value wraps to six lines.
 */
function BucketRows({ applicant }: { applicant: Applicant }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-border pt-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
      {/* ABOVE EXPERIENCE, BECAUSE IT IS THE SUMMARY OF IT. "Leads a team",
          the sector, "Top institute", the tenure — what a recruiter would come
          away with after reading the roles, the employer and the school. Under
          them it would be a conclusion drawn after its own evidence. */}
      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        Tags
      </dt>
      <dd className="min-w-0">
        <TagsBucket tags={applicant.tags} />
      </dd>

      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        Experience
      </dt>
      <dd className="flex min-w-0 flex-col items-start gap-0.5 leading-6">
        <span>{applicant.experience}</span>
        {applicant.positions.map((position) => (
          <span key={position.role} className="text-muted-foreground">
            {position.role} · {position.span}
          </span>
        ))}
      </dd>

      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        Education
      </dt>
      <dd className="min-w-0 leading-6">{applicant.education}</dd>

      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        Skills
      </dt>
      <dd className="flex min-w-0 flex-wrap gap-1.5">
        {applicant.skills.map((skill) => (
          <Badge
            key={skill}
            variant={REQUIRED_SKILLS.includes(skill) ? "secondary" : "outline"}
          >
            {skill}
          </Badge>
        ))}
      </dd>

      {/* WHERE THEY ARE AND WHERE THEY WOULD GO, in one line: the two only
          mean anything together, so the current city is repeated here as the
          emphasis rather than left to the meta row above. */}
      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        Location
      </dt>
      <dd className="min-w-0 leading-6">
        <LocationBucket applicant={applicant} />
      </dd>

      <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
        Availability
      </dt>
      <dd className="min-w-0 leading-6">
        {applicant.salary} · {applicant.notice} notice
      </dd>
    </dl>
  )
}

/**
 * RIGHT-ALIGNED, under the decision group it shares an edge with. The card has
 * one column of controls down its right side — decide at the top, act at the
 * bottom — instead of controls in one corner and a row starting from the
 * opposite one. On a list this long the right edge is the only part of a card
 * whose position is predictable.
 *
 * Contact details are the exception, pinned left by `mr-auto`: the other three
 * act on a candidate, this discloses a fact about them, and once pressed it is
 * replaced by that fact — so the reveal happens where the button was.
 */
function CardActions() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <Button variant="ghost" size="sm" className="mr-auto">
        Show contact details
      </Button>
      <Button variant="ghost" size="sm">
        <MailIcon data-icon="inline-start" />
        Message
      </Button>
      <Button variant="outline" size="sm">
        View profile
      </Button>
    </div>
  )
}

function ApplicantCard({
  applicant,
  picked = false,
}: {
  applicant: Applicant
  /** Ticked for the selection bar. Every card carries the box. */
  picked?: boolean
}) {
  return (
    <Item className="@container/card flex-col items-stretch gap-3 bg-card px-5 py-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* Beside the photo, on its middle: the tick is about the person. */}
          <Checkbox
            defaultChecked={picked}
            aria-label={`Select ${applicant.name}`}
            className="mt-4"
          />
          {/* Initials, not a photograph. A recruiter screening on a face is
              the failure mode this whole screen should not encourage — the
              avatar is here to anchor the row, not to show anybody. */}
          <ApplicantAvatar applicant={applicant} className="size-12" />

          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* THE NAME IS THE CONTROL, not the card. "View profile" stays at
                  the foot, because a name that happens to be a link is not a
                  discoverable way to find out there is a profile at all — and a
                  click target wrapped around three decisions, a checkbox and a
                  menu is one you cannot avoid hitting. */}
              <button
                type="button"
                className="rounded-sm text-left font-heading text-base font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {applicant.name}
              </button>
              {isNew(applicant) ? (
                <span className="sr-only">New</span>
              ) : (
                <StatusBadge status={applicant.status} />
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {applicant.title} at {applicant.company}
            </span>
            <Meta>
              <MetaItem>{applicant.location}</MetaItem>
              <MetaItem>Applied {applicant.appliedAgo}</MetaItem>
            </Meta>
          </div>
        </div>

        {/* Decide, at the top of the right-hand column. */}
        <div className="-my-1.5 -mr-2 shrink-0">
          <Decisions applicant={applicant} />
        </div>
      </div>

      <BucketRows applicant={applicant} />
      <CardActions />
    </Item>
  )
}

/**
 * The heading over one run of To review. The count is the run's own; the aside
 * is what the run is — for New, how far through today's arrivals you are.
 */
function QueueHeading({
  title,
  count,
  aside,
  /** In the split column, where it is a bar the rows scroll under. */
  compact = false,
}: {
  title: string
  count: number
  aside: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5",
        // In the split column the heading is a bar the rows scroll under, the
        // way "Filters" is in the rail — so it carries its own background and
        // border rather than riding along with the list.
        //
        // `z-20`, not `z-10`, for the same reason the tab toolbar is: the "new"
        // dot on an avatar is `AvatarBadge`'s own `z-10` and sits later in the
        // DOM, so a tie paints it over the bar it is scrolling under.
        compact
          ? "sticky top-0 z-20 border-b bg-background px-3 py-2.5"
          : "pt-2 first:pt-0"
      )}
    >
      <h3 className="text-sm font-medium">
        {title}{" "}
        <span className="font-normal text-muted-foreground tabular-nums">
          · {count}
        </span>
      </h3>
      <span className="text-xs text-muted-foreground tabular-nums">
        {aside}
      </span>
    </div>
  )
}

/**
 * TO REVIEW IS TWO RUNS UNDER HEADINGS — New since the last visit, then
 * Earlier: the day's work in the order you do it. Every other tab is one run
 * of that tab's people, with no heading.
 */
const RUNS = [
  {
    key: "new",
    title: `New since ${LAST_VISIT}`,
    count: QUEUE.fresh,
    aside: `${QUEUE.done} of ${QUEUE.arrived} done`,
    test: (applicant: Applicant) => applicant.fresh,
  },
  {
    key: "earlier",
    title: "Earlier",
    count: QUEUE.earlier,
    aside: "Skipped, or not reached yet",
    test: (applicant: Applicant) => !applicant.fresh,
  },
]

/**
 * Ticks everybody in the tab — all of it, not the page on screen, which is why
 * it says the number. Half-ticked when some are.
 */
function SelectAll({ count, picked = 0 }: { count: number; picked?: number }) {
  const every = picked === count
  return (
    <label className="flex w-fit items-center gap-2 px-5 text-sm text-muted-foreground">
      <Checkbox
        checked={every}
        indeterminate={picked > 0 && !every}
        aria-label={every ? "Clear selection" : `Select all ${count}`}
      />
      {every ? "Clear selection" : `Select all ${count}`}
    </label>
  )
}

function CardList({
  bucket,
  picked = [],
}: {
  bucket: Status | "all"
  /** Ids ticked, for the selection stories. */
  picked?: string[]
}) {
  if (bucket === "undecided") {
    const queue = APPLICANTS.filter((a) => a.status === "undecided")
    return (
      <div className="flex flex-col gap-3">
        <SelectAll
          count={BUCKETS.find((b) => b.value === "undecided")!.count}
          picked={picked.length}
        />
        {RUNS.map((run) => (
          <React.Fragment key={run.key}>
            <QueueHeading
              title={run.title}
              count={run.count}
              aside={run.aside}
            />
            <div role="list" className="flex flex-col gap-3">
              {queue.filter(run.test).map((applicant) => (
                <ApplicantCard
                  key={applicant.id}
                  applicant={applicant}
                  picked={picked.includes(applicant.id)}
                />
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    )
  }

  const people =
    bucket === "all"
      ? APPLICANTS
      : APPLICANTS.filter((applicant) => applicant.status === bucket)

  return (
    <div role="list" className="flex flex-col gap-3">
      {people.map((applicant) => (
        <ApplicantCard key={applicant.id} applicant={applicant} />
      ))}
    </div>
  )
}

/**
 * A row in the split view's list. No rounding at `@3xl` — the column is not a
 * card there, so the selected row is a full-bleed band rather than a pill
 * inside one.
 */
function SplitRow({
  applicant,
  selected,
}: {
  applicant: Applicant
  selected: boolean
}) {
  return (
    <button
      type="button"
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group/split flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors @3xl/main:rounded-none",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        selected ? "bg-muted" : "hover:bg-muted/60"
      )}
    >
      <ApplicantAvatar applicant={applicant} className="size-10" />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {applicant.name}
          </span>
          {isNew(applicant) ? (
            <span className="sr-only">New</span>
          ) : (
            <StatusBadge status={applicant.status} />
          )}
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {applicant.title} at {applicant.company}
        </span>
        <Meta className="text-[0.6875rem]">
          <MetaItem>{applicant.experience}</MetaItem>
          <MetaItem>{applicant.notice} notice</MetaItem>
        </Meta>
      </div>
    </button>
  )
}

/** The page's own bottom gutter, cancelled so the columns reach the edge. */
const SPLIT_CHROME = 44

/**
 * A thin list beside a whole profile — the view for reading rather than
 * scanning.
 *
 * **THE LIST IS THE FILTER RAIL'S COLUMN.** Both are "the column beside the
 * work", so at `@3xl` this drops the rounding, the ring and the card fill, runs
 * flush against the nav (a negative margin cancelling the page gutter) and
 * divides with a `border-r` — and its run headings pin themselves the way the
 * rail's heading does. A rounded card in one view and a flush column one view
 * away was the same furniture in two shapes. Below the breakpoint the columns
 * stack and it goes back to being a card, because nothing is beside it to be a
 * column against.
 *
 * **It fills the viewport exactly, to the bottom edge, and the page does not
 * scroll behind it.** The height is `100svh` less the header and the measured
 * tab block — those two are everything above it, so the rest of the screen is
 * what it gets. `SPLIT_CHROME`, the page's own bottom gutter, is then cancelled
 * as a NEGATIVE BOTTOM MARGIN rather than taken off the height: subtract it and
 * the columns stop short with a band of mist under them.
 *
 * **Both columns are `relative`, and that is load-bearing.** `sr-only` is
 * `position: absolute`, and without a containing block the "New" label on every
 * row resolves against `main` — so a hundred rows scrolled out of sight still
 * stake out a hundred rows of document, and the page scrolls past a screen that
 * looks full.
 */
function SplitView() {
  const queue = APPLICANTS.filter((a) => a.status === "undecided")
  const selected = queue[0]!

  return (
    <div
      style={
        {
          "--split-top": `calc(var(--header-height) + ${TAB_BLOCK}px)`,
          "--split-chrome": `${SPLIT_CHROME}px`,
        } as React.CSSProperties
      }
      className="flex flex-col gap-4 @3xl/main:-mt-4 @3xl/main:mb-[calc(var(--split-chrome)*-1)] @3xl/main:h-[calc(100svh-var(--split-top))] @3xl/main:flex-row"
    >
      <div
        role="list"
        className="relative flex shrink-0 flex-col gap-1 overflow-y-auto rounded-2xl bg-card p-1.5 ring-1 ring-foreground/10 @3xl/main:-ml-4 @3xl/main:w-80 @3xl/main:gap-0 @3xl/main:rounded-none @3xl/main:border-r @3xl/main:bg-background @3xl/main:p-0 @3xl/main:ring-0 lg:@3xl/main:-ml-6"
      >
        {RUNS.map((run) => (
          <React.Fragment key={run.key}>
            <QueueHeading
              compact
              title={run.title}
              count={run.count}
              aside={run.aside}
            />
            {queue.filter(run.test).map((applicant) => (
              <SplitRow
                key={applicant.id}
                applicant={applicant}
                selected={applicant.id === selected.id}
              />
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* `p-px` is load-bearing. The card below is ringed, and a ring is a
          box-shadow drawn OUTSIDE the border box — so with the card filling
          this pane edge to edge, its outline lands in the overflow and
          `overflow-y-auto` (which clips both axes, not just the one named) cuts
          all four sides off. One pixel gives the ring somewhere to sit. */}
      <div className="relative min-w-0 flex-1 overflow-y-auto p-px @3xl/main:pt-4">
        <div className="flex flex-col gap-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <ApplicantAvatar applicant={selected} className="size-12" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-heading text-base font-medium">
                  {selected.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {selected.title} at {selected.company}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Decisions applicant={selected} />
              <Button variant="outline" size="sm">
                <UserRoundIcon data-icon="inline-start" />
                Open profile
              </Button>
            </div>
          </div>

          <BucketRows applicant={selected} />
        </div>
      </div>
    </div>
  )
}

/**
 * A sortable, filterable, hideable column heading — shadcn's
 * `DataTableColumnHeader`, as a POPOVER rather than its dropdown menu. A header
 * filter is a text box or a set of radios, and neither belongs in a menu:
 * typing in a menu fights its type-ahead, and Base UI's menu group parts throw
 * outside their groups.
 *
 * A primary dot beside the label means that column is filtered. The sort arrow
 * is `⇅` faded until the column is the one being sorted on.
 */
function ColumnHead({
  title,
  align = "start",
  sorted = false,
  filtered = false,
  filter,
  open,
}: {
  title: string
  align?: "start" | "end"
  sorted?: false | "asc" | "desc"
  filtered?: boolean
  filter?: React.ReactNode
  /** Drawn open, for the story that shows the popover. */
  open?: boolean
}) {
  const SortIcon =
    sorted === "asc"
      ? ArrowUpIcon
      : sorted === "desc"
        ? ArrowDownIcon
        : ChevronsUpDownIcon

  return (
    <div className={cn("flex", align === "end" && "justify-end")}>
      <Popover open={open}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "-mx-2 h-8 gap-1 px-2 font-medium text-muted-foreground data-popup-open:bg-accent",
                (sorted || filtered) && "text-foreground"
              )}
            />
          }
        >
          {title}
          {filtered && (
            <span
              aria-label="Filtered"
              className="size-1.5 rounded-full bg-primary"
            />
          )}
          <SortIcon className={cn("size-3.5!", !sorted && "opacity-50")} />
        </PopoverTrigger>

        <PopoverContent
          align={align === "end" ? "end" : "start"}
          className="w-60 gap-1 p-1"
        >
          <HeaderAction icon={ArrowUpIcon} active={sorted === "asc"}>
            Sort ascending
          </HeaderAction>
          <HeaderAction icon={ArrowDownIcon} active={sorted === "desc"}>
            Sort descending
          </HeaderAction>
          {sorted && <HeaderAction icon={XIcon}>Clear sort</HeaderAction>}

          {filter && (
            <>
              <Separator className="my-1" />
              <div className="px-2 py-1.5">{filter}</div>
            </>
          )}

          <Separator className="my-1" />
          <HeaderAction icon={EyeOffIcon}>Hide column</HeaderAction>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function HeaderAction({
  icon: Icon,
  active = false,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent",
        active && "font-medium text-primary"
      )}
    >
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </button>
  )
}

/**
 * The columns the table can show. Three are off by default — Match, Education
 * and Status — because the table is for comparing the numbers and those three
 * are read one row at a time.
 */
const TABLE_COLUMNS = [
  { id: "location", label: "Location", on: true },
  { id: "experience", label: "Exp", on: true },
  { id: "salary", label: "Current", on: true },
  { id: "notice", label: "Notice", on: true },
  { id: "applied", label: "Applied", on: true },
  { id: "match", label: "Match", on: false },
  { id: "education", label: "Education", on: false },
  { id: "status", label: "Status", on: false },
]

/**
 * shadcn's `DataTableViewOptions`, reading the column list rather than a table
 * instance — it sits in the tab row, and every tab renders its own table.
 */
function ColumnsMenu({ open }: { open?: boolean }) {
  return (
    <DropdownMenu open={open}>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            <Columns3Icon data-icon="inline-start" />
            Columns
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-48">
        {/* The label INSIDE a group — Base UI's GroupLabel throws outside one. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show columns</DropdownMenuLabel>
          {TABLE_COLUMNS.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.on}
              closeOnClick={false}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Reset columns</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The Location header's filter — the pills' own control, in the popover. */
function LocationHeaderFilter() {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        Current location
      </span>
      <LocationPicker
        label="Current location"
        placeholder="Search locations"
        defaultValue={["Bengaluru"]}
      />
    </div>
  )
}

/**
 * The same applicants, one to a line.
 *
 * THE COLUMNS ARE THE CARD'S FACTS, IN THE CARD'S ORDER, so switching view
 * moves the information around rather than changing what there is to know.
 * Name and current role share the first cell, stacked as on the card. The
 * skills are the one thing that does not come across: three badges per row is
 * the widest column on the table and the least comparable thing on it.
 *
 * New is a dot in a slot every row reserves, so the names line up whether it is
 * there or not. To review's two runs are heading rows spanning the table, so
 * New and Earlier stay one table with one set of columns.
 *
 * Numbers are right-aligned and tabular so pay and notice line up — that
 * alignment is the entire reason to be in this view.
 */
function ApplicantTable() {
  const queue = APPLICANTS.filter((a) => a.status === "undecided")

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-10 pr-0">
            <Checkbox aria-label="Select all 101" />
          </TableHead>
          <TableHead>
            <ColumnHead title="Candidate" />
          </TableHead>
          <TableHead>
            <ColumnHead
              title="Location"
              filtered
              filter={<LocationHeaderFilter />}
            />
          </TableHead>
          <TableHead className="text-right">
            <ColumnHead title="Exp" align="end" sorted="desc" />
          </TableHead>
          <TableHead className="text-right">
            <ColumnHead title="Current" align="end" />
          </TableHead>
          <TableHead className="text-right">
            <ColumnHead title="Notice" align="end" />
          </TableHead>
          <TableHead>
            <ColumnHead title="Applied" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {RUNS.map((run) => (
          <React.Fragment key={run.key}>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableCell colSpan={7} className="py-2 whitespace-normal">
                <QueueHeading
                  title={run.title}
                  count={run.count}
                  aside={run.aside}
                />
              </TableCell>
            </TableRow>
            {queue.filter(run.test).map((applicant) => (
              <TableRow key={applicant.id}>
                <TableCell className="w-10 pr-0">
                  <Checkbox aria-label={`Select ${applicant.name}`} />
                </TableCell>
                <TableCell>
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        isNew(applicant) ? "bg-primary" : "invisible"
                      )}
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {applicant.name}
                        {isNew(applicant) && (
                          <span className="sr-only">, new</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {applicant.title} at {applicant.company}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {applicant.location}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {applicant.experience}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {applicant.salary}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {applicant.notice}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {applicant.appliedAgo}
                </TableCell>
              </TableRow>
            ))}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * A decision takes the card out of the list the instant it is made — that is
 * what makes the queue shrink — so a misclick is undone from where you are,
 * not by finding the person again in another tab. In the app it sits fixed at
 * the bottom of the screen for six seconds; here it is drawn in place.
 */
/**
 * THE UNDO IS A TOAST NOW, not a centred black pill. Same words and the same
 * six seconds, but a white pill in the bottom-right corner with a close X — and
 * it leads with the candidate's face, because the decision has just taken the
 * card off the screen and the name in a sentence is otherwise the only trace
 * left of which of a hundred near-identical rows this was.
 *
 * Mounted once in the app as `AppToaster`, which composes the parts rather than
 * using the shipped `Toaster`: where a toast sits is the app's problem, and it
 * moves aside by `--athena-width` when the copilot is open. See
 * **Components → Toast**.
 */
function UndoToast({
  message,
  faces,
}: {
  message: string
  faces: Applicant[]
}) {
  const manager = React.useMemo(() => createToastManager(), [])

  React.useEffect(() => {
    manager.add({
      title: message,
      timeout: 0,
      data: { faces },
      actionProps: { children: "Undo" },
    })
  }, [manager, message, faces])

  return (
    <ToastProvider toastManager={manager}>
      {/* `absolute`, not the app's `fixed`, so a Docs page can show the toast
          without it floating over the documentation. */}
      <div className="relative h-40 w-full overflow-hidden rounded-2xl border bg-canvas">
        <ToastViewport className="absolute sm:max-w-md">
          <UndoToastList />
        </ToastViewport>
      </div>
    </ToastProvider>
  )
}

function UndoToastList() {
  const { toasts } = useToastManager()

  return toasts.map((item) => {
    const faces = (item.data as { faces?: Applicant[] })?.faces ?? []

    return (
      <Toast key={item.id} toast={item}>
        <ToastContent>
          {/* Where the stock component puts its type icon. Past three the
              count in the sentence does the work. */}
          <AvatarGroup className="shrink-0">
            {faces.slice(0, 3).map((applicant) => (
              <Avatar key={applicant.id} size="sm">
                <AvatarFallback>{initials(applicant.name)}</AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <ToastTitle />
          </div>
          <ToastAction />
          <ToastClose />
        </ToastContent>
      </Toast>
    )
  })
}

/** Ghost controls on the dark pill, where the system's ghost would vanish. */
const ON_BAR =
  "rounded-full text-background hover:bg-background/15 hover:text-background dark:hover:bg-background/15"

/**
 * What to do with the ticked people. The card's three decisions, in the same
 * order and icons, with one Undo for the whole batch; a ⋯ menu for the rarer
 * actions; and Athena, for one to three people only — a comparison holds three,
 * so past that she steps off the bar rather than sitting there disabled.
 */
function SelectionBar({ count }: { count: number }) {
  return (
    <div
      role="region"
      aria-label="Selected candidates"
      className="flex w-fit items-center gap-1 rounded-full bg-foreground py-1.5 pr-1.5 pl-4 text-sm whitespace-nowrap text-background shadow-lg"
    >
      <span className="mr-1 tabular-nums">{count} selected</span>
      {DECISIONS.map((decision) => (
        <Button
          key={decision.value}
          size="icon-sm"
          variant="ghost"
          aria-label={`${decision.label} ${count}`}
          className={ON_BAR}
        >
          <decision.icon />
        </Button>
      ))}
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="More actions for the selected"
        className={ON_BAR}
      >
        <EllipsisIcon />
      </Button>
      {count <= 3 && (
        <Button size="sm" className="ml-1 rounded-full">
          <SparklesIcon data-icon="inline-start" />
          {count === 1 ? "Ask Athena" : "Compare in Athena"}
        </Button>
      )}
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Clear selection"
        className={ON_BAR}
      >
        <XIcon />
      </Button>
    </div>
  )
}

const MENU =
  "flex w-60 flex-col rounded-2xl bg-popover p-1 text-popover-foreground shadow-2xl ring-1 ring-foreground/5 dark:ring-foreground/10"
const MENU_ITEM =
  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm [&_svg]:size-4 [&_svg]:shrink-0"

/**
 * The bar's ⋯ menu, drawn open with Save to list's submenu beside it. Save
 * ADDS everybody to a list and removes nobody from any — the card's own menu
 * toggles one person's lists, but a dozen people are already in a dozen lists.
 * Message writes a draft into each thread; Set up interviews opens the plan
 * below.
 */
function SelectionMenu({ count }: { count: number }) {
  return (
    <div className="flex items-end gap-1">
      <div className={MENU}>
        <div className={cn(MENU_ITEM, "bg-accent text-accent-foreground")}>
          <BookmarkIcon />
          Save to list
          <ChevronRightIcon className="ml-auto" />
        </div>
        <div className={MENU_ITEM}>
          <CalendarPlusIcon />
          Set up {count} interviews
        </div>
        <div className={MENU_ITEM}>
          <MailIcon />
          Message {count}
        </div>
        <div className={MENU_ITEM}>
          <DownloadIcon />
          Download {count} CVs
        </div>
      </div>
      <div className={MENU}>
        <p className="px-3 py-2.5 text-xs text-muted-foreground">
          Add {count} people to
        </p>
        {["Bench — Principal Engineer", "Silver medalists", "Referrals"].map(
          (list) => (
            <div key={list} className={MENU_ITEM}>
              {list}
            </div>
          )
        )}
        <div className="-mx-1 my-1 h-px bg-border" />
        <div className={MENU_ITEM}>New list…</div>
      </div>
    </div>
  )
}

/**
 * "Set up N interviews", drawn in place rather than as a modal. It asks only
 * what the batch shares — one calendar and a start day — and lays people into
 * that calendar's free slots in tick order, skipping slots already taken. The
 * plan is shown before Send; somebody who already has a slot is skipped, not
 * moved, and somebody who does not fit says so.
 */
function BulkInterviews() {
  const plan = [
    { name: "Kavya Sharma", when: "16 Sep, 10:00 – 10:30 AM" },
    { name: "Shreya Iyer", when: "16 Sep, 11:30 AM – 12:00 PM" },
    { name: "Aman Pillai", when: "16 Sep, 2:00 – 2:30 PM" },
    {
      name: "Siddharth Desai",
      when: "Skipped — already booked 18 Sep, 4:00 – 4:30 PM",
      muted: true,
    },
    { name: "Sneha Reddy", when: "16 Sep, 4:00 – 4:30 PM" },
  ]

  const field = (label: string, value: string) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex h-9 items-center justify-between rounded-4xl border border-input bg-input/30 px-3 text-sm">
        {value}
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </div>
    </div>
  )

  return (
    <div className="flex w-full max-w-lg flex-col gap-4 rounded-4xl bg-background p-6 shadow-2xl ring-1 ring-foreground/5">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-base font-medium">
          Set up 5 interviews
        </h2>
        <p className="text-sm text-muted-foreground">
          Each person gets the next free slot in one calendar, in the order you
          ticked them. Nothing is sent until you press Send.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("Calendar", "Anurag Yadav")}
        {field("From", "16 Sep 2026")}
      </div>
      <ul className="flex flex-col divide-y rounded-xl bg-muted/50 text-sm">
        {plan.map((row) => (
          <li
            key={row.name}
            className="flex items-baseline justify-between gap-3 px-3 py-2"
          >
            <span className={row.muted ? "text-muted-foreground" : undefined}>
              {row.name}
            </span>
            <span
              className={cn(
                "text-right text-xs",
                row.muted ? "text-muted-foreground" : "tabular-nums"
              )}
            >
              {row.when}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>
          <CalendarCheckIcon data-icon="inline-start" />
          Send 4 invites
        </Button>
      </div>
    </div>
  )
}

/**
 * THE PROFILE PANEL FLOATS. It used to be flush against the right edge, full
 * height, bordered only on its left. It is inset now — 12px from the top, right
 * and bottom, `rounded-2xl`, a border on all four sides and `overflow-hidden`
 * so the header and the CV clip to the corners.
 *
 * Only this sheet. The mobile nav is a `Sheet` too and stays flush, where the
 * sheet *is* the side of the screen.
 *
 * One trap: the stock `h-full` had to become `h-auto`. It is `100vh` measured
 * against the viewport, so an inset top hung the bottom off the bottom of the
 * screen.
 *
 * Drawn in place here rather than opened, so a Docs page can show it without
 * covering itself.
 */
function ProfilePanel() {
  const applicant = APPLICANTS[0]!

  return (
    <div className="relative h-[460px] w-full overflow-hidden rounded-2xl border bg-canvas">
      {/* The page behind it, so the inset is visible as an inset. */}
      <div aria-hidden className="flex flex-col gap-3 p-4 opacity-40">
        <div className="h-8 w-64 rounded-lg bg-muted" />
        <div className="h-24 rounded-2xl bg-card ring-1 ring-foreground/10" />
        <div className="h-24 rounded-2xl bg-card ring-1 ring-foreground/10" />
      </div>

      <div className="absolute inset-y-3 right-3 flex w-[calc(50%---spacing(6))] flex-col overflow-hidden rounded-2xl border bg-background shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b p-5">
          <div className="flex min-w-0 items-start gap-3">
            <ApplicantAvatar applicant={applicant} className="size-12" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-heading text-base font-medium">
                {applicant.name}
              </span>
              <span className="text-sm text-muted-foreground">
                {applicant.title} at {applicant.company}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close">
            <XIcon />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <BucketRows applicant={applicant} />
        </div>
      </div>
    </div>
  )
}

function ResponseManager({
  picked = [],
  view = "cards",
}: {
  picked?: string[]
  view?: "cards" | "table" | "split"
}) {
  return (
    // The content column is mist; the bar above it and the tab toolbar under
    // it paint their own white, so the page reads as two white bands with the
    // work between them.
    <div
      style={
        {
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
      className="flex min-h-svh flex-col bg-canvas"
    >
      <TopBar>
        <JobHeader />
      </TopBar>

      <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
        <Tabs className="gap-4" defaultValue="undecided">
          {/* THE STICKY TAB TOOLBAR IS THE FIRST THING IN THE COLUMN, now that
              the header band has moved into the bar. It cancels the page's top
              padding (`-mt-4 md:-mt-6`) and its own gutter, so it runs straight
              into the bar as one white block and its border is the only
              divider. */}
          <div className="sticky top-0 z-20 -mx-4 -mt-4 flex flex-col gap-4 border-b border-border bg-card px-4 py-2 md:-mt-6 lg:-mx-6 lg:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList className="max-w-full overflow-x-auto">
                {BUCKETS.map((bucket) => (
                  <TabsTrigger key={bucket.value} value={bucket.value}>
                    {bucket.label}
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {bucket.count}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex items-center gap-2">
                {/* Left of the view toggle, and only in the view it acts on. */}
                {view === "table" && <ColumnsMenu />}
                <ViewSwitcher value={view} />
              </div>
            </div>

            {/* THE CARDS VIEW TAKES ITS FILTERS AS A RAIL once there is room
                for one; the pills stay for the table and split views, which
                cannot spare 16rem, and for cards below `@4xl`. */}
            <div className={cn(view === "cards" && "@4xl/main:hidden")}>
              <FilterBar />
            </div>
          </div>

          <div
            className={cn(
              "flex flex-col",
              view === "cards" &&
                "gap-4 @4xl/main:-mt-4 @4xl/main:flex-row @4xl/main:items-start"
            )}
          >
            {view === "cards" && <FilterRail />}

            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col",
                view === "cards" && "@4xl/main:pt-4"
              )}
            >
              {view === "cards" && <AppliedFilters />}

              {BUCKETS.map((bucket) => (
                <TabsContent key={bucket.value} value={bucket.value}>
                  {view === "table" ? (
                    <ApplicantTable />
                  ) : view === "split" ? (
                    <SplitView />
                  ) : (
                    <CardList bucket={bucket.value} picked={picked} />
                  )}
                </TabsContent>
              ))}
            </div>
          </div>
        </Tabs>

        {/* Fixed to the bottom of the screen in the app; sticky here, so a
            story scrolls with the bar in view. */}
        {picked.length > 0 && (
          <div className="sticky bottom-6 flex justify-center">
            <SelectionBar count={picked.length} />
          </div>
        )}
      </div>
    </div>
  )
}

const meta = {
  title: "Compositions/Response manager",
  parameters: {
    design: designComposition("response-manager"),
    layout: "fullscreen",
    docs: {
      description: {
        component: `
One job, and everybody who applied to it. Mirrors
\`apps/web/src/routes/job.tsx\` — the biggest surface in the prototype.

**The posting's header is the top bar.** A screen about one object speaks for
itself up there, so the route title ("Jobs") steps aside and the bar carries the
back button, the job, its badges and the meta. The white band that used to say
all this above the tabs is gone with it, and the sticky tab toolbar runs
straight into the bar as one white block over the mist column.

**Organised by decision, not by reading.** A recruiter comes back each day to
the same question: who still needs a decision from me, and who arrived since I
was last here. So the page opens on **To review** — everybody without a
decision — and the tabs after it are where decisions land: Maybe, Shortlisted,
Contacted, then Not a fit and All last. Whether a card was *opened* is not
something the screen tracks.

**To review is two runs.** *New since yesterday, 4:10 pm*, with how many of
today's arrivals are done, then *Earlier* — skipped, or not reached yet. The
line between them is fixed for the whole visit, so refreshing cannot quietly
empty New. The same two runs head the cards, the table and the split list.

**The dot means new** — applied since the last visit and still undecided — on
the avatar's corner, or in a reserved slot in the table. Decisions keep their
badges; no decision gets none.

**A decision leaves the list at once**, which is what makes the queue shrink,
with an undo bar for the misclick.

**Every card and row has a checkbox**, and "Select all N" ticks the whole tab.
Ticking brings up the selection bar: the three decisions for everybody at once
(one Undo for the batch), a ⋯ menu with Save to list, Set up interviews,
Message and Download CVs, and Athena — Ask for one person, Compare for two or
three. Nothing in the menu sends anything: Message writes drafts, and Set up
interviews shows its plan before Send. See **Compositions → Athena** for what
she answers with.

**Most recent or Best match.** The sort pill switches between them; in To
review it sorts inside New and inside Earlier, never across.

**The card opens with Tags** — "Leads a team", the sector, "Top institute", the
tenure — above Experience, because it is the summary of it. Every one is derived
from facts already on the card, never dealt, so a tag cannot disagree with the
block below it. Three are shown and the rest counted as a \`+N\` you can hover:
a handle rather than a full stop.

**Location is two filters and one card row**: where they are, and where they
would go. "Noida · open to Pune, Anywhere", the current city repeated as the
emphasis because the two only mean anything together.

**A triage screen, not a profile reader.** A card carries only what you judge
on at a glance, and the decision — yes, maybe, no — is on the card.

**Three views, three densities, none of them the winner.** Cards are for
scanning. The table is for comparing: one line a person with every number in a
column. Split is for reading — a thin list beside a whole profile.

**The filters are a rail in the cards view, pills everywhere else.** Once the
content column is \`@4xl\` wide the cards take a fixed column flush against the
nav — heading and search pinned, sections scrolling inside it, and beside each
option how many people it would leave. The table and split views cannot spare
16rem, so they keep the pills; below \`md\` every pill opens the one drawer
instead. See Components → Popover, Command, Combobox and Drawer.

**The pill row is a draft, applied on a button; the rail is not.** Picking in a
pill changes its label but not the list, so "12+ years, in Pune" lands as one
change instead of the list shuffling twice on the way to a question nobody
asked. The rail applies as you pick, because the count beside each choice is the
preview a draft would otherwise be for — and the two are never on screen
together. Sort is outside the draft: it removes nobody.

**In the table, every heading is a control** — sort, the column's own filter,
hide — and a **Columns** button beside the view toggle turns three off-by-default
columns on. In the split view the list is the rail's column: flush, bordered,
its run headings pinned, and both columns filling the viewport to the bottom
edge.

**A decision confirms as a toast**, bottom right, carrying the candidate's face
— see Components → Toast.

In the app the tab, view, sort, filters, selected candidate, open profile
panel and CV/profile tab all live in the query string, so any state worth
showing someone is in the URL.
        `,
      },
    },
  },
} satisfies StoryMeta

export default meta

type Story = StoryObj<typeof meta>

export const FullPage: Story = {
  name: "Response manager — full page",
  render: () => <ResponseManager />,
}

const padded: Decorator = (Story) => (
  <div className="@container/main mx-auto max-w-4xl p-6">
    <Story />
  </div>
)

/**
 * The posting's header, in the bar it now lives in. The route title ("Jobs")
 * steps aside while anything fills the slot, so the page says where you are
 * once rather than twice.
 */
export const JobHeaderStory: Story = {
  name: "Job header, in the top bar",
  render: () => (
    <div
      style={
        {
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
      className="bg-canvas p-6"
    >
      <div className="overflow-hidden rounded-2xl border bg-background">
        <TopBar>
          <JobHeader />
        </TopBar>
      </div>
    </div>
  ),
}

/**
 * **Cards, with the filters as a rail.** Once the content column is `@4xl`
 * wide the pill row steps aside for a fixed column flush against the nav: the
 * "Filters" heading and the search pinned, the collapsible sections scrolling
 * inside it, and beside each option how many people it would leave.
 *
 * It applies as you pick, unlike the pill row, because it has the room to print
 * the consequence beside each choice — the number is the preview a draft would
 * otherwise be for.
 */
export const CardsWithRail: Story = {
  name: "Cards, with the filter rail",
  render: () => <ResponseManager />,
}

/**
 * **Split is for reading** — a thin list beside a whole profile. The list is
 * the rail's column: flush against the nav, divided with a border, its run
 * headings pinned as the rows scroll under them, and the selected row a
 * full-bleed band rather than a rounded pill inside a card.
 *
 * Both columns fill the viewport exactly, to the bottom edge, and the page does
 * not scroll behind them.
 */
export const SplitViewStory: Story = {
  name: "Split view",
  render: () => <ResponseManager view="split" />,
}

/**
 * The rail on its own. Radios, because each of these filters holds one value —
 * except the two location sections, which are the only pick-many filters on the
 * screen and go through the combobox instead.
 */
export const FilterRailStory: Story = {
  name: "Filter rail",
  render: () => (
    <div className="@container/main flex bg-canvas">
      <FilterRail />
      <div className="min-w-0 flex-1 p-4">
        <AppliedFilters />
      </div>
    </div>
  ),
}

/**
 * **Current location and preferred location** — where they are, and where they
 * would go. The only two filters here that are not one-of-a-list, so the only
 * two drawn as a combobox: a box you type into with a chip inside it per city
 * taken. The chips are the clear; there is no "Any city" row pretending to be a
 * city.
 */
export const LocationPickers: Story = {
  name: "Location pickers",
  decorators: [padded],
  render: () => (
    <div className="grid max-w-xs gap-4">
      <div className="grid gap-1.5">
        <Label>Current location</Label>
        <LocationPicker
          label="Current location"
          placeholder="Search locations"
          defaultValue={["Bengaluru"]}
          counts={REACH}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Preferred location</Label>
        <LocationPicker
          label="Preferred location"
          placeholder="Search locations"
          defaultValue={["Pune", "Hyderabad"]}
          counts={REACH}
        />
      </div>
    </div>
  ),
}

/**
 * **The card opens with Tags**, above Experience because it is the summary of
 * it. Every one is derived from the roles, the employer and the school already
 * on the card, so a tag cannot disagree with the block below it — and adding
 * one costs a rule rather than a field on every generated person.
 *
 * **Three, then a `+N`.** The rest are on hover in the order they would have
 * been drawn. Two of these five overflow, which is the fixture showing the
 * state; in the real pool it is about one card in ten.
 */
export const TagsStory: Story = {
  name: "Tags",
  decorators: [padded],
  render: () => (
    <div className="flex flex-col gap-3">
      {APPLICANTS.map((applicant) => (
        <div key={applicant.id} className="flex items-center gap-3">
          <span className="w-40 shrink-0 text-sm text-muted-foreground">
            {applicant.name}
          </span>
          <TagsBucket tags={applicant.tags} />
        </div>
      ))}
    </div>
  ),
}

/**
 * The panel a card's name opens. Inset rather than flush, so it reads as
 * something over the page rather than a second page beside it.
 */
export const ProfilePanelStory: Story = {
  name: "Profile panel",
  decorators: [padded],
  render: () => <ProfilePanel />,
}

/**
 * **The pill row is a draft, applied on a button.** Picking in a pill's menu
 * changes the pill's label but not the list — so "12+ years, in Pune" lands as
 * one change instead of the list shuffling and the counts moving twice on the
 * way to a question nobody asked. The menus keep their "Any …" reset option, so
 * the draft holds every state the filter has.
 *
 * **Sort is deliberately not in the draft.** It orders the list and removes
 * nobody, so there is nothing to weigh before committing to it.
 *
 * The rail one view away still applies as you pick, because it has the room to
 * print the consequence beside each choice — the number is the preview a draft
 * would otherwise be for. The two are never on screen together.
 */
export const FilterPills: Story = {
  name: "Filter pills — applied, and a pending change",
  decorators: [padded],
  render: () => (
    <div className="flex flex-col gap-3">
      <FilterBar />
      <FilterBar sort="Best match" />
      <FilterBar dirty />
    </div>
  ),
}

export const Card: Story = {
  name: "Applicant card",
  decorators: [padded],
  render: () => <ApplicantCard applicant={APPLICANTS[0]} />,
}

export const TableView: Story = {
  name: "Table view",
  render: () => <ResponseManager view="table" />,
}

/**
 * **Every heading is a control.** A ghost button with a sort arrow — `⇅` faded
 * until the column is the one being sorted on — opening a popover with Sort
 * ascending, Sort descending, Clear sort, the column's own filter where it has
 * one, and Hide column. A primary dot beside the label means it is filtered.
 *
 * A POPOVER, NOT A DROPDOWN MENU: a header filter is a text box or a set of
 * radios, and neither belongs in a menu — typing in one fights its type-ahead,
 * and Base UI's menu group parts throw outside their groups.
 *
 * Drawn open here, so a Docs page shows it without covering itself.
 */
export const ColumnHeaderOpen: Story = {
  name: "Column header popover, open",
  decorators: [padded],
  render: () => (
    <div className="flex h-96 items-start gap-6">
      <ColumnHead
        title="Location"
        filtered
        open
        filter={<LocationHeaderFilter />}
      />
    </div>
  ),
}

/**
 * **Columns** sits left of the view toggle, in table view only. Three columns
 * are off by default — Match, Education and Status — because the table is for
 * comparing numbers, and those three are read one row at a time.
 */
export const ColumnsMenuOpen: Story = {
  name: "Columns menu, open",
  decorators: [padded],
  render: () => (
    <div className="flex h-96 items-start justify-end">
      <ColumnsMenu open />
    </div>
  ),
}

/**
 * Every decision has a badge; no decision has none. "New" is the avatar's dot,
 * shown here beside them.
 */
export const StatusRange: Story = {
  name: "Status badges",
  decorators: [padded],
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <ApplicantAvatar applicant={APPLICANTS[0]} className="size-12" />
      {(["maybe", "shortlisted", "contacted", "rejected"] as const).map(
        (status) => (
          <StatusBadge key={status} status={status} />
        )
      )}
    </div>
  ),
}

/**
 * A decision takes the card out of the list the instant it is made — that is
 * what makes the queue shrink — so a misclick is undone from where you are,
 * not by finding the person again in another tab.
 */
export const UndoToastStory: Story = {
  name: "Undo — one person and a batch",
  decorators: [padded],
  render: () => (
    <div className="flex flex-col gap-3">
      <UndoToast
        message="Ananya Krishnan moved to Shortlisted"
        faces={ONE_FACE}
      />
      <UndoToast message="103 people moved to Maybe" faces={THREE_FACES} />
    </div>
  ),
}

export const Selecting: Story = {
  name: "Selecting candidates",
  render: () => <ResponseManager picked={["c1", "c2"]} />,
}

/**
 * One person gets Ask Athena, two or three get Compare, and past three Athena
 * leaves the bar — the decisions and the menu stay.
 */
export const SelectionBarStory: Story = {
  name: "Selection bar — one, three and twelve",
  decorators: [padded],
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <SelectionBar count={1} />
      <SelectionBar count={3} />
      <SelectionBar count={12} />
    </div>
  ),
}

export const SelectionMenuStory: Story = {
  name: "Selection bar menu, open",
  decorators: [padded],
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <SelectionMenu count={12} />
      <SelectionBar count={12} />
    </div>
  ),
}

export const BulkInterviewsStory: Story = {
  name: "Set up interviews for the selected",
  decorators: [padded],
  render: () => <BulkInterviews />,
}

/** The skills the posting asked for, as the card marks them. */
export const RequiredSkills: Story = {
  name: "Required skills",
  decorators: [padded],
  render: () => (
    <div className="flex flex-wrap gap-1.5">
      {["Kubernetes", "Go", "Terraform", "Kafka"].map((skill) => (
        <Badge
          key={skill}
          variant={REQUIRED_SKILLS.includes(skill) ? "secondary" : "outline"}
        >
          {skill}
        </Badge>
      ))}
      <Chip>+3 more</Chip>
    </div>
  ),
}
