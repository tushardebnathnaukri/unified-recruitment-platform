import { seededRandom, seedFrom, type Applicant } from "@/lib/applicants"

/**
 * The database's refine panel — the same filters, in the same order, as the
 * live hirist search results (`search.hirist.tech/search/…`), so the design can
 * be argued about next to the real thing rather than next to a guess.
 *
 * DECLARED, NOT HAND-BUILT. Twenty sections of four kinds — a min/max pair, a
 * list of checkboxes, one select, and the gated Diversity block — so each is a
 * row in `SECTIONS` and the panel renders whatever is here. Adding the next one
 * the live page grows is a row, not a component.
 *
 * EVERY FILTER NARROWS SOMETHING. A control that does nothing reads as broken
 * in a review, so the fields the live filters read and the generator never
 * dealt — expected pay, preferred cities, languages, course type — are dealt
 * here, off each person's id, and a filter tests them. The one exception is
 * Diversity, which is gated on the live page too (see its row).
 *
 * The state is the query string, like everything else on these screens. Keys
 * are short and deliberately avoid the ones `CandidateList` already reads
 * (`exp`, `location`, `notice`, `q`…), because both look at the same URL.
 */

/** A database profile: an applicant plus what the refine panel filters on. */
export type Profile = Applicant & {
  preferredLocations: string[]
  clusters: string[]
  industry: string
  functionalArea: string
  courseType: string
  expectedCtcLakh: number
  age: number
  workPermitUS: string
  handledTeam: boolean
  willingToRelocate: boolean
  languages: string[]
  /** On this product and not on Naukri — "Show unique profiles". */
  unique: boolean
}

/** Mock company facts. Unlisted companies fall back to software. */
const COMPANY_FACTS: Record<string, { clusters: string[]; industry: string }> =
  {
    Flipkart: {
      clusters: ["Internet / eCommerce Companies", "Unicorns / Soonicorns"],
      industry: "Internet / E-commerce",
    },
    Swiggy: {
      clusters: ["Internet / eCommerce Companies", "Unicorns / Soonicorns"],
      industry: "Internet / E-commerce",
    },
    Zomato: {
      clusters: ["Internet / eCommerce Companies"],
      industry: "Internet / E-commerce",
    },
    Meesho: {
      clusters: ["Internet / eCommerce Companies", "Unicorns / Soonicorns"],
      industry: "Internet / E-commerce",
    },
    Myntra: {
      clusters: ["Internet / eCommerce Companies"],
      industry: "Internet / E-commerce",
    },
    "Urban Company": {
      clusters: ["Internet / eCommerce Companies", "Unicorns / Soonicorns"],
      industry: "Internet / E-commerce",
    },
    Dream11: {
      clusters: ["Internet / eCommerce Companies", "Unicorns / Soonicorns"],
      industry: "Internet / E-commerce",
    },
    Razorpay: {
      clusters: ["Financial Service Companies", "Unicorns / Soonicorns"],
      industry: "Banking / Financial Services / Broking",
    },
    Zerodha: {
      clusters: ["Financial Service Companies", "Unicorns / Soonicorns"],
      industry: "Banking / Financial Services / Broking",
    },
    PhonePe: {
      clusters: ["Financial Service Companies", "Unicorns / Soonicorns"],
      industry: "Banking / Financial Services / Broking",
    },
    CRED: {
      clusters: ["Financial Service Companies", "Unicorns / Soonicorns"],
      industry: "Banking / Financial Services / Broking",
    },
    Groww: {
      clusters: ["Financial Service Companies", "Unicorns / Soonicorns"],
      industry: "Banking / Financial Services / Broking",
    },
    Navi: {
      clusters: ["Financial Service Companies"],
      industry: "Banking / Financial Services / Broking",
    },
    Freshworks: {
      clusters: ["IT Product Companies"],
      industry: "IT-Software / Software Services",
    },
    Postman: {
      clusters: ["IT Product Companies", "Unicorns / Soonicorns"],
      industry: "IT-Software / Software Services",
    },
    Innovaccer: {
      clusters: ["IT Product Companies", "Unicorns / Soonicorns"],
      industry: "IT-Software / Software Services",
    },
    "ICICI Bank": {
      clusters: ["Banking Companies"],
      industry: "Banking / Financial Services / Broking",
    },
    "HDFC Bank": {
      clusters: ["Banking Companies"],
      industry: "Banking / Financial Services / Broking",
    },
    "Bajaj Finserv": {
      clusters: ["Financial Service Companies"],
      industry: "Banking / Financial Services / Broking",
    },
    "Hindustan Unilever": {
      clusters: ["FMCG Companies"],
      industry: "FMCG / Foods / Beverage",
    },
    Marico: {
      clusters: ["FMCG Companies"],
      industry: "FMCG / Foods / Beverage",
    },
    Dabur: {
      clusters: ["FMCG Companies"],
      industry: "FMCG / Foods / Beverage",
    },
    Godrej: {
      clusters: ["FMCG Companies"],
      industry: "FMCG / Foods / Beverage",
    },
    "Asian Paints": {
      clusters: ["Consumer Durables Companies"],
      industry: "Chemicals / Paints",
    },
    Titan: {
      clusters: ["Consumer Durables Companies"],
      industry: "Retail / Lifestyle",
    },
    Mahindra: {
      clusters: ["Automotive Companies"],
      industry: "Automobile / Auto Ancillaries",
    },
    "Tata Motors": {
      clusters: ["Automotive Companies"],
      industry: "Automobile / Auto Ancillaries",
    },
    "Aditya Birla Group": {
      clusters: ["Conglomerates"],
      industry: "Diversified / Conglomerate",
    },
  }

