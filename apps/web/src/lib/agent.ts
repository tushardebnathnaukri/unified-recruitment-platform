import type { LucideIcon } from "lucide-react"
import {
  applyFilter,
  decodeFilter,
  decodeLock,
  decodeNote,
  withSuggestions,
  withoutSuggestions,
} from "@/lib/chat-v3"
import {
  BellIcon,
  BriefcaseIcon,
  CalendarCheckIcon,
  ChartPieIcon,
  ClipboardCheckIcon,
  DatabaseIcon,
  EraserIcon,
  FileTextIcon,
  MessageCircleIcon,
  PenLineIcon,
  SearchIcon,
  Settings2Icon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react"

import type { Brand } from "@workspace/ui/lib/brands"

import {
  applicantsFor,
  requiredSkillsFor,
  responseCounts,
  type Applicant,
} from "@/lib/applicants"
import { performanceFor, worstDrop } from "@/lib/dashboard"
import { criteriaFrom, recentSearchesFor, searchHref } from "@/lib/database"
import {
  advanceSearch,
  personOf,
  roleOf,
  searchCriteria,
  searchHrefFor as searchHrefOf,
  searchItems,
  searchPool,
  searchReviewees,
  searchRows,
  searchSummary,
  searchWidenings,
  SEARCH_NOW,
  startSearch,
  type SearchInput,
  type SearchPerson,
  type SearchState,
} from "@/lib/search-intake"
import { CITIES, DEMAND, NATIONAL_MEDIAN, SALARY_SUMMARY } from "@/lib/insights"
import {
  criteriaOn,
  describePosting,
  postingHref,
  postingItem,
  remainingFields,
  skillPoolFor,
  startIntake,
  summaryRows,
  type AskedItem,
  type IntakeState,
  type Noted,
} from "@/lib/job-intake"
import { baseItem, describesRole, startItem } from "@/lib/job-start"
import {
  briefRows,
  advance,
  decodeAnswers,
  decodeChange,
  LABELS,
  pendingTopics,
  POST_NOW,
  refineItem,
  screeningItem,
  searchHrefFor,
  unknownCompanies,
  type IntakeInput,
} from "@/lib/job-refine"
import type { RouteDecision } from "@/lib/agent-route-ai"
import type { ComposeAssist } from "@/lib/job-compose"
import { interviewsFor, THIS_WEEK, whenOf } from "@/lib/interviews"
import { liveJobsFor, type LiveJob } from "@/lib/jobs"

/**
 * The Agent page's answers.
 *
 * THERE IS NO MODEL HERE, AND THE PAGE SAYS SO. Every reply on this screen is
 * computed at the moment it is asked, out of the same mock data the rest of
 * the app reads — `liveJobsFor`, `applicantsFor`, `interviewsFor`,
 * `recentSearchesFor`, `performanceFor`. So "the five strongest" really are
 * the five highest `match` on the busiest live posting, and the postings a
 * reply links to have the counts the Jobs list prints. A chat window is the
 * one surface where inventing a number is effortless and invisible; a
 * prototype that does it teaches the design team to trust a figure that was
 * never there.
 *
 * WHAT IT CANNOT ANSWER, IT SAYS IT CANNOT ANSWER. Free text is matched
 * against the keywords below, and anything that misses gets `cannotAnswer` —
 * a refusal plus the list of questions that do work. Never a plausible
 * paragraph. This is the same rule the older copilot follows in `athena.ts`,
 * and the reason both are worth keeping honest is that a design review cannot
 * tell a real answer from a confident one by looking.
 *
 * KEPT SEPARATE FROM `athena.ts` ON PURPOSE. That file answers for the page it
 * is docked beside — it needs a posting, a list, a set of results. This one has
 * no page under it, so its questions are the ones a recruiter arrives with
 * before they have chosen a screen. The two overlap in subject and not in
 * shape, and folding them together would mean giving every answer here a
 * context that does not exist.
 */

/** A piece of a reply. The agent answers in blocks, not paragraphs. */
export type Block =
  | { kind: "text"; text: string }
  | {
      /** A number worth reading on its own, with what it is counting. */
      kind: "figures"
      items: { label: string; value: string; detail?: string }[]
    }
  | {
      /** People, each with the reason they are in the answer. */
      kind: "candidates"
      people: { person: Applicant; reason: string; href: string }[]
    }
  | {
      /** Rows that go somewhere in the app — a posting, a search, a page. */
      kind: "links"
      items: { label: string; detail: string; to: string }[]
    }
  | {
      /** Questions offered back, each of which asks itself when it is tapped. */
      kind: "prompts"
      prompts: string[]
      /**
       * What each button says, where it is not the prompt itself — the pill's
       * own name ("Create Job"), so a choice reads as the thing it is called
       * everywhere else. Tapping still asks the prompt.
       */
      labels?: string[]
    }
  | {
      /**
       * A question in a conversation that is still going: tap-to-answer
       * options, a skip, and the way out to the form carrying what has been
       * said so far. Only the newest one is live — an old question's options
       * would answer whatever is being asked NOW.
       */
      kind: "question"
      hint: string
      options: string[]
      skip?: string
      /** The way out to the form, in the posting stage. */
      form?: { label: string; to: string }
    }
  | {
      /**
       * Several questions in one card, one step at a time, answered together
       * — the plan-mode pattern. Submitting sends every answer as ONE turn
       * (`encodeAnswers`), so the transcript is still the URL.
       */
      kind: "questionnaire"
      items: AskedItem[]
      submit: string
      /** The way out to the form, in the posting stage. */
      form?: { label: string; to: string }
      /** "Skip, post it now" — in refinement, beside the card, not inside it. */
      postNow?: string
      /** What that link says, where it is not about posting. */
      postNowLabel?: string
    }
  | {
      /**
       * The three people a search ranks first, each with the verdict lines
       * that put them there, and thumbs up or down on each — the answer is
       * one turn (`calibrate`), and it re-orders the criteria.
       */
      kind: "calibrate"
      people: SearchPerson[]
    }
  | {
      /** A search ready to open: how many it finds, on what, and where. */
      kind: "search"
      role: string | null
      matching: number
      total: number
      /** The criteria in their final order — Best match's order. */
      criteria: string[]
      /** Whether calibration set the order, or the brief implied it. */
      calibrated: boolean
      rows: { label: string; value: string }[]
      href: string
      /** Ways to widen a search that found too few, each a counted link. */
      widenings: { label: string; gain: number; href: string }[]
    }
  | {
      /** A posting ready for review: its facts, its description, and the form. */
      kind: "posting"
      rows: { label: string; value: string }[]
      description: string
      to: string
      /** The private half: who to look for. Empty when nothing was refined. */
      brief: { label: string; value: string }[]
      /** Said under the brief — what the search can and cannot do with it. */
      briefNote?: string
      /** Search Resume, opened on the brief. */
      search: string
      /** What candidates answer when they apply. */
      screening: string[]
    }
  | {
      /**
       * Something written for the recruiter to read and edit, never sent or
       * posted by the agent: an outreach note, a job description. `to` says
       * who or what it is for, so a draft cannot be mistaken for a thing that
       * already went out.
       */
      kind: "draft"
      to: string
      body: string
      /** Where the recruiter would finish it. */
      action?: { label: string; to: string }
    }

/**
 * The work behind a reply in the posting conversation — who read the
 * recruiter's answer, how long they waited for it, and what it recorded. Drawn
 * collapsed above the reply ("Read by Gemini in 2.8s ›"), because a review
 * cannot tell a model's reading from a regex's by looking, and on a machine
 * without a key every answer is the regex's.
 */
export type WorkStep = {
  by: "gemini" | "rules"
  /** Milliseconds, measured by the page around the call. */
  took?: number
  /** Why the rules read it when Gemini was meant to. */
  note?: string
  /** What this answer changed, as the finished card would print it. */
  recorded: { label: string; value: string }[]
}

export type Answer = {
  /** The line above the blocks — what the agent understood it was asked. */
  said: string
  /**
   * What the last answer recorded, drawn in the bubble ahead of `said` as
   * "Got it." and one label-and-value row per fact.
   */
  noted?: Noted
  blocks: Block[]
  step?: WorkStep
}

/**
 * One thing the agent can answer.
 *
 * `prompt` is what the card or chip sends, and it is also what shows in the
 * transcript as the recruiter's own turn — so it has to read like something a
 * person would type, not like a command. `keywords` is the whole of the
 * free-text routing: no parsing, no intent model, just the words that make a
 * question unmistakably this one.
 */
export type Skill = {
  id: string
  prompt: string
  keywords: string[]
  answer: (brand: Brand) => Answer
  /** The card's furniture. Chips have none — the prompt is the whole chip. */
  card?: { title: string; example: string; icon: LucideIcon }
}

/** The busiest live posting — the one a general question is most likely about. */
function busiestJob(brand: Brand): LiveJob | undefined {
  return [...liveJobsFor(brand)].sort((a, b) => b.applicants - a.applicants)[0]
}

/**
 * Everybody waiting on a decision — what the Review applicants pill prints and
 * its answer opens on, one function for both, so "92 waiting" is the 92.
 */
function undecidedTotal(brand: Brand) {
  return undecidedByJob(brand).reduce(
    (sum, row) => sum + row.counts.undecided,
    0
  )
}

/** Everybody waiting on a decision, posting by posting, worst first. */
function undecidedByJob(brand: Brand) {
  return liveJobsFor(brand)
    .map((job) => ({ job, counts: responseCounts(job) }))
    .filter((row) => row.counts.undecided > 0)
    .sort((a, b) => b.counts.undecided - a.counts.undecided)
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`

/**
 * A year-on-year move, in words. "Flat" takes no number — "flat 0%" is the
 * percentage saying the same thing as the word beside it.
 */
const movement = (change: number) =>
  change === 0
    ? "flat year on year"
    : `${change > 0 ? "up" : "down"} ${Math.abs(change)}% year on year`

/**
 * THE SIX CARDS, AND THE ORDER IS THE ARGUMENT.
 *
 * The first three are the three things a recruiter comes to this product to
 * START: put a role up, go and find people for it, and find out what the
 * market will make either of those cost. They are the top row because they
 * are what somebody with nothing in flight needs, and because a hiring day
 * genuinely begins at one of them.
 *
 * The second three are about work already moving — the queue that has built
 * up, the best of what has arrived, the week that is booked. Useful daily and
 * useless on the first day, which is exactly why they are underneath.
 *
 * Each one's example is a real question rather than a category, because a card
 * that says "Candidates" tells nobody what to expect back.
 */
export const CARDS: Skill[] = [
  {
    id: "posting",
    prompt: "Help me post a job",
    keywords: [
      "jd",
      "description",
      "posting",
      "post a job",
      "post",
      "advert",
      "hire",
      "hire for",
      "hiring",
      "hiring for",
      "recruit",
      "vacancy",
      "opening",
      // The Create Job pill's own words. "create" alone is not one: it is
      // half of "create a list" and "create a note".
      "create a job",
      "create job",
      "new job",
      "add a job",
      "new role",
      "open a role",
    ],
    card: {
      title: "Post a job",
      example: "Tell me who you're hiring and I'll ask for the rest",
      icon: FileTextIcon,
    },
    // The opener only. Every turn after it is folded by `answersFor`, because
    // what the second question is depends on what the first answer said.
    answer: (brand) => intakeReply(startIntake(), brand),
  },
  {
    id: "find",
    prompt: "Search for people for a role I'm hiring for",
    keywords: ["find", "search", "source", "candidates", "profiles", "resume"],
    card: {
      title: "Search people",
      example: "Comb the resume database, or pick up a search you ran",
      icon: SearchIcon,
    },
    answer: (brand) => {
      const searches = recentSearchesFor(brand).slice(0, 4)
      return {
        said: "Searches you have run, with what they hold now",
        blocks: [
          {
            kind: "text",
            text: "Type the requirement into the box below and I'll open it as a search. These are the ones you have already run — the counts are what they would return today.",
          },
          {
            kind: "links",
            items: searches.map((search) => ({
              label: search.query,
              detail: `${search.matches.toLocaleString("en-IN")} profiles${
                search.newSince ? ` · ${search.newSince} new` : ""
              } · ran ${search.ranAgo}`,
              to: searchHref(search),
            })),
          },
        ],
      }
    },
  },
  {
    id: "market",
    prompt: "What does this role pay, and where are the people?",
    keywords: [
      "pay",
      "salary",
      "earn",
      "earns",
      "market",
      "ctc",
      "cost",
      "budget",
      "cities",
      "city",
      "where",
      "insight",
      "insights",
      "demand",
      "market",
    ],
    card: {
      title: "Get insights",
      example:
        "What the role pays, where the people are, which way demand is going",
      icon: TrendingUpIcon,
    },
    answer: () => {
      const top = [...CITIES].sort((a, b) => b.share - a.share).slice(0, 4)

      // Demand, as the two ends of the series rather than a fitted line: the
      // months in between wobble (April is the low, June a spike), and a trend
      // drawn through six points would be a claim this data cannot carry.
      const first = DEMAND[0]
      const last = DEMAND[DEMAND.length - 1]
      const swing = Math.round(
        ((last.postings - first.postings) / first.postings) * 100
      )

      return {
        said: "Pay, supply and demand for this market",
        blocks: [
          {
            kind: "figures",
            items: [
              {
                label: "Median on offer",
                value: `₹${SALARY_SUMMARY.medianCurrent}L`,
                detail: `national median ₹${NATIONAL_MEDIAN}L`,
              },
              {
                label: "Median ask",
                value: `₹${SALARY_SUMMARY.medianExpected}L`,
                detail: `${SALARY_SUMMARY.uplift}% over current pay`,
              },
              {
                label: "Postings a month",
                value: String(last.postings),
                detail: `${swing >= 0 ? "up" : "down"} ${Math.abs(swing)}% since ${first.month}`,
              },
            ],
          },
          {
            kind: "text",
            text: "Where the people are, by share of the profiles searched — and what they cost there.",
          },
          {
            kind: "links",
            items: top.map((city) => ({
              label: city.city,
              detail: `${city.share}% of profiles · median ₹${city.medianLakh}L · ${movement(city.change)}`,
              to: "/insights",
            })),
          },
        ],
      }
    },
  },
  {
    id: "decisions",
    prompt: "Who is still waiting on a decision from me?",
    keywords: [
      "decision",
      "waiting",
      "undecided",
      "review",
      "backlog",
      "pending",
      "queue",
      // "new applicants" is two words and still goes to What changed.
      "applicants",
      "applications",
    ],
    card: {
      title: "Clear the queue",
      example: "Who is still waiting on a decision from me",
      icon: ClipboardCheckIcon,
    },
    answer: (brand) => {
      const rows = undecidedByJob(brand)
      const total = undecidedTotal(brand)
      const fresh = rows.reduce((sum, row) => sum + row.counts.newSinceVisit, 0)

      if (!total) {
        return {
          said: "Your review queue",
          blocks: [
            {
              kind: "text",
              text: "Nothing is waiting — every applicant on every live posting has a decision against them.",
            },
          ],
        }
      }

      return {
        said: "Everybody without a decision, worst posting first",
        blocks: [
          {
            kind: "figures",
            items: [
              {
                label: "Waiting on you",
                value: total.toLocaleString("en-IN"),
                detail: `across ${plural(rows.length, "posting")}`,
              },
              {
                label: "Arrived since your last visit",
                value: fresh.toLocaleString("en-IN"),
                detail: "at the head of each queue",
              },
            ],
          },
          {
            kind: "links",
            items: rows.map(({ job, counts }) => ({
              label: job.title,
              detail: `${counts.undecided} to review${
                counts.newSinceVisit ? ` · ${counts.newSinceVisit} new` : ""
              } · ${job.location}`,
              to: `/jobs/${job.id}`,
            })),
          },
        ],
      }
    },
  },
  {
    id: "strongest",
    prompt: "Show me the strongest people on my busiest posting",
    keywords: [
      "strongest",
      "best",
      "shortlist",
      "top",
      "match",
      "strong",
      "five",
    ],
    card: {
      title: "The strongest five",
      example: "The best matches on the posting with the most applicants",
      icon: UsersIcon,
    },
    answer: (brand) => {
      const job = busiestJob(brand)
      if (!job || !job.applicants) {
        return {
          said: "The strongest matches",
          blocks: [
            {
              kind: "text",
              text: "None of your live postings has an applicant yet, so there is nothing to rank.",
            },
          ],
        }
      }

      const required = requiredSkillsFor(job)
      const people = [...applicantsFor(job)]
        .sort((a, b) => b.match - a.match)
        .slice(0, 5)

      return {
        said: `The five best matches on ${job.title}`,
        blocks: [
          {
            kind: "text",
            text: `${job.title} is your busiest posting — ${job.applicants} applicants, ${responseCounts(job).undecided} of them still undecided. These five rank highest against ${required.slice(0, 3).join(", ")}.`,
          },
          {
            kind: "candidates",
            people: people.map((person) => {
              const hits = person.skills.filter((skill) =>
                required.includes(skill)
              )
              return {
                person,
                reason: hits.length
                  ? `${person.match}% · ${hits.join(", ")}`
                  : `${person.match}% · none of the required skills listed`,
                href: `/jobs/${job.id}/applicants/${person.id}`,
              }
            }),
          },
        ],
      }
    },
  },
  {
    id: "week",
    prompt: "What interviews are on this week?",
    keywords: [
      "interview",
      "interviews",
      "week",
      "diary",
      "calendar",
      "booked",
      "schedule",
    ],
    card: {
      title: "This week's diary",
      example: "What is booked, and who has not accepted yet",
      icon: CalendarCheckIcon,
    },
    answer: (brand) => {
      const rows = interviewsFor(brand).filter((row) =>
        THIS_WEEK.includes(row.date)
      )
      const waiting = rows.filter((row) => row.status === "pending")

      if (!rows.length) {
        return {
          said: "This week's interviews",
          blocks: [
            {
              kind: "text",
              text: "Nothing is booked between now and Saturday.",
            },
          ],
        }
      }

      return {
        said: "What is booked between now and Saturday",
        blocks: [
          {
            kind: "figures",
            items: [
              { label: "Booked this week", value: String(rows.length) },
              {
                label: "Not accepted yet",
                value: String(waiting.length),
                detail: waiting.length
                  ? "no reply from the candidate"
                  : "all confirmed",
              },
            ],
          },
          {
            kind: "links",
            items: rows.slice(0, 6).map((row) => ({
              label: `${row.candidateName} · ${row.jobTitle}`,
              detail: `${whenOf(row)} · ${row.calendarName}${
                row.status === "pending" ? " · awaiting the candidate" : ""
              }`,
              to: "/interviews",
            })),
          },
        ],
      }
    },
  },
]

/**
 * THE CHIPS. Follow-ups rather than starting points — each one is a question
 * that only makes sense once you are already in the middle of hiring, so they
 * get nothing on the landing. Free text reaches them, `/new` and `/note` in the
 * `/` menu send two of them, and `cannotAnswer` lists them all.
 */
export const CHIPS: Skill[] = [
  {
    id: "new",
    prompt: "What changed since I was last here?",
    // Not a bare "new": it is half of "New Delhi" and of "a new role".
    keywords: [
      "changed",
      "what's new",
      "anything new",
      "new applicants",
      "new applications",
      "applied",
      "applied to",
      "since",
      "latest",
      "yesterday",
      "today",
    ],
    answer: (brand) => {
      const rows = liveJobsFor(brand)
        .filter((job) => job.newSinceVisit > 0)
        .sort((a, b) => b.newSinceVisit - a.newSinceVisit)
      const total = rows.reduce((sum, job) => sum + job.newSinceVisit, 0)

      if (!total) {
        return {
          said: "Since your last visit",
          blocks: [
            {
              kind: "text",
              text: "Nobody new has applied since you were last here.",
            },
          ],
        }
      }

      return {
        said: "Since your last visit",
        blocks: [
          {
            kind: "text",
            text: `${plural(total, "person", "people")} applied since you were last here, across ${plural(rows.length, "posting")}. They are at the top of each To review queue.`,
          },
          {
            kind: "links",
            items: rows.map((job) => ({
              label: job.title,
              detail: `${job.newSinceVisit} new · ${job.applicants} in total`,
              to: `/jobs/${job.id}`,
            })),
          },
        ],
      }
    },
  },
  {
    id: "outreach",
    prompt: "Write a note to the people I have shortlisted",
    keywords: [
      "note",
      "message",
      "outreach",
      "email",
      "reach",
      "draft",
      "write to",
      "write a note",
    ],
    answer: (brand) => {
      const job = busiestJob(brand)
      if (!job) {
        return {
          said: "A note to your shortlist",
          blocks: [
            {
              kind: "text",
              text: "You have no live postings, so there is nobody shortlisted to write to.",
            },
          ],
        }
      }

      const shortlisted = applicantsFor(job).filter(
        (person) => person.status === "shortlisted"
      )

      if (!shortlisted.length) {
        return {
          said: "A note to your shortlist",
          blocks: [
            {
              kind: "text",
              text: `Nobody is shortlisted on ${job.title} yet. Shortlist a few and I'll write to them.`,
            },
            {
              kind: "links",
              items: [
                {
                  label: job.title,
                  detail: `${responseCounts(job).undecided} still to review`,
                  to: `/jobs/${job.id}`,
                },
              ],
            },
          ],
        }
      }

      return {
        said: `A note to the ${shortlisted.length} shortlisted on ${job.title}`,
        blocks: [
          {
            kind: "draft",
            to: shortlisted
              .slice(0, 3)
              .map((person) => person.name.split(" ")[0])
              .join(", ")
              .concat(
                shortlisted.length > 3
                  ? ` and ${shortlisted.length - 3} more`
                  : ""
              ),
            body: [
              `Hello,`,
              ``,
              `I came across your profile for the ${job.title} role we have open in ${job.location}, and the work you have been doing lines up closely with what the team needs.`,
              ``,
              `Would you have twenty minutes this week for a call? Happy to work around your day.`,
            ].join("\n"),
            action: { label: "Open Messages", to: "/messages" },
          },
          {
            kind: "text",
            text: "I have written it, not sent it. Open Messages and it goes out in your words.",
          },
        ],
      }
    },
  },
  {
    id: "funnel",
    prompt: "How is my hiring going?",
    keywords: [
      "funnel",
      "hiring going",
      "performance",
      "conversion",
      "time to fill",
      "how am i",
      // The Hiring Insights pill's own name. Two words, so it outweighs
      // posting's "hiring" and the market's "insights", which tied and
      // sent it to Post a job.
      "hiring insights",
      "hiring performance",
      "analytics",
    ],
    answer: (brand) => {
      const performance = performanceFor(brand)
      const drop = worstDrop(performance.funnel)
      const faster = performance.timeToFillLastQuarter - performance.timeToFill

      return {
        said: "Your own numbers, this quarter",
        blocks: [
          {
            kind: "figures",
            items: [
              {
                label: "Time to fill",
                value: `${performance.timeToFill} days`,
                detail: `${Math.abs(faster)} days ${faster > 0 ? "faster" : "slower"} than last quarter`,
              },
              {
                label: "Reply rate",
                value: `${performance.replyRate}%`,
                detail: `was ${performance.replyRateLastQuarter}% last quarter`,
              },
            ],
          },
          {
            kind: "text",
            text: `The step that loses the most is ${drop.from.stage} → ${drop.to.stage}: ${drop.lostPct}% of them go no further. Everything else in the funnel is on the Dashboard.`,
          },
          {
            kind: "links",
            items: [
              {
                label: "Dashboard",
                detail:
                  "The funnel, time to fill and where your hires came from",
                to: "/dashboard",
              },
            ],
          },
        ],
      }
    },
  },
  {
    id: "cheapest",
    prompt: "Which city gives me the most people for the money?",
    keywords: [
      "cheapest",
      "cheaper",
      "money",
      "value",
      "relocate",
      "hyderabad",
      "pune",
    ],
    answer: () => {
      const ranked = [...CITIES]
        .filter((city) => city.share >= 5)
        .sort((a, b) => b.share / b.medianLakh - a.share / a.medianLakh)

      return {
        said: "Supply against pay, city by city",
        blocks: [
          {
            kind: "text",
            text: `${ranked[0].city} holds ${ranked[0].share}% of the profiles at a median of ₹${ranked[0].medianLakh}L — the most people per rupee of the cities with real supply. Only cities holding at least 5% are worth comparing; below that a median is a handful of people.`,
          },
          {
            kind: "links",
            items: ranked.map((city) => ({
              label: city.city,
              detail: `${city.share}% of profiles · ₹${city.medianLakh}L median · ${movement(city.change)}`,
              to: "/insights",
            })),
          },
        ],
      }
    },
  },
]

