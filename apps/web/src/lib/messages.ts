/**
 * Mock threads for the message dock.
 *
 * The candidates here are applying to the postings in `jobs.ts` — same titles,
 * same locations. It costs nothing to keep the fixtures joined up and it means
 * a design review can follow one person from the jobs table into a
 * conversation without the prototype contradicting itself.
 *
 * Times are pre-formatted strings rather than timestamps, for the same reason
 * the jobs list stores a real date: a relative time computed from a fixture
 * ages badly, and "2 minutes ago" that has been 2 minutes ago for a month
 * reads as a bug.
 */

export type MessageAuthor = "them" | "you"

export type Message = {
  id: string
  author: MessageAuthor
  body: string
  /** Clock time, as it should appear under the bubble. */
  at: string
}

/**
 * Stand-in portraits, as inline SVG data URIs.
 *
 * VENDORED, NOT HOTLINKED — the same call the brand wordmark makes. Pointing
 * `AvatarImage` at pravatar or dicebear would give more convincing faces, but
 * it makes the prototype need the network to render and puts strangers' faces
 * in a design review; a silhouette is honest about being a placeholder.
 *
 * They go through `AvatarImage` rather than being drawn inline so the
 * component path is the real one: dropping in actual photographs later is a
 * change to this function and nothing else, and `AvatarFallback` still shows
 * initials if an image ever fails to load.
 *
 * The hues are deliberately desaturated mid-tones. They are picture content
 * rather than UI colour, so they are not tokens — but they are kept dull
 * enough that none of them can be mistaken for a brand accent, and mid-toned
 * so they hold up in both themes without a dark variant.
 */
const PORTRAIT_HUES = [212, 28, 152, 284, 340, 44]

export function placeholderPhoto(index: number) {
  const hue = PORTRAIT_HUES[index % PORTRAIT_HUES.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="hsl(${hue} 24% 74%)"/><circle cx="40" cy="30" r="14" fill="hsl(${hue} 20% 52%)"/><path d="M11 80a29 29 0 0 1 58 0z" fill="hsl(${hue} 20% 52%)"/></svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export type Conversation = {
  id: string
  name: string
  /** The posting they applied to — the reason the thread exists at all. */
  role: string
  initials: string
  /** Unread inbound messages. Drives both badges and the launcher count. */
  unread: number
  /** Last activity, already humanised for the list row. */
  lastAt: string
  /** A green dot on the avatar. Cosmetic — there is no presence here. */
  online?: boolean
  messages: Message[]
}

export const CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    name: "Ananya Krishnan",
    role: "Principal Engineer, Platform Infrastructure",
    initials: "AK",
    unread: 2,
    lastAt: "11:42",
    online: true,
    messages: [
      {
        id: "c1m1",
        author: "you",
        body: "Hi Ananya — thanks for applying. Your Kafka migration work is the closest thing I have seen to what this team is about to take on. Are you open to a call this week?",
        at: "09:15",
      },
      {
        id: "c1m2",
        author: "them",
        body: "Hi! Yes, happy to talk. I led that migration end to end — 40-odd services off a shared cluster over about eight months.",
        at: "11:40",
      },
      {
        id: "c1m3",
        author: "them",
        body: "Thursday or Friday after 4pm works best for me. I am in Bengaluru, so timezones are not an issue.",
        at: "11:42",
      },
    ],
  },
  {
    id: "c2",
    name: "Rohit Mehta",
    role: "Engineering Manager — Payments",
    initials: "RM",
    unread: 1,
    lastAt: "10:08",
    messages: [
      {
        id: "c2m1",
        author: "them",
        body: "Good morning — following up on my application from last week. I have managed a payments org of 22 across three squads, and I would really like to talk about this one.",
        at: "10:08",
      },
    ],
  },
  {
    id: "c3",
    name: "Sneha Pillai",
    role: "Senior Product Designer",
    initials: "SP",
    unread: 0,
    lastAt: "Yesterday",
    online: true,
    messages: [
      {
        id: "c3m1",
        author: "you",
        body: "Sneha, the portfolio is great. One question before we move ahead — the brief says Gurugram or remote. Which would you actually prefer?",
        at: "16:20",
      },
      {
        id: "c3m2",
        author: "them",
        body: "Remote, ideally, with a week on-site each quarter. I have worked that way for three years and can point you at how we ran design reviews async.",
        at: "17:02",
      },
      {
        id: "c3m3",
        author: "you",
        body: "That works. I will set up a portfolio walkthrough with the team.",
        at: "17:30",
      },
    ],
  },
  {
    id: "c4",
    name: "Vikram Iyer",
    role: "Data Scientist, Pricing",
    initials: "VI",
    unread: 0,
    lastAt: "Yesterday",
    messages: [
      {
        id: "c4m1",
        author: "them",
        body: "Thank you for the update. I will wait to hear about the next round.",
        at: "14:55",
      },
    ],
  },
  {
    id: "c5",
    name: "Meera Nair",
    role: "VP Finance",
    initials: "MN",
    unread: 0,
    lastAt: "Mon",
    messages: [
      {
        id: "c5m1",
        author: "you",
        body: "Hi Meera — sharing the compensation band before we go further, so nobody's time gets wasted. 90 to 110 fixed, plus equity.",
        at: "12:10",
      },
      {
        id: "c5m2",
        author: "them",
        body: "That is workable. Let us keep going.",
        at: "12:44",
      },
    ],
  },
  {
    id: "c6",
    name: "Arjun Desai",
    role: "Head of Category — Fashion",
    initials: "AD",
    unread: 0,
    lastAt: "Mon",
    messages: [
      {
        id: "c6m1",
        author: "them",
        body: "Applied this morning — happy to share references from my last two category roles whenever useful.",
        at: "08:30",
      },
    ],
  },
]

/**
 * The assistant thread.
 *
 * It has no `name` of its own because the name is the active brand's — see
 * `message-dock.tsx`. Everything else about it is a conversation like any
 * other, which is the point: the recruiter should not have to go somewhere
 * different to ask a question about the pipeline they are already looking at.
 */
export const ASSISTANT_ID = "assistant"

export const ASSISTANT_OPENING: Message[] = [
  {
    id: "a1",
    author: "them",
    body: "I can see your six live postings and everyone who has applied to them. Ask me who to shortlist, what a thread is waiting on, or why a posting is not pulling applications.",
    at: "09:00",
  },
]

/** Starters, so the empty assistant thread is not a blank box. */
export const ASSISTANT_PROMPTS = [
  "Who should I shortlist first?",
  "Which threads are waiting on me?",
  "Why is VP Finance getting so few applicants?",
]

/**
 * Canned replies, taken in order. A rotation rather than one answer, so
 * clicking through the starters in a review does not produce the same
 * paragraph three times — and deliberately not keyed to the question, because
 * a fake matcher that gets it wrong is worse than an obvious script.
 */
export const ASSISTANT_REPLIES = [
  "Ananya Krishnan, on Platform Infrastructure. She is the only applicant with a migration at that scale, she has replied twice, and she has offered Thursday and Friday — the thread is waiting on you, not her.",
  "Two: Ananya Krishnan sent times on Thursday and Friday, and Rohit Mehta followed up this morning and has had nothing back for six days.",
  "It is a 15–20 year requirement in Mumbai posted eleven days ago, and 12 applicants is about right for that band. Widening the location or dropping the floor to 12 years would move it more than a repost would.",
  "Head of Category has been live four days with no applications yet. Postings in that band usually take a week before the first one lands, so it is early rather than wrong.",
]
