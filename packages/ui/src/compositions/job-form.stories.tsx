import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Chip } from "@workspace/ui/components/chip"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"

const LOCATIONS = {
  bengaluru: "Bengaluru",
  gurugram: "Gurugram",
  pune: "Pune",
  remote: "Remote",
}
const EXPERIENCE = {
  "3-6": "3–6 years",
  "6-9": "6–9 years",
  "9-14": "9–14 years",
  "14+": "14+ years",
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

const meta = {
  title: "Compositions/Post a job form",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
Every form control in the system on one card, arranged the way a job
posting would use them. The point is to see them *together* — pill inputs
next to a rounded textarea, radios next to chips — and check the rhythm
holds: 8px label-to-field, 16px between fields, 24px card padding.

There is no form library in this prototype; \`aria-invalid\` is the contract
for whichever one arrives.
        `,
      },
    },
  },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="w-2xl max-w-full">
      <CardHeader>
        <CardTitle>Post a job</CardTitle>
        <CardDescription>
          Goes live on iimjobs as soon as you publish. You can edit it after.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field label="Job title" htmlFor="jf-title">
          <Input id="jf-title" placeholder="Principal Engineer, Platform" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" htmlFor="jf-location">
            <Select items={LOCATIONS}>
              <SelectTrigger id="jf-location" className="w-full">
                <SelectValue placeholder="Choose a city" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LOCATIONS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Experience" htmlFor="jf-experience">
            <Select items={EXPERIENCE} defaultValue="9-14">
              <SelectTrigger id="jf-experience" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPERIENCE).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field
          label="What they need to have done"
          htmlFor="jf-mandate"
          hint="Two sentences is plenty. Candidates read this before the title."
        >
          <Textarea
            id="jf-mandate"
            placeholder="Run Kafka at scale, and been the person on call for it."
          />
        </Field>

        <div className="flex flex-col gap-2">
          <Label>Must have</Label>
          <div className="flex flex-wrap gap-1.5">
            {["Kafka", "Kubernetes", "Go", "Postgres", "On-call ownership"].map(
              (skill, index) => (
                <Chip key={skill} selected={index < 2}>
                  {skill}
                </Chip>
              )
            )}
          </div>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-medium">Plan</legend>
          <RadioGroup defaultValue="pro">
            <div className="flex items-start gap-2">
              <RadioGroupItem id="jf-basic" value="basic" className="mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="jf-basic">Basic</Label>
                <p className="text-xs text-muted-foreground">
                  Applications only.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem id="jf-pro" value="pro" className="mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="jf-pro">Pro</Label>
                <p className="text-xs text-muted-foreground">
                  Applications plus 20 instant database matches. Uses 1 credit.
                </p>
              </div>
            </div>
          </RadioGroup>
        </fieldset>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox id="jf-confidential" />
            <Label htmlFor="jf-confidential" className="font-normal">
              Hide company name
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="jf-notify" defaultChecked />
            <Label htmlFor="jf-notify" className="font-normal">
              Email me for each applicant
            </Label>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        <Button variant="outline">Save draft</Button>
        <Button>Publish</Button>
      </CardFooter>
    </Card>
  ),
}
