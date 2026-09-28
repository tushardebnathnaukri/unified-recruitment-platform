import * as React from "react"

/**
 * Which first screen the Agent opens on.
 *
 * A PROTOTYPE SETTING, like the others on /settings: two answers to "what does
 * a copilot say before you have asked it anything".
 *
 * - `chat` is a greeting, a row of action pills and one big box — the box is
 *   the invitation, and the pills are shortcuts into it. THE DEFAULT.
 * - `cards` is the first design: six cards naming the six things it can do,
 *   each with an example, and the box under them — an inventory first.
 *
 * Only the landing differs; the conversation after the first question is the
 * same screen either way. A hook over `localStorage`, exactly like
 * `filter-variant.ts`.
 */
export type AgentLandingVariant = "chat" | "cards"

/** The default first, which is the order the switcher on /settings draws. */
export const AGENT_LANDING_VARIANTS: {
  value: AgentLandingVariant
  label: string
  hint: string
}[] = [
  {
    value: "chat",
    label: "Chat",
    hint: "A greeting, five action pills and one big box.",
  },
  {
    value: "cards",
    label: "Cards",
    hint: "Six cards naming what it can do, with the box under them.",
  },
]

const KEY = "agent-landing-variant"
const DEFAULT: AgentLandingVariant = "chat"
/** `storage` only fires in OTHER tabs, so this tab announces its own writes. */
const LOCAL = "agent-landing-variant-change"

/**
 * The last choice made in this tab. Storage can be unavailable — a private
 * window, a browser set to block site data, an embedded preview — and a switch
 * that silently does nothing there reads as broken, so the choice is kept here
 * too and outlives the page only when storage lets it.
 */
let chosen: AgentLandingVariant | null = null

const isVariant = (value: unknown): value is AgentLandingVariant =>
  AGENT_LANDING_VARIANTS.some((option) => option.value === value)

function read(): AgentLandingVariant {
  try {
    const stored = localStorage.getItem(KEY)
    if (isVariant(stored)) return stored
  } catch {
    // Storage is blocked; fall through to this tab's own choice.
  }
  return chosen ?? DEFAULT
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(LOCAL, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(LOCAL, onChange)
  }
}

export function useAgentLandingVariant() {
  const variant = React.useSyncExternalStore(subscribe, read, () => DEFAULT)
  const setVariant = React.useCallback((next: AgentLandingVariant) => {
    chosen = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Kept for this tab only — see `chosen`.
    }
    window.dispatchEvent(new Event(LOCAL))
  }, [])

  return { variant, setVariant }
}
