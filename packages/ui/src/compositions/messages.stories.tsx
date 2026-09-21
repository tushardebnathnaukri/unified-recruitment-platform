import * as React from "react"
import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite"
import {
  ArrowLeftIcon,
  MessageCircleIcon,
  PhoneIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { designComposition } from "@workspace/ui/lib/figma"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Messages, as a page. Mirrors `apps/web/src/routes/messages.tsx` and
 * `components/message-thread.tsx`; the people are the same shape the app's
 * `MessagesProvider` deals.
 */

type Conversation = {
  id: string
  name: string
  initials: string
  /** The posting they applied to — a phone number's job in WhatsApp's row. */
  role: string
  online?: boolean
  preview: string
  /** Unsent text in this thread's composer, which the row says it holds. */
  draft?: string
  lastAt: string
  unread: number
}

const CONVERSATIONS: Conversation[] = [
  {
    id: "m1",
    name: "Ananya Krishnan",
    initials: "AK",
    role: "Principal Engineer, Platform",
    online: true,
    preview: "Thursday afternoon works — shall I send an invite?",
    lastAt: "11:42",
    unread: 2,
  },
  {
    id: "m2",
    name: "Rohit Mehta",
    initials: "RM",
    role: "Principal Engineer, Platform",
    preview: "",
    draft: "Hi Rohit — we loved your work on the Swiggy migration and…",
    lastAt: "10:05",
    unread: 0,
  },
  {
    id: "m3",
    name: "Meera Kulkarni",
    initials: "MK",
    role: "Engineering Manager, Payments",
    preview: "Thanks for getting back to me so quickly.",
    lastAt: "Yesterday",
    unread: 0,
  },
  {
    id: "m4",
    name: "Priyanka Nair",
    initials: "PN",
    role: "Principal Engineer, Platform",
    preview: "I'd need about six weeks before I could start.",
    lastAt: "Tuesday",
    unread: 0,
  },
]

type Message = { id: string; author: "you" | "them"; body: string; at: string }

const THREAD: Message[] = [
  {
    id: "1",
    author: "you",
    body: "Hi Ananya — we're hiring a Principal Engineer for platform infrastructure, and your Razorpay work looks like a close fit. Would you be open to a chat this week?",
    at: "09:12",
  },
  {
    id: "2",
    author: "them",
    body: "Hi! Yes, happy to. I'm mostly free after 3pm.",
    at: "10:58",
  },
  {
    id: "3",
    author: "you",
    body: "Perfect. Would Thursday at 4 suit you?",
    at: "11:30",
  },
  {
    id: "4",
    author: "them",
    body: "Thursday afternoon works — shall I send an invite?",
    at: "11:42",
  },
]

/**
 * The one tinted band in the panel. WhatsApp's header is a solid accent; at
 * this size that much saturation fights the bubbles, so this is a flat
 * `bg-muted`.
 */
function PanelHeader({
  children,
  actions,
}: {
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border bg-muted px-4 py-3.5">
      {children}
      <div className="ml-auto flex shrink-0 items-center gap-1">{actions}</div>
    </header>
  )
}

/**
 * Three columns: portrait, the person, and the time-over-unread stack on the
 * right. WhatsApp's row, with the posting they applied to standing in for a
 * phone number — two candidates with similar names are told apart by what they
 * applied to.
 *
 * **The designation and the message are different registers, not different
 * sizes.** The designation is a small-caps micro-label; the message keeps
 * sentence case at 13px, so it is the thing you actually read. **Unread is
 * carried by colour, not weight**: bolding the message line put it level with
 * the name above it and the row lost its hierarchy.
 */
function ThreadListRow({
  conversation,
  onOpen,
}: {
  conversation: Conversation
  onOpen?: () => void
}) {
  const { unread } = conversation

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-muted/70"
    >
      <Avatar size="lg">
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
        <p
          className={cn(
            "truncate text-[13px]",
            unread > 0 ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {/* A WAITING DRAFT OUTRANKS THE LAST MESSAGE — it is the thing you
              came back to this thread to do, and on this product it is usually
              something Athena wrote for you. WhatsApp's own rule. */}
          {conversation.draft ? (
            <>
              <span className="font-medium text-primary">Draft: </span>
              {conversation.draft}
            </>
          ) : (
            conversation.preview
          )}
        </p>
      </div>

      {/* `w-11` fixes the column so the times line up whether a row says
          "11:42" or "Yesterday". */}
      <div className="flex w-11 shrink-0 flex-col items-end gap-1.5 self-start">
        <span
          className={cn(
            "text-[11px] tabular-nums",
            unread > 0 ? "font-medium text-primary" : "text-muted-foreground"
          )}
        >
          {conversation.lastAt}
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

function ThreadList({ activeId }: { activeId?: string }) {
  return (
    <>
      <PanelHeader
        actions={
          // THE COPILOT IS REACHED FROM HERE. The page's old canned assistant
          // thread is gone: there is one copilot, and this button opens her.
          <Button variant="ghost" size="icon-sm" aria-label="Ask Athena">
            <SparklesIcon />
          </Button>
        }
      >
        <div className="flex min-w-0 flex-col">
          <p className="text-sm font-medium">Messages</p>
          <p className="text-xs text-muted-foreground">
            {CONVERSATIONS.length} candidates
          </p>
        </div>
      </PanelHeader>

      <div className="shrink-0 px-4 py-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search candidates"
            aria-label="Search candidates"
            className="h-9 pl-9 text-sm"
          />
        </div>
      </div>

      {/* PEOPLE ONLY. The assistant used to be pinned at the top of this list
          as a row; it is reached from the header's button now. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {CONVERSATIONS.map((conversation) => (
          <ThreadListRow
            key={conversation.id}
            conversation={conversation}
            onOpen={undefined}
          />
        ))}
        {activeId && <span className="sr-only">{activeId} is open</span>}
      </div>
    </>
  )
}

/**
 * The asymmetric corner is what makes these read as WhatsApp without drawing
 * tails: `rounded-2xl` except on the corner nearest its own side, which
 * tightens to `rounded-md`. Outbound takes the accent, so it is the brand's
 * colour that says which messages are yours.
 */
function Bubble({ message }: { message: Message }) {
  const mine = message.author === "you"

  return (
    <div
      className={cn(
        "flex max-w-[85%] flex-col gap-0.5 rounded-2xl px-3 py-2",
        mine
          ? "self-end rounded-br-md bg-primary text-primary-foreground"
          : // White on the tinted canvas, bordered. `bg-muted` here would be
            // the same colour as the ground it sits on.
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

function Thread({ back = false }: { back?: boolean }) {
  const conversation = CONVERSATIONS[0]!

  return (
    <>
      <PanelHeader
        actions={
          <Button variant="ghost" size="icon-sm" aria-label="Call">
            <PhoneIcon />
          </Button>
        }
      >
        {/* Only where the list is not beside it. The page is two columns at
            `@3xl/main` and one below, so the arrow goes exactly where the list
            comes back — there is nothing to go back to when it never left. */}
        {back && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back to all messages"
            className="-ml-1 shrink-0"
          >
            <ArrowLeftIcon />
          </Button>
        )}

        <Avatar>
          <AvatarFallback>{conversation.initials}</AvatarFallback>
          <AvatarBadge className="bg-success" />
        </Avatar>

        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-sm font-medium">{conversation.name}</p>
          {/* Same micro-label register as the list rows, so the posting reads
              as the same field in both places. */}
          <p className="truncate text-[10px] font-medium tracking-[0.07em] text-muted-foreground/90 uppercase">
            {conversation.role}
          </p>
        </div>
      </PanelHeader>

      {/* A TINTED CANVAS behind the bubbles — WhatsApp's wallpaper, minus the
          pattern. White bubbles on a white panel have no edge, and tinting the
          bubble instead only swaps the problem round. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto bg-muted/50 px-4 py-4">
        {THREAD.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
      </div>

      <div className="flex shrink-0 items-end gap-2 border-t border-border bg-muted px-4 py-3.5">
        {/* A TEXTAREA, NOT AN INPUT. One line was fine for "Thursday works" and
            useless for reading a three-sentence draft Athena wrote before
            sending it — the whole point of a draft is that it is read first. */}
        <Textarea
          rows={1}
          placeholder="Message"
          aria-label={`Message ${conversation.name}`}
          className="field-sizing-content max-h-40 min-h-9 resize-none bg-background py-2 text-sm dark:bg-background"
        />
        <Button
          size="icon"
          disabled
          aria-label="Send"
          className="size-9 shrink-0 rounded-full"
        >
          <SendIcon className="size-4" />
        </Button>
      </div>
    </>
  )
}

/**
 * The page. One card, two columns: the list at 320px with a right border, the
 * open thread filling the rest.
 */
function MessagesPage({
  open = true,
  narrow = false,
}: {
  open?: boolean
  narrow?: boolean
}) {
  return (
    <div className="bg-canvas p-4 lg:p-6">
      <div
        className={cn(
          "flex h-[32rem] overflow-hidden rounded-2xl border border-border bg-card",
          narrow && "mx-auto max-w-sm"
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            !narrow && "w-80 flex-none border-r border-border",
            // Below the breakpoint the list steps aside for the open thread.
            narrow && open && "hidden"
          )}
        >
          <ThreadList activeId={open ? "m1" : undefined} />
        </div>

        <div
          className={cn(
            "min-w-0 flex-1 flex-col",
            narrow && !open ? "hidden" : "flex"
          )}
        >
          {open ? (
            <Thread back={narrow} />
          ) : (
            <Empty className="m-auto">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageCircleIcon />
                </EmptyMedia>
                <EmptyTitle>No conversation open</EmptyTitle>
                <EmptyDescription>
                  Pick somebody on the left. Drafts Athena wrote are waiting in
                  their own threads, marked &ldquo;Draft:&rdquo;.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: "Compositions/Messages",
  parameters: {
    design: designComposition("messages"),
    layout: "fullscreen",
    docs: {
      description: {
        component: `
Every conversation with a candidate, on a page of its own. Mirrors
\`apps/web/src/routes/messages.tsx\`.

**IT WAS A DOCK IN THE CORNER.** A launcher and a 26rem floating panel pinned
bottom-right, until that corner stopped being free — Athena took the column
beside it and the launcher had to dodge her by \`--athena-width\` — and until it
was clear that a conversation you are about to reply to wants the room a
document gets. A thread is a document the way a CV is, so it gets a place in
the nav you can point somebody at.

**The open thread is \`?thread=\`**, like every other piece of state on this
product worth showing somebody. \`openThread\` on the provider navigates here,
so Athena's draft cards, the selection bar's Message action and the candidate
page's Message button all land on the right conversation without knowing
anything about this page.

**Two columns above \`@3xl\`, one below** — the split view's bargain. Narrow, the
list and the thread take turns and the thread's back arrow returns to the list;
wide, the list stays beside it and the arrow goes, because there is nothing to
go back to when it never left.

**A draft outranks the last message in the row**, marked "Draft:" in the
brand's colour. Athena writes messages and never sends them, so a thread can be
waiting on the recruiter to press Send rather than on the candidate.

**There is one copilot.** The sparkle button on the list header opens Athena;
the page's old assistant thread, with its canned replies, is gone.
        `,
      },
    },
  },
} satisfies StoryMeta

export default meta

type Story = StoryObj<typeof meta>

export const FullPage: Story = {
  name: "Messages — full page",
  render: () => <MessagesPage />,
}

/** Nothing picked. The list keeps the left; the right says what to do about it. */
export const NoThread: Story = {
  name: "No conversation open",
  render: () => <MessagesPage open={false} />,
}

/**
 * One column. The list and the thread take turns, and the thread's back arrow
 * appears exactly where the list stops being beside it.
 */
export const OneColumn: Story = {
  name: "One column",
  render: () => <MessagesPage narrow />,
}

/** The rows: unread, a waiting draft, and two read. */
export const Rows: Story = {
  name: "Thread list rows",
  render: () => (
    <div className="bg-canvas p-6">
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-border bg-card">
        {CONVERSATIONS.map((conversation) => (
          <ThreadListRow key={conversation.id} conversation={conversation} />
        ))}
      </div>
    </div>
  ),
}

/** Outbound takes the accent, so the brand's colour says which are yours. */
export const Bubbles: Story = {
  name: "Bubbles",
  render: () => (
    <div className="flex flex-col gap-2.5 bg-muted/50 p-6">
      {THREAD.map((message) => (
        <Bubble key={message.id} message={message} />
      ))}
    </div>
  ),
}