const ALL: Skill[] = [...CARDS, ...CHIPS]

export function skillFor(prompt: string): Skill | undefined {
  return ALL.find((skill) => skill.prompt === prompt)
}

/**
 * The `/` menu.
 *
 * TWO KINDS OF THING ON ONE LIST, AND THAT IS THE POINT. A slash command is
 * the one place a recruiter can type at something rather than navigate to it,
 * so it carries both the questions the agent answers and the places the app
 * goes — asking "who is waiting on a decision" and opening the Jobs list are
 * the same size of intention, and making the second one a different gesture
 * would mean remembering which is which.
 *
 * NOTHING HERE IS A COMMAND THE CHAT ALONE UNDERSTANDS. Every `ask` token
 * sends a prompt that free text could have sent, and every `go` token opens a
 * page the nav already has. The menu is a shortcut over the product, not a
 * second vocabulary to learn — which also means nothing is lost when somebody
 * ignores it entirely.
 */
export type Command = {
  /** Typed, including the slash. Also what the list filters on. */
  token: string
  title: string
  detail: string
  icon: LucideIcon
} & ({ kind: "ask"; prompt: string } | { kind: "go"; to: string })

/** A card's command, so the six answers keep one description between them. */
function askCommand(token: string, skill: Skill): Command {
  return {
    kind: "ask",
    token,
    prompt: skill.prompt,
    title: skill.card?.title ?? skill.prompt,
    detail: skill.card?.example ?? skill.prompt,
    icon: skill.card?.icon ?? SearchIcon,
  }
}

