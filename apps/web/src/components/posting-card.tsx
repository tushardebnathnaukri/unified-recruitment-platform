import { BuildingIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { REMOTE, type PostingDraft } from "@/lib/job-intake"

/**
 * The posting as a candidate would meet it: CleoDS's job card.
 *
 * FROM THE FIGMA DEV MODE MCP (CleoDS → Screens, node 5263:3766, 29 Sep
 * 2026): a 12px-padded row on a white card with `radius/xl` (20px) and
 * `elevation/2` (a 0 20 40 shadow at 4% black — a lift, not a hairline);
 * a 60×60 logo tile, white with a 1px #E9E9E9 border and 16px corners,
 * holding a 44×44 image at 10px; a 16px gap; then a column with 8px
 * between a 16px semibold title and a 14px medium grey line ("8-10 yrs ·
 * Bangalore / Gurugram", line-height 16, one line), and — from the live
 * app's list, which the Figma frame leaves off — a third, fainter line
 * with the posting date. That is the whole card: no chips, no pay, no
 * description. The type is Figtree there and
 * Inter here — the system's face, not the card's — and the greys are the
 * tokens the hexes stand for (#0E0F0C the foreground, #636361 the muted
 * foreground, #E9E9E9 the border). The shadow is written out because the
 * system has no elevation token yet; if one lands, it goes here.
 *
 * THE RAIL'S OTHER VIEW. The rows say what has been gathered; this says
 * what it will look like in a list. NOTHING INVENTED: the chat never asks
 * for a company, so the logo tile is empty rather than a made-up mark, and
 * a field not yet gathered is left out rather than filled in — the card is
 * only ever as complete as the posting, which is the point of looking at
 * it mid-conversation.
 */
export function PostingCard({
  draft,
  className,
}: {
  draft: PostingDraft
  className?: string
}) {
  const cities = draft.locations.filter((city) => city !== REMOTE)
  const where =
    draft.mode === "remote" && !cities.length ? "Remote" : cities.join(" / ")
  const years = draft.experience
    ? draft.experience.max === null
      ? `${draft.experience.min}+ yrs`
      : `${draft.experience.min}-${draft.experience.max} yrs`
    : null
  const meta = [years, where].filter(Boolean).join(" · ")

  return (
    <article
      aria-label="How the posting will look"
      className={cn(
        "flex items-start gap-4 rounded-[20px] bg-card p-3 shadow-[0_20px_40px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      {/* The company's logo, once there is a company — the chat never asks
          for one, so the tile stands empty rather than showing a mark that
          would be a guess. */}
      <span
        aria-hidden
        className="grid size-15 shrink-0 place-items-center rounded-[16px] border bg-background p-2"
      >
        {/* The 44×44 slot the logo would fill. */}
        <span className="grid size-11 place-items-center rounded-[10px] bg-muted text-muted-foreground/60">
          <BuildingIcon className="size-5" />
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="text-base leading-normal font-semibold text-foreground">
          {draft.title ?? (
            <span className="text-muted-foreground">Untitled role</span>
          )}
        </h3>
        {meta ? (
          <p className="truncate text-sm leading-4 font-medium whitespace-nowrap text-muted-foreground">
            {meta}
          </p>
        ) : null}
        {/* The list's third line is the posting date — "Posted 6 days ago"
            in the app. A draft has none, and says so. */}
        <p className="text-xs text-muted-foreground/70">Not posted yet</p>
      </div>
    </article>
  )
}
