import {
  ClipboardPasteIcon,
  PaperclipIcon,
  PlusIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import {
  FieldError,
  FieldHead,
  Hint,
  HintChip,
} from "@/components/ai-agent/parts"
import {
  SOURCE_TAG,
  TAG_BASE,
  fieldState,
  useAgent,
} from "@/components/ai-agent/shared"
import { FN } from "@/lib/ai-agent/data"
import type { Requirements, jdOf, screenOf } from "@/lib/ai-agent/view"

/** Step 2: the skills (moved here from role details), then the drafted JD. */
export function JobDescription({
  req,
  view,
}: {
  req: Requirements
  view: ReturnType<typeof jdOf>
}) {
  const { agent, state } = useAgent()
  const F = req.F
  const tag =
    view.tag === "filling"
      ? SOURCE_TAG.filling
      : view.tag === "edited"
        ? SOURCE_TAG.edited
        : { label: "Drafted for review", tone: SOURCE_TAG.inferred.tone }

  return (
    <div className="flex flex-col gap-5.5 p-6">
      {view.backToTargeting ? (
        <Button
          variant="outline"
          size="sm"
          className="self-start border-border text-primary"
          onClick={view.backToTargeting}
        >
          ← Back to targeting
        </Button>
      ) : null}

      <div className="flex flex-col gap-2">
        <FieldHead
          htmlFor="f-skill"
          label="Skills"
          required
          extra="(at least 3)"
          tag={F.skills.tag}
          locked={F.skills.locked}
          lockLabel={FN.skills}
          onToggleLock={() => agent.toggleLock("skills")}
        />
        <div
          className={cn(
            "flex min-h-9 flex-wrap items-center gap-1.5 rounded-3xl border border-input bg-input/30 px-2 py-1 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
            fieldState({ shown: F.skills.shown, err: F.skills.err })
          )}
        >
          {view.skills.map((n) => (
            <span
              key={n}
              className="inline-flex animate-in items-center gap-1 rounded-full border bg-muted py-1 pr-1 pl-2.5 text-[13px] fade-in"
            >
              {n}
              <button
                type="button"
                aria-label={`Remove ${n}`}
                onClick={() => view.removeSkill(n)}
                className="grid size-4.5 place-items-center rounded-full text-muted-foreground hover:bg-border hover:text-foreground"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
          <input
            id="f-skill"
            placeholder="+ Add skill, press Enter"
            value={state.newSkill}
            onChange={(event) =>
              agent.setState({ newSkill: event.target.value })
            }
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              view.addTypedSkill(state.newSkill)
            }}
            className="min-w-40 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <FieldError show={F.skills.err}>{F.skills.errMsg}</FieldError>
        {view.suggest.length ? (
          <Hint>
            Often paired:
            {view.suggest.map((skill) => (
              <HintChip key={skill.n} onClick={skill.add}>
                + {skill.n}
              </HintChip>
            ))}
          </Hint>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 border-t pt-5.5">
        <h3 className="text-base font-semibold">
          Drafted job description — review and edit
        </h3>
        <span className="text-[13px] text-muted-foreground">
          Drafted from your role details and the skills above. Change anything
          you want; your edits stay.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="f-jd" className="text-[13px] font-semibold">
            Job description
            <span aria-hidden="true" className="ml-1 text-destructive">
              *
            </span>
          </label>
          <span className={cn(TAG_BASE, tag.tone)}>{tag.label}</span>
          <span className="flex-1" />
          {view.edited ? (
            <Button variant="outline" size="sm" onClick={view.regenerate}>
              Regenerate from fields
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <PlusIcon data-icon="inline-start" />
              {view.attachLabel}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* A label wrapping the file input, so the menu row opens the picker. */}
              <label className="relative flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-semibold hover:bg-muted">
                <PaperclipIcon className="size-3.5" />
                Upload a file
                <span className="ml-auto text-[11px] font-medium text-muted-foreground">
                  PDF, DOC, TXT
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) view.attach(file)
                  }}
                />
              </label>
              <DropdownMenuItem onClick={view.paste}>
                <ClipboardPasteIcon />
                Paste your JD
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {view.file ? (
          <div className="flex animate-in items-center gap-2.5 rounded-xl border bg-muted/50 px-3 py-2 text-[13px] fade-in">
            <PaperclipIcon className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <b>{view.file.name}</b>{" "}
              <span className="text-muted-foreground">· {view.file.note}</span>
            </span>
            <button
              type="button"
              aria-label="Remove attached JD"
              onClick={view.removeFile}
              className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-border hover:text-foreground"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        ) : null}
        <span className="text-xs text-muted-foreground">{view.note}</span>
        <Textarea
          id="f-jd"
          placeholder="Paste or type your job description here…"
          value={view.text}
          onChange={(event) => view.onText(event.target.value)}
          className={cn(
            "min-h-80 leading-relaxed whitespace-pre-wrap",
            fieldState({ shown: view.jdShown, err: req.jdErr })
          )}
        />
        <FieldError show={req.jdErr}>
          Add a job description of at least 100 characters
        </FieldError>
      </div>
    </div>
  )
}

/** Step 3: screening questions — yours, the agent's suggestions, or none. */
export function Screening({ view }: { view: ReturnType<typeof screenOf> }) {
  return (
    <div className="flex flex-col gap-4.5 p-6">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-6.5 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <SparklesIcon className="size-3" />
            </span>
            <h3 className="text-lg font-semibold">Screening questions</h3>
            <span
              className={cn(
                TAG_BASE,
                view.on
                  ? "bg-muted text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {view.tag}
            </span>
          </div>
          <span className="text-[13px] leading-snug text-muted-foreground">
            {view.sub}
          </span>
        </div>
        {view.on ? (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={view.skip}
          >
            Skip screening →
          </Button>
        ) : null}
      </div>

      {view.on ? (
        <div className="flex animate-in flex-col gap-3.5 fade-in">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-extrabold tracking-wider text-primary uppercase">
              Your questions · {view.mine.length}
            </span>
            {view.mine.length ? (
              <div className="flex flex-col overflow-hidden rounded-xl border bg-background">
                {view.mine.map((q) => (
                  <div
                    key={q.t}
                    className="flex items-center gap-2.5 py-2.5 pr-2.5 pl-3 [&:not(:first-child)]:border-t"
                  >
                    <span className="grid size-5.5 shrink-0 place-items-center rounded-full bg-muted text-[11.5px] font-extrabold text-primary">
                      {q.n}
                    </span>
                    <span className="min-w-0 flex-1 text-[13.5px] leading-snug">
                      {q.t}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-muted-foreground">
                      {q.src}
                    </span>
                    <button
                      type="button"
                      aria-label={"Remove question: " + q.t}
                      title="Remove"
                      onClick={q.remove}
                      className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-border hover:text-foreground"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/40 px-4 py-3.5 text-[13px] text-muted-foreground">
                No questions yet. Add one from the suggestions below or write
                your own.
              </div>
            )}
            {view.addOpen ? (
              <div className="flex animate-in gap-2 fade-in">
                <Input
                  id="f-newq"
                  aria-label="Write your own screening question"
                  placeholder="e.g. Are you open to relocating to Gurugram?"
                  value={view.newQ}
                  onChange={(event) => view.onNewQ(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return
                    event.preventDefault()
                    view.addQ()
                  }}
                />
                <Button onClick={view.addQ}>Add</Button>
                <Button variant="outline" onClick={view.closeAdd}>
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={view.openAdd}
                className="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2.5 text-left text-[13px] font-semibold text-primary hover:bg-muted"
              >
                + Write your own question
              </button>
            )}
          </div>

          {view.sugBoxOn ? (
            <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-linear-180 from-muted/60 to-background p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="grid size-6.5 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <SparklesIcon className="size-3" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13.5px] font-bold text-primary">
                    Suggested by your AI Agent
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {view.sugSub}
                  </span>
                </div>
                {view.canSuggestMore ? (
                  <Button
                    variant="outline"
                    size="xs"
                    className="rounded-full"
                    disabled={view.thinking}
                    onClick={view.suggestMore}
                  >
                    <SparklesIcon data-icon="inline-start" />
                    Suggest more
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                {view.suggestions.map((q, i) => (
                  <div
                    key={q.t}
                    className="flex animate-in items-start gap-2.5 rounded-xl border border-border/60 bg-background py-2.5 pr-2.5 pl-3 fade-in"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <SparklesIcon className="mt-1 size-2.5 shrink-0 text-primary/60" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[13.5px] leading-snug">{q.t}</span>
                      <span className="text-[11.5px] text-primary/80">
                        {q.why}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0"
                      title={q.src}
                      aria-label={"Add question: " + q.t}
                      onClick={q.add}
                    >
                      + Add
                    </Button>
                  </div>
                ))}
                {view.thinking ? (
                  <div className="flex animate-pulse items-center gap-2.5 rounded-xl border border-border bg-muted p-3 text-[12.5px] font-semibold text-primary">
                    <SparklesIcon className="size-2.5" />
                    Reading your JD for more questions…
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t pt-3">
            <span className="flex-1 text-[12.5px] text-muted-foreground">
              {view.summary}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex animate-in flex-wrap items-center gap-3 rounded-xl border border-dashed bg-muted/40 px-4 py-3.5 fade-in">
          <span className="flex-1 text-[13.5px]">
            Screening skipped. Candidates can apply without answering questions.
          </span>
          <Button variant="outline" size="sm" onClick={view.turnBackOn}>
            Add screening back
          </Button>
        </div>
      )}
    </div>
  )
}
