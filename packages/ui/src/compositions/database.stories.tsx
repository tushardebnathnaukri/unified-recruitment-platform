import type {
  Decorator,
  Meta as StoryMeta,
  StoryObj,
} from "@storybook/react-vite"
import type { LucideIcon } from "lucide-react"
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  BriefcaseIcon,
  Building2Icon,
  CheckIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  CircleHelpIcon,
  CircleXIcon,
  Columns3Icon,
  EyeIcon,
  EyeOffIcon,
  FactoryIcon,
  FileTextIcon,
  GraduationCapIcon,
  IndianRupeeIcon,
  LanguagesIcon,
  LayoutListIcon,
  ListFilterIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  Table2Icon,
  ThumbsUpIcon,
  UserRoundIcon,
  WandSparklesIcon,
  XIcon,
  ZapIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Item } from "@workspace/ui/components/item"
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd"
import { Label } from "@workspace/ui/components/label"
import { ListCard } from "@workspace/ui/components/list-card"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { SectionHeader } from "@workspace/ui/components/section-header"
import { Separator } from "@workspace/ui/components/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { designComposition } from "@workspace/ui/lib/figma"

/**
 * The resume database — everybody on the product, not only the people who
 * applied. Mirrors `apps/web/src/routes/database.tsx`, on hirist: its search
 * page, a search's results in both filter designs, and the two dialogs.
 *
 * The data is the app's, copied inline because `packages/ui` cannot import
 * from the app: hirist's recent searches, and three people from the Kafka
 * search's 214 in the shape `apps/web/src/lib/database.ts` deals them.
 */

type Mode = "keywords" | "natural" | "jd"

const MODES: { id: Mode; label: string; hint: string; icon: LucideIcon }[] = [
  {
    id: "keywords",
    label: "Keywords",
    hint: "Matches the exact words. Turn on Boolean for AND, OR, NOT and quotes.",
    icon: SearchIcon,
  },
  {
    id: "natural",
    label: "Natural language",
    hint: "Write it the way you'd brief a colleague — it's turned into filters you can change.",
    icon: SparklesIcon,
  },
  {
    id: "jd",
    label: "Job description",
    hint: "Paste a JD — the title, experience, skills and location are pulled out of it.",
    icon: FileTextIcon,
  },
]

const modeOf = (id: Mode) => MODES.find((mode) => mode.id === id)!

const PLACEHOLDERS: Record<Mode, string> = {
  keywords: "Skills, titles or companies — Kafka, Kubernetes, platform",
  natural: "Staff engineer in Bengaluru who has run Kafka at scale, 9–14 years",
  jd: "Paste the job description.\n\nRole: Senior Backend Engineer, Checkout\nLocation: Bengaluru\nYou will own the services behind checkout, from the cart to the payment gateway…",
}

type Search = {
  id: string
  query: string
  mode: Mode
  boolean?: boolean
  filters: string[]
  matches: number
  ranAgo: string
  newSince: number
}

/** hirist's recent searches, as `lib/database.ts` has them. */
const SEARCHES: Search[] = [
  {
    id: "s1",
    query: "Kafka, Kubernetes, platform",
    mode: "keywords",
    filters: ["Bengaluru", "9–14 yrs"],
    matches: 214,
    ranAgo: "2 hours ago",
    newSince: 6,
  },
  {
    id: "s2",
    query: "Engineering manager, payments",
    mode: "keywords",
    filters: ["Multiple locations", "7–11 yrs"],
    matches: 88,
    ranAgo: "Yesterday",
    newSince: 0,
  },
  {
    id: "s3",
    query: "Design systems, Figma, mobile",
    mode: "keywords",
    filters: ["Pune", "6+ yrs"],
    matches: 37,
    ranAgo: "3 days ago",
    newSince: 4,
  },
  {
    id: "s4",
    query: "Senior Backend Engineer, Checkout",
    mode: "jd",
    filters: ["Bengaluru", "5–8 yrs", "Java"],
    matches: 162,
    ranAgo: "5 days ago",
    newSince: 11,
  },
  {
    id: "s5",
    query:
      "Android lead who has shipped an app with more than a million installs",
    mode: "natural",
    filters: ["Hyderabad", "8+ yrs"],
    matches: 59,
    ranAgo: "Last week",
    newSince: 0,
  },
  {
    id: "s6",
    query: '("site reliability" OR SRE) AND Terraform NOT intern',
    mode: "keywords",
    boolean: true,
    filters: ["Remote", "5–10 yrs"],
    matches: 131,
    ranAgo: "2 weeks ago",
    newSince: 9,
  },
]

/** The Kafka search's three criteria, the third one written by hand. */
const CRITERIA = [
  { text: "Has run Terraform in production", skills: ["Terraform"] },
  { text: "Has hands-on experience with Kafka", skills: ["Kafka"] },
  { text: "Has hands-on experience with Kubernetes", skills: ["Kubernetes"] },
]
const ASKED = CRITERIA.flatMap((criterion) => criterion.skills)

type Verdict = { label: string; met: boolean; evidence: string }

type Person = {
  id: string
  name: string
  title: string
  company: string
  location: string
  /** Where they would go, their own city first. */
  preferredLocations: string[]
  /** Derived from the roles, the employer and the school already on the card. */
  tags: string[]
  updatedAgo: string
  fresh: boolean
  status: "undecided" | "shortlisted"
  years: number
  roles: { title: string; company: string; span: string }[]
  totalRoles: number
  education: { school: string; degree: string; span: string }
  skills: string[]
  notice: string
  ctc: string
  verdicts: Verdict[]
}

