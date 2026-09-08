import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { ProductSwitcher } from "@/components/product-switcher"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { NAV_ITEMS } from "@/lib/nav"

/**
 * Structure follows shadcn's dashboard-01 block: a brand row in the header,
 * primary nav, then utility nav pushed to the bottom by `mt-auto`, with the
 * account menu in the footer.
 *
 * The header is the product switcher — the wordmark, pressable, opening the
 * list of products. It is deliberately not a LINK: a logo that navigates
 * competes with Dashboard, which is already the first thing in the nav below
 * it. Switching product is the one thing the mark is actually the right control
 * for, being the mark of the product you would be leaving.
 *
 * THE COLLAPSE TRIGGER SITS IN THIS ROW, not in the page header. It is the
 * sidebar's own control, and putting it on the sidebar means the top bar is
 * left to say what page you are on and nothing else.
 *
 * In the collapsed rail the switcher goes and the trigger takes the row on its
 * own, centred. At 64px only one of the two fits, and the one to keep is the
 * one that gets you back: a product switcher you cannot read is a menu you open
 * to find out where you are, while the trigger expands the sidebar and shows
 * you. Switching product from a rail is rare; expanding it first is one click.
 *
 * The row KEEPS ITS HEIGHT either way — `h-10` on the row rather than on what
 * it holds, so the nav below does not jump while the width animates.
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
        <div className="flex h-10 items-center gap-1 group-data-[collapsible=icon]:justify-center">
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <ProductSwitcher />
          </div>
          <SidebarTrigger className="shrink-0 max-md:hidden" />
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
