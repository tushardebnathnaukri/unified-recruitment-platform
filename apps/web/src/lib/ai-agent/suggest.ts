/**
 * What the brief box suggests while the recruiter types: their own past jobs
 * (to pre-fill from), the prototype's sample briefs and its sample JDs. It
 * replaced the row of links under the box, so the shortcuts appear only once
 * the typing says which role they are for.
 *
 * A match is a typed word that starts a word in the role's own vocabulary —
 * its function, title, alternative titles, skills, domain, industry and
 * cities — so "sal", "brand", "pune" and "hrbp" all find something. Unlike
 * `detectRole`, which always picks a role, nothing typed that matches nothing
 * suggests nothing.
 */
import { ORDER, ROLES } from "@/lib/ai-agent/data"
import type { RoleKey } from "@/lib/ai-agent/types"

/** The prototype's "pre-fill from a past job" list (its `PJ1`). */
export const PAST_JOBS: { k: RoleKey; title: string; meta: string }[] = [
  {
    k: "marketing",
    title: "Senior Brand Manager",
    meta: "Gurugram · posted 18 Jun · 212 applicants · filled",
  },
  {
    k: "sales",
    title: "Regional Sales Manager",
    meta: "Mumbai · posted 12 Aug · 146 applicants · active",
  },
  {
    k: "hr",
    title: "HR Business Partner",
    meta: "Bengaluru · posted 2 Jul · 98 applicants · closed",
  },
  {
    k: "product",
    title: "Product Manager, Payments",
    meta: "Bengaluru · posted 3 May · 176 applicants · filled",
  },
]

export type BriefSuggestion = {
  id: string
  kind: "past" | "brief" | "jd"
  role: RoleKey
  title: string
  meta: string
}

/** Past this length the recruiter is writing a brief, not looking for one. */
export const SUGGEST_MAX_CHARS = 80

/** Short words that still mean something here. */
const SHORT = new Set(["hr", "pm", "ae", "bd"])

function vocabulary(key: RoleKey) {
  const R = ROLES[key]
  const past = PAST_JOBS.filter((job) => job.k === key).map((job) => job.title)
  return [
    R.fn,
    R.title,
    ...R.alt.map((a) => a.t),
    ...past,
    ...R.skills,
    R.domain,
    R.subDomain,
    R.industry,
    R.subIndustry,
    ...R.cities.map((c) => c.n),
    key === "hr" ? "hrbp human resources people" : "",
    key === "product" ? "pm" : "",
    key === "sales" ? "ae bd business development" : "",
  ]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter(Boolean)
}

const WORDS: Record<RoleKey, string[]> = Object.fromEntries(
  ORDER.map((key) => [key, vocabulary(key)])
) as Record<RoleKey, string[]>

/** How many typed words start a word in this role's vocabulary. */
function scoreFor(key: RoleKey, typed: string[]) {
  return typed.filter((t) => WORDS[key].some((w) => w.startsWith(t))).length
}

export function briefSuggestions(text: string): BriefSuggestion[] {
  if (!text.trim() || text.length > SUGGEST_MAX_CHARS) return []
  const typed = text
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((t) => t.length >= 3 || SHORT.has(t))
  if (!typed.length) return []
  // Only the best-scoring roles: "manager" alone lists several, but "brand
  // manager pune" is the brand role, not every role with a manager in Pune.
  const scored = ORDER.map((key) => ({ key, score: scoreFor(key, typed) }))
  const top = Math.max(...scored.map((r) => r.score))
  if (top === 0) return []
  const roles = scored
    .filter((r) => r.score === top)
    .slice(0, 2)
    .map((r) => r.key)
  const past = roles.flatMap((key) =>
    PAST_JOBS.filter((job) => job.k === key).map((job): BriefSuggestion => ({
      id: "past:" + job.title,
      kind: "past",
      role: key,
      title: job.title,
      meta: job.meta,
    }))
  )
  const samples = roles.flatMap((key): BriefSuggestion[] => [
    {
      id: "brief:" + key,
      kind: "brief",
      role: key,
      title: ROLES[key].title,
      meta: ROLES[key].note,
    },
    {
      id: "jd:" + key,
      kind: "jd",
      role: key,
      title: ROLES[key].title + " JD",
      meta: "Responsibilities, must-haves and key skills",
    },
  ])
  return past.concat(samples)
}

/** The sample JD for a role, as the prototype's "or a sample JD" built it. */
export function sampleJd(key: RoleKey) {
  const R = ROLES[key]
  return (
    "Job title: " +
    R.title +
    "\n\nAbout the role\n" +
    R.note +
    "\n\nResponsibilities\n" +
    R.resp.map((x) => "• " + x).join("\n") +
    "\n\nMust have\n" +
    R.must.map((x) => "• " + x.t).join("\n") +
    "\n\nKey skills: " +
    R.skills.join(", ")
  )
}
