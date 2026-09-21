import { Outlet, useLocation } from "react-router"

import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AthenaPane } from "@/components/athena-pane"
import { AthenaProvider } from "@/components/athena-provider"
import { AppToaster } from "@/components/app-toaster"
import { MessagesProvider } from "@/components/messages-provider"
import { PageHeaderProvider } from "@/components/page-header"
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
        {/* The dock's threads, shared with Athena — she reads who is waiting
            and writes drafts into them. Here rather than in `main.tsx` because
            nothing outside the shell has a dock to talk to. */}
        <MessagesProvider>
          <AppSidebar variant="sidebar" />

          {/* Around the header AND the outlet, because a page about one object
              draws its own header into the bar — see `page-header.tsx`. It
              renders no DOM, so the sidebar's sibling selectors are unmoved. */}
          <PageHeaderProvider>
            <SidebarInset className="bg-canvas">
              <SiteHeader title={titleForPath(pathname)} />

              {/* `@container/main` lets pages respond to the content column
                rather than the viewport, which is what actually changes when
                the sidebar collapses — and now also when Athena takes a
                column. Pages own their own gutters via `px-4 lg:px-6`. */}
              <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                  <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    <Outlet />
                  </div>
                </div>
              </div>
            </SidebarInset>
          </PageHeaderProvider>

          {/* The third column, and a sibling of the content rather than a child
            of it: it sits BESIDE the page, not over it. Mounted here rather
            than per page so a half-typed question survives navigation. */}
          <AthenaPane />

          {/* Mounted here rather than in `main.tsx` so it sits inside the
              shell's providers. See `app-toaster.tsx` for why it is composed
              rather than the shipped `Toaster`. */}
          <AppToaster />
        </MessagesProvider>
      </AthenaProvider>
    </SidebarProvider>
  )
}
