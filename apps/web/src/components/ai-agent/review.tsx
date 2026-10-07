import * as React from "react"
import {
  ArrowRightIcon,
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
 * targeting, candidates) as a workspace: a band of steps across the top, the
 * current step's card in a column that scrolls on its own, a footer docked
 * under it, and the agent's own column beside. Below the two-column width
 * the agent is a drawer, opened from the button at the end of the band.
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
  const curIdx = steps.tabs.findIndex((tab) => tab.current)

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* The five steps, as one band across the workspace. It sits outside
            the scrolling column, so it never scrolls away and the Targeting
            step's own sticky bar has the top of the column to itself. */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 lg:px-6">
          <nav
            aria-label="Job form steps"
            className="flex min-w-0 flex-1 [scrollbar-width:none] items-center gap-1 overflow-x-auto"
          >
            {steps.tabs.map((tab, i) => (
              <React.Fragment key={tab.k}>
                <button
                  type="button"
                  disabled={tab.locked}
                  onClick={tab.go}
                  aria-current={tab.current ? "step" : undefined}
                  title={tab.label}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-2 text-[13px] transition-colors disabled:cursor-default",
                    tab.current
                      ? "font-semibold text-foreground"
                      : tab.locked
                        ? "font-medium text-muted-foreground"
                        : "font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
                      tab.done
                        ? "bg-primary text-primary-foreground"
                        : tab.current
                          ? "bg-primary/10 text-primary ring-1 ring-primary"
                          : tab.locked
                            ? "bg-muted text-muted-foreground"
                            : "border bg-background"
                    )}
                  >
                    {tab.done ? (
                      <CheckIcon className="size-3.5" strokeWidth={3} />
                    ) : (
                      tab.n
                    )}
                  </span>
                  {/* Narrow, only the step you are on keeps its name. */}
                  <span
                    className={cn(
                      "whitespace-nowrap",
                      !tab.current && "hidden @4xl/main:inline"
                    )}
                  >
                    {tab.label}
                  </span>
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
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-px min-w-3 flex-1 transition-colors",
                      i < curIdx ? "bg-primary/40" : "bg-border"
                    )}
                  />
                ) : null}
              </React.Fragment>
            ))}
          </nav>

          {/* Below the two-column width the agent is a drawer. */}
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 @5xl/main:hidden"
            title={panel.status}
            onClick={() => setPanelOpen(true)}
          >
            <PanelRightIcon data-icon="inline-start" />
            Agent
            {!panel.filling && panel.todo.length ? (
              <span className="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-background">
                {panel.todo.length}
              </span>
            ) : null}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4 px-4 py-6 lg:px-6">
            {/* Beside the agent's column its checklist says this; without the
                column, this line is the only sign it is working. */}
            {state.filling ? (
              <div className="flex animate-in items-center gap-3 rounded-2xl border bg-background px-4 py-3 fade-in @5xl/main:hidden">
                <LoaderCircleIcon className="size-4 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  {PHASE_BANNER[state.phase!] || ""}
                </span>
                <span className="ml-auto text-[13px] text-muted-foreground tabular-nums">
                  {fillProgress}
                </span>
              </div>
            ) : null}

            {pool.show ? <PoolCard pool={pool} /> : null}

            <div className="overflow-clip rounded-2xl border bg-background">
              {state.tab === "basic" ? (
                <RoleDetails
                  core={core}
                  req={req}
                  view={basicOf(agent, core)}
                />
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
          </div>
        </div>

        {/* The footer, docked under the column: what this step still needs,
            and the way on. The step band above already says where you are. */}
        <div className="shrink-0 border-t bg-background">
          <div className="mx-auto flex w-full max-w-[880px] flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3 lg:px-6">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {state.filling ? (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                  <LoaderCircleIcon className="size-3.5 animate-spin" />
                  {steps.reqTitle}
                </span>
              ) : steps.missing.length ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-0.5 text-sm font-medium">
                    Still needed
                  </span>
                  {steps.missing.map((missing) => (
                    <button
                      key={missing.label}
                      type="button"
                      onClick={missing.go}
                      className="inline-flex min-h-7 items-center gap-1 rounded-full border border-destructive/25 bg-destructive/5 px-2.5 py-0.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      {missing.label}
                      <ArrowRightIcon className="size-3" />
                    </button>
                  ))}
                </div>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <span className="grid size-4.5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="size-3" strokeWidth={3} />
                  </span>
                  All set on this step
                </span>
              )}
              {!state.filling ? (
                <span className="text-xs text-muted-foreground">
                  {steps.fillSummary}
                </span>
              ) : null}
            </div>
            <Button
              variant="ghost"
              disabled={state.filling}
              onClick={steps.goBack}
            >
              {steps.backLabel}
            </Button>
            <Button disabled={state.filling} onClick={steps.goNext}>
              {steps.nextLabel}
            </Button>
          </div>
        </div>
      </div>

      {/* The agent's column: flush, white and full height, like the rails
          elsewhere in the app, scrolling on its own. */}
      <aside className="hidden w-[380px] shrink-0 flex-col overflow-y-auto overscroll-contain border-l bg-background @5xl/main:flex">
        <AgentPanel panel={panel} log={log} />
      </aside>

      <Drawer open={panelOpen} onOpenChange={setPanelOpen}>
        <DrawerContent>
          <DrawerHeader className="sr-only">
            <DrawerTitle>Your agent</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto">
            <AgentPanel panel={panel} log={log} />
          </div>
        </DrawerContent>
      </Drawer>

      {transit ? <TransitDialog transit={transit} /> : null}
      {call ? <CallBox call={call} /> : null}
    </>
  )
}