/** The live page's functional areas, read off a title. First match wins. */
const FUNCTIONS: [RegExp, string][] = [
  [/design/i, "UI / UX Designer"],
  [/sales/i, "Sales / Business Development"],
  [/marketing|category/i, "Marketing"],
  [/financ|cfo/i, "Finance & Accounts"],
  [/\bhr\b/i, "HR / Industrial Relations"],
  [/operations|general manager/i, "Operations"],
  [/analyst/i, "Business Analyst"],
  [/manager|head|director/i, "Project Lead / Manager"],
  [/engineer|architect|platform/i, "Software Developer"],
]

/** A lead of people, not a lead engineer — Principal and Staff are ICs. */
const LEADS_A_TEAM =
  /manager|head|director|vice president|\bvp\b|chief|lead product designer/i

const LANGUAGE_BY_CITY: Record<string, string> = {
  Bengaluru: "Kannada",
  Chennai: "Tamil",
  Hyderabad: "Telugu",
  Pune: "Marathi",
  Mumbai: "Marathi",
  Kolkata: "Bengali",
  Kochi: "Malayalam",
  Ahmedabad: "Gujarati",
}

const COURSE_TYPES = [
  "Full Time",
  "Part Time",
  "Distance Learning Program",
  "Executive Program",
  "Certification",
]

const WORK_PERMITS = [
  "No",
  "Have H1 Visa",
  "TN Permit Holder",
  "Green Card Holder",
  "US Citizen",
  "Authorized to work in US",
]

const CITIES = [
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Gurugram",
  "Mumbai",
  "Chennai",
  "Noida",
  "Delhi NCR",
]

/**
 * The live page offers regions and groups above the cities — Delhi/NCR,
 * Metros, South India — and ticking one is ticking every city in it.
 */
const LOCATION_GROUPS: Record<string, string[]> = {
  "Delhi/NCR": ["Delhi NCR", "Gurugram", "Noida"],
  Metros: [
    "Mumbai",
    "Delhi NCR",
    "Gurugram",
    "Noida",
    "Bengaluru",
    "Chennai",
    "Kolkata",
    "Hyderabad",
  ],
  "South India": ["Bengaluru", "Chennai", "Hyderabad", "Kochi"],
  "West India": ["Mumbai", "Pune", "Ahmedabad"],
}

/** Institute groups, by the prefix every member's name starts with. */
const INSTITUTE_GROUPS: Record<string, string> = {
  IITs: "IIT ",
  NITs: "NIT ",
  IIMs: "IIM ",
}

/** Degrees as the live page names them; anything unlisted is its own name. */
const DEGREE_LABELS: Record<string, string> = {
  "B.Tech": "BTech/BE",
  "B.E.": "BTech/BE",
  "M.Tech": "MSc/MS/MTech",
  MCA: "MCA",
  MBA: "MBA/PGDM",
  PGDM: "MBA/PGDM",
  "B.Com": "Bcom",
}

export function degreeLabel(degree: string) {
  return DEGREE_LABELS[degree] ?? degree
}

