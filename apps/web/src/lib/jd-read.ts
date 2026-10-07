/**
 * Reading a job description by the rules — what Chat v2.5's JD step takes
 * out of a JD when Gemini is not there to read it, and the checks it applies
 * to whatever Gemini does read.
 *
 * WHAT A REAL JD HOLDS, read off 37 live iimjobs postings on 5 Oct 2026: a
 * page of duties that are mostly generic, and a short "must have" or
 * "candidate profile" block that is the useful part — "must have handled
 * USFDA and EU-GMP audits", "fundraising experience is mandatory". So the
 * requirement lines are what is kept, by the section they sit in or the words
 * on the line; duties and soft skills are left out.
 *
 * Plain text in, plain text out, and no imports: the protected-trait check is
 * `protectedIn` in `job-refine.ts`, applied by the caller to every line.
 */

/**
 * The posting's diversity-hiring options, in the form's own labels
 * (`DIVERSITY` in `lib/job-form.ts`). A JD asking for women candidates or
 * ex-servicemen is choosing one of these — a property of the posting, which
 * iimjobs offers as a field — not a screening rule, so it is mapped here
 * rather than refused as one.
 */
const DIVERSITY_WORDS: [RegExp, string][] = [
  [
    /\b(women|woman|female)\b[^.\n]{0,40}\b(joining back|back to (the )?work|returning|restart)\b|\bback[- ]to[- ]work(force)?\b/i,
    "Women Joining back the workforce",
  ],
  [
    /\b(female|women|woman|ladies)\b[^.\n]{0,30}\b(candidates?|preferred|only|encouraged|applicants?)\b|\b(only )?diversity (candidates|hiring|hire)\b/i,
    "Female Candidates",
  ],
  [
    /\bex[- ]?(defen[cs]e|servicem[ae]n|army)\b|\bretired (colonel|col\.?|major|brigadier|army|naval|air force|officer)\b|\b(senior )?defen[cs]e officer\b|\barmed forces\b/i,
    "Ex-defence personnel",
  ],
  [
    /\bdifferently[- ]abled\b|\bpersons? with disabilit\w*\b|\bpwd\b/i,
    "Differently-abled candidates",
  ],
]

/** The diversity options a piece of text asks for, in the form's labels. */
export function diversityIn(text: string): string[] {
  return DIVERSITY_WORDS.filter(([pattern]) => pattern.test(text)).map(
    ([, label]) => label
  )
}

/**
 * A JD without the recruiter's contact details — a phone number, an email,
 * a "Contact:" line — because the JD becomes the posting's description, and
 * one in the sample ended with a consultant's name and mobile number.
 */
