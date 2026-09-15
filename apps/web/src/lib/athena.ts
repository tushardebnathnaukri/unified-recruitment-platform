import {
  LAST_VISIT,
  isNew,
  responseCounts,
  type Applicant,
  type ApplicantStatus,
} from "@/lib/applicants"
import type { Job, LiveJob } from "@/lib/jobs"
import type { Conversation, Message } from "@/lib/messages"

/**
 * What Athena can say, and the answers she computes.
 *
 * COMPUTED, NEVER CANNED. Every answer here is worked out from the same mock
 * data the page is showing, at the moment it is asked — so "the strongest five"
 * are the five a Best match sort would put on top, and shortlisting one of them
 * moves the tab count behind the pane. A hand-written reply reads as a real
 * capability in a design review and then contradicts the screen beside it; a
 * computed one cannot.
 *
 * What she cannot compute she does not answer. Free text gets a stub that says
 * so (`athena-pane.tsx`), and the page's openers are the questions she has.
 */

/** A piece of a reply. Athena answers in blocks, not paragraphs. */
export type Block =
  | { kind: "text"; text: string }
  | {
      /** People, each with the reason they are here, and a decision to hand. */
      kind: "candidates"
      people: { person: Applicant; reason: string; href: string }[]
    }
  | {
      /**
       * A batch decision, proposed and not taken. Everybody in it is still
       * undecided when it is made, which is what lets Undo put them back
       * without remembering anything.
       */
      kind: "proposal"
      to: ApplicantStatus
      people: Applicant[]
    }
  | {
      /**
       * Rows that go somewhere: a route, or a thread in the dock. A row with
       * neither only says where to look.
       */
      kind: "links"
      items: { label: string; detail: string; to?: string; threadId?: string }[]
    }
  | {
      /**
       * A message written for the recruiter to send, never sent by her. The
       * body may say `{first name}`, filled in per recipient when it goes into
       * their thread, so one draft serves a shortlist.
       */
      kind: "draft"
      recipients: DraftRecipient[]
      body: string
    }

/** Who a draft goes to. Shaped like the dock's `Recipient`, kept here so this file imports no component. */
export type DraftRecipient = {
  id: string
  name: string
  role: string
  photo?: string
}

export const FIRST_NAME = "{first name}"

export type Reply = {
  /**
   * What the answer was about, said on the answer. One thread follows you
   * between pages, so a reply has to name its page or it stops making sense
   * one navigation later.
   */
  about: string
  blocks: Block[]
}

export type Opener = { prompt: string; answer: () => Reply }

/** What a page tells Athena about itself. See `useAthenaContext`. */
export type AthenaPageContext = {
  label: string
  detail?: string
  openers: Opener[]
}

export const DECISION_LABELS: Record<ApplicantStatus, string> = {
  undecided: "To review",
  maybe: "Maybe",
  shortlisted: "Shortlisted",
  contacted: "Contacted",
  rejected: "Not a fit",
}

// ─── The response manager ────────────────────────────────────────────────────

type Posting = {
  job: Job
  /** Everybody who applied, with this session's decisions already laid over. */
  people: Applicant[]
  requiredSkills: string[]
  hrefFor: (person: Applicant) => string
}

export function strongestToReview({
  job,
  people,
  requiredSkills,
  hrefFor,
}: Posting): Reply {
  const waiting = people.filter((person) => person.status === "undecided")

  if (waiting.length === 0) {
    return text(
      job.title,
      people.length === 0
        ? "Nobody has applied to this posting yet."
        : "Everybody on this posting already has a decision."
    )
  }

  const top = [...waiting].sort((a, b) => b.match - a.match).slice(0, 5)

  return {
    about: job.title,
    blocks: [
      {
        kind: "text",
        text: `The ${count(top.length, "best match", "best matches")} of the ${waiting.length} still to review. They rank on how many of the posting's ${requiredSkills.length} skills they have, the same order as Best match.`,
      },
      {
        kind: "candidates",
        people: top.map((person) => ({
          person,
          reason: reasonFor(person, requiredSkills),
          href: hrefFor(person),
        })),
      },
    ],
  }
}

