import * as React from "react"
import {
  ArrowLeftIcon,
  PhoneIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { useAthena } from "@/components/athena-provider"
import { useMessages } from "@/components/messages-provider"
import { photoOf, type Conversation, type Message } from "@/lib/messages"

function lastOf(messages: Message[] | undefined) {
  return messages?.[messages.length - 1]
}

function PanelHeader({
  children,
  actions,
  onClose,
}: {
  children: React.ReactNode
  /** Sits in the right-hand control cluster, immediately before the close X. */
  actions?: React.ReactNode
  /** The dock had one; a page has nowhere to close to, so it goes unset. */
  onClose?: () => void
}) {
  return (
    // The one tinted band in the panel. WhatsApp's header is a solid accent;
    // at this size that much saturation fights the bubbles, so this is a flat
    // `bg-muted` — opaque rather than the earlier `/60`, which barely
    // registered against the card and left the header and list looking like
    // one undifferentiated block.
    <header className="flex shrink-0 items-center gap-3 border-b border-border bg-muted px-4 py-3.5">
      {children}

      {/* One control cluster on the right rather than a lone close button, so
          the header's actions read as a group and the title keeps the left. */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {actions}
        {onClose && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close messages"
          >
            <XIcon />
          </Button>
        )}
      </div>
    </header>
  )
}

/**
 * The AI action, sitting beside the close button. It opens Athena.
 *
 * A BUTTON, NOT THE MARK IT REPLACED. It was a decorative avatar next to the
 * "Messages" title, which is a worse use of the header's most valuable corner:
 * the assistant is something you *do*, and the top-right is where this panel's
 * controls live.
 *
 * ONE COPILOT. This used to open an assistant thread of the dock's own, with
 * canned replies and a brand-named persona, while Athena sat in the shell with
 * none. It is the same question asked from a different corner, so it goes to
 * the same place — and Athena's pane moves the dock aside rather than covering
 * it, so the thread you came from stays in view.
 *
 * Filled `bg-primary` rather than a tint: it is the one thing in this header
 * that is not a plain utility control.
 */
function AssistantButton() {
  const { setOpen } = useAthena()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-sm"
            onClick={() => setOpen(true)}
            aria-label="Ask Athena"
            className="rounded-full"
          />
        }
      >
        <SparklesIcon />
      </TooltipTrigger>
      <TooltipContent>Ask Athena</TooltipContent>
    </Tooltip>
  )
}

/**
 * Call the candidate.
 *
 * GHOST, NOT FILLED. It takes the AI button's slot in a person's thread, but
 * not its treatment: the filled accent was earning its place as the one AI
 * affordance in the panel, and a call is a peer utility action beside Back and
 * Close. WhatsApp draws its call control as a plain icon for the same reason.
 *
 * There is no telephony behind it and there is not going to be in a prototype,
 * so it is a button that goes nowhere rather than a link to a screen that does
 * not exist — the same call `nav.ts` makes for "Get Help".
 */
