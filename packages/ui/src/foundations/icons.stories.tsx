import type { Meta, StoryObj } from "@storybook/react-vite"
import * as Lucide from "lucide-react"

import { designPage } from "@workspace/ui/lib/figma"

/**
 * Drawn live from `lucide-react`, so this page cannot drift from what the app
 * can actually import — and neither can the Figma set, which is generated from
 * the same `node_modules` by a script rather than redrawn by hand.
 */

/** The icons `apps/web` imports today. */
const IN_APP = [
  "archive",
  "arrow-down",
  "arrow-down-right",
  "arrow-left",
  "arrow-right",
  "arrow-up",
  "arrow-up-right",
  "badge-check",
  "bell",
  "bookmark",
  "briefcase",
  "building-2",
  "calendar",
  "calendar-check",
  "calendar-plus",
  "chart-column",
  "check",
  "chevron-down",
  "chevron-left",
  "chevron-right",
  "chevron-up",
  "chevrons-up-down",
  "circle-alert",
  "circle-check",
  "circle-help",
  "circle-x",
  "clock",
  "coins",
  "columns-3",
  "copy",
  "credit-card",
  "database",
  "download",
  "ellipsis",
  "external-link",
  "eye",
  "eye-off",
  "factory",
  "file-text",
  "funnel-x",
  "graduation-cap",
  "history",
  "indian-rupee",
  "info",
  "languages",
  "layout-dashboard",
  "layout-grid",
  "layout-list",
  "lightbulb",
  "list",
  "list-filter",
  "list-plus",
  "loader-2",
  "lock",
  "log-out",
  "mail",
  "map-pin",
  "message-circle",
  "minus",
  "moon",
  "more-horizontal",
  "octagon-x",
  "panel-left",
  "panels-top-left",
  "pencil",
  "phone",
  "plus",
  "plus-circle",
  "scale",
  "search",
  "send",
  "settings-2",
  "share-2",
  "sliders-horizontal",
  "sparkles",
  "sun",
  "swatch-book",
  "table",
  "table-2",
  "thumbs-up",
  "ticket",
  "trash",
  "trash-2",
  "trending-up",
  "triangle-alert",
  "trophy",
  "undo-2",
  "user-round",
  "users",
  "wand-sparkles",
  "x",
  "zap",
]

/** The curated UI set on top, so a new screen need not wait for a regenerate. */
const CURATED = [
  "activity",
  "alarm-clock",
  "align-justify",
  "arrow-down-a-z",
  "arrow-down-left",
  "arrow-down-wide-narrow",
  "arrow-left-right",
  "arrow-right-left",
  "arrow-up-a-z",
  "arrow-up-down",
  "arrow-up-left",
  "arrow-up-narrow-wide",
  "at-sign",
  "award",
  "ban",
  "banknote",
  "battery",
  "bell-off",
  "bell-ring",
  "bold",
  "book",
  "book-open",
  "bookmark-check",
  "braces",
  "briefcase-business",
  "bug",
  "building",
  "calculator",
  "calendar-clock",
  "calendar-days",
  "calendar-x",
  "camera",
  "chart-bar",
  "chart-column-increasing",
  "chart-line",
  "chart-no-axes-column",
  "chart-pie",
  "chart-spline",
  "check-check",
  "chevrons-down",
  "chevrons-left",
  "chevrons-left-right",
  "chevrons-right",
  "chevrons-up",
  "circle",
  "circle-arrow-right",
  "circle-minus",
  "circle-play",
  "circle-plus",
  "circle-user",
  "clipboard",
  "clipboard-check",
  "clipboard-list",
  "clock-alert",
  "cloud",
  "cloud-download",
  "cloud-upload",
  "code",
  "code-xml",
  "columns-2",
  "command",
  "compass",
  "contact",
  "copy-check",
  "corner-down-left",
  "corner-down-right",
  "corner-up-left",
  "corner-up-right",
  "crosshair",
  "crown",
  "diamond",
  "dollar-sign",
  "ellipsis-vertical",
  "eraser",
  "euro",
  "expand",
  "file",
  "file-check",
  "file-plus",
  "files",
  "filter",
  "fingerprint-pattern",
  "flag",
  "flame",
  "folder",
  "folder-open",
  "folder-plus",
  "forward",
  "frown",
  "funnel",
  "gauge",
  "gift",
  "git-branch",
  "git-commit-horizontal",
  "git-merge",
  "git-pull-request",
  "globe",
  "grip",
  "grip-horizontal",
  "grip-vertical",
  "handshake",
  "hard-drive",
  "hash",
  "heart",
  "hexagon",
  "highlighter",
  "hourglass",
  "house",
  "id-card",
  "image",
  "image-plus",
  "inbox",
  "italic",
  "key",
  "keyboard",
  "landmark",
  "laptop",
  "layers",
  "layout-template",
  "link",
  "link-2",
  "list-checks",
  "list-ordered",
  "list-todo",
  "loader",
  "loader-circle",
  "lock-open",
  "log-in",
  "mail-check",
  "mail-open",
  "map",
  "map-pinned",
  "maximize",
  "maximize-2",
  "meh",
  "menu",
  "message-circle-more",
  "message-square",
  "messages-square",
  "mic",
  "mic-off",
  "minimize",
  "minimize-2",
  "monitor",
  "move",
  "move-horizontal",
  "move-vertical",
  "navigation",
  "newspaper",
  "notebook-pen",
  "octagon-alert",
  "package",
  "package-check",
  "panel-bottom",
  "panel-right",
  "panel-top",
  "paperclip",
  "pause",
  "pencil-line",
  "percent",
  "phone-call",
  "phone-off",
  "piggy-bank",
  "play",
  "plug",
  "pound-sterling",
  "printer",
  "puzzle",
  "qr-code",
  "receipt",
  "receipt-indian-rupee",
  "redo",
  "redo-2",
  "refresh-ccw",
  "refresh-cw",
  "reply",
  "rocket",
  "rotate-ccw",
  "rotate-cw",
  "rows-2",
  "rows-3",
  "save",
  "scan",
  "scan-face",
  "scan-line",
  "scroll",
  "search-x",
  "send-horizontal",
  "server",
  "settings",
  "share",
  "shield",
  "shield-alert",
  "shield-check",
  "shrink",
  "sidebar",
  "sigma",
  "skip-back",
  "skip-forward",
  "sliders-vertical",
  "smartphone",
  "smile",
  "sort-asc",
  "sort-desc",
  "square",
  "square-pen",
  "square-play",
  "square-user-round",
  "star",
  "star-off",
  "sticky-note",
  "strikethrough",
  "table-properties",
  "tablet",
  "target",
  "terminal",
  "text-cursor-input",
  "thumbs-down",
  "timer",
  "trending-down",
  "trending-up-down",
  "triangle",
  "truck",
  "type",
  "underline",
  "undo",
  "unlink",
  "unlock",
  "upload",
  "user",
  "user-check",
  "user-minus",
  "user-plus",
  "user-round-check",
  "user-round-plus",
  "user-round-x",
  "user-x",
  "users-round",
  "video",
  "video-off",
  "volume-2",
  "volume-x",
  "wallet",
  "wifi",
  "wifi-off",
  "wrench",
  "zoom-in",
  "zoom-out",
]

