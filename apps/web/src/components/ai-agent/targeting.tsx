import * as React from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  HistoryIcon,
  InfoIcon,
  LoaderCircleIcon,
  MicIcon,
  PencilIcon,
  PhoneIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import { AiTile, Wave } from "@/components/ai-agent/brief"
import {
  CalcMark,
  HintChip,
  PickSelect,
  SourceChip,
} from "@/components/ai-agent/parts"
import {
  EXP_OPTIONS,
  SAL_OPTIONS,
  useAgent,
} from "@/components/ai-agent/shared"
import {
  conversationOf,
  editorsOf,
  rowsOf,
  understoodOf,
} from "@/lib/ai-agent/targeting"
import type { Core, Requirements } from "@/lib/ai-agent/view"
import { basicOf, jdOf } from "@/lib/ai-agent/view"

/**
 * Step 4, targeting — the prototype's conversation over the requirements:
 * "Here's what I understood" (the role in one line, the MUST HAVE and GOOD
 * TO HAVE rows, the editors behind them), then the hiring manager's brief as
 * a voice note or a call, then either what is still missing or the way on to
 * sample candidates. Copy is the prototype's.
 */
export function Targeting({ core, req }: { core: Core; req: Requirements }) {
  const { agent } = useAgent()
  const understood = understoodOf(agent, core)
  const rows = rowsOf(agent, core)
  const editors = editorsOf(agent, core, req)
  const conv = conversationOf(agent, core)

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      {conv.waiting ? (
        <div className="flex items-center gap-2.5 text-sm text-primary">
          <AiTile className="size-6 rounded-lg" iconClassName="size-3" />
          <span className="animate-pulse font-semibold">
            Working out who you need…
          </span>
        </div>
      ) : null}

      {conv.cv1 ? (
        <section className="flex animate-in flex-col gap-4 rounded-2xl border border-border/70 bg-muted/30 p-4 fade-in">
          <div className="flex items-start gap-2.5">
            <AiTile className="size-6 rounded-lg" iconClassName="size-3" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-semibold">
                Here’s what I understood
              </span>
              <span className="text-xs text-muted-foreground">
                Must-haves come from your JD or you. Good-to-haves are AI
                suggestions that help rank candidates.
              </span>
            </div>
          </div>

          {/* The role in one line. */}
          <div className="flex items-center gap-2 rounded-xl bg-muted/70 px-3.5 py-2.5">
            <span
              title={understood.line}
              className="min-w-0 flex-1 truncate text-[13px] font-semibold"
            >
              {understood.line}
            </span>
            {understood.edited ? (
              <span
                title="Edited by you"
                className="size-1.5 shrink-0 rounded-full bg-primary"
              />
            ) : null}
            <Button
              variant="ghost"
              size="xs"
              className="text-primary"
              onClick={() => understood.open("all")}
            >
              <PencilIcon data-icon="inline-start" />
              Edit
            </Button>
          </div>
          {understood.editing && !understood.slim ? (
            <RoleEditor core={core} />
          ) : null}

          <RequirementRow
            bucket="must"
            title="MUST HAVE"
            sub="From your JD or you · filters"
            chips={rows.must}
            add={rows.addMust}
            addOpen={rows.menuAdd === "m"}
            setAddOpen={(open) => rows.setMenuAdd(open ? "m" : null)}
            noUnused={rows.noUnused}
            onDrop={(k) => rows.drop("must", k)}
          />
          <RequirementRow
            bucket="good"
            title="GOOD TO HAVE"
            sub="Added by AI · ranks higher"
            chips={rows.good}
            add={rows.addGood}
            addOpen={rows.menuAdd === "g"}
            setAddOpen={(open) => rows.setMenuAdd(open ? "g" : null)}
            noUnused={rows.noUnused}
            onDrop={(k) => rows.drop("good", k)}
          />

          {rows.pair ? <PairEditor pair={rows.pair} /> : null}

          {rows.rmToast ? (
            <Strip text={rows.rmToast} onUndo={rows.rmUndo} />
          ) : null}
          <p className="text-xs text-muted-foreground @3xl/main:pl-[122px]">
            Tap a requirement to edit or move it · × removes it · or drag it to
            the other row.
          </p>
          {rows.moveLine ? (
            <Strip text={rows.moveLine} onUndo={rows.undoMove} />
          ) : null}
          {rows.screenNote ? (
            <span className="text-xs text-muted-foreground">
              Its screening question is kept. Remove it on Step 3 if it no
              longer applies.
            </span>
          ) : null}
          {rows.guard ? (
            <div className="flex animate-in flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground fade-in">
              <span>{rows.guard.text}</span>
              <HintChip onClick={rows.guard.move}>Move</HintChip>
            </div>
          ) : null}

          {editors.open ? <TargetEditor editors={editors} /> : null}
        </section>
      ) : null}

      <SlimBar core={core} understood={understood} />

      {conv.cv2 ? (
        <>
          <AgentSays>
            Get sharper matches: share the hiring manager’s brief or any
            requirement the JD doesn’t cover.
          </AgentSays>
          <VoiceCard voice={conv.voice} />
        </>
      ) : null}

      {conv.askMore ? (
        <div className="flex animate-in flex-col gap-3 fade-in">
          <AgentSays>
            Before I look for candidates, I still need a little more:
          </AgentSays>
          <div className="flex flex-wrap gap-2 pl-9">
            {conv.missing.map((m) => (
              <Button key={m.label} variant="outline" size="sm" onClick={m.go}>
                {m.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {conv.allSet ? (
        <div className="flex animate-in flex-col gap-3 fade-in">
          <AgentSays>
            That’s everything I need. Next, I’ll show sample candidates checked
            against your must-haves and good-to-haves.
          </AgentSays>
          <Button className="ml-9 self-start" onClick={conv.seeCandidates}>
            See sample candidates →
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/** One line from the agent, with its tile. */
function AgentSays({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex animate-in items-start gap-2.5 fade-in">
      <AiTile className="size-6 rounded-lg" iconClassName="size-3" />
      <p className="pt-0.5 text-sm leading-relaxed">{children}</p>
    </div>
  )
}

/** "Removed Similar companies · Undo", "Moved Skills to Good to have · pool …". */
function Strip({ text, onUndo }: { text: string; onUndo: () => void }) {
  return (
    <div
      role="status"
      className="flex animate-in items-center gap-3 rounded-xl bg-muted/70 px-3.5 py-2 text-[13px] fade-in"
    >
      <span className="min-w-0 flex-1">{text}</span>
      <button
        type="button"
        onClick={onUndo}
        className="font-semibold text-primary underline underline-offset-2"
      >
        Undo
      </button>
    </div>
  )
}

/** Chips with a text box after them: Enter adds what was typed. */
function ChipInput({
  id,
  label,
  chips,
  onRemove,
  value,
  onChange,
  onEnter,
  placeholder,
}: {
  id?: string
  label: string
  chips: string[]
  onRemove: (chip: string) => void
  value: string
  onChange: (value: string) => void
  onEnter: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-3xl border border-input bg-input/30 px-2 py-1 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      {chips.map((chip) => (
        <span
          key={chip}
          className="inline-flex animate-in items-center gap-1 rounded-full border bg-muted py-1 pr-1 pl-2.5 text-[13px] fade-in"
        >
          {chip}
          <button
            type="button"
            aria-label={`Remove ${chip}`}
            onClick={() => onRemove(chip)}
            className="grid size-4.5 place-items-center rounded-full text-muted-foreground hover:bg-border hover:text-foreground"
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          onEnter(value)
        }}
        className="min-w-40 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

/** The role-detail editor, opened from the one-line summary or the slim bar. */
function RoleEditor({ core }: { core: Core }) {
  const { agent, state } = useAgent()
  const understood = understoodOf(agent, core)
  const basic = basicOf(agent, core)
  const jd = jdOf(agent, core)
  const f = state.form!
  const exp = core.shown("exp")

  return (
    <div
      role="group"
      aria-label={understood.title}
      className="flex animate-in flex-col gap-4 rounded-xl border bg-background p-4 fade-in"
    >
      <span className="text-sm font-semibold">{understood.title}</span>
      {understood.editRole ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Labelled label="Job title">
            <Input
              aria-label="Job title"
              value={f.title}
              onChange={(event) => basic.onTitle(event.target.value)}
            />
          </Labelled>
          <Labelled label="Company">
            <Input
              aria-label="Company"
              value={f.company}
              onChange={(event) => basic.onCompany(event.target.value)}
            />
          </Labelled>
        </div>
      ) : null}
      {understood.editWhere ? (
        <>
          <Labelled label="Location">
            <ChipInput
              label="Add location"
              chips={f.locations}
              onRemove={basic.removeLocation}
              value={state.newLoc}
              onChange={(value) => agent.setState({ newLoc: value })}
              onEnter={(value) => {
                basic.addTypedLocation(value)
                agent.setState({ newLoc: "" })
              }}
              placeholder="+ Add location, press Enter"
            />
            {basic.cityTips.length ? (
              <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                <span>{basic.locTip}</span>
                {basic.cityTips.map((tip) => (
                  <HintChip key={tip.n} onClick={tip.add} title={tip.tip}>
                    + {tip.n} <span className="opacity-75">· {tip.gain}</span>
                  </HintChip>
                ))}
              </div>
            ) : null}
          </Labelled>
          <div className="grid gap-3 sm:grid-cols-2">
            <Labelled label="Experience (yrs)">
              <div className="flex items-center gap-2">
                <PickSelect
                  label="Minimum experience"
                  value={exp ? String(f.expMin) : ""}
                  options={EXP_OPTIONS}
                  onChange={basic.onExpMin}
                />
                <span className="text-muted-foreground">to</span>
                <PickSelect
                  label="Maximum experience"
                  value={exp ? String(f.expMax) : ""}
                  options={[EXP_OPTIONS[0]].concat(EXP_OPTIONS.slice(2))}
                  onChange={basic.onExpMax}
                />
              </div>
            </Labelled>
            <Labelled label="Salary (₹ lakhs)">
              <div className="flex items-center gap-2">
                <PickSelect
                  label="Minimum salary"
                  value={f.salMin ? String(f.salMin) : ""}
                  options={SAL_OPTIONS}
                  onChange={basic.onSalMin}
                />
                <span className="text-muted-foreground">to</span>
                <PickSelect
                  label="Maximum salary"
                  value={f.salMax ? String(f.salMax) : ""}
                  options={SAL_OPTIONS}
                  onChange={basic.onSalMax}
                />
              </div>
            </Labelled>
          </div>
        </>
      ) : null}
      {understood.editSkills ? (
        <Labelled label="Skills (at least 3)">
          <ChipInput
            label="Add skill"
            chips={jd.skills}
            onRemove={jd.removeSkill}
            value={state.newSkill}
            onChange={(value) => agent.setState({ newSkill: value })}
            onEnter={jd.addTypedSkill}
            placeholder="+ Add skill, press Enter"
          />
          {jd.suggest.length ? (
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
              <span>Suggested:</span>
              {jd.suggest.map((skill) => (
                <HintChip key={skill.n} onClick={skill.add}>
                  + {skill.n}
                </HintChip>
              ))}
            </div>
          ) : null}
        </Labelled>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-xs text-destructive">
          {understood.err}
        </span>
        <Button variant="outline" size="sm" onClick={understood.cancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={understood.saveDisabled}
          onClick={understood.save}
        >
          Save
          <CheckIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}

function Labelled({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

type RowChip = ReturnType<typeof rowsOf>["must"][number]

/**
 * One of the two rows: the heading on the left, the chips on the right, a
 * drop target for a chip dragged from the other row, and "+ Add ▾" for what
 * is not set yet.
 */
function RequirementRow({
  bucket,
  title,
  sub,
  chips,
  add,
  addOpen,
  setAddOpen,
  noUnused,
  onDrop,
}: {
  bucket: "must" | "good"
  title: string
  sub: string
  chips: RowChip[]
  add: { label: string; go: () => void }[]
  addOpen: boolean
  setAddOpen: (open: boolean) => void
  noUnused: boolean
  onDrop: (k: string) => void
}) {
  const [over, setOver] = React.useState(false)
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        const k = event.dataTransfer.getData("text/plain")
        if (k) onDrop(k)
      }}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-border/70 pt-4 transition-colors @3xl/main:grid-cols-[106px_minmax(0,1fr)]",
        over && "bg-muted/60"
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span
          className={cn(
            "text-[11px] font-bold tracking-wider",
            bucket === "must" ? "text-primary" : "text-foreground"
          )}
        >
          {title}
        </span>
        <span className="text-[11px] leading-snug text-muted-foreground">
          {sub}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <RequirementChip key={chip.key} chip={chip} />
        ))}
        <DropdownMenu open={addOpen} onOpenChange={setAddOpen}>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="inline-flex min-h-7 items-center gap-1 rounded-full border border-dashed border-border px-2.5 text-xs font-semibold text-primary hover:bg-muted"
              />
            }
          >
            + Add
            <ChevronDownIcon className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-48">
            {add.map((item) => (
              <DropdownMenuItem key={item.label} onClick={item.go}>
                {item.label}
              </DropdownMenuItem>
            ))}
            {noUnused ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Everything is already added
              </div>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/**
 * A requirement: "FUNCTION  B2B Sales › Enterprise ▾  ×". Must-haves are
 * filled in the AI colour, good-to-haves are outlined. The body opens a menu
 * to edit, move or remove it; it drags to the other row.
 */
function RequirementChip({ chip }: { chip: RowChip }) {
  return (
    <span
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", chip.key)
        event.dataTransfer.effectAllowed = "move"
      }}
      className={cn(
        "inline-flex max-w-full animate-in cursor-grab items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-3 text-[13px] font-semibold fade-in",
        chip.must
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground",
        chip.active && "ring-[3px] ring-primary/25"
      )}
    >
      <DropdownMenu open={chip.open} onOpenChange={chip.setOpen}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              title={chip.tip}
              className="inline-flex min-w-0 items-center gap-1.5 text-left"
            />
          }
        >
          <span
            className={cn(
              "text-[10.5px] font-extrabold tracking-wider uppercase",
              chip.must ? "text-primary-foreground/75" : "text-muted-foreground"
            )}
          >
            {chip.k}
          </span>
          <span className="min-w-0 truncate">{chip.v}</span>
          <ChevronDownIcon className="size-3 shrink-0 opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{chip.tip}</DropdownMenuLabel>
            <DropdownMenuItem onClick={chip.edit}>
              <PencilIcon />
              Edit {chip.kl}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={chip.move}>
              {chip.must ? <ArrowDownIcon /> : <ArrowUpIcon />}
              {chip.moveTip}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={chip.del}>
              <Trash2Icon />
              Remove
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <span
        aria-hidden="true"
        className={cn(
          "h-3.5 w-px",
          chip.must ? "bg-primary-foreground/35" : "bg-border"
        )}
      />
      <button
        type="button"
        onClick={chip.del}
        aria-label={`Remove ${chip.k}`}
        title="Remove"
        className={cn(
          "grid size-5 place-items-center rounded-full",
          chip.must
            ? "hover:bg-primary-foreground/15"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <XIcon className="size-3" />
      </button>
    </span>
  )
}

/** Function › Specialisation, or Industry › Segment: the second follows the first. */
function PairEditor({
  pair,
}: {
  pair: NonNullable<ReturnType<typeof rowsOf>["pair"]>
}) {
  const opts = (list: string[]) => list.map((o) => ({ v: o, l: o }))
  return (
    <div className="flex animate-in flex-col gap-3 rounded-xl border bg-background p-4 fade-in">
      <span className="text-sm font-semibold">{pair.title}</span>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">
            {pair.l1}
          </span>
          <PickSelect
            label={pair.l1}
            value={pair.v1}
            options={opts(pair.o1)}
            onChange={pair.on1}
          />
        </div>
        <span className="pb-2 text-muted-foreground">›</span>
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">
            {pair.l2}
          </span>
          <PickSelect
            label={pair.l2}
            value={pair.v2}
            options={opts(pair.o2)}
            onChange={pair.on2}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-xs text-muted-foreground">
          {pair.hint}
        </span>
        <Button variant="outline" size="sm" onClick={pair.cancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={pair.save}>
          Save
        </Button>
      </div>
    </div>
  )
}

type Editors = ReturnType<typeof editorsOf>

/** "Editing · Companies": the panel under the rows for one requirement. */
function TargetEditor({ editors }: { editors: Editors }) {
  return (
    <div className="flex animate-in flex-col gap-4 rounded-xl border bg-background p-4 fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto text-sm font-semibold">
          Editing · {editors.title}
        </span>
        {editors.canMove ? (
          <Button variant="outline" size="sm" onClick={editors.move}>
            {editors.moveLabel}
          </Button>
        ) : null}
        <Button size="sm" onClick={editors.done}>
          Done
        </Button>
      </div>
      {editors.open === "class" ? <ClassEditor editors={editors} /> : null}
      {editors.open === "co" ? <CompanyEditor editors={editors} /> : null}
      {editors.open === "inst" ? <CollegeEditor editors={editors} /> : null}
      {editors.open === "pref" ? <PrefEditor editors={editors} /> : null}
    </div>
  )
}

/** Label on the left, control on the right, as the prototype's editors lay out. */
function EdRow({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-x-4 gap-y-1.5 @3xl/main:grid-cols-[120px_minmax(0,1fr)]">
      <label
        htmlFor={htmlFor}
        className="pt-2 text-[13px] font-semibold text-foreground/80"
      >
        {label}
      </label>
      <div className="flex min-w-0 flex-col gap-2">{children}</div>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>
}

/** "Remembered from your past jobs" — and the way to stop it. */
function PastBanner({ onForget }: { onForget: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/70 px-3.5 py-2.5 text-[13px]">
      <HistoryIcon className="size-4 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        Remembered from your past jobs. These don't depend on the role, so AI
        carries them forward.
      </span>
      <button
        type="button"
        onClick={onForget}
        className="font-semibold text-primary underline underline-offset-2"
      >
        Stop remembering
      </button>
    </div>
  )
}

/** A picked company, cluster or college, with what kind it is. */
function KindChip({
  kind,
  t,
  onRemove,
}: {
  kind: string
  t: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex animate-in items-center gap-1.5 rounded-full border bg-background py-1 pr-1 pl-2.5 text-[13px] fade-in">
      <span className="text-[10px] font-bold tracking-wider text-primary uppercase">
        {kind}
      </span>
      {t}
      <button
        type="button"
        aria-label={`Remove ${t}`}
        onClick={onRemove}
        className="grid size-4.5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <XIcon className="size-3" />
      </button>
    </span>
  )
}

/** A ticked row in a checklist — a sub-cluster, a college. */
function TickRow({
  on,
  onToggle,
  title,
  children,
}: {
  on: boolean
  onToggle: () => void
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      title={title}
      onClick={onToggle}
      className={cn(
        "flex min-h-9 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[13px] transition-colors",
        on
          ? "border-primary bg-muted font-semibold text-primary"
          : "bg-background hover:bg-muted/60"
      )}
    >
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-[4px] border-[1.5px]",
          on
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input"
        )}
      >
        {on ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
      </span>
      {children}
    </button>
  )
}

/** A pill that toggles — course type, diversity, video. */
function Pill({
  on,
  onToggle,
  role,
  title,
  children,
}: {
  on: boolean
  onToggle: () => void
  role?: "radio"
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role ? on : undefined}
      aria-pressed={role ? undefined : on}
      title={title}
      onClick={onToggle}
      className={cn(
        "min-h-8.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
        on
          ? "border-primary bg-primary/10 text-primary"
          : "bg-background text-foreground/80 hover:bg-muted"
      )}
    >
      {children}
    </button>
  )
}

function SavedLists({
  lists,
  canSave,
  name,
  setName,
  save,
  placeholder,
  label,
}: {
  lists: { name: string; count: string; tip: string; apply: () => void }[]
  canSave: boolean
  name: string
  setName: (value: string) => void
  save: () => void
  placeholder: string
  label: string
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {lists.map((list) => (
          <button
            key={list.name}
            type="button"
            title={list.tip}
            onClick={list.apply}
            className="min-h-8 rounded-full border bg-background px-3 text-[13px] font-medium hover:bg-muted"
          >
            {list.name} · {list.count}
          </button>
        ))}
        {!lists.length ? <Note>No saved lists yet</Note> : null}
      </div>
      {canSave ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label={label}
            placeholder={placeholder}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="max-w-xs"
          />
          <Button variant="outline" size="sm" onClick={save}>
            Save for future jobs
          </Button>
        </div>
      ) : null}
    </>
  )
}

/** Domain & industry: the classification fields, and custom fields. */
function ClassEditor({ editors }: { editors: Editors }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {editors.addlRows.map((fd) => (
          <div key={fd.id} className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor={fd.inputId}
                className="text-[13px] font-semibold text-foreground/80"
              >
                {fd.label}
                {fd.required ? (
                  <span aria-hidden="true" className="text-destructive">
                    {" "}
                    *
                  </span>
                ) : null}
              </label>
              {fd.isNew ? (
                <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-bold text-primary-foreground">
                  NEW
                </span>
              ) : null}
              <SourceChip tag={fd.tag} />
              {fd.removable ? (
                <button
                  type="button"
                  aria-label={`Remove field ${fd.label}`}
                  onClick={fd.remove}
                  className="ml-auto grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              ) : null}
            </div>
            {fd.select ? (
              <PickSelect
                id={fd.inputId}
                label={fd.label}
                value={fd.value}
                options={fd.options.map((o) => ({ v: o, l: o }))}
                onChange={fd.onChange}
                className={cn(
                  !fd.shown && "animate-pulse border-border bg-muted",
                  fd.err && "border-destructive"
                )}
              />
            ) : (
              <Input
                id={fd.inputId}
                value={fd.value}
                placeholder={fd.placeholder}
                onChange={(event) => fd.onChange(event.target.value)}
                className={cn(
                  !fd.shown && "animate-pulse border-border bg-muted",
                  fd.err && "border-destructive"
                )}
              />
            )}
            {fd.err ? (
              <span className="text-xs text-destructive">
                Required to continue
              </span>
            ) : null}
            {fd.hint ? <Note>{fd.hint}</Note> : null}
          </div>
        ))}
      </div>

      {editors.customise ? (
        <div className="flex animate-in flex-col gap-3 rounded-xl border border-dashed p-4 fade-in">
          <span className="text-[13px] font-semibold">
            Add a field to understand this role better
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Note>Quick add:</Note>
            {editors.quickFields.map((qf) => (
              <HintChip key={qf.n} onClick={qf.add}>
                + {qf.n}
              </HintChip>
            ))}
          </div>
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_140px_1fr_auto]">
            <Labelled label="Field name" htmlFor="nf-label">
              <Input
                id="nf-label"
                placeholder="e.g. Team size"
                value={editors.nf.label}
                onChange={(event) =>
                  editors.setNf({ label: event.target.value })
                }
              />
            </Labelled>
            <Labelled label="Type" htmlFor="nf-type">
              <PickSelect
                id="nf-type"
                label="Type"
                value={editors.nf.type}
                options={[
                  { v: "Text", l: "Text" },
                  { v: "Dropdown", l: "Dropdown" },
                ]}
                onChange={(type) => editors.setNf({ type })}
              />
            </Labelled>
            <Labelled label="Options (for dropdown)" htmlFor="nf-opts">
              <Input
                id="nf-opts"
                placeholder="Comma separated"
                value={editors.nf.options}
                onChange={(event) =>
                  editors.setNf({ options: event.target.value })
                }
              />
            </Labelled>
            <Button onClick={editors.addField}>Add field</Button>
          </div>
          <Note>
            AI tries to fill a new field from the brief straight away. If it
            can't, the field is marked “Needs input”.
          </Note>
        </div>
      ) : null}
      <button
        type="button"
        onClick={editors.toggleCustomise}
        className="self-start text-[13px] font-semibold text-primary underline underline-offset-2"
      >
        {editors.customiseLabel}
      </button>
    </div>
  )
}

/** Companies: clusters and their sub-clusters, named companies, saved lists. */
function CompanyEditor({ editors }: { editors: Editors }) {
  const co = editors.companies
  return (
    <div className="flex flex-col gap-4">
      {co.past ? <PastBanner onForget={editors.forgetPast} /> : null}
      {co.selected.length ? (
        <div className="flex flex-wrap gap-1.5">
          {co.selected.map((c) => (
            <KindChip
              key={c.kind + c.t}
              kind={c.kind}
              t={c.t}
              onRemove={c.remove}
            />
          ))}
        </div>
      ) : null}
      {co.suggest.length ? (
        <div className="flex animate-in flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground fade-in">
          <span>Similar hires came from</span>
          {co.suggest.map((sg) => (
            <HintChip key={sg.t} onClick={sg.add}>
              + {sg.t}
            </HintChip>
          ))}
          <CalcMark />
        </div>
      ) : null}
      <EdRow label="Company cluster" htmlFor="co-cluster">
        <PickSelect
          id="co-cluster"
          label="Company cluster"
          placeholder="Choose a cluster…"
          value={co.cluster}
          options={co.clusters}
          onChange={co.setCluster}
          className="max-w-xs"
        />
        {co.sub ? (
          <div
            role="group"
            aria-label={`Sub-clusters in ${co.cluster}`}
            className="flex animate-in flex-col gap-2.5 rounded-xl bg-muted/60 p-3 fade-in"
          >
            <div className="flex items-center gap-3">
              <span className="mr-auto text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                Sub-clusters · tick to include
              </span>
              <Note>{co.sub.count}</Note>
              <button
                type="button"
                onClick={co.sub.toggleAll}
                className="text-xs font-semibold text-primary underline underline-offset-2"
              >
                {co.sub.allLabel}
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {co.sub.options.map((so) => (
                <TickRow key={so.t} on={so.on} onToggle={so.toggle}>
                  {so.t}
                </TickRow>
              ))}
            </div>
          </div>
        ) : null}
      </EdRow>
      <EdRow label="Specific companies" htmlFor="co-name">
        <Input
          id="co-name"
          placeholder="Type a company name, press Enter"
          value={co.newCo}
          onChange={(event) => co.setNewCo(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            co.addCo()
          }}
          className="max-w-xs"
        />
      </EdRow>
      <EdRow label="Saved lists">
        <SavedLists
          lists={co.lists}
          canSave={co.canSave}
          name={co.listName}
          setName={co.setListName}
          save={co.save}
          label="Name this list"
          placeholder="Name this list, e.g. Top SaaS targets"
        />
      </EdRow>
      <Note>
        Clusters and sub-clusters come from the iimjobs company taxonomy.
        Candidates currently or previously at these companies are prioritised,
        not excluded.
      </Note>
    </div>
  )
}

/** Colleges: institute clusters, a searchable checklist, saved lists. */
function CollegeEditor({ editors }: { editors: Editors }) {
  const col = editors.colleges
  return (
    <div className="flex flex-col gap-4">
      {col.past ? <PastBanner onForget={editors.forgetPast} /> : null}
      {col.selected.length ? (
        <div className="flex flex-wrap gap-1.5">
          {col.selected.map((c) => (
            <KindChip
              key={c.kind + c.t}
              kind={c.kind}
              t={c.t}
              onRemove={c.remove}
            />
          ))}
        </div>
      ) : null}
      <EdRow label="Institute clusters">
        <div className="flex flex-wrap gap-2">
          {col.clusters.map((ic) => (
            <TickRow key={ic.t} on={ic.on} onToggle={ic.toggle} title={ic.tip}>
              {ic.t}
              <span className="text-xs font-normal text-muted-foreground">
                {ic.n}
              </span>
            </TickRow>
          ))}
        </div>
      </EdRow>
      <EdRow label="Browse colleges" htmlFor="inst-q">
        <div
          role="group"
          aria-label="Browse colleges"
          className="flex flex-col gap-2.5 rounded-xl bg-muted/60 p-3"
        >
          <div className="flex flex-wrap gap-2">
            <Input
              id="inst-q"
              type="search"
              placeholder="Search colleges, e.g. XLRI, NIT, BITS"
              value={col.query}
              onChange={(event) => col.setQuery(event.target.value)}
              className="min-w-48 flex-1 bg-background"
            />
            <PickSelect
              label="Filter by cluster"
              value={col.cluster}
              options={[{ v: "", l: `All colleges (${col.allN})` }].concat(
                col.clusterOpts
              )}
              onChange={col.setCluster}
              className="w-auto min-w-44 bg-background"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="mr-auto text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Tick to include · multi-select
            </span>
            <Note>{col.count}</Note>
            {col.options.length ? (
              <button
                type="button"
                onClick={col.toggleAll}
                className="text-xs font-semibold text-primary underline underline-offset-2"
              >
                {col.allLabel}
              </button>
            ) : null}
          </div>
          <div className="grid max-h-64 gap-2 overflow-y-auto p-px sm:grid-cols-2">
            {col.options.map((io) => (
              <TickRow key={io.t} on={io.on} onToggle={io.toggle}>
                {io.t}
              </TickRow>
            ))}
          </div>
          {!col.options.length ? (
            <Note>No college matches that search.</Note>
          ) : null}
        </div>
      </EdRow>
      <EdRow label="Saved lists">
        <SavedLists
          lists={col.lists}
          canSave={col.canSave}
          name={col.listName}
          setName={col.setListName}
          save={col.save}
          label="Name this college list"
          placeholder="Name this list, e.g. Campus A-list"
        />
      </EdRow>
      <Note>
        Matches candidates who studied at any selected college (UG or PG).
        Preferred, not mandatory.
      </Note>
    </div>
  )
}

/** Candidate preferences: batch, course type, diversity, video. */
function PrefEditor({ editors }: { editors: Editors }) {
  const p = editors.prefs
  return (
    <div className="flex flex-col gap-4">
      <EdRow label="Graduating year">
        <div className="flex max-w-sm items-center gap-2">
          <PickSelect
            label="Minimum batch"
            value={p.batchMin || ""}
            options={p.batchOpts}
            onChange={p.setBatchMin}
          />
          <span className="text-muted-foreground">to</span>
          <PickSelect
            label="Maximum batch"
            value={p.batchMax || ""}
            options={p.batchOpts}
            onChange={p.setBatchMax}
          />
        </div>
      </EdRow>
      <EdRow label="Course type">
        <div
          role="radiogroup"
          aria-label="Course type"
          className="flex flex-wrap gap-2"
        >
          {p.courses.map((c) => (
            <Pill
              key={c.l}
              role="radio"
              on={c.on}
              onToggle={c.toggle}
              title={c.tip}
            >
              {c.l}
            </Pill>
          ))}
        </div>
        <span className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <InfoIcon className="mt-px size-3.5 shrink-0" />
          <span>{p.courseInfo}</span>
        </span>
      </EdRow>
      <EdRow label="Diversity">
        <div className="flex flex-wrap gap-2">
          {p.diversity.map((c) => (
            <Pill key={c.l} on={c.on} onToggle={c.toggle}>
              {c.l}
            </Pill>
          ))}
        </div>
      </EdRow>
      <EdRow label="Video profile">
        <div>
          <Pill on={p.video} onToggle={p.toggleVideo}>
            Prefer video / audio profiles
          </Pill>
        </div>
      </EdRow>
      <Note>
        Each preference narrows your pool; the strip above shows by how much.
      </Note>
    </div>
  )
}

/**
 * Once the summary has scrolled off the top of the page, the role stays in a
 * sticky bar — four chips, each opening its part of the editor under it.
 */
function SlimBar({
  core,
  understood,
}: {
  core: Core
  understood: ReturnType<typeof understoodOf>
}) {
  const sentinel = React.useRef<HTMLDivElement>(null)
  const { setSlim } = understood
  const setSlimRef = React.useRef(setSlim)
  React.useEffect(() => {
    setSlimRef.current = setSlim
  })
  React.useEffect(() => {
    const el = sentinel.current
    if (!el) return
    // The flow scrolls inside its own column rather than the document, so
    // "scrolled off the top" is measured against that column. A scroll
    // listener rather than an IntersectionObserver, because the observer only
    // reports a crossing and a jump past the line (a scrollbar drag, a key)
    // can skip it.
    let root: HTMLElement | null = el.parentElement
    while (root && !/(auto|scroll)/.test(getComputedStyle(root).overflowY))
      root = root.parentElement
    const target: HTMLElement | Window = root ?? window
    const check = () => {
      const top = root ? root.getBoundingClientRect().top : 0
      setSlimRef.current(el.getBoundingClientRect().top < top)
    }
    check()
    target.addEventListener("scroll", check, { passive: true })
    return () => {
      target.removeEventListener("scroll", check)
      setSlimRef.current(false)
    }
  }, [])

  const chip =
    "min-h-7 max-w-56 truncate rounded-full border bg-background px-2.5 text-xs font-semibold hover:border-primary/30 hover:bg-muted"
  return (
    <>
      <div ref={sentinel} aria-hidden="true" className="-mt-5 h-px" />
      {understood.slim ? (
        <div className="sticky top-2 z-20 -mt-4 flex animate-in flex-col gap-3 rounded-2xl border border-border bg-background/95 p-2.5 shadow-md backdrop-blur fade-in">
          <div className="flex flex-wrap items-center gap-1.5">
            <AiTile className="size-6 rounded-lg" iconClassName="size-3" />
            <button
              type="button"
              className={chip}
              onClick={() => understood.open("role")}
            >
              {understood.chips.title}
            </button>
            <button
              type="button"
              className={chip}
              onClick={() => understood.open("where")}
            >
              {understood.chips.loc}
            </button>
            <button
              type="button"
              className={chip}
              onClick={() => understood.open("where")}
            >
              {understood.chips.expSal}
            </button>
            <button
              type="button"
              className={chip}
              onClick={() => understood.open("skills")}
            >
              {understood.chips.skillsN}
            </button>
          </div>
          {understood.editing ? <RoleEditor core={core} /> : null}
        </div>
      ) : null}
    </>
  )
}

type Voice = ReturnType<typeof conversationOf>["voice"]

/** "Share the hiring manager's brief": a voice note, or a two-minute AI call. */
function VoiceCard({ voice }: { voice: Voice }) {
  if (voice.skipped)
    return (
      <div className="flex items-center gap-1 pl-9 text-[13px] text-muted-foreground">
        Skipped, nothing to add.
        <button
          type="button"
          onClick={voice.unskip}
          className="font-semibold text-primary underline underline-offset-2"
        >
          Add a note
        </button>
      </div>
    )
  return (
    <div className="flex animate-in flex-col gap-2 pl-9 fade-in">
      <section className="flex flex-col gap-3.5 rounded-2xl border border-border bg-muted/40 p-4">
        <div className="flex items-start gap-2.5">
          <AiTile className="size-7 rounded-lg" iconClassName="size-3.5" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-semibold">
              Share the hiring manager’s brief
            </span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              Record a voice note or take a 2-minute AI call. I’ll turn it into
              requirements so you get more relevant profiles.
            </span>
          </div>
        </div>
        {voice.state === "idle" || voice.state === "done" ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={voice.toggle}>
              <MicIcon data-icon="inline-start" />
              {voice.buttonText}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={voice.callBusy}
              onClick={voice.beginCall}
            >
              <PhoneIcon data-icon="inline-start" />
              Begin call
            </Button>
          </div>
        ) : null}
        {voice.state === "rec" ? (
          <>
            <Button
              variant="destructive"
              size="sm"
              className="self-start"
              onClick={voice.toggle}
            >
              <span className="size-2 animate-pulse rounded-full bg-current" />
              Stop recording
            </Button>
            <div className="flex items-start gap-3 rounded-xl bg-background px-3 py-2.5">
              <Wave />
              <span className="text-[13px] leading-relaxed italic">
                {voice.text}
              </span>
            </div>
          </>
        ) : null}
        {voice.state === "processing" ? (
          <div className="flex items-center gap-2 text-[13px] font-semibold text-primary">
            <LoaderCircleIcon className="size-3.5 animate-spin" />
            Pulling out what matters from your note…
          </div>
        ) : null}
        {voice.state === "done" ? (
          <div className="flex animate-in flex-col gap-2 rounded-xl bg-background p-3 fade-in">
            <span className="text-[13px] leading-relaxed italic">
              “{voice.text}”
            </span>
            <span className="text-xs font-semibold">{voice.fromLabel}</span>
            {voice.items.map((item) => (
              <div
                key={item.t + item.where}
                className="flex items-start gap-2 text-[13px]"
              >
                <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-muted text-primary">
                  <SparklesIcon className="size-2.5" />
                </span>
                <span>
                  {item.t}{" "}
                  <span className="text-muted-foreground">· {item.where}</span>
                </span>
              </div>
            ))}
            <button
              type="button"
              onClick={voice.undo}
              className="self-start text-xs font-semibold text-primary underline underline-offset-2"
            >
              Undo these changes
            </button>
          </div>
        ) : null}
      </section>
      {voice.canSkip ? (
        <button
          type="button"
          onClick={voice.skip}
          className="self-start text-[13px] font-semibold text-primary underline underline-offset-2"
        >
          Skip, nothing to add
        </button>
      ) : null}
    </div>
  )
}
