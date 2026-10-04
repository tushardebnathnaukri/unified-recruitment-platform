import {
  CheckIcon,
  Maximize2Icon,
  Minimize2Icon,
  PhoneOffIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { AiTile } from "@/components/ai-agent/brief"
import { useAgent } from "@/components/ai-agent/shared"
import type { callOf, poolOf, transitOf } from "@/lib/ai-agent/view"

/**
 * The auto-advance countdown: "Role details done", or "Your role profile is
 * ready" before targeting — a few seconds to stay, or continue now.
 */
export function TransitDialog({
  transit,
}: {
  transit: NonNullable<ReturnType<typeof transitOf>>
}) {
  const jd = transit.kind !== "tgt"
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Moving to the next step"
        className="flex w-full max-w-[480px] animate-in flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-[0_24px_60px_color-mix(in_oklch,var(--foreground)_8%,transparent)] zoom-in-95 fade-in"
      >
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-1000 ease-linear"
            style={{ width: `${transit.bar}%` }}
          />
        </div>
        <div className="flex flex-col gap-4 px-6 py-5.5">
          <div className="flex items-center gap-3">
            <AiTile className="size-9 rounded-[11px]" iconClassName="size-4" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-lg font-semibold tracking-tight">
                {jd ? "Role details done" : "Your role profile is ready"}
              </span>
              <span className="text-[13px] text-muted-foreground">
                {jd
                  ? "Next: skills and your AI-drafted job description."
                  : "Next: I'll recommend targeting and find matching candidates."}
              </span>
            </div>
          </div>
          {jd ? (
            <div className="flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-[13px] font-semibold">
              <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <CheckIcon className="size-2.5" strokeWidth={3.5} />
              </span>
              <span className="min-w-0">{transit.line}</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-muted/60 px-3.5 py-3">
              {transit.items.map((item) => (
                <div key={item.k} className="flex min-w-0 flex-col">
                  <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {item.k}
                  </span>
                  <span className="truncate text-[13px] font-semibold">
                    {item.v}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <span className="flex-1 text-xs text-muted-foreground">
              {transit.count}
            </span>
            <Button variant="outline" size="sm" onClick={transit.stay}>
              {transit.editLabel}
            </Button>
            <Button size="sm" onClick={transit.go}>
              Continue now →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** The AI call, in the corner: connecting, live with the words coming in, ending. */
export function CallBox({
  call,
}: {
  call: NonNullable<ReturnType<typeof callOf>>
}) {
  const { brandName } = useAgent()
  return (
    <div
      role="dialog"
      aria-label="AI call"
      className={cn(
        "fixed right-6 bottom-6 z-50 flex animate-in flex-col gap-3.5 rounded-[22px] border border-border bg-background shadow-[0_16px_40px_color-mix(in_oklch,var(--foreground)_8%,transparent)] fade-in",
        call.minimised ? "w-[260px] px-4 py-3.5" : "w-[360px] px-5.5 py-5"
      )}
    >
      <button
        type="button"
        aria-label={call.minimised ? "Expand call" : "Minimise call"}
        onClick={call.toggleMin}
        className="absolute -top-2.5 -right-2.5 grid size-7 place-items-center rounded-full border bg-background text-muted-foreground shadow-sm"
      >
        {call.minimised ? (
          <Maximize2Icon className="size-3" />
        ) : (
          <Minimize2Icon className="size-3" />
        )}
      </button>
      <div className="flex items-center gap-3">
        <AiTile
          className={cn(
            "size-11 rounded-full",
            call.state === "connecting" && "animate-pulse",
            call.state === "live" && "ring-[5px] ring-muted"
          )}
          iconClassName="size-4.5"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-bold whitespace-nowrap">
            Your {brandName} AI Agent
          </span>
          <span
            className={cn(
              "text-[13px] tabular-nums",
              call.state === "live" ? "text-muted-foreground" : "text-primary",
              call.state === "connecting" && "animate-pulse"
            )}
          >
            {call.status}
          </span>
        </div>
      </div>
      {call.showText ? (
        <div className="flex max-h-24 flex-col gap-1.5 overflow-hidden rounded-xl bg-muted px-3 py-2.5 text-[12.5px] leading-normal">
          <span className="font-semibold text-primary">
            AI: Tell me about this role the way the hiring manager told you. Who
            would be ideal?
          </span>
          <span className="italic">{call.text}</span>
        </div>
      ) : null}
      {call.canEnd ? (
        <button
          type="button"
          onClick={call.end}
          className="flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-destructive text-[15px] font-bold text-background transition-opacity hover:opacity-90"
        >
          <PhoneOffIcon className="size-4.5" />
          End call
        </button>
      ) : null}
    </div>
  )
}

/** "Your talent pool": the count and its mix, shown on the candidates step. */
export function PoolCard({ pool }: { pool: ReturnType<typeof poolOf> }) {
  const { agent } = useAgent()
  return (
    <div
      role="status"
      aria-label="Talent pool"
      className="animate-in overflow-hidden rounded-2xl border border-border bg-linear-135 from-muted/60 to-background to-55% fade-in"
    >
      {pool.scanning ? (
        <div className="flex items-center gap-3.5 px-5 py-4">
          <span className="animate-pulse text-[13px] font-semibold whitespace-nowrap text-primary">
            Scanning active talent…
          </span>
          <div className="h-2 flex-1 animate-pulse rounded-full bg-linear-90 from-muted via-primary/10 to-muted" />
        </div>
      ) : null}
      {pool.paidView ? (
        <>
          <div className="grid @3xl/main:grid-cols-[minmax(220px,1.3fr)_repeat(3,minmax(0,1fr))]">
            <div
              className="flex flex-col gap-1 border-border/60 px-5 py-3.5 @3xl/main:border-r"
              title={pool.delta?.text}
            >
              <span className="text-[10.5px] font-bold tracking-wider text-primary uppercase">
                Your talent pool
              </span>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-3xl leading-none font-semibold tracking-tight text-primary">
                  {pool.poolFmt}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    pool.quality.tone === "good"
                      ? "bg-primary/10 text-primary"
                      : pool.quality.tone === "moderate"
                        ? "bg-warning/10 text-warning"
                        : "bg-destructive/10 text-destructive"
                  )}
                >
                  {pool.quality.label}
                </span>
              </div>
              <span className="text-[12.5px] leading-snug">
                active profiles match your current requirements
              </span>
            </div>
            <Stat
              label="IIM / IIT alumni"
              value={pool.iimPct}
              note={`${pool.iimFmt} profiles in your pool`}
            />
            <div className="flex flex-col gap-1.5 border-border/60 px-4 py-3.5 @3xl/main:border-r">
              <span className="text-[11.5px] font-semibold text-muted-foreground">
                From top companies
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-xl leading-none font-semibold"
                  title={pool.topCosTip}
                >
                  {pool.topCosPct}
                </span>
                <div className="flex items-center">
                  {pool.topCos.map((co, i) => (
                    <span
                      key={co.n}
                      tabIndex={0}
                      role="img"
                      title={co.tip}
                      aria-label={co.tip}
                      className={cn(
                        "grid size-6 place-items-center rounded-[7px] border-2 border-background text-[10px] font-bold text-background",
                        ["bg-chart-5", "bg-chart-4", "bg-chart-3"][i],
                        i && "-ml-1.5"
                      )}
                    >
                      {co.initials}
                    </span>
                  ))}
                </div>
              </div>
              <span className="truncate text-[11px] text-muted-foreground">
                {pool.topCosNames}
              </span>
            </div>
            <div
              className="flex flex-col gap-1.5 px-4 py-3.5"
              title={`Diversity split: women ${pool.femPct}%, men ${100 - pool.femPct}%`}
            >
              <span className="text-[11.5px] font-semibold text-muted-foreground">
                Diversity
              </span>
              <div className="flex items-baseline gap-2.5 text-[13px]">
                <span className="text-xl leading-none font-semibold text-primary">
                  {pool.femPct}%
                </span>
                <span className="text-muted-foreground">women</span>
              </div>
              <div
                aria-hidden="true"
                className="flex h-1.5 overflow-hidden rounded-full"
              >
                <div
                  className="h-full bg-primary"
                  style={{ width: `${pool.femPct}%` }}
                />
                <div
                  className="h-full bg-chart-3"
                  style={{ width: `${100 - pool.femPct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 border-t border-border/60 bg-background/60 px-5 py-2">
            <span className="flex-1 text-[11.5px] text-muted-foreground">
              Updates live as you change targeting and preferences
            </span>
          </div>
        </>
      ) : null}
      {pool.freeView ? (
        <div className="flex items-center gap-3.5 px-5 py-3.5">
          <span
            aria-hidden="true"
            className="text-2xl font-semibold blur-[6px] select-none"
          >
            {pool.poolFmt}
          </span>
          <span className="flex-1 text-[13px] font-semibold">
            active profiles · see your talent pool with paid posting
          </span>
          <button
            type="button"
            onClick={() => agent.toast("This would open Pro plans (/plans).")}
            className="text-[12.5px] font-semibold text-primary underline underline-offset-2"
          >
            Unlock
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Stat({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note: string
}) {
  return (
    <div className="flex flex-col gap-1.5 border-border/60 px-4 py-3.5 @3xl/main:border-r">
      <span className="text-[11.5px] font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="text-xl leading-none font-semibold">{value}</span>
      <span className="text-[11px] text-muted-foreground">{note}</span>
    </div>
  )
}
