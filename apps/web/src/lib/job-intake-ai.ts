import type { Brand } from "@workspace/ui/lib/brands"

import { companiesFor } from "@/lib/applicants"
import { aiHealth, askIntake, askJdRead, askProbe } from "@/lib/ai-client"
import { requirementsIn } from "@/lib/jd-read"
import { DIVERSITY } from "@/lib/job-form"
import {
  askFor,
  canonicalCity,
  filled,
  notedFrom,
  isSkip,
  nextQuestion,
  readRanked,
  remainingFields,
  REMOTE,
  titleCase,
  WORK_MODES,
  type FieldId,
  type IntakeState,
  type Phrasing,
  type PostingDraft,
  type Probe,
  type Span,
  type WorkMode,
} from "@/lib/job-intake"
import {
  advance,
  advanceJd,
  coveredTopics,
  eligible,
  enterRefine,
  JD_DRAFT,
  JD_HAVE,
  JD_MIN,
  readProbes,
  REFINE_ORDER,
  startDraft,
  withJdRead,
  industriesFor,
  institutesFor,
  mergeNoted,
  readInstitutes,
  pendingTopics,
  POST_NOW,
  protectedIn,
  refineAsk,
  refineNoted,
  refusalFor,
  screenExclusions,
  type HiringBrief,
  type IntakeInput,
  type IntakeTurn,
  type RefineId,
} from "@/lib/job-refine"
import { advanceStart } from "@/lib/job-start"

/**
 * The posting intake, read by Gemini — and checked before it is believed.
 *
 * ONE CALL PER TURN, AND A TURN IS NOW A WHOLE QUESTIONNAIRE. The opener is a
 * sentence; everything after it is a card of every question still open, sent
 * back as one set of answers. So the model reads all of them together — which
 * is what lets it notice that "Mumbai, but open to Pune" under Location also
 * answers relocation — and a posting takes three or four calls, not ten.
 *
 * THE MODEL READS THE ANSWERS; THE PAGE KEEPS THE SHAPE. Every field is
 * coerced into the draft's and the brief's own types, cities onto the posting
 * form's spellings, industries and institutes onto the vocabularies the
 * search can filter by, and which questions come next is decided by the page.
 * The model can phrase them and propose the answers, but it cannot skip the
 * title, finish early, add a topic, or record a protected trait.
 *
 * IT DOES NOT GET TO FORGET. A value the recruiter gave stays unless they
 * change it: a reply that comes back with a field emptied keeps the old value,
 * because "the model dropped it" is far likelier than "the recruiter took it
 * back". A correction — a DIFFERENT value — is taken.
 *
 * EVERY FAILURE IS THE RULES. No key, no server, a timeout, a malformed reply:
 * the same turn goes through `advance` instead, and the page says the rules
 * answered and why. The conversation never stops because a network did.
 */

const TIMEOUT_MS = 25_000

