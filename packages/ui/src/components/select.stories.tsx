import type { Meta, StoryObj } from "@storybook/react-vite"

import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { design } from "@workspace/ui/lib/figma"

const LOCATIONS = [
  { value: "bengaluru", label: "Bengaluru" },
  { value: "gurugram", label: "Gurugram" },
  { value: "hyderabad", label: "Hyderabad" },
  { value: "mumbai", label: "Mumbai" },
  { value: "pune", label: "Pune" },
  { value: "remote", label: "Remote" },
]

const meta = {
  title: "Components/Select",
  component: Select,
  parameters: {
    design: design("select"),
    docs: {
      description: {
        component: `
Base UI \`Select\`. Pass \`items\` to the root so \`SelectValue\` can show the
chosen option's *label* rather than its value; \`SelectValue placeholder\`
covers the empty state.

By default the popup **aligns the selected item over the trigger**
(\`alignItemWithTrigger\`), macOS-style, rather than dropping below it. Set
it to \`false\` on \`SelectContent\` for a conventional dropdown — worth
deciding once for the product rather than per field.

The trigger is \`w-fit\`; give it a width (\`className="w-56"\`) in forms.
        `,
      },
    },
  },
} satisfies Meta<typeof Select>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Select items={LOCATIONS}>
      <SelectTrigger className="w-56" aria-label="Location">
        <SelectValue placeholder="Location" />
      </SelectTrigger>
      <SelectContent>
        {LOCATIONS.map((location) => (
          <SelectItem key={location.value} value={location.value}>
            {location.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <div className="flex w-56 flex-col gap-2">
      <Label htmlFor="sel-location">Location</Label>
      <Select items={LOCATIONS} defaultValue="bengaluru">
        <SelectTrigger id="sel-location" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LOCATIONS.map((location) => (
            <SelectItem key={location.value} value={location.value}>
              {location.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ),
}

const EXPERIENCE = {
  "0-3": "0–3 years",
  "3-6": "3–6 years",
  "6-9": "6–9 years",
  "9-14": "9–14 years",
  "14+": "14+ years",
}

export const Grouped: Story = {
  name: "Grouped, dropdown-style",
  render: () => (
    <Select items={EXPERIENCE}>
      <SelectTrigger className="w-56" aria-label="Experience">
        <SelectValue placeholder="Experience" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          <SelectLabel>Early career</SelectLabel>
          <SelectItem value="0-3">0–3 years</SelectItem>
          <SelectItem value="3-6">3–6 years</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Senior</SelectLabel>
          <SelectItem value="6-9">6–9 years</SelectItem>
          <SelectItem value="9-14">9–14 years</SelectItem>
          <SelectItem value="14+">14+ years</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
}

export const Small: Story = {
  render: () => (
    <Select items={LOCATIONS} defaultValue="pune">
      <SelectTrigger size="sm" className="w-44" aria-label="Location">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCATIONS.map((location) => (
          <SelectItem key={location.value} value={location.value}>
            {location.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
}
