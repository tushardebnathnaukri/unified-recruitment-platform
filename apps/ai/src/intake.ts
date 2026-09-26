/**
 * The posting intake, as a Gemini request.
 *
 * THE PROMPT LIVES HERE, NOT IN THE PAGE. The server exposes one thing —
 * "read this answer into this job posting" — rather than forwarding whatever
 * prompt a caller sends. Deployed where anyone can reach it, an endpoint that
 * relays arbitrary prompts is a free Gemini account on somebody else's key;
 * this one can only fill in six fields of a posting.
 *
 * THE MODEL READS; IT DOES NOT DECIDE. Its job is the part rules are bad at —
 * "someone to run our finance team" is a Head of Finance, "we'd pay about 40"
 * is 40 lakh, "actually make it Mumbai" is a correction. What the fields ARE,
 * what order they are asked in, and when the posting is finished stay with
 * the page (`apps/web/src/lib/job-intake-ai.ts` checks every answer against
 * the rules before it is shown), so a confused reply can mis-read one answer
 * but cannot skip the title or invent a seventh field.
 *
 * THE CONTRACT IS DUPLICATED ON PURPOSE. `FIELDS` and the draft's shape
 * mirror `PostingDraft` in `apps/web/src/lib/job-intake.ts`. The two
 * workspaces share no code, and a shared package for one type is more
 * machinery than a comment saying "keep these in step".
 */

export const FIELDS = [
  "title",
  "locations",
  "experience",
  "skills",
  "pay",
  "mode",
] as const

/**
 * The refinement topics, in the page's asking order. Mirrors `RefineId` and
 * `REFINE_ORDER` in `apps/web/src/lib/job-refine.ts`.
 */