export async function advanceWithAi(
  given: IntakeState,
  asked: IntakeTurn,
  brand: Brand
): Promise<IntakeState> {
  // A change from the rail names its field; the page reads it, never the model.
  if ("change" in asked) return advance(given, asked, brand)
  // How the posting starts is three buttons and a list of jobs: the page reads
  // it, and a pasted JD comes back from here marked as a document.
  const start = advanceStart({ ...given, noted: undefined }, asked, brand)
  if (start.done) return start.state
  const { state, input } = start

  const rules = (fallback: IntakeState["fallback"]) => ({
    ...advance(state, input, brand),
    fallback,
  })

  // Done, or the screening step — whose answer is ticks and lines the page
  // reads itself: nothing for a model to interpret.
  if (state.stage === "done" || state.stage === "screen")
    return rules(undefined)
  // "Post it now" and a bare skip mean one thing; asking a model to read them
  // would only add a second and a chance to read them differently. A
  // questionnaire of nothing but skips is the same.
  if ("text" in input && !input.document) {
    if (input.text.trim() === POST_NOW || isSkip(input.text))
      return rules(undefined)
  }
  if (
    "answers" in input &&
    Object.values(input.answers).every((value) => value === null)
  )
    return rules(undefined)

  // Chat v2.5's JD step: the choice is a button, a JD is read by the model,
  // and drafting one asks the model for the questions.
  if (state.stage === "jd") return jdWithAi(state, input, brand)
  // Only Chat v2.5's own questions left open: the page reads those itself.
  if (state.stage === "refine" && !pendingTopics(state).length)
    return rules(undefined)

  const health = await aiHealth()
  if (!health.available) return rules("unconfigured")

  // Chat v2.5's probes are the page's to read, so only the topics' answers
  // go to the model; what the probes recorded is put back after.
  const probed =
    state.stage === "refine" && "answers" in input
      ? readProbes({ ...state, noted: undefined }, input.answers)
      : null
  const sent: IntakeInput = probed ? { answers: probed.rest } : input

  const refining = state.stage === "refine"
  const open: string[] = refining
    ? pendingTopics(state)
    : state.opener
      ? ["title"]
      : remainingFields(state.draft, state.skipped)

  try {
    const { result } = await withTimeout(
      askIntake({
        brand,
        stage: state.stage,
        draft: state.draft,
        brief: state.brief,
        skipped: state.skipped,
        asking: open,
        questions: open.map((id) => ({
          id,
          prompt: refining
            ? refineAsk(id as RefineId, state.draft)
            : askFor(id as FieldId),
        })),
        ...("answers" in sent
          ? { answers: sent.answers, document: false }
          : { answer: sent.text, document: sent.document ?? false }),
        vocab: {
          industries: industriesFor(brand),
          institutes: institutesFor(brand),
        },
      }),
      TIMEOUT_MS
    )
    const next = refining
      ? fromRefine(state, result, brand, sent)
      : fromPosting(state, result, input, brand)
    if (!next) return rules("failed")
    if (!probed) return next
    // Put back what the probes recorded, which the model's brief knows
    // nothing of — and say what was refused there too.
    return {
      ...next,
      brief: { ...next.brief, requirements: probed.state.brief.requirements },
      jd: probed.state.jd,
      noted: mergeNoted(next.noted ?? [], probed.state.noted ?? []),
      heard: probed.refused.length
        ? refusalFor([...probed.refused])
        : next.heard,
    }
  } catch (error) {
    console.warn("[agent] Gemini did not answer; using the rules.", error)
    return rules("failed")
  }
}

const FIELD_IDS: FieldId[] = [
  "title",
  "locations",
  "experience",
  "skills",
  "pay",
  "mode",
]

/** Every answer's text in one string — what the page screens for protected traits. */
function allText(input: IntakeInput) {
  return "answers" in input
    ? Object.values(input.answers).filter(Boolean).join("\n")
    : input.text
}

/** Ids the questionnaire answered with something (not skipped). */
function answered(input: IntakeInput) {
  return "answers" in input
    ? Object.entries(input.answers)
        .filter(([, value]) => value !== null)
        .map(([id]) => id)
    : []
}

/** Ids the questionnaire skipped on purpose. */
function skippedIn(input: IntakeInput) {
  return "answers" in input
    ? Object.entries(input.answers)
        .filter(([, value]) => value === null)
        .map(([id]) => id)
    : []
}

/**
 * The six posting fields out of a reply, checked, over what was there before.
 * Used by both stages — a correction made during refinement ("actually make
 * it Pune") reaches the posting the same way an answer did.
 */
function readDraft(value: unknown, before: PostingDraft): PostingDraft | null {
  if (!value || typeof value !== "object") return null
  const read = value as Record<string, unknown>

  const locations = unique(
    strings(read.locations).map((city) => canonicalCity(city) ?? city)
  )
  const modeRead = WORK_MODES.some((option) => option.value === read.mode)
    ? (read.mode as WorkMode)
    : null

  const candidate: PostingDraft = {
    ...before,
    // The rules' casing, so a model's "Head Of Finance" reads like every
    // other title on the page ("Head of Finance").
    title: text(read.title) ? titleCase(text(read.title)!) : null,
    locations,
    experience: span(read.experience, 50),
    pay: span(read.pay, 10_000),
    skills: unique(strings(read.skills)).slice(0, 12),
    mode: modeRead ?? (locations.includes(REMOTE) ? "remote" : null),
  }

  // A value the recruiter gave survives a reply that came back without it.
  for (const id of FIELD_IDS) {
    if (filled(before, id) && !filled(candidate, id)) {
      Object.assign(candidate, { [id]: before[id] })
    }
  }
  return candidate
}

