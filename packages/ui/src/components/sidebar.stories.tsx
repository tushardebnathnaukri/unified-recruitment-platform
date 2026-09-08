import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  BriefcaseIcon,
  ChartColumnIcon,
  ChevronsUpDownIcon,
  CircleHelpIcon,
  DatabaseIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MailIcon,
  PlusCircleIcon,
  SearchIcon,
  Settings2Icon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
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
import { design } from "@workspace/ui/lib/figma"

const NAV = [
  { label: "Dashboard", icon: LayoutDashboardIcon, active: true },
  { label: "Jobs", icon: BriefcaseIcon, badge: "6" },
  { label: "Database", icon: DatabaseIcon },
  { label: "Analytics", icon: ChartColumnIcon },
]

const SECONDARY = [
  { label: "Settings", icon: Settings2Icon },
  { label: "Get Help", icon: CircleHelpIcon },
  { label: "Search", icon: SearchIcon },
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
\`Sidebar variant="inset" collapsible="icon"\` + \`SidebarInset\`. The shell's
dimensions (\`--sidebar-width\`, \`--header-height\`) are inline CSS variables
on the provider so the header and sidebar read the same numbers.

\`⌘B\` collapses it; \`SidebarRail\` is the click target on its edge. On a
mobile viewport the whole thing becomes a \`Sheet\`.

What this story mirrors from \`apps/web\`: the brand row keeps its height
when collapsed so the nav does not jump; the create action is the one
\`--primary\` surface in the sidebar, which makes it the place to compare
brands; \`SidebarMenuButton tooltip\` labels icons in the rail, which needs
the \`TooltipProvider\` the preview supplies.

Real navigation (\`NavLink\`, \`useMatch\`) lives in the app — this story
fakes active state with \`isActive\`.
        `,
      },
    },
  },
} satisfies Meta<typeof Sidebar>

export default meta

type Story = StoryObj<typeof meta>

function UserMenu() {
  const { isMobile } = useSidebar()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
        }
      >
        <Avatar className="size-8 rounded-lg">
          <AvatarFallback className="rounded-lg">PR</AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">Priya Raman</span>
          <span className="truncate text-xs text-muted-foreground">
            priya@example.com
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
          <DropdownMenuItem>Account</DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
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

function Shell({ defaultOpen = true }: { defaultOpen?: boolean }) {
  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <div className="flex h-10 shrink-0 items-center overflow-hidden px-1.5">
            <span className="text-xl font-semibold transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-0">
              iimjobs
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
              <SidebarMenu>
                <SidebarMenuItem className="flex items-center gap-2">
                  <SidebarMenuButton
                    tooltip="Create Project"
                    className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                  >
                    <PlusCircleIcon />
                    <span>Create Project</span>
                  </SidebarMenuButton>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8 group-data-[collapsible=icon]:opacity-0"
                  >
                    <MailIcon />
                    <span className="sr-only">Inbox</span>
                  </Button>
                </SidebarMenuItem>
              </SidebarMenu>

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

          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                {SECONDARY.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton size="sm" tooltip={item.label}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
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

      <SidebarInset>
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 h-4 data-vertical:self-auto"
            />
            <h1 className="text-base font-medium">Dashboard</h1>
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
    </SidebarProvider>
  )
}

export const AppShell: Story = {
  render: () => <Shell />,
}

export const Collapsed: Story = {
  render: () => <Shell defaultOpen={false} />,
}
