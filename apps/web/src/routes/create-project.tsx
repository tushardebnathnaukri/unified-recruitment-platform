import * as React from "react"
import { useNavigate } from "react-router"
import { ArrowRightIcon, LockIcon, SparklesIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { Field, OptionSelect } from "@/components/form-field"
import { MandateChannels } from "@/components/mandate-channels"
import { MandateCriteria } from "@/components/mandate-criteria"
import { TagInput } from "@/components/tag-input"
import { EXPERIENCE_YEARS } from "@/lib/post-job"
import {
  EMPTY_FILTERS,
  INPUT_MODES,
  SUGGESTED_MANDATES,
  parseMandate,
  type ChannelId,
  type Criterion,
  type MandateFilters,
} from "@/lib/mandate"

/**
 * Create Project — state one mandate, and let both channels come off it.
 *
 * THE PAGE IS A DOCUMENT, NOT A WIZARD. The mandate is a thing you come back
 * to and edit, so the parse lands in place on the same page rather than
 * advancing through steps. A wizard would imply the mandate is finished once
 * you are through it, and a mandate is never finished — the brief changes two
 * weeks in and the whole point is that both channels change with it.
 *
 * The parse is REVIEWED, never silently acted on. One sentence of prose
 * quietly publishing a public job advert that spends a credit is the failure
 * mode that would sink this; the structured fields and criteria are shown back
 * as editable, and the post itself still goes through the existing form.
 *
 * This is the most speculative surface in the prototype. `parseMandate` is a
 * keyword stub, and it is labelled as one on screen — the question this page is
 * here to answer is whether splitting a mandate into hard filters and ranked
 * criteria helps a recruiter, not whether the parser is any good.
 */
type Phase = "idle" | "resolving" | "resolved"

export function CreateProjectPage() {
  const navigate = useNavigate()

  const [title, setTitle] = React.useState("")
  const [prompt, setPrompt] = React.useState("")
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [filters, setFilters] = React.useState<MandateFilters>(EMPTY_FILTERS)
  const [criteria, setCriteria] = React.useState<Criterion[]>([])
  const [channels, setChannels] = React.useState<ChannelId[]>([
    "post",
    "search",
  ])
  const [standing, setStanding] = React.useState(true)

  const resolve = (text: string) => {
    const value = text.trim()
    if (!value) return

    setPrompt(value)
    setPhase("resolving")

    // Faked latency. Resolving a mandate reads as work being done, and a parse
    // that lands instantly reads as a lookup — which would set the wrong
    // expectation for what this costs in the real product.
    window.setTimeout(() => {
      const parsed = parseMandate(value)
      setFilters(parsed.filters)
      setCriteria(parsed.criteria)
      setTitle((current) => current || parsed.title)
      setPhase("resolved")
    }, 900)
  }

  const patch = (next: Partial<MandateFilters>) =>
    setFilters((current) => ({ ...current, ...next }))

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:px-6">
      <div className="flex min-w-0 flex-col gap-4">
        {/* Title first and unlabelled, like a document's. It fills itself in
            from the mandate, so it is rarely the thing you type first. */}
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Untitled project"
          aria-label="Project title"
          className="h-auto border-0 bg-transparent px-0 text-2xl font-medium shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-2xl"
        />

        <MandatePrompt
          phase={phase}
          prompt={prompt}
          onSubmit={resolve}
          onReset={() => setPhase("idle")}
        />

        {phase === "idle" && <Suggestions onPick={(text) => resolve(text)} />}

        {phase === "resolving" && <Resolving />}

        {phase === "resolved" && (
          <>
            <Card className="gap-4 p-4">
              <SectionHeading
                title="Criteria"
                hint="Judged per candidate and shown back on every result as the reason it matched. Ranked — the top one is the one worth trading the others against."
              />
              <MandateCriteria criteria={criteria} onChange={setCriteria} />
            </Card>

            <Card className="gap-6 p-4">
              <SectionHeading
                title="Filters"
                hint="Hard constraints. Unlike criteria these are true or false, so they narrow the pool rather than rank it."
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Experience" optional>
                  <div className="grid grid-cols-2 gap-3">
                    <OptionSelect
                      value={filters.minYears}
                      onValueChange={(minYears) => patch({ minYears })}
                      placeholder="Min"
                      options={EXPERIENCE_YEARS}
                    />
                    <OptionSelect
                      value={filters.maxYears}
                      onValueChange={(maxYears) => patch({ maxYears })}
                      placeholder="Max"
                      options={EXPERIENCE_YEARS.slice(1)}
                    />
                  </div>
                </Field>

                <Field label="Location" htmlFor="mandate-locations" optional>
                  <TagInput
                    id="mandate-locations"
                    value={filters.locations}
                    onChange={(locations) => patch({ locations })}
                    placeholder="Add a location"
                  />
                </Field>
              </div>

              <Field
                label="Skills"
                htmlFor="mandate-skills"
                optional
                hint="Pulled out of the mandate. Press Enter after each one."
              >
                <TagInput
                  id="mandate-skills"
                  value={filters.skills}
                  onChange={(skills) => patch({ skills })}
                  placeholder="Add a skill"
                />
              </Field>
            </Card>

            <Card className="gap-4 p-4">
              <SectionHeading
                title="Channels"
                hint="Where this mandate goes looking. Both on by default; a confidential search wants the post off."
              />
              <MandateChannels
                enabled={channels}
                onToggle={(id) =>
                  setChannels((current) =>
                    current.includes(id)
                      ? current.filter((c) => c !== id)
                      : [...current, id]
                  )
                }
                standing={standing}
                onStandingChange={setStanding}
              />
            </Card>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/jobs")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={channels.length === 0}
                onClick={() => navigate("/projects/p1")}
              >
                Create project
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>

            {channels.length === 0 && (
              <p className="text-right text-xs text-muted-foreground">
                A mandate with no channels has nowhere to look. Turn at least
                one on.
              </p>
            )}
          </>
        )}
      </div>

      <Configuration />
    </div>
  )
}

function SectionHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  )
}

/**
 * The prompt. Once resolved it collapses to a single line you can click back
 * into — the mandate stays visible because everything below it is derived from
 * it, and a derived thing whose source has scrolled away is unreadable.
 */
function MandatePrompt({
  phase,
  prompt,
  onSubmit,
  onReset,
}: {
  phase: Phase
  prompt: string
  onSubmit: (text: string) => void
  onReset: () => void
}) {
  const [draft, setDraft] = React.useState("")

  if (phase !== "idle") {
    return (
      <Card className="flex-row items-start gap-3 p-3">
        <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 text-sm leading-relaxed">{prompt}</p>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="shrink-0 px-0"
          onClick={onReset}
        >
          Edit
        </Button>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-3 p-3">
        <Textarea
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Describe the role you're hiring for — seniority, location, what they need to have actually done."
          className="resize-none border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:ring-0"
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              onSubmit(draft)
            }
          }}
        />

        <div className="flex items-center justify-between gap-2">
          {/* One mode works. The rest are named rather than hidden because
              which one a recruiter reaches for first is a real question, and
              you cannot ask it about controls that are not on screen. */}
          <div className="flex flex-wrap gap-1.5">
            {INPUT_MODES.map((mode) => (
              <Badge
                key={mode.id}
                variant={mode.id === "describe" ? "secondary" : "outline"}
                className={cn(
                  "gap-1 font-normal",
                  !mode.ready && "text-muted-foreground"
                )}
              >
                {!mode.ready && <LockIcon className="size-3" />}
                {mode.label}
              </Badge>
            ))}
          </div>

          <Button
            type="button"
            size="sm"
            disabled={draft.trim() === ""}
            onClick={() => onSubmit(draft)}
          >
            Resolve
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </Card>
    </div>
  )
}

function Suggestions({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-1 pb-1 text-xs text-muted-foreground">
        Or start from one of these
      </p>
      {SUGGESTED_MANDATES.map((mandate) => (
        <button
          key={mandate}
          type="button"
          onClick={() => onPick(mandate)}
          className="rounded-lg px-3 py-2.5 text-left text-sm leading-relaxed transition-colors hover:bg-muted"
        >
          {mandate}
        </button>
      ))}
    </div>
  )
}

/**
 * Shaped like what is about to arrive — a criteria block then a filters block —
 * rather than a spinner, so the layout does not jump when it lands.
 */
function Resolving() {
  return (
    <Card className="gap-4 p-4" aria-busy="true">
      <p className="text-sm text-muted-foreground">Reading the mandate…</p>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </Card>
  )
}

/**
 * Mirrors the reference product's project sidebar. Everything here is inert —
 * it is on screen to ask whether a mandate needs an owner, a department and a
 * visibility at all, which is a question about how teams share work rather
 * than about search.
 */
function Configuration() {
  const rows = [
    { label: "Owner", value: "Priya Raman" },
    { label: "Collaborators", value: "Add collaborators" },
    { label: "Visibility", value: "Shared with team" },
    { label: "Department", value: "Engineering" },
  ]

  return (
    <Card className="h-fit gap-0 p-4">
      <p className="pb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Configuration
      </p>
      <Separator />
      <dl className="flex flex-col gap-3 pt-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-3"
          >
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 truncate text-sm">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