/**
 * The fields the generator never dealt, dealt from each person's id so a
 * profile is the same every time and a filter result can be pointed at.
 *
 * Derived where there is something to derive from — industry and cluster from
 * the company, function and "handled a team" from the title, age from the
 * career, a language from the city — and rolled only where there is not.
 */
export function toProfile(applicant: Applicant): Profile {
  const random = seededRandom(seedFrom(`${applicant.id}:profile`))
  const facts = COMPANY_FACTS[applicant.company] ?? {
    clusters: ["IT Product Companies"],
    industry: "IT-Software / Software Services",
  }

  const elsewhere = CITIES.filter((city) => city !== applicant.location)
  const preferred = [applicant.location]
  if (random() < 0.5)
    preferred.push(elsewhere[Math.floor(random() * elsewhere.length)])
  if (random() < 0.15) preferred.push("Anywhere")

  const languages = ["English"]
  const regional = LANGUAGE_BY_CITY[applicant.location]
  if (regional) languages.push(regional)
  if (!regional || random() < 0.7) languages.push("Hindi")

  const course = random()
  const permit = random()

  return {
    ...applicant,
    preferredLocations: preferred,
    clusters: facts.clusters,
    industry: facts.industry,
    functionalArea:
      FUNCTIONS.find(([pattern]) => pattern.test(applicant.title))?.[1] ??
      "Software Developer",
    courseType:
      course < 0.85
        ? COURSE_TYPES[0]
        : COURSE_TYPES[1 + Math.floor(((course - 0.85) / 0.15) * 4)],
    // What people ask for when they move: fifteen to fifty per cent more.
    expectedCtcLakh: Math.round(
      applicant.currentCtcLakh * (1.15 + random() * 0.35)
    ),
    // Graduated at about 22, then worked every year since.
    age: 22 + applicant.experienceYears + Math.floor(random() * 3),
    workPermitUS:
      permit < 0.88
        ? "No"
        : WORK_PERMITS[1 + Math.floor(((permit - 0.88) / 0.12) * 5)],
    handledTeam: LEADS_A_TEAM.test(applicant.title),
    willingToRelocate: random() < 0.55,
    languages,
    unique: random() < 0.3,
  }
}

/** The filters that are one box each, above the sections. */
export const TOGGLES = [
  { key: "hide", label: "Hide viewed profiles" },
  {
    key: "unique",
    label: "Show unique profiles",
    hint: "Only people who are not also on Naukri",
  },
] as const

/** "Filter by last seen", above the list on the live page. In days. */
export const LAST_SEEN = [
  { value: "", label: "All" },
  { value: "7", label: "Last 7 days" },
  { value: "15", label: "Last 15 days" },
  { value: "30", label: "Last month" },
  { value: "90", label: "Last 3 months" },
  { value: "180", label: "Last 6 months" },
  { value: "365", label: "Last 1 year" },
  { value: "548", label: "Last 1.5 years" },
  { value: "730", label: "Last 2 years" },
]

type Option = { value: string; label: string }

export type RangeSection = {
  kind: "range"
  key: string
  label: string
  /** Both selects' options, in the order they are offered. */
  values: number[]
  format: (value: number) => string
  get: (profile: Profile) => number
}

export type ChecksSection = {
  kind: "checks"
  key: string
  label: string
  /** The "?" beside the heading on the live page. */
  hint?: string
  /** Placeholder of the list's search box. Lists short enough to scan have none. */
  search?: string
  /** Drawn from the people in the results, so no option can return nobody. */
  options: (profiles: Profile[]) => string[]
  test: (profile: Profile, chosen: string[]) => boolean
}

export type SelectSection = {
  kind: "select"
  key: string
  label: string
  options: Option[]
  test: (profile: Profile, value: string) => boolean
}

/**
 * On the live page Diversity carries a "Maven Exclusive" badge and opens onto
 * a request-access form: the recruiter can see what it filters by and cannot
 * use it. That is what is drawn here — and it is also why this mock never deals
 * anybody a gender or a disability, which a generator would only be guessing
 * from a first name.
 */
export type GatedSection = {
  kind: "gated"
  key: string
  label: string
  badge: string
  note: string
  groups: { title: string; options: string[] }[]
}

export type Section =
  RangeSection | ChecksSection | SelectSection | GatedSection

const range = (from: number, to: number, step = 1) =>
  Array.from(
    { length: Math.floor((to - from) / step) + 1 },
    (_, i) => from + i * step
  )