const byId = (id: string) => {
  const skill = ALL.find((entry) => entry.id === id)
  if (!skill) throw new Error(`No agent skill "${id}"`)
  return skill
}

/**
 * The chat landing's action row — four pills over the box.
 *
 * START SOMETHING, THEN WORK IN FLIGHT, THEN HOW IT IS GOING. Every pill asks a
 * question a skill already answers, because a dead pill in a hero is the first
 * thing clicked in a review. Review applicants is the decision queue — the
 * recruiter's daily question. A "Job updates" pill (who applied since the last
 * visit) was tried beside it and dropped: everyone new is also undecided, so
 * it was the front of the same queue under a second name.
 *
 * A COUNT IS A REASON TO CLICK. Review applicants prints the number its answer
 * opens on ("92 waiting"), and nothing at zero rather than a "0" to ignore.
 */
export const HERO_ACTIONS: {
  label: string
  icon: LucideIcon
  /** The skill it asks — what lights it up while a sentence heads there. */
  skill: string
  prompt: string
  count?: (brand: Brand) => string | null
}[] = [
  {
    label: "Create Job",
    icon: BriefcaseIcon,
    skill: "posting",
    prompt: byId("posting").prompt,
  },
  // The nav's own name and icon, so the pill and the page it leads to agree.
  {
    label: "Search Resume",
    icon: DatabaseIcon,
    skill: "find",
    prompt: byId("find").prompt,
  },
  {
    label: "Review applicants",
    icon: ClipboardCheckIcon,
    skill: "decisions",
    prompt: byId("decisions").prompt,
    count: (brand) => {
      const total = undecidedTotal(brand)
      return total ? `${total} waiting` : null
    },
  },
  {
    label: "Hiring Insights",
    icon: ChartPieIcon,
    skill: "funnel",
    prompt: byId("funnel").prompt,
  },
]

