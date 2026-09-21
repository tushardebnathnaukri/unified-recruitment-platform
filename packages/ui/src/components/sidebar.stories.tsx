import * as React from "react"
import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BadgeCheckIcon,
  ClockIcon,
  BellIcon,
  BriefcaseIcon,
  ChartColumnIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  CircleHelpIcon,
  CreditCardIcon,
  DatabaseIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MapPinIcon,
  SearchIcon,
  SendIcon,
  Settings2Icon,
  SparklesIcon,
  XIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { Textarea } from "@workspace/ui/components/textarea"
import { design } from "@workspace/ui/lib/figma"

/**
 * Fixtures copied from `apps/web/src/lib/nav.ts`. `packages/ui` cannot import
 * from the app, so they are duplicated here — when the app's nav changes these
 * have to follow, or a side-by-side comparison starts quietly lying.
 */
const NAV = [
  { label: "Dashboard", icon: LayoutDashboardIcon, active: true },
  { label: "Jobs", icon: BriefcaseIcon, badge: "6" },
  { label: "Database", icon: DatabaseIcon },
  // INSIGHTS, NOT ANALYTICS — renamed in the app because what lives there is
  // the market, and a recruiter reads "analytics" as "how is my hiring going",
  // which the Dashboard answers.
  { label: "Insights", icon: ChartColumnIcon },
]

/** Utility nav. It lives in the account menu now, not in the rail. */
const SECONDARY = [
  { label: "Settings", icon: Settings2Icon },
  { label: "Get Help", icon: CircleHelpIcon },
  { label: "Search", icon: SearchIcon },
]

const PRODUCTS = [
  { id: "iimjobs", label: "iimjobs", note: "Management and senior roles" },
  { id: "hirist", label: "hirist", note: "Technology roles" },
]

const meta = {
  title: "Components/Sidebar",
  component: Sidebar,
  parameters: {
    design: design("sidebar"),
    layout: "fullscreen",
    docs: {
      description: {
        component: `
shadcn's sidebar block, as the app shell uses it: \`SidebarProvider\` →
\`Sidebar variant="sidebar" collapsible="icon"\` + \`SidebarInset\` + the
Athena pane. The shell's dimensions (\`--sidebar-width\`, \`--header-height\`,
\`--athena-width\`) are inline CSS variables on the provider so the header,
sidebar and copilot pane all read the same numbers.

\`⌘B\` collapses it; \`SidebarRail\` is the click target on its edge. On a
mobile viewport the whole thing becomes a \`Sheet\`.

What this story mirrors from \`apps/web\`:

- **The header is the product switcher** — the wordmark, pressable, opening
  the list of products — with the collapse trigger beside it. The row keeps
  its height when collapsed so the nav does not jump, and in the rail the
  switcher goes while the trigger stays: at 64px only one fits, and the one
  to keep is the one that gets you back.
- **The create action is a mandate, not a job post**, and is the one
  \`--primary\` surface in the sidebar — which makes it the place to compare
  brands.
- **The utility nav sits in the account menu**, not in the rail. Settings,
  Get Help and Search were competing with the four places the work is while
  being a different kind of thing.
- **The cross-sell banner takes the bottom of the rail**, pinned by
  \`mt-auto\` against the footer, and hides in the icon rail — 64px fits an
  icon, and an icon is not an argument.
- **Athena is the third column**, a sibling of \`SidebarInset\` rather than a
  child, so it sits beside the page and not over it. Opening it collapses the
  nav to pay for the width. The header's trigger only opens; the pane carries
  its own close.

Real navigation (\`NavLink\`, \`useMatch\`), the real brand switching and the
vendored wordmark all live in the app — this story fakes active state with
\`isActive\`, sets the wordmark in type, and stands the cross-sell photograph
in as a gradient.
        `,
      },
    },
  },
} satisfies StoryMeta<typeof Sidebar>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The wordmark, pressable. The app inlines a real SVG mark per brand; here it
 * is set in type, which is exactly what the app falls back to for a brand with
 * no mark yet.
 */
function ProductSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label="Product: iimjobs. Switch product"
                className="gap-2 px-1.5"
              />
            }
          >
            <span className="text-xl font-semibold">iimjobs</span>
            <ChevronsUpDownIcon className="ml-auto text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="min-w-56">
            {/* Base UI reads the label's relationship from MenuGroupContext
                and throws without one — so it sits INSIDE the group. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel>Products</DropdownMenuLabel>
              {PRODUCTS.map((product) => (
                <DropdownMenuItem key={product.id} className="gap-2">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">{product.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.note}
                    </span>
                  </div>
                  {product.id === "iimjobs" && (
                    <CheckIcon className="size-4 shrink-0 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

/**
 * The other product, sold from inside this one — the commercial argument for
 * the switcher above it.
 *
 * Fixed at 120px rather than sized by its contents: the two pitches wrap to a
 * different number of lines, and a banner that changes height when you switch
 * product reads as the nav shifting under you.
 *
 * The headline and button are FIXED colours, not tokens. In the app this sits
 * on a photograph, and a photograph is not a surface you invert — so the
 * tokens over it would flip while the image did not, taking the headline to
 * near-white on a light picture.
 */
function CrossSellBanner() {
  return (
    <div className="relative mx-2 flex h-[120px] flex-col justify-between gap-2 overflow-hidden rounded-lg bg-sidebar-accent p-3 group-data-[collapsible=icon]:hidden">
      {/* NOTE(design): the app ships a photograph here. Storybook stands it in
          as a gradient rather than duplicating the asset into this package —
          the point being mirrored is the layout and the fixed colours over it,
          not the picture. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-mist-100 via-mist-200 to-mist-400"
      />

      <p className="relative text-base leading-snug font-medium text-mist-900">
        Need to close your tech hiring?
      </p>

      <Button
        variant="outline"
        size="sm"
        className="relative w-fit border-mist-200 bg-white text-mist-900 hover:bg-white hover:text-mist-900"
      >
        Try hirist
        <ArrowRightIcon data-icon="inline-end" />
      </Button>
    </div>
  )
}

function UserMenu() {
  const { isMobile } = useSidebar()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
        }
      >
        <Avatar size="lg">
          <AvatarFallback>AY</AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">Anurag Yadav</span>
          <span className="truncate text-xs text-muted-foreground">
            anurag.yadav@infoedge.com
          </span>
        </div>
        <ChevronsUpDownIcon className="ml-auto size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="min-w-56"
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <BadgeCheckIcon />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCardIcon />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem>
            <BellIcon />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* The utility nav, folded in from the rail. */}
        <DropdownMenuGroup>
          {SECONDARY.map((item) => (
            <DropdownMenuItem key={item.label}>
              <item.icon />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem>
            <LogOutIcon />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The questions the page under her registered — the Dashboard's, since that is
 * the page this shell draws. Every answer and card is in Compositions → Athena.
 */
const OPENERS = [
  "Which postings need a decision from me?",
  "Which threads are waiting on me?",
]

/**
 * Athena's column. `sticky` + a `svh` height rather than a plain flex child:
 * the shell wrapper is `min-h-svh` and grows with the page, so a stretched
 * column is as tall as the DOCUMENT and puts the composer at the bottom of a
 * long article instead of the bottom of the screen.
 */
function AthenaPane({ onClose }: { onClose?: () => void }) {
  return (
    <aside
      aria-label="Athena"
      className="fixed inset-0 z-50 flex flex-col bg-background md:sticky md:inset-auto md:top-0 md:z-auto md:h-svh md:w-(--athena-width) md:shrink-0 md:border-l"
    >
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b px-4">
        <SparklesIcon className="size-4 shrink-0 text-primary" />
        <span className="flex-1 text-base font-medium">Athena</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close Athena"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </header>

      {/* What she is looking at, as the page registered it. */}
      <div className="flex shrink-0 items-baseline gap-1.5 border-b px-4 py-2 text-xs">
        <span className="shrink-0 text-muted-foreground">Looking at</span>
        <span className="max-w-3/5 min-w-0 shrink-0 truncate font-medium">
          Dashboard
        </span>
        <span className="min-w-0 truncate text-muted-foreground">
          · 6 live postings
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Ask Athena</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              She works from what is on this page, so these need no setting up.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {OPENERS.map((opener) => (
              <button
                key={opener}
                type="button"
                className="rounded-xl border border-border px-3 py-2.5 text-left text-sm leading-relaxed transition-colors hover:bg-muted"
              >
                {opener}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-input bg-input/30 p-2 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          <Textarea
            rows={1}
            aria-label="Ask Athena"
            placeholder="Ask about this page…"
            className="min-h-9 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
          />
          <Button
            size="icon-sm"
            className="shrink-0 rounded-full"
            aria-label="Send"
            disabled
          >
            <SendIcon />
          </Button>
        </div>
      </div>
    </aside>
  )
}

/**
 * What a screen about ONE OBJECT puts in the bar instead of the route title.
 * In the app this is `PageHeader`, a portal into a slot in `SiteHeader`, and
 * `titleForPath` stands down while anything fills it — a posting used to read
 * "Jobs" above a band naming the job, which is two rows to say where you are.
 *
 * Fitting one row inside `--header-height` costs the band's other two lines:
 * the title is the bar's own `text-base` and truncates instead of clamping,
 * the back button is a ghost circle rather than an outlined one, and the meta
 * sits behind a separator that hides below `lg`.
 */
function JobPageHeader() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Back to all jobs"
        className="-ml-2 size-8 shrink-0 rounded-full"
      >
        <ArrowLeftIcon />
      </Button>

      <h1 className="min-w-0 truncate font-heading text-base font-medium">
        VP Finance — Series C fintech
      </h1>

      <Badge variant="secondary" className="shrink-0">
        Pro
      </Badge>
      <Badge variant="success" className="shrink-0">
        Live
      </Badge>

      <Separator
        orientation="vertical"
        className="mx-1 hidden h-4 lg:block data-vertical:self-auto"
      />
      <Meta separator={false} className="hidden shrink-0 lg:flex">
        <MetaItem>
          <MapPinIcon />
          Bengaluru
        </MetaItem>
        <MetaItem>
          <ClockIcon />
          Expires in 18 days
        </MetaItem>
      </Meta>
    </div>
  )
}

function Shell({
  defaultOpen = true,
  athena = false,
  pageHeader = false,
}: {
  defaultOpen?: boolean
  athena?: boolean
  pageHeader?: boolean
}) {
  const [athenaOpen, setAthenaOpen] = React.useState(athena)

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
          "--athena-width": "calc(var(--spacing) * 96)",
        } as React.CSSProperties
      }
    >
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader>
          <div className="flex h-10 items-center gap-1 group-data-[collapsible=icon]:justify-center">
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <ProductSwitcher />
            </div>
            {/* `max-md:hidden` because under 768px the sidebar is a Sheet and
                does not exist in the DOM while closed — a trigger inside it
                would be the only way to open something you must open to
                reach. The header keeps a copy for exactly that width. */}
            <SidebarTrigger className="shrink-0 max-md:hidden" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
              <SidebarMenu>
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      isActive={item.active}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.badge && (
                      <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* `mt-auto` pins the banner to the bottom of the rail, against the
              account menu in the footer. */}
          <div className="mt-auto">
            <CrossSellBanner />
          </div>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <UserMenu />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-canvas">
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            {/* The only trigger left in the bar is the mobile copy — above
                768px the sidebar's own takes over. */}
            <div className="flex items-center md:hidden">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mx-2 h-4 data-vertical:self-auto"
              />
            </div>
            {pageHeader ? (
              <JobPageHeader />
            ) : (
              <h1 className="text-base font-medium">Dashboard</h1>
            )}

            {/* IT ONLY OPENS. While the pane is up this is gone, because the
                pane carries its own close and two controls for one thing is
                one of them spending header room to say what the other
                already says. */}
            {!athenaOpen && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setAthenaOpen(true)}
              >
                <SparklesIcon data-icon="inline-start" />
                Athena
              </Button>
            )}
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="aspect-video rounded-2xl bg-muted/50" />
            <div className="aspect-video rounded-2xl bg-muted/50" />
            <div className="aspect-video rounded-2xl bg-muted/50" />
          </div>
          <div className="min-h-96 flex-1 rounded-2xl bg-muted/50" />
        </div>
      </SidebarInset>

      {/* A sibling of SidebarInset, not a child: it sits BESIDE the page. */}
      {athenaOpen && <AthenaPane onClose={() => setAthenaOpen(false)} />}
    </SidebarProvider>
  )
}

export const AppShell: Story = {
  name: "App shell",
  render: () => <Shell />,
}

export const Collapsed: Story = {
  name: "Collapsed to the icon rail",
  render: () => <Shell defaultOpen={false} />,
}

/**
 * A screen about one object speaks for itself in the bar. The route title
 * ("Jobs") steps aside and the posting's own header takes the row — back
 * button, title, badges, then a separator and the meta. The white band that
 * used to carry this above the tabs is gone with it, so the page's first row
 * runs straight into the bar.
 */
export const WithPageHeader: Story = {
  name: "App shell with a page header",
  render: () => <Shell pageHeader />,
}

/**
 * Opening the copilot collapses the nav to pay for the column — which is why
 * `AthenaProvider` sits inside `SidebarProvider` in the app: it needs
 * `useSidebar` to do that, and to put the nav back on close.
 */
export const WithAthena: Story = {
  name: "App shell with Athena open",
  render: () => <Shell defaultOpen={false} athena />,
}
