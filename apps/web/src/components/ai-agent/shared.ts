import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

import type { AgentController, AgentState } from "@/lib/ai-agent/controller"
import type { SourceKey } from "@/lib/ai-agent/types"

/**
 * What every screen of the AI Agent variant needs: the controller (its
 * methods) and the state it is drawn from. A module of its own, with no
 * components in it, so the screens can import it without a cycle and fast
 * refresh keeps working (see `candidate-list/shared.ts` for the same reason).
 */
export const AgentContext = React.createContext<{
  agent: AgentController
  state: AgentState
  /** The product's own name, so the copy follows the brand ("iimjobs AI Agent"). */
  brandName: string
} | null>(null)

export function useAgent() {
  const value = React.useContext(AgentContext)
  if (!value) throw new Error("useAgent must be used inside the AI Agent flow")
  return value
}

/**
 * THE SOURCE CHIPS, ON THE SYSTEM'S OWN TOKENS. The prototype told sources
 * apart by colour: blue for what you said, violet for what the agent
 * suggested, pink for what its data recommends, grey for your edits, red for
 * what it needs from you. Here what is yours takes the brand tint, what the
 * agent suggested is a plain outline, a recommendation from data is outlined
 * in the brand, and an edit is a secondary fill. The labels carry the rest.
 */
export const SOURCE_TAG: Record<
  SourceKey | "filling",
  { label: string; tone: string }
> = {
  you: { label: "From your brief", tone: "bg-primary/10 text-primary" },
  inferred: {
    label: "Suggested",
    tone: "border border-border bg-background text-foreground",
  },
  data: {
    label: "Recommended",
    tone: "border border-primary/30 bg-background text-primary",
  },
  answer: { label: "You answered", tone: "bg-primary/10 text-primary" },
  edited: {
    label: "Edited by you",
    tone: "bg-secondary text-secondary-foreground",
  },
  account: {
    label: "From account",
    tone: "bg-secondary text-secondary-foreground",
  },
  needs: { label: "Needs input", tone: "bg-destructive/10 text-destructive" },
  none: { label: "Optional", tone: "bg-muted text-muted-foreground" },
  filling: {
    label: "Preparing suggestions…",
    tone: "animate-pulse bg-muted text-muted-foreground",
  },
}

export const TAG_BASE =
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"

/** The field's look while the agent is still filling it, and when it errs. */
export function fieldState({ shown, err }: { shown: boolean; err: boolean }) {
  return cn(
    !shown && "animate-pulse border-border bg-muted",
    err && "border-destructive ring-[3px] ring-destructive/15"
  )
}

/** Years of experience and salary in lakhs, as the role-detail selects offer them. */
export const EXP_OPTIONS = [{ v: "", l: "—" }].concat(
  Array.from({ length: 31 }, (_, i) => ({ v: String(i), l: String(i) }))
)
export const SAL_OPTIONS = [{ v: "", l: "Select" }].concat(
  Array.from({ length: 150 }, (_, i) => ({ v: String(i + 1), l: i + 1 + "L" }))
)
