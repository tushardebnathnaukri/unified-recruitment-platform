import type { Meta, StoryObj } from "@storybook/react-vite"
import { BriefcaseIcon, SearchIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Empty",
  component: Empty,
  parameters: {
    design: design("empty"),
    docs: {
      description: {
        component: `
The empty state. The live recruiter dashboard is *made* of these — an
account that has never posted a job sees four of them — so they are a
first-class state, not an afterthought. The mock data on the prototype's
dashboard is populated on purpose; this is the other half.

Copy rule from the live site, kept: say what will appear here once there is
something ("You will see a list here when you do"), then offer the one action
that gets you there. \`EmptyMedia variant="icon"\` gives the icon a muted tile.
        `,
      },
    },
  },
} satisfies Meta<typeof Empty>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Empty className="w-md">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BriefcaseIcon />
        </EmptyMedia>
        <EmptyTitle>No active jobs</EmptyTitle>
        <EmptyDescription>
          Applicants show up here as soon as a posting is live.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Post a job</Button>
      </EmptyContent>
    </Empty>
  ),
}

export const InCard: Story = {
  name: "Inside a card",
  render: () => (
    <Card className="w-lg">
      <Empty className="p-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchIcon />
          </EmptyMedia>
          <EmptyTitle>No recent searches</EmptyTitle>
          <EmptyDescription>
            Searches you run against the database will be listed here, with what
            changed since you last ran them.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm">
            New search
          </Button>
        </EmptyContent>
      </Empty>
    </Card>
  ),
}
