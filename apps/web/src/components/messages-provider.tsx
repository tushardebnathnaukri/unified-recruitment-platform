/* eslint-disable react-refresh/only-export-components -- provider and its hook
   belong in one file, as in `decisions-provider.tsx`. */
import * as React from "react"

import { useDecisions } from "@/components/decisions-provider"
import { CONVERSATIONS, type Conversation, type Message } from "@/lib/messages"

/**
 * The message dock's state — threads, unread counts, drafts and whether it is
 * open — lifted out of the dock so something other than the dock can reach it.
 *
 * ATHENA IS WHY. She reads which threads are waiting on you, and she writes
 * drafts: "Open in Messages" has to put text into a thread's composer and open
 * the dock on it, and "which threads are waiting" has to see a reply you typed
 * a minute ago rather than the fixtures. Both were impossible while the threads
 * were `useState` inside the dock.
 *
 * DRAFTS ARE NOT SENT. Filling a draft puts text in a composer; the recruiter
 * reads it and presses Send in the thread, the way every mail client treats a
 * suggested reply. A copilot that messages candidates on your behalf is a
 * different product decision from one that writes for you, and not ours to
 * take quietly.
 *
 * A THREAD CAN BE STARTED WITH AN APPLICANT who has none yet — the shortlisted
 * on a posting are generated people, not the six fixture threads. Such a thread
 * carries the applicant's id, so the first message sent moves them to Contacted:
 * the same thing the candidate page's Message button does.
 *
 * Resets on reload, like every other provider here.
 */
export type Recipient = {
  /** The applicant's id, which becomes the thread's id. */
  id: string
  name: string
  /** The posting they applied to. */
  role: string
  photo?: string
}

type MessagesState = {
  conversations: Conversation[]
  threads: Record<string, Message[]>
  unread: Record<string, number>
  drafts: Record<string, string>
  /** A thread's last activity, humanised — this session's sends over the fixtures'. */
  lastAtFor: (conversation: Conversation) => string
  open: boolean
  /** `null` is the thread list; an id is that thread. */
  activeId: string | null
  setOpen: (open: boolean) => void
  /** Opens the dock on a thread and marks it read. */
  openThread: (id: string) => void
  closeThread: () => void
  setDraft: (id: string, body: string) => void
  send: (id: string, body: string) => void
  /**
   * Puts a draft in each recipient's thread, starting threads that do not
   * exist. One recipient opens that thread; several open the list, where each
   * row says it holds a draft.
   */
  fillDrafts: (drafts: { to: Recipient; body: string }[]) => void
}

const MessagesContext = React.createContext<MessagesState | undefined>(
  undefined
)

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { decide } = useDecisions()
  const [started, setStarted] = React.useState<Conversation[]>([])
  const [threads, setThreads] = React.useState<Record<string, Message[]>>(() =>
    Object.fromEntries(CONVERSATIONS.map((c) => [c.id, c.messages]))
  )
  const [unread, setUnread] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(CONVERSATIONS.map((c) => [c.id, c.unread]))
  )
  const [drafts, setDrafts] = React.useState<Record<string, string>>({})
  const [lastAt, setLastAt] = React.useState<Record<string, string>>({})
  const [open, setOpen] = React.useState(false)
  const [activeId, setActiveId] = React.useState<string | null>(null)

  // Newest first: a thread you just started belongs at the top of the list.
  const conversations = React.useMemo(
    () => [...started, ...CONVERSATIONS],
    [started]
  )

  const value = React.useMemo<MessagesState>(() => {
    const openThread = (id: string) => {
      setOpen(true)
      setActiveId(id)
      // Opening is what marks read, which is why the count lives here and not
      // in the fixtures.
      setUnread((previous) => ({ ...previous, [id]: 0 }))
    }

    return {
      conversations,
      threads,
      unread,
      drafts,
      lastAtFor: (conversation) =>
        lastAt[conversation.id] ?? conversation.lastAt,
      open,
      activeId,
      setOpen,
      openThread,
      closeThread: () => setActiveId(null),
      setDraft: (id, body) =>
        setDrafts((previous) => ({ ...previous, [id]: body })),
      send: (id, body) => {
        const text = body.trim()
        if (!text) return

        setThreads((previous) => ({
          ...previous,
          [id]: [
            ...(previous[id] ?? []),
            { id: `${id}-${Date.now()}`, author: "you", body: text, at: now() },
          ],
        }))
        setDrafts((previous) => ({ ...previous, [id]: "" }))
        setLastAt((previous) => ({ ...previous, [id]: now() }))

        // Messaging an applicant is contacting them. Only for threads started
        // from a posting: the fixture threads are not tied to a generated
        // applicant, so there is nobody to move.
        const conversation = started.find((c) => c.id === id)
        if (conversation?.applicantId)
          decide(conversation.applicantId, "contacted")

        // Nobody answers. A candidate replying on a timer would be pretending
        // the prototype has people in it.
      },
      fillDrafts: (entries) => {
        if (entries.length === 0) return
        const known = new Set(conversations.map((c) => c.id))

        const fresh = entries
          .filter(({ to }) => !known.has(to.id))
          .map(({ to }): Conversation => ({
            id: to.id,
            applicantId: to.id,
            name: to.name,
            role: to.role,
            initials: initialsOf(to.name),
            photo: to.photo,
            unread: 0,
            lastAt: "",
            messages: [],
          }))
        if (fresh.length > 0) setStarted((previous) => [...fresh, ...previous])

        setDrafts((previous) => ({
          ...previous,
          ...Object.fromEntries(entries.map(({ to, body }) => [to.id, body])),
        }))

        if (entries.length === 1) openThread(entries[0].to.id)
        else {
          setOpen(true)
          setActiveId(null)
        }
      },
    }
  }, [
    conversations,
    threads,
    unread,
    drafts,
    lastAt,
    open,
    activeId,
    started,
    decide,
  ])

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  )
}

export function useMessages() {
  const context = React.useContext(MessagesContext)
  if (!context) {
    throw new Error("useMessages must be used within a MessagesProvider")
  }
  return context
}

function now() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function initialsOf(name: string) {
  const parts = name.split(" ").filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase()
}
