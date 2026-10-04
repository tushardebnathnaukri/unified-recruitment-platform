import { cn } from "@workspace/ui/lib/utils"

import { AiTile } from "@/components/ai-agent/brief"
import { useAgent } from "@/components/ai-agent/shared"
import { Button } from "@workspace/ui/components/button"
import { candidatesOf, type ProfileTag } from "@/lib/ai-agent/finish"
import type { Core } from "@/lib/ai-agent/view"

/**
 * Step 5, "I found these. Are they on target?" — what the agent is matching
 * on, then four sample candidates, each checked against it tag by tag.
 */
export function Candidates({ core }: { core: Core }) {
  const { agent } = useAgent()
  const view = candidatesOf(agent, core)

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold tracking-tight">
          I found these. Are they on target?
        </h3>
        <span className="text-[13px] text-muted-foreground">{view.intro}</span>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <AiTile className="size-6 rounded-lg" iconClassName="size-3" />
          <span className="mr-auto text-sm font-semibold">
            What I’m matching on
          </span>
          <button
            type="button"
            onClick={view.editTargeting}
            className="text-[13px] font-semibold text-primary underline-offset-2 hover:underline"
          >
            Edit in Targeting
          </button>
        </div>
        <span className="text-[13px] text-muted-foreground">{view.basics}</span>
        <div className="grid gap-4 @3xl/main:grid-cols-2">
          <ReqColumn title="MUST HAVE" must chips={view.must} />
          <ReqColumn title="GOOD TO HAVE" chips={view.good} />
        </div>
        <span className="text-xs text-muted-foreground">
          Each sample below is checked against these requirements.
        </span>
      </section>

      {view.ready ? (
        <div className="flex flex-col gap-3">
          {view.profiles.map((p) => (
            <article
              key={p.initials}
              className="flex animate-in flex-col gap-3 rounded-2xl border bg-background p-4 fade-in"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-[13px] font-bold">
                  {p.initials}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold">{p.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.meta}
                  </span>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                    p.tone === "strong"
                      ? "bg-success/10 text-success"
                      : p.tone === "good"
                        ? "bg-muted text-primary"
                        : "bg-warning/10 text-warning"
                  )}
                >
                  {p.label}
                </span>
              </div>
              <Tags tags={p.tags} />
              {p.mustTags.length ? (
                <TagRow label="MUST" tags={p.mustTags} />
              ) : null}
              {p.goodTags.length ? (
                <TagRow label="GOOD" tags={p.goodTags} />
              ) : null}
              <span className="text-[13px] font-semibold">{p.meets}</span>
              <span className="text-xs text-muted-foreground">{p.why}</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-36 animate-pulse rounded-2xl border border-border/60 bg-muted/40"
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/60 px-4 py-3">
        <span className="min-w-0 flex-1 text-[13px]">
          Not quite right? Change what you’re matching on, like must-haves,
          education or company background.
        </span>
        <Button variant="outline" size="sm" onClick={view.editTargeting}>
          Edit requirements in Targeting
        </Button>
      </div>
    </div>
  )
}

function ReqColumn({
  title,
  must,
  chips,
}: {
  title: string
  must?: boolean
  chips: { key: string; k: string; v: string; tip: string }[]
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span
        className={cn(
          "text-[11px] font-bold tracking-wider",
          must ? "text-primary" : "text-foreground"
        )}
      >
        {title}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip.key}
            title={chip.tip}
            className={cn(
              "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
              must
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background"
            )}
          >
            <span
              className={cn(
                "font-medium whitespace-nowrap",
                must ? "text-primary-foreground/75" : "text-muted-foreground"
              )}
            >
              {chip.k}
            </span>
            <span className="min-w-0 truncate">{chip.v}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function Tags({ tags }: { tags: ProfileTag[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.t}
          title={tag.src}
          className={cn(
            "inline-flex max-w-64 items-center truncate rounded-full px-2 py-0.5 text-[11px] font-semibold",
            tag.hit
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
          )}
        >
          {tag.t}
        </span>
      ))}
    </div>
  )
}

function TagRow({ label, tags }: { label: string; tags: ProfileTag[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10.5px] font-bold tracking-wider text-muted-foreground">
        {label}
      </span>
      <Tags tags={tags} />
    </div>
  )
}