/** Every value in the results, most common first then alphabetical. */
const present = (values: string[]) => {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.keys()].sort(
    (a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b)
  )
}

/** Groups first — only those with somebody in them — then the cities. */
const locationOptions = (cities: string[]) => [
  ...Object.keys(LOCATION_GROUPS).filter((group) =>
    LOCATION_GROUPS[group].some((city) => cities.includes(city))
  ),
  ...present(cities),
]

const inLocations = (city: string, chosen: string[]) =>
  chosen.some((option) =>
    LOCATION_GROUPS[option]
      ? LOCATION_GROUPS[option].includes(city)
      : option === city
  )

const notice = (label: string, days: number): Option => ({
  value: String(days),
  label,
})

export const SECTIONS: Section[] = [
  {
    kind: "range",
    key: "xp",
    label: "Experience",
    values: range(0, 31),
    format: (years) => `${years} yrs`,
    get: (profile) => profile.experienceYears,
  },
  {
    kind: "checks",
    key: "cur",
    label: "Current Location",
    search: "Search current location",
    options: (profiles) => locationOptions(profiles.map((p) => p.location)),
    test: (profile, chosen) => inLocations(profile.location, chosen),
  },
  {
    kind: "checks",
    key: "pref",
    label: "Preferred Location",
    search: "Search preferred location",
    options: (profiles) => [
      ...locationOptions(
        profiles
          .flatMap((p) => p.preferredLocations)
          .filter((c) => c !== "Anywhere")
      ),
      "Anywhere",
    ],
    // Somebody happy to go anywhere is a match for wherever you picked.
    test: (profile, chosen) =>
      profile.preferredLocations.includes("Anywhere") ||
      profile.preferredLocations.some((city) => inLocations(city, chosen)),
  },
  {
    kind: "checks",
    key: "cluster",
    label: "Companies Cluster",
    hint: "Clusters of companies based on a similar industry or domain",
    options: (profiles) => present(profiles.flatMap((p) => p.clusters)),
    test: (profile, chosen) => profile.clusters.some((c) => chosen.includes(c)),
  },
  {
    kind: "checks",
    key: "org",
    label: "Organization",
    search: "Search organization",
    // Anywhere they have worked, not only where they are now.
    options: (profiles) =>
      present(
        profiles.flatMap((p) => [...new Set(p.positions.map((r) => r.company))])
      ),
    test: (profile, chosen) =>
      profile.positions.some((role) => chosen.includes(role.company)),
  },
  {
    kind: "checks",
    key: "fn",
    label: "Functional Area",
    search: "Search functional area",
    options: (profiles) => present(profiles.map((p) => p.functionalArea)),
    test: (profile, chosen) => chosen.includes(profile.functionalArea),
  },
  {
    kind: "checks",
    key: "ind",
    label: "Industry",
    search: "Search industry",
    options: (profiles) => present(profiles.map((p) => p.industry)),
    test: (profile, chosen) => chosen.includes(profile.industry),
  },
  {
    kind: "checks",
    key: "inst",
    label: "Institute",
    search: "Search institute",
    options: (profiles) => {
      const schools = profiles.map((p) => p.education.school)
      return [
        ...Object.keys(INSTITUTE_GROUPS).filter((group) =>
          schools.some((school) => school.startsWith(INSTITUTE_GROUPS[group]))
        ),
        ...present(schools),
      ]
    },
    test: (profile, chosen) =>
      chosen.some((option) =>
        INSTITUTE_GROUPS[option]
          ? profile.education.school.startsWith(INSTITUTE_GROUPS[option])
          : option === profile.education.school
      ),
  },
  {
    kind: "checks",
    key: "deg",
    label: "Degree",
    options: (profiles) =>
      present(profiles.map((p) => degreeLabel(p.education.degree))),
    test: (profile, chosen) =>
      chosen.includes(degreeLabel(profile.education.degree)),
  },
  {
    kind: "checks",
    key: "course",
    label: "Course Type",
    options: (profiles) =>
      COURSE_TYPES.filter((type) =>
        profiles.some((p) => p.courseType === type)
      ),
    test: (profile, chosen) => chosen.includes(profile.courseType),
  },
  {
    kind: "range",
    key: "batch",
    label: "Batch",
    // Newest first, as the live page lists them.
    values: range(1980, 2026).reverse(),
    format: String,
    get: (profile) => profile.education.to,
  },
  {
    kind: "range",
    key: "ctc",
    label: "Salary",
    values: range(1, 99),
    format: (lakh) => `₹${lakh}L`,
    get: (profile) => profile.currentCtcLakh,
  },
  {
    kind: "range",
    key: "ectc",
    label: "Expected Salary",
    values: range(1, 99),
    format: (lakh) => `₹${lakh}L`,
    get: (profile) => profile.expectedCtcLakh,
  },
  {
    kind: "select",
    key: "np",
    label: "Notice Period",
    options: [
      notice("Immediately available", 0),
      notice("≤ 1 month", 30),
      notice("≤ 2 months", 60),
      notice("≤ 3 months", 90),
      notice("≤ 4 months", 120),
      notice("≤ 5 months", 150),
      notice("≤ 6 months", 180),
    ],
    test: (profile, value) => profile.noticeDays <= Number(value),
  },
  {
    kind: "range",
    key: "age",
    label: "Age",
    values: range(22, 65),
    format: String,
    get: (profile) => profile.age,
  },
  {
    kind: "gated",
    key: "diversity",
    label: "Diversity",
    badge: "Maven Exclusive",
    note: "Diversity filters come with Maven. Ask your account manager to switch them on.",
    groups: [
      {
        title: "Gender",
        options: [
          "Female",
          "All Females",
          "Returning from career break",
          "Working Mother",
          "Single Parent",
          "All Males",
        ],
      },
      {
        title: "Ex-defence personnel",
        options: [
          "Armed Forces",
          "Navy",
          "Air Force",
          "Naval Coast Guard",
          "Other Defence Service(s)",
        ],
      },
      {
        title: "Differently abled",
        options: [
          "Any Disabilities",
          "Locomotor Disability",
          "Visual Impairment",
          "Hearing Impairment",
          "Speech & Language Disability",
        ],
      },
    ],
  },
  {
    kind: "select",
    key: "permit",
    label: "Work Permit for USA",
    options: WORK_PERMITS.map((permit) => ({ value: permit, label: permit })),
    test: (profile, value) => profile.workPermitUS === value,
  },
  {
    kind: "select",
    key: "team",
    label: "Handled a team?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    test: (profile, value) => profile.handledTeam === (value === "yes"),
  },
  {
    kind: "select",
    key: "relocate",
    label: "Willing to relocate?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    test: (profile, value) => profile.willingToRelocate === (value === "yes"),
  },
  {
    kind: "checks",
    key: "lang",
    label: "Language",
    search: "Search language",
    options: (profiles) => present(profiles.flatMap((p) => p.languages)),
    test: (profile, chosen) =>
      profile.languages.some((l) => chosen.includes(l)),
  },
]

