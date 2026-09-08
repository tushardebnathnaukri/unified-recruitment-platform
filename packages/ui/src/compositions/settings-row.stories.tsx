import type { Meta, StoryObj } from "@storybook/react-vite"
import { MoonIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Kbd } from "@workspace/ui/components/kbd"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

/**
 * A settings row: title and description on the left, the control on the
 * right, wrapping underneath on a narrow column. The Settings page is three
 * of these in a bordered group.
 */
function SettingRow({
  title,
  description,
  children,
}: {
  title: string
  description: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </div>
  )
}

function SettingGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-2xl max-w-full flex-col gap-4 rounded-lg border border-border p-4">
      {children}
    </div>
  )
}

const DIGESTS = { daily: "Daily", weekly: "Weekly", never: "Never" }

const meta = {
  title: "Compositions/Settings row",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
Title and description on the left, control on the right, wrapping under on
a narrow column. \`apps/web/src/routes/settings.tsx\` is three of these in a
bordered group; this is the same shape with each kind of control it will
need to hold.

Not a component yet on purpose — two uses is a pattern, not an API. Promote
it to \`packages/ui\` when the real settings page arrives.
        `,
      },
    },
  },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Prototype: Story = {
  name: "Prototype settings (as in the app)",
  render: () => (
    <SettingGroup>
      <SettingRow
        title="Brand"
        description="Swaps the accent token layer only. Components, neutrals, radii and type are shared between iimjobs and hirist."
      >
        <ToggleGroup
          variant="outline"
          spacing={0}
          defaultValue={["iimjobs"]}
          aria-label="Brand"
        >
          <ToggleGroupItem value="iimjobs">iimjobs</ToggleGroupItem>
          <ToggleGroupItem value="hirist">hirist</ToggleGroupItem>
        </ToggleGroup>
      </SettingRow>
      <Separator />
      <SettingRow
        title="Theme"
        description={
          <>
            Light and dark only — no system mode, so a shared preview link
            renders the same for everyone. Press <Kbd>d</Kbd> anywhere to flip
            it.
          </>
        }
      >
        <Button size="icon-sm" variant="ghost" aria-label="Switch to dark mode">
          <MoonIcon />
        </Button>
      </SettingRow>
    </SettingGroup>
  ),
}

export const Product: Story = {
  name: "Product settings (sketch)",
  render: () => (
    <SettingGroup>
      <SettingRow
        title="New applicant emails"
        description="One email per applicant, as they come in."
      >
        <Switch defaultChecked aria-label="New applicant emails" />
      </SettingRow>
      <Separator />
      <SettingRow title="Digest" description="A summary of every active job.">
        <Select items={DIGESTS} defaultValue="weekly">
          <SelectTrigger className="w-36" aria-label="Digest frequency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DIGESTS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
      <Separator />
      <SettingRow
        title="Team"
        description="Three recruiters share this account's posting credits."
      >
        <Button size="sm" variant="outline">
          Manage team
        </Button>
      </SettingRow>
    </SettingGroup>
  ),
}
