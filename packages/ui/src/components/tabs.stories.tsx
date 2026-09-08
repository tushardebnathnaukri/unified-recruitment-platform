import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  parameters: {
    design: design("tabs"),
    docs: {
      description: {
        component: `
Base UI \`Tabs\`. Two looks on \`TabsList\`: \`default\` is a pill track,
\`line\` is an underline. The pill is for a control that switches a *view*
(list / board); the underline is for sectioning a *page* (Applicants /
Shortlist / Interviews on a job) and sits flush with its content.

\`orientation="vertical"\` stacks the triggers down the left.
        `,
      },
    },
  },
} satisfies Meta<typeof Tabs>

export default meta

type Story = StoryObj<typeof meta>

const PANELS = [
  {
    value: "applicants",
    label: "Applicants",
    body: "148 applicants, 32 unread.",
  },
  {
    value: "shortlist",
    label: "Shortlist",
    body: "12 shortlisted, 5 contacted.",
  },
  { value: "interviews", label: "Interviews", body: "2 scheduled this week." },
]

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="applicants" className="w-96">
      <TabsList>
        {PANELS.map((panel) => (
          <TabsTrigger key={panel.value} value={panel.value}>
            {panel.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {PANELS.map((panel) => (
        <TabsContent
          key={panel.value}
          value={panel.value}
          className="text-muted-foreground"
        >
          {panel.body}
        </TabsContent>
      ))}
    </Tabs>
  ),
}

export const Line: Story = {
  render: () => (
    <Tabs defaultValue="applicants" className="w-96">
      <TabsList variant="line">
        {PANELS.map((panel) => (
          <TabsTrigger key={panel.value} value={panel.value}>
            {panel.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {PANELS.map((panel) => (
        <TabsContent
          key={panel.value}
          value={panel.value}
          className="text-muted-foreground"
        >
          {panel.body}
        </TabsContent>
      ))}
    </Tabs>
  ),
}

export const Vertical: Story = {
  render: () => (
    <Tabs defaultValue="applicants" orientation="vertical" className="w-96">
      <TabsList>
        {PANELS.map((panel) => (
          <TabsTrigger key={panel.value} value={panel.value}>
            {panel.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {PANELS.map((panel) => (
        <TabsContent
          key={panel.value}
          value={panel.value}
          className="pl-4 text-muted-foreground"
        >
          {panel.body}
        </TabsContent>
      ))}
    </Tabs>
  ),
}
