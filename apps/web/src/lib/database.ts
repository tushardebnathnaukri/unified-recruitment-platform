import type { LucideIcon } from "lucide-react"
import { FileTextIcon, SearchIcon, SparklesIcon } from "lucide-react"

import type { Brand } from "@workspace/ui/lib/brands"
import {
  applicantsFor,
  seededRandom,
  seedFrom,
  skillsIn,
  type Applicant,
  type GenerateOptions,
} from "@/lib/applicants"
import { toProfile, writeRange, type Profile } from "@/lib/database-filters"
import type { JobDomain, LiveJob } from "@/lib/jobs"

/**
 * Mock data for the resume database — searching everybody on the product, not
 * only the people who applied to a posting.
 *
 * ONE BOX, THREE WAYS OF READING IT. The live product puts Keyword, Smart Text
 * and Intelligent JD search on three tabs, each with its own box and its own
 * controls, so picking a tab is picking a form. Here there is one box and the
 * mode only changes how its text is read — which is why a draft survives a
 * mode switch: somebody who pasted a JD into the keyword box should not have
 * to paste it again.
 */
export type SearchMode = "keywords" | "natural" | "jd"

export type SearchModeOption = {
  id: SearchMode
  label: string
  /** What the mode does with the text, said under the pills. */
  hint: string
  icon: LucideIcon
}

/**
 * In the order a recruiter reaches for them: the keyword search they already
 * know, then the two that read prose. No BETA badges — a label that says
 * "this might not work" is not a reason to pick something.
 */
