import * as React from "react"
import {
  CrownIcon,
  InfoIcon,
  PlusIcon,
  RocketIcon,
  SparklesIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { useBrand } from "@workspace/ui/components/brand-provider"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { toast } from "@workspace/ui/components/toast"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { LocationPicker } from "@/components/location-picker"
import {
  draftOf,
  missingIn,
  payFrom,
  WORK_FROM_HOME,
  type JobFormValue,
  type Unit,
} from "@/lib/job-form"
import {
  describePosting,
  readDescription,
  REMOTE,
  type FieldId,
} from "@/lib/job-intake"
import { readDocument } from "@/lib/read-document"
import { RECRUITER } from "@/lib/recruiter"
import {
  CATEGORIES,
  FUNCTIONAL_AREAS,
  INDUSTRIES,
  JOB_LOCATIONS,
  SKILL_TAGS,
} from "@/lib/taxonomy"
import { functionForTitle, skillsForTitle } from "@/lib/title-intel"

/**
 * Post a job — the form, as iimjobs' own post-job form has it.
 *
 * MIRRORED OFF THE LIVE FORM, FIELD FOR FIELD. `beta-recruiter.iimjobs.com/
 * post-job` on 28 Sep 2026: a job type above (Pro, Basic, and a Pro + Boost
 * switch), then two steps — Basic Details, which is the posting, and
 * Additional Details, which is how people apply to it. The labels, the
 * required marks, the limits (3 locations, 5 industries, 10 screening
 * questions) and the option lists are theirs; the lists come from
 * `lib/taxonomy.ts`, which was pulled off the same form.
 *
 * CONTROLLED, SO IT CAN BE DRAWN IN TWO PLACES. `/jobs/new` gives it a value
 * of its own; the Dashboard's "Form beside chat" variant gives it one the
 * chat keeps filling in. `onCommit` says when a field the chat knows about
 * has been changed by hand and is done with — the box blurred, the picker
 * changed — so the page can record it as a turn without a turn per
 * keystroke. The rest of the fields are the form's alone.
 *
 * WHAT THIS PROTOTYPE COULD NOT COPY, IT SAYS SO. The JD upload reads PDF,
 * Word and text in the browser (`readDocument`) — not the PNG/JPG and old
 * `.doc` the live form takes, because nothing here reads images. "Generate JD
 * with AI" writes the description from the fields by the rules
 * (`describePosting`), not with a model. And the screening-question dialog was
 * never seen (the live step is gated behind a valid first step), so a question
 * here is just its wording.
 *
 * TWO PLANS, ONE FORM. Basic is Pro with things taken away — one location, no
 * video JD, no hiding the salary or the company — so it is the same fields
 * with some held back, not a second form. The live form throws the draft away
 * on switching; this one keeps what Basic can hold and says what it drops.
 *
 * POSTING IS NOT WIRED, AND THE BUTTON SAYS SO. There is no job board behind
 * this prototype: "Post job" checks the form and then says what would happen
 * next — moderation — rather than pretending a row appeared on the Jobs list.
 */

export function JobForm({
  value,
  onChange,
  onCommit,
  cancelTo,
  className,
}: {
  value: JobFormValue
  onChange: (next: JobFormValue) => void
  /** A field the chat knows about, changed by hand and done with. */
  onCommit?: (field: FieldId | "screening", next: JobFormValue) => void
  /** Where Cancel goes. Without one there is no Cancel. */
  cancelTo?: React.ReactElement
  className?: string
}) {
  const { brand } = useBrand()
  const pro = value.plan === "pro"

  const set = (
    patch: Partial<JobFormValue>,
    commit?: FieldId | "screening"
  ) => {
    const next = { ...value, ...patch }
    onChange(next)
    if (commit) onCommit?.(commit, next)
  }

  const [confirmBasic, setConfirmBasic] = React.useState(false)
  const [step, setStep] = React.useState<1 | 2>(1)
  const [tried, setTried] = React.useState(false)

  const draft = draftOf(value)

  // Suggested from the title, as the live form does once a title is typed,
  // less what is already taken.
  const suggested = React.useMemo(
    () =>
      draft.title
        ? skillsForTitle(draft.title, brand)
            .map((proposal) => proposal.skill)
            .filter((skill) => !value.skills.includes(skill))
            .slice(0, 14)
        : [],
    [draft.title, brand, value.skills]
  )
  const guessed = draft.title ? functionForTitle(draft.title) : null
  const suggestion =
    guessed &&
    (guessed.functionalArea !== value.area ||
      (guessed.category && guessed.category !== value.category))
      ? guessed
      : null

  const errors = tried ? missingIn(value) : {}

  const form = React.useRef<HTMLDivElement>(null)
  const next = () => {
    setTried(true)
    const missing = missingIn(value)
    if (Object.keys(missing).length) {
      // To the first field that needs something, after the errors render.
      requestAnimationFrame(() =>
        form.current
          ?.querySelector("[data-invalid]")
          ?.scrollIntoView({ behavior: "smooth", block: "center" })
      )
      return
    }
    setStep(2)
    form.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const post = () => {
    toast.add({
      title: `Ready to post: ${draft.title}`,
      description:
        "Publishing isn't wired up in this prototype. This is where the posting would go to moderation.",
    })
  }

  /**
   * DOWN TO WHAT BASIC HOLDS, NOT THROWN AWAY. The live form starts a new
   * draft on switching ("Your current details won't copy"); keeping the rest
   * is kinder and costs nothing to undo.
   */
  const switchToBasic = () => {
    set(
      {
        plan: "basic",
        boost: false,
        locations: value.locations.slice(0, 1),
        videoJd: "",
        hideSalary: false,
        videoProfile: false,
        hideCompany: false,
        linkedIn: true,
      },
      value.locations.length > 1 ? "locations" : undefined
    )
    setConfirmBasic(false)
  }

  const upload = React.useRef<HTMLInputElement>(null)
  const [reading, setReading] = React.useState(false)
  const fillFrom = async (file: File) => {
    if (file.size > 1024 * 1024) {
      toast.add({ title: "That file is over 1 MB." })
      return
    }
    setReading(true)
    const words = await readDocument(file)
    setReading(false)
    if (!words) {
      toast.add({
        title: `Couldn't read ${file.name}`,
        description: "Try a PDF or a Word (.docx) file with real text in it.",
      })
      return
    }
    // Only into what is still empty: an upload never overwrites what the
    // recruiter already typed. The JD itself becomes the description.
    const read = readDescription(words, brand, { document: true })
    const patch: Partial<JobFormValue> = {}
    const filled: FieldId[] = []
    if (!value.title.trim() && read.title) {
      patch.title = read.title
      filled.push("title")
    }
    if (!value.locations.length && read.locations?.length) {
      patch.locations = read.locations
        .filter((city) => city !== REMOTE)
        .slice(0, pro ? 3 : 1)
      filled.push("locations")
    }
    if (value.xpMin === "" && read.experience) {
      patch.xpMin = String(read.experience.min)
      patch.xpMax = text(read.experience.max)
      filled.push("experience")
    }
    if (value.pay.min === null && read.pay) {
      patch.pay = payFrom(read.pay)
      filled.push("pay")
    }
    if (!value.skills.length && read.skills?.length) {
      patch.skills = read.skills
      filled.push("skills")
    }
    if (!value.description.trim()) patch.description = words
    const next = { ...value, ...patch }
    onChange(next)
    for (const field of filled) onCommit?.(field, next)
    toast.add({ title: `Filled in from ${file.name}` })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* JOB TYPE. Two cards that are one radio, and a boost that is a switch
          rather than a third plan, because it is Pro with more reach. */}
      <section className="flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:p-6">
        <h2 className="text-sm font-medium">Job type</h2>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
          <PlanCard
            chosen={pro}
            onChoose={() => set({ plan: "pro" })}
            name="Pro"
            icon={<CrownIcon className="size-3.5 text-primary" />}
            badge="Recommended"
            summary="Advanced posting with all features — complimentary with your current plan for a limited time."
            features={PRO_FEATURES}
          />
          <PlanCard
            chosen={!pro}
            onChoose={() => pro && setConfirmBasic(true)}
            name="Basic"
            summary="Standard posting with essential features."
            features={BASIC_FEATURES}
          />
        </div>
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border p-3",
            !pro && "opacity-50"
          )}
        >
          <RocketIcon className="size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
              Pro + Boost
              <Badge variant="outline">Formerly Premium Posting</Badge>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label="About Pro + Boost credits"
                      className="text-muted-foreground"
                    />
                  }
                >
                  <InfoIcon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>
                  Your existing Premium posting credits have been converted to
                  Pro + Boost credits.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground">
              3x applicant reach, consumes 1 Pro + Boost credit.
            </p>
          </div>
          <Switch
            aria-label="Pro + Boost"
            checked={value.boost}
            disabled={!pro}
            onCheckedChange={(boost) => set({ boost })}
          />
        </div>
      </section>

      <section
        ref={form}
        className="flex scroll-mt-20 flex-col gap-6 rounded-2xl border bg-background p-4 sm:p-6"
      >
        {/* The two steps, as the live form draws them: a label over a bar,
            the bar filled for the step you are on and the ones behind it.
            Moving forward goes through Continue's checks. */}
        <div className="grid grid-cols-2 gap-2">
          {(["Basic Details", "Additional Details"] as const).map(
            (name, index) => {
              const at = (index + 1) as 1 | 2
              return (
                <button
                  key={name}
                  type="button"
                  aria-current={step === at ? "step" : undefined}
                  onClick={() => (at === 1 ? setStep(1) : next())}
                  className={cn(
                    "flex flex-col gap-2 text-left text-sm font-medium outline-none focus-visible:underline",
                    step >= at ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {name}
                  <span
                    className={cn(
                      "h-1 rounded-full",
                      step >= at ? "bg-primary" : "bg-muted"
                    )}
                  />
                </button>
              )
            }
          )}
        </div>

        {step === 1 ? (
          <>
            <div className="flex items-center gap-3 rounded-xl bg-primary/5 p-3 ring-1 ring-primary/15">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-background text-primary">
                <UploadIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Already have a JD?</p>
                <p className="text-xs text-muted-foreground">
                  Upload it and we'll fill this form in. PDF, Word (.docx) or
                  text, under 1 MB.
                </p>
              </div>
              <input
                ref={upload}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ""
                  if (file) void fillFrom(file)
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={reading}
                onClick={() => upload.current?.click()}
              >
                {reading ? "Reading…" : "Upload"}
              </Button>
            </div>

            <Field
              id="job-title"
              label="Job title"
              required
              error={errors.title}
            >
              <Input
                id="job-title"
                value={value.title}
                onChange={(event) => set({ title: event.target.value })}
                onBlur={() => onCommit?.("title", value)}
                placeholder="Eg. Product manager, Senior Software Developer"
                aria-invalid={Boolean(errors.title) || undefined}
              />
            </Field>

            <Field
              id="job-locations"
              label="Location"
              note={pro ? "Up to 3 locations." : "1 location on Basic."}
              required
              error={errors.locations}
            >
              <LocationPicker
                label="Location"
                placeholder="+Add location"
                options={JOB_LOCATIONS as readonly string[] as string[]}
                chosen={value.locations}
                onChange={(locations) => set({ locations }, "locations")}
                max={pro ? 3 : 1}
                invalid={Boolean(errors.locations)}
              />
            </Field>

            <Field
              id="job-xp-min"
              label="Years of experience"
              required
              error={errors.experience}
            >
              <div className="grid grid-cols-2 gap-3">
                <Choice
                  id="job-xp-min"
                  label="Minimum years"
                  placeholder="Select Min"
                  options={range(0, 30)}
                  value={value.xpMin || null}
                  onChange={(xpMin) =>
                    set({ xpMin: xpMin ?? "" }, "experience")
                  }
                  invalid={Boolean(errors.experience)}
                />
                <Choice
                  label="Maximum years"
                  placeholder="Select Max"
                  options={range(1, 30)}
                  value={value.xpMax || null}
                  onChange={(xpMax) =>
                    set({ xpMax: xpMax ?? "" }, "experience")
                  }
                  invalid={Boolean(errors.experience)}
                />
              </div>
            </Field>

            <Field
              id="job-skills"
              label="Skills"
              required
              error={errors.skills}
            >
              <LocationPicker
                label="Skills"
                placeholder="+ Add skill"
                options={SKILL_TAGS as readonly string[] as string[]}
                chosen={value.skills}
                onChange={(skills) => set({ skills }, "skills")}
                empty="No matching skill."
                invalid={Boolean(errors.skills)}
              />
              {suggested.length ? (
                <Suggestions
                  items={suggested}
                  onPick={(skill) =>
                    set({ skills: [...value.skills, skill] }, "skills")
                  }
                />
              ) : null}
            </Field>

            <Field
              id="job-description"
              label="Job description"
              required
              error={errors.description}
              action={
                <Button
                  size="sm"
                  disabled={!draft.title}
                  onClick={() => set({ description: describePosting(draft) })}
                >
                  <SparklesIcon data-icon="inline-start" />
                  Generate JD with AI
                </Button>
              }
            >
              <Textarea
                id="job-description"
                value={value.description}
                onChange={(event) => set({ description: event.target.value })}
                placeholder="What the role owns, who it works with, and what success looks like in the first year."
                className="min-h-48"
                aria-invalid={Boolean(errors.description) || undefined}
              />
            </Field>

            <ToggleRow
              id="job-format"
              label="Format my JD into the standard template"
              hint="We'll structure it into About Role, Tech Stack and Key Responsibilities, and may add detail where it's light."
              checked={value.formatJd}
              onChange={(formatJd) => set({ formatJd })}
            />

            {pro ? (
              <Field
                id="job-video"
                label="Video JD"
                note="A YouTube link shown alongside the description."
              >
                <Input
                  id="job-video"
                  type="url"
                  value={value.videoJd}
                  onChange={(event) => set({ videoJd: event.target.value })}
                  placeholder="Paste a Youtube link here"
                />
              </Field>
            ) : null}

            <Field
              id="job-industries"
              label="Industry"
              note="Up to 5 — describes the company, not the role."
              required
              error={errors.industries}
            >
              <LocationPicker
                label="Industry"
                placeholder="+Add company industry"
                options={INDUSTRIES as readonly string[] as string[]}
                chosen={value.industries}
                onChange={(industries) => set({ industries })}
                max={5}
                empty="No matching industry."
                invalid={Boolean(errors.industries)}
              />
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                id="job-category"
                label="Category"
                required
                error={errors.category}
              >
                <Choice
                  id="job-category"
                  label="Category"
                  placeholder="Select"
                  options={CATEGORIES as readonly string[] as string[]}
                  value={value.category}
                  onChange={(category) => set({ category })}
                  invalid={Boolean(errors.category)}
                />
              </Field>
              <Field
                id="job-area"
                label="Functional area"
                required
                error={errors.area}
              >
                <Choice
                  id="job-area"
                  label="Functional area"
                  placeholder="Select"
                  options={FUNCTIONAL_AREAS as readonly string[] as string[]}
                  value={value.area}
                  onChange={(area) => set({ area })}
                  invalid={Boolean(errors.area)}
                />
              </Field>
            </div>
            {/* The live form's "Suggestion" under Category, which it fills
                from the title — here one chip for the pair, since the title
                decides both at once. */}
            {suggestion ? (
              <Suggestions
                className="-mt-4"
                items={[
                  [suggestion.category, suggestion.functionalArea]
                    .filter(Boolean)
                    .join(" · "),
                ]}
                onPick={() =>
                  set({
                    category: suggestion.category ?? value.category,
                    area: suggestion.functionalArea,
                  })
                }
              />
            ) : null}

            <Field
              id="job-pay-min"
              label="Annual salary"
              required
              error={errors.pay}
            >
              <div className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
                <Choice
                  id="job-pay-min"
                  label="Minimum salary"
                  placeholder="Min Salary (in lakhs)"
                  options={range(1, 99)}
                  value={value.pay.min}
                  onChange={(min) => set({ pay: { ...value.pay, min } }, "pay")}
                  invalid={Boolean(errors.pay)}
                />
                <Choice
                  label="Minimum salary unit"
                  options={UNITS}
                  value={value.pay.minUnit}
                  onChange={(unit) =>
                    set(
                      {
                        pay: {
                          ...value.pay,
                          minUnit: (unit as Unit) ?? "Lakhs",
                        },
                      },
                      "pay"
                    )
                  }
                  className="w-28"
                />
                <Choice
                  label="Maximum salary"
                  placeholder="Max Salary (in lakhs)"
                  options={range(1, 99)}
                  value={value.pay.max}
                  onChange={(max) => set({ pay: { ...value.pay, max } }, "pay")}
                  invalid={Boolean(errors.pay)}
                />
                <Choice
                  label="Maximum salary unit"
                  options={UNITS}
                  value={value.pay.maxUnit}
                  onChange={(unit) =>
                    set(
                      {
                        pay: {
                          ...value.pay,
                          maxUnit: (unit as Unit) ?? "Lakhs",
                        },
                      },
                      "pay"
                    )
                  }
                  className="w-28"
                />
              </div>
              {pro ? (
                <CheckRow
                  id="job-hide-salary"
                  label="Hide salary from candidates"
                  hint={`The listing shows "Not disclosed". We still match on the range.`}
                  checked={value.hideSalary}
                  onChange={(hideSalary) => set({ hideSalary })}
                />
              ) : null}
            </Field>

            <Field
              id="job-batch-min"
              label="Graduating year"
              error={errors.batch}
            >
              <div className="grid grid-cols-2 gap-3">
                <Choice
                  id="job-batch-min"
                  label="Earliest batch"
                  placeholder="Min Batch"
                  options={BATCHES}
                  value={value.batchMin}
                  onChange={(batchMin) => set({ batchMin })}
                  clearable
                />
                <Choice
                  label="Latest batch"
                  placeholder="Max Batch"
                  options={BATCHES}
                  value={value.batchMax}
                  onChange={(batchMax) => set({ batchMax })}
                  clearable
                />
              </div>
            </Field>

            <Field
              id="job-courses"
              label="Course type"
              note="Select all that apply"
            >
              <Chips
                label="Course type"
                options={COURSE_TYPES}
                value={value.courses}
                onChange={(courses) => set({ courses })}
              />
            </Field>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-medium">Add Screening Questions</h3>
                <p className="text-xs text-muted-foreground">
                  Candidates will be asked to answer these question before they
                  submit their application. You can add up to 10 questions.
                </p>
              </div>
              {value.questions.map((question, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {index + 1}.
                  </span>
                  <Input
                    value={question}
                    onChange={(event) =>
                      set({
                        questions: value.questions.map((entry, at) =>
                          at === index ? event.target.value : entry
                        ),
                      })
                    }
                    onBlur={() => onCommit?.("screening", value)}
                    placeholder="Eg. Have you managed a P&L?"
                    aria-label={`Screening question ${index + 1}`}
                    autoFocus={
                      index === value.questions.length - 1 && !question
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove question ${index + 1}`}
                    onClick={() =>
                      set(
                        {
                          questions: value.questions.filter(
                            (_, at) => at !== index
                          ),
                        },
                        "screening"
                      )
                    }
                  >
                    <XIcon />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                disabled={value.questions.length >= 10}
                onClick={() => set({ questions: [...value.questions, ""] })}
              >
                <PlusIcon data-icon="inline-start" />
                Add Screening
              </Button>
            </div>

            {pro ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Video/Audio Profile</h3>
                <p className="text-xs text-muted-foreground">
                  Reduce time spent on screening candidates! Review a
                  candidate's Video/Audio Profile and easily filter out the
                  right candidates!
                </p>
                <CheckRow
                  id="job-video-profile"
                  label="Yes, I would prefer if the candidates have video/audio profile."
                  checked={value.videoProfile}
                  onChange={(videoProfile) => set({ videoProfile })}
                />
              </div>
            ) : null}

            <Field
              id="job-apply-url"
              label="Application redirection URL"
              note="Candidates are redirected here on apply. Include your source tracking parameter."
            >
              <Input
                id="job-apply-url"
                type="url"
                value={value.applyUrl}
                onChange={(event) => set({ applyUrl: event.target.value })}
                placeholder="https://"
              />
            </Field>

            <Field
              id="job-diversity"
              label="Diversity hiring"
              note="Select all that apply"
            >
              <Chips
                label="Diversity hiring"
                options={DIVERSITY}
                value={value.diversity}
                onChange={(diversity) => set({ diversity })}
              />
            </Field>

            <Field id="job-company" label="Which company are you hiring for?">
              <p className="-mt-1 text-xs text-muted-foreground">
                Company name helps us understand your job better and helps you
                find the right candidates.
              </p>
              <Input
                id="job-company"
                value={value.company}
                onChange={(event) => set({ company: event.target.value })}
                placeholder="Write the name of company you are hiring for"
              />
              {pro ? (
                <CheckRow
                  id="job-hide-company"
                  label="Don't show company name to applicants"
                  hint="Company name will never be shown to candidates if you choose this option."
                  checked={value.hideCompany}
                  onChange={(hideCompany) => set({ hideCompany })}
                />
              ) : null}
            </Field>

            {/* Optional on Pro, required on Basic — the plan cards say so. */}
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <div className="min-w-0 flex-1">
                <Label htmlFor="job-linkedin">
                  This will be published and shared as a post on your LinkedIn
                  profile
                </Label>
                <p className="truncate text-xs text-muted-foreground">
                  {RECRUITER.email}
                  {pro ? null : " · Required on Basic"}
                </p>
              </div>
              <Switch
                id="job-linkedin"
                checked={value.linkedIn}
                disabled={!pro}
                onCheckedChange={(linkedIn) => set({ linkedIn })}
              />
            </div>
          </>
        )}
      </section>

      <div className="flex items-center justify-end gap-2 pb-6">
        {step === 1 ? (
          <>
            {cancelTo ? (
              <Button nativeButton={false} variant="ghost" render={cancelTo}>
                Cancel
              </Button>
            ) : null}
            <Button onClick={next}>Continue</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={post}>Post job</Button>
          </>
        )}
      </div>

      <Dialog open={confirmBasic} onOpenChange={setConfirmBasic}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to Basic?</DialogTitle>
            <DialogDescription>
              Basic takes one location and no video JD, and it can't hide the
              salary or the company. We'll keep everything else you've filled
              in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={switchToBasic}>
              Switch to Basic
            </Button>
            <Button onClick={() => setConfirmBasic(false)}>Stay on Pro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const text = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value)

// --- What the live form offers -------------------------------------------------

/** What each plan gets, as the live form's "Know more" lists it. */
const PRO_FEATURES = [
  "Unlimited application access",
  "Multiple locations — up to 3",
  "Share job with your LinkedIn network — optional",
  "Recommended candidates from database",
  "Instant candidate reach",
  "JD upload — auto-fills the form",
  "AI-generated description",
  "Salary confidentiality",
  "Video JD",
  "Video and audio candidate profiles",
  "Confidential hiring",
]
const BASIC_FEATURES = [
  "Application access limited to 15",
  "1 location",
  "Share job with your LinkedIn network — required",
  "No recommended candidates from database",
  "No instant candidate reach",
  "JD upload — manual form",
  "No AI-generated description",
  "No salary confidentiality",
  "No Video JD",
  "No video and audio candidate profiles",
  "No Confidential hiring",
]

const UNITS: Unit[] = ["Lakhs", "Crores"]
const COURSE_TYPES = [
  "Full Time",
  "Part time",
  "Distance Learning Program",
  "Executive Program",
  "Certification",
]
const DIVERSITY = [
  "Female Candidates",
  "Women Joining back the workforce",
  "Ex-defence personnel",
  "Differently-abled candidates",
  WORK_FROM_HOME,
]
/** Newest first, as the live form lists them. */
const BATCHES = range(1970, 2026).reverse()

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, i) => String(from + i))
}

// --- Parts -----------------------------------------------------------------------

function PlanCard({
  chosen,
  onChoose,
  name,
  icon,
  badge,
  summary,
  features,
}: {
  chosen: boolean
  onChoose: () => void
  name: string
  icon?: React.ReactNode
  badge?: string
  summary: string
  features: string[]
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 rounded-xl border p-3 transition-colors",
        chosen ? "border-primary bg-primary/5" : "hover:bg-muted/40"
      )}
    >
      {/* The whole card is the radio; "Know more" sits above it. */}
      <button
        type="button"
        role="radio"
        aria-checked={chosen}
        onClick={onChoose}
        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span className="sr-only">{name}</span>
      </button>
      <div className="pointer-events-none flex items-center gap-2 text-sm font-medium">
        <span
          className={cn(
            "grid size-4 place-items-center rounded-full border",
            chosen && "border-primary"
          )}
        >
          {chosen ? <span className="size-2 rounded-full bg-primary" /> : null}
        </span>
        {icon}
        {name}
        {badge ? (
          <Badge className="ml-auto uppercase" variant="default">
            {badge}
          </Badge>
        ) : null}
      </div>
      <p className="pointer-events-none text-xs text-muted-foreground">
        {summary}{" "}
      </p>
      <Popover>
        <PopoverTrigger className="relative self-start text-xs font-medium text-primary hover:underline">
          Know more
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <p className="mb-2 text-sm font-medium">{name}</p>
          <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function Field({
  id,
  label,
  note,
  hint,
  required,
  error,
  action,
  children,
}: {
  id: string
  label: string
  /** Beside the label, in brackets — the live form's "(Up to 3 locations.)". */
  note?: string
  hint?: string
  required?: boolean
  error?: string
  /** On the label's row, at the far end — "Generate JD with AI". */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2" data-invalid={error ? "" : undefined}>
      <div className="flex items-end justify-between gap-3">
        <Label htmlFor={id} className="gap-1">
          {label}
          {required ? (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          ) : null}
          {note ? (
            <span className="text-xs font-normal text-muted-foreground">
              ({note})
            </span>
          ) : null}
        </Label>
        {action}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

/** One of a closed list — the live form's selects. */
function Choice({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  invalid,
  clearable,
  className,
}: {
  id?: string
  label: string
  placeholder?: string
  options: string[]
  value: string | null
  onChange: (value: string | null) => void
  invalid?: boolean
  /** An optional field: its placeholder is also an option, to take it back. */
  clearable?: boolean
  className?: string
}) {
  const items = [
    ...(clearable ? [{ value: null, label: placeholder ?? "Any" }] : []),
    ...options.map((option) => ({ value: option, label: option })),
  ]
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => onChange(next === null ? null : String(next))}
    >
      <SelectTrigger
        id={id}
        className={cn("w-full min-w-0", className)}
        aria-label={label}
        aria-invalid={invalid || undefined}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value ?? ""} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Several of a short list, as toggled chips. */
function Chips({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
}) {
  return (
    <ToggleGroup
      multiple
      variant="outline"
      aria-label={label}
      value={value}
      onValueChange={(next) => onChange(next as string[])}
      className="flex-wrap justify-start"
    >
      {options.map((option) => (
        <ToggleGroupItem key={option} value={option} size="sm">
          {option}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function Suggestions({
  items,
  onPick,
  className,
}: {
  items: string[]
  onPick: (item: string) => void
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="text-xs text-muted-foreground">Suggestion</span>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className="inline-flex items-center gap-1 rounded-4xl border border-primary/30 bg-background px-2.5 py-0.5 text-xs font-medium text-primary transition-colors outline-none hover:bg-primary/5 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {item}
        </button>
      ))}
    </div>
  )
}

function CheckRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
        className="mt-0.5"
      />
      <Label htmlFor={id} className="flex-col items-start gap-0.5">
        {label}
        {hint ? (
          <span className="text-xs font-normal text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </Label>
    </div>
  )
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
      <Label htmlFor={id} className="flex-col items-start gap-0.5">
        {label}
        <span className="text-xs font-normal text-muted-foreground">
          {hint}
        </span>
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
