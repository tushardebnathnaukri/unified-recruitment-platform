import type { Meta, StoryObj } from "@storybook/react-vite"

import { Card } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
  parameters: {
    design: design("skeleton"),
    docs: {
      description: {
        component: `
A pulsing block the size of the thing that is loading. Size it from the
outside — a skeleton is only convincing if it matches the layout it stands
in for, so build the loading state from the same grid as the loaded one.

There is no backend in this prototype, so this is for designing the state,
not for waiting on one. \`SidebarMenuSkeleton\` is the sidebar's own.
        `,
      },
    },
  },
} satisfies Meta<typeof Skeleton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <Skeleton className="h-4 w-48" />,
}

export const Row: Story = {
  name: "Candidate row",
  render: () => (
    <div className="flex w-96 items-center gap-3">
      <Skeleton className="size-8 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  ),
}

export const StatTile: Story = {
  name: "Stat tile",
  render: () => (
    <Card size="sm" className="w-56 gap-3 px-(--card-spacing)">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-12" />
      <Skeleton className="h-3 w-32" />
    </Card>
  ),
}
