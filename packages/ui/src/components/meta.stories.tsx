import type { Meta as StorybookMeta, StoryObj } from "@storybook/react-vite"
import { ClockIcon, MapPinIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import { design } from "@workspace/ui/lib/figma"

const meta = {
  title: "Patterns/Meta",
  component: Meta,
  parameters: {
    design: design("meta"),
    docs: {
      description: {
        component: `
The small grey line under a title: location, age, counts. Children are
separated by a middle dot; turn \`separator\` off when every child carries
its own icon, since the icons already separate.

\`MetaItem\` is icon + text. Its \`tone\` is for the one fact on the line that
should change what you do — an expiry inside a week, a project nobody has
contacted. Everything else stays grey so that one gets noticed.

Conditional children work (\`{n > 0 && <Badge />}\`): dots are only drawn
between children that actually rendered.
        `,
      },
    },
  },
  args: { separator: true },
} satisfies StorybookMeta<typeof Meta>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Meta {...args}>
      <span>214 matches</span>
      <span>2 hours ago</span>
      <Badge variant="success" className="font-normal">
        6 new
      </Badge>
    </Meta>
  ),
}

export const WithIcons: Story = {
  args: { separator: false },
  render: (args) => (
    <Meta {...args}>
      <MetaItem>
        <MapPinIcon />
        Bengaluru
      </MetaItem>
      <MetaItem tone="warning">
        <ClockIcon />
        Expires in 6 days
      </MetaItem>
    </Meta>
  ),
}

export const Tones: Story = {
  render: () => (
    <Meta>
      <MetaItem>12 shortlisted</MetaItem>
      <MetaItem tone="warning">0 contacted</MetaItem>
      <MetaItem tone="success">3 interviews</MetaItem>
      <MetaItem tone="destructive">1 withdrew</MetaItem>
    </Meta>
  ),
}

export const Conditional: Story = {
  name: "Conditional children",
  render: () => {
    // The point of the story: one row has new matches and one does not, and
    // the row without must not be left with an orphan dot. Written as flags
    // rather than literal `false &&` / `true &&` so the lint rule against
    // constant conditions does not fire on what is really a fixture.
    const rows = [
      { matches: "88 matches", age: "Yesterday", isNew: false },
      { matches: "37 matches", age: "3 days ago", isNew: true },
    ]
    return (
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <Meta key={row.matches}>
            <span>{row.matches}</span>
            <span>{row.age}</span>
            {row.isNew && (
              <Badge variant="success" className="font-normal">
                4 new
              </Badge>
            )}
          </Meta>
        ))}
      </div>
    )
  },
}
