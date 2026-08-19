import * as React from "react"
import { XIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Chip input for the form's list fields (locations, skills).
 *
 * The live form uses one of these for both, and it is the right control — but
 * it enforces "up to 3 locations" only in helper text. Here the limit is a
 * prop, and the field stops accepting input once it is reached rather than
 * failing on submit.
 */
export function TagInput({
  id,
  value,
  onChange,
  placeholder,
  max,
}: {
  id: string
  value: string[]
  onChange: (next: string[]) => void
  placeholder: string
  max?: number
}) {
  const [draft, setDraft] = React.useState("")
  const full = max !== undefined && value.length >= max

  function add() {
    const next = draft.trim()
    if (!next || full || value.includes(next)) return
    onChange([...value, next])
    setDraft("")
  }

  return (
    <div
      className={cn(
        "flex min-h-9 flex-wrap items-center gap-1.5 rounded-4xl border border-input bg-input/30 px-2 py-1.5",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
      )}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="rounded-full p-0.5 hover:bg-foreground/10"
          >
            <XIcon className="size-3" />
            <span className="sr-only">Remove {tag}</span>
          </button>
        </Badge>
      ))}

      <Input
        id={id}
        value={draft}
        disabled={full}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault()
            add()
          }
          if (event.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={add}
        placeholder={full ? "" : placeholder}
        className="h-6 min-w-32 flex-1 border-0 bg-transparent px-1.5 shadow-none focus-visible:border-0 focus-visible:ring-0"
      />
    </div>
  )
}
