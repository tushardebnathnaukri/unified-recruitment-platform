import type { LucideIcon } from "lucide-react"
import { LayoutDashboardIcon, SwatchBookIcon } from "lucide-react"
import { NavLink, useMatch } from "react-router"

import { useBrand } from "@workspace/ui/components/brand-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboardIcon, end: true },
  { to: "/playground", label: "Playground", icon: SwatchBookIcon, end: false },
]

/**
 * `useMatch` is a hook, so each item needs its own component rather than a
 * loop body — that is why this is split out rather than inlined into the map.
 */
function NavMenuItem({ item }: { item: NavItem }) {
  const match = useMatch({ path: item.to, end: item.end })
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<NavLink to={item.to} end={item.end} />}
        isActive={Boolean(match)}
        tooltip={item.label}
      >
        <Icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const { brand } = useBrand()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="size-6 shrink-0 rounded-md bg-primary" />
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            {brand}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Prototype</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <NavMenuItem key={item.to} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
