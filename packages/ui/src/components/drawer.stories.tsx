import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Drawer",
  component: DrawerContent,
  parameters: {
    design: design("drawer"),
    docs: {
      description: {
        component: `
The phone shape: a panel that comes up from an edge and is swiped away.

**This is the response manager's filter surface below \`md\`.** On a pointer
each filter pill opens its own popover — changing one filter is the common
case and a popover answers it in one click, under the control that asked. On
a phone there is no room to anchor five of those, so **every pill opens the
one drawer instead**: the same controls, in the shape each input can actually
use.

\`swipeDirection\` picks the edge (\`down\` by default, so it rises from the
bottom); \`showSwipeHandle\` draws the grab bar; \`snapPoints\` makes it a
sheet you can rest at half height. \`modal={false}\` leaves the page behind
it live.

Base UI's drawer, not vaul — the trigger composes through \`render\`.
        `,
      },
    },
  },
} satisfies Meta<typeof DrawerContent>

export default meta

type Story = StoryObj<typeof meta>

const BANDS = [
  { value: "any", label: "Any experience" },
  { value: "0-3", label: "0–3 yrs" },
  { value: "4-8", label: "4–8 yrs" },
  { value: "9-14", label: "9–14 yrs" },
]

/** Filter responses — the drawer every pill opens on a phone. */
export const FilterDrawer: Story = {
  name: "Filter drawer (as the app uses it)",
  render: () => (
    <Drawer showSwipeHandle>
      <DrawerTrigger render={<Button variant="outline" />}>
        Filter responses
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filter responses</DrawerTitle>
          <DrawerDescription>
            Narrow the list. Everything here is also in the URL.
          </DrawerDescription>
        </DrawerHeader>

        <div className="grid gap-4 px-4">
          <div className="grid gap-1.5">
            <Label>Experience</Label>
            <Select defaultValue="any">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BANDS.map((band) => (
                  <SelectItem key={band.value} value={band.value}>
                    {band.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DrawerFooter>
          <Button>Show 42 responses</Button>
          <DrawerClose render={<Button variant="outline" />}>
            Cancel
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
}

/** `swipeDirection` puts it on any edge. */
export const FromTheSide: Story = {
  name: "From the side",
  render: () => (
    <Drawer swipeDirection="right">
      <DrawerTrigger render={<Button variant="outline" />}>
        Open from the right
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>From the right</DrawerTitle>
          <DrawerDescription>
            Swiped away sideways. At this edge a Sheet is usually the better
            answer — this exists for the cases where the swipe matters.
          </DrawerDescription>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  ),
}