/**
 * The example questions the chat landing's box types out, one after another.
 *
 * EVERY ONE IS A QUESTION THE BOX ANSWERS, routed by the same keywords as
 * anything typed, so copying one in gets a real reply. They lead with what no
 * pill covers — pay, top matches, the diary, a note — and name this product's
 * own busiest posting and its own kind of hire, because a hirist recruiter is
 * not hiring a Head of Marketing.
 */
const EXAMPLE_PAY: Record<Brand, [title: string, city: string]> = {
  iimjobs: ["Head of Marketing", "Mumbai"],
  hirist: ["Senior Backend Engineer", "Bengaluru"],
}

export function heroExamples(brand: Brand): string[] {
  const [title, city] = EXAMPLE_PAY[brand]
  const job = busiestJob(brand)
  return [
    `What does a ${title} earn in ${city}?`,
    ...(job ? [`Show me the top matches for my ${job.title} role`] : []),
    byId("cheapest").prompt,
    byId("week").prompt,
    byId("outreach").prompt,
  ]
}

export const COMMANDS: Command[] = [
  // In the cards' own order, so the menu and the hero read the same. The three
  // that start something, then the three about work already moving.
  askCommand("/post", byId("posting")),
  askCommand("/people", byId("find")),
  askCommand("/insights", byId("market")),
  askCommand("/queue", byId("decisions")),
  askCommand("/strongest", byId("strongest")),
  askCommand("/diary", byId("week")),
  {
    kind: "ask",
    token: "/new",
    prompt: byId("new").prompt,
    title: "What changed",
    detail: "Who has applied since you were last here",
    icon: BellIcon,
  },
  {
    kind: "ask",
    token: "/note",
    prompt: byId("outreach").prompt,
    title: "Write a note",
    detail: "A message to the people you have shortlisted",
    icon: PenLineIcon,
  },
  {
    kind: "go",
    token: "/jobs",
    title: "Jobs",
    detail: "Your postings and everyone who applied to them",
    icon: BriefcaseIcon,
    to: "/jobs",
  },
  {
    kind: "go",
    token: "/database",
    title: "Search Resume",
    detail: "Go and find people rather than waiting for them",
    icon: DatabaseIcon,
    to: "/database",
  },
  {
    kind: "go",
    token: "/interviews",
    title: "Interviews",
    detail: "The diary, and the invites nobody has answered",
    icon: CalendarCheckIcon,
    to: "/interviews",
  },
  {
    kind: "go",
    token: "/messages",
    title: "Messages",
    detail: "Your threads, and the drafts waiting to go out",
    icon: MessageCircleIcon,
    to: "/messages",
  },
  {
    kind: "go",
    token: "/settings",
    title: "Settings",
    detail: "Brand, theme and the prototype's own switches",
    icon: Settings2Icon,
    to: "/settings",
  },
  {
    // START FRESH IS A LINK, NOT A WIPE. The transcript is `?ask=` and nothing
    // else, so the empty page IS the blank slate — and going there rather than
    // clearing something means the back button still has the conversation.
    kind: "go",
    token: "/fresh",
    title: "Start fresh",
    detail: "A blank slate — back still has this conversation",
    icon: EraserIcon,
    to: "/dashboard",
  },
]

/**
 * The commands a `/` query leaves.
 *
 * Matched on the token first and the title second, so typing `/int` finds
 * Interviews by its token before it finds anything with "int" in a sentence.
 * An empty query is the whole list, which is what the sparkle opens.
 */
export function matchCommands(query: string): Command[] {
  const text = query.trim().toLowerCase()
  if (!text) return COMMANDS

  const scored = COMMANDS.map((command) => {
    const token = command.token.slice(1).toLowerCase()
    if (token.startsWith(text)) return { command, rank: 0 }
    if (token.includes(text)) return { command, rank: 1 }
    if (command.title.toLowerCase().includes(text)) return { command, rank: 2 }
    if (command.detail.toLowerCase().includes(text)) return { command, rank: 3 }
    return null
  }).filter((entry) => entry !== null)

  return scored.sort((a, b) => a.rank - b.rank).map((entry) => entry.command)
}

/**
 * ATTACHMENTS.
 *
 * WHAT THE BROWSER CAN REALLY READ, IT REALLY READS. A `.txt` or `.md` comes
 * back from `File.text()` as words, so an attached JD is scanned for the
 * things this prototype already knows how to recognise — the city and the
 * span of years `criteriaFrom` reads out of a search, and the skills in this
 * product's own pool — and the answer quotes the count it found. A `.pdf` or
 * a `.docx` is bytes, not text, and the answer says exactly that rather than
 * pretending to have read a file it could not open.
 *
 * A LINK CARRIES THE QUESTION, NOT THE FILE. The transcript lives in `?ask=`,
 * and a file cannot go in a URL — so the turn is in the link and the reading
 * is in memory. Open the link tomorrow and that one turn says the file did not
 * travel and offers to take it again, which is the honest version of the
 * trade rather than a blank card or an answer conjured from a filename.
 */
export const READ_PREFIX = "Read this file: "

export function attachmentPrompt(name: string) {
  return `${READ_PREFIX}${name}`
}

/** The filename a turn is about, or null when it is an ordinary question. */
export function attachmentIn(prompt: string): string | null {
  return prompt.startsWith(READ_PREFIX)
    ? prompt.slice(READ_PREFIX.length)
    : null
}

function readFile(name: string, text: string, brand: Brand): Answer {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const criteria = criteriaFrom(text)
  const lower = text.toLowerCase()
  const skills = skillPoolFor(brand).filter((skill) =>
    lower.includes(skill.toLowerCase())
  )

  // The first line with anything on it. A JD's title is where a JD's title is,
  // and guessing harder than that would be a parser this file does not have.
  const title =
    text
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 2 && line.length < 90) ?? name

  const found = [
    criteria.location ? `it is in ${criteria.location}` : null,
    criteria.experience
      ? `it asks for ${criteria.experience[0]}–${criteria.experience[1]} years`
      : null,
    skills.length
      ? `it names ${skills.slice(0, 5).join(", ")}${skills.length > 5 ? ` and ${skills.length - 5} more` : ""}`
      : null,
  ].filter((part) => part !== null)

  return {
    said: `I read ${name}`,
    blocks: [
      {
        kind: "figures",
        items: [
          {
            label: "Words read",
            value: words.length.toLocaleString("en-IN"),
            detail: title === name ? undefined : `opens on "${title}"`,
          },
          {
            label: "Skills I recognised",
            value: String(skills.length),
            detail: "from this product's own list",
          },
        ],
      },
      {
        kind: "text",
        text: found.length
          ? `What I could pin down: ${found.join(", ")}. I only recognise a city, a span of years and skills that are already in this product's vocabulary — anything else in the file went past me.`
          : 'I could not pin down a city, a span of years or any skill I recognise. That is a limit of what reads a file here, not a judgement on the file — it looks for a known city, a range like "8-12 years", and skills already in this product\'s list.',
      },
      {
        kind: "links",
        items: [
          {
            label: "Search the database for this JD",
            detail: `Opens as a job-description search${
              criteria.location
                ? `, already filtered to ${criteria.location}`
                : ""
            }`,
            to: searchHref({ query: title, mode: "jd" }),
          },
        ],
      },
    ],
  }
}

function cannotRead(name: string): Answer {
  const kind = name.slice(name.lastIndexOf(".")).toLowerCase()
  return {
    said: `I can't read ${name}`,
    blocks: [
      {
        kind: "text",
        text:
          kind === ".pdf"
            ? "This PDF has no text in it — it is most likely a scan, which is a picture of words rather than words. Paste the text instead, or attach the Word version, and I'll read it properly."
            : kind === ".doc"
              ? "An old .doc is a format the browser can't open. Save it as .docx or PDF, or paste the text, and I'll read it properly."
              : `I couldn't get any words out of this ${kind}, so I have the file's name and nothing else — and guessing at a role from a filename would be inventing. A PDF, a .docx or a text file I can read.`,
      },
      {
        kind: "prompts",
        prompts: [byId("find").prompt, byId("posting").prompt],
      },
    ],
  }
}