/**
 * Everybody still to review with none of the posting's skills, proposed for
 * Not a fit.
 *
 * NOT "SHORTLIST THE FULL MATCHES", which is what this was first. The mock
 * pools never deal anybody all four required skills — three of four is the
 * ceiling on every posting — so that proposal could never appear, and a shape
 * nobody can reach in a review is not being designed. Clearing the people who
 * match nothing is also the batch decision a long queue actually wants: it is
 * the easy half of triage, and the proposal is Apply-and-Undo, so nothing is
 * turned down by being asked about.
 */
export function clearNoSkillMatches({
  job,
  people,
  requiredSkills,
}: Posting): Reply {
  const waiting = people.filter((person) => person.status === "undecided")
  const none = waiting.filter(
    (person) => matchedSkills(person, requiredSkills).length === 0
  )
  const skills = listOf(requiredSkills)

  if (none.length === 0) {
    return text(
      job.title,
      waiting.length === 0
        ? "Nobody is left to review on this posting."
        : `Everybody still to review has at least one of ${skills}, so there is nobody to clear on skills alone.`
    )
  }

  return {
    about: job.title,
    blocks: [
      {
        kind: "text",
        text: `${count(none.length, "person", "people")} of the ${waiting.length} still to review ${none.length === 1 ? "has" : "have"} none of ${skills}. Moving them to Not a fit leaves To review with the people worth reading.`,
      },
      { kind: "proposal", to: "rejected", people: none },
    ],
  }
}

export function summariseResponses({ job, people }: Posting): Reply {
  if (people.length === 0) {
    return text(
      job.title,
      job.status === "pending" || job.status === "rejected"
        ? "This posting never went live, so there are no responses to summarise."
        : "Nobody has applied yet, so there is nothing to summarise."
    )
  }

  const by = (status: ApplicantStatus) =>
    people.filter((person) => person.status === status).length
  const fresh = people.filter(isNew).length

  const years = people
    .map((person) => person.experienceYears)
    .sort((a, b) => a - b)
  const median = years[Math.floor(years.length / 2)]

  const cities = new Map<string, number>()
  for (const person of people)
    cities.set(person.location, (cities.get(person.location) ?? 0) + 1)
  const [city, inCity] = [...cities].sort((a, b) => b[1] - a[1])[0]

  const soon = people.filter((person) => person.noticeDays <= 30).length
  const decided = ["maybe", "shortlisted", "contacted", "rejected"] as const

  return {
    about: job.title,
    blocks: [
      {
        kind: "text",
        text: `${count(people.length, "person has", "people have")} applied. ${by("undecided")} still need a decision, ${fresh} of them new since ${LAST_VISIT}.`,
      },
      {
        kind: "text",
        text: `So far: ${decided
          .map(
            (status) => `${by(status)} ${DECISION_LABELS[status].toLowerCase()}`
          )
          .join(", ")}.`,
      },
      {
        kind: "text",
        text: `Median experience is ${median} years. ${inCity} of them are in ${city}, the most of any city, and ${Math.round((soon / people.length) * 100)}% can join within 30 days.`,
      },
    ],
  }
}

// ─── The dashboard ───────────────────────────────────────────────────────────

/**
 * Threads whose last word is the candidate's.
 *
 * Read from `MessagesProvider`'s live threads, so answering somebody in the
 * dock takes them off this list.
 */
export function threadsWaiting(
  conversations: Conversation[],
  threads: Record<string, Message[]>
): Reply {
  const waiting = conversations.filter(
    (conversation) => threads[conversation.id]?.at(-1)?.author === "them"
  )

  if (waiting.length === 0) {
    return text("Messages", "No thread is waiting on you.")
  }

  return {
    about: "Messages",
    blocks: [
      {
        kind: "text",
        text: `${count(waiting.length, "thread ends", "threads end")} with the candidate's message, so the next move is yours.`,
      },
      {
        kind: "links",
        items: waiting.map((conversation) => ({
          label: conversation.name,
          detail: `${conversation.role} · last message ${conversation.lastAt}`,
          threadId: conversation.id,
        })),
      },
    ],
  }
}