/** `search-x` -> `SearchXIcon`, which is how lucide-react names its exports. */
function componentFor(name: string) {
  const pascal = name
    .split("-")
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("")
  return (Lucide as unknown as Record<string, Lucide.LucideIcon | undefined>)[
    pascal + "Icon"
  ]
}

function Grid({ names }: { names: string[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-px overflow-hidden rounded-2xl bg-border ring-1 ring-border">
      {names.map((name) => {
        const Icon = componentFor(name)
        return (
          <div
            key={name}
            className="flex min-w-0 flex-col items-center gap-2 bg-background px-2 py-4"
          >
            {Icon ? (
              <Icon className="size-4 shrink-0" aria-hidden />
            ) : (
              <span className="size-4 shrink-0 rounded-sm bg-destructive/20" />
            )}
            <span className="w-full truncate text-center text-[11px] text-muted-foreground">
              {name}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Section({
  title,
  note,
  names,
}: {
  title: string
  note: string
  names: string[]
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="font-heading text-base font-medium">
          {title}{" "}
          <span className="font-normal text-muted-foreground tabular-nums">
            · {names.length}
          </span>
        </h3>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
      <Grid names={names} />
    </section>
  )
}

const meta = {
  title: "Foundations/Icons",
  parameters: {
    design: designPage("icons"),
    layout: "padded",
    docs: {
      description: {
        component: `
**lucide-react 1.31 is the icon set, and it is a dependency rather than a
component this library authors** — so it sits in Foundations beside the colour
ramp and the type scale, not in the Components run.

**340 of lucide's ~2,000.** Every icon \`apps/web\` imports, plus a curated UI
set — arrows, files, comms, charts, money, status — so a screen that has not
been built yet does not have to wait for a regenerate. The rest of lucide is
one line away: add the name and re-run the generator.

**In Figma it is ONE component with a \`name\` property**, 340 variants deep, so
a glyph is swapped from the variant dropdown on any instance. That is what the
grey placeholder squares in the compositions were standing in for — and why
\`Button (icon)\`'s baked plus had to be hidden and drawn over: vector data
cannot be overridden in an instance, but a variant can be swapped.

**Sizes and colour.** The app draws them at \`size-4\` (16px) with a few at
\`size-3.5\`; the Figma variants are 16px at 1.5 stroke, the weight
\`Button (icon)\` already used. The stroke is bound to \`foreground\` and is
overridden per instance for muted, primary or a status colour — in code that is
just \`className\`, since lucide uses \`currentColor\`.

**Generated, never drawn.** The Figma set is built from \`node_modules\` by a
script, the way \`tokens.json\` is built from \`globals.css\`. Redrawing one by
hand is drift.
        `,
      },
    },
  },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const All: Story = {
  name: "The set",
  render: () => (
    <div className="flex flex-col gap-8">
      <Section
        title="In the app"
        note="Every icon apps/web imports today."
        names={IN_APP}
      />
      <Section
        title="Curated"
        note="Not used yet — room to design a screen without regenerating."
        names={CURATED}
      />
    </div>
  ),
}