export const SEARCH_MODES: SearchModeOption[] = [
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

/**
 * Natural language is the default because it is what the dashboard's box
 * hands over — "describe who you're hiring for" arrives here as `?q=` alone.
 */
export const DEFAULT_SEARCH_MODE: SearchMode = "natural"

export function toSearchMode(value: string | null): SearchMode {
  return SEARCH_MODES.some((mode) => mode.id === value)
    ? (value as SearchMode)
    : DEFAULT_SEARCH_MODE
}

export function modeFor(id: SearchMode): SearchModeOption {
  return SEARCH_MODES.find((mode) => mode.id === id) ?? SEARCH_MODES[0]
}

/**
 * The example in an empty box. Per brand, because the example IS the product:
 * a hirist recruiter shown "P&L ownership, FMCG" learns nothing about what to
 * type, and neither does an iimjobs one shown Kafka.
 */
type Placeholders = Record<SearchMode, string> & { boolean: string }

const PLACEHOLDERS: Record<Brand, Placeholders> = {
  hirist: {
    keywords: "Skills, titles or companies — Kafka, Kubernetes, platform",
    boolean: '("platform engineer" OR SRE) AND Kafka NOT intern',
    natural:
      "Staff engineer in Bengaluru who has run Kafka at scale, 9–14 years",
    jd: "Paste the job description.\n\nRole: Senior Backend Engineer, Checkout\nLocation: Bengaluru\nYou will own the services behind checkout, from the cart to the payment gateway…",
  },
  iimjobs: {
    keywords: "Skills, titles or companies — P&L, FMCG, national sales head",
    boolean: '("sales head" OR "VP sales") AND FMCG NOT trainee',
    natural:
      "Sales head in Mumbai who has carried a ₹200 crore P&L in FMCG, 12–18 years",
    jd: "Paste the job description.\n\nRole: VP Enterprise Sales\nLocation: Delhi NCR\nYou will own the enterprise number across the north, with a team of eight account directors…",
  },
}

export function placeholderFor(
  brand: Brand,
  mode: SearchMode,
  boolean: boolean
): string {
  const set = PLACEHOLDERS[brand]
  return mode === "keywords" && boolean ? set.boolean : set[mode]
}

export type RecentSearch = {
  id: string
  /**
   * What was typed. A JD search keeps only the posting's title here — the full
   * description is not something to print on a row.
   */
  query: string
  mode: SearchMode
  /** Keyword searches only: the query is Boolean syntax, not a word list. */
  boolean?: boolean
  /** The filters that narrowed it, as chips — enough to tell two runs apart. */
  filters: string[]
  matches: number
  ranAgo: string
  /** Profiles added to the results since the search was last run. */
  newSince: number
}

/**
 * Past runs against the resume database.
 *
 * A search is worth listing only if it can be re-run, so each row carries what
 * made it distinct — the query, its mode and its filters — rather than a name
 * someone had to invent. `newSince` is the reason to come back: the pool moves
 * even when the query does not.
 *
 * The dashboard shows the first three of these, so those three are the ones its
 * Storybook composition and Figma frame copy. Newer searches go above them and
 * change the dashboard; older ones go below and do not.
 */
const SEARCHES: Record<Brand, RecentSearch[]> = {
  hirist: [
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
  ],
  iimjobs: [
    {
      id: "s1",
      query: "P&L ownership, FMCG sales",
      mode: "keywords",
      filters: ["Mumbai", "12–18 yrs"],
      matches: 96,
      ranAgo: "3 hours ago",
      newSince: 4,
    },
    {
      id: "s2",
      query: "Category manager, personal care",
      mode: "keywords",
      filters: ["Mumbai", "8–12 yrs"],
      matches: 54,
      ranAgo: "Yesterday",
      newSince: 0,
    },
    {
      id: "s3",
      query: "Financial controller, CA",
      mode: "keywords",
      filters: ["Bengaluru", "10+ yrs"],
      matches: 41,
      ranAgo: "4 days ago",
      newSince: 2,
    },
    {
      id: "s4",
      query: "VP Enterprise Sales",
      mode: "jd",
      filters: ["Delhi NCR", "15+ yrs", "SaaS"],
      matches: 73,
      ranAgo: "5 days ago",
      newSince: 6,
    },
    {
      id: "s5",
      query:
        "HR business partner who has run a 2,000-person manufacturing plant",
      mode: "natural",
      filters: ["Pune", "10–15 yrs"],
      matches: 38,
      ranAgo: "Last week",
      newSince: 0,
    },
    {
      id: "s6",
      query: '(CFO OR "finance head") AND IPO NOT audit',
      mode: "keywords",
      boolean: true,
      filters: ["Mumbai", "15+ yrs"],
      matches: 22,
      ranAgo: "2 weeks ago",
      newSince: 1,
    },
  ],
}

export function recentSearchesFor(brand: Brand): RecentSearch[] {
  return SEARCHES[brand]
}

/**
 * The link that re-runs a search. Everything that defines one is in the query
 * string, so a row, a pasted link and the back button all land on the same
 * search. The default mode is left out, which is what keeps the dashboard's
 * plain `?q=` meaning the same thing as a natural-language row.
 */
export function searchHref({
  query,
  mode,
  boolean,
  filters,
}: {
  query?: string
  mode: SearchMode
  boolean?: boolean
  /** A recent row's chips, read for a city and years like the text is. */
  filters?: string[]
}): string {
  const params = new URLSearchParams()
  if (mode !== DEFAULT_SEARCH_MODE) params.set("mode", mode)
  if (mode === "keywords" && boolean) params.set("boolean", "1")
  if (query) params.set("q", query)

  /**
   * WHAT THE SEARCH PINNED DOWN ARRIVES AS FILTERS, not as a fact baked into
   * the results. "Bengaluru, 9–14 yrs" lands with Current Location and
   * Experience already set, so the recruiter can see how the search was read
   * and loosen it — which is what the box's hint promises ("turned into filters
   * you can change"). The keys are the refine panel's (`lib/database-filters`).
   */
  if (query) {
    const criteria = criteriaFrom([query, ...(filters ?? [])].join("\n"))
    if (criteria.location) params.set("cur", criteria.location)
    const range = criteria.experience
    if (range) params.set("xp", writeRange(range[0], range[1])!)
  }

  const search = params.toString()
  return search ? `/database?${search}` : "/database"
}

/**
 * What a search pins down, read out of its text: a city and a span of years.
 *
 * MOCK, AND AS SHALLOW AS `lib/requirement.ts`. A list of cities and one regex
 * — enough that "Staff engineer in Bengaluru, 9–14 years" comes back as
 * Bengaluru and 9–14, which is the behaviour the results page is designed
 * against. Reading a JD properly is the search team's model, not this file's.
 */
export type Criteria = {
  location?: string
  /** Inclusive, in years. */
  experience?: [number, number]
}

const CITIES: [RegExp, string][] = [
  [/\b(?:bengaluru|bangalore)\b/i, "Bengaluru"],
  [/\bmumbai\b/i, "Mumbai"],
  [/\b(?:gurugram|gurgaon)\b/i, "Gurugram"],
  [/\bnoida\b/i, "Noida"],
  [/\b(?:delhi|ncr)\b/i, "Delhi NCR"],
  [/\bpune\b/i, "Pune"],
  [/\bhyderabad\b/i, "Hyderabad"],
  [/\bchennai\b/i, "Chennai"],
  [/\bkolkata\b/i, "Kolkata"],
]

/** "9–14 years", "10+ yrs", "12 to 18 years". */
const YEARS =
  /\b(\d{1,2})\s*(?:(\+)|\s*(?:[–-]|to)\s*(\d{1,2}))?\s*(?:years?|yrs?)\b/i

export function criteriaFrom(text: string): Criteria {
  const location = CITIES.find(([pattern]) => pattern.test(text))?.[1]

  const years = YEARS.exec(text)
  const low = years ? Number(years[1]) : NaN
  // "10+" is open-ended, but a card needs a number: six more years is about
  // the spread one seniority band covers.
  const high = years?.[3] ? Number(years[3]) : low + 6

  return {
    location,
    experience: years && high >= low ? [low, high] : undefined,
  }
}

/**
 * The line a search is known by. A JD is paragraphs, so it goes by its first
 * line, less a "Role:" label; everything else is short enough to be itself.
 */
export function headlineFor(query: string, mode: SearchMode): string {
  if (mode !== "jd") return query
  const first = query
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean)
  return (first ?? query).replace(/^(?:role|title|position)\s*:\s*/i, "")
}

