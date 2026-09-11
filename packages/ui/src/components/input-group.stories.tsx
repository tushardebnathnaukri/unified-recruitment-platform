import type { Meta, StoryObj } from "@storybook/react-vite"
import { ArrowUpIcon, IndianRupeeIcon, SearchIcon } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Components/Input group",
  component: InputGroup,
  parameters: {
    design: design("input-group"),
    docs: {
      description: {
        component: `
An input and the things attached to it, sharing one border and one focus
ring. The ring is drawn by the GROUP via \`has-[…:focus-visible]\`, so an
addon button inside it never gets a second ring of its own.

**It backs \`CommandInput\`** — that is how it arrived in the package — and
it is the right shape for anything where a unit, an icon or a send button
belongs inside the field rather than beside it.

\`InputGroupAddon\` takes an \`align\`:

- \`inline-start\` / \`inline-end\` — sits on the row with the input.
- \`block-start\` / \`block-end\` — stacks above or below it, which is what
  turns the group into a composer. The group squares off its radius and grows
  to fit when it sees one.

Use \`InputGroupInput\` / \`InputGroupTextarea\` rather than the plain
\`Input\` and \`Textarea\`: they carry \`data-slot="input-group-control"\`,
which is what the group's focus and invalid selectors key off.
        `,
      },
    },
  },
} satisfies Meta<typeof InputGroup>

export default meta

type Story = StoryObj<typeof meta>

export const WithIcon: Story = {
  name: "With a leading icon",
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon align="inline-start">
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search name, role or skill" />
    </InputGroup>
  ),
}

export const WithUnit: Story = {
  name: "With a unit",
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon align="inline-start">
        <IndianRupeeIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="35" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>lpa</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  ),
}

/**
 * A `block-end` addon turns the group into a composer — the shape Athena's
 * pane uses, and the one the message dock uses for a reply.
 */
export const Composer: Story = {
  render: () => (
    <InputGroup className="w-96">
      <InputGroupTextarea
        rows={2}
        placeholder="Ask about this page, a candidate, a role…"
      />
      <InputGroupAddon align="block-end">
        <InputGroupButton
          size="icon-xs"
          className="ml-auto rounded-full"
          aria-label="Send"
        >
          <ArrowUpIcon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const Invalid: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon align="inline-start">
        <IndianRupeeIcon />
      </InputGroupAddon>
      <InputGroupInput aria-invalid defaultValue="-4" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>lpa</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  ),
}