function CallButton({ name }: { name: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Call ${name}`} />
        }
      >
        <PhoneIcon />
      </TooltipTrigger>
      <TooltipContent>Call {name}</TooltipContent>
    </Tooltip>
  )
}

export function ThreadList({
  query,
  onQueryChange,
  onOpenThread,
  onClose,
}: {
  query: string
  onQueryChange: (value: string) => void
  onOpenThread: (id: string) => void
  onClose?: () => void
}) {
  const { conversations, threads, unread, drafts, lastAtFor } = useMessages()
  const needle = query.trim().toLowerCase()
  const matches = conversations.filter(
    (conversation) =>
      needle === "" ||
      conversation.name.toLowerCase().includes(needle) ||
      conversation.role.toLowerCase().includes(needle)
  )

  return (
    <>
      <PanelHeader onClose={onClose} actions={<AssistantButton />}>
        <div className="flex min-w-0 flex-col">
          <p className="text-sm font-medium">Messages</p>
          <p className="text-xs text-muted-foreground">
            {conversations.length} candidates
          </p>
        </div>
      </PanelHeader>

      <div className="shrink-0 px-4 py-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search candidates"
            aria-label="Search candidates"
            className="h-9 pl-9 text-sm"
          />
        </div>
      </div>

      {/* PEOPLE ONLY. The assistant used to be pinned at the top of this list
          as a row; it is reached from the header's AI button now, so the list
          is candidates and nothing else. One entry point rather than two, and
          the row's preview line was the only thing it had over the button. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {matches.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No candidates match &ldquo;{query.trim()}&rdquo;.
          </p>
        ) : (
          matches.map((conversation) => (
            <ThreadListRow
              key={conversation.id}
              conversation={conversation}
              photo={photoOf(conversation)}
              preview={lastOf(threads[conversation.id])}
              draft={drafts[conversation.id]}
              lastAt={lastAtFor(conversation)}
              unread={unread[conversation.id] ?? 0}
              onOpen={() => onOpenThread(conversation.id)}
            />
          ))
        )}
      </div>
    </>
  )
}

/**
 * Three columns: portrait, the person, and the time-over-unread stack on the
 * right. WhatsApp's row, with the posting they applied to standing in for a
 * phone number — two candidates with similar names are told apart by what
 * they applied to, and a recruiter carrying six live postings needs it to
 * place them at all.
 *
 * THE DESIGNATION AND THE MESSAGE ARE DIFFERENT REGISTERS, NOT DIFFERENT
 * SIZES. They were 11px grey over 12px grey, which is a size difference small
 * enough to read as a rendering accident — the eye could not tell which line
 * was the metadata. The designation is now a small-caps micro-label with
 * letter-spacing, which is unmistakably a label, and the message keeps normal
 * sentence case at 13px so it is the thing you actually read. Order matters
 * too: name, then designation, then message, so the label sits between the two
 * pieces of prose rather than competing with the message underneath it.
 *
 * The unread count moved out of the message line and into the right column,
 * under the time. On the message line it pushed the truncation point around
 * depending on whether the row was read; in its own column both the time and
 * the count sit on one right edge down the whole list.
 */
function ThreadListRow({
  conversation,
  photo,
  preview,
  draft,
  lastAt,
  unread,
  onOpen,
}: {
  conversation: Conversation
  photo: string | undefined
  preview: Message | undefined
  /** Unsent text in this thread's composer, which the row says it holds. */
  draft: string | undefined
  lastAt: string
  unread: number
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-muted/70"
    >
      <Avatar size="lg">
        <AvatarImage src={photo} alt="" />
        <AvatarFallback>{conversation.initials}</AvatarFallback>
        {conversation.online && (
          <AvatarBadge className="bg-success" aria-label="Online" />
        )}
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-medium text-foreground">
          {conversation.name}
        </span>

        <span className="truncate text-[10px] font-medium tracking-[0.07em] text-muted-foreground/90 uppercase">
          {conversation.role}
        </span>

        {/* Unread is carried by COLOUR, not weight. Bolding this line put it
            at the same visual weight as the 14px medium name directly above
            it, and the row lost its top-level hierarchy — the name has to stay
            the loudest thing in the row whether or not there is unread. */}
        <p
          className={cn(
            "truncate text-[13px]",
            unread > 0 ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {/* A waiting draft outranks the last message — it is the thing you
              came back to this thread to do. WhatsApp's own rule. */}
          {draft?.trim() ? (
            <>
              <span className="font-medium text-primary">Draft: </span>
              {draft}
            </>
          ) : (
            <>
              {preview?.author === "you" && (
                <span className="text-muted-foreground">You: </span>
              )}
              {preview?.body}
            </>
          )}
        </p>
      </div>

      {/* `w-11` fixes the column so the times line up regardless of whether a
          row says "11:42" or "Yesterday", and `min-h` reserves the badge's
          space so a read row does not sit 18px shorter than an unread one. */}
      <div className="flex w-11 shrink-0 flex-col items-end gap-1.5 self-start">
        <span
          className={cn(
            "text-[11px] tabular-nums",
            unread > 0 ? "font-medium text-primary" : "text-muted-foreground"
          )}
        >
          {lastAt}
        </span>
        {unread > 0 && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground tabular-nums">
            {unread}
          </span>
        )}
      </div>
    </button>
  )
}

export function Thread({
  id,
  title,
  subtitle,
  initials,
  photo,
  online,
  messages,
  onBack,
  onClose,
  onSend,
}: {
  /** The thread's id, which is where its draft is kept. */
  id: string
  title: string
  subtitle: string
  initials: string
  photo: string | undefined
  online?: boolean
  messages: Message[]
  /** Only where the list is not beside it — the page hides this on two columns. */
  onBack?: () => void
  onClose?: () => void
  onSend: (body: string) => void
}) {
  // The composer's text lives in the provider, so a draft Athena wrote is here
  // when the thread opens and one you typed survives leaving the page.
  const { drafts, setDraft: setThreadDraft } = useMessages()
  const draft = drafts[id] ?? ""
  const setDraft = (body: string) => setThreadDraft(id, body)
  const scroller = React.useRef<HTMLDivElement>(null)

  // Pin to the newest message on open and on every append.
  React.useEffect(() => {
    const node = scroller.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages.length])

  const submit = (body: string) => {
    onSend(body)
    setDraft("")
  }

  return (
    <>
      <PanelHeader
        onClose={onClose}
        // A person's thread gets a call button here. The AI button belongs on
        // the list, which keeps this header to the person you are talking to.
        actions={<CallButton name={title} />}
      >
        {/* Only where the list is not beside it. The page is two columns at
            `@3xl/main` and one below, so the arrow goes exactly where the
            list comes back — there is nothing to go back to when it never
            left. A container query rather than a prop, because the thing that
            decides is the width this renders into. */}
        {onBack && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label="Back to all messages"
            className="-ml-1 shrink-0 @3xl/main:hidden"
          >
            <ArrowLeftIcon />
          </Button>
        )}

        <Avatar>
          <AvatarImage src={photo} alt="" />
          <AvatarFallback>{initials}</AvatarFallback>
          {online && <AvatarBadge className="bg-success" />}
        </Avatar>

        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-sm font-medium">{title}</p>
          {/* Same micro-label register as the list rows, so the posting reads
              as the same field in both places. */}
          <p className="truncate text-[10px] font-medium tracking-[0.07em] text-muted-foreground/90 uppercase">
            {subtitle}
          </p>
        </div>
      </PanelHeader>

      {/* A tinted CANVAS behind the bubbles — WhatsApp's wallpaper, minus the
          pattern. This is the thing that was actually missing: white bubbles on
          a white panel have no edge, and tinting the bubble instead only moves
          the problem, because then the bubble and the panel swap roles. Ground
          tinted, inbound bubble white — see `Bubble`. */}
      <div
        ref={scroller}
        className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto bg-muted/50 px-4 py-4"
      >
        {messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit(draft)
        }}
        className="flex shrink-0 items-end gap-2 border-t border-border bg-muted px-4 py-3.5"
      >
        {/* A TEXTAREA NOW. The single-line input was fine for "Thursday
            works", and useless for reading a three-sentence draft Athena wrote
            before sending it — the whole point of a draft is that it is read
            first. `field-sizing-content` grows it with the text, up to a cap. */}
        <Textarea
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Message"
          aria-label={`Message ${title}`}
          className="field-sizing-content max-h-40 min-h-9 resize-none bg-background py-2 text-sm dark:bg-background"
          // Enter sends and Shift+Enter breaks the line, wired explicitly
          // rather than left to the form: a textarea does not submit on Enter.
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return
            event.preventDefault()
            submit(draft)
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={draft.trim() === ""}
          aria-label="Send"
          className="size-9 shrink-0 rounded-full"
        >
          <SendIcon className="size-4" />
        </Button>
      </form>
    </>
  )
}

/**
 * The asymmetric corner is what makes these read as WhatsApp without drawing
 * tails: the bubble is `rounded-2xl` except on the corner nearest its own
 * side, which tightens to `rounded-md`. Outbound takes the accent, so it is
 * the brand's colour that says which messages are yours.
 */
function Bubble({ message }: { message: Message }) {
  const mine = message.author === "you"

  return (
    <div
      className={cn(
        "flex max-w-[85%] flex-col gap-0.5 rounded-2xl px-3 py-2",
        mine
          ? "self-end rounded-br-md bg-primary text-primary-foreground"
          : // White on the tinted canvas, bordered and lifted. `bg-muted` here
            // would be the same colour as the ground it sits on.
            "self-start rounded-bl-md border border-border bg-card text-card-foreground"
      )}
    >
      <p className="text-sm leading-relaxed break-words">{message.body}</p>
      <span
        className={cn(
          "self-end text-[10px] tabular-nums",
          mine ? "text-primary-foreground/70" : "text-muted-foreground"
        )}
      >
        {message.at}
      </span>
    </div>
  )
}
