import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar"
import { BrandWordmark } from "@/components/brand-wordmark"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { NAV_ITEMS } from "@/lib/nav"

/**
 * Structure follows shadcn's dashboard-01 block: a brand row in the header,
 * primary nav, then utility nav pushed to the bottom by `mt-auto`, with the
 * account menu in the footer.
 *
 * The header is the brand's wordmark and nothing else — no accent swatch, and
 * not a link. The swatch was a stand-in for a real mark and has no job left now
 * that one is here, and a logo that navigates competes with Dashboard, which is
 * already the first thing in the nav below it.
 *
 * In the collapsed rail the wordmark fades out but its row KEEPS ITS HEIGHT.
 * Hiding the row outright is what you reach for first, and it makes the whole
 * nav jump up 40px as the sidebar animates its width — two movements at once,
 * which reads as a glitch. A fixed-height row means only the width animates.
 * `overflow-hidden` handles the rest: 64px fits no wordmark.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex h-10 shrink-0 items-center overflow-hidden px-1.5">
          <BrandWordmark className="transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-0" />
        </div>
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
