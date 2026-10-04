import { useAtom } from "jotai"

import { persistedAtom } from "@/lib/persisted"

/**
 * How the Dashboard lays out a posting conversation.
 *
 * A PROTOTYPE SETTING, like the others on /settings: two answers to "where
 * does the posting go while the chat gathers it".
 *
 * - `rail` is the chat with the posting rail beside it — the steps, the
 *   posting as rows, the brief, and the count. THE DEFAULT.
 * - `form` is the post-a-job form itself beside the chat, filled in as the
 *   chat reads each answer, and editable by hand: the chat is the assistant
 *   at the form's elbow rather than the form's replacement.
 * - `rail2` is the rail with its Plan lifted out and laid across the top of
 *   the page as a horizontal stepper, so the rail is only the posting: the
 *   stages are the page's progress, not the rail's.
 * - `rail3` ("Chat v3") is `rail2` with the AI Agent's ideas on our own
 *   conversation: the agent fills what the pool can tell it, every value says
 *   where it came from and can be locked, the requirements are Must have /
 *   Good to have rows with counted pool moves, sample people are checked
 *   against them, insights carry an Apply, and a hiring manager's note can be
 *   recorded. `lib/chat-v3.ts`, `components/chat-v3/`.
 * - `hybrid` is the rail while the chat is gathering, and the form once it
 *   has — "Review and post" swaps the rail for the form beside the chat,
 *   already filled, instead of sending the recruiter off to `/jobs/new`.
 *   The conversation stays one thing to attend to while it is asking, and
 *   the form appears at the point a form is what you want.
 *
 * - `wizard` ("Chat alt") is an onboarding rather than a chat: the left pane
 *   asks ONE question at a time — its options, what the page knows that
 *   bears on it, a reply box — and the right pane is a tracker of every
 *   question under the four steps, done, current and still to come. The
 *   same turns and readers as the others, so switching variants mid-way
 *   loses nothing.
 *
 * - `agent` ("AI Agent (V2.3)") is a peer's prototype, ported into this
 *   design system: brief once, and the agent shapes the role, the JD,
 *   screening and targeting, shows sample candidates, then asks how to
 *   source. It keeps its OWN canned logic and data (`lib/ai-agent/`) rather
 *   than this app's readers, so it shows the peer's design intent; its
 *   progress lives in this browser per conversation, not in the turns.
 *
 * Only a posting conversation differs; the landing and every other question
 * are the same screen either way. A persisted atom, like `filter-variant.ts`.
 */
export type PostingVariant =
  | "rail"
  | "rail2"
  | "rail3"
  | "form"
  | "hybrid"
  | "wizard"
  | "agent"

/** The default first, which is the order the switcher on /settings draws. */
export const POSTING_VARIANTS: {
  value: PostingVariant
  label: string
  hint: string
}[] = [
  {
    value: "rail",
    label: "Chat with rail",
    hint: "The conversation, with the posting as a rail beside it.",
  },
  {
    value: "rail2",
    label: "Chat with rail v2",
    hint: "The steps across the top; the rail holds the posting.",
  },
  {
    value: "rail3",
    label: "Chat v3",
    hint: "Chat v2, plus an agent that fills what it can, shows where each value came from, and checks the pool and sample people as you go.",
  },
  {
    value: "form",
    label: "Form beside chat",
    hint: "The post-a-job form, filled in by the chat as it goes.",
  },
  {
    value: "hybrid",
    label: "Chat, then form",
    hint: "The rail while it asks; the form beside the chat once it has.",
  },
  {
    value: "wizard",
    label: "Chat alt",
    hint: "One question at a time, with a tracker of every step beside it.",
  },
  {
    value: "agent",
    label: "AI Agent (V2.3)",
    hint: "A peer's prototype: brief once, the agent shapes the role, targeting and candidates.",
  },
]

const variantAtom = persistedAtom<PostingVariant>(
  "posting-variant",
  "rail",
  POSTING_VARIANTS.map((option) => option.value)
)

export function usePostingVariant() {
  const [variant, setVariant] = useAtom(variantAtom)
  return { variant, setVariant }
}
