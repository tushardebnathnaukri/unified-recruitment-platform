import { Outlet } from "react-router"

import { Separator } from "@workspace/ui/components/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { BrandSwitcher } from "@/components/brand-switcher"
import { ThemeToggle } from "@/components/theme-toggle"

export function AppShell() {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        {/* Brand and theme controls stay in the top bar rather than the
            sidebar: they are the two things designers reach for constantly,
            and they must stay reachable when the sidebar is collapsed. */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-1 h-4" />

          <div className="ml-auto flex items-center gap-2">
            <BrandSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-6 py-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
