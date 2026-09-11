import { seededRandom, seedFrom, type Applicant } from "@/lib/applicants"

/**
 * Juicebox-style criteria — ranked plain-English sentences — and what each
 * one says about a person.
 *
 * ONE VERDICT, READ TWICE. The card prints it as a line of evidence and the
 * results page adds it up into the Best match score, so the two cannot
 * disagree: a card at the top of the list is at the top because of the lines
 * printed on it.
 *
 * MOCK, AND HONEST ABOUT WHAT IT KNOWS. A criterion that names a skill we can
 * see is checked against the person's skills, and the evidence points at a
 * real role on their card. A criterion that names nothing we can check is
 * what a real model would read the whole profile for; here it gets a stable
 * yes or no per person and a line that says only where it looked, rather than
 * an invented quotation.
 */
export type Verdict = {
  criterion: string
  /** The chip — the skill it names, or the start of the sentence. */
  label: string
  met: boolean
  evidence: string
}

/** What a search implies before anybody writes a criterion: one per skill. */
export function defaultCriteria(skills: string[]) {
  return skills.map((skill) => `Has hands-on experience with ${skill}`)
}

/** Short enough for a chip: the named skill, or the sentence's first words. */
function labelFor(text: string, named: string[]) {
  if (named.length > 0) return named.join(" · ")
  const words = text.replace(/^(?:has|is|was)\s+/i, "").split(/\s+/)
  const short = words.slice(0, 3).join(" ")
  return words.length > 3 ? `${short}…` : short
}

export function verdictsFor(
  applicant: Applicant,
  criteria: string[],
  readSkills: (text: string) => string[]
): Verdict[] {
  return criteria.map((criterion) => {
    const named = readSkills(criterion)
    const random = seededRandom(seedFrom(`${applicant.id}:${criterion}`))
    const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)]
    const roles = applicant.positions
    const role = pick(roles)
    const label = labelFor(criterion, named)

    if (named.length > 0) {
      const has = named.filter((skill) => applicant.skills.includes(skill))
      if (has.length === 0) {
        return {
          criterion,
          label,
          met: false,
          evidence: `No ${named.join(" or ")} anywhere on the profile.`,
        }
      }

      const skill = has.join(" and ")
      const other = roles.find((candidate) => candidate !== role)
      const lines = [
        `Used ${skill} as ${role.title} at ${role.company}.`,
        `Lists ${skill} in skills, and applied it at ${role.company} (${role.from}–${role.to ?? "now"}).`,
        other
          ? `${skill} runs through their work at ${role.company} and ${other.company}.`
          : `${skill} is central to their role at ${role.company}.`,
      ]
      return { criterion, label, met: true, evidence: pick(lines) }
    }

    // Nothing we can check it against: a stable two-in-three yes.
    const met = seedFrom(`${applicant.id}:${criterion}:met`) % 3 !== 0
    return {
      criterion,
      label,
      met,
      evidence: met
        ? `Read from their time as ${role.title} at ${role.company}.`
        : "Nothing on the profile speaks to this.",
    }
  })
}

/**
 * The Best match score from a person's verdicts: the first criterion weighs
 * most, and the generator's own score only breaks ties, so equal fits keep a
 * stable order.
 */
export function scoreFor(verdicts: Verdict[], tieBreak: number) {
  const count = verdicts.length
  if (count === 0) return tieBreak
  const total = (count * (count + 1)) / 2
  const earned = verdicts.reduce(
    (sum, verdict, index) => (verdict.met ? sum + (count - index) : sum),
    0
  )
  return Math.round((earned / total) * 90 + (tieBreak % 10))
}
