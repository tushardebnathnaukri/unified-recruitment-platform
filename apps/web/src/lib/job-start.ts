import type { Brand } from "@workspace/ui/lib/brands"

import {
  COMPANY_INDUSTRIES,
  INDUSTRY_TAGS,
  companiesFor,
  requiredSkillsFor,
} from "@/lib/applicants"
import {
  canonicalCity,
  notedFrom,
  readDescription,
  nextQuestion,
  type AskedItem,
  type IntakeState,
  type PostingDraft,
} from "@/lib/job-intake"
import { jobsFor, type Job } from "@/lib/jobs"
import type { IntakeInput } from "@/lib/job-refine"

/**
 * How a posting starts — the one question asked before any other.
 *
 * THE FIRST QUESTION DECIDES WHAT EVERY OTHER ONE IS. A recruiter holding a JD
 * has already answered most of the posting and should not be asked it again;
 * one reposting last quarter's role wants that role copied, not described from
 * nothing; only the one starting cold needs "Who would you like to hire?". So
 * the conversation opens by asking which of those it is, as a card, and the
 * answer picks the road.
 *
 * FIXED CHOICES, READ BY THE PAGE. These are four buttons and a list of the
 * recruiter's own postings — nothing a model has to interpret — so they never
 * go to Gemini. Anything else still works: a sentence typed into the reply box
 * is "let's chat about it" and is read as one, and a file attached is "I have
 * a JD".
 *
 * "FILL IN A FORM" IS THE SAME ESCAPE HATCH EVERY OTHER CARD OFFERS, MADE A
 * CHOICE HERE RATHER THAN A LINK BESIDE THE CARD — this is the first question
 * asked, before there is a draft worth carrying over, so it reads as one more
 * road rather than a way out of one. Picking it is read in `intakeReply`
 * (`lib/agent.ts`) as a link to `postingHref`, not as a stage of its own.
 *
 * A BASE JOB GIVES WHAT A JOB HOLDS, AND NO MORE. A posting in `lib/jobs.ts`
 * has a title, a city and — through `requiredSkillsFor` — the skills it is
 * matched on. It has no experience band, no pay and no work mode, so those are
 * asked rather than guessed; the card says so.
 */

export type Origin = "jd" | "form" | "scratch" | "job"

export const START_OPTIONS: { value: Origin; label: string }[] = [
  { value: "jd", label: "I have a JD" },
  { value: "form", label: "Fill in a form" },
  { value: "scratch", label: "Let's chat about it" },
  { value: "job", label: "Use one of my existing jobs as a base" },
]

export function startItem(): AskedItem {
  return {
    id: "start",
    prompt: "How would you like to start?",
    hint: "A JD or an old posting means fewer questions — I'll only ask what they leave out.",
    options: START_OPTIONS.map((option) => option.label),
    multiple: false,
    required: true,
  }
}

/**
 * The postings worth starting from: live ones first, then closed ones — a
 * closed posting is the commonest thing to post again. Pending and rejected
 * ones are left out; neither has been published as it stands.
 */
export function baseJobs(brand: Brand): Job[] {
  const jobs = jobsFor(brand)
  return [
    ...jobs.filter((job) => job.status === "live"),
    ...jobs.filter((job) => job.status === "closed"),
  ].slice(0, 8)
}

export function jobLabel(job: Job) {
  return `${job.title} — ${job.location}${job.status === "closed" ? " (closed)" : ""}`
}

export function baseItem(brand: Brand): AskedItem {
  return {
    id: "base",
    prompt: "Which job should we start from?",
    hint: "I'll copy its role, city and skills. Experience, pay and work mode aren't on a posting, so I'll ask for those.",
    options: baseJobs(brand).map(jobLabel),
    multiple: false,
    required: true,
  }
}

function originOf(answer: string): Origin | null {
  const option = START_OPTIONS.find(
    (entry) => entry.label.toLowerCase() === answer.trim().toLowerCase()
  )
  if (option) return option.value
  if (/\b(jd|job description)\b/i.test(answer)) return "jd"
  if (/\bform\b/i.test(answer)) return "form"
  if (/\b(existing|old|previous|one of my|base)\b/i.test(answer)) return "job"
  if (/\b(scratch|new|fresh|chat)\b/i.test(answer)) return "scratch"
  return null
}

/**
 * The start of a posting, read — or the input handed on, possibly rewritten,
 * when it is not a start-choice at all. `done` means this turn is fully
 * answered here; otherwise the caller reads `input` against `state` as usual.
 */