/** The next three places to look, for "Expand pool". */
const NEARBY: Record<string, string[]> = {
  Bengaluru: ["Chennai", "Hyderabad", "Pune"],
  Mumbai: ["Pune", "Bengaluru", "Hyderabad"],
  Gurugram: ["Delhi NCR", "Noida", "Pune"],
  Noida: ["Delhi NCR", "Gurugram", "Bengaluru"],
  "Delhi NCR": ["Gurugram", "Noida", "Mumbai"],
  Pune: ["Mumbai", "Bengaluru", "Hyderabad"],
  Hyderabad: ["Bengaluru", "Chennai", "Pune"],
  Chennai: ["Bengaluru", "Hyderabad", "Pune"],
  Kolkata: ["Bengaluru", "Mumbai", "Delhi NCR"],
}

/** Which market a product's database is. */
const DOMAIN: Record<Brand, JobDomain> = {
  hirist: "tech",
  iimjobs: "management",
}

export type SearchResults = {
  people: Profile[]
  /**
   * The skills the cards highlight — exactly the ones the search named, and
   * none when it named none. Falling back to a posting's four random ones put
   * "Spark" under an Android search, as if the recruiter had asked for it.
   */
  requiredSkills: string[]
  /** Everything the search pinned down, as chips for the header. */
  chips: string[]
  /** When it last ran, if it is one of the recent searches. */
  ranAgo: string | null
  /**
   * The skills from this search's market that a piece of text names — how a
   * criterion typed in plain English ("has shipped Kafka in production")
   * becomes the green chip on a card.
   */
  readSkills: (text: string) => string[]
}

/**
 * The people a search finds.
 *
 * THE SAME GENERATOR AS A POSTING'S APPLICANTS, fed a posting-shaped stand-in:
 * the count is the recent row's `matches`, and its `newSince` becomes the
 * people who head To review — "6 new" on the row is six people under "New
 * since you last ran this". Seeded off the product, the mode and the text, so
 * the same search deals the same people every time and a card can be pointed
 * at in a review.
 *
 * A search that is not in the recents has run for the first time, so nobody in
 * it is new since last time — there was no last time.
 *
 * The stand-in never reaches a screen. It exists because `applicantsFor` reads
 * a posting's counts and domain, and a second generator for the same people
 * would deal them differently.
 */
