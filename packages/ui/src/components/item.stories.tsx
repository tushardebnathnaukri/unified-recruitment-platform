import type { Meta, StoryObj } from "@storybook/react-vite"
import { BriefcaseIcon, ChevronRightIcon, MapPinIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { design } from "@workspace/ui/lib/figma"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@workspace/ui/components/item"

const meta = {
  title: "Components/Item",
  component: Item,
  parameters: {
    design: design("item"),
    docs: {
      description: {
        component: `
shadcn's generic row: media on the left, a title and description in the
middle, actions on the right. This is the shape of every list in a recruiter
product — a job, a candidate, a saved search — so the dashboard's rows are
built on it rather than on hand-rolled flex.

Built on \`useRender\`: \`render={<a href />}\` (or a router \`Link\`) makes
the whole row a link, and the hover tint only appears when it *is* one —
a row you cannot click should not pretend.

\`ItemTitle\` clamps to one line and \`ItemDescription\` to two. Where the
title is the thing a row is identified by (a job title), override with
\`line-clamp-none\` rather than let it truncate — see the dashboard's job rows.

For rows inside a card with hairline dividers, use \`ListCard\` (Patterns).
        `,
      },
    },
  },
  argTypes: {
    variant: { control: "select", options: ["default", "outline", "muted"] },
    size: { control: "select", options: ["default", "sm", "xs"] },
  },
  args: { variant: "outline", size: "default" },
} satisfies Meta<typeof Item>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Item {...args} className="w-lg">
      <ItemMedia variant="icon">
        <BriefcaseIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Principal Engineer, Platform Infrastructure</ItemTitle>
        <ItemDescription>Bengaluru · Expires in 6 days</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button size="sm" variant="outline">
          Review
        </Button>
      </ItemActions>
    </Item>
  ),
}

export const Candidate: Story = {
  render: (args) => (
    <Item {...args} className="w-lg">
      <ItemMedia>
        <Avatar>
          <AvatarFallback>AK</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          Aditi Kapoor
          <Badge variant="success" className="font-normal">
            New
          </Badge>
        </ItemTitle>
        <ItemDescription>
          Staff Engineer at Razorpay · 11 yrs · Bengaluru
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button size="sm">Shortlist</Button>
      </ItemActions>
    </Item>
  ),
}

export const AsLink: Story = {
  render: (args) => (
    <Item {...args} render={<a href="#job" />} className="w-lg">
      <ItemContent>
        <ItemTitle>Engineering Manager — Payments</ItemTitle>
        <ItemDescription>
          <MapPinIcon className="mr-1 inline size-3.5" />
          Multiple locations
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <ChevronRightIcon className="size-4 text-muted-foreground" />
      </ItemActions>
    </Item>
  ),
}

export const Variants: Story = {
  render: () => (
    <div className="flex w-lg flex-col gap-3">
      {(["default", "outline", "muted"] as const).map((variant) => (
        <Item key={variant} variant={variant}>
          <ItemContent>
            <ItemTitle>{variant}</ItemTitle>
            <ItemDescription>Item variant</ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex w-lg flex-col gap-3">
      {(["default", "sm", "xs"] as const).map((size) => (
        <Item key={size} variant="outline" size={size}>
          <ItemMedia variant="icon">
            <BriefcaseIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Size {size}</ItemTitle>
          </ItemContent>
        </Item>
      ))}
    </div>
  ),
}

export const Group: Story = {
  render: () => (
    <ItemGroup className="w-lg">
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Shortlisted</ItemTitle>
          <ItemDescription>12 candidates</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Contacted</ItemTitle>
          <ItemDescription>5 candidates</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
}
