import * as React from "react"
import { useLocation } from "react-router"
import { SendIcon, SparklesIcon, XIcon } from "lucide-react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import type { Brand } from "@workspace/ui/lib/brands"
import { cn } from "@workspace/ui/lib/utils"
import { AthenaBlock } from "@/components/athena-blocks"
import { useAthena } from "@/components/athena-provider"
import { CANNOT_ANSWER, type Opener, type Reply } from "@/lib/athena"
import { titleForPath } from "@/lib/nav"

/**
 * Athena, the copilot pane — the third column of the shell.
 *
 * SHE ANSWERS WHAT THE PAGE CAN COMPUTE, AND SAYS SO ABOUT THE REST. Each page
 * registers the questions it can answer (`useAthenaContext`), and the answers
 * are worked out from the data on screen at the moment they are asked — see
 * `lib/athena.ts`. A question typed in her own box gets a reply that says it
 * cannot be answered yet, because a plausible made-up answer in a design review
 * gets read as a real capability.
 *
 * ONE THREAD PER PRODUCT, NOT ONE PER PAGE. It survives navigation the way the
 * half-typed question does, and a divider marks each move, so the thread still
 * reads after you have moved on. Switching product swaps the thread: iimjobs'
 * candidates have no business in a hirist conversation, and their Shortlist
 * buttons would be acting on people the other product does not have. Switching
 * back brings the first thread back, the way `SavedListsProvider` keeps each
 * product's lists.
 *
 * A PANE, NOT AN OVERLAY. A copilot you consult about what is on screen cannot
 * be the thing covering it, so above `md` this takes its own column beside the
 * content and the nav collapses to pay for it. Below `md` there is no room for
 * three columns and it covers the page instead, which is the honest version of
 * the same idea on a phone.
 */
