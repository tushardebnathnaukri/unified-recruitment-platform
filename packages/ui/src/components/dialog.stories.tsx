import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Dialog",
  component: DialogContent,
  parameters: {
    design: design("dialog"),
    docs: {
      description: {
        component: `
A modal over the page. Base UI, so the trigger composes through \`render\`.

**Nothing in the prototype opens one directly yet.** It arrived as a registry
dependency of \`Command\` and is what \`CommandDialog\` is built on, so it is
documented here as the primitive it is rather than as a pattern the recruiter
product has settled on.

**Dialog or Sheet or Drawer?** A dialog interrupts to ask one question and
takes an answer. A \`Sheet\` is a side panel you can leave open while you read
the page behind it. A \`Drawer\` is the phone shape — it comes up from the
bottom and is swiped away. The response manager's filters are a Drawer for
exactly that reason, not a Dialog.

\`DialogContent\` draws its own close button in the corner; \`DialogClose\`
is for the explicit "Cancel" in the footer.
        `,
      },
    },
  },
} satisfies Meta<typeof DialogContent>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Close this posting
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close this posting?</DialogTitle>
          <DialogDescription>
            Applicants who have already responded stay in the response manager.
            The posting stops appearing in search.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button>Close posting</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const WithForm: Story = {
  name: "With a form",
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Rename project
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
          <DialogDescription>
            Only you and your team see this name.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="project">Project name</Label>
          <Input id="project" defaultValue="Platform hiring — Q3" />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}