const PEOPLE: Person[] = [
  {
    id: "p1",
    name: "Gaurav Pillai",
    title: "Director of Engineering",
    company: "Flipkart",
    location: "Bengaluru",
    preferredLocations: ["Bengaluru", "Pune"],
    tags: ["Leads a team", "E-commerce", "Top institute", "Long tenure"],
    updatedAgo: "3 hours ago",
    fresh: true,
    status: "undecided",
    years: 13,
    roles: [
      {
        title: "Director of Engineering",
        company: "Flipkart",
        span: "2022–Present",
      },
      { title: "Engineering Manager", company: "Dream11", span: "2020–2022" },
    ],
    totalRoles: 5,
    education: { school: "VIT Vellore", degree: "B.E.", span: "2009–2013" },
    skills: ["Kubernetes", "Terraform", "Kafka"],
    notice: "45 days notice",
    ctc: "₹74L",
    verdicts: [
      {
        label: "Terraform",
        met: true,
        evidence: "Used Terraform as Director of Engineering at Flipkart.",
      },
      {
        label: "Kafka",
        met: true,
        evidence: "Kafka runs through their work at Flipkart and Dream11.",
      },
      {
        label: "Kubernetes",
        met: true,
        evidence:
          "Lists Kubernetes in skills, and applied it at Dream11 (2020–2022).",
      },
    ],
  },
  {
    id: "p2",
    name: "Shreya Nair",
    title: "Senior Staff Engineer",
    company: "Meesho",
    location: "Bengaluru",
    preferredLocations: ["Bengaluru"],
    tags: ["E-commerce", "Long tenure"],
    updatedAgo: "6 months ago",
    fresh: false,
    status: "shortlisted",
    years: 13,
    roles: [
      {
        title: "Senior Staff Engineer",
        company: "Meesho",
        span: "2024–Present",
      },
      { title: "Engineering Manager", company: "Meesho", span: "2021–2024" },
    ],
    totalRoles: 6,
    education: { school: "IIT Bombay", degree: "MCA", span: "2009–2013" },
    skills: ["Kafka", "Terraform", "Spark"],
    notice: "60 days notice",
    ctc: "₹71L",
    verdicts: [
      {
        label: "Terraform",
        met: true,
        evidence: "Used Terraform as Senior Staff Engineer at Meesho.",
      },
      {
        label: "Kafka",
        met: true,
        evidence: "Kafka is central to their role at Meesho.",
      },
      {
        label: "Kubernetes",
        met: false,
        evidence: "No Kubernetes anywhere on the profile.",
      },
    ],
  },
  {
    id: "p3",
    name: "Arjun Verma",
    title: "Principal Engineer",
    company: "Zerodha",
    location: "Bengaluru",
    preferredLocations: ["Bengaluru", "Hyderabad", "Anywhere"],
    tags: ["Fintech", "One sector", "Top institute"],
    updatedAgo: "1 year ago",
    fresh: false,
    status: "undecided",
    years: 12,
    roles: [
      { title: "Principal Engineer", company: "Zerodha", span: "2022–Present" },
      { title: "Staff Engineer", company: "Zomato", span: "2019–2022" },
    ],
    totalRoles: 4,
    education: { school: "IIT Kharagpur", degree: "B.E.", span: "2010–2014" },
    skills: ["Kubernetes", "Kafka", "Spark"],
    notice: "90 days notice",
    ctc: "₹87L",
    verdicts: [
      {
        label: "Terraform",
        met: false,
        evidence: "No Terraform anywhere on the profile.",
      },
      {
        label: "Kafka",
        met: true,
        evidence: "Used Kafka as Staff Engineer at Zomato.",
      },
      {
        label: "Kubernetes",
        met: true,
        evidence: "Used Kubernetes as Principal Engineer at Zerodha.",
      },
    ],
  },
]

/* ------------------------------------------------------------------------- */
/* The search page                                                            */
/* ------------------------------------------------------------------------- */

/**
 * One box with the modes under it — not three tabs above three forms. The
 * mode only changes how the text is read, so a draft survives a switch.
 */
function SearchBox({
  mode,
  value,
  boolean = false,
}: {
  mode: Mode
  value?: string
  boolean?: boolean
}) {
  const jd = mode === "jd"

  return (
    <Card className="gap-3 p-4 shadow-lg">
      <Textarea
        defaultValue={value}
        aria-label={jd ? "Job description" : "Describe who you're looking for"}
        placeholder={
          mode === "keywords" && boolean
            ? '("platform engineer" OR SRE) AND Kafka NOT intern'
            : PLACEHOLDERS[mode]
        }
        className={cn(
          "resize-none rounded-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-sm dark:bg-transparent",
          jd ? "min-h-48" : "min-h-12",
          boolean && "font-mono"
        )}
      />
      <div className="flex min-h-8 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {mode === "keywords" && (
            <Label className="gap-2 text-sm font-normal text-muted-foreground">
              <Switch size="sm" defaultChecked={boolean} />
              Boolean
            </Label>
          )}
          {jd && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>↵</Kbd>
              </KbdGroup>
              to search
            </span>
          )}
        </div>
        <Button
          size="icon-sm"
          className="rounded-full"
          aria-label="Search the database"
          disabled={!value}
        >
          <ArrowUpIcon />
        </Button>
      </div>
    </Card>
  )
}