export function AthenaPane() {
  const { open, setOpen, context, pending, clearPending } = useAthena()
  const { pathname } = useLocation()
  const { brand } = useBrand()
  const [threads, setThreads] = React.useState<
    Partial<Record<Brand, Message[]>>
  >({})
  const [draft, setDraft] = React.useState("")
  // Which product's thread is waiting on a reply — a reply belongs to the
  // thread it was asked in, even if the product changes before it lands.
  const [thinkingIn, setThinkingIn] = React.useState<Brand | null>(null)
  const messages = threads[brand] ?? []
  const thinking = thinkingIn === brand
  const threadRef = React.useRef<HTMLDivElement>(null)

  // Pending replies, cleared on unmount so a reply cannot land on a dead pane.
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([])
  React.useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
    },
    []
  )

  const label = context?.label ?? titleForPath(pathname)
  const openers = context?.openers ?? []

  /**
   * Answer now, show it shortly. The answer is computed at the moment of asking
   * — a decision taken during the pause must not leak into it — and the pause
   * is only there so a reply is seen arriving rather than already being there.
   */
  const ask = (prompt: string, opener?: Opener) => {
    const value = prompt.trim()
    if (!value || thinkingIn) return
    setDraft("")
    const asked = brand

    const match =
      opener ?? openers.find((candidate) => candidate.prompt === value)
    const reply: Reply = match
      ? match.answer()
      : { about: label, blocks: [CANNOT_ANSWER] }

    const append = (message: Message) =>
      setThreads((current) => ({
        ...current,
        [asked]: [...(current[asked] ?? []), message],
      }))

    append({
      id: `u${messages.length}`,
      from: "you",
      text: value,
      where: label,
    })
    setThinkingIn(asked)
    timers.current.push(
      setTimeout(() => {
        append({
          id: `a${messages.length + 1}`,
          from: "athena",
          reply,
          where: label,
        })
        setThinkingIn(null)
      }, 600)
    )
  }

  // A question asked from outside the pane — a card's menu, the selection bar.
  // Held until any reply in flight has landed rather than dropped, and read
  // through a ref so the effect is about the question, not about `ask`, which
  // is a new function every render.
  const askRef = React.useRef(ask)
  React.useEffect(() => {
    askRef.current = ask
  })
  React.useEffect(() => {
    if (!pending || thinkingIn) return
    clearPending()
    askRef.current(pending.prompt, pending)
  }, [pending, thinkingIn, clearPending])

  // Newest message into view. Layout effect rather than effect: after paint the
  // thread has already been seen in its old position, which reads as a jump.
  // Keyed on the length, not the array: an empty thread is a fresh `[]` every
  // render, and scrolling on every render would yank a reader back down. And on
  // `open`, because closing unmounts the thread and reopening would otherwise
  // land on its first message.
  React.useLayoutEffect(() => {
    const thread = threadRef.current
    if (thread) thread.scrollTop = thread.scrollHeight
  }, [open, messages.length, thinking, brand, label])

  if (!open) return null

  return (
    <aside
      aria-label="Athena"
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-background",
        // STICKY AND VIEWPORT-HEIGHT, not a plain flex child. The shell's
        // wrapper is `min-h-svh` and grows with the page, so a stretched column
        // is as tall as the DOCUMENT — which put the composer at the bottom of
        // a long page instead of the bottom of the screen. The nav solves the
        // same problem with `fixed h-svh` plus a spacer to hold its width;
        // sticky needs no spacer, because it stays in the flex row.
        "md:sticky md:inset-auto md:top-0 md:z-auto md:h-svh md:w-(--athena-width) md:shrink-0 md:border-l"
      )}
    >
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b px-4">
        <SparklesIcon className="size-4 shrink-0 text-primary" />
        <span className="flex-1 text-base font-medium">Athena</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close Athena"
          onClick={() => setOpen(false)}
        >
          <XIcon />
        </Button>
      </header>

      {/* WHAT SHE CAN SEE, stated rather than implied. "She can see the page"
          is only a promise if the pane says which page it thinks that is. */}
      <div className="flex shrink-0 items-baseline gap-1.5 border-b px-4 py-2 text-xs">
        <span className="shrink-0 text-muted-foreground">Looking at</span>
        <span className="max-w-3/5 min-w-0 shrink-0 truncate font-medium">
          {label}
        </span>
        {context?.detail && (
          // The detail gives way before the name does: "Nish… · Principal
          // Engineer, Platform Infrastructure" was the wrong half to keep.
          <span className="min-w-0 truncate text-muted-foreground">
            · {context.detail}
          </span>
        )}
      </div>

      <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <Welcome openers={openers} onPick={ask} />
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <React.Fragment key={message.id}>
                {index > 0 && message.where !== messages[index - 1].where && (
                  <MovedTo label={message.where} />
                )}
                <Turn message={message} />
              </React.Fragment>
            ))}
            {thinking && <Thinking />}
            {/* The move you just made, before anything is asked on the new
                page — derived, not stored, so walking through five pages
                without asking leaves one divider rather than five, and coming
                back leaves none. */}
            {!thinking && label !== messages.at(-1)?.where && (
              <MovedTo label={label} />
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t p-3">
        {/* The page's questions stay to hand once the thread has started, so
            asking the next one is not a trip back up. WRAPPED, NOT A SCROLLING
            ROW: a row scrolled sideways drew a scrollbar under the chips on any
            system without overlay scrollbars and hid the third question past
            the pane's edge, where nobody finds it. */}
        {messages.length > 0 && openers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {openers.map((opener) => (
              <button
                key={opener.prompt}
                type="button"
                disabled={thinkingIn !== null}
                onClick={() => ask(opener.prompt, opener)}
                className="max-w-full truncate rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:bg-muted disabled:opacity-50"
              >
                {opener.prompt}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-input bg-input/30 p-2 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          <Textarea
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Ask Athena"
            placeholder="Ask about this page…"
            className="min-h-9 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
            onKeyDown={(event) => {
              // Enter sends and Shift+Enter breaks the line — the convention
              // every chat has, and the same as the dashboard's requirement box.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                ask(draft)
              }
            }}
          />

          <Button
            size="icon-sm"
            className="shrink-0 rounded-full"
            aria-label="Send"
            disabled={draft.trim() === "" || thinkingIn !== null}
            onClick={() => ask(draft)}
          >
            <SendIcon />
          </Button>
        </div>
      </div>
    </aside>
  )
}

/** `where` is the page's label when it was asked, which is what dividers compare. */
type Message =
  | { id: string; from: "you"; text: string; where: string }
  | { id: string; from: "athena"; reply: Reply; where: string }

/**
 * A move between pages, drawn in the thread. It says what the questions below
 * it are about, so the replies above it — and their still-live buttons — read
 * as belonging to where they were asked.
 */
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

/** The empty pane: the page's questions, so the first thing is not a blank box. */
function Welcome({
  openers,
  onPick,
}: {
  openers: Opener[]
  onPick: (prompt: string, opener: Opener) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Ask Athena</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {openers.length > 0
            ? "She works from what is on this page, so these need no setting up."
            : "Nothing to suggest on this page yet. The Dashboard, a job's responses and a candidate's page have questions she can answer."}
        </p>
      </div>

      {openers.length > 0 && (
        <div className="flex flex-col gap-2">
          {openers.map((opener) => (
            <button
              key={opener.prompt}
              type="button"
              onClick={() => onPick(opener.prompt, opener)}
              className="rounded-xl border border-border px-3 py-2.5 text-left text-sm leading-relaxed transition-colors hover:bg-muted"
            >
              {opener.prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Only the recruiter's turns get a bubble. Athena's sit on the pane itself, the
 * way every assistant that reached this shape ended up doing — a wall of paired
 * bubbles halves the reading width for the half of the thread that is longest.
 */
function Turn({ message }: { message: Message }) {
  if (message.from === "you") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground">
          {message.text}
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
        {/* Only when the answer is about something other than the page it was
            asked on — Messages, asked from the Dashboard. The divider already
            says the page. */}
        {message.reply.about !== message.where && (
          <span className="text-[10px] font-medium tracking-[0.07em] uppercase">
            On {message.reply.about}
          </span>
        )}
        {message.reply.blocks.map((block, index) => (
          <AthenaBlock key={index} block={block} />
        ))}
      </div>
    </div>
  )
}

function Thinking() {
  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <SparklesIcon className="size-4 shrink-0 animate-pulse text-primary" />
      <span className="text-sm text-muted-foreground">Working it out…</span>
    </div>
  )
}
