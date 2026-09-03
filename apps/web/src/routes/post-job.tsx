import * as React from "react"
import {
  ChevronRightIcon,
  CrownIcon,
  SparklesIcon,
  UploadIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { Field, OptionSelect } from "@/components/form-field"
import { TagInput } from "@/components/tag-input"
import {
  CATEGORIES,
  COURSE_TYPES,
  EXPERIENCE_YEARS,
  FUNCTIONAL_AREAS,
  GRADUATING_YEARS,
  JOB_PLANS,
  SALARY_UNITS,
  type JobPlan,
} from "@/lib/post-job"

const MAX_LOCATIONS = 3

/**
 * A row whose whole surface is the control — used for the two switch rows the
 * live form has (Pro + Boost, JD formatting), where the explanation is as long
 * as the label and needs to sit with it rather than under the field.
 */
function SwitchRow({
  id,
  title,
  description,
  badge,
  icon,
  checked,
  onCheckedChange,
}: {
  id: string
  title: string
  description: string
  badge?: React.ReactNode
  icon?: React.ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      {icon}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Label htmlFor={id} className="gap-2">
          {title}
          {badge}
        </Label>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

/**
 * Plan picker. The live form lists twelve features per plan inline, which is a
 * wall of text at the moment you are trying to make one decision — so the four
 * that differentiate are shown and the rest sit behind one toggle.
 */
function PlanPicker({
  plan,
  onPlanChange,
  boost,
  onBoostChange,
}: {
  plan: JobPlan
  onPlanChange: (plan: JobPlan) => void
  boost: boolean
  onBoostChange: (boost: boolean) => void
}) {
  const [comparing, setComparing] = React.useState(false)

  return (
    <Card className="gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Job type</h2>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => setComparing((open) => !open)}
        >
          {comparing ? "Hide full comparison" : "Compare all features"}
        </Button>
      </div>

      <RadioGroup
        value={plan}
        onValueChange={(value) => onPlanChange(value as JobPlan)}
        className="grid gap-3 sm:grid-cols-2"
      >
        {JOB_PLANS.map((option) => {
          const selected = option.value === plan

          return (
            <Label
              key={option.value}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-2 rounded-lg border border-border p-3 font-normal transition-colors",
                selected && "border-primary bg-primary/5"
              )}
            >
              <span className="flex w-full items-center gap-2">
                <RadioGroupItem value={option.value} />
                <span className="text-sm font-medium">{option.label}</span>
                {option.recommended && (
                  <Badge variant="secondary" className="ml-auto">
                    Recommended
                  </Badge>
                )}
              </span>

              <span className="text-xs leading-relaxed text-muted-foreground">
                {option.summary}
              </span>

              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                {(comparing
                  ? [...option.highlights, ...option.rest]
                  : option.highlights
                ).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </Label>
          )
        })}
      </RadioGroup>

      <SwitchRow
        id="boost"
        title="Pro + Boost"
        badge={<Badge variant="warning">formerly Premium</Badge>}
        icon={<CrownIcon className="size-4 shrink-0 text-warning" />}
        description="3x applicant reach — uses 1 Pro + Boost credit. Former Premium credits are now Pro + Boost credits."
        checked={boost}
        onCheckedChange={onBoostChange}
      />
    </Card>
  )
}

/** Two steps, so the second one is visible as a destination from the start. */
function Steps({ step }: { step: 1 | 2 }) {
  const labels = ["Basic details", "Additional details"]

  return (
    <ol className="grid grid-cols-2 gap-3">
      {labels.map((label, index) => {
        const active = index + 1 === step

        return (
          <li key={label} className="flex flex-col gap-2">
            <span
              className={cn(
                "text-sm font-medium",
                !active && "text-muted-foreground"
              )}
            >
              {label}
            </span>
            <span
              className={cn(
                "h-1 rounded-full",
                active ? "bg-primary" : "bg-muted"
              )}
            />
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Post a job — the first of two steps.
 *
 * Structure follows the live hirist form so it stays comparable, with four
 * changes, each of which fixes something that makes the live one hard to fill:
 *
 * 1. Salary is two number inputs and ONE unit, not two 99-item dropdowns and
 *    two independent unit pickers — which today let you pick a minimum in
 *    crores and a maximum in lakhs.
 * 2. Functional area is grouped. Fifty-odd options in a flat list cannot be
 *    scanned; the groups were already implicit in the ordering.
 * 3. Course type is checkboxes. The live control is drawn as radios but says
 *    "select all that apply", so the affordance contradicts the instruction.
 * 4. The plan comparison is collapsed to four differentiating features, with
 *    the full twelve behind a toggle.
 */
export function PostJobPage() {
  const [plan, setPlan] = React.useState<JobPlan>("pro")
  const [boost, setBoost] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [locations, setLocations] = React.useState<string[]>([])
  const [skills, setSkills] = React.useState<string[]>([])
  const [expMin, setExpMin] = React.useState("")
  const [expMax, setExpMax] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [formatJd, setFormatJd] = React.useState(false)
  const [videoJd, setVideoJd] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [functionalArea, setFunctionalArea] = React.useState("")
  const [salaryMin, setSalaryMin] = React.useState("")
  const [salaryMax, setSalaryMax] = React.useState("")
  const [salaryUnit, setSalaryUnit] = React.useState(SALARY_UNITS[0])
  const [hideSalary, setHideSalary] = React.useState(false)
  const [batchMin, setBatchMin] = React.useState("")
  const [batchMax, setBatchMax] = React.useState("")
  const [courseTypes, setCourseTypes] = React.useState<string[]>([])

  // Basic is a single-location plan, so the cap has to follow the plan rather
  // than sit in helper text the way it does today.
  const maxLocations = plan === "pro" ? MAX_LOCATIONS : 1

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 lg:px-6">
      <PlanPicker
        plan={plan}
        onPlanChange={setPlan}
        boost={boost}
        onBoostChange={setBoost}
      />

      <Card className="gap-6 p-4">
        <Steps step={1} />

        {/* Top of the form, because for anyone who already has a JD it
            replaces everything below it. */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <UploadIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-medium">Already have a JD?</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Upload it and we&rsquo;ll fill this form in. PNG, JPG, PDF or DOC,
              under 1 MB.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm">
            Upload
          </Button>
        </div>

        <Field label="Job title" htmlFor="title" required>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Eg. Product Manager, Senior Software Developer"
          />
        </Field>

        <Field
          label="Location"
          htmlFor="location"
          required
          hint={
            maxLocations === 1
              ? "Basic postings cover one location. Switch to Pro for up to 3."
              : `Up to ${maxLocations} locations.`
          }
        >
          <TagInput
            id="location"
            value={locations}
            onChange={setLocations}
            placeholder="Add a location"
            max={maxLocations}
          />
        </Field>

        <Field label="Years of experience" required>
          <div className="grid grid-cols-2 gap-3">
            <OptionSelect
              value={expMin}
              onValueChange={setExpMin}
              placeholder="Minimum"
              options={EXPERIENCE_YEARS}
            />
            <OptionSelect
              value={expMax}
              onValueChange={setExpMax}
              placeholder="Maximum"
              options={EXPERIENCE_YEARS.slice(1)}
            />
          </div>
        </Field>

        <Field
          label="Skills"
          htmlFor="skills"
          required
          hint="Press Enter after each skill."
        >
          <TagInput
            id="skills"
            value={skills}
            onChange={setSkills}
            placeholder="Add a skill"
          />
        </Field>

        <Field
          label="Job description"
          htmlFor="description"
          required
          action={
            <Button type="button" variant="outline" size="sm">
              <SparklesIcon data-icon="inline-start" />
              Write with AI
            </Button>
          }
        >
          <Textarea
            id="description"
            rows={8}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What the role owns, who it works with, and what success looks like in the first year."
          />
        </Field>

        <SwitchRow
          id="format-jd"
          title="Format my JD into the standard template"
          description="We'll structure it into About Role, Tech Stack and Key Responsibilities, and may add detail where it's light."
          checked={formatJd}
          onCheckedChange={setFormatJd}
        />

        <Field
          label="Video JD"
          htmlFor="video-jd"
          optional
          hint="A YouTube link shown alongside the description."
        >
          <Input
            id="video-jd"
            value={videoJd}
            onChange={(event) => setVideoJd(event.target.value)}
            placeholder="Paste a YouTube link here"
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Category" htmlFor="category" required>
            <OptionSelect
              id="category"
              value={category}
              onValueChange={setCategory}
              placeholder="Select"
              options={CATEGORIES}
            />
          </Field>

          <Field label="Functional area" htmlFor="functional-area" required>
            <Select
              value={functionalArea}
              onValueChange={(next) => setFunctionalArea(next as string)}
            >
              <SelectTrigger id="functional-area" className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {FUNCTIONAL_AREAS.map((group) => (
                  <SelectGroup key={group.group}>
                    <SelectLabel>{group.group}</SelectLabel>
                    {group.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field
          label="Annual salary"
          required
          hint="One unit applies to both ends of the range."
        >
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
            <Input
              type="number"
              min={0}
              value={salaryMin}
              onChange={(event) => setSalaryMin(event.target.value)}
              placeholder="Minimum"
              aria-label="Minimum annual salary"
            />
            <Input
              type="number"
              min={0}
              value={salaryMax}
              onChange={(event) => setSalaryMax(event.target.value)}
              placeholder="Maximum"
              aria-label="Maximum annual salary"
            />
            <OptionSelect
              value={salaryUnit}
              onValueChange={setSalaryUnit}
              placeholder="Unit"
              options={SALARY_UNITS}
              className="w-28"
            />
          </div>
        </Field>

        <Label className="flex items-start gap-3 font-normal">
          <Checkbox
            checked={hideSalary}
            onCheckedChange={(checked) => setHideSalary(checked === true)}
            className="mt-0.5"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              Don&rsquo;t show salary to candidates
            </span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              The listing shows &ldquo;Not disclosed&rdquo;. We still match on
              the range.
            </span>
          </span>
        </Label>

        <Field label="Graduating year" optional>
          <div className="grid grid-cols-2 gap-3">
            <OptionSelect
              value={batchMin}
              onValueChange={setBatchMin}
              placeholder="From"
              options={GRADUATING_YEARS}
            />
            <OptionSelect
              value={batchMax}
              onValueChange={setBatchMax}
              placeholder="To"
              options={GRADUATING_YEARS}
            />
          </div>
        </Field>

        {/* Checkboxes, not the radio-looking circles the live form uses for a
            field whose own helper text says "select all that apply". */}
        <Field label="Course type" optional hint="Select all that apply.">
          <div className="flex flex-wrap gap-2">
            {COURSE_TYPES.map((course) => {
              const checked = courseTypes.includes(course)

              return (
                <Label
                  key={course}
                  className={cn(
                    "cursor-pointer gap-2 rounded-4xl border border-border px-3 py-1.5 text-sm font-normal transition-colors",
                    checked && "border-primary bg-primary/5"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) =>
                      setCourseTypes(
                        next === true
                          ? [...courseTypes, course]
                          : courseTypes.filter((c) => c !== course)
                      )
                    }
                  />
                  {course}
                </Label>
              )
            })}
          </div>
        </Field>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost">
          Cancel
        </Button>
        <Button type="button">
          Continue
          <ChevronRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