/** Live postings with people who arrived since the last visit, most first. */
export function postingsNeedingDecisions(jobs: LiveJob[]): Reply {
  const busy = jobs
    .filter((job) => job.newSinceVisit > 0)
    .sort((a, b) => b.newSinceVisit - a.newSinceVisit)

  if (busy.length === 0) {
    return text("Dashboard", `Nobody new has applied since ${LAST_VISIT}.`)
  }

  return {
    about: "Dashboard",
    blocks: [
      {
        kind: "text",
        text: `${count(busy.length, "posting has", "postings have")} new applicants since ${LAST_VISIT}.`,
      },
      {
        kind: "links",
        items: busy.map((job) => ({
          label: job.title,
          detail: `${job.newSinceVisit} new · ${responseCounts(job).undecided} to review`,
          to: `/jobs/${job.id}`,
        })),
      },
    ],
  }
}

// ─── A candidate on a posting ────────────────────────────────────────────────

type Application = Posting & {
  /** The person the page is about, with their decision laid over. */
  person: Applicant
}

/** Their fit against this posting, and where that puts them among the rest. */
export function matchOnPosting({
  job,
  people,
  person,
  requiredSkills,
}: Application): Reply {
  const matched = matchedSkills(person, requiredSkills)
  const missing = requiredSkills.filter((skill) => !matched.includes(skill))

  // Best match's own order, so "third" here is third on the list.
  const ranked = [...people].sort((a, b) => b.match - a.match)
  const rank = ranked.findIndex((other) => other.id === person.id) + 1

  const fit =
    missing.length === 0
      ? `${person.name} has all ${requiredSkills.length} skills this posting asks for: ${listOf(matched)}.`
      : matched.length === 0
        ? `${person.name} has none of the skills this posting asks for (${listOf(requiredSkills)}).`
        : `${person.name} has ${matched.length} of the ${requiredSkills.length} skills this posting asks for: ${listOf(matched)}. Missing ${listOf(missing)}.`

  const notice =
    person.noticeDays === 0
      ? "can join now"
      : `are on a ${person.noticeDays}-day notice`

  return {
    about: person.name,
    blocks: [
      { kind: "text", text: fit },
      {
        kind: "text",
        text: `That puts them ${ordinal(rank)} of ${people.length} on Best match for ${job.title}. They have ${person.experienceYears} years of experience, earn ${person.currentCtcLakh} LPA now, and they ${notice}.`,
      },
    ],
  }
}

/** Their career, read off the positions rather than paraphrased. */
export function careerSummary({ person }: Application): Reply {
  const [current, ...earlier] = person.positions
  const companies = new Set(person.positions.map((role) => role.company)).size
  const finished = earlier.filter((role) => role.to !== null)
  const tenure =
    finished.length === 0
      ? undefined
      : finished.reduce((sum, role) => sum + (role.to! - role.from), 0) /
        finished.length

  const blocks: Block[] = [
    {
      kind: "text",
      text: current
        ? `${current.title} at ${current.company} since ${current.from}. ${count(person.positions.length, "role", "roles")} across ${count(companies, "company", "companies")} in ${person.experienceYears} years.`
        : `${person.experienceYears} years of experience, with no roles listed.`,
    },
  ]

  if (tenure !== undefined) {
    blocks.push({
      kind: "text",
      // Back-to-back stints in the same title at the same company are one
      // entry: "Engineering Manager at Urban Company" twice reads as a typo,
      // not as two contracts.
      text: `Before this they stayed ${tenure.toFixed(1)} years a role on average. Earlier: ${earlier
        .map((role) => `${role.title} at ${role.company}`)
        .filter((entry, index, all) => entry !== all[index - 1])
        .join("; ")}.`,
    })
  }

  blocks.push({
    kind: "text",
    text: `${person.education.degree}, ${person.education.school} (${person.education.to}).`,
  })

  return { about: person.name, blocks }
}

/**
 * Others still to review who cover the same required skills, nearest in
 * experience first — the "if not them, who" question a profile raises.
 */
export function similarToReview({
  people,
  person,
  requiredSkills,
  hrefFor,
}: Application): Reply {
  const theirs = matchedSkills(person, requiredSkills)
  const alike = people
    .filter(
      (other) =>
        other.id !== person.id &&
        other.status === "undecided" &&
        theirs.every((skill) => other.skills.includes(skill))
    )
    .sort(
      (a, b) =>
        Math.abs(a.experienceYears - person.experienceYears) -
          Math.abs(b.experienceYears - person.experienceYears) ||
        b.match - a.match
    )
    .slice(0, 3)

  if (alike.length === 0) {
    return text(
      person.name,
      theirs.length === 0
        ? "They have none of the required skills, so there is nothing to match others on."
        : `Nobody else still to review has ${listOf(theirs)}.`
    )
  }

  return {
    about: person.name,
    blocks: [
      {
        kind: "text",
        text:
          theirs.length === 0
            ? "Closest in experience among those still to review."
            : `Still to review, with ${listOf(theirs)} like ${person.name.split(" ")[0]}, nearest in experience first.`,
      },
      {
        kind: "candidates",
        people: alike.map((other) => ({
          person: other,
          reason: reasonFor(other, requiredSkills),
          href: hrefFor(other),
        })),
      },
    ],
  }
}

