import type { Meta, StoryObj } from "@storybook/react-vite"
import { MoreHorizontalIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { design } from "@workspace/ui/lib/figma"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

const meta = {
  title: "Components/Card",
  component: Card,
  parameters: {
    design: design("card"),
    docs: {
      description: {
        component: `
The surface everything on a page sits on. Padding is one variable,
\`--card-spacing\`, set by \`size\` (\`default\` = 24px, \`sm\` = 16px) and read by
every sub-part — so a card's parts always agree on their gutter.

Note the card itself only pads **vertically**; \`CardHeader\`, \`CardContent\`
and \`CardFooter\` supply the horizontal padding. Put raw children in a card
and they run edge to edge, which is exactly what \`ListCard\` (Patterns) wants
and exactly what a stat tile does not.

\`CardAction\` slots into the header's top-right via a grid, so a title, a
description and a menu button lay out without any flex juggling.
        `,
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["default", "sm"] },
  },
  args: { size: "default" },
} satisfies Meta<typeof Card>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Card {...args} className="w-96">
      <CardHeader>
        <CardTitle>Principal Engineer, Platform</CardTitle>
        <CardDescription>Bengaluru · Posted 6 days ago</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" aria-label="More">
            <MoreHorizontalIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        148 applicants, 32 you have not opened. The posting expires in 6 days.
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">Review applicants</Button>
        <Button size="sm" variant="outline">
          Extend
        </Button>
      </CardFooter>
    </Card>
  ),
}

export const Small: Story = {
  args: { size: "sm" },
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <CardTitle>Interviews today</CardTitle>
        <CardDescription>Two, both before noon.</CardDescription>
      </CardHeader>
      <CardContent>
        Aditi Kapoor at 10:00, then Rohan Mehta at 11:30.
      </CardContent>
    </Card>
  ),
}

export const HeaderBorder: Story = {
  name: "With divided header and footer",
  render: (args) => (
    <Card {...args} className="w-96">
      <CardHeader className="border-b">
        <CardTitle>Posting credits</CardTitle>
        <CardDescription>9 of 25 used this quarter</CardDescription>
      </CardHeader>
      <CardContent>Credits reset on 1 October.</CardContent>
      <CardFooter className="border-t">
        <Button size="sm" variant="outline">
          Buy more
        </Button>
      </CardFooter>
    </Card>
  ),
}