function fileIsGone(name: string): Answer {
  return {
    said: `${name} isn't in this link`,
    blocks: [
      {
        kind: "text",
        text: "The conversation travels in the URL, and a file cannot. The question is here; what I read is not. Attach or drop it again and I'll read it back.",
      },
    ],
  }
}

/**
 * What comes back when nothing matches.
 *
 * IT REFUSES, AND THEN IT IS USEFUL. A copilot that says only "I can't help
 * with that" makes the recruiter guess twice; this one prints the questions it
 * can take, which is also the honest description of what is behind it — a
 * fixed set of answers over the prototype's own data, not a model.
 */
function cannotAnswer(): Answer {
  return {
    said: "I can't answer that one",
    blocks: [
      {
        kind: "text",
        text: "There is no model behind this screen — every answer is worked out from your postings, applicants, searches and diary, so I can only take the questions I have the numbers for. Any of these work:",
      },
      {
        kind: "prompts",
        prompts: [...CARDS, ...CHIPS].map((skill) => skill.prompt),
      },
    ],
  }
}

/**
 * Free text, routed by keyword.
 *
 * DELIBERATELY DUMB, AND VISIBLY SO. It counts keyword hits and takes the best
 * one; a tie or a miss is a refusal rather than a guess. Anything cleverer here
 * would be a model this prototype does not have, and its failures would look
 * like an answer.
 */
export function answerFor(
  prompt: string,
  brand: Brand,
  /**
   * What has been read this session, by filename. `null` is a file whose
   * format the browser cannot turn into words; a name that is missing
   * entirely is a link opened after the reading was lost.
   */
  files: Record<string, string | null> = {}
): Answer {
  const attached = attachmentIn(prompt)
  if (attached !== null) {
    if (!(attached in files)) return fileIsGone(attached)
    const text = files[attached]
    return text === null
      ? cannotRead(attached)
      : readFile(attached, text, brand)
  }

  const exact = skillFor(prompt)
  if (exact) return exact.answer(brand)

  const { skill, tied } = routeFor(prompt)
  return skill
    ? skill.answer(brand)
    : tied.length
      ? didYouMean(tied)
      : cannotAnswer()
}

/**
 * What comes back when a sentence could be more than one thing.
 *
 * ASKED, NOT GUESSED. A tie used to go to whichever skill was listed first, so
 * "hiring insights" quietly started a job posting. Each option is the skill's
 * own prompt, and tapping it asks that exactly — which routes without doubt.
 */
function didYouMean(options: Skill[]): Answer {
  return {
    said: "Which did you mean?",
    blocks: [
      {
        kind: "text",
        text: "That could be more than one thing, so I'd rather ask than guess.",
      },
      {
        kind: "prompts",
        prompts: options.map((skill) => skill.prompt),
        labels: options.map((skill) => ROUTE_LABELS[skill.id] ?? skill.id),
      },
    ],
  }
}

/**
 * The skill whose keywords a sentence hits hardest — or, when several hit it
 * equally hard, all of them, and no winner.
 *
 * WHOLE WORDS, AND A PHRASE WEIGHS ITS LENGTH. Substrings let "new" in "New
 * Delhi" outvote a sentence about hiring, and "post" hide inside "position".
 * Weighing a phrase by its words is what lets "how is my hiring going" (two)
 * beat posting's bare "hiring" (one).
 *
 * A TIE HAS NO WINNER. It used to go to the first skill in the list, which
 * is a guess that looks like an answer. Now a tie (or a miss) is what Gemini is
 * asked about (`lib/agent-route-ai.ts`), and failing that, the recruiter.
 */
function routeFor(prompt: string): { skill: Skill | null; tied: Skill[] } {
  const text = prompt.toLowerCase()
  let top = 0
  let tied: Skill[] = []
  for (const skill of ALL) {
    const score = skill.keywords
      .filter((word) =>
        new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(
          text
        )
      )
      .reduce((sum, word) => sum + word.split(" ").length, 0)
    if (!score || score < top) continue
    if (score > top) {
      top = score
      tied = []
    }
    tied.push(skill)
  }
  return tied.length === 1
    ? { skill: tied[0], tied: [] }
    : { skill: null, tied }
}

/**
 * What each skill is called wherever the page names it — the "Which did you
 * mean?" buttons and the work step. A skill with a pill on the landing takes
 * the PILL'S name, so "Create Job" is never also called "Post a job" one line
 * away from it.
 */
const ROUTE_LABELS: Record<string, string> = {
  posting: "Create Job",
  find: "Search Resume",
  market: "Market insights",
  decisions: "Review applicants",
  strongest: "The strongest five",
  week: "This week's diary",
  new: "What changed",
  outreach: "Write a note",
  funnel: "Hiring Insights",
  cheapest: "Best-value city",
}

/**
 * What pressing Enter will DO, for the line beside the send button — an
 * outcome, not a destination: nobody thinks of a message as being routed.
 */
const ROUTE_ACTIONS: Record<string, string> = {
  posting: "Start a job post",
  find: "Find people",
  market: "Show pay and where the people are",
  decisions: "Open your review queue",
  strongest: "Show the strongest five",
  week: "Show this week's interviews",
  new: "Show what changed",
  outreach: "Draft a note to your shortlist",
  funnel: "Show how your hiring is going",
  cheapest: "Compare cities by value",
}

/** Every skill id free text can be routed to — what Gemini may answer with. */
export const ROUTE_IDS = ALL.map((skill) => skill.id)

/**
 * Where the box's text would go if sent now.
 *
 * WORKED OUT FROM THE KEYWORDS AT TYPING SPEED, never the model. A clear
 * winner carries what Enter will do; a tie carries only the candidates, which
 * the landing lights up as pills rather than explaining in a sentence. A miss
 * is nothing: "I'll work it out" says what everybody already assumes, and
 * "Which did you mean?" catches it after send.
 */
export type RouteHint =
  { kind: "clear"; id: string; action: string } | { kind: "tie"; ids: string[] }

export function routeHint(text: string): RouteHint | null {
  const trimmed = text.trim()
  // A `/` command has its own menu; an encoded turn is never typed.
  if (!trimmed || trimmed.startsWith("/") || encodedTurn(trimmed)) return null
  const exact = skillFor(trimmed)
  const { skill, tied } = exact ? { skill: exact, tied: [] } : routeFor(trimmed)
  if (skill)
    return {
      kind: "clear",
      id: skill.id,
      action: ROUTE_ACTIONS[skill.id] ?? ROUTE_LABELS[skill.id] ?? skill.id,
    }
  if (tied.length) return { kind: "tie", ids: tied.map((option) => option.id) }
  return null
}

/**
 * A turn the page wrote rather than the recruiter: a submitted card, a change
 * from the rail, a lock, a filter move, a hiring manager's note. Never routed.
 */
function encodedTurn(prompt: string) {
  return /^(Answers|Change|Lock|Filter|Note|Ask): /.test(prompt)
}

/**
 * A SENTENCE WRITTEN UNDER A PILL — Create Job pressed, then "Head of
 * Marketing in Mumbai, 12+ years" typed. The pill decided where it goes, so
 * the turn carries the skill: nothing in the sentence says "hire", and
 * without it the keywords would miss and Gemini would be asked a question the
 * recruiter already answered by pressing the pill. Drawn in their bubble as
 * the sentence under the pill's name.
 */
const ASK = "Ask: "

export function encodeAsk(skill: string, text: string) {
  return `${ASK}${JSON.stringify({ skill, text })}`
}

export function decodeAsk(
  prompt: string
): { skill: string; text: string } | null {
  if (!prompt.startsWith(ASK)) return null
  try {
    const value = JSON.parse(prompt.slice(ASK.length)) as {
      skill?: unknown
      text?: unknown
    }
    return typeof value.skill === "string" && typeof value.text === "string"
      ? { skill: value.skill, text: value.text }
      : null
  } catch {
    return null
  }
}

/** What a pill's skill is called in the bubble — its pill's own name. */
export function askLabel(skill: string) {
  return ROUTE_LABELS[skill] ?? skill
}

/**
 * The questions a pill that asks rather than describes stands for. Review
 * applicants is the work already moving — the queue, the best of it, what is
 * new, the note to the shortlist, the diary; Hiring Insights is the numbers —
 * your own, and the market's.
 */
const MODE_FAMILY: Record<string, string[]> = {
  decisions: ["decisions", "strongest", "new", "outreach", "week"],
  funnel: ["funnel", "market", "cheapest"],
}

/** Whether a skill is one of the pill's own — its family, or itself. */
function inMode(mode: string, id: string) {
  return id === mode || (MODE_FAMILY[mode] ?? []).includes(id)
}

