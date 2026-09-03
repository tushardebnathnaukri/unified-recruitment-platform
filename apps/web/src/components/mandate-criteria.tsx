import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import type { Criterion } from "@/lib/mandate"
import { newCriterion } from "@/lib/mandate"

/**
 * The ranked criteria list — the soft half of a mandate.
 *
 * A criterion is a SENTENCE, not a keyword, and the order is meaningful: the
 * list runs most important to least. Both of those are the point. A keyword
 * cannot say "has run Kafka at scale, not just used it", and an unranked pile
 * gives the matcher no way to trade one miss against another — which is what a
 * recruiter does in their head on every profile.
 *
 * Reordering is buttons, not drag-and-drop. Drag is what the reference product
 * uses and it is nicer with a mouse, but it needs a library, it is a poor
 * keyboard experience, and a list this short is two clicks away from any
 * order you want. If the design review says the ranking is load-bearing enough
 * to deserve dragging, that is a finding worth having before the dependency.
 */
export function MandateCriteria({
  criteria,
  onChange,
}: {
  criteria: Criterion[]
  onChange: (next: Criterion[]) => void
}) {
  const move = (index: number, by: number) => {
    const next = [...criteria]
    const target = index + by
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {criteria.length > 1 && (
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Most important
        </p>
      )}

      {criteria.map((criterion, index) => (
        <div key={criterion.id} className="flex items-start gap-2">
          <span className="mt-2 w-4 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
            {index + 1}
          </span>

          <Textarea
            rows={2}
            value={criterion.text}
            aria-label={`Criterion ${index + 1}`}
            placeholder="The candidate has…"
            className="min-h-16 flex-1 text-sm"
            onChange={(event) =>
              onChange(
                criteria.map((c) =>
                  c.id === criterion.id ? { ...c, text: event.target.value } : c
                )
              )
            }
          />

          <div className="flex shrink-0 flex-col">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUpIcon />
              <span className="sr-only">Move criterion {index + 1} up</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={index === criteria.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDownIcon />
              <span className="sr-only">Move criterion {index + 1} down</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mt-0.5 shrink-0 text-muted-foreground"
            onClick={() =>
              onChange(criteria.filter((c) => c.id !== criterion.id))
            }
          >
            <XIcon />
            <span className="sr-only">Remove criterion {index + 1}</span>
          </Button>
        </div>
      ))}

      {criteria.length > 1 && (
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Least important
        </p>
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...criteria, newCriterion()])}
        >
          <PlusIcon data-icon="inline-start" />
          Add criterion
        </Button>
      </div>
    </div>
  )
}
