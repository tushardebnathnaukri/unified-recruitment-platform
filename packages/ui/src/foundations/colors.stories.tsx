import type { Meta, StoryObj } from "@storybook/react-vite"

import { designPage } from "@workspace/ui/lib/figma"

import tokens from "../../tokens.json"

/**
 * Swatches read the CSS variables directly, so flipping the Brand or Theme
 * toolbar re-colours them live — which is the point: this page is where you
 * check that a brand layer only moved the tokens it is allowed to move.
 *
 * The token list and the ● markers come from `tokens.json`, generated from
 * `globals.css`. They used to be hand-maintained here, which had already
 * drifted — `chart-1..5` and `sidebar-ring` were missing. Grouping below is
 * editorial, but membership is checked: anything in `tokens.json` that no
 * group claims shows up under "Ungrouped" rather than vanishing.
 */

const SEMANTIC = tokens.semantic as Record<
  string,
  { brandScoped: boolean; modes: Record<string, string> }
>

const GROUPS: { title: string; tokens: string[] }[] = [
  {
    title: "Accent — ● set per brand",
    tokens: [
      "primary",
      "primary-foreground",
      "ring",
      "secondary",
      "secondary-foreground",
      "accent",
      "accent-foreground",
    ],
  },
  {
    title: "Status — shared across brands",
    tokens: ["success", "warning", "destructive"],
  },
  {
    title: "Surfaces and neutrals",
    tokens: [
      "background",
      "foreground",
      "card",
      "card-foreground",
      "popover",
      "popover-foreground",
      "muted",
      "muted-foreground",
      "border",
      "input",
    ],
  },
  {
    title: "Sidebar",
    tokens: [
      "sidebar",
      "sidebar-foreground",
      "sidebar-primary",
      "sidebar-primary-foreground",
      "sidebar-accent",
      "sidebar-accent-foreground",
      "sidebar-border",
      "sidebar-ring",
    ],
  },
  {
    title: "Charts",
    tokens: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
  },
]

const claimed = new Set(GROUPS.flatMap((group) => group.tokens))
const ungrouped = Object.keys(SEMANTIC).filter((name) => !claimed.has(name))

/** The primitives a token resolves to, as "light → dark" for one brand. */
function ramp(name: string) {
  const modes = SEMANTIC[name].modes
  const light = modes["iimjobs Light"]
  const dark = modes["iimjobs Dark"]
  return light === dark ? light : `${light} → ${dark}`
}

function Swatch({ name }: { name: string }) {
  const brand = SEMANTIC[name]?.brandScoped
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-14 rounded-xl ring-1 ring-foreground/10"
        style={{ background: `var(--${name})` }}
      />
      <div className="flex flex-col">
        <code className="text-xs font-medium">
          --{name}
          {brand && (
            <span className="ml-1 text-primary" title="Set per brand">
              ●
            </span>
          )}
        </code>
        <span className="text-xs text-muted-foreground">{ramp(name)}</span>
      </div>
    </div>
  )
}

function Palette({ title, tokens }: { title: string; tokens: string[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {tokens.map((name) => (
          <Swatch key={name} name={name} />
        ))}
      </div>
    </section>
  )
}

const meta = {
  title: "Foundations/Colors",
  parameters: {
    layout: "padded",
    design: designPage("colors"),
    docs: {
      description: {
        component: `
Every colour token in \`globals.css\`, drawn live. Flip **Brand** and
**Theme** in the toolbar and watch what moves.

The ● marks the five tokens a brand layer is allowed to override:
\`--primary\`, \`--primary-foreground\`, \`--ring\`, \`--sidebar-primary\`,
\`--sidebar-primary-foreground\`. Everything else is shared between iimjobs
and hirist by design — neutrals, status colours, radii, type. If a design
needs a sixth token to differ per brand, that is a conversation, not a CSS
edit.

The grey line under each swatch is the primitive it resolves to, light then
dark. iimjobs is Tailwind's emerald ramp verbatim. **hirist is still a
placeholder** orange; see the \`TODO(design)\` in \`globals.css\`.

This list is generated from \`tokens.json\` (\`npm run tokens\`), so it cannot
drift from the CSS. The same file created the Figma variables.
        `,
      },
    },
  },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const AllTokens: Story = {
  render: () => (
    <div className="flex max-w-5xl flex-col gap-8">
      {GROUPS.map((group) => (
        <Palette key={group.title} title={group.title} tokens={group.tokens} />
      ))}
      {ungrouped.length > 0 && (
        <Palette
          title="Ungrouped — add these to a group in colors.stories.tsx"
          tokens={ungrouped}
        />
      )}
    </div>
  ),
}

export const BrandLayer: Story = {
  name: "Brand layer only",
  render: () => (
    <div className="flex max-w-5xl flex-col gap-8">
      <Palette
        title="The five tokens a brand may override"
        tokens={Object.keys(SEMANTIC).filter(
          (name) => SEMANTIC[name].brandScoped
        )}
      />
    </div>
  ),
}