export const TOPICS = [
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

export type Brand = "iimjobs" | "hirist"

export type IntakeRequest = {
  brand: Brand
  stage: "posting" | "refine"
  draft: unknown
  brief: unknown
  skipped: string[]
  /** Every question open this turn: a whole questionnaire, or the opener. */
  asking: string[]
  questions: { id: string; prompt: string }[]
  /** A submitted questionnaire: id → answer, `null` for skipped. */
  answers: Record<string, string | null> | null
  /** Typed text or an attached document, when it is not a questionnaire. */
  answer: string | null
  /** The answer is an attached document, not something typed. */
  document: boolean
  vocab: { industries: string[]; institutes: string[] }
}

/** `minimal`, `low`, `medium` or `high`. See `generationConfig` below. */
const THINKING = process.env.GEMINI_THINKING || "minimal"

/** A JD is long; a typed answer is not. Past this it is not an answer. */
const MAX_ANSWER = 20_000

/** Per-brand DATA: which market the product serves, so the model reads in it. */
const MARKET: Record<Brand, string> = {
  iimjobs:
    "iimjobs, an Indian job board for management, finance, sales, marketing and other senior non-technology roles",
  hirist: "hirist, an Indian job board for software and technology roles",
}

function systemFor(brand: Brand) {
  return `You are the requirement-gathering step of a recruiter's job-posting flow on ${MARKET[brand]}.

You fill in exactly six fields of a job posting:
- title: the job title, in title case ("Head of Marketing").
- locations: Indian cities in their common form ("Bangalore", "Delhi NCR", "Mumbai", "Pune"). "Remote" is a location and means mode is "remote".
- experience: years, as {min, max}. "12+" is {min: 12, max: null}. "fresher" is {min: 0, max: 1}.
- skills: a short list of skills or areas of expertise.
- pay: lakh per annum, as {min, max}. 1 crore = 100 lakh. "up to 60L" is {min: 0, max: 60}. "60L+" is {min: 60, max: null}. A single figure is that figure: "about 80 lakhs" is {min: 80, max: 80}. Never make pay open-ended unless the recruiter says "+", "or more" or "at least" — an employer's figure is a budget, not a floor.
- mode: "office", "hybrid" or "remote".

Each turn you get the draft so far, the fields the recruiter skipped, the questions that were open (asking, with each one's wording in questions), and what the recruiter said. That is either answers — one answer per question, null for a question they skipped on purpose — or answer, one piece of text (typed, or an attached document) that may cover any of the open questions. Return the updated draft and the next set of questions.

Rules:
1. Record only what the recruiter actually said. Never invent a value, never fill a field from general knowledge. If an answer is ambiguous, leave the field as it was.
2. Keep every value already in the draft unless the recruiter changes it. A correction ("actually Mumbai", "make it 15+") replaces the old value.
3. An answer can fill more than the field being asked about — "a senior PM in Pune, 8–12 years" fills title, locations and experience at once. An attached document may fill all six.
4. A null answer, or "skip", "doesn't matter", "no preference" and the like, means the recruiter is skipping that question: add it to skipped. The title can never be skipped.
5. unread lists the ids of questions that got an answer you could not use. They will be asked again.
6. heard is one short sentence saying back what you recorded, starting "Got it — ". If nothing was recorded, say briefly what you could not use.
7. questions phrases EVERY question the recruiter should be asked next: in stage "posting", every field still empty and not skipped, in this order — title, locations, experience, skills, pay, mode. They are shown together, one step at a time, in one card. When no field is left, the posting is complete: see "Finishing the posting".
8. Each question's ask is one conversational sentence; hint is one short line on why it matters or how to answer; options are up to 6 short answers the recruiter could pick exactly as written, suited to this role and seniority — suggestions, not facts. Locations and skills can take several at once, so offer them as separate options (each skill on its own), not joined.

Finishing the posting (stage "posting", nothing left to ask):
- Set refine to up to 4 refinement topics that would most sharpen the SEARCH for this particular role, listed in this order: ${TOPICS.join(", ")}. Leave out what does not matter for the role — college for a 20-year veteran, team size for a junior hire, relocation for a remote role, budget when no pay ceiling was given, skillsSplit with fewer than two skills.
- Set questions to every topic in refine, each phrased as its question (field is the topic id).

The refinement topics (stage "refine"), and what each fills in brief:
- skillsSplit: which listed skills are must-haves. niceSkills = the listed skills that are only good to have (never a skill that was not listed).
- adjacent: neighbouring titles that would also do. adjacentTitles. Offer 3–4 real neighbours of the title as options.
- relocation: openToMovers (people who would move to the posting's city count), and relocationSupport (the employer will support the move).
- industry: industries they should come from. Use ONLY names from vocab.industries.
- scale: teamScale, a short phrase for the posting ("Leads a team of 8", "Owns a ₹200 Cr P&L"), and ledTeam (must have led a team).
- targets: targetCompanies, companies they would ideally come from.
- college: institutes preferred — "Premium institutes" (any top school) or none at all. Use ONLY names from vocab.institutes. The page asks and reads this one itself.
- budget: budget {firm: true} if the pay ceiling is firm, or {firm: false, upTo} in lakh if it can stretch.
- exclusions: exclusions, short phrases for who to rule out ("people who change jobs every year", "only consulting backgrounds").

In stage "posting" too, record in brief anything an answer says about the refinement topics below — an industry, a team size, neighbouring titles, people who could relocate — so it is never asked for again. The opening question asks for the industry directly; use ONLY names from vocab.industries for it.

Always return the whole brief, every key, carrying over what it already holds — an empty list or null for anything not yet said. refine is an empty list except when finishing the posting.

In stage "refine" you get the brief so far and the topics being asked (asking). Update brief (and the draft, if the recruiter corrects the posting). questions phrases only the topics in unread — the ones to ask again — or is an empty list. For skillsSplit, offer each listed skill as its own option; the recruiter ticks the must-haves.

Never screen on who someone is. Do not record, suggest or phrase anything based on age, gender, marital or family status, pregnancy or maternity, religion, caste or community, disability, nationality, or stand-ins for them such as graduation year or batch, or career gaps. If the recruiter asks for one, leave it out, list each kind you left out in declined (${DECLINED.join(", ")}), and record the rest of the answer. declined is an empty list otherwise.`
}

const SPAN = {
  type: "OBJECT",
  nullable: true,
  properties: {
    min: { type: "NUMBER" },
    max: { type: "NUMBER", nullable: true },
  },
  required: ["min"],
}

const FIELD = { type: "STRING", enum: [...FIELDS] }
const TOPIC = { type: "STRING", enum: [...TOPICS] }
const STRINGS = { type: "ARRAY", items: { type: "STRING" } }

/**
 * What the model refused to record, by kind — a FIELD, not a sentence, so the
 * page can always tell the recruiter. It builds "Got it — …" from what was
 * recorded, and a refusal that lived only in the model's prose was dropped:
 * "no women, nobody over 45, no job-hoppers" came back as a line about
 * job-hoppers and nothing else.
 */
export const DECLINED = [
  "age",
  "gender",
  "family",
  "religion or caste",
  "disability",
  "nationality",
  "career gaps",
] as const

/** Gemini's `responseSchema` (its OpenAPI subset), so the reply is always JSON of this shape. */
const SCHEMA = {
  type: "OBJECT",
  properties: {
    draft: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", nullable: true },
        locations: { type: "ARRAY", items: { type: "STRING" } },
        experience: SPAN,
        pay: SPAN,
        skills: { type: "ARRAY", items: { type: "STRING" } },
        mode: {
          type: "STRING",
          nullable: true,
          enum: ["office", "hybrid", "remote"],
        },
      },
      required: ["title", "locations", "experience", "pay", "skills", "mode"],
    },
    brief: {
      type: "OBJECT",
      properties: {
        niceSkills: STRINGS,
        adjacentTitles: STRINGS,
        openToMovers: { type: "BOOLEAN", nullable: true },
        relocationSupport: { type: "BOOLEAN", nullable: true },
        industries: STRINGS,
        teamScale: { type: "STRING", nullable: true },
        ledTeam: { type: "BOOLEAN", nullable: true },
        targetCompanies: STRINGS,
        institutes: STRINGS,
        budget: {
          type: "OBJECT",
          nullable: true,
          properties: {
            firm: { type: "BOOLEAN" },
            upTo: { type: "NUMBER", nullable: true },
          },
          required: ["firm"],
        },
        exclusions: STRINGS,
      },
      // EVERY KEY REQUIRED. Optional keys are keys Gemini leaves out: asked
      // which skills were only a plus, it understood the answer and returned
      // a brief with no `niceSkills` in it at all, so the split never landed.
      required: [
        "niceSkills",
        "adjacentTitles",
        "openToMovers",
        "relocationSupport",
        "industries",
        "teamScale",
        "ledTeam",
        "targetCompanies",
        "institutes",
        "budget",
        "exclusions",
      ],
    },
    skipped: { type: "ARRAY", items: FIELD },
    refine: { type: "ARRAY", items: TOPIC },
    declined: {
      type: "ARRAY",
      items: { type: "STRING", enum: [...DECLINED] },
    },
    unread: {
      type: "ARRAY",
      items: { type: "STRING", enum: [...FIELDS, ...TOPICS] },
    },
    heard: { type: "STRING" },
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          field: { type: "STRING", enum: [...FIELDS, ...TOPICS] },
          ask: { type: "STRING" },
          hint: { type: "STRING" },
          options: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["field", "ask", "hint", "options"],
      },
    },
  },
  required: [
    "draft",
    "brief",
    "skipped",
    "refine",
    "declined",
    "unread",
    "heard",
    "questions",
  ],
}

