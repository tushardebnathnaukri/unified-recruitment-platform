/**
 * Which of the Dashboard's skills a typed sentence is asking for.
 *
 * ONLY WHEN THE KEYWORDS CANNOT TELL. The page routes free text by keyword
 * first (`routeFor` in `apps/web/src/lib/agent.ts`) and answers at once when
 * one skill wins outright. This is asked only on a tie or a miss — "hiring
 * insights" hits posting's "hiring" and the market's "insights" equally, and
 * "mujhe ek sales head chahiye" hits nothing — so most questions never wait
 * on it.
 *
 * IT PICKS FROM A LIST; IT DOES NOT ANSWER. The reply is one skill id (or
 * "none"), whether it is sure, and up to three alternatives. The page checks
 * every id against its own skills and answers from its own data, so the model
 * can mis-route a sentence but cannot invent a reply. Unsure is a real answer:
 * the page asks "Which did you mean?" rather than guessing.
 *
 * THE LIST IS DUPLICATED ON PURPOSE, like `FIELDS` in `intake.ts`: `SKILLS`
 * mirrors the ids in `CARDS` and `CHIPS` in `apps/web/src/lib/agent.ts`.
 */

export const SKILLS = {
  posting:
    "Start a new job posting: create a job, post a vacancy, hire for a role, write a JD.",
  find: "Search the resume database for people to approach (sourcing), e.g. 'find product managers in Pune with 8+ years'.",
  market:
    "The market for a role: what it pays, where the people are city by city, whether demand is rising. Not the recruiter's own numbers.",
  decisions:
    "The recruiter's review queue: applicants to their postings still waiting on a shortlist / reject decision.",
  strongest:
    "The strongest, best-matching applicants on the recruiter's busiest posting.",
  week: "Interviews: what is booked this week, the diary, invites not yet accepted.",
  new: "What changed since the recruiter's last visit: new applicants and applications.",
  outreach:
    "Write a note or message to the people the recruiter has shortlisted.",
  funnel:
    "The recruiter's OWN hiring performance: their funnel, conversion, time to fill, reply rate, hiring analytics or insights about how their hiring is going.",
  cheapest:
    "Which city gives the most candidates for the money — supply weighed against pay, for deciding where to hire or relocate.",
} as const

export type SkillId = keyof typeof SKILLS
const IDS = Object.keys(SKILLS) as SkillId[]

/** A sentence, not a document — past this it is not a question to route. */
const MAX_TEXT = 1_000

export type RouteRequest = { text: string }

const SYSTEM = `You route a recruiter's message on an Indian hiring product to the one feature that answers it.

The features, by id:
${IDS.map((id) => `- ${id}: ${SKILLS[id]}`).join("\n")}

Rules:
1. skill is the id of the feature the recruiter most likely wants, or "none" when no feature fits (a greeting, thanks, something unrelated, or a question none of these answers).
2. confident is true only when the message clearly means that one feature. If it could reasonably mean two or more, or you are guessing, confident is false.
3. alternatives lists up to 3 OTHER feature ids that the message could plausibly mean, most likely first. Empty when nothing else is plausible.
4. The message may be short, misspelt, or in Hinglish ("mujhe ek sales head hire karna hai" is posting). Read the intent, not the keywords: "hiring insights" and "how are my jobs doing" are about the recruiter's own performance (funnel), not the market and not a new posting.
5. Never pick a feature only because it shares a word with the message.`

const ID = { type: "STRING", enum: [...IDS] }

/** Gemini's `responseSchema`. Every key required, as in `intake.ts`. */
const SCHEMA = {
  type: "OBJECT",
  properties: {
    skill: { type: "STRING", enum: [...IDS, "none"] },
    confident: { type: "BOOLEAN" },
    alternatives: { type: "ARRAY", items: ID },
  },
  required: ["skill", "confident", "alternatives"],
}

/** The request, checked. Returns an error message rather than throwing. */
export function parseRoute(body: unknown): RouteRequest | string {
  const text = (body as { text?: unknown } | null)?.text
  if (typeof text !== "string" || !text.trim()) return "text must be a sentence"
  if (text.length > MAX_TEXT) return "text is too long"
  return { text: text.trim() }
}

/** The body for `models/{model}:generateContent`. */
export function routeBody(request: RouteRequest) {
  return {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: request.text }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      // The same sentence should go to the same place twice.
      temperature: 0,
      // Picking one of ten is reading, not reasoning — as in `intake.ts`.
      thinkingConfig: { thinkingLevel: "minimal" },
    },
  }
}
