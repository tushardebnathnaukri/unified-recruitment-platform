import * as React from "react"
import { Link } from "react-router"

import { useBrand } from "@workspace/ui/components/brand-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { NAV_ITEMS } from "@/lib/nav"

/**
 * Structure follows shadcn's dashboard-01 block: a brand row in the header,
 * primary nav, then utility nav pushed to the bottom by `mt-auto`, with the
 * account menu in the footer.
 *
 * The brand mark is a plain `bg-primary` swatch rather than a logo — it is the
 * fastest way to see the active brand's accent, and it costs nothing when the
 * real marks land. The row links to Overview, which is otherwise reachable only
 * from Settings now that it is out of the sidebar.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { brand } = useBrand()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link to="/" />}
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <div className="size-5 shrink-0 rounded-md bg-primary" />
              <span className="text-base font-semibold">{brand}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={NAV_ITEMS} />
        <NavSecondary className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
