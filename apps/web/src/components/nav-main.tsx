import { MailIcon, PlusCircleIcon } from "lucide-react"
import { NavLink, useMatch } from "react-router"

import { Button } from "@workspace/ui/components/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import type { NavItem } from "@/lib/nav"

/**
 * `useMatch` is a hook, so each item needs its own component rather than a
 * loop body — that is why this is split out rather than inlined into the map.
 */
function NavMenuItem({ item }: { item: NavItem }) {
  const match = useMatch({ path: item.to, end: item.end })
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<NavLink to={item.to} end={item.end} />}
        isActive={Boolean(match)}
        tooltip={item.label}
      >
        <Icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/**
 * Primary navigation, plus the standing create action above it.
 *
 * The create action is styled from `--primary`, so it is the one place in the
 * sidebar that changes colour with the brand — which makes it a useful thing
 * to look at when comparing iimjobs and hirist side by side.
 */
export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            {/* TODO(design): "Post a job" is a placeholder for whatever the
                recruiter's primary create action turns out to be. */}
            <SidebarMenuButton
              render={<NavLink to="/post-job" />}
              tooltip="Post a job"
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
            >
              <PlusCircleIcon />
              <span>Post a job</span>
            </SidebarMenuButton>
            <Button
              size="icon"
              variant="outline"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
            >
              <MailIcon />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenu>
          {items.map((item) => (
            <NavMenuItem key={item.to} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