// ─── Drafts ──────────────────────────────────────────────────────────────────

/** A first message for everybody shortlisted on a posting. */
export function draftToShortlisted({ job, people }: Posting): Reply {
  const shortlisted = people.filter((person) => person.status === "shortlisted")

  if (shortlisted.length === 0) {
    return text(
      job.title,
      "Nobody is shortlisted on this posting yet, so there is nobody to write to."
    )
  }

  return {
    about: job.title,
    blocks: [
      {
        kind: "text",
        text: `A first message for the ${count(shortlisted.length, "person", "people")} on your shortlist. Each gets their own name, and nothing goes until you press Send in their thread.`,
      },
      {
        kind: "draft",
        recipients: shortlisted.map((person) => recipientFor(person, job)),
        body: `Hi ${FIRST_NAME}, thanks for applying to the ${job.title} role. You are on our shortlist, and I would like to set up a 30-minute call this week to talk it through. What times work for you?`,
      },
    ],
  }
}

/**
 * A first message to one applicant, written from their card: the required
 * skills they have and where they have them now. Nothing a reader of the
 * profile could not check.
 */
export function draftToCandidate({
  job,
  person,
  requiredSkills,
}: Application): Reply {
  const matched = matchedSkills(person, requiredSkills)
  const first = firstNameOf(person.name)
  const hook =
    matched.length > 0
      ? `Your work with ${listOf(matched)} at ${person.company} is close to what this team needs.`
      : `Your time as ${person.title} at ${person.company} caught my eye.`

  return {
    about: person.name,
    blocks: [
      {
        kind: "text",
        text: `A first message to ${first}, from what is on their profile. Edit it here or in the thread; it is sent only when you send it.`,
      },
      {
        kind: "draft",
        recipients: [recipientFor(person, job)],
        body: `Hi ${first}, thanks for applying to the ${job.title} role. ${hook} Would you be open to a 30-minute call this week?`,
      },
    ],
  }
}

/** A draft's text for one recipient. */
export function draftFor(body: string, recipient: DraftRecipient) {
  return body.replaceAll(FIRST_NAME, firstNameOf(recipient.name))
}

function recipientFor(person: Applicant, job: Job): DraftRecipient {
  return {
    id: person.id,
    name: person.name,
    role: job.title,
    photo: person.photo,
  }
}

function firstNameOf(name: string) {
  return name.split(" ")[0] ?? name
}

// ─── Wording ─────────────────────────────────────────────────────────────────

export const CANNOT_ANSWER: Block = {
  kind: "text",
  text: "I can only answer the suggestions for this page so far. Questions in your own words come once we know which ones are worth answering.",
}

function text(about: string, body: string): Reply {
  return { about, blocks: [{ kind: "text", text: body }] }
}

function matchedSkills(person: Applicant, requiredSkills: string[]) {
  return requiredSkills.filter((skill) => person.skills.includes(skill))
}

/** Why somebody is on a list: their fit, then how soon they could start. */
function reasonFor(person: Applicant, requiredSkills: string[]) {
  const matched = matchedSkills(person, requiredSkills)
  const fit =
    matched.length === 0
      ? "None of the required skills"
      : `${matched.length} of ${requiredSkills.length} skills: ${matched.join(", ")}`
  const notice =
    person.noticeDays === 0 ? "can join now" : `${person.noticeDays}-day notice`
  return `${fit} · ${person.experienceYears} yrs · ${notice}`
}

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

function ordinal(n: number) {
  const tens = n % 100
  const suffix =
    tens >= 11 && tens <= 13
      ? "th"
      : (({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ??
        "th")
  return `${n}${suffix}`
}

function listOf(items: string[]) {
  return items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`
}
