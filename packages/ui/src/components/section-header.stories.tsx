import type { Meta, StoryObj } from "@storybook/react-vite"
import { ArrowRightIcon, PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { SectionHeader } from "@workspace/ui/components/section-header"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Patterns/Section header",
  component: SectionHeader,
  parameters: {
    design: design("section-header"),
    layout: "padded",
    docs: {
      description: {
        component: `
A titled row above a block, with an optional action on the right. The
dashboard has three of these ("Active jobs · View all").

It reserves the height of a small button whether or not it has one, so
sections with and without actions keep the same rhythm.

The action is unstyled on purpose. In the app it is usually
\`<Button variant="link" size="sm" className="px-0" render={<Link to="…" />}>\`
— a link that looks like a link but composes with the router.
        `,
      },
    },
  },
  args: { title: "Active jobs" },
} satisfies Meta<typeof SectionHeader>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => <SectionHeader {...args} className="w-lg" />,
}

export const WithLinkAction: Story = {
  render: (args) => (
    <SectionHeader
      {...args}
      className="w-lg"
      action={
        <Button
          variant="link"
          size="sm"
          className="px-0"
          render={<a href="#jobs" />}
        >
          View all
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      }
    />
  ),
}

export const WithDescription: Story = {
  args: {
    title: "Recent searches",
    description: "Saved runs against the resume database.",
  },
  render: (args) => (
    <SectionHeader
      {...args}
      className="w-lg"
      action={
        <Button size="sm" variant="outline">
          <PlusIcon data-icon="inline-start" />
          New search
        </Button>
      }
    />
  ),
}
