import * as React from "react"
import { Link } from "react-router"
import {
  ArrowRightIcon,
  BookmarkIcon,
  CheckIcon,
  ListPlusIcon,
  MessageCircleIcon,
  MinusIcon,
  ThumbsUpIcon,
  Undo2Icon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Textarea } from "@workspace/ui/components/textarea"
import { useDecisions } from "@/components/decisions-provider"
import { useMessages } from "@/components/messages-provider"
import { NewListDialog } from "@/components/save-to-list"
import { useSavedLists } from "@/components/saved-lists-provider"
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
    case "compare":
      return <CompareBlock block={block} />
    case "evidence":
      return <EvidenceBlock verdicts={block.verdicts} />
    case "expand":
      return <ExpandBlock items={block.items} />
    case "save":
      return <SaveBlock block={block} />
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
                <PersonName name={person.name} href={href} />
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
 * Two or three people as columns, attribute by attribute.
 *
 * A LABEL OVER EACH ROW, NOT A LABEL COLUMN. At 384px a column of labels costs
 * a third of the width three people need; a label spanning the row above their
 * values costs a line instead. The value that leads on a fact with an agreed
 * direction — most skills asked for, soonest start — is set in the foreground
 * colour and the rest are muted, so the comparison reads without counting.
 *
 * The decision row is live, like the candidate rows: shortlist one here and
 * the list behind moves.
 */
