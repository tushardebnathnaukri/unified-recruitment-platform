import { CheckIcon, XIcon } from "lucide-react"

import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import {
  FieldError,
  FieldHead,
  Hint,
  HintChip,
  PickSelect,
  Tease,
} from "@/components/ai-agent/parts"
import {
  EXP_OPTIONS,
  SAL_OPTIONS,
  fieldState,
  useAgent,
} from "@/components/ai-agent/shared"
import { FN } from "@/lib/ai-agent/data"
import type { Core, Requirements, basicOf } from "@/lib/ai-agent/view"

/**
 * Step 1, "Confirm role details": title, company, locations, experience and
 * salary — each with where it came from, a lock, and the agent's insight
 * under it. Skills moved to the job-description step in the prototype.
 */
export function RoleDetails({
  core,
  req,
  view,
}: {
  core: Core
  req: Requirements
  view: ReturnType<typeof basicOf>
}) {
  const { agent, state } = useAgent()
  const { df, shown } = core
  const F = req.F
  const lock = (k: string) => ({
    tag: F[k].tag,
    locked: F[k].locked,
    lockLabel: FN[k],
    onToggleLock: () => agent.toggleLock(k),
  })

  return (
    <div className="flex flex-col gap-6.5 p-6">
      {/* The step band already names the step, so this says what to do on
          it — including what the lock beside each field is for, now that the
          lock only shows on the field you are pointing at. */}
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-base font-semibold">Check what I filled in</h2>
          <p className="text-sm text-muted-foreground">
            Each field says where it came from. Lock one and I’ll leave it
            alone.
          </p>
        </div>
        <div className="flex items-center gap-2.5 pt-0.5">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckIcon className="size-3" strokeWidth={2.5} />
            Auto-saved
          </span>
          {/* While the agent is still filling, the footer and its column
              say so; a red "Preparing…" here read as something wrong. */}
          {!state.filling ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                view.progressDone
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {view.progress}
            </span>
          ) : null}
        </div>
      </div>

      {/* Title */}
      <div className="group/field flex flex-col gap-2">
        <FieldHead
          htmlFor="f-title"
          label="Job title"
          required
          {...lock("title")}
        />
        <Input
          id="f-title"
          value={df.title}
          onChange={(event) => view.onTitle(event.target.value)}
          className={fieldState({ shown: F.title.shown, err: F.title.err })}
        />
        <FieldError show={F.title.err}>{F.title.errMsg}</FieldError>
        {view.showIns ? (
          view.title.hasAction ? (
            <Hint action="Use it" onApply={view.title.useBest}>
              {view.title.tip}
            </Hint>
          ) : (
            <Hint>{view.title.tip}</Hint>
          )
        ) : null}
        {view.showTease ? (
          <Tease onUnlock={view.upgrade}>
            Pro shows which title gets more applies
          </Tease>
        ) : null}
      </div>

      {/* Company */}
      <div className="group/field flex flex-col gap-2">
        <FieldHead
          htmlFor="f-company"
          label="Which company are you hiring for?"
          required
          {...lock("company")}
        />
        <Input
          id="f-company"
          value={df.company}
          onChange={(event) => view.onCompany(event.target.value)}
          className={fieldState({ shown: F.company.shown, err: F.company.err })}
        />
        <FieldError show={F.company.err}>{F.company.errMsg}</FieldError>
      </div>

      {/* Locations */}
      <div className="group/field flex flex-col gap-2">
        <FieldHead
          htmlFor="f-loc"
          label="Location"
          required
          extra="(up to 3)"
          {...lock("locations")}
        />
        <div
          className={cn(
            "flex min-h-9 flex-wrap items-center gap-1.5 rounded-3xl border border-input bg-input/30 px-2 py-1 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
            fieldState({ shown: F.locations.shown, err: F.locations.err })
          )}
        >
          {df.locations.map((n) => (
            <span
              key={n}
              className="inline-flex animate-in items-center gap-1 rounded-full border bg-muted py-1 pr-1 pl-2.5 text-[13px] fade-in"
            >
              {n}
              <button
                type="button"
                aria-label={`Remove ${n}`}
                onClick={() => view.removeLocation(n)}
                className="grid size-4.5 place-items-center rounded-full text-muted-foreground hover:bg-border hover:text-foreground"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
          <input
            id="f-loc"
            placeholder="+ Add location, press Enter"
            value={state.newLoc}
            onChange={(event) => agent.setState({ newLoc: event.target.value })}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              view.addTypedLocation(state.newLoc)
              agent.setState({ newLoc: "" })
            }}
            className="min-w-40 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <FieldError show={F.locations.err}>{F.locations.errMsg}</FieldError>
        {view.showIns ? (
          <Hint>
            {view.locTip}
            {view.cityTips.map((tip) => (
              <HintChip key={tip.n} onClick={tip.add} title={tip.tip}>
                + {tip.n} <span className="opacity-75">· {tip.gain}</span>
              </HintChip>
            ))}
          </Hint>
        ) : null}
        {view.showTease ? (
          <Tease onUnlock={view.upgrade}>
            Pro shows talent supply by city and allows 3 locations
          </Tease>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Experience */}
        <div className="group/field flex flex-col gap-2">
          <FieldHead label="Years of experience" required {...lock("exp")} />
          <div className="flex items-center gap-2">
            <PickSelect
              id="f-exp"
              label="Minimum experience"
              value={shown("exp") ? String(state.form!.expMin) : ""}
              options={EXP_OPTIONS}
              onChange={view.onExpMin}
              className={fieldState({ shown: F.exp.shown, err: F.exp.err })}
            />
            <span className="text-muted-foreground">to</span>
            <PickSelect
              label="Maximum experience"
              value={shown("exp") ? String(state.form!.expMax) : ""}
              options={[EXP_OPTIONS[0]].concat(EXP_OPTIONS.slice(2))}
              onChange={view.onExpMax}
              className={fieldState({ shown: F.exp.shown, err: false })}
            />
            <span className="text-muted-foreground">yrs</span>
          </div>
          <FieldError show={F.exp.err}>{F.exp.errMsg}</FieldError>
          {view.showIns ? (
            view.exp.hasAction ? (
              <Hint action="Apply" onApply={view.exp.apply}>
                {view.exp.insight}
              </Hint>
            ) : (
              <Hint>{view.exp.insight}</Hint>
            )
          ) : null}
        </div>

        {/* Salary */}
        <div className="group/field flex flex-col gap-2">
          <FieldHead
            label="Annual salary (₹ lakhs)"
            required
            {...lock("salary")}
          />
          <div className="flex items-center gap-2">
            <PickSelect
              id="f-sal"
              label="Minimum salary"
              value={df.salMin ? String(df.salMin) : ""}
              options={SAL_OPTIONS}
              onChange={view.onSalMin}
              className={fieldState({
                shown: F.salary.shown,
                err: F.salary.err,
              })}
            />
            <span className="text-muted-foreground">to</span>
            <PickSelect
              label="Maximum salary"
              value={df.salMax ? String(df.salMax) : ""}
              options={SAL_OPTIONS}
              onChange={view.onSalMax}
              className={fieldState({
                shown: F.salary.shown,
                err: F.salary.err,
              })}
            />
          </div>
          <FieldError show={F.salary.err}>{F.salary.errMsg}</FieldError>
          {view.showIns ? (
            view.salary.hasAction ? (
              <Hint
                oneLine
                title={view.salary.insightFull}
                action={view.salary.actionLabel}
                onApply={view.salary.apply}
              >
                {view.salary.insight}
              </Hint>
            ) : (
              <Hint oneLine title={view.salary.insightFull}>
                {view.salary.insight}
              </Hint>
            )
          ) : null}
          <label className="inline-flex cursor-pointer items-center gap-2 py-1.5 text-sm">
            <Checkbox
              checked={df.hideSalary}
              onCheckedChange={() => view.toggleHideSalary()}
            />
            Hide salary from candidates (we still match on it)
          </label>
        </div>
      </div>
    </div>
  )
}
