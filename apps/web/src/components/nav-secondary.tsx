import { NavLink, useMatch } from "react-router"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import { SECONDARY_ITEMS, type SecondaryItem } from "@/lib/nav"

/**
 * Split into two components rather than branching inside one: `useMatch` is a
 * hook, so the routed variant has to call it unconditionally.
 */
function SecondaryLinkItem({ item }: { item: SecondaryItem & { to: string } }) {
  const match = useMatch({ path: item.to, end: false })
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="sm"
        render={<NavLink to={item.to} />}
        isActive={Boolean(match)}
        tooltip={item.label}
      >
        <Icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SecondaryButtonItem({ item }: { item: SecondaryItem }) {
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton size="sm" tooltip={item.label}>
        <Icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/** Utility nav, pinned to the bottom of the sidebar by `mt-auto` at the call site. */
export function NavSecondary({ className }: { className?: string }) {
  return (
    <SidebarGroup className={className}>
      <SidebarGroupContent>
        <SidebarMenu>
          {SECONDARY_ITEMS.map((item) =>
            item.to ? (
              <SecondaryLinkItem
                key={item.label}
                item={{ ...item, to: item.to }}
              />
            ) : (
              <SecondaryButtonItem key={item.label} item={item} />
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