/**
 * Where a sentence written under a pill goes.
 *
 * THE PILL, UNLESS THE SENTENCE CLEARLY ASKS FOR SOMETHING ELSE. A clear
 * keyword winner outside the pill's own questions breaks out — "hire a sales
 * head" under Review applicants starts a posting — because a recruiter who
 * forgot the pill was pressed should not get the queue back for it.
 *
 * NOT FROM A DESCRIPTION. Under Create Job and Search Resume the sentence
 * describes a role, and descriptions are full of keywords by accident:
 * "Product Manager, Pune" is a clear win for the best-value-city question
 * (its keyword is "pune"). So a sentence that describes a role stays put, and
 * only a question — "who's waiting on me?" — leaves.
 *
 * Otherwise a question stays in the family: the keywords' pick within it, a
 * tie's member of it, or the pill's own question — and null when the tie
 * crosses the family's edge, for the caller to route as typed text.
 */
export function modeTarget(
  mode: string,
  text: string,
  brand: Brand
): Skill | null {
  const { skill, tied } = routeFor(text)
  const describes =
    (mode === "posting" || mode === "find") && describesRole(text, brand)
  if (skill) return inMode(mode, skill.id) || !describes ? skill : byId(mode)
  // A TIE ACROSS THE PILL'S EDGE IS NOT THE PILL'S TO SETTLE. "Find product
  // managers in Pune" under Hiring Insights ties Search ("find") with the
  // best-value city ("pune"); picking the family's half sent a search to a
  // city comparison. So it goes where any typed tie goes — Gemini, then
  // "Which did you mean?" (null). A tie inside the family, or a miss, is
  // the pill's.
  if (!describes && tied.some((option) => !inMode(mode, option.id))) return null
  return tied.find((option) => inMode(mode, option.id)) ?? byId(mode)
}

/**
 * The composer's hint under a pill: said only when the sentence is about to
 * leave it, since staying is what the pressed pill already shows.
 */
export function modeHint(mode: string, text: string, brand: Brand) {
  const trimmed = text.trim()
  if (!trimmed || trimmed.startsWith("/")) return null
  const target = modeTarget(mode, trimmed, brand)
  return target && inMode(mode, target.id) ? null : routeHint(trimmed)
}

/**
 * Under Review applicants or Hiring Insights, the box offers that pill's
 * questions, each sent as it is pressed — they are whole questions already,
 * and writing one into the box to press Enter on would be a step for nothing.
 * Anything typed instead stays within the family (`answersFor`).
 */
export function askAssist(skill: string, brand: Brand): ComposeAssist {
  const family = MODE_FAMILY[skill] ?? []
  const waiting = undecidedTotal(brand)
  const busiest = busiestJob(brand)
  return {
    checks: [],
    rows: [
      {
        kind: "ask",
        title: "Try asking",
        send: true,
        options: family.map((id) => {
          const { prompt } = byId(id)
          return {
            label: prompt,
            text: prompt,
            detail:
              id === "decisions" && waiting
                ? `${waiting} waiting`
                : id === "strongest" && busiest
                  ? busiest.title
                  : undefined,
          }
        }),
      },
    ],
  }
}

/**
 * A turn of the posting conversation, as a reply.
 *
 * The question is the bubble, with what the last answer set said back in
 * front of it — "Got it — Pune. How much experience should they have?" — so
 * the recruiter can see it was heard without a second message to read. The
 * way to the form rides on every question and carries the draft so far, so
 * leaving the chat half-way through loses nothing.
 */
export function intakeReply(state: IntakeState, brand: Brand): Answer {
  const to = postingHref(state.draft, { industries: state.brief.industries })

  // FIRST, HOW IT STARTS — a clarifying card, because a JD or an old posting
  // changes every question after it (`lib/job-start.ts`).
  if (state.stage === "posting" && state.opener && state.origin === null) {
    return {
      // "Fill in a form" is already one of the choices below, so the
      // below-card escape hatch would only say the same thing twice.
      said: "Happy to help. First, how would you like to start?",
      blocks: [
        { kind: "questionnaire", items: [startItem()], submit: "Continue" },
      ],
    }
  }

  // FILL IN A FORM — read here, not as a stage of its own. There is no draft
  // yet to carry over, so this is a link out rather than a question answered.
  if (state.stage === "posting" && state.opener && state.origin === "form") {
    return {
      said: "Sure — here's the form.",
      blocks: [
        {
          kind: "links",
          items: [
            {
              label: "Post a job",
              detail: "The same six questions, as a form instead of a chat",
              to,
            },
          ],
        },
      ],
    }
  }

  if (state.stage === "posting" && state.opener && state.origin === "job") {
    return {
      said: [state.heard, "Which job should we start from?"]
        .filter(Boolean)
        .join(" "),
      noted: state.noted,
      blocks: [
        {
          kind: "questionnaire",
          items: [baseItem(brand)],
          submit: "Continue",
          form: { label: "Fill in a form instead", to },
        },
      ],
    }
  }

  // A JD is coming: pasted into the reply box, or attached with the
  // paperclip, or dropped on the box. Either way it is read as a document.
  if (state.stage === "posting" && state.opener && state.origin === "jd") {
    return {
      said: "Paste the job description below, or drop a PDF or Word doc on the box.",
      // The sentence alone. The recruiter picked "I have a JD" a moment ago,
      // so a line promising to read it and a way out to the form were only
      // saying the choice back to them.
      blocks: [],
    }
  }

  // FROM SCRATCH, ONE PLAIN ASK. It names the five things worth saying and
  // says why more is better — every one of them skips a question later — and
  // nothing else: no examples to copy, no hint line, no second way out. The
  // reply box carries an example, where it is read as one rather than tapped.
  if (state.stage === "posting" && state.opener) {
    return {
      said: "Tell me about the role — the job title, location, years of experience, industry and the skills that matter. The more you tell me now, the fewer questions I'll need to ask.",
      blocks: [],
    }
  }

  // EVERYTHING AFTER IT IS ONE CARD of whatever is still open — the posting's
  // missing fields, then the refinement topics — submitted as one answer.
  const items =
    state.stage === "posting"
      ? remainingFields(state.draft, state.skipped).map((id) =>
          postingItem(id, state, brand)
        )
      : state.stage === "refine"
        ? pendingTopics(state).map((topic) => refineItem(topic, state, brand))
        : state.stage === "screen"
          ? [screeningItem(state)]
          : []

  if (items.length) {
    const again = Boolean(state.unread?.length)
    const lead =
      state.stage === "posting"
        ? again
          ? "A couple still need an answer."
          : "A few more things for the posting."
        : state.stage === "screen"
          ? criteriaOn(state)
            ? "That's the selection criteria. One optional addition — should candidates answer a few questions when they apply?"
            : "That's the posting. One optional addition — should candidates answer a few questions when they apply?"
          : state.settled.length === 0
            ? "That's the posting. Before it goes up, a few quick questions to sharpen who we look for."
            : "One more go at these."
    return {
      said: [state.heard, lead].filter(Boolean).join(" "),
      noted: state.noted,
      blocks: [
        {
          kind: "questionnaire",
          items,
          submit:
            state.stage === "posting"
              ? "Continue"
              : state.stage === "screen"
                ? "Set questions"
                : "Finish",
          ...(state.stage === "posting"
            ? { form: { label: "Fill in a form instead", to } }
            : { postNow: POST_NOW }),
        },
      ],
    }
  }

  const brief = briefRows(state)
  const unknown = unknownCompanies(state, brand)
  const notes = [
    brief.length
      ? "Private — used to search and screen, never shown on the posting."
      : null,
    unknown.length
      ? `${unknown.join(", ")} ${unknown.length === 1 ? "isn't" : "aren't"} in the database, so ${unknown.length === 1 ? "it" : "they"} can't be a filter.`
      : null,
    !criteriaOn(state)
      ? state.draft.skills.length || state.draft.niceSkills.length
        ? "Skills rank people under the Juicebox filter design and remove nobody."
        : null
      : state.draft.skills.length ||
          state.draft.niceSkills.length ||
          state.brief.institutes.length ||
          state.brief.exclusions.length
        ? "Skills, institutes and rule-outs rank people under the Juicebox filter design and remove nobody."
        : null,
  ].filter(Boolean)

  return {
    said: [
      state.heard,
      state.plan.length ? "That's everything." : "That's everything I need.",
    ]
      .filter(Boolean)
      .join(" "),
    noted: state.noted,
    blocks: [
      {
        kind: "posting",
        rows: summaryRows(state.draft),
        description: describePosting(state.draft),
        to,
        brief,
        briefNote: notes.join(" "),
        search: searchHrefFor(state, brand),
        screening: state.draft.screening,
      },
    ],
  }
}

/** A turn of the intake that has not been read yet, for the page to read. */
export type PendingReading = {
  key: string
  state: IntakeState
  input: IntakeInput
}

/**
 * A typed sentence the keywords could not route, for the page to ask Gemini
 * about (`routeWithAi`). Keyed by the sentence itself: where it goes does not
 * depend on the turns before it.
 */