/** The request, checked. Returns an error message rather than throwing. */
export function parseRequest(body: unknown): IntakeRequest | string {
  if (!body || typeof body !== "object") return "Expected a JSON object"
  const value = body as Record<string, unknown>

  if (value.brand !== "iimjobs" && value.brand !== "hirist")
    return "brand must be iimjobs or hirist"
  const stage = value.stage === "refine" ? "refine" : "posting"
  const topics: readonly string[] = stage === "refine" ? TOPICS : FIELDS
  if (
    !Array.isArray(value.asking) ||
    !value.asking.length ||
    !value.asking.every((id) => typeof id === "string" && topics.includes(id))
  )
    return `asking must be a list of: ${topics.join(", ")}`
  if (!Array.isArray(value.skipped)) return "skipped must be an array"

  // One of the two: a questionnaire's answers, or a piece of text.
  let answers: Record<string, string | null> | null = null
  if (value.answers && typeof value.answers === "object") {
    answers = {}
    let size = 0
    for (const [id, answer] of Object.entries(value.answers)) {
      if (!topics.includes(id)) continue
      if (typeof answer !== "string" && answer !== null) continue
      size += answer?.length ?? 0
      answers[id] = answer
    }
    if (size > MAX_ANSWER) return "answers are too long"
  }
  const answer =
    typeof value.answer === "string" && value.answer.trim()
      ? value.answer
      : null
  if (answer && answer.length > MAX_ANSWER) return "answer is too long"
  if (!answer && !answers) return "send answers or an answer"

  const words = (list: unknown, cap: number) =>
    Array.isArray(list)
      ? list
          .filter((entry): entry is string => typeof entry === "string")
          .slice(0, cap)
      : []
  const vocab = (value.vocab ?? {}) as Record<string, unknown>

  return {
    brand: value.brand,
    stage,
    draft: value.draft ?? {},
    brief: value.brief ?? {},
    skipped: value.skipped.filter((id): id is string => typeof id === "string"),
    asking: value.asking as string[],
    questions: (Array.isArray(value.questions) ? value.questions : [])
      .filter(
        (entry): entry is { id: string; prompt: string } =>
          Boolean(entry) &&
          typeof (entry as { id?: unknown }).id === "string" &&
          typeof (entry as { prompt?: unknown }).prompt === "string"
      )
      .slice(0, 12),
    answers,
    answer,
    document: value.document === true,
    vocab: {
      industries: words(vocab.industries, 60),
      institutes: words(vocab.institutes, 60),
    },
  }
}

