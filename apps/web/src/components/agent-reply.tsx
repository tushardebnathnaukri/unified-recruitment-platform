import type * as React from "react"
import { Link } from "react-router"
import {
  ArrowRightIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  SearchIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import type { Block } from "@/lib/agent"

/**
 * How the Agent page draws an answer.
 *
 * A REPLY IS BLOCKS, NOT A PARAGRAPH. Everything the agent can say is a real
 * object in this app — a posting, a person, a search, a number — so the answer
 * is drawn as the thing rather than described in a sentence with the thing's
 * name in it. A row that names a candidate goes to that candidate; a figure is
 * the figure the page it links to prints.
 *
 * NOTHING HERE ACTS. Every block either says something or goes somewhere: no
 * block decides on a candidate, sends a message or books a slot. That is not
 * a limitation of the prototype, it is the position — the agent's job on this
 * screen is to get the recruiter to the right place holding the right facts,
 * and the decision belongs on the screen that shows the evidence for it. The
 * draft block is the closest it comes, and a draft is explicitly not a send.
 */
export function AgentBlocks({
  blocks,
  onAsk,
  live = true,
}: {
  blocks: Block[]
  /** For the blocks that offer a question back. */
  onAsk: (prompt: string) => void
  /**
   * Whether this is the newest turn. A question further up the transcript
   * has been answered, and its options would now answer whatever is being
   * asked at the bottom — so only the newest one takes a tap.
   */
  live?: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) => (
        <AgentBlock key={index} block={block} onAsk={onAsk} live={live} />
      ))}
    </div>
  )
}

