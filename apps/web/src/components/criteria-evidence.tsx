import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import { MinusIcon, ThumbsUpIcon } from "lucide-react"

import type { Verdict } from "@/lib/criteria"

/**
 * Juicebox's lines under a result: each criterion, most important first, with
 * a chip saying whether they meet it and one sentence saying why.
 *
 * AFTER THE FACTS, BEFORE THE ACTIONS. The buckets are what anybody would read
 * off the profile; these are the search's opinion of it, so they come second —
 * and they are the last thing read before deciding, which is where the reason
 * to shortlist belongs.
 *
 * A met criterion takes the success chip and a thumbs-up; an unmet one goes
 * outline and muted, so a card's fit is legible from its colour down the left
 * before a word is read. The chips share one column width, so the sentences
 * start on the same edge on every card.
 */
export function CriteriaEvidence({
  verdicts,
  stacked = false,
}: {
  verdicts: Verdict[]
  /** Chip above sentence, for a column too narrow for the two side by side. */
  stacked?: boolean
}) {
  return (
    <ul
      aria-label="How they meet the criteria"
      className="flex flex-col gap-2 border-t border-border pt-3 text-sm"
    >
      {verdicts.map((verdict) => (
        <li
          key={verdict.criterion}
          className={cn(
            "grid items-start gap-x-3 gap-y-1",
            !stacked && "sm:grid-cols-[9rem_minmax(0,1fr)]"
          )}
        >
          <Badge
            variant={verdict.met ? "success" : "outline"}
            className="max-w-full justify-self-start font-normal"
            title={verdict.criterion}
          >
            {verdict.met ? (
              <ThumbsUpIcon data-icon="inline-start" />
            ) : (
              <MinusIcon data-icon="inline-start" />
            )}
            <span className="sr-only">
              {verdict.met ? "Meets" : "Does not meet"}:{" "}
            </span>
            <span className="truncate">{verdict.label}</span>
          </Badge>
          <span
            className={cn(
              "min-w-0 leading-5",
              !verdict.met && "text-muted-foreground"
            )}
          >
            {verdict.evidence}
          </span>
        </li>
      ))}
    </ul>
  )
}
