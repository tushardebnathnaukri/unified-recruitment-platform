import type { Meta, StoryObj } from "@storybook/react-vite"

import { Label } from "@workspace/ui/components/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Radio group",
  component: RadioGroup,
  parameters: {
    design: design("radio-group"),
    docs: {
      description: {
        component: `
Base UI \`RadioGroup\` + \`Radio\`. Use it for a short list of mutually
exclusive choices where seeing every option at once matters — plan tier,
employment type. Past five or six options it should be a \`Select\`.

For a *visual* single-choice control (a segmented "brand" switch), reach for
\`ToggleGroup\` instead; this one always looks like radios.
        `,
      },
    },
  },
} satisfies Meta<typeof RadioGroup>

export default meta

type Story = StoryObj<typeof meta>

const PLANS = [
  { value: "basic", label: "Basic", hint: "Applications only" },
  { value: "pro", label: "Pro", hint: "Applications plus 20 database matches" },
]

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="pro" aria-label="Plan" className="w-80">
      {PLANS.map((plan) => (
        <div key={plan.value} className="flex items-start gap-2">
          <RadioGroupItem
            id={`rg-${plan.value}`}
            value={plan.value}
            className="mt-0.5"
          />
          <div className="flex flex-col gap-0.5">
            <Label htmlFor={`rg-${plan.value}`}>{plan.label}</Label>
            <p className="text-xs text-muted-foreground">{plan.hint}</p>
          </div>
        </div>
      ))}
    </RadioGroup>
  ),
}

export const Horizontal: Story = {
  render: () => (
    <RadioGroup
      defaultValue="full-time"
      aria-label="Employment type"
      className="flex w-auto gap-4"
    >
      {["Full-time", "Contract", "Internship"].map((label) => {
        const value = label.toLowerCase()
        return (
          <div key={value} className="flex items-center gap-2">
            <RadioGroupItem id={`rg-h-${value}`} value={value} />
            <Label htmlFor={`rg-h-${value}`} className="font-normal">
              {label}
            </Label>
          </div>
        )
      })}
    </RadioGroup>
  ),
}

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="pro" disabled aria-label="Plan" className="w-64">
      {PLANS.map((plan) => (
        <div key={plan.value} className="flex items-center gap-2">
          <RadioGroupItem id={`rg-d-${plan.value}`} value={plan.value} />
          <Label htmlFor={`rg-d-${plan.value}`}>{plan.label}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
}
