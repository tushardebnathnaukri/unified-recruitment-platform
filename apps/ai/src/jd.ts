/**
 * The JD step of Chat v2.5, as two Gemini requests.
 *
 * `/api/jd` READS A JD FOR WHAT THE INTAKE CANNOT HOLD. The intake reader
 * (`intake.ts`) fills fixed slots — industry, team, target companies,
 * institutes — and a real JD's most useful lines fit none of them: "must have
 * handled USFDA and EU-GMP audits", "fundraising experience is mandatory",
 * "experience in a founder-led organisation". This returns those lines as
 * must-haves and good-to-haves, plus the posting's diversity-hiring options,
 * which iimjobs offers as a field of the posting. The page asks both readers
 * at once and merges them.
 *
 * `/api/probe` WRITES THE QUESTIONS FOR DRAFTING ONE. Given the posting so
 * far and the refinement topics still open, it picks the topics that matter
 * most for this role and writes a few questions of its own — steered towards
 * what live iimjobs JDs leave out (none of 37 read on 5 Oct 2026 said a
 * notice period; few said the P&L or business size behind "lead the
 * function"). Its answers become criterion lines and the drafted JD.
 *
 * Narrow on purpose, like the other routes: a fixed schema in, a fixed shape
 * out, and the page checks every line against its own protected-trait rules
 * before anything is recorded.
 */

/** Mirrors `REFINE_ORDER` in `apps/web/src/lib/job-refine.ts`. */
const TOPICS = [
  "skillsSplit",
  "adjacent",
  "relocation",
  "industry",
  "scale",
  "targets",
  "college",
  "budget",
  "exclusions",
] as const

/** Mirrors `DIVERSITY` in `apps/web/src/lib/job-form.ts` — the form's own labels. */
const DIVERSITY = [
  "Female Candidates",
  "Women Joining back the workforce",
  "Ex-defence personnel",
  "Differently-abled candidates",
] as const

const DECLINED = [
  "age",
  "gender",
  "family",
  "religion or caste",
  "disability",
  "nationality",
  "where someone is from",
  "career gaps",
] as const

const THINKING = process.env.GEMINI_THINKING || "minimal"
const MAX_JD = 20_000
const MAX_FIELD = 4_000

const STRINGS = { type: "ARRAY", items: { type: "STRING" } }

const NEVER = `Never screen on who someone is: age (or a stand-in such as graduation year or batch), gender, marital or family status, religion, caste or community, disability, nationality, where someone is from or their family's ties to a region, or career gaps. Leave any such requirement out and list each kind you left out in declined (${DECLINED.join(", ")}).`

// --- Reading a JD ------------------------------------------------------------

export type JdReadRequest = { text: string; title: string | null }

const READ_SYSTEM = `You read a job description from an Indian hiring product (iimjobs: senior and management roles) and pull out what a recruiter would screen candidates on.

Rules:
1. must lists the hard requirements: what the JD calls must-have, mandatory, essential, critical or non-negotiable, and specific experience it plainly requires ("Must have handled USFDA and EU-GMP audits", "Fundraising experience", "Experience in a founder-led organisation"). Each one short (under 15 words), in the JD's own terms, starting with what they must have done or know. At most 6.
2. nice lists what the JD calls preferred, an advantage, good to have or desirable. Same form. At most 4.
3. Leave out what is generic (communication, stakeholder management, leadership, team player, strategic thinking), duties of the role, years of experience, the job title, the location and pay — those are captured elsewhere.
4. diversity lists the posting's diversity-hiring options the JD asks for, using ONLY these labels: ${DIVERSITY.join("; ")}. "Women candidates preferred" or "only diversity candidates" is "Female Candidates"; a retired officer or ex-serviceman is "Ex-defence personnel". These are a property of the posting, not screening, so they go here and nowhere else.
5. ${NEVER}`

const READ_SCHEMA = {
  type: "OBJECT",
  properties: {
    must: STRINGS,
    nice: STRINGS,
    diversity: {
      type: "ARRAY",
      items: { type: "STRING", enum: [...DIVERSITY] },
    },
    declined: { type: "ARRAY", items: { type: "STRING", enum: [...DECLINED] } },
  },
  required: ["must", "nice", "diversity", "declined"],
}

