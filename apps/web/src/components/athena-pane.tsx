import * as React from "react"
import { SendIcon, SparklesIcon, XIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { useAthena } from "@/components/athena-provider"

/**
 * Athena, the copilot pane — the third column of the shell.
 *
 * TODO(design): WHAT GOES IN HERE IS NOT DECIDED. This is the conversation
 * shape and nothing else: a thread, a composer, and openers. It answers with a
 * stub that says so rather than a plausible-sounding reply, because a fake
 * answer in a design review gets read as a real capability and the first
 * question anybody asks of this pane will be "can it actually do that".
 *
 * A PANE, NOT AN OVERLAY. A copilot you consult about what is on screen cannot
 * be the thing covering it, so above `md` this takes its own column beside the
 * content and the nav collapses to pay for it. Below `md` there is no room for
 * three columns and it covers the page instead, which is the honest version of
 * the same idea on a phone.
 */
export function AthenaPane() {
  const { open, setOpen } = useAthena()
  const [messages, setMessages] = React.useState<Message[]>([])
  const [draft, setDraft] = React.useState("")
  const threadRef = React.useRef<HTMLDivElement>(null)

  const send = (text: string) => {
    const value = text.trim()
    if (!value) return
    setDraft("")
    setMessages((current) => [
      ...current,
      { id: `u${current.length}`, from: "you", text: value },
      { id: `a${current.length}`, from: "athena", text: STUB_REPLY },
    ])
  }

  // Newest message into view. Layout effect rather than effect: after paint the
  // thread has already been seen in its old position, which reads as a jump.
  React.useLayoutEffect(() => {
    const thread = threadRef.current
    if (thread) thread.scrollTop = thread.scrollHeight
  }, [messages])

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
        "md:sticky md:inset-auto md:top-2 md:z-auto md:m-2 md:ml-0 md:h-[calc(100svh-1rem)] md:w-(--athena-width) md:shrink-0 md:rounded-xl md:shadow-sm"
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

      <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <Opener onPick={send} />
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-input bg-input/30 p-2 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          <Textarea
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Ask Athena"
            placeholder="Ask about this page, a candidate, a role…"
            className="min-h-9 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
            onKeyDown={(event) => {
              // Enter sends and Shift+Enter breaks the line — the convention
              // every chat has, and the same as the dashboard's requirement box.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                send(draft)
              }
            }}
          />

          <Button
            size="icon-sm"
            className="shrink-0 rounded-full"
            aria-label="Send"
            disabled={draft.trim() === ""}
            onClick={() => send(draft)}
          >
            <SendIcon />
          </Button>
        </div>
      </div>
    </aside>
  )
}

type Message = { id: string; from: "you" | "athena"; text: string }

const STUB_REPLY =
  "I'm not wired up yet — this pane is here so we can design the conversation before deciding what I should be able to do."

/** Openers, so the first thing in an empty pane is not a blank box. */
const OPENERS = [
  "Who are the strongest five on this posting?",
  "Draft a message to the shortlisted candidates",
  "Why is this role taking longer than the last one?",
]

function Opener({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Ask Athena</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          She can see the page you are on, so questions about it do not need
          setting up.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {OPENERS.map((opener) => (
          <button
            key={opener}
            type="button"
            onClick={() => onPick(opener)}
            className="rounded-xl border border-border px-3 py-2.5 text-left text-sm leading-relaxed transition-colors hover:bg-muted"
          >
            {opener}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Only the recruiter's turns get a bubble. Athena's sit on the pane itself, the
 * way every assistant that reached this shape ended up doing — a wall of paired
 * bubbles halves the reading width for the half of the thread that is longest.
 */
function Bubble({ message }: { message: Message }) {
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
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">
        {message.text}
      </p>
    </div>
  )
}
