import type { Meta, StoryObj } from "@storybook/react-vite"
import { CheckIcon } from "lucide-react"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  parameters: {
    design: design("avatar"),
    docs: {
      description: {
        component: `
Base UI \`Avatar\`. Recruiters mostly see candidates without photos, so the
**fallback is the common case, not the edge case** — design against initials
first. \`AvatarFallback\` renders while the image loads and stays if it fails.

Used in the sidebar account menu (\`NavUser\`), and will carry candidate
identity on every pipeline row. Three sizes; \`AvatarBadge\` scales with them.
        `,
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["sm", "default", "lg"] },
  },
  args: { size: "default" },
} satisfies Meta<typeof Avatar>

export default meta

type Story = StoryObj<typeof meta>

export const Initials: Story = {
  render: (args) => (
    <Avatar {...args}>
      <AvatarImage src="" alt="Priya Raman" />
      <AvatarFallback>PR</AvatarFallback>
    </Avatar>
  ),
}

export const WithImage: Story = {
  render: (args) => (
    <Avatar {...args}>
      <AvatarImage
        src="https://avatars.githubusercontent.com/u/124599?v=4"
        alt="shadcn"
      />
      <AvatarFallback>SC</AvatarFallback>
    </Avatar>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar size="sm">
        <AvatarFallback>PR</AvatarFallback>
      </Avatar>
      <Avatar size="default">
        <AvatarFallback>PR</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>PR</AvatarFallback>
      </Avatar>
    </div>
  ),
}

export const WithBadge: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar size="sm">
        <AvatarFallback>PR</AvatarFallback>
        <AvatarBadge />
      </Avatar>
      <Avatar>
        <AvatarFallback>PR</AvatarFallback>
        <AvatarBadge>
          <CheckIcon />
        </AvatarBadge>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>PR</AvatarFallback>
        <AvatarBadge>
          <CheckIcon />
        </AvatarBadge>
      </Avatar>
    </div>
  ),
}

export const Group: Story = {
  render: () => (
    <AvatarGroup>
      <Avatar>
        <AvatarFallback>PR</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>AK</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>SM</AvatarFallback>
      </Avatar>
      <AvatarGroupCount>+4</AvatarGroupCount>
    </AvatarGroup>
  ),
}
