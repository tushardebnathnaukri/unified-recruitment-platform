import { aiUrl } from "@/lib/ai-client"

/**
 * Agent conversations by id — what `/agent/c/<id>` opens.
 *
 * A CONVERSATION IS STILL ITS TURNS, the same strings the old `?ask=` links
 * carried, and everything else is worked out from them on every render
 * (`answersFor`). What changed is where the turns are kept: under a short id
 * instead of in the address, so a link stays a link a person would paste.
 *
 * TWO COPIES, AND THE PAGE WORKS WITH EITHER. This browser keeps one in
 * localStorage, written first, so reload and "Back to the chat" work with the
 * AI server down. The AI server keeps the other (`/api/sessions/:id`), so the
 * link opens for somebody else. Neither ever throws: a server that is not
 * there makes a session local-only, not broken.
 *
 * THE ID IS MADE HERE, not by the server, so the first turn needs no round
 * trip and there is an id even offline. Twelve base-36 characters from
 * `crypto.getRandomValues` — unguessable enough that holding the link is what
 * lets you read it, which is the only access control a prototype gets.
 */

const ID = /^[a-z0-9]{8,32}$/
const KEY = (id: string) => `agent:session:${id}`

export const isSessionId = (value: string | undefined): value is string =>
  Boolean(value && ID.test(value))

export function newSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join("")
}

export const sessionPath = (id: string) => `/agent/c/${id}`

/** This browser's copy, or null if it has none. */
export function localTurns(id: string): string[] | null {
  try {
    const raw = localStorage.getItem(KEY(id))
    const turns: unknown = raw ? JSON.parse(raw) : null
    return Array.isArray(turns) &&
      turns.every((turn) => typeof turn === "string")
      ? (turns as string[])
      : null
  } catch {
    return null
  }
}

/**
 * The server's copy: the turns, `null` when it has never heard of this id,
 * `undefined` when it could not be asked (down, or not running).
 */
export async function remoteTurns(
  id: string
): Promise<string[] | null | undefined> {
  try {
    const response = await fetch(aiUrl(`/api/sessions/${id}`))
    if (response.status === 404) return null
    if (!response.ok) return undefined
    const { turns } = (await response.json()) as { turns?: unknown }
    return Array.isArray(turns) ? (turns as string[]) : undefined
  } catch {
    return undefined
  }
}

/** Both copies: this browser's at once, the server's when it answers. */
export function saveSession(id: string, turns: string[]) {
  try {
    localStorage.setItem(KEY(id), JSON.stringify(turns))
  } catch {
    // Storage blocked: the server's copy is the only one.
  }
  void fetch(aiUrl(`/api/sessions/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ turns }),
  }).catch(() => {
    // Down or absent: local-only until the next turn tries again.
  })
}
