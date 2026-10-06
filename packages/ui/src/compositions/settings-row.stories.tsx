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
import { designComposition } from "@workspace/ui/lib/figma"

/**
 * A settings row: title and description on the left, the control on the
 * right, wrapping underneath on a narrow column. The Settings page is four
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

/** The /settings card layouts, in the app's order. */
const CARD_LAYOUTS = {
  stacked: "Stacked",
  columns: "Columns",
  sections: "Sections",
  snapshot: "Snapshot",
  screening: "Screening",
}

const meta = {
  title: "Compositions/Settings row",
  parameters: {
    design: designComposition("settings-row"),
    layout: "padded",
    docs: {
      description: {
        component: `
Title and description on the left, control on the right, wrapping under on
a narrow column. \`apps/web/src/routes/settings.tsx\` is four of these in a
bordered group — brand, theme, and the design comparisons (candidate card,
split view, database filters and more); this is the same shape with each kind
of control it will need to hold.

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
      <Separator />
      {/* A Select, not a toggle: a fourth word is where a row of them starts
          wrapping on the settings column. */}
      <SettingRow
        title="Candidate card"
        description="Five layouts for the same facts on the response manager. Stacked runs the labels down the left and reads like a profile; Columns lays the buckets across the card and fits roughly twice as many candidates on a screen; Sections drops the label column for full-width bands with a rule between, so nothing has to wrap; Snapshot puts experience, notice, pay and location in one strip to compare down the list, the career as a timeline and the skills as a score; Screening is ordered the way a recruiter screens — who they are, then the must-haves in one panel (expected pay, and the posting's skills as a checklist), then the record. A real recruiter would never see this control — it is here so the five can be compared before one wins."
      >
        <Select items={CARD_LAYOUTS} defaultValue="stacked">
          <SelectTrigger className="w-56" aria-label="Candidate card layout">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CARD_LAYOUTS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
      <Separator />
      <SettingRow
        title="Split view"
        description="How the response manager's split view shows the person picked from its list. Tabs is the CV or the profile, one at a time, the full width of the pane; Side by side puts the profile and the CV in two columns that scroll on their own, so the document is read with the facts beside it; Card, then CV is a short summary card — the key numbers and the skills match — with the CV under it in one scroll. It can also be flipped from the dashed switcher at the foot of the split view's list."
      >
        <ToggleGroup
          variant="outline"
          spacing={0}
          defaultValue={["tabs"]}
          aria-label="Split view"
        >
          <ToggleGroupItem value="tabs">Tabs</ToggleGroupItem>
          <ToggleGroupItem value="side-by-side">Side by side</ToggleGroupItem>
          <ToggleGroupItem value="card-cv">Card, then CV</ToggleGroupItem>
        </ToggleGroup>
      </SettingRow>
      <Separator />
      <SettingRow
        title="Database filters"
        description="Two ways to narrow a database search. Juicebox puts the query in a pill with the filters in a dialog, ranked criteria and chips that widen the pool; Refine panel is the live hirist column, every filter on screen beside the results."
      >
        <ToggleGroup
          variant="outline"
          spacing={0}
          defaultValue={["juicebox"]}
          aria-label="Database filters"
        >
          <ToggleGroupItem value="juicebox">Juicebox</ToggleGroupItem>
          <ToggleGroupItem value="panel">Refine panel</ToggleGroupItem>
        </ToggleGroup>
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
