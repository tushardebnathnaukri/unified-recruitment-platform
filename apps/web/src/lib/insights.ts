/**
 * Market data behind Insights, modelled on Calculus.
 *
 * IT DESCRIBES A MARKET, NOT A RECRUITER. Nothing in here knows what you have
 * posted or who applied — that is the Dashboard's job. This answers "what does
 * the talent for this role look like", which is a question you ask BEFORE
 * having a posting, and the reason the page is called Insights rather than
 * Analytics: a recruiter reads "analytics" as "how am I doing".
 *
 * Numbers are hand-set to be internally consistent — the percentiles bracket
 * the median, the city shares sum to 100, and expected pay sits above current
 * everywhere, because a reviewer who spots an impossible number spends the
 * meeting on the data instead of the design.
 */

export type Percentile = { label: string; current: number; expected: number }

/** Lakh per annum, which is how this market states pay. */
export const SALARY_PERCENTILES: Percentile[] = [
  { label: "10th", current: 26, expected: 32 },
  { label: "25th", current: 38, expected: 45 },
  { label: "50th", current: 50, expected: 60 },
  { label: "75th", current: 68, expected: 79 },
  { label: "90th", current: 88, expected: 102 },
]

export const SALARY_SUMMARY = {
  medianCurrent: 50,
  medianExpected: 60,
  /** What a candidate asks for over what they earn — the number that decides a band. */
  uplift: 20,
}

export type CityRow = {
  city: string
  /** Share of the searched profiles, in percent. */
  share: number
  medianLakh: number
  /** Year-on-year movement in median pay, in percent. */
  change: number
}

/**
 * Ordered by share, which is how a recruiter reads it: where are the people,
 * then what do they cost there. `change` is the column that turns this from a
 * table into a decision — a city getting cheaper is a city to post in.
 */
export const CITIES: CityRow[] = [
  { city: "Bengaluru", share: 44.4, medianLakh: 55, change: 10 },
  { city: "Delhi NCR", share: 20.4, medianLakh: 50, change: 0 },
  { city: "Hyderabad", share: 12.4, medianLakh: 55, change: 10 },
  { city: "Pune", share: 8.6, medianLakh: 47.7, change: -4.6 },
  { city: "Chennai", share: 5.2, medianLakh: 42, change: -16 },
  { city: "Mumbai", share: 4.9, medianLakh: 43.5, change: -13 },
  { city: "Kolkata", share: 0.9, medianLakh: 35.5, change: -29 },
]

export const NATIONAL_MEDIAN = 50

export type DemandPoint = { month: string; postings: number }

export const DEMAND: DemandPoint[] = [
  { month: "Mar", postings: 86 },
  { month: "Apr", postings: 64 },
  { month: "May", postings: 97 },
  { month: "Jun", postings: 127 },
  { month: "Jul", postings: 112 },
  { month: "Aug", postings: 134 },
]

export type FlowRow = { company: string; share: number }

/**
 * Where this talent comes from and where it goes.
 *
 * A LIST WITH SHARE BARS, NOT A SANKEY. The ribbon diagram Calculus draws is
 * the same two rankings with a curve between them, and the curve is the part
 * nobody can read a number off. Two ordered lists answer "who do I poach from"
 * and "who am I losing to" directly, and they survive being narrow.
 */
export const FLOW_IN: FlowRow[] = [
  { company: "Siemens", share: 18 },
  { company: "Publicis Sapient", share: 15 },
  { company: "Matter Motor Works", share: 11 },
  { company: "Nonghyup Bank", share: 9 },
  { company: "Accenture", share: 7 },
]

export const FLOW_OUT: FlowRow[] = [
  { company: "Bhanzu", share: 21 },
  { company: "Creesync Software", share: 16 },
  { company: "Oracle", share: 12 },
  { company: "Wells Fargo", share: 8 },
  { company: "Walmart", share: 6 },
]

export type Advice = {
  id: string
  /** The finding, said as a recommendation rather than a statistic. */
  headline: string
  /** The number it rests on, so a recruiter can disagree with it. */
  evidence: string
  tone: "act" | "caution" | "neutral"
}

/**
 * The only part of the page that says what to DO, which is why it sits at the
 * top rather than under the thirteen charts it summarises — the arrangement
 * Calculus uses, and the one thing about that page I would not copy.
 *
 * Every line carries its evidence. An advisory a recruiter cannot check is one
 * they either believe blindly or ignore, and both are worse than a chart.
 */
export const ADVICE: Advice[] = [
  {
    id: "a1",
    headline: "Move quickly — demand is climbing",
    evidence: "134 postings in Aug, up 56% from Apr",
    tone: "act",
  },
  {
    id: "a2",
    headline: "Budget around ₹60L to be competitive",
    evidence: "Median ask is ₹60L against ₹50L earned — a 20% uplift",
    tone: "neutral",
  },
  {
    id: "a3",
    headline: "Look beyond Bengaluru",
    evidence: "44% of profiles, and the only metro where pay rose 10%",
    tone: "caution",
  },
  {
    id: "a4",
    headline: "Chennai and Kolkata are getting cheaper",
    evidence: "Median down 16% and 29% year on year",
    tone: "act",
  },
]

export type FacetOption = {
  value: string
  label: string
  /** Share of the pool this option covers, 0–1. Drives the profile count. */
  share: number
}

export type Facet = {
  id: string
  label: string
  options: FacetOption[]
  /** Open on first render. The three a recruiter reaches for first. */
  defaultOpen?: boolean
}