export function resultsFor(
  brand: Brand,
  { query, mode }: { query: string; mode: SearchMode }
): SearchResults {
  const recent = recentSearchesFor(brand).find(
    (search) => search.mode === mode && search.query === query
  )
  // The row's chips count as part of the search: "Java" on a JD row is a
  // skill it asked for, and "Pune" is where it looked.
  const text = [query, ...(recent?.filters ?? [])].join("\n")
  const criteria = criteriaFrom(text)
  const seed = seedFrom(`${brand}:${mode}:${query}`)

  const standIn: LiveJob = {
    id: `search-${seed.toString(36)}`,
    // `applicantsFor` reads the title to tell a design hire from an
    // engineering one, so it gets the search's own words.
    title: headlineFor(query, mode),
    location: criteria.location ?? "",
    plan: "Basic",
    domain: DOMAIN[brand],
    status: "live",
    applicants: recent?.matches ?? 24 + (seed % 140),
    newSinceVisit: recent?.newSince ?? 0,
    recommendations: 0,
    recommendationsNew: 0,
    followUp: 0,
    shortlisted: 0,
    notAFit: 0,
    followUpOldestDays: 0,
    expiresInDays: 0,
  }

  const requiredSkills = skillsIn(standIn, text)

  const years = criteria.experience
  const chips =
    recent?.filters ??
    [criteria.location, years && `${years[0]}–${years[1]} yrs`].filter(
      (chip): chip is string => Boolean(chip)
    )

  const core = applicantsFor(standIn, {
    required: requiredSkills,
    ...criteria,
  })

  /**
   * THE POOL IS WIDER THAN THE SEARCH. Beside the people who match it, a
   * search deals the ones just outside it — the same years in the next three
   * cities, the same city a few years either side — so that loosening a filter
   * finds somebody. The search's own city and years arrive as filters (see
   * `searchHref`), so the list still opens on exactly the recent row's count,
   * and "Expand pool" has real numbers to offer.
   */
  const total = standIn.applicants
  const batch = (suffix: string, size: number, options: GenerateOptions) =>
    applicantsFor(
      {
        ...standIn,
        id: `${standIn.id}-${suffix}`,
        applicants: size,
        newSinceVisit: 0,
      },
      { required: requiredSkills, ...options }
    )
  const nearby: Applicant[] = []
  if (criteria.location) {
    for (const city of NEARBY[criteria.location] ?? []) {
      nearby.push(
        ...batch(`near-${city}`, Math.max(3, Math.round(total * 0.15)), {
          ...criteria,
          location: city,
        })
      )
    }
  }
  if (criteria.experience) {
    const [low, high] = criteria.experience
    const size = Math.max(2, Math.round(total * 0.12))
    if (low > 1)
      nearby.push(
        ...batch("junior", size, {
          location: criteria.location,
          experience: [Math.max(1, low - 3), low - 1],
        })
      )
    nearby.push(
      ...batch("senior", size, {
        location: criteria.location,
        experience: [high + 1, high + 3],
      })
    )
  }

  // New since last run heads the list; everybody else is shuffled together
  // so the people just outside the search are not all at the bottom.
  const shuffle = seededRandom(seedFrom(`${standIn.id}:mix`))
  const people = [
    ...core.filter((person) => person.newSinceVisit),
    ...[...core.filter((person) => !person.newSinceVisit), ...nearby]
      .map((person) => ({ person, key: shuffle() }))
      .sort((a, b) => a.key - b.key)
      .map(({ person }) => person),
  ]

  /**
   * A posting's applicants arrived over five weeks; a database's profiles were
   * last touched any time in the last two years, and "Filter by last seen"
   * needs that spread to have anything to narrow. The days are dealt, sorted
   * and handed out in the generator's order, so the list still runs newest
   * first and Most recent still means something. The new ones keep their hours.
   */
  const older = people.filter((person) => !person.newSinceVisit).length
  const random = seededRandom(seedFrom(`${standIn.id}:seen`))
  const days = Array.from(
    { length: older },
    // Squared, so most profiles are recent and a long tail is not.
    () => 1 + Math.floor(random() ** 2 * 720)
  ).sort((a, b) => a - b)
  let next = 0

  return {
    people: people.map((person) => {
      if (person.newSinceVisit) return toProfile(person)
      const daysAgo = days[next++]
      return toProfile({
        ...person,
        appliedDaysAgo: daysAgo,
        appliedAgo: ago(daysAgo),
      })
    }),
    requiredSkills,
    chips,
    ranAgo: recent?.ranAgo ?? null,
    readSkills: (words) => skillsIn(standIn, words),
  }
}

/** A number of days, said the way a card says it, out to years. */
function ago(days: number) {
  if (days <= 1) return "Yesterday"
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  const years = Math.floor(days / 365)
  return years === 1 ? "1 year ago" : `${years} years ago`
}
