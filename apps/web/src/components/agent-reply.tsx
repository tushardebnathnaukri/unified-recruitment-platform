import * as React from "react"
import { Link, useLocation } from "react-router"
import {
  ArrowRightIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  SearchIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  BookmarkIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/toast"
import { cn } from "@workspace/ui/lib/utils"

import { CriteriaEvidence } from "@/components/criteria-evidence"
import type { Block } from "@/lib/agent"
import { encodeAnswers } from "@/lib/job-refine"
import type { SearchPerson } from "@/lib/search-intake"
import { withChat } from "@/lib/job-intake"

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
  const toForm = useToForm()
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
        {block.prompts.map((prompt, index) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onAsk(prompt)}
            className="rounded-4xl border bg-background px-3 py-1.5 text-xs font-medium transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {block.labels?.[index] ?? prompt}
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
            render={<Link to={toForm(block.form.to)} />}
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
          <p className="mt-4 mb-2 text-xs font-medium text-muted-foreground">
            Description
          </p>
          <Description text={block.description} />
        </Section>

        {block.brief.length || block.screening.length ? (
          <Section
            // With the brief switched off on /settings, what is left of the
            // step is the screening questions, and it is called that.
            title={
              block.brief.length ? "Selection criteria" : "Screening questions"
            }
            className="border-t bg-muted/30"
          >
            {block.brief.length ? <Rows rows={block.brief} /> : null}
            {block.screening.length ? (
              <div className={cn(block.brief.length && "mt-3")}>
                {/* Said by the section title when there is no brief. */}
                {block.brief.length ? (
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Screening questions
                  </p>
                ) : null}
                <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
                  {block.screening.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ol>
              </div>
            ) : null}
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
            render={<Link to={toForm(block.to)} />}
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

  if (block.kind === "calibrate") {
    return <CalibrateCard people={block.people} live={live} onAsk={onAsk} />
  }

  if (block.kind === "search") {
    return (
      <div className="overflow-hidden rounded-xl border bg-background">
        <Section title="The search">
          <p className="text-2xl font-semibold tabular-nums">
            {block.matching.toLocaleString("en-IN")}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
              of {block.total.toLocaleString("en-IN")} people
              {block.role ? ` for ${block.role}` : ""}
            </span>
          </p>
          <div className="mt-3">
            <Rows rows={block.rows} />
          </div>
        </Section>
        {block.widenings.length ? (
          <Section title="Ways to widen it" className="border-t">
            <ul className="flex flex-col gap-1">
              {block.widenings.map((widening) => (
                <li key={widening.label}>
                  <Link
                    to={widening.href}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0 truncate">{widening.label}</span>
                    <span className="shrink-0 text-xs font-medium text-primary tabular-nums">
                      +{widening.gain.toLocaleString("en-IN")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Each opens the search with that one filter loosened. The gain is
              counted, not guessed.
            </p>
          </Section>
        ) : null}
        {block.criteria.length ? (
          <Section title="Ranked by" className="border-t bg-muted/30">
            <ol className="flex flex-wrap gap-1.5">
              {block.criteria.map((criterion, index) => (
                <li
                  key={criterion}
                  className="inline-flex items-center gap-1.5 rounded-4xl bg-background px-2.5 py-1 text-xs font-medium ring-1 ring-foreground/10"
                >
                  <span className="text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  {criterion}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              The first counts most.{" "}
              {block.calibrated
                ? "Calibration is what set the order."
                : "The order is what the requirement implied."}
            </p>
          </Section>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2.5">
          <Button
            nativeButton={false}
            size="sm"
            render={<Link to={block.href} />}
          >
            <SearchIcon data-icon="inline-start" />
            Open Search Resume
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              toast.add({
                title: "Saved to your recent searches",
                description:
                  "Saving isn't wired up in this prototype — it would sit under Recent searches on the Dashboard.",
              })
            }
          >
            <BookmarkIcon data-icon="inline-start" />
            Save this search
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
 * Links into the form carry this chat's own address, so the form can offer
 * the way back to exactly this conversation (`withChat`).
 */
function useToForm() {
  const { pathname, search } = useLocation()
  return (to: string) => withChat(to, pathname + search)
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
  const toForm = useToForm()
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
    <Link to={toForm(to)} className={className}>
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
      <p className="mb-2 text-sm leading-5 font-semibold">{title}</p>
      {children}
    </div>
  )
}

/** The rail's own rows: a small muted label beside a medium value. */
function Rows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-[minmax(5.5rem,auto)_1fr] gap-x-3 gap-y-1.5 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="py-0.5 text-xs leading-5 text-muted-foreground">
            {row.label}
          </dt>
          <dd className="min-w-0 py-0.5 leading-5 font-medium break-words">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * The drafted description, set as what it is rather than pre-wrapped text.
 * `describePosting` writes blocks separated by a blank line, each a heading
 * on its first line — "About the role", "What you will need", "Pay" — over
 * a paragraph or "• " bullets. Set as one `<p>` the headings sat at the
 * body's size and weight and the whole thing read as a wall; here a heading
 * is a heading, a bullet a list item, and the body is the muted running
 * text the rest of the card uses.
 */
function Description({ text }: { text: string }) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").filter((line) => line.trim()))
    .filter((lines) => lines.length)
  return (
    <div className="flex flex-col gap-3">
      {blocks.map(([heading, ...lines], index) => {
        const bullets = lines.filter((line) => line.startsWith("• "))
        const paragraphs = lines.filter((line) => !line.startsWith("• "))
        return (
          <div key={index} className="flex flex-col gap-1">
            <p className="text-sm font-semibold">{heading}</p>
            {paragraphs.map((line) => (
              <p
                key={line}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                {line}
              </p>
            ))}
            {bullets.length ? (
              <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground/60">
                {bullets.map((line) => (
                  <li key={line}>{line.slice(2)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
}

/**
 * Calibration: the three the search ranks first, a verdict on each, and one
 * turn when the recruiter is done. THE VERDICT LINES ARE THE POINT, not the
 * person — they are what turn "do you like them" into "does this criterion
 * matter", which is the only thing a recruiter can usefully calibrate. Only
 * the newest card takes verdicts; an old one shows the people without the
 * buttons, since its answer is the next bubble.
 */
function CalibrateCard({
  people,
  live,
  onAsk,
}: {
  people: SearchPerson[]
  live: boolean
  onAsk: (prompt: string) => void
}) {
  const [judged, setJudged] = React.useState<
    Record<string, "kept" | "dropped">
  >({})
  const done = Object.keys(judged).length
  const send = () =>
    onAsk(
      encodeAnswers({
        calibrate: Object.entries(judged)
          .map(([id, verdict]) => `${id}=${verdict}`)
          .join("\n"),
      })
    )
  return (
    <div className="flex flex-col gap-2">
      {people.map((person) => {
        const verdict = judged[person.id]
        return (
          <div
            key={person.id}
            className={cn(
              "rounded-xl border bg-background p-3 transition-opacity",
              verdict === "dropped" && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{person.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {person.title
                    ? `${person.title}${person.company ? ` at ${person.company}` : ""}`
                    : person.location}
                  {" · "}
                  {person.years} yrs
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 tabular-nums">
                {person.score}%
              </Badge>
            </div>
            <CriteriaEvidence verdicts={person.verdicts} />
            {live ? (
              <div className="mt-3 flex items-center gap-1.5">
                <Button
                  size="xs"
                  variant={verdict === "kept" ? "default" : "outline"}
                  onClick={() => setJudged({ ...judged, [person.id]: "kept" })}
                >
                  <ThumbsUpIcon data-icon="inline-start" />
                  Looks right
                </Button>
                <Button
                  size="xs"
                  variant={verdict === "dropped" ? "default" : "outline"}
                  onClick={() =>
                    setJudged({ ...judged, [person.id]: "dropped" })
                  }
                >
                  <ThumbsDownIcon data-icon="inline-start" />
                  Not a fit
                </Button>
              </div>
            ) : null}
          </div>
        )
      })}
      {live ? (
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" disabled={!done} onClick={send}>
            {done ? `Done — ${done} of ${people.length}` : "Done"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAsk(encodeAnswers({ calibrate: null }))}
          >
            Skip this
          </Button>
        </div>
      ) : null}
    </div>
  )
}
