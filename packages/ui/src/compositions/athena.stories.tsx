import * as React from "react"
import type {
  Decorator,
  Meta as StoryMeta,
  StoryObj,
} from "@storybook/react-vite"
import {
  ArrowRightIcon,
  BookmarkIcon,
  CheckIcon,
  MessageCircleIcon,
  MinusIcon,
  SendIcon,
  SparklesIcon,
  ThumbsUpIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Athena, the copilot column, and every shape her answers take.
 *
 * Mirrors `apps/web/src/components/athena-pane.tsx` (the pane) and
 * `athena-blocks.tsx` (the reply cards). The people and numbers are copied in
 * from the Principal Engineer posting on hirist, because `packages/ui` cannot
 * import the app's generators.
 *
 * These are compositions rather than patterns on purpose: each card is drawn in
 * exactly one place, the pane. A card that turns up somewhere else is the
 * signal to move it to Patterns.
 */

// ─── Mock data, in the shape the app deals ───────────────────────────────────

type Person = {
  id: string
  name: string
  title: string
  company: string
  location: string
  years: number
  pay: number
  notice: number
  skills: string[]
}

const REQUIRED = ["Spark", "Go", "Distributed systems", "Kafka"]

const PEOPLE: Person[] = [
  {
    id: "p1",
    name: "Gaurav Joshi",
    title: "Director of Engineering",
    company: "Swiggy",
    location: "Pune",
    years: 17,
    pay: 93,
    notice: 30,
    skills: ["Spark", "Distributed systems", "Java"],
  },
  {
    id: "p2",
    name: "Nisha Reddy",
    title: "Staff Engineer",
    company: "Zerodha",
    location: "Noida",
    years: 10,
    pay: 65,
    notice: 15,
    skills: ["Distributed systems", "Kafka", "AWS"],
  },
  {
    id: "p3",
    name: "Nikhil Banerjee",
    title: "Engineering Manager",
    company: "Innovaccer",
    location: "Bengaluru",
    years: 5,
    pay: 40,
    notice: 0,
    skills: ["Spark", "Kafka"],
  },
]

const matchedOf = (person: Person) =>
  person.skills.filter((skill) => REQUIRED.includes(skill))

const reasonOf = (person: Person) => {
  const matched = matchedOf(person)
  const notice =
    person.notice === 0 ? "can join now" : `${person.notice}-day notice`
  return `${matched.length} of ${REQUIRED.length} skills: ${matched.join(", ")} · ${person.years} yrs · ${notice}`
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")

const firstName = (name: string) => name.split(" ")[0]

// ─── The pane ────────────────────────────────────────────────────────────────

/**
 * The column, at the app's width (`--athena-width`, 384px) and a fixed height
 * so a story reads like the pane rather than a page. The "Looking at" line is
 * what the page registered; the chips are its questions, kept to hand once a
 * thread has started.
 */
function Pane({
  label,
  detail,
  questions,
  started = true,
  children,
}: {
  label: string
  detail?: string
  questions: string[]
  started?: boolean
  children: React.ReactNode
}) {
  return (
    <aside
      aria-label="Athena"
      className="flex h-[40rem] w-96 max-w-full flex-col overflow-hidden rounded-xl bg-background shadow-sm ring-1 ring-foreground/10"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SparklesIcon className="size-4 shrink-0 text-primary" />
        <span className="flex-1 text-base font-medium">Athena</span>
        <Button variant="ghost" size="icon-sm" aria-label="Close Athena">
          <XIcon />
        </Button>
      </header>

      <div className="flex shrink-0 items-baseline gap-1.5 border-b px-4 py-2 text-xs">
        <span className="shrink-0 text-muted-foreground">Looking at</span>
        <span className="max-w-3/5 min-w-0 shrink-0 truncate font-medium">
          {label}
        </span>
        {detail && (
          <span className="min-w-0 truncate text-muted-foreground">
            · {detail}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">{children}</div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t p-3">
        {started && (
          <div className="flex flex-wrap gap-1.5">
            {questions.map((question) => (
              <button
                key={question}
                type="button"
                className="max-w-full truncate rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:bg-muted"
              >
                {question}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-input bg-input/30 p-2">
          <Textarea
            rows={1}
            aria-label="Ask Athena"
            placeholder="Ask about this page…"
            className="min-h-9 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
          />
          <Button
            size="icon-sm"
            className="shrink-0 rounded-full"
            aria-label="Send"
            disabled
          >
            <SendIcon />
          </Button>
        </div>
      </div>
    </aside>
  )
}

const JOB_QUESTIONS = [
  "Who are the strongest five still to review?",
  "Clear out people with none of the skills",
  "Summarise the responses",
  "Draft a message to the shortlisted",
]

/** The recruiter's turn: the only one with a bubble. */
function You({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground">
        {children}
      </p>
    </div>
  )
}

/**
 * Athena's turn sits on the pane, not in a bubble. The micro-label appears only
 * when the answer is about something other than the page it was asked on.
 */
function Athena({
  about,
  children,
}: {
  about?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-2">
      <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
        {about && (
          <span className="text-[10px] font-medium tracking-[0.07em] uppercase">
            On {about}
          </span>
        )}
        {children}
      </div>
    </div>
  )
}

/** Drawn between turns asked on different pages, and after the last one when you have moved on. */
function MovedTo({ label }: { label: string }) {
  return (
    <div
      role="separator"
      aria-label={`Moved to ${label}`}
      className="flex items-center gap-2 text-[10px] font-medium tracking-[0.07em] text-muted-foreground uppercase"
    >
      <span className="h-px flex-1 bg-border" />
      <span className="max-w-[70%] truncate">Moved to {label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

function Thinking() {
  return (
    <div className="flex items-center gap-2">
      <SparklesIcon className="size-4 shrink-0 animate-pulse text-primary" />
      <span className="text-sm text-muted-foreground">Working it out…</span>
    </div>
  )
}

// ─── Reply cards ─────────────────────────────────────────────────────────────

const card = "rounded-xl border bg-card"

function PersonAvatar({ name, ring }: { name: string; ring?: boolean }) {
  return (
    <Avatar className={ring ? "ring-2 ring-card" : undefined}>
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}

/**
 * People, with the reason each is here and the decision to hand. A decided row
 * swaps its buttons for the decision and an Undo — the status is read live, so
 * a decision taken on the list shows here too.
 */
function CandidateRows({
  people,
  decided = {},
}: {
  people: Person[]
  decided?: Record<string, string>
}) {
  return (
    <ul className={cn(card, "flex flex-col divide-y overflow-hidden")}>
      {people.map((person) => (
        <li key={person.id} className="flex flex-col gap-2 p-3">
          <div className="flex items-start gap-2.5">
            <PersonAvatar name={person.name} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline">
                {person.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {person.title} · {person.company}
              </span>
            </div>
          </div>
          <p className="text-xs leading-relaxed">{reasonOf(person)}</p>
          {decided[person.id] ? (
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary">{decided[person.id]}</Badge>
              <Button size="xs" variant="ghost">
                <Undo2Icon data-icon="inline-start" />
                Undo
              </Button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <Button size="xs">Shortlist</Button>
              <Button size="xs" variant="outline">
                Maybe
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * A batch decision, proposed and not taken. Nothing moves until Apply; Undo
 * puts everybody back in To review. Turning people down is the destructive
 * button, so it reads as the consequential thing it is.
 */
function Proposal({ applied = false }: { applied?: boolean }) {
  const names = ["Harsh Joshi", "Kavya Chopra", "Vikram Desai", "Divya Pillai"]
  return (
    <div className={cn(card, "flex flex-col gap-3 p-3")}>
      <div className="flex -space-x-2">
        {[...names, "Rohit Kapoor", "Sneha Iyer"].map((name) => (
          <PersonAvatar key={name} name={name} ring />
        ))}
      </div>
      <p className="text-xs leading-relaxed">{names.join(", ")} and 22 more</p>
      {applied ? (
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CheckIcon className="size-4 text-primary" />
          <span className="flex-1">Not a fit 26</span>
          <Button size="xs" variant="ghost">
            <Undo2Icon data-icon="inline-start" />
            Undo
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="destructive" className="self-start">
          Move to Not a fit · 26
        </Button>
      )}
    </div>
  )
}

/**
 * A message for the recruiter to send — Athena never sends it. The button puts
 * the text into each recipient's thread and opens the dock. With several
 * recipients the body keeps `{first name}` and one person's version is shown
 * beneath, so the token is never the only thing proofread.
 */
function Draft({
  many = false,
  placed = false,
}: {
  many?: boolean
  placed?: boolean
}) {
  const recipients = many ? PEOPLE : [PEOPLE[1]]
  const body = many
    ? "Hi {first name}, thanks for applying to the Principal Engineer, Platform Infrastructure role. You are on our shortlist, and I would like to set up a 30-minute call this week to talk it through. What times work for you?"
    : "Hi Nisha, thanks for applying to the Principal Engineer, Platform Infrastructure role. Your work with Distributed systems and Kafka at Zerodha is close to what this team needs. Would you be open to a 30-minute call this week?"

  return (
    <div className={cn(card, "flex flex-col gap-3 p-3")}>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {recipients.map((person) => (
            <Avatar
              key={person.id}
              size="sm"
              className={many ? "ring-2 ring-card" : undefined}
            >
              <AvatarFallback>{initials(person.name)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <p className="min-w-0 truncate text-xs text-foreground">
          To {recipients.map((person) => person.name).join(", ")}
        </p>
      </div>

      <Textarea
        defaultValue={body}
        aria-label="Draft message"
        className="min-h-24 text-sm text-foreground"
      />

      {many && (
        <p className="text-xs leading-relaxed">
          <span className="font-medium text-foreground">
            As {firstName(recipients[0].name)} sees it:{" "}
          </span>
          {body.replace("{first name}", firstName(recipients[0].name))}
        </p>
      )}

      {placed ? (
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CheckIcon className="size-4 text-primary" />
          <span className="flex-1">
            Waiting in {many ? `${recipients.length} threads` : "their thread"}{" "}
            to be sent
          </span>
          <Button size="xs" variant="ghost">
            Put back
          </Button>
        </div>
      ) : (
        <Button size="sm" className="self-start">
          <MessageCircleIcon data-icon="inline-start" />
          {many ? `Put in ${recipients.length} threads` : "Open in Messages"}
        </Button>
      )}
    </div>
  )
}

/**
 * Two or three people as columns, attribute by attribute: a label over each
 * row rather than a label column, which would cost a third of 384px. Only the
 * facts with an agreed direction — most skills asked for, soonest start — are
 * set in the foreground colour. Pay and experience are shown, not ranked.
 */
function Compare({ people = PEOPLE }: { people?: Person[] }) {
  const columns = {
    gridTemplateColumns: `repeat(${people.length}, minmax(0, 1fr))`,
  }
  const most = Math.max(...people.map((person) => matchedOf(person).length))
  const soonest = Math.min(...people.map((person) => person.notice))
  const lead = (leads: boolean) =>
    leads ? "font-medium text-foreground" : undefined

  const row = (label: string, cell: (person: Person) => React.ReactNode) => (
    <div className="flex flex-col gap-1 border-t px-3 py-2">
      <span className="text-[10px] font-medium tracking-[0.07em] uppercase">
        {label}
      </span>
      <div className="grid gap-2 text-xs" style={columns}>
        {people.map((person) => (
          <div key={person.id} className="min-w-0 break-words">
            {cell(person)}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className={cn(card, "flex flex-col overflow-hidden")}>
      <div className="grid gap-2 p-3" style={columns}>
        {people.map((person) => (
          <div
            key={person.id}
            className="flex min-w-0 flex-col items-start gap-1.5"
          >
            <PersonAvatar name={person.name} />
            <span className="max-w-full truncate text-sm font-medium text-foreground">
              {person.name}
            </span>
            <span className="line-clamp-2 text-xs">
              {person.title} · {person.company}
            </span>
          </div>
        ))}
      </div>
      {row("Skills asked for", (person) => (
        <span className={lead(matchedOf(person).length === most)}>
          {matchedOf(person).length} of {REQUIRED.length}
          <span className="block font-normal text-muted-foreground">
            {matchedOf(person).join(", ")}
          </span>
        </span>
      ))}
      {row("Experience", (person) => `${person.years} yrs`)}
      {row("Current pay", (person) => `₹${person.pay}L`)}
      {row("Notice", (person) => (
        <span className={lead(person.notice === soonest)}>
          {person.notice === 0 ? "Can join now" : `${person.notice} days`}
        </span>
      ))}
      {row("Location", (person) => person.location)}
      <div className="grid gap-2 border-t p-3" style={columns}>
        {people.map((person, index) =>
          index === 1 ? (
            <Badge key={person.id} variant="secondary" className="max-w-full">
              Shortlisted
            </Badge>
          ) : (
            <Button key={person.id} size="xs" className="min-w-0">
              Shortlist
            </Button>
          )
        )}
      </div>
    </div>
  )
}

/** The result card's evidence lines, stacked for the pane: chip over sentence. */
function Evidence() {
  const verdicts = [
    {
      label: "Kafka",
      met: true,
      evidence: "Used Kafka as Staff Engineer at Zomato.",
    },
    {
      label: "Kubernetes",
      met: true,
      evidence: "Used Kubernetes as Staff Engineer at Razorpay.",
    },
    {
      label: "Led a platform team",
      met: false,
      evidence: "Nothing on the profile speaks to this.",
    },
  ]
  return (
    <ul className={cn(card, "flex flex-col divide-y overflow-hidden")}>
      {verdicts.map((verdict) => (
        <li
          key={verdict.label}
          className="flex flex-col items-start gap-1.5 p-3"
        >
          <Badge
            variant={verdict.met ? "success" : "outline"}
            className="max-w-full font-normal"
          >
            {verdict.met ? (
              <ThumbsUpIcon data-icon="inline-start" />
            ) : (
              <MinusIcon data-icon="inline-start" />
            )}
            <span className="truncate">{verdict.label}</span>
          </Badge>
          <span className={cn("text-xs", verdict.met && "text-foreground")}>
            {verdict.evidence}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * "Expand pool", answered: each row loosens one filter on the page behind, and
 * the number is counted against the whole pool. Once one is applied the others'
 * counts are stale, and they say so rather than offering them.
 */
function Expand({ applied = false }: { applied?: boolean }) {
  const items = [
    { label: "Add Metros", gain: 64 },
    { label: "Widen experience to 6–17 yrs", gain: 52 },
  ]
  return (
    <ul className={cn(card, "flex flex-col divide-y overflow-hidden")}>
      {items.map((item, index) => (
        <li key={item.label} className="flex items-center gap-2 p-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm text-foreground">{item.label}</span>
            <span className="text-xs text-success tabular-nums">
              +{item.gain} people
            </span>
          </div>
          {applied && index === 0 ? (
            <span className="flex items-center gap-1 text-xs text-foreground">
              <CheckIcon className="size-3.5 text-primary" />
              Applied
            </span>
          ) : applied ? (
            <span className="text-xs">Ask again for new counts</span>
          ) : (
            <Button size="xs" variant="outline">
              Apply
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}

/** People to file into a list the recruiter picks. Adds, never removes. */
function Save({ saved = false }: { saved?: boolean }) {
  const names = [
    "Sneha Sharma",
    "Arjun Verma",
    "Tanvi Ghosh",
    "Shreya Sharma",
    "Kavya Pillai",
  ]
  return (
    <div className={cn(card, "flex flex-col gap-3 p-3")}>
      <div className="flex -space-x-2">
        {names.map((name) => (
          <PersonAvatar key={name} name={name} ring />
        ))}
      </div>
      <p className="text-xs leading-relaxed">
        {names.slice(0, 4).join(", ")} and 1 more
      </p>
      {saved ? (
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CheckIcon className="size-4 text-primary" />
          Added 5 to Referrals
        </div>
      ) : (
        <Button size="sm" className="self-start">
          <BookmarkIcon data-icon="inline-start" />
          Save 5 to a list
        </Button>
      )}
    </div>
  )
}

/**
 * Rows that go somewhere — a page, a thread in the dock, or a dialog on the
 * page behind (a clash's Reschedule). A row with none of those only says where
 * to look, and has no arrow.
 */
function Links({
  items,
}: {
  items: { label: string; detail: string; goes?: boolean }[]
}) {
  return (
    <ul className={cn(card, "flex flex-col divide-y overflow-hidden")}>
      {items.map((item, index) => (
        <li
          key={`${index}-${item.label}`}
          className={cn(
            "flex items-center gap-2 p-3",
            item.goes !== false && "transition-colors hover:bg-muted"
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">
              {item.label}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {item.detail}
            </span>
          </div>
          {item.goes !== false && (
            <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
        </li>
      ))}
    </ul>
  )
}

// ─── Stories ─────────────────────────────────────────────────────────────────

const meta = {
  title: "Compositions/Athena",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
Athena, the copilot column, and every shape her answers take. Mirrors
\`apps/web/src/components/athena-pane.tsx\` and \`athena-blocks.tsx\`. In the
shell she sits beside the page — see **Components → Sidebar → App shell with
Athena open**.

**She answers what the page can compute, and nothing else.** Each page registers
a label, a detail and its questions; the answers are worked out at the moment
of asking from the same data the page shows. A question typed in her own box
gets "I can only answer the suggestions for this page so far" — never a
plausible invention.

**Answers are cards, not paragraphs.** Candidate rows, a batch proposal, a draft,
a comparison, criteria evidence, "expand pool" rows, a save-to-list card and
link rows. **Nothing she proposes happens without a click**, and everything
that decides something has an Undo.

**She writes; she never sends.** A draft goes into each recipient's thread in
the Messages dock and waits for the recruiter to press Send.

**One thread per product, across pages.** A divider marks each move, and a
reply's micro-label appears only when it is about something other than the page
it was asked on. Questions also arrive from the list — a card's ⋯ menu, or the
selection bar's Ask / Compare in Athena (see **Compositions → Response
manager**).

No Figma frame yet: these shapes are mirrored in code first.
        `,
      },
    },
  },
} satisfies StoryMeta

export default meta

type Story = StoryObj<typeof meta>

/** A 384px column, the pane's width, for a card on its own. */
const column: Decorator = (Story) => (
  <div className="w-96 max-w-full">
    <Story />
  </div>
)

export const EmptyPane: Story = {
  name: "Empty pane — the page's questions",
  render: () => (
    <Pane
      label="Principal Engineer, Platform Infrastructure"
      detail="103 to review"
      questions={JOB_QUESTIONS}
      started={false}
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Ask Athena</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          She works from what is on this page, so these need no setting up.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {JOB_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            className="rounded-xl border border-border px-3 py-2.5 text-left text-sm leading-relaxed transition-colors hover:bg-muted"
          >
            {question}
          </button>
        ))}
      </div>
    </Pane>
  ),
}

/**
 * A question on a posting, a move to the Dashboard, and a question there whose
 * answer is about Messages — so it carries a label the posting's answer did not
 * need.
 */
export const ThreadAcrossPages: Story = {
  name: "A thread across pages",
  render: () => (
    <Pane
      label="Dashboard"
      detail="6 live postings"
      questions={[
        "Which postings need a decision from me?",
        "Which threads are waiting on me?",
      ]}
    >
      <You>Who are the strongest five still to review?</You>
      <Athena>
        <p>
          The 5 best matches of the 103 still to review. They rank on how many
          of the posting&apos;s 4 skills they have, the same order as Best
          match.
        </p>
        <CandidateRows
          people={PEOPLE.slice(0, 2)}
          decided={{ p1: "Shortlisted" }}
        />
      </Athena>
      <MovedTo label="Dashboard" />
      <You>Which threads are waiting on me?</You>
      <Athena about="Messages">
        <p>
          2 threads end with the candidate&apos;s message, so the next move is
          yours.
        </p>
        <Links
          items={[
            {
              label: "Ananya Krishnan",
              detail:
                "Principal Engineer, Platform Infrastructure · last message 11:42",
            },
            {
              label: "Rohit Mehta",
              detail: "Engineering Manager — Payments · last message 10:08",
            },
          ]}
        />
      </Athena>
      <Thinking />
    </Pane>
  ),
}

export const CandidateRowsStory: Story = {
  name: "Candidate rows",
  decorators: [column],
  render: () => (
    <CandidateRows people={PEOPLE} decided={{ p2: "Shortlisted" }} />
  ),
}

export const ProposalStory: Story = {
  name: "Batch proposal — before and after Apply",
  decorators: [column],
  render: () => (
    <div className="flex flex-col gap-4">
      <Proposal />
      <Proposal applied />
    </div>
  ),
}

export const DraftStory: Story = {
  name: "Draft — one person, a shortlist, and placed",
  decorators: [column],
  render: () => (
    <div className="flex flex-col gap-4">
      <Draft />
      <Draft many />
      <Draft many placed />
    </div>
  ),
}

export const CompareStory: Story = {
  name: "Comparison — two and three people",
  decorators: [column],
  render: () => (
    <div className="flex flex-col gap-4">
      <Compare people={PEOPLE.slice(0, 2)} />
      <Compare />
    </div>
  ),
}

export const EvidenceStory: Story = {
  name: "Criteria evidence",
  decorators: [column],
  render: () => <Evidence />,
}

export const ExpandStory: Story = {
  name: "Expand pool — before and after Apply",
  decorators: [column],
  render: () => (
    <div className="flex flex-col gap-4">
      <Expand />
      <Expand applied />
    </div>
  ),
}

export const SaveStory: Story = {
  name: "Save to list — before and after",
  decorators: [column],
  render: () => (
    <div className="flex flex-col gap-4">
      <Save />
      <Save saved />
    </div>
  ),
}

export const LinksStory: Story = {
  name: "Link rows",
  decorators: [column],
  render: () => (
    <Links
      items={[
        {
          label: "Principal Engineer, Platform Infrastructure",
          detail: "32 new · 103 to review",
        },
        {
          label: "Reschedule Kavya Chopra",
          detail:
            "17 Sep, 10:00 – 10:30 AM · HR Round · Head of Talent Acquisition",
        },
        {
          label: "Vikram Iyer",
          detail: "Only says where to look — no arrow",
          goes: false,
        },
      ]}
    />
  ),
}
