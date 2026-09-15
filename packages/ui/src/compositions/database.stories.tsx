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
  CircleHelpIcon,
  CircleXIcon,
  EyeIcon,
  FactoryIcon,
  FileTextIcon,
  GraduationCapIcon,
  IndianRupeeIcon,
  LanguagesIcon,
  ListFilterIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
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
import { SectionHeader } from "@workspace/ui/components/section-header"
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

const DECISIONS = [
  { value: "shortlisted", label: "Shortlist", icon: CheckIcon },
  { value: "maybe", label: "Maybe", icon: CircleHelpIcon },
  { value: "rejected", label: "Not a fit", icon: XIcon },
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
              : "text-muted-foreground"
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
              <span className="font-heading text-base font-medium">
                {person.name}
              </span>
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

function SortSelect() {
  const sorts = {
    match: "Best match",
    recent: "Most recent",
    experience: "Most experience",
    notice: "Soonest available",
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Sort</span>
      <Select items={sorts} defaultValue="match">
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

function JuiceboxHeader() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          className="h-9 max-w-full min-w-0 justify-start rounded-full sm:max-w-2xl"
          aria-label="Edit search: Kafka, Kubernetes, platform"
        >
          <SearchIcon
            data-icon="inline-start"
            className="text-muted-foreground"
          />
          <span className="min-w-0 truncate">Kafka, Kubernetes, platform</span>
        </Button>
        <CountButton icon={ListFilterIcon} label="Filters" count={2} />
        <CountButton icon={SparklesIcon} label="Criteria" count={3} />
      </div>
      <ExpandPool />
    </div>
  )
}

function JuiceboxResults() {
  return (
    <div className="@container/main flex flex-col gap-5 px-4 py-6 lg:px-6">
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
          <SortSelect />
        </div>
        <div role="list" className="flex flex-col gap-3">
          {PEOPLE.map((person) => (
            <ResultCard key={person.id} person={person} evidence />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------- */
/* Results — Refine panel                                                     */
/* ------------------------------------------------------------------------- */

/** The search, restated where the job's title sits on a posting. */
function SearchHeader() {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        aria-label="Back to the search box"
        className="shrink-0 rounded-full"
      >
        <ArrowLeftIcon />
      </Button>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-lg font-medium">
            Kafka, Kubernetes, platform
          </h2>
          <Badge variant="secondary">
            <SearchIcon data-icon="inline-start" />
            Keywords
          </Badge>
        </div>
        <Meta>
          <MetaItem>214 profiles</MetaItem>
          <MetaItem>Bengaluru</MetaItem>
          <MetaItem>9–14 yrs</MetaItem>
          <MetaItem>Last run 2 hours ago</MetaItem>
        </Meta>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Looking for</span>
          {["Kafka", "Kubernetes"].map((skill) => (
            <Badge key={skill} variant="success" className="font-normal">
              {skill}
            </Badge>
          ))}
        </div>
      </div>
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
    <div className="@container/main flex flex-col gap-5 px-4 py-6 lg:px-6">
      <SearchHeader />
      <div className="flex items-start gap-4">
        <RefinePanel />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <SearchWithin />
            <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Last seen</span>
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
          <div role="list" className="flex flex-col gap-3">
            {PEOPLE.map((person) => (
              <ResultCard key={person.id} person={person} />
            ))}
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

export const RefinePanelStory: Story = {
  name: "Refine panel",
  decorators: [padded],
  render: () => <RefinePanel />,
}