/** The model's wording for the questions the page is about to ask — and only those. */
function phrasingsFor(reply: Record<string, unknown>, asking: string[]) {
  const phrasings: Record<string, Phrasing> = {}
  const questions = Array.isArray(reply.questions) ? reply.questions : []
  for (const entry of questions) {
    if (!entry || typeof entry !== "object") continue
    const question = entry as Record<string, unknown>
    const field = text(question.field)
    if (!field || !asking.includes(field)) continue
    phrasings[field] = {
      ask: text(question.ask) ?? "",
      hint: text(question.hint) ?? "",
      options: unique(strings(question.options))
        .filter((option) => option.length <= 80)
        .slice(0, 6),
    }
  }
  return Object.keys(phrasings).length ? phrasings : undefined
}

/**
 * Every kind of protected trait this turn asked to screen on: what the model
 * says it declined, what the page's own checks took out of the brief, and what
 * the page can see in the answers itself — so a refusal is reported even when
 * only one of the three noticed it.
 */
function declinedIn(
  reply: Record<string, unknown>,
  input: IntakeInput,
  refused: string[] = []
) {
  const spotted = protectedIn(allText(input))
  return unique([
    ...strings(reply.declined),
    ...refused,
    ...(spotted ? [spotted] : []),
  ])
}

function fromPosting(
  state: IntakeState,
  result: unknown,
  input: IntakeInput,
  brand: Brand
): IntakeState | null {
  if (!result || typeof result !== "object") return null
  const reply = result as Record<string, unknown>
  const read = readDraft(reply.draft, state.draft)
  if (!read) return null
  // THE RANKING IS READ BY THE PAGE, like the institutes button: the card
  // already says which skills are must-haves and in what order, and a model
  // left to re-read it put the good-to-haves back among the skills.
  const rankedSkills =
    "answers" in input && input.answers.skills
      ? readRanked(input.answers.skills)
      : null
  const draft: PostingDraft = rankedSkills
    ? { ...read, skills: rankedSkills.must, niceSkills: rankedSkills.nice }
    : read

  const isField = (id: string): id is FieldId =>
    FIELD_IDS.includes(id as FieldId)
  // A CARD CAN ONLY SKIP WHAT IT ASKED. Asked one question at a time, the
  // model was tempted to report the fields it was not shown as skipped.
  const askedIds = "answers" in input ? Object.keys(input.answers) : null
  const skipped = unique([
    ...state.skipped,
    ...skippedIn(input).filter(isField),
    ...strings(reply.skipped)
      .filter(isField)
      .filter((id) => !askedIds || askedIds.includes(id)),
  ])
    // The title is never skippable, and a field with a value is not skipped.
    .filter((id) => id !== "title" && !filled(draft, id))

  const asking = nextQuestion(draft, skipped)
  // Answered but still empty: asked again, with a note, in the next card.
  const unread = unique([...answered(input), ...strings(reply.unread)]).filter(
    (id) => isField(id) && !filled(draft, id) && !skipped.includes(id)
  )

  // What it recorded is built from what the draft ACTUALLY changed, not from
  // the model's sentence, which can describe a value the checks above
  // corrected or refused — and then the acknowledgement and the summary card
  // disagree. The model's sentence is used only when nothing was recorded.
  const changed: Partial<PostingDraft> = {}
  for (const id of [...FIELD_IDS, "niceSkills"] as const) {
    if (JSON.stringify(draft[id]) !== JSON.stringify(state.draft[id])) {
      Object.assign(changed, { [id]: draft[id] })
    }
  }
  const noted = notedFrom(changed)
  const declined = declinedIn(reply, input)
  const acknowledged =
    noted.length || declined.length ? null : text(reply.heard)

  const next: IntakeState = {
    ...state,
    opener: false,
    draft,
    skipped,
    asking,
    unread,
    ranked: state.ranked || Boolean(rankedSkills),
    heard:
      [declined.length ? refusalFor(declined) : null, acknowledged]
        .filter(Boolean)
        .join(" ") || null,
    noted,
    missed: false,
    engine: "gemini",
    fallback: undefined,
    phrasings: phrasingsFor(reply, remainingFields(draft, skipped)),
  }

  /**
   * WHATEVER THE ANSWERS ALSO SAID ABOUT THE SEARCH IS KEPT — on every
   * posting turn, not only the last. The opener asks for an industry, and a
   * JD says "manage a team of 4" in the same breath as the title; dropping
   * that, then asking for it again in refinement, is the one thing the
   * recruiter was told the extra detail would spare them. The brief is read
   * with the same checks refinement uses, and `enterRefine` leaves out any
   * topic it already covers.
   */
  const { brief, refused } = readBrief(reply.brief, state.brief, draft, brand)
  const raw = (reply.brief ?? {}) as Record<string, unknown>
  const early: PostingDraft = { ...draft }
  const team = text(raw.teamScale)
  if (team) early.teamScale = team[0].toUpperCase() + team.slice(1)
  if (typeof raw.relocationSupport === "boolean")
    early.relocationSupport = raw.relocationSupport
  const withBrief: IntakeState = {
    ...next,
    draft: early,
    brief,
    heard:
      [next.heard, refused.length ? refusalFor(refused) : null]
        .filter(Boolean)
        .join(" ") || null,
    noted: mergeNoted(noted, refineNoted(state, early, brief)),
  }
  if (asking !== null) return withBrief

  // The posting is complete. Gemini's picks become the plan — if usable, and
  // less whatever the conversation already covered — with its wording kept.
  const refining = enterRefine(withBrief, reply.refine, { model: true })
  return {
    ...refining,
    unread: [],
    phrasings: phrasingsFor(reply, refining.plan),
  }
}