export function withoutContacts(text: string): string {
  // The whole line goes, not just the number: "Aprajita, 9311575571" with
  // the number taken out still names somebody to call.
  return text
    .split("\n")
    .filter((line) => !CONTACT_LINE.test(line) && !CONTACT.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

const CONTACT_LINE =
  /^\s*(contact( person| details| us)?|call|whatsapp|reach (me|us)|how to apply)\b\s*[:-]?\s*$|^\s*(contact( person| details)?|call|whatsapp)\s*[:-]/i
const CONTACT = /[\w.+-]+@[\w-]+\.[\w.]+|(\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/

const MUST_WORDS =
  /\b(must|mandatory|essential|required|critical|non[- ]negotiable|is a must|necessary)\b/i
const NICE_WORDS =
  /\b(preferred|preferably|advantage|advantageous|good[- ]to[- ]have|nice[- ]to[- ]have|desirable|ideally|a plus|bonus)\b/i
const PROFILE_HEADING =
  /\b(candidate profile|desired profile|ideal candidate|requirements?|qualifications?|what we('| a)re looking for|who you are|eligibility|experience|skills|education)\b/i
const DUTY_HEADING =
  /\b(responsibilit\w*|accountabilit\w*|role overview|about (the )?(role|job|us|company|organisation)|job (summary|purpose|overview)|what you('| wi)ll do|deliverables|kpis?)\b/i
/** Generic in every JD, and nothing to screen on. */
const SOFT =
  /\b(communication|stakeholder management|interpersonal|team player|leadership (skills|qualities)|problem[- ]solving|analytical (skills|acumen)|presentation skills|self[- ]starter|positive attitude)\b/i
/**
 * A line that leads with the years is about the years, which the posting
 * already holds — and in the sample it is where an age band hid ("15–30
 * years of experience; typically 40–50 years").
 */
const YEARS_ONLY =
  /^(the incumbent will have |minimum (of )?|min\.? |at least |overall )?\d+\s*(\+|-|–|to)?\s*\d*\s*\+?\s*(years?|yrs)\b/i

const MAX_MUST = 6
const MAX_NICE = 4

/** A bullet's text, tidied: no marker, no trailing full stop, a sane length. */
function clean(line: string) {
  const text = line
    .replace(/^\s*([-–•*·▪●]|\d+[.)]|[a-z][.)])\s*/i, "")
    .replace(/\s+/g, " ")
    .replace(/[.;,:]+$/, "")
    .trim()
  if (text.length <= 140) return text
  const cut = text.slice(0, 140)
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`
}

/**
 * The JD's must-haves and good-to-haves, by the rules. A line counts when
 * the section it sits in says so ("Must have:", "Preferred:") or when it says
 * so itself ("…is mandatory", "…preferred"); a line in a candidate-profile
 * block counts as a must-have when it is specific — not a soft skill, not
 * only the years. Duties never count, whatever words they use.
 */
export function requirementsIn(text: string): {
  must: string[]
  nice: string[]
} {
  const must: string[] = []
  const nice: string[] = []
  let section: "must" | "nice" | "profile" | "duty" | null = null

  // Contact lines first, so a consultant's number is never a requirement.
  for (const raw of withoutContacts(text).split("\n")) {
    const line = raw.trim()
    if (!line) continue
    const bullet = /^([-–•*·▪●]|\d+[.)])\s/.test(line)
    // A heading: not a bullet, and either ending in a colon, a short label
    // before one ("Must have: …"), or a few words that name a section. Not
    // any short line — a pasted JD often loses its bullets, and "Strong OSD
    // manufacturing experience" is a requirement, not a heading.
    const colon = line.indexOf(":")
    const heading =
      !bullet &&
      line.length <= 70 &&
      (/:$/.test(line) ||
        (colon > 0 && colon <= 30) ||
        (line.split(" ").length <= 4 &&
          [MUST_WORDS, NICE_WORDS, DUTY_HEADING, PROFILE_HEADING].some(
            (pattern) => pattern.test(line)
          )))
    if (heading) {
      section = MUST_WORDS.test(line)
        ? "must"
        : NICE_WORDS.test(line)
          ? "nice"
          : DUTY_HEADING.test(line)
            ? "duty"
            : PROFILE_HEADING.test(line)
              ? "profile"
              : section
      // "Must have: 10+ years, Tier 1 MBA" — a heading with its own content.
      const rest = line.split(":").slice(1).join(":").trim()
      if (!rest) continue
    }

    const body = clean(heading ? line.split(":").slice(1).join(":") : line)
    if (body.length < 12 || YEARS_ONLY.test(body)) continue
    if (section === "duty") continue
    const says = NICE_WORDS.test(body)
      ? "nice"
      : MUST_WORDS.test(body)
        ? "must"
        : null
    const kind =
      section === "nice" || says === "nice"
        ? "nice"
        : section === "must" || says === "must"
          ? "must"
          : section === "profile" && !SOFT.test(body)
            ? "must"
            : null
    if (kind === "must" && !must.includes(body)) must.push(body)
    if (kind === "nice" && !nice.includes(body)) nice.push(body)
  }
  return { must: must.slice(0, MAX_MUST), nice: nice.slice(0, MAX_NICE) }
}

/** "Ideally: …" — how a good-to-have line reads as a criterion. */
export const IDEALLY = "Ideally: "
