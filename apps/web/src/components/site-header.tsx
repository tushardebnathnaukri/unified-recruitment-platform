import { SparklesIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useAthena } from "@/components/athena-provider"

/**
 * Top bar. Height comes from `--header-height`, set once on SidebarProvider in
 * AppShell, so the header and the sidebar's collapse animation stay in step.
 *
 * The brand switcher and theme toggle both used to live here and now sit on
 * /settings, which leaves this bar as trigger + title. Flipping either costs a
 * navigation; the `d` shortcut in ThemeProvider is the only global escape.
 *
 * THE COLLAPSE TRIGGER HAS MOVED TO THE SIDEBAR, beside the wordmark, which
 * leaves this bar saying what page you are on and nothing else. What is left
 * here is the mobile copy of it: under 768px the sidebar is a Sheet and is not
 * in the DOM while closed, so the trigger has to live outside it to be able to
 * open it. Above that width this one hides and the sidebar's own takes over.
 *
 * It carried a breadcrumb for a while — trigger + trail, with a job's response
 * manager reading "Jobs › <job title>". It is a plain title again: the trail
 * was two crumbs on exactly one route and a single crumb everywhere else, which
 * is a title with extra machinery behind it.
 */
export function SiteHeader({ title }: { title: string }) {
  const { open, setOpen } = useAthena()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 h-4 data-vertical:self-auto"
          />
        </div>
        <h1 className="text-base font-medium">{title}</h1>

        {/* ATHENA IS THE ONE THING THAT COMES BACK TO THIS BAR. The brand and
            theme switchers left because flipping them is a design-review act
            rather than a recruiter one; the copilot is the opposite. It has to
            be reachable from every page without knowing where it lives, and
            the far corner of a bar that is present on all of them is the only
            place that is true of.

            IT ONLY OPENS. While the pane is up it is gone, because the pane
            carries its own close and two controls for one thing is one of them
            spending header room to say what the other already says. That also
            makes this a plain button rather than a toggle — there is no pressed
            state to announce when the pressed state is invisible. */}
        {!open && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setOpen(true)}
                />
              }
            >
              <SparklesIcon data-icon="inline-start" />
              Athena
            </TooltipTrigger>
            <TooltipContent>Ask Athena about this page</TooltipContent>
          </Tooltip>
        )}
      </div>
    </header>
  )
}