/** The body for `models/{model}:generateContent`. */
export function geminiBody(request: IntakeRequest) {
  return {
    systemInstruction: { parts: [{ text: systemFor(request.brand) }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: JSON.stringify({
              stage: request.stage,
              draft: request.draft,
              brief: request.brief,
              vocab: request.vocab,
              skipped: request.skipped,
              asking: request.asking,
              questions: request.questions,
              ...(request.answers
                ? { answers: request.answers }
                : {
                    answer: request.answer,
                    answerIsAttachedDocument: request.document,
                  }),
            }),
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      // Reading, not writing: the same answer should read the same way twice.
      temperature: 0.2,
      // MINIMAL THINKING. Pulling six fields out of a sentence is reading, not
      // reasoning. Measured on 25 Sep 2026 on one sentence: 5.1–6.7s a turn at
      // the default, 2.7–3.7s at minimal, same reading. `gemini-3.1-flash-lite`
      // at low was ~2.2s and also correct, but less careful (it wrote "Head Of
      // Finance") — a GEMINI_MODEL switch away if speed matters more.
      thinkingConfig: { thinkingLevel: THINKING },
    },
  }
}

/**
 * The model's JSON, out of a generateContent response. Thinking models return
 * their reasoning as parts marked `thought`; only the rest is the answer.
 */
export function resultFrom(response: unknown): unknown {
  const parts =
    (
      response as {
        candidates?: {
          content?: { parts?: { text?: string; thought?: boolean }[] }
        }[]
      }
    ).candidates?.[0]?.content?.parts ?? []
  const text = parts
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
  if (!text) throw new Error("Gemini returned no text")
  return JSON.parse(text)
}
