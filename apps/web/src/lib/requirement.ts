/**
 * Reading the dashboard's requirement box as it is typed.
 *
 * THE CHECKLIST IS THE PROMPT. A blank box that says "describe who you are
 * hiring for" is hard to answer cold; the same box with five parts under it —
 * location, title, experience, industry, skills — tells the recruiter what a
 * useful description has in it, and ticks each part off as it shows up. That
 * is the job the "Try" starter chips used to do, done while you write instead
 * of instead of writing.
 *
 * MOCK, AND DELIBERATELY SHALLOW. Word lists and two regexes, which is enough
 * to make the checklist move in a review — "Product designer in new delhi"
 * ticks Location and Job Title and nothing else, which is the behaviour to
 * design against. A real parser is the database team's call, not this file's.
 *
 * One set of lists for both products. Detection is not a brand divergence:
 * a management hire and a tech hire are both a title, a city and a number of
 * years, so the lists simply hold both vocabularies.
 */

export type RequirementPart = {
  id: "location" | "title" | "experience" | "industry" | "skills"
  label: string
  found: boolean
}

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Whole words or phrases from a list, case-insensitive. */
const anyOf = (list: string[]) =>
  new RegExp(`\\b(?:${list.map(escape).join("|")})\\b`, "i")

const LOCATION = anyOf([
  "bengaluru",
  "bangalore",
  "mumbai",
  "delhi",
  "ncr",
  "gurugram",
  "gurgaon",
  "noida",
  "pune",
  "hyderabad",
  "chennai",
  "kolkata",
  "ahmedabad",
  "jaipur",
  "kochi",
  "remote",
  "hybrid",
  "multiple locations",
  "pan india",
])

const TITLE = anyOf([
  "engineer",
  "developer",
  "designer",
  "manager",
  "lead",
  "head",
  "director",
  "architect",
  "analyst",
  "scientist",
  "consultant",
  "controller",
  "officer",
  "specialist",
  "executive",
  "associate",
  "president",
  "vp",
  "avp",
  "svp",
  "cto",
  "cfo",
  "ceo",
  "coo",
  "cmo",
  "chro",
  "founder",
  "partner",
  "recruiter",
  "accountant",
  "strategist",
  "researcher",
])

/** "9–14 years", "10+ yrs", "6+", or "fresher". */
const EXPERIENCE =
  /\b\d+\s*(?:\+|\s*(?:[–-]|to)\s*\d+)?\s*(?:years?|yrs?)\b|\b\d+\+|\bfreshers?\b/i

const INDUSTRY = anyOf([
  "fintech",
  "payments",
  "banking",
  "bfsi",
  "insurance",
  "fmcg",
  "consumer",
  "retail",
  "e-commerce",
  "ecommerce",
  "d2c",
  "saas",
  "b2b",
  "enterprise",
  "healthcare",
  "pharma",
  "edtech",
  "logistics",
  "telecom",
  "automotive",
  "manufacturing",
  "media",
  "gaming",
  "real estate",
  "it services",
  "listed company",
  "startup",
  "hospitality",
  "energy",
])

/**
 * Skills are the named ones — Kafka, P&L, a CA — or a claim of having done
 * something. The function words that are really part of a title ("sales",
 * "marketing", "platform") are left out, or every description would tick this
 * the moment it had a role in it.
 */
const SKILLS = anyOf([
  "kafka",
  "kubernetes",
  "docker",
  "aws",
  "gcp",
  "azure",
  "java",
  "python",
  "golang",
  "react",
  "node",
  "typescript",
  "sql",
  "spark",
  "ml",
  "machine learning",
  "ai",
  "figma",
  "design system",
  "design systems",
  "microservices",
  "devops",
  "android",
  "ios",
  "flutter",
  "p&l",
  "quota",
  "gtm",
  "go-to-market",
  "fp&a",
  "m&a",
  "ca",
  "mba",
  "cfa",
  "ifrs",
  "audit",
  "taxation",
  "key accounts",
  "supply chain",
  "procurement",
  "compliance",
])

const HAS_DONE =
  /\b(?:has|have)\s+(?:run|built|led|managed|owned|shipped|carried|closed|scaled)\b|\bowns\b/i

export function requirementParts(text: string): RequirementPart[] {
  return [
    { id: "location", label: "Location", found: LOCATION.test(text) },
    { id: "title", label: "Job Title", found: TITLE.test(text) },
    {
      id: "experience",
      label: "Years of Experience",
      found: EXPERIENCE.test(text),
    },
    { id: "industry", label: "Industry", found: INDUSTRY.test(text) },
    {
      id: "skills",
      label: "Skills",
      found: SKILLS.test(text) || HAS_DONE.test(text),
    },
  ]
}

/**
 * The role inside a requirement: what comes before the first comma, less any
 * "in <city>". "Staff platform engineer in Bengaluru, 9–14 years" is a
 * Staff platform engineer — which is what a posting is titled and what
 * Insights is searched by, while the database search takes the whole sentence.
 *
 * A heuristic, and a prototype's one. A keyword search ("Kafka, Kubernetes")
 * has no role in it and comes back as its first keyword.
 */
export function roleFrom(text: string): string {
  const head = text.split(/[,\n]/)[0] ?? ""
  return head.replace(/\s+in\s+.*$/i, "").trim()
}