function CompareBlock({
  block,
}: {
  block: Extract<Block, { kind: "compare" }>
}) {
  const { decided, decide } = useDecisions()
  const people = block.people.map(({ person, href }) => ({
    person: decided(person),
    href,
    matched: person.skills.filter((skill) =>
      block.requiredSkills.includes(skill)
    ),
  }))
  const columns = {
    gridTemplateColumns: `repeat(${people.length}, minmax(0, 1fr))`,
  }

  const mostSkills = Math.max(...people.map((p) => p.matched.length))
  const soonest = Math.min(...people.map((p) => p.person.noticeDays))
  const lead = (leads: boolean) =>
    leads && people.length > 1 ? "font-medium text-foreground" : ""

  const row = (
    label: string,
    cell: (entry: (typeof people)[number]) => React.ReactNode
  ) => (
    <div className="flex flex-col gap-1 border-t px-3 py-2">
      <span className="text-[10px] font-medium tracking-[0.07em] uppercase">
        {label}
      </span>
      <div className="grid gap-2 text-xs" style={columns}>
        {people.map((entry) => (
          <div key={entry.person.id} className="min-w-0 break-words">
            {cell(entry)}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="grid gap-2 p-3" style={columns}>
        {people.map(({ person, href }) => (
          <div
            key={person.id}
            className="flex min-w-0 flex-col items-start gap-1.5"
          >
            <PersonAvatar person={person} />
            <PersonName name={person.name} href={href} />
            <span className="line-clamp-2 text-xs">
              {person.title} · {person.company}
            </span>
          </div>
        ))}
      </div>

      {block.requiredSkills.length > 0 &&
        row("Skills asked for", ({ matched }) => (
          <span className={lead(matched.length === mostSkills)}>
            {matched.length} of {block.requiredSkills.length}
            {matched.length > 0 && (
              <span className="block font-normal text-muted-foreground">
                {matched.join(", ")}
              </span>
            )}
          </span>
        ))}
      {row("Experience", ({ person }) => `${person.experienceYears} yrs`)}
      {row("Current pay", ({ person }) => `₹${person.currentCtcLakh}L`)}
      {row("Notice", ({ person }) => (
        <span className={lead(person.noticeDays === soonest)}>
          {person.noticeDays === 0
            ? "Can join now"
            : `${person.noticeDays} days`}
        </span>
      ))}
      {row("Location", ({ person }) => person.location)}

      <div className="grid gap-2 border-t p-3" style={columns}>
        {people.map(({ person }) =>
          person.status === "undecided" ? (
            <Button
              key={person.id}
              size="xs"
              className="min-w-0"
              onClick={() => decide(person.id, "shortlisted")}
            >
              Shortlist
            </Button>
          ) : (
            <Badge key={person.id} variant="secondary" className="max-w-full">
              {DECISION_LABELS[person.status]}
            </Badge>
          )
        )}
      </div>
    </div>
  )
}

/**
 * A person's verdict on each criterion — the result card's own evidence lines,
 * stacked for the pane's width: chip over sentence rather than beside it.
 */
function EvidenceBlock({
  verdicts,
}: {
  verdicts: Extract<Block, { kind: "evidence" }>["verdicts"]
}) {
  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
      {verdicts.map((verdict) => (
        <li
          key={verdict.criterion}
          className="flex flex-col items-start gap-1.5 p-3"
        >
          <Badge
            variant={verdict.met ? "success" : "outline"}
            className="max-w-full font-normal"
            title={verdict.criterion}
          >
            {verdict.met ? (
              <ThumbsUpIcon data-icon="inline-start" />
            ) : (
              <MinusIcon data-icon="inline-start" />
            )}
            <span className="sr-only">
              {verdict.met ? "Meets" : "Does not meet"}:{" "}
            </span>
            <span className="truncate">{verdict.label}</span>
          </Badge>
          <span className={verdict.met ? "text-xs text-foreground" : "text-xs"}>
            {verdict.evidence}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * "Expand pool", answered. Each row loosens one filter on the page behind the
 * pane, and the number is who it adds. Applying one changes the others' counts
 * — they were each counted against the search as it was — so once one is
 * applied the rest say so rather than offering numbers that are now stale.
 */
function ExpandBlock({
  items,
}: {
  items: Extract<Block, { kind: "expand" }>["items"]
}) {
  const [applied, setApplied] = React.useState<string | null>(null)

  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 p-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm text-foreground">{item.label}</span>
            <span className="text-xs text-success tabular-nums">
              +{item.gain} {item.gain === 1 ? "person" : "people"}
            </span>
          </div>
          {applied === item.label ? (
            <span className="flex items-center gap-1 text-xs text-foreground">
              <CheckIcon className="size-3.5 text-primary" />
              Applied
            </span>
          ) : applied ? (
            <span className="text-xs">Ask again for new counts</span>
          ) : (
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                item.apply()
                setApplied(item.label)
              }}
            >
              Apply
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * People to file into a list. ADDS, NEVER REMOVES, like the selection bar's
 * Save to list: these five are already in whatever lists they are in, and
 * picking one more should not quietly take them out of the rest.
 */
function SaveBlock({ block }: { block: Extract<Block, { kind: "save" }> }) {
  const { lists, listsOf, setLists, createList } = useSavedLists()
  const [naming, setNaming] = React.useState(false)
  const [savedTo, setSavedTo] = React.useState<string | null>(null)

  const file = (listId: string) => {
    for (const person of block.people) {
      const current = listsOf(person.id)
      if (!current.includes(listId))
        setLists(person, [...current, listId], block.from)
    }
    setSavedTo(listId)
  }
  const savedName = lists.find((list) => list.id === savedTo)?.name

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3">
      <div className="flex -space-x-2">
        {block.people.map((person) => (
          <PersonAvatar key={person.id} person={person} ring />
        ))}
      </div>
      <p className="text-xs leading-relaxed">{namesOf(block.people)}</p>

      {savedName ? (
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CheckIcon className="size-4 text-primary" />
          <span className="min-w-0 truncate">
            Added {block.people.length} to {savedName}
          </span>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="sm" className="self-start" />}
          >
            <BookmarkIcon data-icon="inline-start" />
            Save {block.people.length} to a list
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {/* The label inside the group: Base UI's GroupLabel throws
                outside one (see CLAUDE.md). */}
            <DropdownMenuGroup>
              <DropdownMenuLabel>Add them to</DropdownMenuLabel>
              {lists.map((list) => (
                <DropdownMenuItem key={list.id} onClick={() => file(list.id)}>
                  <span className="truncate">{list.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setNaming(true)}>
              <ListPlusIcon />
              New list…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <NewListDialog
        open={naming}
        onOpenChange={setNaming}
        description={`Name it by what it is for. The ${block.people.length} go straight in.`}
        onCreate={(name) => file(createList(name))}
      />
    </div>
  )
}

/** A person's name, linked to their page when they have one. */
function PersonName({ name, href }: { name: string; href?: string }) {
  const className =
    "max-w-full truncate text-sm font-medium text-foreground underline-offset-4"
  return href ? (
    <Link to={href} className={`${className} hover:underline`}>
      {name}
    </Link>
  ) : (
    <span className={className}>{name}</span>
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
      {items.map((item, index) => {
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
            {(item.to || item.threadId || item.open) && (
              <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
            )}
          </>
        )

        return (
          // Names are not unique — two different people can both be Aman
          // Verma — so the position keeps the key unique.
          <li key={`${index}-${item.label}`}>
            {item.to ? (
              <Link
                to={item.to}
                className="flex items-center gap-2 p-3 transition-colors hover:bg-muted"
              >
                {body}
              </Link>
            ) : item.threadId || item.open ? (
              <button
                type="button"
                onClick={() =>
                  item.open ? item.open() : openThread(item.threadId!)
                }
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