export function parseJdRead(body: unknown): JdReadRequest | string {
  const value = (body ?? {}) as { text?: unknown; title?: unknown }
  if (typeof value.text !== "string" || !value.text.trim())
    return "text must be a job description"
  if (value.text.length > MAX_JD) return "text is too long"
  const title =
    typeof value.title === "string" && value.title.trim()
      ? value.title.trim().slice(0, 200)
      : null
  return { text: value.text, title }
}

export function jdReadBody(request: JdReadRequest) {
  return {
    systemInstruction: { parts: [{ text: READ_SYSTEM }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: JSON.stringify({
              title: request.title,
              jobDescription: request.text,
            }),
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: READ_SCHEMA,
      temperature: 0.1,
      thinkingConfig: { thinkingLevel: THINKING },
    },
  }
}

// --- Questions for drafting one ----------------------------------------------

export type ProbeRequest = {
  draft: unknown
  brief: unknown
  topics: { id: string; prompt: string }[]
}

const PROBE_SYSTEM = `A recruiter on an Indian hiring product (iimjobs: senior and management roles) has asked you to draft the job description for a posting. You have the posting so far. Before drafting, choose the questions that will tell you what only the recruiter knows.

Return at most 4 questions in all, topics and custom together:
1. topics: the ids of the open topics (given, with how each is asked) that matter most for this role. Usually one or two. Pick none that the posting already answers.
2. custom: questions of your own for this specific role, about what job descriptions usually leave out and a recruiter screens on:
   - the non-negotiables: what would make them reject an otherwise strong CV
   - the scale behind the role: P&L owned, revenue or business size, budget, number of plants, sites or markets
   - the markets or region it covers (India, APAC, US operations, a region of India)
   - the kind of company they should come from: promoter-led or founder-led, MNC, start-up, listed
   - certifications or regulatory exposure the role needs (e.g. USFDA audits, CA, Six Sigma)
   - who the role reports to, and whether it is interim or permanent
   - how soon they need someone to join
   Ask only what fits this role, never what the posting already says, and never a duty of the role.
   Each custom question has: label (2–4 words naming the requirement, e.g. "P&L ownership"), ask (the question, one sentence), hint (one short line on why it matters, may be empty), options (2–5 short likely answers specific to this role, so it can be answered with a tap), multiple (true only if several options can apply together).
3. ${NEVER} Never ask about any of these.`

const PROBE_SCHEMA = {
  type: "OBJECT",
  properties: {
    topics: { type: "ARRAY", items: { type: "STRING", enum: [...TOPICS] } },
    custom: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          ask: { type: "STRING" },
          hint: { type: "STRING" },
          options: STRINGS,
          multiple: { type: "BOOLEAN" },
        },
        required: ["label", "ask", "hint", "options", "multiple"],
      },
    },
  },
  required: ["topics", "custom"],
}

export function parseProbe(body: unknown): ProbeRequest | string {
  const value = (body ?? {}) as Record<string, unknown>
  const size = JSON.stringify(value).length
  if (size > MAX_FIELD * 4) return "request is too long"
  const topics = Array.isArray(value.topics)
    ? value.topics.flatMap((entry) => {
        const topic = entry as { id?: unknown; prompt?: unknown }
        return typeof topic.id === "string" &&
          (TOPICS as readonly string[]).includes(topic.id) &&
          typeof topic.prompt === "string"
          ? [{ id: topic.id, prompt: topic.prompt.slice(0, 300) }]
          : []
      })
    : []
  if (!value.draft || typeof value.draft !== "object")
    return "draft must be an object"
  return { draft: value.draft, brief: value.brief ?? {}, topics }
}

export function probeBody(request: ProbeRequest) {
  return {
    systemInstruction: { parts: [{ text: PROBE_SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(request) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: PROBE_SCHEMA,
      temperature: 0.4,
      thinkingConfig: { thinkingLevel: THINKING },
    },
  }
}