/** The brief out of a reply, checked, over what was there before. */
function readBrief(
  value: unknown,
  before: HiringBrief,
  draft: PostingDraft,
  brand: Brand
): { brief: HiringBrief; refused: string[] } {
  const read = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >

  const industries = industriesFor(brand)
  const institutes = institutesFor(brand)
  const companies = companiesFor(brand)
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

  const adjacent = screenExclusions(
    unique(strings(read.adjacentTitles).map(titleCase))
      .filter((title) => !draft.title || !same(title, draft.title))
      .slice(0, 6)
  )
  const targets = screenExclusions(
    unique(
      strings(read.targetCompanies).map(
        (name) => companies.find((company) => same(company, name)) ?? name
      )
    ).slice(0, 10)
  )
  const exclusions = screenExclusions(
    unique(strings(read.exclusions)).slice(0, 6)
  )

  const budget = (() => {
    const raw = read.budget as { firm?: unknown; upTo?: unknown } | null
    if (!raw || typeof raw !== "object") return null
    if (raw.firm === true) return { firm: true, upTo: null }
    const upTo = typeof raw.upTo === "number" ? raw.upTo : null
    if (upTo === null || upTo <= 0) return null
    // A stretch below the posted ceiling is not a stretch.
    if (draft.pay?.max && upTo < draft.pay.max) return null
    return { firm: false, upTo }
  })()

  const candidate: HiringBrief = {
    adjacentTitles: adjacent.kept,
    openToMovers:
      typeof read.openToMovers === "boolean" ? read.openToMovers : null,
    // Onto the vocabulary `ind` can filter by. Anything else would filter the
    // list to nobody.
    industries: unique(
      strings(read.industries)
        .map((name) => industries.find((industry) => same(industry, name)))
        .filter((industry): industry is string => Boolean(industry))
    ),
    ledTeam: typeof read.ledTeam === "boolean" ? read.ledTeam : null,
    targetCompanies: targets.kept,
    institutes: unique(
      strings(read.institutes)
        .map((name) => institutes.find((institute) => same(institute, name)))
        .filter((institute): institute is string => Boolean(institute))
    ),
    budget,
    exclusions: exclusions.kept,
  }

  // The same rule as the draft: a reply that came back without something the
  // recruiter said keeps what they said.
  const brief = { ...candidate }
  for (const key of Object.keys(brief) as (keyof HiringBrief)[]) {
    const now = brief[key]
    const was = before[key]
    const empty = Array.isArray(now) ? now.length === 0 : now === null
    const had = Array.isArray(was) ? was.length > 0 : was !== null
    if (empty && had) Object.assign(brief, { [key]: was })
  }

  return {
    brief,
    refused: [...adjacent.refused, ...targets.refused, ...exclusions.refused],
  }
}

