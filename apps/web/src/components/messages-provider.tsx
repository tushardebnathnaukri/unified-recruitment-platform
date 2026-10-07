import * as React from "react"
import { atom, useAtom } from "jotai"
import { useNavigate } from "react-router"

import type { Applicant } from "@/lib/applicants"
import { CandidateSourceContext } from "@/lib/candidate-source"
import {
  CONVERSATIONS,
  firstMessageTo,
  type Conversation,
  type Message,
} from "@/lib/messages"

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
 * carries the applicant's id. Sending moves nobody: reaching out is something
 * you do to a person, not a decision about them (the Contacted bucket that a
 * first send used to move them to was removed on 6 Oct 2026).
 *
 * Resets on reload, like the other overlays here.
 *
 * ATOMS, NOT A PROVIDER (it was `MessagesProvider` in `AppShell`). The hook
 * brings its own `navigate`, which the provider used to take from where it was
 * mounted.
 */
export type Recipient = {
  /** The applicant's id, which becomes the thread's id. */
  id: string
  name: string
  /** The posting they applied to. */
  role: string
  photo?: string
}

/** Where a draft or a thread link sends you. */
const MESSAGES_PATH = "/messages"

const startedAtom = atom<Conversation[]>([])
const threadsAtom = atom<Record<string, Message[]>>(
  Object.fromEntries(CONVERSATIONS.map((c) => [c.id, c.messages]))
)
const unreadAtom = atom<Record<string, number>>(
  Object.fromEntries(CONVERSATIONS.map((c) => [c.id, c.unread]))
)
const draftsAtom = atom<Record<string, string>>({})
const lastAtAtom = atom<Record<string, string>>({})

export function useMessages() {
  const navigate = useNavigate()
  const [started, setStarted] = useAtom(startedAtom)
  const [threads, setThreads] = useAtom(threadsAtom)
  const [unread, setUnread] = useAtom(unreadAtom)
  const [drafts, setDrafts] = useAtom(draftsAtom)
  const [lastAt, setLastAt] = useAtom(lastAtAtom)

  return React.useMemo(() => {
    // Newest first: a thread you just started belongs at the top of the list.
    const conversations = [...started, ...CONVERSATIONS]

    /**
     * Goes to /messages on that thread and marks it read. Which thread is open
     * is `?thread=` and belongs to the page, so there is no `open` or
     * `activeId` here — there is nothing to open, only somewhere to go.
     */
    const openThread = (id: string) => {
      // Opening is what marks read, which is why the count lives here and not
      // in the fixtures.
      setUnread((previous) => ({ ...previous, [id]: 0 }))
      navigate(`${MESSAGES_PATH}?thread=${encodeURIComponent(id)}`)
    }

    return {
      conversations,
      threads,
      unread,
      drafts,
      /** A thread's last activity, humanised — this session's sends over the fixtures'. */
      lastAtFor: (conversation: Conversation) =>
        lastAt[conversation.id] ?? conversation.lastAt,
      openThread,
      setDraft: (id: string, body: string) =>
        setDrafts((previous) => ({ ...previous, [id]: body })),
      send: (id: string, body: string) => {
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

        // Nobody answers. A candidate replying on a timer would be pretending
        // the prototype has people in it.
      },
      /**
       * Puts a draft in each recipient's thread, starting threads that do not
       * exist. One recipient lands on that thread; several land on the list,
       * where each row says it holds a draft.
       */
      fillDrafts: (entries: { to: Recipient; body: string }[]) => {
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
        else navigate(MESSAGES_PATH)
      },
    }
  }, [
    started,
    threads,
    unread,
    drafts,
    lastAt,
    navigate,
    setStarted,
    setThreads,
    setUnread,
    setDrafts,
    setLastAt,
  ])
}

/**
 * Message one person — what the Message button on a card, the profile panel and
 * the candidate page does. Their thread if they have one; otherwise a new one
 * with `firstMessageTo` waiting in the composer, worded for how they came in
 * (`CandidateSourceContext`), the way the selection bar's Message starts many.
 *
 * It moves nobody. It used to move the person to Contacted and do nothing
 * else; with that bucket gone (6 Oct 2026) the button does what it says.
 */
export function useMessageTo() {
  const { conversations, openThread, fillDrafts } = useMessages()
  const sourceFor = React.useContext(CandidateSourceContext)

  return (applicant: Applicant) => {
    if (conversations.some((conversation) => conversation.id === applicant.id))
      return openThread(applicant.id)

    const source = sourceFor?.(applicant)
    fillDrafts([
      {
        to: {
          id: applicant.id,
          name: applicant.name,
          role: source?.label ?? applicant.title,
          photo: applicant.photo,
        },
        body: firstMessageTo(applicant.name, source),
      },
    ])
  }
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