export type PendingRoute = {
  prompt: string
  /** The skills the keywords tied between, best first; empty for a miss. */
  tied: string[]
  /** Which turn is waiting on it — its marker says so. */
  index: number
}

/**
 * Every turn's reply, in order — or `null` for a turn still being read.
 *
 * MOST TURNS ARE INDEPENDENT, AND ONE KIND IS NOT. A question about the queue
 * means the same thing wherever it sits, so `answerFor` answers it alone. An
 * answer inside the posting intake only means something against the question
 * before it — "8" is eight years because experience was asked — so the intake
 * is FOLDED: walk the turns in order and carry the draft along.
 *
 * THE READING IS ASYNC, AND THE FOLD IS NOT. Gemini takes a second or two, so
 * this function never calls it. Each intake turn looks up its reading in
 * `readings`, keyed by the brand and every intake turn up to and including it;
 * the first one that is missing comes back as `pending`, and every turn from
 * there on is `null` until the page has read it and called again. Readings are
 * therefore always taken in order, each against the state the one before it
 * produced — and the URL stays the whole conversation, because the readings
 * are a cache of what those turns mean, not a second transcript.
 *
 * LEAVING IS EXPLICIT. Inside the intake, typed text is always an answer —
 * "pay is 40 lakhs" mentions pay, and it is still an answer to the pay
 * question. Only a card, a chip or a `/` command (an exact prompt) leaves, and
 * asking to post a job again starts a fresh draft.
 *
 * OUTSIDE A FLOW, TYPED TEXT IS ROUTED — by keyword when one skill wins, and
 * by Gemini when the keywords tie or miss. That decision is async too, so it
 * works like a reading: looked up in `routes` by the sentence, and the first
 * one missing comes back as `pendingRoute` with every turn from there `null`.
 */
export function answersFor(
  prompts: string[],
  brand: Brand,
  files: Record<string, string | null> = {},
  readings: Record<string, IntakeState> = {},
  /** The /settings switch for Selection criteria (`lib/selection-criteria.ts`). */
  {
    criteria = true,
    suggest = false,
    routes = {},
  }: {
    criteria?: boolean
    /** Where Gemini (or the rules standing in) sent sentences the keywords could not. */
    routes?: Record<string, RouteDecision>
    /**
     * Chat v3 (`lib/chat-v3.ts`): the agent fills what the pool can tell it,
     * locks are honoured, and a hiring manager's note is read. Off for every
     * other layout, which therefore reads exactly as before.
     */
    suggest?: boolean
  } = {}
): {
  answers: (Answer | null)[]
  pending: PendingReading | null
  pendingRoute: PendingRoute | null
  /** Whether typed text would be routed now, rather than answer a question. */
  routable: boolean
  /** The latest posting conversation's state, for the rail beside it. */
  posting: IntakeState | null
  /** The latest search conversation's state, likewise. */
  search: SearchState | null
  /** Which of the two started last — whose rail the page shows. */
  flow: "posting" | "search" | null
  /** The posting state after each turn, for where each value came from. */
  states: (IntakeState | null)[]
} {
  const answers: (Answer | null)[] = []
  let intake: IntakeState | null = null
  let posting: IntakeState | null = null
  let turns: string[] = []
  let pending: PendingReading | null = null
  let pendingRoute: PendingRoute | null = null
  // THE SEARCH CONVERSATION, folded the same way but never pending: its
  // readers are rules, so every turn resolves here.
  let searching: SearchState | null = null
  let search: SearchState | null = null
  let flow: "posting" | "search" | null = null
  const states: (IntakeState | null)[] = []

  for (const prompt of prompts) {
    // One state per turn, taken as the next turn begins.
    if (states.length < answers.length) states.push(posting)
    if (pending || pendingRoute) {
      answers.push(null)
      continue
    }

    const attached = attachmentIn(prompt)
    const exact = skillFor(prompt)
    // A sentence written under a pill (`encodeAsk`): the pill says where.
    const asked = decodeAsk(prompt)

    // WHERE TYPED TEXT GOES, when it is not answering anything: the keywords'
    // outright winner, or what Gemini (or the rules standing in) decided.
    // A sentence under a pill that the pill cannot settle — a tie across its
    // edge (`modeTarget` is null) — is routed like anything typed.
    const target = asked ? modeTarget(asked.skill, asked.text, brand) : null
    const said = asked?.text ?? prompt
    const free =
      (!intake &&
        !searching &&
        !exact &&
        attached === null &&
        !encodedTurn(prompt)) ||
      (asked !== null && target === null)
    let routed: Skill | null = null
    let unsure: Skill[] | null = null
    let routeStep: WorkStep | undefined
    if (free) {
      const { skill, tied } = routeFor(said)
      const decision = skill ? null : routes[said]
      if (skill) routed = skill
      else if (!decision) {
        pendingRoute = {
          prompt: said,
          tied: tied.map((option) => option.id),
          index: answers.length,
        }
        answers.push(null)
        continue
      } else {
        const known = (id: string) => ALL.find((option) => option.id === id)
        routed = decision.skill ? (known(decision.skill) ?? null) : null
        unsure = routed
          ? null
          : decision.options.flatMap((id) => known(id) ?? [])
        routeStep = {
          by: decision.by,
          took: decision.took,
          note: decision.note,
          recorded: [
            {
              label: routed ? "Understood as" : "Could be",
              value: routed
                ? (ROUTE_LABELS[routed.id] ?? routed.id)
                : unsure?.length
                  ? unsure
                      .map((option) => ROUTE_LABELS[option.id] ?? option.id)
                      .join(" or ")
                  : "None of what I can answer",
            },
          ],
        }
      }
    }

    // A change from the rail, or a card answered late, while a search is the
    // conversation on screen.
    if (flow === "search" && search && !exact) {
      const change =
        decodeChange(prompt) ?? (!searching ? decodeAnswers(prompt) : null)
      if (change) {
        const before = search
        search = advanceSearch(search, { change }, brand)
        searching = search.stage === "done" ? null : search
        answers.push({
          ...searchReply(search, brand),
          step: searchStepFor(before, search, brand),
        })
        continue
      }
    }

    // A SENTENCE WRITTEN UNDER A PILL goes where the pill says — unless it
    // clearly asks for something else (`modeTarget`), in which case it goes
    // there and the work step says it left the pill.
    if (asked && target) {
      routed = target
      if (!inMode(asked.skill, routed.id))
        routeStep = {
          by: "rules",
          recorded: [
            {
              label: "Understood as",
              value: `${ROUTE_LABELS[routed.id] ?? routed.id}, not ${askLabel(asked.skill)}`,
            },
          ],
        }
    }

    // A SEARCH STARTS on the pill, the `/` skill, or a sentence that asks to
    // find people. The pill asks who you are looking for; a sentence is the
    // answer to that already, and is read as the requirement.
    if ((exact && exact.id === "find") || routed?.id === "find") {
      intake = null
      flow = "search"
      let next = startSearch()
      if (!exact)
        next = advanceSearch(next, { text: asked?.text ?? prompt }, brand)
      search = next
      searching = next.stage === "done" ? null : next
      answers.push({ ...searchReply(next, brand), step: routeStep })
      continue
    }

    if (searching && !exact) {
      const submitted = decodeAnswers(prompt)
      const input: SearchInput = submitted
        ? { answers: submitted }
        : { text: prompt }
      const before = searching
      search = advanceSearch(searching, input, brand)
      searching = search.stage === "done" ? null : search
      answers.push({
        ...searchReply(search, brand),
        step: searchStepFor(before, search, brand),
      })
      continue
    }

    // CHAT V3'S OWN TURNS: a lock from the rail, or a filter made a
    // good-to-have, a must again, or dropped. They change only what the
    // readers may change, or the brief — read by the page, never pending, and
    // never a model's to read. Every layout knows them, so switching away
    // from Chat v3 never sends "Lock: …" to Gemini as an answer; only Chat v3
    // applies them.
    const lock = flow === "posting" ? decodeLock(prompt) : null
    const move = flow === "posting" ? decodeFilter(prompt) : null
    if ((lock || move) && posting) {
      if (suggest && lock) {
        const relock = (state: IntakeState): IntakeState => {
          const locked = (state.locked ?? []).filter((id) => id !== lock.field)
          return {
            ...state,
            locked: lock.on ? [...locked, lock.field] : locked,
            suggested: (state.suggested ?? []).filter(
              (id) => id !== lock.field
            ),
          }
        }
        posting = relock(posting)
        if (intake) intake = relock(intake)
      }
      if (suggest && move) {
        posting = applyFilter(posting, move)
        if (intake) intake = applyFilter(intake, move)
      }
      // The reply is the conversation as it stands, so the card it was
      // asking stays up under the marker.
      answers.push(intakeReply(intake ?? posting, brand))
      continue
    }

    // A CHANGE FROM THE RAIL, at any point after the posting began — even
    // after "That's everything", when the intake has already been handed
    // back. It is read by the page, so it is never pending, and the reply
    // is the conversation as it stands: the same card again, corrected.
    // A QUESTIONNAIRE ANSWER THAT ARRIVES AFTER THE INTAKE HAS CLOSED IS A
    // CHANGE. It can happen: Gemini re-reads a conversation in every new tab
    // and does not always pick the same refinement topics, so a card
    // answered under one plan can land after another plan has finished. A
    // late answer to a posting question means the same thing a pencil
    // does, and is read the same way — never as a question about the queue.
    const late =
      !intake && posting && flow === "posting" ? decodeAnswers(prompt) : null
    const change =
      flow === "posting"
        ? (decodeChange(prompt) ??
          (late && !("start" in late) && !("base" in late) ? late : null))
        : null
    if (change) {
      const given = intake ?? posting
      if (given) {
        const base = suggest ? withoutSuggestions(given) : given
        intake = advance(base, { change }, brand)
        if (suggest)
          intake = withSuggestions(
            { ...intake, locked: given.locked },
            given,
            brand
          )
        posting = intake
        turns = [...turns, prompt]
        answers.push({
          ...intakeReply(intake, brand),
          step: stepFor(given, intake),
        })
        if (intake.stage === "done") intake = null
        continue
      }
    }

    if ((exact && exact.id === "posting") || routed?.id === "posting") {
      intake = startIntake({ criteria })
      posting = intake
      searching = null
      flow = "posting"
      // "Hire an FMCG product manager in Delhi" has already answered how it
      // starts — from scratch, with this sentence — so it is read as the
      // opener below rather than asked "How would you like to start?". A
      // sentence written under Create Job always is, even "Product Manager"
      // alone: the pill already said what it is for.
      if (
        asked?.skill !== "posting" &&
        (exact || !describesRole(asked?.text ?? prompt, brand))
      ) {
        turns = [prompt]
        answers.push({ ...intakeReply(intake, brand), step: routeStep })
        continue
      }
      intake = { ...intake, origin: "scratch" }
      posting = intake
      turns = []
    }

    // A pill's question is never an answer to the posting it interrupts.
    if (intake && !exact && !(asked && routed?.id !== "posting")) {
      let input: IntakeInput = { text: asked?.text ?? prompt }
      const submitted = decodeAnswers(prompt)
      // A hiring manager's note (Chat v3) is read like any typed answer.
      const note = decodeNote(prompt)
      if (submitted) input = { answers: submitted }
      else if (note !== null) input = { text: note }
      else if (attached !== null) {
        const text = files[attached]
        // A file that is gone or unreadable is answered as a file, and the
        // question it interrupted is still the one being asked.
        if (text === undefined || text === null) {
          answers.push(answerFor(prompt, brand, files))
          continue
        }
        input = { text, document: true }
      }

      turns = [...turns, prompt]
      // Marked only when the switch is off, so readings made with it on keep
      // their keys — and a toggle re-reads rather than replaying a reading
      // made under the other setting.
      const key = [
        brand,
        ...(criteria ? [] : ["no-criteria"]),
        // Chat v3's readers see a different state (the agent's fills taken
        // out), so its readings are its own.
        ...(suggest ? ["v3"] : []),
        ...turns,
      ].join("\u0001")
      const reading = readings[key]
      if (!reading) {
        pending = {
          key,
          state: suggest ? withoutSuggestions(intake) : intake,
          input,
        }
        answers.push(null)
        continue
      }

      const before = intake
      intake = suggest
        ? withSuggestions({ ...reading, locked: before.locked }, before, brand)
        : reading
      posting = intake
      // The start questions are buttons the page reads — a choice, or a job
      // copied — so a "Read by rules" step over them would describe a click.
      // Keyed on the turn itself, so a sentence typed INSTEAD of choosing (a
      // real reading) still gets its step.
      const chose = Boolean(
        submitted && ("start" in submitted || "base" in submitted)
      )
      answers.push({
        ...intakeReply(intake, brand),
        step: chose ? undefined : stepFor(before, reading),
      })
      if (intake.stage === "done") intake = null
      continue
    }

    intake = null
    if (routed) answers.push({ ...routed.answer(brand), step: routeStep })
    else if (unsure)
      answers.push({
        ...(unsure.length ? didYouMean(unsure) : cannotAnswer()),
        step: routeStep,
      })
    else answers.push(answerFor(prompt, brand, files))
  }

  if (states.length < answers.length) states.push(posting)
  return {
    answers,
    pending,
    pendingRoute,
    routable: !intake && !searching,
    posting,
    search,
    flow,
    states,
  }
}