/** Which refinement topics a draft-and-brief change actually touched. */
function touched(
  before: IntakeState,
  draft: PostingDraft,
  brief: HiringBrief
): RefineId[] {
  const moved = (a: unknown, b: unknown) =>
    JSON.stringify(a) !== JSON.stringify(b)
  const topics: [RefineId, boolean][] = [
    ["skillsSplit", moved(draft.niceSkills, before.draft.niceSkills)],
    ["adjacent", moved(brief.adjacentTitles, before.brief.adjacentTitles)],
    [
      "relocation",
      moved(brief.openToMovers, before.brief.openToMovers) ||
        moved(draft.relocationSupport, before.draft.relocationSupport),
    ],
    ["industry", moved(brief.industries, before.brief.industries)],
    [
      "scale",
      moved(brief.ledTeam, before.brief.ledTeam) ||
        moved(draft.teamScale, before.draft.teamScale),
    ],
    ["targets", moved(brief.targetCompanies, before.brief.targetCompanies)],
    ["college", moved(brief.institutes, before.brief.institutes)],
    ["budget", moved(brief.budget, before.brief.budget)],
    ["exclusions", moved(brief.exclusions, before.brief.exclusions)],
  ]
  return topics.filter(([, hit]) => hit).map(([topic]) => topic)
}

function fromRefine(
  state: IntakeState,
  result: unknown,
  brand: Brand,
  input: IntakeInput
): IntakeState | null {
  if (!result || typeof result !== "object") return null
  const reply = result as Record<string, unknown>

  const corrected = readDraft(reply.draft, state.draft) ?? state.draft
  const read = readBrief(reply.brief, state.brief, corrected, brand)
  const { refused } = read
  let brief = read.brief

  // PREMIUM OR ALL IS A BUTTON, READ BY THE PAGE, like the start choices. The
  // model gets the rest of the card; what it made of this answer is ignored.
  const college =
    "answers" in input && pendingTopics(state).includes("college")
      ? input.answers.college
      : null
  const collegeRead = college ? readInstitutes(college, brand) : null
  if (collegeRead) brief = { ...brief, institutes: collegeRead }

  const raw = (reply.brief ?? {}) as Record<string, unknown>
  const draft: PostingDraft = { ...corrected }
  const open = pendingTopics(state)

  // Must-have or good-to-have is a split of the skills already listed: the
  // good-to-haves come out of the list, and nothing is lost or invented.
  const listed = unique([...state.draft.skills, ...state.draft.niceSkills])
  const nice = strings(raw.niceSkills).filter((skill) =>
    listed.some((known) => known.toLowerCase() === skill.toLowerCase())
  )
  if (open.includes("skillsSplit") && Array.isArray(raw.niceSkills)) {
    draft.niceSkills = listed.filter((skill) =>
      nice.some((entry) => entry.toLowerCase() === skill.toLowerCase())
    )
    draft.skills = listed.filter((skill) => !draft.niceSkills.includes(skill))
  }
  // A ranking from the card is the page's to read, as in the posting stage.
  const split =
    "answers" in input && open.includes("skillsSplit")
      ? readRanked(input.answers.skillsSplit ?? "")
      : null
  if (split) {
    draft.skills = split.must
    draft.niceSkills = split.nice
  }
  const team = text(raw.teamScale)
  // A posting line, so it starts like one: the model sent "leads a team of 8".
  if (team) draft.teamScale = team[0].toUpperCase() + team.slice(1)
  if (typeof raw.relocationSupport === "boolean")
    draft.relocationSupport = raw.relocationSupport

  const declined = declinedIn(reply, input, refused)
  const modelUnread = strings(reply.unread)

  // SETTLED: skipped on purpose, or answered and read. A card answers each
  // topic by name; typed text answers whichever topics it changed — and, if it
  // changed none, the first open one, which is then asked again.
  const isOpen = (id: string): id is RefineId => open.includes(id as RefineId)
  const answeredTopics =
    "answers" in input
      ? answered(input).filter(isOpen)
      : touched(state, draft, brief)
  const unread =
    "answers" in input
      ? answeredTopics.filter(
          (topic) =>
            modelUnread.includes(topic) &&
            !(topic === "college" && collegeRead) &&
            !(topic === "skillsSplit" && split)
        )
      : answeredTopics.length || declined.length
        ? []
        : open.slice(0, 1)
  const settled = unique([
    ...state.settled,
    ...skippedIn(input).filter(isOpen),
    ...answeredTopics.filter((topic) => !unread.includes(topic)),
    // A topic whose answer was refused is not asked again: pressing for a
    // rephrasing of a discriminatory ask is the wrong thing to do.
    ...(declined.length && open.includes("exclusions")
      ? (["exclusions"] as RefineId[])
      : []),
  ])
  const asking = state.plan.find((entry) => !settled.includes(entry)) ?? null

  // The refusal comes first and always: the recruiter is told what was left
  // out even when the rest of the answer was recorded.
  const noted = refineNoted(state, draft, brief)
  const heard = declined.length
    ? refusalFor(declined)
    : noted.length
      ? null
      : text(reply.heard)

  return {
    ...state,
    stage: asking ? "refine" : "screen",
    draft,
    brief,
    settled,
    asking,
    unread,
    heard,
    noted,
    missed: false,
    engine: "gemini",
    fallback: undefined,
    phrasings: phrasingsFor(
      reply,
      state.plan.filter((topic) => !settled.includes(topic))
    ),
  }
}