/**
 * The facets Calculus refines by, in its order, now with something behind them.
 *
 * EVERY OPTION CARRIES ITS SHARE OF THE POOL, which is what lets the profile
 * count respond to a selection without anybody inventing a number. The city
 * shares are the same ones the geography table prints, so the rail and the
 * table cannot disagree about how much of this market is in Bengaluru.
 */
export const FACETS: Facet[] = [
  {
    id: "location",
    label: "Current Location",
    defaultOpen: true,
    options: CITIES.map((city) => ({
      value: city.city,
      label: city.city,
      share: city.share / 100,
    })),
  },
  {
    id: "experience",
    label: "Experience",
    defaultOpen: true,
    options: [
      { value: "0-8", label: "Under 8 yrs", share: 0.18 },
      { value: "8-12", label: "8–12 yrs", share: 0.24 },
      { value: "12-16", label: "12–16 yrs", share: 0.31 },
      { value: "16+", label: "16 yrs and over", share: 0.27 },
    ],
  },
  {
    id: "salary",
    label: "Salary",
    defaultOpen: true,
    options: [
      { value: "0-40", label: "Under ₹40L", share: 0.22 },
      { value: "40-60", label: "₹40–60L", share: 0.36 },
      { value: "60-85", label: "₹60–85L", share: 0.28 },
      { value: "85+", label: "₹85L and over", share: 0.14 },
    ],
  },
  {
    id: "companies",
    label: "Companies Cluster",
    options: [
      { value: "product", label: "Product", share: 0.34 },
      { value: "services", label: "IT Services", share: 0.29 },
      { value: "gcc", label: "Global Capability Centre", share: 0.21 },
      { value: "startup", label: "Funded startup", share: 0.16 },
    ],
  },
  {
    id: "function",
    label: "Functional Area",
    options: [
      { value: "engineering", label: "Engineering", share: 0.41 },
      { value: "product", label: "Product", share: 0.19 },
      { value: "data", label: "Data & Analytics", share: 0.17 },
      { value: "sales", label: "Sales", share: 0.13 },
      { value: "operations", label: "Operations", share: 0.1 },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    options: [
      { value: "microsoft", label: "Microsoft", share: 0.09 },
      { value: "oracle", label: "Oracle", share: 0.08 },
      { value: "accenture", label: "Accenture", share: 0.07 },
      { value: "wells-fargo", label: "Wells Fargo", share: 0.05 },
      { value: "walmart", label: "Walmart", share: 0.04 },
    ],
  },
  {
    id: "preferred",
    label: "Preferred Location",
    options: CITIES.slice(0, 5).map((city) => ({
      value: `pref-${city.city}`,
      label: city.city,
      share: (city.share + 6) / 100,
    })),
  },
  {
    id: "institute",
    label: "Institute",
    options: [
      { value: "iit", label: "IIT", share: 0.14 },
      { value: "nit", label: "NIT", share: 0.12 },
      { value: "iim", label: "IIM", share: 0.09 },
      { value: "bits", label: "BITS", share: 0.05 },
      { value: "other", label: "Other", share: 0.6 },
    ],
  },
  {
    id: "degree",
    label: "Degree",
    options: [
      { value: "btech", label: "B.Tech / BE", share: 0.58 },
      { value: "mtech", label: "M.Tech / ME", share: 0.17 },
      { value: "mba", label: "MBA / PGDM", share: 0.16 },
      { value: "other", label: "Other", share: 0.09 },
    ],
  },
  {
    id: "course",
    label: "Course Type",
    options: [
      { value: "full-time", label: "Full time", share: 0.83 },
      { value: "part-time", label: "Part time", share: 0.11 },
      { value: "distance", label: "Distance learning", share: 0.06 },
    ],
  },
  {
    id: "batch",
    label: "Batch",
    options: [
      { value: "2020s", label: "2020 and later", share: 0.11 },
      { value: "2015-2019", label: "2015–2019", share: 0.23 },
      { value: "2010-2014", label: "2010–2014", share: 0.31 },
      { value: "pre-2010", label: "Before 2010", share: 0.35 },
    ],
  },
  {
    id: "age",
    label: "Age",
    options: [
      { value: "25-30", label: "25–30", share: 0.16 },
      { value: "31-36", label: "31–36", share: 0.34 },
      { value: "37-42", label: "37–42", share: 0.32 },
      { value: "43+", label: "43 and over", share: 0.18 },
    ],
  },
]

/** Profiles matching the keyword before any facet narrows it. */
export const POOL_SIZE = 12480

/**
 * How many profiles survive a set of selections.
 *
 * Options WITHIN a facet add — picking Bengaluru and Pune means either — and
 * facets multiply, which assumes they are independent. They are not: senior
 * people earn more, so Experience and Salary overlap heavily and this
 * understates the result. It is an approximation on purpose, and the honest
 * version needs the real index behind it rather than a better formula here.
 */
export function poolFor(selected: Record<string, string[]>): number {
  let fraction = 1

  for (const facet of FACETS) {
    const chosen = selected[facet.id]
    if (!chosen?.length) continue

    const covered = facet.options
      .filter((option) => chosen.includes(option.value))
      .reduce((sum, option) => sum + option.share, 0)

    fraction *= Math.min(covered, 1)
  }

  return Math.max(1, Math.round(POOL_SIZE * fraction))
}
