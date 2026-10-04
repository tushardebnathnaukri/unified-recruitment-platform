import {
  ArrowLeftIcon,
  BriefcaseIcon,
  CheckIcon,
  FileTextIcon,
  ListFilterIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { cn } from "@workspace/ui/lib/utils"

import { AiTile } from "@/components/ai-agent/brief"
import { useAgent } from "@/components/ai-agent/shared"
import {
  doneOf,
  offersOf,
  previewOf,
  type AgentKind,
} from "@/lib/ai-agent/finish"
import { coreOf } from "@/lib/ai-agent/view"

/**
 * After the five steps: the review ("What candidates will see", with a bar
 * to go back or on), then "Choose how your agents source". One centred
 * column, the agent panel left behind, as the prototype draws it.
 */
export function AgentPreview() {
  const { agent, state } = useAgent()
  const core = coreOf(agent, state)
  const view = previewOf(agent, core)
  return view.decide ? (
    <AgentDecide />
  ) : (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 py-6 lg:px-8">
      <article className="flex flex-col gap-4 rounded-2xl border bg-background p-6 @3xl/main:p-8">
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          What candidates will see
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{view.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
          <span className="font-semibold">{view.company}</span>
          <span className="text-muted-foreground">{view.loc}</span>
          <span className="text-muted-foreground">{view.exp}</span>
          <span className="text-muted-foreground">{view.sal}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {view.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
        <div className="h-px bg-border" />
        <div className="text-sm leading-relaxed whitespace-pre-line">
          {view.jd}
        </div>
        {view.jdFile ? (
          <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-[13px]">
            <FileTextIcon className="size-4 text-muted-foreground" />
            {view.jdFile}
            <span className="text-muted-foreground">· full JD attached</span>
          </div>
        ) : null}
        {view.screening.length ? (
          <div className="flex flex-col gap-1.5 rounded-xl bg-muted/60 px-4 py-3 text-[13px]">
            <span className="font-semibold">
              Candidates answer before applying
            </span>
            {view.screening.map((q) => (
              <span key={q}>• {q}</span>
            ))}
          </div>
        ) : null}
      </article>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border bg-background px-4.5 py-3.5 shadow-[0_-4px_24px_color-mix(in_oklch,var(--foreground)_8%,transparent)]">
        <AiTile className="size-7 rounded-lg" iconClassName="size-3.5" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">
            Your job is ready to review
          </span>
          <span className="text-xs text-muted-foreground">
            This is what candidates will see. Go back to any step to change it.
          </span>
        </div>
        <Button variant="outline" onClick={view.backToCandidates}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back to candidates
        </Button>
        <Button onClick={view.goDecide}>
          Looks good · Choose how to source →
        </Button>
      </div>
    </div>
  )
}

const AGENT_ICON: Record<AgentKind, LucideIcon> = {
  Posting: BriefcaseIcon,
  Promotion: TrendingUpIcon,
  Sourcing: SearchIcon,
  Screening: ListFilterIcon,
  Outreach: SendIcon,
}

/** An agent's mark: posting in the brand, the rest in the AI gradient. */
function AgentMark({ kind, size }: { kind: AgentKind; size: "sm" | "lg" }) {
  const Icon = AGENT_ICON[kind]
  return (
    <span
      title={kind + " Agent"}
      className={cn(
        "grid shrink-0 place-items-center rounded-full text-primary-foreground",
        kind === "Posting"
          ? "bg-primary text-primary-foreground"
          : "bg-primary",
        size === "lg" ? "size-8.5 shadow-sm" : "size-5.5"
      )}
    >
      <Icon className={size === "lg" ? "size-4" : "size-3"} />
    </span>
  )
}

/** "Choose how your agents source": the three offers as an accordion. */
function AgentDecide() {
  const { agent, state, brandName } = useAgent()
  const core = coreOf(agent, state)
  const preview = previewOf(agent, core)
  const view = offersOf(agent, core)
  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-4 py-6 lg:px-8">
      <button
        type="button"
        onClick={preview.goReview}
        className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-primary hover:underline"
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to review
      </button>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Choose how your agents source
        </h2>
        <span className="text-[13px] text-muted-foreground">
          ✦ Managed by your {brandName} AI Agent · you can switch or add agents
          later.
        </span>
      </div>

      <div role="radiogroup" className="flex flex-col gap-3 pt-2">
        {view.offers.map((offer) => (
          <section
            key={offer.k}
            role="radio"
            aria-checked={offer.focused}
            tabIndex={offer.focused ? -1 : 0}
            onClick={offer.select}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                offer.select()
              }
            }}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-background transition-shadow",
              offer.focused
                ? cn(
                    "gap-3 p-4.5",
                    offer.hl
                      ? "border-2 border-primary bg-linear-180 from-muted/50 to-background shadow-[0_10px_28px_color-mix(in_oklch,var(--foreground)_8%,transparent)]"
                      : offer.ai
                        ? "border-border bg-linear-180 from-muted/40 to-background"
                        : "border-primary/30"
                  )
                : "cursor-pointer gap-2.5 px-4 py-3 opacity-85 hover:opacity-100"
            )}
          >
            {offer.badge ? (
              <span
                className={cn(
                  "absolute left-4 rounded-full bg-primary font-extrabold text-primary-foreground",
                  offer.focused
                    ? "-top-2.75 px-2.5 py-0.5 text-[11px]"
                    : "-top-2.25 px-2 py-px text-[10px]"
                )}
              >
                {offer.badge}
              </span>
            ) : null}
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-7.5 shrink-0 place-items-center rounded-[9px]",
                  offer.ai
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary text-primary-foreground"
                )}
              >
                <SparklesIcon className="size-3.5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-semibold">{offer.title}</span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    offer.ai ? "text-primary" : "text-primary"
                  )}
                >
                  {offer.tag}
                </span>
              </div>
              {!offer.focused ? (
                <>
                  <div className="hidden items-center gap-1 sm:flex">
                    {offer.nodes.map((node) => (
                      <AgentMark key={node.l} kind={node.l} size="sm" />
                    ))}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {offer.nodeCount}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={"Select " + offer.title}
                    onClick={(event) => {
                      event.stopPropagation()
                      offer.select()
                    }}
                  >
                    Select ▾
                  </Button>
                </>
              ) : null}
            </div>
            {offer.focused ? (
              <div className="flex animate-in flex-col gap-3 fade-in">
                <span className="text-[13px]">{offer.line}</span>
                <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-1.5 animate-pulse rounded-full bg-primary"
                    />
                    <span className="text-[11px] font-bold tracking-wider text-primary">
                      {offer.teamHead}
                    </span>
                  </div>
                  <div className="flex items-start justify-around gap-1">
                    {offer.nodes.map((node) => (
                      <div key={node.l} className="flex flex-1 items-start">
                        <div className="flex flex-1 flex-col items-center gap-1.5">
                          <AgentMark kind={node.l} size="lg" />
                          <span className="text-[11px] font-semibold">
                            {node.l}
                          </span>
                        </div>
                        {node.arrow ? (
                          <span
                            aria-hidden="true"
                            className="mt-4 h-px w-6 shrink-0 border-t border-dashed border-border"
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{offer.teamSub}</span>
                  <button
                    type="button"
                    aria-expanded={offer.more}
                    onClick={(event) => {
                      event.stopPropagation()
                      offer.toggleMore()
                    }}
                    className="font-semibold text-primary underline underline-offset-2"
                  >
                    {offer.moreLabel}
                  </button>
                </div>
                {offer.more ? (
                  <div className="flex animate-in flex-col gap-2.5 rounded-xl bg-muted/60 px-3.5 py-3 fade-in">
                    {offer.agents.map((a) => (
                      <div key={a.n} className="flex items-start gap-2">
                        <span className="mt-px grid size-4.5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                          <CheckIcon className="size-2.5" strokeWidth={3} />
                        </span>
                        <span className="flex flex-col">
                          <span className="text-[13px] font-semibold">
                            {a.n}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {a.d}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <span className="text-[13px]">
                  <b className="text-primary">{offer.reach}</b>{" "}
                  <span className="text-muted-foreground">
                    {offer.reachNote}
                  </span>
                </span>
                <Button
                  variant="default"
                  className="self-start"
                  onClick={(event) => {
                    event.stopPropagation()
                    offer.go()
                  }}
                >
                  {offer.cta}
                </Button>
              </div>
            ) : null}
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px]">
          <Checkbox
            checked={view.linkedin}
            disabled={view.linkedinLocked}
            onCheckedChange={view.toggleLinkedin}
          />
          {view.linkedinLabel} · for posted jobs
        </label>
        <span className="flex-1" />
        <button
          type="button"
          onClick={view.postBasic}
          className="text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:underline"
        >
          Or post with basic reach →
        </button>
      </div>
    </div>
  )
}

/** The job is live (or the profiles are ready): two ways on. */
export function AgentDone() {
  const { agent, state } = useAgent()
  const view = doneOf(agent, coreOf(agent, state))
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-20">
      <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
        <CheckIcon className="size-5" strokeWidth={2.5} />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">{view.title}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {view.text}
      </p>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button onClick={view.again}>Start another role</Button>
        <Button variant="outline" onClick={view.explore}>
          Explore recommended candidates
        </Button>
      </div>
    </div>
  )
}
