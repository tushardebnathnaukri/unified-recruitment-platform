import { Outlet, useLocation } from "react-router"

import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AthenaPane } from "@/components/athena-pane"
import { AthenaProvider } from "@/components/athena-provider"
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
          // Athena's column, here with the other shell dimensions for the same
          // reason: the pane sets its width from this and the message dock
          // reads it to get out of the way, so the two cannot disagree.
          "--athena-width": "calc(var(--spacing) * 96)",
        } as React.CSSProperties
      }
    >
      {/* Inside SidebarProvider because opening Athena collapses the nav, and
          the provider is where the nav's state lives. */}
      <AthenaProvider>
        <AppSidebar variant="inset" />

        <SidebarInset>
          <SiteHeader title={titleForPath(pathname)} />

          {/* `@container/main` lets pages respond to the content column rather
              than the viewport, which is what actually changes when the sidebar
              collapses — and now also when Athena takes a column. Pages own
              their own gutters via `px-4 lg:px-6`. */}
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <Outlet />
              </div>
            </div>
          </div>
        </SidebarInset>

        {/* The third column, and a sibling of the content rather than a child
            of it: it sits BESIDE the page, not over it. Mounted here rather
            than per page so a half-typed question survives navigation. */}
        <AthenaPane />

        {/* Outside SidebarInset because it is `fixed` to the viewport corner
            and should not shift when the sidebar collapses. Inside
            AthenaProvider because it does have to shift for Athena — the
            copilot takes the corner the dock was sitting in. Mounted here
            rather than per page so a half-written message survives
            navigation. */}
        <MessageDock />
      </AthenaProvider>
    </SidebarProvider>
  )
}
