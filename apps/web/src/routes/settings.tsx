import { Link } from "react-router"
import { ArrowUpRightIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"
import { Kbd } from "@workspace/ui/components/kbd"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import { BrandSwitcher } from "@/components/brand-switcher"
import { CardVariantSwitcher } from "@/components/card-variant-switcher"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { play, useSounds } from "@/lib/sound"
import {
  AGENT_LANDING_VARIANTS,
  useAgentLandingVariant,
  type AgentLandingVariant,
} from "@/lib/agent-landing-variant"
import {
  FILTER_VARIANTS,
  useFilterVariant,
  type FilterVariant,
} from "@/lib/filter-variant"
import {
  POSTING_VARIANTS,
  usePostingVariant,
  type PostingVariant,
} from "@/lib/posting-variant"
import { useSelectionCriteria } from "@/lib/selection-criteria"
import { ThemeToggle } from "@/components/theme-toggle"
import { PROTOTYPE_ITEMS, PROTOTYPE_LINKS } from "@/lib/nav"

/**
 * Prototype settings — the two controls that decide how the design system
 * renders. Everything a real settings page would carry (account,
 * notifications, team) is product surface the design team has not scoped yet.
 */
export function SettingsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6 px-4 lg:px-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Prototype-level settings. These control how the design system renders,
        not anything a real recruiter would configure.
      </p>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
            <h2 className="text-sm font-medium">Brand</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Swaps the accent token layer only. Components, neutrals, radii and
              type are shared between iimjobs and hirist.
            </p>
          </div>

          <BrandSwitcher />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
            <h2 className="text-sm font-medium">Theme</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Light and dark only — no system mode, so a shared preview link
              renders the same for everyone. Press <Kbd>d</Kbd> anywhere to flip
              it without coming back here.
            </p>
          </div>

          <ThemeToggle />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
            <h2 className="text-sm font-medium">Candidate card</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Three layouts for the same facts on the response manager. Stacked
              runs the labels down the left and reads like a profile; Columns
              lays the buckets across the card and fits roughly twice as many
              candidates on a screen; Sections drops the label column for
              full-width bands with a rule between, so nothing has to wrap. A
              real recruiter would never see this control — it is here so the
              three can be compared before one wins.
            </p>
          </div>

          <CardVariantSwitcher />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
            <h2 className="text-sm font-medium">Database filters</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Two ways to narrow a database search. Refine panel is the live
              hirist column, every filter on screen beside the results, drawn as
              the response manager's own filter rail; Juicebox puts the query in
              a pill with the filters in a dialog, ranked criteria and chips
              that widen the pool.
            </p>
          </div>

          <FilterVariantSwitcher />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
            <h2 className="text-sm font-medium">Dashboard landing</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              What the Dashboard shows before anything is asked. Chat is the
              Aura, the question, four action pills and one big box that types
              out example questions, with your overview under it; Cards is the
              first design, six cards naming what it can do with the box under
              them. The conversation after the first question is the same either
              way.
            </p>
          </div>

          <AgentLandingVariantSwitcher />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
            <h2 className="text-sm font-medium">Post a job</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Where the posting goes while the Dashboard's chat gathers it. Chat
              with rail keeps the conversation in the middle with the steps, the
              posting and the brief as a rail beside it; v2 lifts the steps out
              of the rail and lays them across the top of the page. Form beside
              chat puts the post-a-job form on the left, filled in as each
              answer is read and editable by hand, with the chat as a panel on
              the right; Chat, then form is the rail while the chat is asking
              and the form once it has — "Review and post" brings the form in
              beside the chat instead of sending you to it. Chat v3 is v2 with
              an agent that fills what the pool can tell it, says where every
              value came from, lets you lock one, and checks the pool and sample
              people as you go. Chat alt asks one question at a time beside a
              tracker of them all. In each of those, every change is a turn in
              the conversation. AI Agent (V2.3) is a peer's prototype ported
              whole: one brief, then five steps the agent fills in, on its own
              sample data and saved in this browser rather than in the
              conversation.
            </p>
          </div>

          <PostingVariantSwitcher />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
            <h2 className="text-sm font-medium">Selection criteria</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ask for the private brief after the posting — industry,
              neighbouring roles, team, institutes, budget — which becomes the
              search's filters. Off skips it in every layout; the screening
              questions stay, as a step of their own.
            </p>
          </div>

          <SelectionCriteriaSwitch />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
            <h2 className="text-sm font-medium">Sounds</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Short, quiet sounds for a reply arriving on the Dashboard, the mic
              starting and stopping, and a decision on an applicant — a tick to
              keep somebody, a swoosh for Not a fit, and its reverse for Undo.
              Only ever in answer to something you did.
            </p>
          </div>

          <SoundsSwitch />
        </div>

        <Separator />

        <p className="text-xs leading-relaxed text-muted-foreground">
          All six persist to <code className="font-mono">localStorage</code> and
          sync across tabs, so a shared preview link opens on whichever brand,
          theme, card layout, filters, Dashboard landing and sounds you last
          picked.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">Prototype pages</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Kept out of the sidebar so it only carries recruiter surfaces — this
            describes the prototype itself rather than the product.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PROTOTYPE_ITEMS.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.to}
                to={item.to}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Icon data-icon="inline-start" />
                {item.label}
              </Link>
            )
          })}

          {/* Anchors, not Links: these leave the app. `rel="noreferrer"` on a
              new tab is the habit even for localhost. */}
          {PROTOTYPE_LINKS.map((item) => {
            const Icon = item.icon

            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Icon data-icon="inline-start" />
                {item.label}
                <ArrowUpRightIcon data-icon="inline-end" />
              </a>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          The Storybook link needs <code>npm run storybook</code> running on
          :6006.
        </p>
      </div>
    </div>
  )
}

/** On or off, so a switch rather than a toggle group. */
function SelectionCriteriaSwitch() {
  const { enabled, setEnabled } = useSelectionCriteria()
  return (
    <Switch
      aria-label="Selection criteria"
      checked={enabled}
      onCheckedChange={setEnabled}
    />
  )
}

function SoundsSwitch() {
  const { enabled, setEnabled } = useSounds()
  return (
    <Switch
      aria-label="Sounds"
      checked={enabled}
      onCheckedChange={(checked) => {
        setEnabled(checked)
        // Heard as it is switched on, so the setting proves itself.
        if (checked) play("tick")
      }}
    />
  )
}

/** The same shape as the other toggles. */
function AgentLandingVariantSwitcher() {
  const { variant, setVariant } = useAgentLandingVariant()

  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      aria-label="Dashboard landing"
      value={[variant]}
      onValueChange={(value) => {
        const next = value[0] as AgentLandingVariant | undefined
        if (next) setVariant(next)
      }}
    >
      {AGENT_LANDING_VARIANTS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function PostingVariantSwitcher() {
  const { variant, setVariant } = usePostingVariant()

  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      aria-label="Post a job"
      value={[variant]}
      onValueChange={(value) => {
        const next = value[0] as PostingVariant | undefined
        if (next) setVariant(next)
      }}
    >
      {POSTING_VARIANTS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Same shape as `CardVariantSwitcher`: two words, one toggle, no empty state. */
function FilterVariantSwitcher() {
  const { variant, setVariant } = useFilterVariant()

  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      aria-label="Database filters"
      value={[variant]}
      onValueChange={(value) => {
        const next = value[0] as FilterVariant | undefined
        if (next) setVariant(next)
      }}
    >
      {FILTER_VARIANTS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