function ModePicker({ mode }: { mode: Mode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <ToggleGroup
        variant="outline"
        size="sm"
        aria-label="How to read the search"
        defaultValue={[mode]}
        className="flex-wrap justify-center"
      >
        {MODES.map((option) => (
          <ToggleGroupItem
            key={option.id}
            value={option.id}
            className="text-muted-foreground aria-pressed:text-foreground"
          >
            <option.icon data-icon="inline-start" />
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-center text-xs text-muted-foreground">
        {modeOf(mode).hint}
      </p>
    </div>
  )
}

/** The icon is the mode: a magnifier for keywords, sparkles, a page for a JD. */
function SearchRow({ search }: { search: Search }) {
  const mode = modeOf(search.mode)

  return (
    <Item
      render={<a href="#search" />}
      className="flex-col items-stretch gap-2"
    >
      <div className="flex items-start gap-2">
        <mode.icon
          aria-hidden
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
        />
        <span className="sr-only">{mode.label}:</span>
        <span
          className={cn(
            "min-w-0 flex-1 text-sm font-medium",
            search.boolean && "font-mono text-xs leading-5"
          )}
        >
          {search.query}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {search.filters.map((filter) => (
          <Badge key={filter} variant="outline" className="font-normal">
            {filter}
          </Badge>
        ))}
      </div>
      <Meta>
        <span>{search.matches} matches</span>
        <span>{search.ranAgo}</span>
        {search.newSince > 0 && (
          <Badge variant="success" className="font-normal">
            {search.newSince} new
          </Badge>
        )}
      </Meta>
    </Item>
  )
}

function RecentSearches() {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <SectionHeader
        title="Recent searches"
        description="Run one again to see who has joined since"
      />
      <ListCard>
        {SEARCHES.map((search) => (
          <SearchRow key={search.id} search={search} />
        ))}
      </ListCard>
    </section>
  )
}

function SearchPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8 lg:px-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-2xl font-semibold tracking-tight">
            Who are you looking for?
          </p>
          <p className="text-sm text-muted-foreground">
            Search everyone on hirist — not only the people who applied.
          </p>
        </div>
        <SearchBox mode="natural" />
        <ModePicker mode="natural" />
      </div>
      <RecentSearches />
    </div>
  )
}

/* ------------------------------------------------------------------------- */
/* The card — the response manager's, plus the evidence lines                 */
/* ------------------------------------------------------------------------- */

/**
 * The semantic tokens, not the brand's — tying the tick to `--primary` would
 * make it orange on hirist, the same colour as the Maybe beside it. Only the
 * glyph is tinted at rest, so a page of cards does not become traffic lights.
 */
const DECISIONS = [
  {
    value: "shortlisted",
    label: "Shortlist",
    icon: CheckIcon,
    resting: "text-success hover:bg-success/10 hover:text-success",
  },
  {
    value: "maybe",
    label: "Maybe",
    icon: CircleHelpIcon,
    resting: "text-warning hover:bg-warning/10 hover:text-warning",
  },
  {
    value: "rejected",
    label: "Not a fit",
    icon: XIcon,
    resting: "text-destructive hover:bg-destructive/10 hover:text-destructive",
  },
]

