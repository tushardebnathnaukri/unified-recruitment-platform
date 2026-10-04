import * as React from "react"
import {
  CheckIcon,
  LoaderCircleIcon,
  PanelRightIcon,
  SparklesIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import { cn } from "@workspace/ui/lib/utils"

import { AgentPanel } from "@/components/ai-agent/agent-panel"
import { AiTile } from "@/components/ai-agent/brief"
import {
  CallBox,
  PoolCard,
  TransitDialog,
} from "@/components/ai-agent/overlays"
import {
  JobDescription,
  Screening,
} from "@/components/ai-agent/job-description"
import { RoleDetails } from "@/components/ai-agent/role-details"
import { Targeting } from "@/components/ai-agent/targeting"
import { Candidates } from "@/components/ai-agent/candidates"
import { useAgent } from "@/components/ai-agent/shared"
import { PHASE_BANNER } from "@/lib/ai-agent/data"
import {
  basicOf,
  callOf,
  jdOf,
  screenOf,
  coreOf,
  logOf,
  panelOf,
  poolOf,
  requirementsOf,
  stepsOf,
  transitOf,
} from "@/lib/ai-agent/view"

/**
 * The review stage — the five working steps (role details, JD, screening,
 * targeting, candidates) in one card, the step bar over them and the footer
 * under them, with the agent's panel beside. Below the two-column width the
 * panel is a drawer, opened from the button over the card.
 */
export function AgentReview() {
  const { agent, state } = useAgent()
  const [panelOpen, setPanelOpen] = React.useState(false)

  const core = coreOf(agent, state)
  const req = requirementsOf(agent, core)
  const steps = stepsOf(agent, core, req)
  const pool = poolOf(core)
  const panel = panelOf(agent, core, req)
  const log = logOf(agent, state)
  const transit = transitOf(agent, state)
  const call = callOf(agent, state)

  const fillProgress =
    Math.min(state.thinkStep, state.thinkSteps.length) +
    " of " +
    state.thinkSteps.length +
    " steps"

  return (
    <>
      <div className="mx-auto grid w-full max-w-[1400px] items-start gap-6 px-4 py-6 lg:px-8 @5xl/main:grid-cols-[minmax(0,1fr)_400px]">
        <section className="flex min-w-0 flex-col gap-4">
          {/* Below the two-column width the panel is a drawer. */}
          <Button
            variant="outline"
            size="sm"
            className="self-start @5xl/main:hidden"
            onClick={() => setPanelOpen(true)}
          >
            <PanelRightIcon data-icon="inline-start" />
            {panel.status}
          </Button>

          {state.filling ? (
            <div className="flex animate-in items-center gap-3 rounded-2xl border border-border bg-muted px-4 py-3 fade-in">
              <AiTile className="size-6.5 rounded-lg" iconClassName="hidden" />
              <LoaderCircleIcon className="-ml-[31px] size-3.5 animate-spin text-primary-foreground" />
              <span className="ml-1.5 text-sm font-semibold text-primary">
                {PHASE_BANNER[state.phase!] || ""}
              </span>
              <span className="ml-auto text-[13px] text-muted-foreground">
                {fillProgress}
              </span>
            </div>
          ) : null}

          {pool.show ? <PoolCard pool={pool} /> : null}

          <div className="overflow-clip rounded-2xl border bg-background">
            <nav
              aria-label="Job form steps"
              className="flex flex-wrap items-center gap-0.5 border-b px-3 py-2.5"
            >
              {steps.tabs.map((tab, i) => (
                <React.Fragment key={tab.k}>
                  <button
                    type="button"
                    disabled={tab.locked}
                    onClick={tab.go}
                    aria-current={tab.current ? "step" : undefined}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors disabled:cursor-default",
                      tab.current
                        ? "bg-primary/10 text-primary"
                        : tab.locked
                          ? "text-muted-foreground"
                          : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-5.5 place-items-center rounded-full text-[11px] font-bold",
                        tab.current || tab.done
                          ? "bg-primary text-primary-foreground"
                          : tab.locked
                            ? "bg-muted text-muted-foreground"
                            : "border bg-background"
                      )}
                    >
                      {tab.done ? (
                        <CheckIcon className="size-3" strokeWidth={3} />
                      ) : (
                        tab.n
                      )}
                    </span>
                    {tab.label}
                    {tab.ai ? (
                      <SparklesIcon
                        aria-label="AI-generated"
                        className="size-3 text-primary/70"
                      />
                    ) : null}
                    {tab.hasErr ? (
                      <span className="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-background">
                        {tab.errCount}
                      </span>
                    ) : null}
                  </button>
                  {i < steps.tabs.length - 1 ? (
                    <span aria-hidden="true" className="h-px w-4.5 bg-border" />
                  ) : null}
                </React.Fragment>
              ))}
            </nav>

            {state.tab === "basic" ? (
              <RoleDetails core={core} req={req} view={basicOf(agent, core)} />
            ) : state.tab === "jd" ? (
              <JobDescription req={req} view={jdOf(agent, core)} />
            ) : state.tab === "screen" ? (
              <Screening view={screenOf(agent, core)} />
            ) : state.tab === "addl" ? (
              <Targeting core={core} req={req} />
            ) : (
              <Candidates core={core} />
            )}
          </div>

          {/* The footer: where you are, what is still needed, and the way on. */}
          <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-4 rounded-2xl border bg-background px-4.5 py-3.5 shadow-[0_-4px_24px_color-mix(in_oklch,var(--foreground)_8%,transparent)]">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "text-sm font-bold whitespace-nowrap",
                    steps.reqTone === "ai"
                      ? "text-primary"
                      : steps.reqTone === "done"
                        ? "text-primary"
                        : "text-foreground"
                  )}
                >
                  {steps.reqTitle}
                </span>
                <div className="h-1.5 max-w-[220px] flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-400",
                      steps.reqTone === "done" ? "bg-primary" : "bg-primary"
                    )}
                    style={{ width: `${steps.reqBar}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {steps.fillSummary}
              </span>
              {steps.missing.length ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Still needed:
                  </span>
                  {steps.missing.map((missing) => (
                    <button
                      key={missing.label}
                      type="button"
                      onClick={missing.go}
                      className="min-h-7 rounded-full border border-destructive/25 bg-destructive/5 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      {missing.label} →
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <Button
              variant="outline"
              disabled={state.filling}
              onClick={steps.goBack}
            >
              {steps.backLabel}
            </Button>
            <Button disabled={state.filling} onClick={steps.goNext}>
              {steps.nextLabel}
            </Button>
          </div>
        </section>

        <aside className="sticky top-4 hidden max-h-[calc(100svh-var(--header-height)-2rem)] flex-col gap-3.5 self-start overflow-y-auto overscroll-contain pb-1 @5xl/main:flex">
          <AgentPanel panel={panel} log={log} />
        </aside>
      </div>

      <Drawer open={panelOpen} onOpenChange={setPanelOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Your agent</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <AgentPanel panel={panel} log={log} />
          </div>
        </DrawerContent>
      </Drawer>

      {transit ? <TransitDialog transit={transit} /> : null}
      {call ? <CallBox call={call} /> : null}
    </>
  )
}