// --- The JD step (Chat v2.5) -------------------------------------------------

/** How many questions drafting a JD may ask, topics and probes together. */
const PROBE_CAP = 4

/**
 * The JD step by Gemini. The choice and a skip are buttons, read by the
 * rules. A JD is read by the refinement reader with every topic open, so the
 * brief fills from it the way an answer would — but only into what is still
 * empty: an answer the recruiter gave wins over the JD. Drafting one asks
 * `/api/probe` for the questions. Any failure is the rules' version of the
 * same step.
 */
async function jdWithAi(
  state: IntakeState,
  input: IntakeInput,
  brand: Brand
): Promise<IntakeState> {
  const rules = (fallback: IntakeState["fallback"]) => ({
    ...advanceJd(state, input, brand),
    fallback,
  })
  const value =
    "answers" in input ? (input.answers.jd ?? null) : input.text.trim()
  const document = "text" in input && input.document === true
  const drafting = value === JD_DRAFT
  const pasted =
    value !== null &&
    value !== JD_HAVE &&
    value !== POST_NOW &&
    !drafting &&
    !(!document && isSkip(value)) &&
    (document || state.jd?.status === "paste" || value.length >= JD_MIN)
  if (!drafting && !pasted) return rules(undefined)

  const health = await aiHealth()
  if (!health.available) return rules("unconfigured")

  const open = REFINE_ORDER.filter(
    (topic) =>
      eligible(topic, state.draft) && !coveredTopics(state).includes(topic)
  )
  try {
    if (drafting) {
      const { result } = await withTimeout(
        askProbe({
          brand,
          draft: state.draft,
          brief: state.brief,
          topics: open.map((id) => ({
            id,
            prompt: refineAsk(id, state.draft),
          })),
        }),
        TIMEOUT_MS
      )
      const read = readProbeReply(result, open)
      if (!read) return rules("failed")
      return {
        ...startDraft(
          { ...state, engine: "gemini", fallback: undefined, heard: null },
          read.probes,
          read.topics
        ),
        engine: "gemini",
        fallback: undefined,
        heard: null,
        noted: undefined,
        phrasings: undefined,
      }
    }

    // Both readers at once: the intake's fixed slots, and the JD's own
    // requirement lines and diversity options. The second failing costs the
    // lines only — the rules' reading of them stands in.
    const lines = withTimeout(
      askJdRead({ text: value!, title: state.draft.title }),
      TIMEOUT_MS
    ).then(
      ({ result }) => readJdLines(result),
      (error: unknown) => {
        console.warn("[agent] Gemini did not read the JD's lines.", error)
        return null
      }
    )
    const { result } = await withTimeout(
      askIntake({
        brand,
        stage: "refine",
        draft: state.draft,
        brief: state.brief,
        skipped: state.skipped,
        asking: open,
        questions: open.map((id) => ({
          id,
          prompt: refineAsk(id, state.draft),
        })),
        answer: value!,
        document: true,
        vocab: {
          industries: industriesFor(brand),
          institutes: institutesFor(brand),
        },
      }),
      TIMEOUT_MS
    )
    if (!result || typeof result !== "object") return rules("failed")
    const reply = result as Record<string, unknown>
    const read = readDraft(reply.draft, state.draft) ?? state.draft
    // Into empty fields only — the JD never overrides an answer.
    const draft: PostingDraft = { ...state.draft }
    const kept: Partial<PostingDraft> = {}
    for (const id of FIELD_IDS) {
      if (filled(draft, id) || !filled(read, id)) continue
      Object.assign(draft, { [id]: read[id] })
      Object.assign(kept, { [id]: read[id] })
    }
    const raw = (reply.brief ?? {}) as Record<string, unknown>
    const team = text(raw.teamScale)
    if (team && !draft.teamScale)
      draft.teamScale = team[0].toUpperCase() + team.slice(1)
    const fromJd = readBrief(reply.brief, state.brief, draft, brand).brief
    const brief: HiringBrief = { ...state.brief }
    for (const key of Object.keys(fromJd) as (keyof HiringBrief)[]) {
      const was = state.brief[key]
      const empty = Array.isArray(was) ? was.length === 0 : was == null
      if (empty) Object.assign(brief, { [key]: fromJd[key] })
    }
    const graded = { ...state, engine: "gemini" as const, fallback: undefined }
    const found = (await lines) ?? { ...requirementsIn(value!), diversity: [] }
    return {
      ...withJdRead(graded, draft, brief, value!, notedFrom(kept), found),
      engine: "gemini",
      fallback: undefined,
      phrasings: undefined,
    }
  } catch (error) {
    console.warn(
      "[agent] Gemini did not answer the JD step; using the rules.",
      error
    )
    return rules("failed")
  }
}