function Decisions({ person }: { person: Person }) {
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      aria-label={`Decision for ${person.name}`}
      defaultValue={person.status === "shortlisted" ? ["shortlisted"] : []}
    >
      {DECISIONS.map((decision) => (
        <ToggleGroupItem
          key={decision.value}
          value={decision.value}
          aria-label={decision.label}
          className={
            person.status === decision.value
              ? "bg-success/10 text-success data-[pressed]:bg-success/10"
              : decision.resting
          }
        >
          <decision.icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function initials(name: string) {
  const parts = name.split(" ")
  return (parts[0][0] + (parts.at(-1)?.[0] ?? "")).toUpperCase()
}

/**
 * Juicebox's lines under a result: each criterion, most important first — a
 * chip that says whether they meet it, and one sentence saying why. A met
 * criterion takes the success chip; an unmet one goes outline and muted, so a
 * card's fit reads from its colour down the left before a word is read.
 */
function Evidence({ verdicts }: { verdicts: Verdict[] }) {
  return (
    <ul
      aria-label="How they meet the criteria"
      className="flex flex-col gap-2 border-t border-border pt-3 text-sm"
    >
      {verdicts.map((verdict) => (
        <li
          key={verdict.label}
          className="grid items-start gap-x-3 gap-y-1 sm:grid-cols-[9rem_minmax(0,1fr)]"
        >
          <Badge
            variant={verdict.met ? "success" : "outline"}
            className="justify-self-start font-normal"
          >
            {verdict.met ? (
              <ThumbsUpIcon data-icon="inline-start" />
            ) : (
              <MinusIcon data-icon="inline-start" />
            )}
            <span className="sr-only">
              {verdict.met ? "Meets" : "Does not meet"}:{" "}
            </span>
            {verdict.label}
          </Badge>
          <span
            className={cn(
              "min-w-0 leading-5",
              !verdict.met && "text-muted-foreground"
            )}
          >
            {verdict.evidence}
          </span>
        </li>
      ))}
    </ul>
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

function LocationBucket({ person }: { person: Person }) {
  const elsewhere = person.preferredLocations.filter(
    (place) => place !== person.location
  )

  return (
    <span className="text-muted-foreground">
      <span className="font-medium text-foreground">{person.location}</span>
      {elsewhere.length > 0 && <> · open to {elsewhere.join(", ")}</>}
    </span>
  )
}

function ResultCard({
  person,
  evidence = false,
}: {
  person: Person
  evidence?: boolean
}) {
  const matched = person.skills.filter((skill) => ASKED.includes(skill))

  return (
    <Item className="@container/card flex-col items-stretch gap-3 bg-card px-5 py-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="size-12 shrink-0">
            <AvatarFallback>{initials(person.name)}</AvatarFallback>
            {person.fresh && (
              <AvatarBadge
                aria-hidden
                className="top-0 bottom-auto ring-card"
              />
            )}
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* The name is the control that opens the profile; the card
                  itself is not clickable. */}
              <button
                type="button"
                className="rounded-sm text-left font-heading text-base font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {person.name}
              </button>
              {person.fresh && <span className="sr-only">New</span>}
              {person.status === "shortlisted" && (
                <Badge variant="success">Shortlisted</Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {person.title} at {person.company}
            </span>
            <Meta>
              <MetaItem>{person.location}</MetaItem>
              <MetaItem>Updated {person.updatedAgo}</MetaItem>
            </Meta>
          </div>
        </div>
        <div className="-my-1.5 -mr-2 shrink-0">
          <Decisions person={person} />
        </div>
      </div>

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-border pt-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
        {/* Above Experience, because it is the summary of it. Three chips, then
            a `+N` with the rest on hover. `secondary`, not the skills' success
            green — green means "one of the skills this search asked for", and a
            tag is a fact about the person nobody asked for. */}
        <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
          Tags
        </dt>
        <dd className="min-w-0">
          <TagsBucket tags={person.tags} />
        </dd>
        <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
          Experience
        </dt>
        <dd className="flex min-w-0 flex-col items-start gap-0.5 leading-6">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {person.years} yrs
            </span>{" "}
            across {person.totalRoles} roles
          </span>
          {person.roles.map((role) => (
            <span key={role.span}>
              <span className="font-medium">{role.title}</span>{" "}
              <span className="text-muted-foreground">
                at {role.company} · {role.span}
              </span>
            </span>
          ))}
        </dd>
        <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
          Education
        </dt>
        <dd className="min-w-0 leading-6">
          {person.education.school},{" "}
          <span className="text-muted-foreground">
            {person.education.degree} · {person.education.span}
          </span>
        </dd>
        <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
          Skills match
        </dt>
        <dd className="flex min-w-0 flex-wrap gap-1.5">
          {person.skills.map((skill) => (
            <Badge
              key={skill}
              variant={matched.includes(skill) ? "success" : "outline"}
              className="font-normal"
            >
              {skill}
            </Badge>
          ))}
        </dd>
        {/* Where they are and where they would go — the two only mean anything
            together, so the current city is repeated here as the emphasis. */}
        <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
          Location
        </dt>
        <dd className="min-w-0 leading-6">
          <LocationBucket person={person} />
        </dd>
        <dt className="text-xs leading-6 font-medium text-muted-foreground sm:text-right">
          Availability
        </dt>
        <dd className="min-w-0 leading-6 text-muted-foreground">
          <span className="font-medium text-foreground">{person.notice}</span> ·{" "}
          {person.ctc} current
        </dd>
      </dl>

      {evidence && <Evidence verdicts={person.verdicts} />}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" size="sm" className="mr-auto">
          <EyeIcon data-icon="inline-start" />
          View contact details
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Message">
          <MailIcon />
        </Button>
        <Button variant="outline" size="sm">
          <UserRoundIcon data-icon="inline-start" />
          View profile
        </Button>
      </div>
    </Item>
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
      <ToggleGroupItem value="cards" aria-label="Cards">
        <LayoutListIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="table" aria-label="Table">
        <Table2Icon />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

/**
 * The columns the table can show. Three are off by default — Match, Education
 * and Status — because the table is for comparing the numbers, and those three
 * are read one row at a time.
 */
const TABLE_COLUMNS = [
  { id: "location", label: "Location", on: true },
  { id: "experience", label: "Exp", on: true },
  { id: "ctc", label: "Current", on: true },
  { id: "notice", label: "Notice", on: true },
  { id: "updated", label: "Updated", on: true },
  { id: "match", label: "Match", on: false },
  { id: "education", label: "Education", on: false },
  { id: "status", label: "Status", on: false },
]

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

/**
 * A sortable, filterable, hideable column heading — the response manager's
 * `DataTableColumnHeader`, reused here. **Its filters are the refine panel's
 * own sections**, passed in as `tableFilters`: Location is `cur`, Exp `xp`,
 * Current `ctc`, Notice `np`. So a header, the refine panel and the Juicebox
 * dialog are one filter in three places.
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
          className="w-64 gap-1 p-1"
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
  icon: LucideIcon
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
 * Search Resume has the table too — cards or table, no split. The arrival
 * column reads **Updated** here, where a posting's reads Applied: the same
 * column, named by what it means on this screen.
 */
function ResultsTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-10 pr-0">
            <Checkbox aria-label="Select all 214" />
          </TableHead>
          <TableHead>
            <ColumnHead title="Candidate" />
          </TableHead>
          <TableHead>
            <ColumnHead title="Location" filtered filter={<LocationList />} />
          </TableHead>
          <TableHead className="text-right">
            <ColumnHead title="Exp" align="end" filtered />
          </TableHead>
          <TableHead className="text-right">
            <ColumnHead title="Current" align="end" sorted="desc" />
          </TableHead>
          <TableHead className="text-right">
            <ColumnHead title="Notice" align="end" />
          </TableHead>
          <TableHead>
            <ColumnHead title="Updated" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {PEOPLE.map((person) => (
          <TableRow key={person.id}>
            <TableCell className="w-10 pr-0">
              <Checkbox aria-label={`Select ${person.name}`} />
            </TableCell>
            <TableCell>
              <div className="flex items-start gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    person.fresh ? "bg-primary" : "invisible"
                  )}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{person.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {person.title} at {person.company}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {person.location}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {person.years} yrs
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {person.ctc}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {person.notice.replace(" notice", "")}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {person.updatedAgo}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function SortSelect({ sort = "match" }: { sort?: string }) {
  const sorts = {
    match: "Best match",
    recent: "Most recent",
    experience: "Most experience",
    notice: "Soonest available",
    // A header sort that is not one of the named ones writes
    // `?sort=<column>.<asc|desc>`, and the select says so rather than falling
    // back to the default and quietly disagreeing with the table.
    "ctc.desc": "Current pay ↓",
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Sort</span>
      <Select items={sorts} defaultValue={sort}>
        <SelectTrigger size="sm" className="w-40" aria-label="Sort by">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(sorts).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function SearchWithin() {
  return (
    <InputGroup className="h-8 max-w-xs min-w-48 flex-1">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        placeholder="Search within results"
        aria-label="Search within results"
      />
    </InputGroup>
  )
}

/* ------------------------------------------------------------------------- */
/* Results — Juicebox                                                         */
/* ------------------------------------------------------------------------- */

function CountButton({
  icon: Icon,
  label,
  count,
}: {
  icon: LucideIcon
  label: string
  count: number
}) {
  return (
    <Button variant="outline" className="h-9 rounded-full">
      <Icon data-icon="inline-start" />
      {label}
      <Badge variant="secondary" className="tabular-nums">
        {count}
      </Badge>
    </Button>
  )
}

/**
 * "Expand pool": the loosenings that would find the most people, each with
 * its number — counted against the whole pool, not guessed.
 */
function ExpandPool() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <WandSparklesIcon className="size-3.5" />
        Expand pool
      </span>
      {[
        { label: "Add Metros", gain: 64 },
        { label: "Widen experience to 6–17 yrs", gain: 52 },
      ].map((expansion) => (
        <Button
          key={expansion.label}
          variant="outline"
          size="sm"
          className="h-7 rounded-full text-xs font-normal"
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
 * THE QUERY PILL IS GONE. It was the search restated plus a press to get back
 * to the box — which is exactly what the bar's title and back button now are,
 * so it was the same control twice. The band keeps Filters, Criteria and Expand
 * pool.
 */
function JuiceboxHeader() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <CountButton icon={ListFilterIcon} label="Filters" count={2} />
        <CountButton icon={SparklesIcon} label="Criteria" count={3} />
      </div>
      <ExpandPool />
    </div>
  )
}

function JuiceboxResults({ table = false }: { table?: boolean }) {
  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <TopBar>
        <SearchHeader />
      </TopBar>

      <div className="@container/main flex flex-1 flex-col gap-5 px-4 py-6 lg:px-6">
        <JuiceboxHeader />
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border pb-3">
            <h2 className="text-sm font-medium">
              Matches{" "}
              <span className="font-normal text-muted-foreground tabular-nums">
                (214)
              </span>
            </h2>
            <div className="ml-auto flex min-w-48 flex-1 justify-end">
              <SearchWithin />
            </div>
            <SortSelect sort={table ? "ctc.desc" : "match"} />
            {/* Columns only in the view it acts on, left of the toggle. */}
            {table && <ColumnsMenu />}
            <ViewSwitcher value={table ? "table" : "cards"} />
          </div>

          <LookingFor />

          {table ? (
            <ResultsTable />
          ) : (
            <div role="list" className="flex flex-col gap-3">
              {PEOPLE.map((person) => (
                <ResultCard key={person.id} person={person} evidence />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------- */
/* Results — Refine panel                                                     */
/* ------------------------------------------------------------------------- */

/**
 * THE SEARCH IS THE TOP BAR, under both filter designs. It used to be a white
 * band above the results while the bar said "Database" — two rows to say where
 * you are. "Back is edit": the arrow returns to the box with this search still
 * in it.
 *
 * Fitting one row inside `--header-height` costs the band its other lines. The
 * query truncates to one line instead of clamping to two, and the meta sits
 * behind a separator that hides below `lg`. **The "Looking for" skills left the
 * header entirely** for `LookingFor`, drawn above the cards beside the green
 * chips it explains.
 */
function SearchHeader() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Back to the search box"
        className="-ml-2 size-8 shrink-0 rounded-full"
      >
        <ArrowLeftIcon />
      </Button>

      <h1 className="min-w-0 truncate font-heading text-base font-medium">
        Kafka, Kubernetes, platform
      </h1>

      <Badge variant="secondary" className="shrink-0">
        <SearchIcon data-icon="inline-start" />
        Keywords
      </Badge>

      <Separator
        orientation="vertical"
        className="mx-1 hidden h-4 lg:block data-vertical:self-auto"
      />
      <Meta className="hidden shrink-0 lg:flex">
        <MetaItem>214 profiles</MetaItem>
        <MetaItem>Bengaluru</MetaItem>
        <MetaItem>9–14 yrs</MetaItem>
        <MetaItem>Last run 2 hours ago</MetaItem>
      </Meta>
    </div>
  )
}

/**
 * The shell's bar, so the story can show what the header now sits inside. In
 * the app this is `SiteHeader` and the page reaches it through a portal.
 */
function TopBar({ children }: { children: React.ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4 lg:px-6">
      {children}
      <Button variant="ghost" size="sm" className="ml-auto shrink-0">
        <SparklesIcon data-icon="inline-start" />
        Athena
      </Button>
    </header>
  )
}

/**
 * The skills the search named, drawn above the cards rather than in the header:
 * they are the legend for the green chips on every card below, so they belong
 * beside the thing they explain.
 */
function LookingFor() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Looking for</span>
      {["Kafka", "Kubernetes"].map((skill) => (
        <Badge key={skill} variant="success" className="font-normal">
          {skill}
        </Badge>
      ))}
    </div>
  )
}

/** The live hirist panel's twenty sections, in its order. */
const PANEL_SECTIONS: { label: string; count?: number; open?: boolean }[] = [
  { label: "Experience", count: 1, open: true },
  { label: "Current Location", count: 1, open: true },
  { label: "Preferred Location" },
  { label: "Companies Cluster" },
  { label: "Organization" },
  { label: "Functional Area" },
  { label: "Industry" },
  { label: "Institute" },
  { label: "Degree" },
  { label: "Course Type" },
  { label: "Batch" },
  { label: "Salary" },
  { label: "Expected Salary" },
  { label: "Notice Period" },
  { label: "Age" },
  { label: "Diversity" },
  { label: "Work Permit for USA" },
  { label: "Handled a team?" },
  { label: "Willing to relocate?" },
  { label: "Language" },
]

const YEARS = Object.fromEntries(
  Array.from({ length: 32 }, (_, years) => [String(years), `${years} yrs`])
)

function RangePair({ min, max }: { min: string; max: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        ["Minimum experience", min],
        ["Maximum experience", max],
      ].map(([label, value]) => (
        <Select key={label} items={YEARS} defaultValue={value}>
          <SelectTrigger size="sm" className="w-full" aria-label={label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(YEARS).map(([years, text]) => (
              <SelectItem key={years} value={years}>
                {text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
}

function LocationList() {
  const options = [
    "Metros",
    "South India",
    "West India",
    "Bengaluru",
    "Chennai",
    "Hyderabad",
    "Pune",
  ]
  return (
    <div className="flex flex-col gap-2">
      <InputGroup className="h-8">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search current location"
          aria-label="Search current location"
        />
      </InputGroup>
      {options.map((option) => (
        <Label key={option} className="gap-2 text-sm font-normal">
          <Checkbox defaultChecked={option === "Bengaluru"} />
          {option}
        </Label>
      ))}
    </div>
  )
}

/**
 * "Refine your search": the live hirist column. Collapsed by default, as it is
 * live; only the sections already doing something open themselves, and each
 * heading counts what it has on. Applied as you pick.
 */
function RefinePanel() {
  return (
    <aside
      aria-label="Refine your search"
      className="flex w-72 shrink-0 flex-col self-start rounded-2xl bg-card ring-1 ring-foreground/10"
    >
      <div className="flex flex-col gap-0.5 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Refine your search</h2>
          <Button variant="link" size="sm" className="h-auto px-0 text-xs">
            Clear all
          </Button>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          214 of 382 profiles
        </p>
      </div>
      <div className="flex flex-col gap-2.5 border-t border-border px-4 py-3">
        <Label className="gap-2 text-sm font-normal">
          <Checkbox />
          Hide viewed profiles
        </Label>
        <Label className="items-start gap-2 text-sm font-normal">
          <Checkbox className="mt-0.5" />
          <span className="flex flex-col gap-0.5">
            Show unique profiles
            <span className="text-xs text-muted-foreground">
              Only people who are not also on Naukri
            </span>
          </span>
        </Label>
      </div>
      {PANEL_SECTIONS.map((section) => (
        <details
          key={section.label}
          open={section.open}
          className="group/section border-t border-border"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">{section.label}</span>
            {section.label === "Diversity" && (
              <Badge variant="secondary" className="font-normal">
                <LockIcon data-icon="inline-start" />
                Maven Exclusive
              </Badge>
            )}
            {section.count && (
              <Badge className="tabular-nums">{section.count}</Badge>
            )}
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open/section:rotate-180" />
          </summary>
          <div className="px-4 pb-3">
            {section.label === "Experience" && <RangePair min="9" max="14" />}
            {section.label === "Current Location" && <LocationList />}
          </div>
        </details>
      ))}
    </aside>
  )
}

function PanelResults() {
  const seen = {
    any: "All",
    "7": "Last 7 days",
    "30": "Last month",
    "180": "Last 6 months",
    "730": "Last 2 years",
  }
  return (
    // THE REFINE DESIGN HAS NO BAND LEFT AT ALL — the sticky filter column
    // starts straight under the top bar.
    <div className="flex min-h-svh flex-col bg-canvas">
      <TopBar>
        <SearchHeader />
      </TopBar>

      <div className="@container/main flex flex-1 flex-col gap-5 px-4 py-6 lg:px-6">
        <div className="flex items-start gap-4">
          <RefinePanel />
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <SearchWithin />
              <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Last seen
                  </span>
                  <Select items={seen} defaultValue="any">
                    <SelectTrigger
                      size="sm"
                      className="w-36"
                      aria-label="Filter by last seen"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(seen).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <SortSelect />
              </div>
            </div>
            <LookingFor />

            <div role="list" className="flex flex-col gap-3">
              {PEOPLE.map((person) => (
                <ResultCard key={person.id} person={person} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------- */
/* The dialogs, drawn open                                                    */
/* ------------------------------------------------------------------------- */

const CATEGORIES: { label: string; icon: LucideIcon; active?: boolean }[] = [
  { label: "General", icon: SlidersHorizontalIcon, active: true },
  { label: "Locations", icon: MapPinIcon, active: true },
  { label: "Job", icon: BriefcaseIcon },
  { label: "Company", icon: Building2Icon },
  { label: "Industry", icon: FactoryIcon },
  { label: "Compensation", icon: IndianRupeeIcon },
  { label: "Education", icon: GraduationCapIcon },
  { label: "Languages", icon: LanguagesIcon },
  { label: "Power filters", icon: ZapIcon },
]

function FieldLabel({ label, clear }: { label: string; clear?: boolean }) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-2">
      <span className="text-sm font-medium">{label}</span>
      {clear && (
        <Button variant="link" size="sm" className="h-auto px-0 text-xs">
          Clear
        </Button>
      )}
    </div>
  )
}

/**
 * "Edit your search filters", drawn open — an overlay is only designable in
 * its open state, which is how every overlay in this system is shown. The
 * draft's count is in the header; nothing touches the list until Save.
 */
function FiltersDialog() {
  return (
    <div className="flex h-[40rem] w-full max-w-4xl flex-col overflow-hidden rounded-4xl bg-popover text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/5">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-medium">
            Edit your search filters
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            246 matches
          </span>
        </div>
        <Button variant="ghost">Cancel</Button>
        <Button>Save changes</Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Filter categories"
          className="flex w-56 shrink-0 flex-col gap-1 border-r border-border p-3"
        >
          <InputGroup className="mb-2 h-8">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search filters"
              aria-label="Search filters"
            />
          </InputGroup>
          <div className="flex flex-1 flex-col gap-0.5">
            {CATEGORIES.map((category) => (
              <span
                key={category.label}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
              >
                <category.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">{category.label}</span>
                {category.active && (
                  <span className="size-2 rounded-full bg-primary" />
                )}
              </span>
            ))}
          </div>
          <Label className="mt-2 gap-2 border-t border-border pt-3 text-sm font-normal">
            <Checkbox />
            Hide inactive filters
          </Label>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-8 overflow-y-auto px-5 py-4">
          <section className="flex flex-col gap-5">
            <h3 className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <SlidersHorizontalIcon className="size-3.5" />
              General
            </h3>
            <div className="flex flex-col gap-2">
              <FieldLabel label="Experience" clear />
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Minimum (years)", "9"],
                  ["Maximum (years)", "14"],
                ].map(([label, value]) => (
                  <Label
                    key={label}
                    className="flex-col items-stretch gap-1.5 text-xs font-normal text-muted-foreground"
                  >
                    {label}
                    <Input defaultValue={value} className="text-foreground" />
                  </Label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel label="Exclude profiles" />
              {["Viewed", "Shortlisted", "Maybe", "Contacted", "Not a fit"].map(
                (label) => (
                  <Label key={label} className="gap-2 text-sm font-normal">
                    <Checkbox />
                    {label}
                  </Label>
                )
              )}
            </div>
          </section>

          <section className="flex flex-col gap-5">
            <h3 className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <MapPinIcon className="size-3.5" />
              Locations
            </h3>
            <div className="flex flex-col gap-2">
              <FieldLabel label="Current Location" clear />
              <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-2xl border border-input bg-input/30 p-1.5">
                {["Bengaluru", "Chennai"].map((city) => (
                  <Badge
                    key={city}
                    variant="secondary"
                    className="gap-1 pr-0.5 font-normal"
                  >
                    {city}
                    <span
                      aria-hidden
                      className="grid size-4 place-items-center rounded-full"
                    >
                      <XIcon className="size-3" />
                    </span>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 rounded-full px-2 text-muted-foreground"
                >
                  <PlusIcon data-icon="inline-start" />
                  Add
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel label="Preferred Location" />
              <div className="flex min-h-9 items-center rounded-2xl border border-input bg-input/30 p-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 rounded-full px-2 text-muted-foreground"
                >
                  <PlusIcon data-icon="inline-start" />
                  Add preferred location
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

/**
 * Ranked criteria, drawn open. They order the results and decide what the
 * cards highlight; they do not remove anybody. Each says what it will do to
 * the cards, so a sentence that names no known skill is not a surprise.
 */
function CriteriaDialog() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-4 rounded-4xl bg-popover p-6 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/5">
      <div className="flex flex-col gap-1">
        <span className="text-base font-medium">Criteria</span>
        <p className="text-xs text-muted-foreground">
          What makes somebody a good match, most important first. They order the
          results; they do not remove anybody.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Most important
        </span>
        {CRITERIA.map((criterion, index) => (
          <div key={criterion.text} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="w-4 shrink-0 text-center text-xs text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <Input
                defaultValue={criterion.text}
                aria-label={`Criterion ${index + 1}`}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Move up"
                disabled={index === 0}
              >
                <ArrowUpIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Move down"
                disabled={index === CRITERIA.length - 1}
              >
                <ArrowDownIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove criterion"
                className="text-muted-foreground"
              >
                <CircleXIcon />
              </Button>
            </div>
            <p className="pl-5.5 text-xs text-muted-foreground">
              Highlights {criterion.skills.join(", ")}
            </p>
          </div>
        ))}
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Least important
        </span>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline">
          <PlusIcon data-icon="inline-start" />
          Add criterion
        </Button>
        <Button>Update</Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------- */

const meta = {
  title: "Compositions/Database",
  parameters: {
    design: designComposition("database"),
    layout: "fullscreen",
    docs: {
      description: {
        component: `
The resume database — everybody on the product, not only the people who
applied. Mirrors \`apps/web/src/routes/database.tsx\`, on hirist. Jobs is who
came to you; Database is who you go and find.

**One box, three modes under it** — Keywords, Natural language, Job
description — not the live product's three tabs over three forms. The mode
only changes how the text is read, so a draft survives a switch. Keyword
search keeps Boolean as its one control (it covers "mandatory" and
"exclude"); a JD runs on ⌘↵ because Enter is a newline in a pasted JD. Recent
searches sit underneath, the icon on each row being its mode.

**Results are the response manager's cards**, laid out as a ranked list rather
than a queue: no decision tabs (a decision is a badge on the card, not a move
off it), cards only. People "updated" rather than "applied", and a search's
city and years arrive as filters you can see and loosen.

**Two filter designs, picked on /settings.**

- *Juicebox* (the default): the query as a pill, a **Filters** dialog edited
  as a draft with a live count and applied on Save, ranked plain-English
  **Criteria** that decide what the cards highlight and the Best match order
  but remove nobody, **Expand pool** chips whose +N is counted, and one
  **evidence line per criterion** on every card.
- *Refine panel*: the live hirist column — the same twenty sections, in the
  same order, sticky beside the cards and applied as you pick. Diversity is
  drawn gated ("Maven Exclusive"), as it is live.

The two dialogs are drawn open, as every overlay in this system is.
        `,
      },
    },
  },
} satisfies StoryMeta

export default meta

type Story = StoryObj<typeof meta>

export const Search: Story = {
  name: "Search — full page",
  render: () => <SearchPage />,
}

export const JuiceboxFullPage: Story = {
  name: "Results — Juicebox",
  render: () => <JuiceboxResults />,
}

export const PanelFullPage: Story = {
  name: "Results — Refine panel",
  render: () => <PanelResults />,
}

/**
 * **Search Resume has the table too** — cards or table, no split. The Cards /
 * Table toggle and, in table view, the **Columns** button sit right of the
 * toolbar under both filter designs.
 *
 * Its header filters are the refine panel's own sections: Location is `cur`,
 * Exp `xp`, Current `ctc`, Notice `np`. So a header, the refine panel and the
 * Juicebox dialog are one filter in three places. The arrival column reads
 * **Updated** here, where a posting's reads Applied, and a header sort that is
 * not one of the named ones shows in the Sort select as e.g. "Current pay ↓".
 */
export const JuiceboxTable: Story = {
  name: "Results — Juicebox, table view",
  render: () => <JuiceboxResults table />,
}

const padded: Decorator = (Story) => (
  <div className="@container/main mx-auto max-w-4xl p-6">
    <Story />
  </div>
)

export const Modes: Story = {
  name: "Search box — three modes",
  decorators: [padded],
  render: () => (
    <div className="flex flex-col gap-6">
      <SearchBox mode="keywords" value="Kafka, Kubernetes, platform" />
      <SearchBox
        mode="keywords"
        boolean
        value={'("site reliability" OR SRE) AND Terraform NOT intern'}
      />
      <SearchBox
        mode="natural"
        value="Staff engineer in Bengaluru who has run Kafka at scale, 9–14 years"
      />
      <SearchBox mode="jd" />
    </div>
  ),
}

export const RecentSearchesStory: Story = {
  name: "Recent searches",
  decorators: [padded],
  render: () => <RecentSearches />,
}

export const CardWithEvidence: Story = {
  name: "Result card — with evidence",
  decorators: [padded],
  render: () => <ResultCard person={PEOPLE[2]} evidence />,
}

export const ExpandPoolStory: Story = {
  name: "Expand pool",
  decorators: [padded],
  render: () => <ExpandPool />,
}

export const FiltersDialogStory: Story = {
  name: "Filters dialog (open)",
  decorators: [padded],
  render: () => <FiltersDialog />,
}

export const CriteriaDialogStory: Story = {
  name: "Criteria dialog (open)",
  decorators: [padded],
  render: () => <CriteriaDialog />,
}

/**
 * A Location header, drawn open — the refine panel's own city checklist inside
 * the column's popover, rather than a second control that means the same thing.
 */
export const TableHeaderOpen: Story = {
  name: "Table header filter, open",
  decorators: [padded],
  render: () => (
    <div className="flex h-[28rem] items-start">
      <ColumnHead title="Location" filtered open filter={<LocationList />} />
    </div>
  ),
}

export const RefinePanelStory: Story = {
  name: "Refine panel",
  decorators: [padded],
  render: () => <RefinePanel />,
}
