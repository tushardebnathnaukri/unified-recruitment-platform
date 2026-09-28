import * as React from "react"
import { Link, useSearchParams } from "react-router"
import {
  ArrowLeftIcon,
  PlusIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { toast } from "@workspace/ui/components/toast"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import { LocationPicker } from "@/components/location-picker"
import { TagInput } from "@/components/tag-input"
import {
  describePosting,
  chatFrom,
  draftFrom,
  REMOTE,
  WORK_MODES,
  type PostingDraft,
  type Span,
  type WorkMode,
} from "@/lib/job-intake"
import { JOB_LOCATIONS } from "@/lib/taxonomy"
import { skillsForTitle } from "@/lib/title-intel"

/**
 * Post a job — the form.
 *
 * THE OTHER HALF OF THE AGENT'S POSTING CONVERSATION, NOT A SECOND DESIGN OF
 * IT. The same six fields the chat asks for (`lib/job-intake.ts`), in the same
 * order, plus the description the chat drafts from them. The chat's "Fill in a
 * form instead" and "Review and post" both land here with everything said so
 * far in the query string, so switching shapes half-way costs nothing — and a
 * recruiter who never wanted a conversation starts here and never sees one.
 *
 * THE URL IS THE OPENING VALUE, NOT THE STATE. The fields take `?title=`,
 * `?loc=` and the rest once, and from the first keystroke the form owns them —
 * the same arrangement Smart Hire makes with `?q=`. A form that rewrote its
 * URL on every character would put a hundred entries in the back button.
 *
 * THE DESCRIPTION IS WRITTEN ONCE AND THEN IT IS YOURS. It is drafted from the
 * fields on arrival, and "Redraft from the fields" writes it again on request.
 * It never rewrites itself as the fields change, because by then the recruiter
 * may have edited it, and silently replacing their paragraph with a generated
 * one is the worst thing a form can do.
 *
 * POSTING IS NOT WIRED, AND THE BUTTON SAYS SO. There is no job board behind
 * this prototype. "Post job" checks the one field a posting cannot go up
 * without, then says what would happen next — moderation — rather than
 * pretending a row appeared on the Jobs list.
 */
export function NewJobPage() {
  const { brand } = useBrand()
  const [params] = useSearchParams()

  const [initial] = React.useState(() => draftFrom(params))
  const chat = chatFrom(params)
  // Anything besides the way back is a value the chat had gathered.
  const fromAgent = Array.from(params.keys()).some((key) => key !== "chat")

  const [title, setTitle] = React.useState(initial.title ?? "")
  const [locations, setLocations] = React.useState(initial.locations)
  const [xpMin, setXpMin] = React.useState(text(initial.experience?.min))
  const [xpMax, setXpMax] = React.useState(text(initial.experience?.max))
  const [payMin, setPayMin] = React.useState(text(initial.pay?.min))
  const [payMax, setPayMax] = React.useState(text(initial.pay?.max))
  const [skills, setSkills] = React.useState(initial.skills)
  const [niceSkills, setNiceSkills] = React.useState(initial.niceSkills)
  const [mode, setMode] = React.useState<WorkMode | null>(initial.mode)
  const [teamScale, setTeamScale] = React.useState(initial.teamScale ?? "")
  const [relocationSupport, setRelocationSupport] = React.useState(
    initial.relocationSupport === true
  )

  const draft: PostingDraft = {
    title: title.trim() || null,
    locations,
    experience: spanOf(xpMin, xpMax),
    pay: spanOf(payMin, payMax),
    skills,
    mode,
    niceSkills,
    teamScale: teamScale.trim() || null,
    relocationSupport: relocationSupport || null,
  }

  const [description, setDescription] = React.useState(() =>
    initial.title ? describePosting(initial) : ""
  )

  // Proposed from the title as it is typed, less what is already taken — the
  // chat's skills question offers the same list, so the two agree.
  const proposed = React.useMemo(
    () =>
      draft.title
        ? skillsForTitle(draft.title, brand)
            .map((proposal) => proposal.skill)
            .filter(
              (skill) => !skills.includes(skill) && !niceSkills.includes(skill)
            )
            .slice(0, 6)
        : [],
    [draft.title, brand, skills, niceSkills]
  )

  const [tried, setTried] = React.useState(false)
  const titleMissing = tried && !draft.title

  const post = () => {
    setTried(true)
    if (!draft.title) return
    toast.add({
      title: `Ready to post: ${draft.title}`,
      description:
        "Publishing isn't wired up in this prototype. This is where the posting would go to moderation.",
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* No heading: "Post a job" is already in the top bar, so this says
            where the values came from rather than repeating the name. */}
        <p className="text-sm text-muted-foreground">
          {fromAgent
            ? "Filled in from your conversation on the Dashboard. Change anything."
            : "The role, and what a candidate should read about it. Only the title is required."}
        </p>
        {/* The door back. Opened from a chat, it is THAT chat — its URL is the
            conversation, so every turn comes back as it was. Opened cold, it
            starts a fresh one rather than carrying the form's values in,
            because a chat that opened already answered would have nothing
            left to ask. */}
        {chat ? (
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link to={chat} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Back to the chat
          </Button>
        ) : (
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link to="/dashboard?ask=Help+me+post+a+job" />}
          >
            <SparklesIcon data-icon="inline-start" />
            Talk it through instead
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border bg-background p-4 sm:p-6">
        <Field
          id="job-title"
          label="Job title"
          required
          error={titleMissing ? "A posting needs a title." : undefined}
        >
          <Input
            id="job-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Head of Marketing"
            aria-invalid={titleMissing || undefined}
          />
        </Field>

        <Field id="job-locations" label="Location">
          <LocationPicker
            label="Location"
            placeholder="Type a city, or Remote"
            options={[...JOB_LOCATIONS, REMOTE]}
            chosen={locations}
            onChange={(next) => {
              setLocations(next)
              // Remote is a location AND a way of working; picking it here
              // answers the question below too, the way it does in the chat.
              if (next.includes(REMOTE)) setMode("remote")
            }}
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            id="job-xp-min"
            label="Experience"
            hint="Years. Leave the maximum empty for open-ended."
          >
            <RangeInputs
              id="job-xp"
              min={xpMin}
              max={xpMax}
              onMin={setXpMin}
              onMax={setXpMax}
              unit="yrs"
            />
          </Field>

          <Field
            id="job-pay-min"
            label="Pay"
            hint="Lakhs a year. Leave both empty for Not disclosed."
          >
            <RangeInputs
              id="job-pay"
              min={payMin}
              max={payMax}
              onMin={setPayMin}
              onMax={setPayMax}
              unit="₹L"
            />
          </Field>
        </div>

        <Field id="job-skills" label="Must-have skills">
          <TagInput
            id="job-skills"
            value={skills}
            onChange={setSkills}
            placeholder="Type a skill and press Enter"
          />
          {proposed.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                Suggested from the title:
              </span>
              {proposed.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setSkills([...skills, skill])}
                  className="inline-flex items-center gap-1 rounded-4xl border bg-background px-2.5 py-1 text-xs font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <PlusIcon className="size-3" />
                  {skill}
                </button>
              ))}
            </div>
          ) : null}
        </Field>

        {/* Only a plus. Refinement moves skills here in the chat; here it is
            a second list, so the posting can say which is which. */}
        <Field id="job-nice" label="Good-to-have skills">
          <TagInput
            id="job-nice"
            value={niceSkills}
            onChange={setNiceSkills}
            placeholder="Type a skill and press Enter"
          />
        </Field>

        <Field
          id="job-team"
          label="Team"
          hint="Leave empty for an individual contributor."
        >
          <Input
            id="job-team"
            value={teamScale}
            onChange={(event) => setTeamScale(event.target.value)}
            placeholder="Leads a team of 8"
          />
        </Field>

        <Field id="job-mode" label="Work mode">
          <ToggleGroup
            variant="outline"
            spacing={0}
            aria-label="Work mode"
            value={mode ? [mode] : []}
            onValueChange={(value) =>
              setMode((value[0] as WorkMode | undefined) ?? null)
            }
          >
            {WORK_MODES.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <div className="flex items-center justify-between gap-4">
          <Label
            htmlFor="job-relocation"
            className="flex-col items-start gap-0.5"
          >
            Relocation support
            <span className="text-xs font-normal text-muted-foreground">
              Says so on the posting, for people who would move.
            </span>
          </Label>
          <Switch
            id="job-relocation"
            checked={relocationSupport}
            onCheckedChange={setRelocationSupport}
          />
        </div>

        <Field id="job-description" label="Description">
          <Textarea
            id="job-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What the role is, what they'll need, how you hire."
            className="min-h-48"
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 self-start text-muted-foreground"
            disabled={!draft.title}
            onClick={() => setDescription(describePosting(draft))}
          >
            <RefreshCwIcon data-icon="inline-start" />
            Redraft from the fields
          </Button>
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 pb-6">
        <Button
          nativeButton={false}
          variant="ghost"
          render={<Link to="/jobs" />}
        >
          Cancel
        </Button>
        <Button onClick={post}>Post job</Button>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  hint,
  required,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="gap-1">
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function RangeInputs({
  id,
  min,
  max,
  onMin,
  onMax,
  unit,
}: {
  id: string
  min: string
  max: string
  onMin: (value: string) => void
  onMax: (value: string) => void
  unit: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        id={`${id}-min`}
        type="number"
        inputMode="decimal"
        min={0}
        value={min}
        onChange={(event) => onMin(event.target.value)}
        placeholder="Min"
        aria-label={`Minimum ${unit}`}
      />
      <span className="text-sm text-muted-foreground">to</span>
      <Input
        id={`${id}-max`}
        type="number"
        inputMode="decimal"
        min={0}
        value={max}
        onChange={(event) => onMax(event.target.value)}
        placeholder="Max"
        aria-label={`Maximum ${unit}`}
      />
      <span className="shrink-0 text-sm text-muted-foreground">{unit}</span>
    </div>
  )
}

const text = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value)

/**
 * Two boxes read as one span. Only a maximum is "up to" — a minimum of zero —
 * and a maximum below the minimum is left as typed rather than silently
 * swapped, since the recruiter is probably still typing it.
 */
function spanOf(min: string, max: string): Span | null {
  const low = min.trim() === "" ? null : Number(min)
  const high = max.trim() === "" ? null : Number(max)
  if (low === null && high === null) return null
  if (low !== null && !Number.isFinite(low)) return null
  return {
    min: low ?? 0,
    max: high !== null && Number.isFinite(high) ? high : null,
  }
}
