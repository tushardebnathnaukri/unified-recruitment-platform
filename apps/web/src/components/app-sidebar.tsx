import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
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
 * THE COLLAPSE TRIGGER SITS IN THIS ROW, not in the page header. It is the
 * sidebar's own control, and putting it on the sidebar means the top bar is
 * left to say what page you are on and nothing else.
 *
 * In the collapsed rail the wordmark goes and the trigger takes the row on its
 * own, centred — at 64px there is no room for a wordmark, and a button that
 * stays put while everything around it narrows is the clearest thing to leave
 * behind. The row KEEPS ITS HEIGHT either way: hiding it outright is what you
 * reach for first, and it makes the whole nav jump up 40px as the sidebar
 * animates its width — two movements at once, which reads as a glitch.
 *
 * `max-md:hidden` on the trigger is not decoration. Under 768px the sidebar is
 * a Sheet, so when it is closed it does not exist in the DOM — a trigger inside
 * it would be the only way to open something that has to be open to reach it.
 * SiteHeader keeps a trigger for exactly that width and hides it above.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex h-10 shrink-0 items-center justify-between gap-2 overflow-hidden px-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <BrandWordmark className="group-data-[collapsible=icon]:hidden" />
          <SidebarTrigger className="max-md:hidden" />
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