/** `?xp=5-10`, `?xp=5-`, `?xp=-10` — either end may be open. */
export function readRange(params: URLSearchParams, key: string) {
  const [min, max] = (params.get(key) ?? "-").split("-")
  return {
    min: min === "" || min === undefined ? null : Number(min),
    max: max === "" || max === undefined ? null : Number(max),
  }
}

export function writeRange(min: number | null, max: number | null) {
  return min === null && max === null ? null : `${min ?? ""}-${max ?? ""}`
}

/** Every key the panel writes, for "Clear all". */
export const FILTER_KEYS = [
  ...TOGGLES.map((toggle) => toggle.key),
  "seen",
  "ex",
  ...SECTIONS.filter((s) => s.kind !== "gated").map((s) => s.key),
]

/**
 * "Exclude profiles" — Juicebox's, by what has already been decided about
 * somebody. `?ex=` repeated. Viewed is the refine panel's `hide` toggle under
 * another name, so both designs mean the same thing by it.
 */
export const EXCLUSIONS = [
  { value: "shortlisted", label: "Shortlisted" },
  { value: "maybe", label: "Maybe" },
  { value: "contacted", label: "Contacted" },
  { value: "rejected", label: "Not a fit" },
] as const

export function activeFilterCount(params: URLSearchParams) {
  return FILTER_KEYS.filter((key) => params.has(key)).length
}

/**
 * Whether a profile survives every filter in the URL. `viewed` is who has had
 * their profile opened this session; `open` is who is open right now, and is
 * never hidden — hiding the person whose panel you just opened would close it
 * under you.
 */
