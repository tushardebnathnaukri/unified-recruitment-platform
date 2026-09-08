import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { Textarea } from "@workspace/ui/components/textarea"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Sheet",
  component: Sheet,
  parameters: {
    design: design("sheet"),
    docs: {
      description: {
        component: `
A side panel, on Base UI \`Dialog\`. The mobile sidebar is one of these
(\`side="left"\`); a candidate detail pane over a list is the other obvious
use.

\`SheetContent side\` picks the edge. \`SheetFooter\` is \`mt-auto\`, so
actions pin to the bottom however short the body is. \`showCloseButton\`
turns off the corner ×, for a sheet whose footer already closes it.
        `,
      },
    },
  },
} satisfies Meta<typeof Sheet>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Contact candidate
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Message Aditi Kapoor</SheetTitle>
          <SheetDescription>
            Sent from your iimjobs inbox. She will see your name and company.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sheet-subject">Subject</Label>
            <Input
              id="sheet-subject"
              defaultValue="Principal Engineer role at Acme"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sheet-body">Message</Label>
            <Textarea id="sheet-body" rows={6} />
          </div>
        </div>
        <SheetFooter className="flex-row justify-end">
          <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
          <Button>Send</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(["left", "right", "top", "bottom"] as const).map((side) => (
        <Sheet key={side}>
          <SheetTrigger render={<Button variant="outline" size="sm" />}>
            {side}
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>From the {side}</SheetTitle>
              <SheetDescription>
                The mobile sidebar uses left; detail panes use right.
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  ),
}
