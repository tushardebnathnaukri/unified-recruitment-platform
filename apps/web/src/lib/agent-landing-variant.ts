import { useAtom } from "jotai"

import { persistedAtom } from "@/lib/persisted"

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
 * - `tabs` is `chat` with the pills merged INTO the box, as shadcn's line
 *   tabs along its top edge with pipes between them. "Ask" is the first tab —
 *   the box routing whatever is typed, which is what no pill pressed means —
 *   so one tab is always selected, as tabs should be, and the selected tab
 *   replaces the mode chip the box draws under the pills.
 *
 * Only the landing differs; the conversation after the first question is the
 * same screen either way. A persisted atom, like `filter-variant.ts`.
 */
export type AgentLandingVariant = "chat" | "tabs" | "cards"

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
    value: "tabs",
    label: "Chat with tabs",
    hint: "The same, with the actions as tabs along the top of the box.",
  },
  {
    value: "cards",
    label: "Cards",
    hint: "Six cards naming what it can do, with the box under them.",
  },
]

const variantAtom = persistedAtom<AgentLandingVariant>(
  "agent-landing-variant",
  "chat",
  AGENT_LANDING_VARIANTS.map((option) => option.value)
)

export function useAgentLandingVariant() {
  const [variant, setVariant] = useAtom(variantAtom)
  return { variant, setVariant }
}
