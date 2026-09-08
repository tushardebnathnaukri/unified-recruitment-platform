import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  ArchiveIcon,
  CopyIcon,
  PencilIcon,
  Share2Icon,
  TrashIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Dropdown menu",
  component: DropdownMenu,
  parameters: {
    design: design("dropdown-menu"),
    docs: {
      description: {
        component: `
Base UI \`Menu\`. Two things differ from the Radix version most people know:

- The trigger composes with \`render\`, not \`asChild\`:
  \`<DropdownMenuTrigger render={<Button variant="outline" />}>\`.
- **\`DropdownMenuLabel\` is a group label and throws outside a
  \`DropdownMenuGroup\`.** Radix's stands alone. Wrap it.

The sidebar account menu (\`NavUser\`) is the live example; it also shows
\`side\` flipping to \`bottom\` on mobile via \`useSidebar().isMobile\`.
        `,
      },
    },
  },
} satisfies Meta<typeof DropdownMenu>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Job actions
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Principal Engineer, Platform</DropdownMenuLabel>
          <DropdownMenuItem>
            <PencilIcon />
            Edit posting
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CopyIcon />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Share2Icon />
            Share link
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <ArchiveIcon />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive">
            <TrashIcon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

function CheckboxAndRadioDemo() {
  const [unread, setUnread] = React.useState(true)
  const [sort, setSort] = React.useState("newest")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        View
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={unread}
            onCheckedChange={setUnread}
          >
            Unread only
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
            <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="match">
              Best match
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="experience">
              Experience
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const CheckboxAndRadio: Story = {
  render: () => <CheckboxAndRadioDemo />,
}

export const Submenu: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Move to
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem>Shortlisted</DropdownMenuItem>
          <DropdownMenuItem>Contacted</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Rejected</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuGroup>
                <DropdownMenuItem>Not a fit</DropdownMenuItem>
                <DropdownMenuItem>Compensation</DropdownMenuItem>
                <DropdownMenuItem>Withdrew</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}
