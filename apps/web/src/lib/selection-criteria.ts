import * as React from "react"
import { useAtom } from "jotai"

import { persistedAtom } from "@/lib/persisted"

/**
 * Whether a posting asks for Selection criteria — the private hiring brief
 * (industry, neighbouring roles, team, institutes, budget, rule-outs…) that
 * follows the posting and becomes Search Resume's filters.
 *
 * A PROTOTYPE SETTING, on /settings beside "Post a job", on by default. Off,
 * the refinement topics are never asked, the brief is neither shown nor
 * searched on, and the screening questions stay as a step of their own. It
 * applies to every posting layout, because they all read one conversation
 * state: the flag rides on `IntakeState.criteria` from `startIntake`, and
 * `enterRefine` is the one place that honours it.
 */
const criteriaAtom = persistedAtom<"on" | "off">("selection-criteria", "on", [
  "on",
  "off",
])

export function useSelectionCriteria() {
  const [value, setValue] = useAtom(criteriaAtom)
  const setEnabled = React.useCallback(
    (next: boolean) => setValue(next ? "on" : "off"),
    [setValue]
  )
  return { enabled: value === "on", setEnabled }
}