function AgentBlock({
  block,
  onAsk,
  live,
}: {
  block: Block
  onAsk: (prompt: string) => void
  live: boolean
}) {
  if (block.kind === "text") {
    return <p className="text-sm leading-relaxed">{block.text}</p>
  }

  if (block.kind === "figures") {
    return (
      <div className="flex flex-wrap gap-2">
        {block.items.map((item) => (
          <div
            key={item.label}
            className="min-w-40 flex-1 rounded-xl border bg-background px-3 py-2.5"
          >
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums">
              {item.value}
            </p>
            {item.detail ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.detail}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    )
  }

  if (block.kind === "candidates") {
    return (
      <div className="flex flex-col gap-1.5">
        {block.people.map(({ person, reason, href }) => (
          <Link
            key={person.id}
            to={href}
            className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 transition-colors hover:bg-muted"
          >
            <Avatar>
              {person.photo ? <AvatarImage src={person.photo} alt="" /> : null}
              <AvatarFallback>{initialsOf(person.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{person.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {person.title} at {person.company}
              </p>
              <p className="mt-0.5 truncate text-xs text-primary">{reason}</p>
            </div>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    )
  }

  // Questions offered back. Buttons rather than rows, because a row with a
  // chevron promises a page and these go nowhere — they ask themselves.
  if (block.kind === "prompts") {
    return (
      <div className="flex flex-wrap gap-2">
        {block.prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onAsk(prompt)}
            className="rounded-4xl border bg-background px-3 py-1.5 text-xs font-medium transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {prompt}
          </button>
        ))}
      </div>
    )
  }

  // An answered question draws nothing: the recruiter's reply is the next
  // bubble down, and it says what was chosen better than a greyed-out row of
  // the options that were not.
  if (block.kind === "question") {
    if (!live) return null
    return (
      <div className="flex flex-col gap-2.5">
        <p className="text-xs text-muted-foreground">{block.hint}</p>
        {block.options.length || block.skip ? (
          <div className="flex flex-wrap gap-2">
            {block.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onAsk(option)}
                className="rounded-4xl border bg-background px-3 py-1.5 text-xs font-medium transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {option}
              </button>
            ))}
            {block.skip ? (
              <button
                type="button"
                onClick={() => onAsk(block.skip!)}
                className="rounded-4xl px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {block.skip}
              </button>
            ) : null}
          </div>
        ) : null}
        {/* The other door, on every posting question rather than only the
            first: the form opens on whatever has been said so far, so a
            recruiter who tires of the chat three questions in loses nothing. */}
        {block.form ? (
          <Button
            nativeButton={false}
            variant="link"
            size="sm"
            className="h-auto self-start px-0 text-xs"
            render={<Link to={block.form.to} />}
          >
            <ClipboardListIcon data-icon="inline-start" />
            {block.form.label}
          </Button>
        ) : null}
      </div>
    )
  }

  // A card of open questions is not drawn in the transcript at all: it takes
  // the chat box's place at the bottom of the screen (`AgentQuestionnaire`,
  // docked by the page), and the transcript keeps only what the agent said.
  if (block.kind === "questionnaire") return null

  /**
   * The finished posting, in two halves.
   *
   * THE POSTING IS WHAT CANDIDATES READ; THE BRIEF IS WHAT THE RECRUITER
   * SEARCHES WITH. They are drawn as two sections of one card, not two cards,
   * because they came out of one conversation and are about one hire — but
   * the brief is labelled private, because the first thing anybody asks of a
   * "rule out" line is whether a candidate will ever see it.
   *
   * Two ways forward, one per half: post it (the form, because a posting is
   * reviewed before it goes up) or go and find people now with the brief
   * already set as filters.
   */
  if (block.kind === "posting") {
    return (
      <div className="overflow-hidden rounded-xl border bg-background">
        <Section title="The posting">
          <Rows rows={block.rows} />
          <p className="mt-3 mb-1.5 text-xs font-medium text-muted-foreground">
            Description
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {block.description}
          </p>
        </Section>

        {block.brief.length ? (
          <Section
            title="Who we're looking for"
            className="border-t bg-muted/30"
          >
            <Rows rows={block.brief} />
            {block.briefNote ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {block.briefNote}
              </p>
            ) : null}
          </Section>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2.5">
          <Button
            nativeButton={false}
            size="sm"
            render={<Link to={block.to} />}
          >
            Review and post
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button
            nativeButton={false}
            size="sm"
            variant="outline"
            render={<Link to={block.search} />}
          >
            <SearchIcon data-icon="inline-start" />
            Find people now
          </Button>
        </div>
      </div>
    )
  }

  if (block.kind === "links") {
    return (
      <div className="flex flex-col gap-1.5">
        {block.items.map((item) => (
          <Row key={item.label} {...item} />
        ))}
      </div>
    )
  }

  // A draft. Held in a page-like card rather than a bubble, because it is a
  // document being shown for approval and not something the agent is saying.
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          Draft for
        </span>
        <span className="min-w-0 truncate text-xs font-medium">{block.to}</span>
      </div>
      <p className="px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap">
        {block.body}
      </p>
      {block.action ? (
        <div className="border-t px-3 py-2">
          {/* `nativeButton={false}` because it renders as an anchor — Base UI
              logs an error otherwise, the same note as on the Dashboard. */}
          <Button
            nativeButton={false}
            size="sm"
            variant="outline"
            render={<Link to={block.action.to} />}
          >
            {block.action.label}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * A row that goes somewhere — or, with an empty `to`, one that does not.
 *
 * The refusal lists the questions it CAN take, and those are prompts rather
 * than places; drawing them as links would promise a page behind each one.
 */
function Row({
  label,
  detail,
  to,
}: {
  label: string
  detail: string
  to: string
}) {
  const inside = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        {detail ? (
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </div>
      {to ? (
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      ) : null}
    </>
  )

  const className = cn(
    "flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-left",
    to && "transition-colors hover:bg-muted"
  )

  return to ? (
    <Link to={to} className={className}>
      {inside}
    </Link>
  ) : (
    <div className={className}>{inside}</div>
  )
}

function Section({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("px-3 py-3", className)}>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}

function Rows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
}
