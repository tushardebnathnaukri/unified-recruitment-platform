import type { Meta, StoryObj } from "@storybook/react-vite"
import { BriefcaseIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item"
import { ListCard } from "@workspace/ui/components/list-card"
import { design } from "@workspace/ui/lib/figma"

const JOBS = [
  {
    title: "Principal Engineer, Platform Infrastructure",
    meta: "Bengaluru · Expires in 6 days",
    unread: 32,
  },
  {
    title: "Engineering Manager — Payments",
    meta: "Multiple locations · Expires in 3 days",
    unread: 0,
  },
  {
    title: "Product Designer II",
    meta: "Pune · Expires in 14 days",
    unread: 7,
  },
]

const meta = {
  title: "Patterns/List card",
  component: ListCard,
  parameters: {
    design: design("list-card"),
    layout: "padded",
    docs: {
      description: {
        component: `
A \`Card\` whose body is a list of \`Item\`s divided by hairlines. Every list
on the dashboard is one of these.

The card owns the dividers, so a row never needs to know whether it is
first. Rows drop their radius, side borders and outside focus ring here —
each of those was fighting the card's corners or clipping.

Rows are plain \`Item\`s: \`render={<a />}\` (or a router \`Link\`) makes one a
link and turns on its hover. See Compositions → Dashboard for the three
real rows, which use \`Meta\` for the grey line.
        `,
      },
    },
  },
} satisfies Meta<typeof ListCard>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <ListCard className="w-xl">
      {JOBS.map((job) => (
        <Item key={job.title} render={<a href="#job" />}>
          <ItemContent>
            <ItemTitle>{job.title}</ItemTitle>
            <ItemDescription>{job.meta}</ItemDescription>
          </ItemContent>
          <ItemActions>
            {job.unread > 0 ? (
              <Badge variant="success" className="font-normal">
                {job.unread} new
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">Nothing new</span>
            )}
          </ItemActions>
        </Item>
      ))}
    </ListCard>
  ),
}

export const Static: Story = {
  name: "Static rows (no hover)",
  render: () => (
    <ListCard className="w-xl">
      {JOBS.map((job) => (
        <Item key={job.title}>
          <ItemMedia variant="icon">
            <BriefcaseIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{job.title}</ItemTitle>
            <ItemDescription>{job.meta}</ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ListCard>
  ),
}

export const Compact: Story = {
  render: () => (
    <ListCard className="w-md">
      {JOBS.map((job) => (
        <Item key={job.title} size="sm" render={<a href="#job" />}>
          <ItemContent>
            <ItemTitle>{job.title}</ItemTitle>
          </ItemContent>
          <ItemActions className="text-xs text-muted-foreground tabular-nums">
            {job.unread} new
          </ItemActions>
        </Item>
      ))}
    </ListCard>
  ),
}