/** `/api/jd`'s reply, as lists — the page checks every line after. */
function readJdLines(result: unknown): {
  must: string[]
  nice: string[]
  diversity: string[]
  declined: string[]
} | null {
  if (!result || typeof result !== "object") return null
  const reply = result as Record<string, unknown>
  const short = (lines: string[], cap: number) =>
    unique(lines.filter((line) => line.length <= 160)).slice(0, cap)
  return {
    must: short(strings(reply.must), 6),
    nice: short(strings(reply.nice), 4),
    // Only the form's own options; anything else would be a tick on nothing.
    diversity: strings(reply.diversity).filter((option) =>
      DIVERSITY.includes(option)
    ),
    declined: strings(reply.declined),
  }
}

/**
 * `/api/probe`'s reply, checked: topics only from the open list, probes with
 * a label and a question, protected traits dropped, at most four in all.
 */
function readProbeReply(
  result: unknown,
  open: RefineId[]
): { topics: RefineId[]; probes: Probe[] } | null {
  if (!result || typeof result !== "object") return null
  const reply = result as Record<string, unknown>
  const topics = unique(
    strings(reply.topics).filter((id): id is RefineId =>
      open.includes(id as RefineId)
    )
  ).slice(0, PROBE_CAP)
  const custom = Array.isArray(reply.custom) ? reply.custom : []
  const probes: Probe[] = []
  for (const entry of custom) {
    if (probes.length + topics.length >= PROBE_CAP) break
    if (!entry || typeof entry !== "object") continue
    const raw = entry as Record<string, unknown>
    const label = text(raw.label)
    const ask = text(raw.ask)
    if (!label || !ask || protectedIn(`${label} ${ask}`)) continue
    probes.push({
      id: `probe-${probes.length + 1}`,
      label: label.slice(0, 40),
      ask,
      hint: text(raw.hint) ?? "",
      options: unique(strings(raw.options))
        .filter((option) => option.length <= 60 && !protectedIn(option))
        .slice(0, 5),
      multiple: raw.multiple === true,
    })
  }
  if (!topics.length && !probes.length) return null
  return { topics: REFINE_ORDER.filter((id) => topics.includes(id)), probes }
}

// --- Coercion ----------------------------------------------------------------

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(text).filter((entry): entry is string => entry !== null)
    : []
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

/** A {min, max} the draft can hold: numbers, ordered, under a sane ceiling. */
function span(value: unknown, ceiling: number): Span | null {
  if (!value || typeof value !== "object") return null
  const { min, max } = value as { min?: unknown; max?: unknown }
  const low = typeof min === "number" && Number.isFinite(min) ? min : null
  const high = typeof max === "number" && Number.isFinite(max) ? max : null
  if (low === null || low < 0 || low > ceiling) return null
  if (high === null) return { min: low, max: null }
  if (high > ceiling) return null
  // Backwards is the model's slip, not an open-ended band: "40 to 60" that
  // comes back as {60, 40} is still 40 to 60.
  return high < low ? { min: high, max: low } : { min: low, max: high }
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`No reply in ${ms / 1000}s`)),
      ms
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}
