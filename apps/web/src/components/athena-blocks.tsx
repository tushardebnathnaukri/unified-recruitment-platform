import * as React from "react"
import { Link } from "react-router"
import {
  ArrowRightIcon,
  CheckIcon,
  MessageCircleIcon,
  Undo2Icon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { useDecisions } from "@/components/decisions-provider"
import { useMessages } from "@/components/messages-provider"
import type { Applicant } from "@/lib/applicants"
import {
  DECISION_LABELS,
  FIRST_NAME,
  draftFor,
  type Block,
  type DraftRecipient,
} from "@/lib/athena"

/**
 * One block of an Athena reply. The shapes are the design question this pane
 * exists to answer, so each is its own small component rather than one
 * renderer with a branch per field.
 *
 * DECISIONS GO THROUGH `DecisionsProvider`, the same overlay the response
 * manager reads. That is what makes an answer in the pane and the list beside
 * it one piece of state: shortlist here and the tab count behind moves.
 */
export function AthenaBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "text":
      return <p>{block.text}</p>
    case "candidates":
      return <CandidatesBlock people={block.people} />
    case "proposal":
      return <ProposalBlock block={block} />
    case "links":
      return <LinksBlock items={block.items} />
    case "draft":
      return <DraftBlock block={block} />
  }
}

/**
 * People, as rows narrow enough for a 384px column — not the response
 * manager's card, which carries pay, notice and a skills row this pane has no
 * width for. What earns the room is the reason they are here.
 *
 * A row's status is read live, not from the answer: the answer is a snapshot of
 * who was undecided when asked, and a decision taken since — here or on the
 * list — is shown rather than offered again.
 */