export function profileMatches(
  profile: Profile,
  params: URLSearchParams,
  viewed: Set<string>,
  open: string | null
) {
  if (
    params.get("hide") === "1" &&
    viewed.has(profile.id) &&
    profile.id !== open
  )
    return false
  if (params.get("unique") === "1" && !profile.unique) return false

  const seen = params.get("seen")
  if (seen && profile.appliedDaysAgo > Number(seen)) return false

  for (const section of SECTIONS) {
    if (section.kind === "range") {
      const { min, max } = readRange(params, section.key)
      const value = section.get(profile)
      if (min !== null && value < min) return false
      if (max !== null && value > max) return false
    } else if (section.kind === "checks") {
      const chosen = params.getAll(section.key)
      if (chosen.length > 0 && !section.test(profile, chosen)) return false
    } else if (section.kind === "select") {
      const value = params.get(section.key)
      if (value && !section.test(profile, value)) return false
    }
  }

  return true
}

export type Expansion = {
  label: string
  /** How many more profiles it would find. */
  gain: number
  /** The whole query string with this one filter loosened. */
  params: URLSearchParams
}

/**
 * "4–14 yrs", not "4 yrs–14 yrs": when both ends carry the same unit after
 * the number, it is said once, at the end.
 */
function span(section: RangeSection, from: number, to: number) {
  const end = section.format(to)
  const unit = end.slice(String(to).length)
  return end.startsWith(String(to)) && section.format(from) === `${from}${unit}`
    ? `${from}–${end}`
    : `${section.format(from)}–${end}`
}

/** How far "widen" moves each end of a range. */
const WIDEN: Record<string, number> = {
  xp: 3,
  age: 3,
  batch: 3,
  ctc: 10,
  ectc: 10,
}

/**
 * "Expand pool": the few loosenings that would find the most people, each
 * with its number — Juicebox's "Widen radius to 50mi +325".
 *
 * COUNTED, NOT GUESSED. Every candidate is run against the whole pool through
 * `count`, so "+14" is fourteen people who would appear. Only the loosening
 * worth the most per filter is offered — adding the single best city, not
 * every city — and only the top three overall, because a row of ten chips is
 * a second filter panel.
 *
 * Exclusions are never offered: who you have already ruled out is not a filter
 * to be talked out of.
 */
export function expansions(
  params: URLSearchParams,
  profiles: Profile[],
  count: (params: URLSearchParams) => number
): Expansion[] {
  const current = count(params)
  const candidates: Omit<Expansion, "gain">[] = []
  const without = (key: string, value?: string | null) => {
    const next = new URLSearchParams(params)
    next.delete(key)
    if (value) next.set(key, value)
    return next
  }

  for (const section of SECTIONS) {
    if (section.kind === "range" && params.has(section.key)) {
      const { min, max } = readRange(params, section.key)
      const step = WIDEN[section.key] ?? 3
      const low = Math.min(...section.values)
      const high = Math.max(...section.values)
      const wider = [
        min === null ? null : Math.max(low, min - step),
        max === null ? null : Math.min(high, max + step),
      ] as const
      const said =
        wider[0] !== null && wider[1] !== null
          ? span(section, wider[0], wider[1])
          : wider[0] !== null
            ? `from ${section.format(wider[0])}`
            : `up to ${section.format(wider[1]!)}`
      candidates.push({
        label: `Widen ${section.label.toLowerCase()} to ${said}`,
        params: without(section.key, writeRange(wider[0], wider[1])),
      })
    }

    if (section.kind === "checks") {
      const chosen = params.getAll(section.key)
      if (chosen.length === 0) continue
      let best: Omit<Expansion, "gain"> & { gain: number } = {
        label: "",
        params,
        gain: 0,
      }
      for (const option of section.options(profiles)) {
        if (chosen.includes(option)) continue
        const next = new URLSearchParams(params)
        next.append(section.key, option)
        const gain = count(next) - current
        if (gain > best.gain)
          best = { label: `Add ${option}`, params: next, gain }
      }
      if (best.gain > 0) candidates.push(best)
    }

    if (section.kind === "select" && params.has(section.key)) {
      candidates.push({
        label: `Any ${section.label.replace(/\?$/, "").toLowerCase()}`,
        params: without(section.key),
      })
    }
  }

  if (params.has("seen"))
    candidates.push({ label: "Any last seen", params: without("seen") })
  if (params.has("unique"))
    candidates.push({
      label: "Include people also on Naukri",
      params: without("unique"),
    })

  return candidates
    .map((candidate) => ({
      ...candidate,
      gain: count(candidate.params) - current,
    }))
    .filter((candidate) => candidate.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3)
}