export function advanceStart(
  state: IntakeState,
  input: IntakeInput,
  brand: Brand
):
  | { done: true; state: IntakeState }
  | { done: false; state: IntakeState; input: IntakeInput } {
  if (state.stage !== "posting" || !state.opener) {
    return { done: false, state, input }
  }

  const ruled = {
    engine: "rules" as const,
    phrasings: undefined,
    fallback: undefined,
    missed: false,
    unread: [],
  }

  // Not chosen yet.
  if (state.origin === null) {
    if ("answers" in input) {
      const origin = input.answers.start ? originOf(input.answers.start) : null
      return {
        done: true,
        state: { ...state, ...ruled, origin: origin ?? "scratch", heard: null },
      }
    }
    // Typed or attached instead of picking: the input says which road it is.
    const origin: Origin = input.document ? "jd" : "scratch"
    return { done: false, state: { ...state, origin }, input }
  }

  // A JD is on its way. Pasted text is the JD — read it as a document.
  if (state.origin === "jd" && "text" in input) {
    return {
      done: false,
      state,
      input: { text: input.text, document: true },
    }
  }

  // Which job to start from.
  if (state.origin === "job") {
    if ("text" in input && !input.document) {
      // A sentence instead of a pick: they would rather describe it.
      return { done: false, state: { ...state, origin: "scratch" }, input }
    }
    if ("text" in input) return { done: false, state, input }

    const picked = input.answers.base
    const job = baseJobs(brand).find((entry) => jobLabel(entry) === picked)
    if (!job) {
      // Typed into "Something else": read as a description of the role.
      if (picked) {
        return {
          done: false,
          state: { ...state, origin: "scratch" },
          input: { text: picked },
        }
      }
      return { done: true, state: { ...state, ...ruled, heard: null } }
    }

    const city = canonicalCity(job.location) ?? job.location
    const copied: Partial<PostingDraft> = {
      title: job.title,
      locations: [city],
      skills: requiredSkillsFor(job),
    }
    const draft: PostingDraft = { ...state.draft, ...copied }
    return {
      done: true,
      state: {
        ...state,
        ...ruled,
        opener: false,
        basedOn: jobLabel(job),
        draft,
        asking: nextQuestion(draft, state.skipped),
        heard: null,
        noted: notedFrom(copied),
      },
    }
  }

  return { done: false, state, input }
}

/**
 * Whether a sentence that starts a posting already says who — "hire an FMCG
 * product manager in Delhi" — in which case it IS the from-scratch opener and
 * asking "How would you like to start?" would throw it away.
 *
 * A title alone is not proof: the title reader falls back to the whole
 * sentence, title-cased, so "I'm hiring" reads as the title "I'm Hiring". A
 * title counts only when it is something other than the prompt echoed back.
 */
export function describesRole(text: string, brand: Brand) {
  const read = readDescription(text, brand)
  if (read.locations?.length || read.experience) return true
  return Boolean(
    read.title && read.title.toLowerCase() !== text.trim().toLowerCase()
  )
}

/**
 * The opener's checklist — what the sentence being typed already covers.
 *
 * READ AS YOU TYPE, BY THE RULES, NOT THE MODEL. It runs on every keystroke,
 * so it uses the same instant readers the rules path does (`readDescription`
 * for the title, the city and the years; the product's own industry names and
 * their short forms for the industry) and never calls Gemini. That makes it a
 * nudge rather than a verdict: Gemini, reading the sent sentence, can find
 * something the checklist missed — and anything genuinely missing is asked in
 * the next card regardless.
 *
 * NO SKILLS. Whether a phrase is a skill is exactly what a keystroke-speed
 * regex gets wrong, and a box that stays unticked while the recruiter lists
 * three of them teaches them to ignore the bar.
 */
export function openerChecks(text: string, brand: Brand) {
  const read = text.trim() ? readDescription(text, brand) : {}
  const lower = text.toLowerCase()
  const industries = [
    ...new Set(
      companiesFor(brand)
        .map((company) => COMPANY_INDUSTRIES[company])
        .filter(Boolean)
    ),
  ]
  const industry = industries.some((name) =>
    [name, INDUSTRY_TAGS[name]]
      .filter(Boolean)
      .some((word) => lower.includes(word!.toLowerCase()))
  )
  return [
    { label: "Location", done: Boolean(read.locations?.length) },
    { label: "Job title", done: Boolean(read.title) },
    { label: "Years of experience", done: Boolean(read.experience) },
    { label: "Industry", done: industry },
  ]
}