/** What one search turn changed — the rail's rows, before and after. */
function searchStepFor(
  before: SearchState,
  after: SearchState,
  brand: Brand
): WorkStep {
  const rows = (state: SearchState) => {
    const all = searchRows(state, brand)
    return new Map(
      [
        ...all.requirement,
        ...all.criteria,
        { label: "Skills", value: all.skills.join(", ") || null },
      ].map((row) => [row.label, row.value ?? "—"])
    )
  }
  const was = rows(before)
  const recorded = [...rows(after)]
    .filter(([label, value]) => was.get(label) !== value && value !== "—")
    .map(([label, value]) => ({ label, value }))
  if (after.criteria && !before.criteria)
    recorded.push({ label: "Criteria", value: after.criteria.join(" › ") })
  return { by: "rules", recorded }
}

/**
 * A turn of the search conversation, as a reply.
 *
 * The four stages in turn: ask for the requirement; ask what the sentence
 * left out, as one card, with a way straight to the people; put the three
 * the search ranks first up for a verdict; and open the search on all of it.
 * Everything said is computed from the same pool Search Resume draws from.
 */
export function searchReply(state: SearchState, brand: Brand): Answer {
  if (state.stage === "opener") {
    return {
      said: state.missed
        ? (state.heard ??
          "Who are you looking for? Say it in a sentence — the role, the city, how senior, and the skills that matter.")
        : "Who are you looking for? Say it in a sentence — the role, the city, how senior, and the skills that matter. I'll only ask about what's missing.",
      blocks: [],
    }
  }

  if (state.stage === "criteria") {
    const items = searchItems(state, brand)
    const summary = searchSummary(state, brand)
    return {
      said: [
        state.heard,
        summary && !state.noted?.length ? `Looking for ${summary}.` : null,
        "A few things the search can use — every one of them is a filter on the results.",
      ]
        .filter(Boolean)
        .join(" "),
      noted: state.noted,
      blocks: [
        {
          kind: "questionnaire",
          items,
          submit: "Continue",
          postNow: SEARCH_NOW,
          postNowLabel: SEARCH_NOW,
        },
      ],
    }
  }

  if (state.stage === "calibrate") {
    const people = searchReviewees(state, brand).map(personOf)
    return {
      said: [
        state.heard,
        people.length
          ? "These are the three the search ranks first. Say whether each is what you meant — it changes what counts, and it's optional."
          : "The filters leave nobody to calibrate against — loosen one on the search, or open it as it is.",
      ]
        .filter(Boolean)
        .join(" "),
      noted: state.noted,
      blocks: people.length ? [{ kind: "calibrate", people }] : [],
    }
  }

  const pool = searchPool(state, brand)
  const rows = searchRows(state, brand)
  return {
    said: [state.heard, "That's the search."].filter(Boolean).join(" "),
    noted: state.noted,
    blocks: [
      {
        kind: "search",
        role: roleOf(state, brand),
        matching: pool.matching.length,
        total: pool.all.length,
        criteria: searchCriteria(state, brand),
        calibrated: state.criteria !== null,
        rows: [
          ...rows.requirement,
          { label: "Skills", value: rows.skills.join(", ") || null },
          ...rows.criteria,
        ]
          .filter((row) => row.value !== null)
          .map((row) => ({ label: row.label, value: row.value! })),
        href: searchHrefOf(state, brand),
        // Offered only when the search found too few to be worth opening
        // as it stands: fewer than the three calibration would have shown.
        widenings:
          pool.matching.length < 3 ? searchWidenings(state, brand) : [],
      },
    ],
  }
}

/**
 * What one reading changed — the card's own rows, before and after — plus the
 * posting fields it skipped. Drawn inside the collapsed work step, so "Read
 * by Gemini in 2.8s" opens onto exactly what it recorded and nothing it did
 * not.
 */
function stepFor(before: IntakeState, after: IntakeState): WorkStep {
  const rows = (state: IntakeState) =>
    new Map(
      [...summaryRows(state.draft), ...briefRows(state)].map((row) => [
        row.label,
        row.value,
      ])
    )
  const was = rows(before)
  const empty = new Set(["—", "None listed", "Not disclosed"])
  const recorded = [...rows(after)]
    .filter(([label, value]) => was.get(label) !== value && !empty.has(value))
    .map(([label, value]) => ({ label, value }))
  for (const id of after.skipped.filter((id) => !before.skipped.includes(id))) {
    recorded.push({ label: LABELS[id], value: "Skipped" })
  }

  return {
    by: after.engine,
    took: after.took,
    note:
      after.fallback === "unconfigured"
        ? "Gemini isn't configured on the AI server"
        : after.fallback === "failed"
          ? "Gemini didn't answer"
          : undefined,
    recorded,
  }
}
