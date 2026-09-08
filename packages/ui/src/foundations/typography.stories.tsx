import type { Meta, StoryObj } from "@storybook/react-vite"

const SCALE = [
  {
    cls: "text-2xl font-medium tabular-nums",
    label: "text-2xl · medium",
    use: "Stat value",
  },
  {
    cls: "text-xl font-semibold",
    label: "text-xl · semibold",
    use: "Hero greeting",
  },
  {
    cls: "text-base font-medium",
    label: "text-base · medium",
    use: "Page title (SiteHeader), CardTitle",
  },
  {
    cls: "text-sm font-medium",
    label: "text-sm · medium",
    use: "Section heading, row title, Label",
  },
  { cls: "text-sm", label: "text-sm", use: "Body, form fields, menu items" },
  {
    cls: "text-sm text-muted-foreground",
    label: "text-sm · muted",
    use: "Descriptions, helper copy",
  },
  {
    cls: "text-xs text-muted-foreground",
    label: "text-xs · muted",
    use: "Meta line, badges, stat detail",
  },
]

// Literal class names, so Tailwind's scan can see them.
const RADII = [
  { name: "sm", cls: "rounded-sm" },
  { name: "md", cls: "rounded-md" },
  { name: "lg", cls: "rounded-lg" },
  { name: "xl", cls: "rounded-xl" },
  { name: "2xl", cls: "rounded-2xl" },
  { name: "3xl", cls: "rounded-3xl" },
  { name: "4xl", cls: "rounded-4xl" },
]

const meta = {
  title: "Foundations/Typography & radius",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
Inter Variable throughout; \`--font-heading\` aliases the same face, so a
heading is a weight, not a font. The scale is small on purpose — a
recruiter tool is mostly 14px body with 12px meta under it, and the two
larger sizes are for a number or a greeting, not for headings.

Radius is one variable, \`--radius\` (10px), multiplied out: \`rounded-4xl\`
(26px) is why buttons, inputs and badges read as pills; cards are \`2xl\`.
Shared by both brands.
        `,
      },
    },
  },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Scale: Story = {
  render: () => (
    <div className="flex w-2xl flex-col divide-y divide-border">
      {SCALE.map((step) => (
        <div
          key={step.label}
          className="grid grid-cols-[1fr_auto] items-baseline gap-6 py-3"
        >
          <p className={step.cls}>
            Principal Engineer, Platform Infrastructure
          </p>
          <div className="flex flex-col items-end text-right">
            <code className="text-xs">{step.label}</code>
            <span className="text-xs text-muted-foreground">{step.use}</span>
          </div>
        </div>
      ))}
    </div>
  ),
}

export const Radius: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {RADII.map((radius) => (
        <div key={radius.name} className="flex flex-col items-center gap-2">
          <div
            className={`size-16 bg-muted ring-1 ring-foreground/10 ${radius.cls}`}
          />
          <code className="text-xs">{radius.cls}</code>
        </div>
      ))}
    </div>
  ),
}