function CandidatesBlock({
  people,
}: {
  people: Extract<Block, { kind: "candidates" }>["people"]
}) {
  const { decided, decide } = useDecisions()

  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
      {people.map(({ person, reason, href }) => {
        const status = decided(person).status

        return (
          <li key={person.id} className="flex flex-col gap-2 p-3">
            <div className="flex items-start gap-2.5">
              <PersonAvatar person={person} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link
                  to={href}
                  className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {person.name}
                </Link>
                <span className="truncate text-xs text-muted-foreground">
                  {person.title} · {person.company}
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed">{reason}</p>

            {status === "undecided" ? (
              <div className="flex gap-1.5">
                <Button
                  size="xs"
                  onClick={() => decide(person.id, "shortlisted")}
                >
                  Shortlist
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => decide(person.id, "maybe")}
                >
                  Maybe
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary">{DECISION_LABELS[status]}</Badge>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => decide(person.id, "undecided")}
                >
                  <Undo2Icon data-icon="inline-start" />
                  Undo
                </Button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * A batch decision Athena proposes and the recruiter takes. NOTHING HAPPENS
 * UNTIL THE BUTTON. A copilot that shortlists six people as a side effect of
 * being asked about them is one nobody asks twice.
 *
 * Stateless on purpose: whether it has been applied is read off the decisions,
 * so closing the pane — which unmounts the thread — cannot forget it. Everyone
 * proposed was undecided when asked, so Undo is putting them back there.
 */
function ProposalBlock({
  block,
}: {
  block: Extract<Block, { kind: "proposal" }>
}) {
  const { decided, decide } = useDecisions()
  const label = DECISION_LABELS[block.to]

  const pending = block.people.filter(
    (person) => decided(person).status === "undecided"
  )
  const moved = block.people.filter(
    (person) => decided(person).status === block.to
  )

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3">
      <div className="flex -space-x-2">
        {block.people.slice(0, 6).map((person) => (
          <PersonAvatar key={person.id} person={person} ring />
        ))}
      </div>

      <p className="text-xs leading-relaxed">{namesOf(block.people)}</p>

      {pending.length > 0 ? (
        <Button
          size="sm"
          // Turning people down reads as the consequential thing it is.
          variant={block.to === "rejected" ? "destructive" : "default"}
          className="self-start"
          onClick={() =>
            pending.forEach((person) => decide(person.id, block.to))
          }
        >
          {verbFor(label)} {pending.length}
        </Button>
      ) : (
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CheckIcon className="size-4 text-primary" />
          <span className="flex-1">
            {label} {moved.length}
          </span>
          {moved.length > 0 && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() =>
                moved.forEach((person) => decide(person.id, "undecided"))
              }
            >
              <Undo2Icon data-icon="inline-start" />
              Undo
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function LinksBlock({
  items,
}: {
  items: Extract<Block, { kind: "links" }>["items"]
}) {
  const { openThread } = useMessages()

  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
      {items.map((item) => {
        const body = (
          <>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-foreground">
                {item.label}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {item.detail}
              </span>
            </div>
            {(item.to || item.threadId) && (
              <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
            )}
          </>
        )

        return (
          <li key={item.label}>
            {item.to ? (
              <Link
                to={item.to}
                className="flex items-center gap-2 p-3 transition-colors hover:bg-muted"
              >
                {body}
              </Link>
            ) : item.threadId ? (
              <button
                type="button"
                onClick={() => openThread(item.threadId!)}
                className="flex w-full items-center gap-2 p-3 text-left transition-colors hover:bg-muted"
              >
                {body}
              </button>
            ) : (
              <div className="flex items-center gap-2 p-3">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * A message for the recruiter to send. EDITABLE HERE, SENT ONLY IN MESSAGES.
 * The button puts the text into each recipient's composer and opens the dock;
 * the recruiter reads it there and presses Send. Writing is Athena's job,
 * sending is not — see `MessagesProvider`.
 *
 * With several recipients the body keeps `{first name}`, filled in per thread,
 * and the card shows the first recipient's version beneath so the token is
 * never the only thing you proofread.
 */
function DraftBlock({ block }: { block: Extract<Block, { kind: "draft" }> }) {
  const { fillDrafts, drafts, threads } = useMessages()
  const [body, setBody] = React.useState(block.body)
  const [placed, setPlaced] = React.useState(false)
  const many = block.recipients.length > 1
  const first = block.recipients[0]

  const place = () => {
    fillDrafts(block.recipients.map((to) => ({ to, body: draftFor(body, to) })))
    setPlaced(true)
  }

  // Still waiting in a composer, unsent — the count the done state reports.
  const waiting = block.recipients.filter((to) => drafts[to.id]?.trim()).length
  const sent = block.recipients.filter((to) =>
    threads[to.id]?.some((message) => message.author === "you")
  ).length

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {block.recipients.slice(0, 5).map((to) => (
            <RecipientAvatar key={to.id} recipient={to} ring={many} />
          ))}
        </div>
        <p className="min-w-0 truncate text-xs text-foreground">
          To {namesOf(block.recipients)}
        </p>
      </div>

      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        aria-label="Draft message"
        className="min-h-24 text-sm text-foreground"
      />

      {many && body.includes(FIRST_NAME) && (
        <p className="text-xs leading-relaxed">
          <span className="font-medium text-foreground">
            As {first.name.split(" ")[0]} sees it:{" "}
          </span>
          {draftFor(body, first)}
        </p>
      )}

      {placed ? (
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CheckIcon className="size-4 text-primary" />
          <span className="flex-1">
            {waiting > 0
              ? `Waiting in ${waiting === 1 ? "their thread" : `${waiting} threads`} to be sent`
              : sent > 0
                ? `Sent to ${sent === 1 ? block.recipients[0].name.split(" ")[0] : sent}`
                : "Cleared in Messages"}
          </span>
          <Button size="xs" variant="ghost" onClick={place}>
            Put back
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          className="self-start"
          disabled={body.trim() === ""}
          onClick={place}
        >
          <MessageCircleIcon data-icon="inline-start" />
          {many
            ? `Put in ${block.recipients.length} threads`
            : "Open in Messages"}
        </Button>
      )}
    </div>
  )
}

function RecipientAvatar({
  recipient,
  ring,
}: {
  recipient: DraftRecipient
  ring: boolean
}) {
  return (
    <Avatar size="sm" className={ring ? "ring-2 ring-card" : undefined}>
      {recipient.photo && <AvatarImage src={recipient.photo} alt="" />}
      <AvatarFallback>{initialsOf(recipient.name)}</AvatarFallback>
    </Avatar>
  )
}

function PersonAvatar({
  person,
  ring = false,
}: {
  person: Applicant
  /** Cut out of its neighbours, for an overlapping stack. */
  ring?: boolean
}) {
  return (
    <Avatar className={ring ? "ring-2 ring-card" : undefined}>
      {person.photo && <AvatarImage src={person.photo} alt="" />}
      <AvatarFallback>{initialsOf(person.name)}</AvatarFallback>
    </Avatar>
  )
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
}

function namesOf(people: { name: string }[]) {
  const shown = people.slice(0, 4).map((person) => person.name)
  const rest = people.length - shown.length
  return rest > 0 ? `${shown.join(", ")} and ${rest} more` : shown.join(", ")
}

/** "Shortlisted" → "Shortlist", for the button that does it. */
function verbFor(label: string) {
  return label === "Shortlisted" ? "Shortlist" : `Move to ${label} ·`
}
