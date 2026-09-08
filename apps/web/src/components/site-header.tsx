import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"

/**
 * Top bar. Height comes from `--header-height`, set once on SidebarProvider in
 * AppShell, so the header and the sidebar's collapse animation stay in step.
 *
 * The brand switcher and theme toggle both used to live here and now sit on
 * /settings, which leaves this bar as trigger + title. Flipping either costs a
 * navigation; the `d` shortcut in ThemeProvider is the only global escape.
 *
 * It carried a breadcrumb for a while — trigger + trail, with a job's response
 * manager reading "Jobs › <job title>". It is a plain title again: the trail
 * was two crumbs on exactly one route and a single crumb everywhere else, which
 * is a title with extra machinery behind it.
 */
export function SiteHeader({ title }: { title: string }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  )
}
