import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  BriefcaseIcon,
  CalendarCheckIcon,
  TicketIcon,
  UsersIcon,
} from "lucide-react"

import { StatCard, StatGrid } from "@workspace/ui/components/stat-card"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Patterns/Stat card",
  component: StatCard,
  parameters: {
    design: design("stat-card"),
    docs: {
      description: {
        component: `
One number with a label and a line of context. Extracted from the
dashboard's stat row, where four of them sit under the hero.

\`detail\` is a sentence, not a delta: "2 expiring this week" tells a
recruiter something; "+18%" against an unstated baseline does not.

\`StatGrid\` holds the layout rule: two across on a narrow column, four when
there is room, never three. It responds to the nearest container, not the
viewport — in the app that is the content column, which is what actually
narrows when the sidebar opens.

**Parked (2026-09-03):** as built these show standing totals, and three of
the dashboard's four were judged unable to prompt an action. The agreed
direction is queues with an age ("To review · oldest 3 days") that click
through to a filtered list. The tile shape survives that; the data does not.
        `,
      },
    },
  },
  args: {
    label: "Active jobs",
    value: "6",
    detail: "2 expiring this week",
  },
} satisfies Meta<typeof StatCard>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <StatCard {...args} icon={<BriefcaseIcon />} className="w-56" />
  ),
}

export const WithoutDetail: Story = {
  args: { detail: undefined },
  render: (args) => <StatCard {...args} className="w-56" />,
}

export const Grid: Story = {
  name: "Grid (resize the canvas)",
  parameters: { layout: "padded" },
  render: () => (
    <div className="@container">
      <StatGrid>
        <StatCard
          label="Active jobs"
          value="6"
          detail="2 expiring this week"
          icon={<BriefcaseIcon />}
        />
        <StatCard
          label="Applicants"
          value="271"
          detail="48 you haven't opened"
          icon={<UsersIcon />}
        />
        <StatCard
          label="Interviews"
          value="5"
          detail="2 today"
          icon={<CalendarCheckIcon />}
        />
        <StatCard
          label="Posting credits"
          value="9"
          detail="of 25 used this quarter"
          icon={<TicketIcon />}
        />
      </StatGrid>
    </div>
  ),
}
