import { Outlet, useLocation } from "react-router"

import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { MessageDock } from "@/components/message-dock"
import { SiteHeader } from "@/components/site-header"
import { titleForPath } from "@/lib/nav"

export function AppShell() {
  const { pathname } = useLocation()

  return (
    // Shell dimensions are CSS variables rather than utility classes so the
    // header and sidebar read the same numbers — change them here only.
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader title={titleForPath(pathname)} />

        {/* `@container/main` lets pages respond to the content column rather
            than the viewport, which is what actually changes when the sidebar
            collapses. Pages own their own gutters via `px-4 lg:px-6`. */}
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <Outlet />
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Outside SidebarInset because it is `fixed` to the viewport corner and
          should not shift when the sidebar collapses. Mounted here rather than
          per page so a half-written message survives navigation. */}
      <MessageDock />
    </SidebarProvider>
  )
}
