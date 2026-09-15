import {
  LAST_VISIT,
  isNew,
  responseCounts,
  type Applicant,
  type ApplicantStatus,
} from "@/lib/applicants"
import type { CandidateSource } from "@/lib/candidate-source"
import type { Verdict } from "@/lib/criteria"
import {
  RECOMMENDATIONS,
  THIS_WEEK,
  whenOf,
  type Interview,
} from "@/lib/interviews"
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
      /** `href` is absent where a person has no page to go to (My Lists). */
      people: { person: Applicant; reason: string; href?: string }[]
    }
  | {
      /** A person's verdict on each of a search's criteria, as the card prints them. */
      kind: "evidence"
      verdicts: Verdict[]
    }
  | {
      /**
       * Ways to loosen a search, each with the number of people it would add.
       * `apply` writes the loosened filter into the page's URL.
       */
      kind: "expand"
      items: { label: string; gain: number; apply: () => void }[]
    }
  | {
      /** People to file into a list the recruiter picks. Adds, never removes. */
      kind: "save"
      people: Applicant[]
      from?: CandidateSource
    }
  | {
      /**
       * Two or three people side by side, one column each, for the facts a
       * shortlist is decided on. The skills are what the list was asked for —
       * a posting's, or a search's.
       */
      kind: "compare"
      people: { person: Applicant; href?: string }[]
      requiredSkills: string[]
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
      items: {
        label: string
        detail: string
        to?: string
        threadId?: string
        /** Something the page does in place — open a dialog, say. */
        open?: () => void
      }[]
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

// ─── Any list of people ──────────────────────────────────────────────────────

/**
 * The people a question from a list is about, with what that list knows: the
 * skills it was asked for and where each person's page is. The same shape on a
 * posting, a search and My Lists — `CandidateList` builds it.
 */
export type Picked = {
  people: Applicant[]
  requiredSkills: string[]
  hrefFor: (person: Applicant) => string | undefined
}

/** One person, asked about from their card. */
export function aboutCandidate({
  people: [person],
  requiredSkills,
  hrefFor,
}: Picked): Reply {
  const matched = matchedSkills(person, requiredSkills)
  const missing = requiredSkills.filter((skill) => !matched.includes(skill))

  const fit =
    requiredSkills.length === 0
      ? "This list was not asked for any skills, so there is nothing to match them on."
      : missing.length === 0
        ? `They have all ${requiredSkills.length} skills asked for: ${listOf(matched)}.`
        : matched.length === 0
          ? `They have none of the skills asked for (${listOf(requiredSkills)}).`
          : `They have ${matched.length} of the ${requiredSkills.length} skills asked for: ${listOf(matched)}. Missing ${listOf(missing)}.`

  const notice =
    person.noticeDays === 0
      ? "can join now"
      : `are on a ${person.noticeDays}-day notice`

  return {
    about: person.name,
    blocks: [
      {
        kind: "text",
        text: `${person.title} at ${person.company} in ${person.location}, with ${person.experienceYears} years of experience. ${fit}`,
      },
      {
        kind: "text",
        text: `They earn ${person.currentCtcLakh} LPA now and ${notice}.`,
      },
      {
        kind: "candidates",
        people: [
          {
            person,
            reason: reasonFor(person, requiredSkills),
            href: hrefFor(person),
          },
        ],
      },
    ],
  }
}

/**
 * Two or three people side by side, with a line saying where each one leads.
 * Leads only on facts with a direction everybody agrees on — more of the skills
 * asked for, able to start sooner. Pay and experience are shown, not ranked:
 * whether cheaper or more senior is better is the recruiter's call.
 */
export function compareCandidates({
  people,
  requiredSkills,
  hrefFor,
}: Picked): Reply {
  const firsts = people.map((person) => firstNameOf(person.name))
  const skillCounts = people.map(
    (person) => matchedSkills(person, requiredSkills).length
  )
  const lines: string[] = []

  if (requiredSkills.length > 0) {
    const most = Math.max(...skillCounts)
    const leaders = firsts.filter((_, index) => skillCounts[index] === most)
    lines.push(
      leaders.length === people.length
        ? `They have the same number of the skills asked for (${most} of ${requiredSkills.length}).`
        : `${listOf(leaders)} ${leaders.length === 1 ? "has" : "have"} the most of the skills asked for (${most} of ${requiredSkills.length}).`
    )
  }

  const soonest = Math.min(...people.map((person) => person.noticeDays))
  const quick = firsts.filter(
    (_, index) => people[index].noticeDays === soonest
  )
  if (quick.length < people.length) {
    lines.push(
      `${listOf(quick)} can start soonest (${soonest === 0 ? "now" : `${soonest}-day notice`}).`
    )
  }

  return {
    about: listOf(firsts),
    blocks: [
      {
        kind: "text",
        text: lines.join(" ") || "They are level on skills and notice.",
      },
      {
        kind: "compare",
        people: people.map((person) => ({ person, href: hrefFor(person) })),
        requiredSkills,
      },
    ],
  }
}

// ─── A search's results ──────────────────────────────────────────────────────

/**
 * What the Search Resume results page knows when a question is asked. People
 * are the ones matching right now, with this session's decisions laid over.
 * `verdictsOf` is present only under the Juicebox filters, where criteria rank
 * the list; under the refine panel the search's own skills do.
 */
export type SearchResultsContext = {
  headline: string
  people: Applicant[]
  requiredSkills: string[]
  verdictsOf?: (person: Applicant) => Verdict[]
  hrefFor: (person: Applicant) => string
  /** Counted on demand — each one runs every loosening against the whole pool. */
  expansions: () => { label: string; gain: number; apply: () => void }[]
  from: CandidateSource
}

const byMatch = (people: Applicant[]) =>
  [...people].sort((a, b) => b.match - a.match)

/** Why the top of Best match is the top, read off the same verdicts the card prints. */
export function whyBestMatch(context: SearchResultsContext): Reply {
  const { headline, people, requiredSkills, verdictsOf, hrefFor } = context
  if (people.length === 0) {
    return text(headline, "Nobody matches this search as it is filtered now.")
  }

  const [top, next] = byMatch(people)
  const blocks: Block[] = []

  if (verdictsOf) {
    const verdicts = verdictsOf(top)
    const met = verdicts.filter((verdict) => verdict.met).length
    blocks.push({
      kind: "text",
      text:
        verdicts.length === 0
          ? `${top.name} is first of ${people.length}. This search has no criteria, so the order is the search's own.`
          : `${top.name} is first of ${people.length} on Best match. They meet ${met} of the ${verdicts.length} criteria, and criteria higher on the list count for more.`,
    })
    if (verdicts.length > 0) blocks.push({ kind: "evidence", verdicts })
    if (next && verdicts.length > 0) {
      const theirs = verdictsOf(next)
      const nextMet = theirs.filter((verdict) => verdict.met).length
      const missesFirst = !theirs[0]?.met && verdicts[0]?.met
      // The same weighting `scoreFor` uses. Level on it, the order between the
      // two is the search's own tie-break — said, rather than left to look
      // like a reason the criteria gave.
      const weight = (list: Verdict[]) =>
        list.reduce(
          (sum, verdict, index) =>
            verdict.met ? sum + (list.length - index) : sum,
          0
        )
      const level = weight(theirs) === weight(verdicts)
      blocks.push({
        kind: "text",
        text: level
          ? `Second is ${next.name}, level on the criteria (${nextMet} of ${theirs.length}), so the search's own ranking decides between them.`
          : `Second is ${next.name}, meeting ${nextMet} of ${theirs.length}${missesFirst ? `, but not the first: ${theirs[0].criterion.toLowerCase()}` : ""}.`,
      })
    }
  } else if (requiredSkills.length === 0) {
    blocks.push({
      kind: "text",
      text: `${top.name} is first of ${people.length}. The search named no skills, so the order is the search's own ranking.`,
    })
  } else {
    const matched = matchedSkills(top, requiredSkills)
    blocks.push({
      kind: "text",
      text: `${top.name} is first of ${people.length} on Best match: ${matched.length} of the ${requiredSkills.length} skills the search named${matched.length > 0 ? ` (${listOf(matched)})` : ""}, the most of anyone here.`,
    })
  }

  blocks.push({
    kind: "candidates",
    people: [
      {
        person: top,
        reason: reasonFor(top, requiredSkills),
        href: hrefFor(top),
      },
    ],
  })

  return { about: headline, blocks }
}

/** The loosenings worth the most people, each applicable from the answer. */
export function findMorePeople(context: SearchResultsContext): Reply {
  const options = context.expansions()

  if (options.length === 0) {
    return text(
      context.headline,
      "No filter is narrowing this search in a way that would find more people. A broader search is the way in — the back arrow keeps this one's text."
    )
  }

  return {
    about: context.headline,
    blocks: [
      {
        kind: "text",
        text: `${context.people.length} match now. Each of these loosens one filter; the number is counted against the whole pool, not estimated.`,
      },
      { kind: "expand", items: options },
    ],
  }
}

/** The five best matches, to be filed into a list the recruiter picks. */
export function saveTopFive(context: SearchResultsContext): Reply {
  const top = byMatch(context.people).slice(0, 5)

  if (top.length === 0) {
    return text(
      context.headline,
      "Nobody matches this search, so there is nobody to save."
    )
  }

  return {
    about: context.headline,
    blocks: [
      {
        kind: "text",
        text: `The ${count(top.length, "best match", "best matches")}. Pick a list and they are added to it; nobody is taken out of a list they are already in.`,
      },
      { kind: "save", people: top, from: context.from },
    ],
  }
}

/** What the people matching look like, as a group. */
export function summariseResults(context: SearchResultsContext): Reply {
  const { headline, people } = context
  if (people.length === 0) {
    return text(headline, "Nobody matches this search as it is filtered now.")
  }

  const years = people
    .map((person) => person.experienceYears)
    .sort((a, b) => a - b)
  const pay = people
    .map((person) => person.currentCtcLakh)
    .sort((a, b) => a - b)
  const cities = new Map<string, number>()
  for (const person of people)
    cities.set(person.location, (cities.get(person.location) ?? 0) + 1)
  const [city, inCity] = [...cities].sort((a, b) => b[1] - a[1])[0]
  const soon = people.filter((person) => person.noticeDays <= 30).length
  const decided = people.filter(
    (person) => person.status !== "undecided"
  ).length

  return {
    about: headline,
    blocks: [
      {
        kind: "text",
        text: `${count(people.length, "person matches", "people match")}${decided > 0 ? `, ${decided} of them already with a decision` : ""}. ${inCity} are in ${city}, the most of any city.`,
      },
      {
        kind: "text",
        text: `Experience runs ${years[0]}–${years.at(-1)} years (median ${years[Math.floor(years.length / 2)]}). Current pay runs ₹${pay[0]}L–₹${pay.at(-1)}L (median ₹${pay[Math.floor(pay.length / 2)]}L), and ${Math.round((soon / people.length) * 100)}% can join within 30 days.`,
      },
    ],
  }
}

// ─── Interviews ──────────────────────────────────────────────────────────────

/**
 * The diary as the Interviews page holds it — seeded slots plus this session's
 * bookings — and the page's own reschedule dialog, so an answer can open it.
 *
 * NO "MISSING FEEDBACK" QUESTION, ON PURPOSE. Every slot in the mock is dated
 * after today, so nothing has happened that could be missing its write-up, and
 * a question that can only ever answer "none" is not one worth designing.
 */
export type InterviewsContext = {
  rows: Interview[]
  reschedule: (row: Interview) => void
}

const whoAndJob = (row: Interview) => `${row.candidateName} · ${row.jobTitle}`

/** This week's slots, soonest first, with how many wait next week. */
export function thisWeek({ rows }: InterviewsContext): Reply {
  const upcoming = rows.filter((row) => row.status !== "completed")
  const week = upcoming.filter((row) => THIS_WEEK.includes(row.date))
  const later = upcoming.length - week.length

  if (week.length === 0) {
    return text(
      "Interviews",
      later > 0
        ? `Nothing booked for the rest of this week. ${count(later, "interview is", "interviews are")} booked for next week.`
        : "Nothing is booked."
    )
  }

  const days = new Set(week.map((row) => row.date)).size
  const unconfirmed = week.filter((row) => row.status === "pending").length

  return {
    about: "Interviews",
    blocks: [
      {
        kind: "text",
        text: `${count(week.length, "interview", "interviews")} across ${count(days, "day", "days")} this week${unconfirmed > 0 ? `, ${unconfirmed} still waiting on the candidate to accept` : ""}.${later > 0 ? ` ${later} more next week.` : ""}`,
      },
      {
        kind: "links",
        items: week.map((row) => ({
          label: `${whenOf(row)} · ${row.calendarName}`,
          detail: `${whoAndJob(row)}${row.status === "pending" ? " · not accepted yet" : ""}`,
          to: row.candidateHref,
        })),
      },
    ],
  }
}

/** Invites nobody has answered, with a nudge written for each. */
export function unansweredInvites({ rows }: InterviewsContext): Reply {
  const pending = rows.filter((row) => row.status === "pending")

  if (pending.length === 0) {
    return text("Interviews", "Every invite has been accepted.")
  }

  return {
    about: "Interviews",
    blocks: [
      {
        kind: "text",
        text: `${count(pending.length, "candidate has", "candidates have")} not accepted yet. The soonest is ${pending[0].candidateName}, ${whenOf(pending[0])}.`,
      },
      {
        kind: "links",
        items: pending.map((row) => ({
          label: row.candidateName,
          detail: `${whenOf(row)} · ${row.jobTitle}`,
          to: row.candidateHref,
        })),
      },
      {
        kind: "draft",
        recipients: pending.map((row) => ({
          id: row.candidateId,
          name: row.candidateName,
          role: row.jobTitle,
        })),
        body: `Hi ${FIRST_NAME}, just checking you saw my interview invite. Does the time work for you, or would another slot suit you better?`,
      },
    ],
  }
}

/**
 * Two people in one calendar at one time. The booking dialog refuses a clash,
 * but the seeded diary predates it and can hold one — which is exactly the
 * kind of thing worth asking a copilot to find.
 */
export function calendarClashes({
  rows,
  reschedule,
}: InterviewsContext): Reply {
  const live = rows.filter((row) => row.status !== "completed")
  const clashes = live.filter((row, index) =>
    live.some(
      (other, earlier) =>
        earlier < index &&
        other.calendarName === row.calendarName &&
        other.date === row.date &&
        other.timeSlot === row.timeSlot
    )
  )

  const busiest = [
    ...new Set(live.map((row) => `${row.calendarName}|${row.date}`)),
  ]
    .map((key) => ({
      key,
      n: live.filter((row) => `${row.calendarName}|${row.date}` === key).length,
    }))
    .sort((a, b) => b.n - a.n)[0]
  const [calendar, date] = busiest ? busiest.key.split("|") : []
  const busy = busiest
    ? ` The busiest is ${calendar} on ${date.replace(/ \d{4}$/, "")}, with ${count(busiest.n, "interview", "interviews")}.`
    : ""

  if (clashes.length === 0) {
    return text("Interviews", `No calendar is double-booked.${busy}`)
  }

  return {
    about: "Interviews",
    blocks: [
      {
        kind: "text",
        text: `${count(clashes.length, "slot is", "slots are")} double-booked. Rescheduling one of the pair clears it.${busy}`,
      },
      {
        kind: "links",
        items: clashes.flatMap((row) => {
          const other = live.find(
            (candidate) =>
              candidate !== row &&
              candidate.calendarName === row.calendarName &&
              candidate.date === row.date &&
              candidate.timeSlot === row.timeSlot
          )!
          return [row, other].map((clashing) => ({
            label: `Reschedule ${clashing.candidateName}`,
            detail: `${whenOf(clashing)} · ${clashing.calendarName} · ${clashing.jobTitle}`,
            open: () => reschedule(clashing),
          }))
        }),
      },
    ],
  }
}

/**
 * Completed interviews whose feedback recommends hiring. Feedback does not
 * move anybody's decision on the posting — that stays the recruiter's call —
 * so this points at them rather than acting on them.
 */
export function hireRecommendations({ rows }: InterviewsContext): Reply {
  const hires = rows.filter(
    (row) =>
      row.feedback &&
      (row.feedback.recommendation === "strong-yes" ||
        row.feedback.recommendation === "yes")
  )
  const written = rows.filter((row) => row.feedback).length

  if (hires.length === 0) {
    return text(
      "Interviews",
      written === 0
        ? "No feedback has been written yet."
        : `None of the ${count(written, "write-up", "write-ups")} recommends hiring.`
    )
  }

  return {
    about: "Interviews",
    blocks: [
      {
        kind: "text",
        text: `${count(hires.length, "interview recommends", "interviews recommend")} hiring, of ${count(written, "write-up", "write-ups")}. Their decisions on the posting are unchanged — that is still yours to make.`,
      },
      {
        kind: "links",
        items: hires.map((row) => ({
          label: `${row.candidateName} · ${RECOMMENDATIONS.find((option) => option.value === row.feedback!.recommendation)?.label}`,
          detail: `${row.jobTitle} · “${row.feedback!.notes}”`,
          to: row.candidateHref,
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
