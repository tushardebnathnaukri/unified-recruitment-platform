import { Fragment } from "react"
import { NavLink, useMatch } from "react-router"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
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
 * A run of items breaks into its own `<SidebarMenu>` at each
 * `separatorBefore`, with a `SidebarSeparator` between the runs — a
 * `SidebarSeparator` can't sit inside `SidebarMenu`'s `<ul>` as a bare `<li>`
 * sibling, so the divider has to fall between two menus rather than inside one.
 */
function groupBySeparator(items: NavItem[]): NavItem[][] {
  const groups: NavItem[][] = []
  for (const item of items) {
    if (item.separatorBefore || groups.length === 0) groups.push([])
    groups[groups.length - 1].push(item)
  }
  return groups
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {groupBySeparator(items).map((group, index) => (
          <Fragment key={group[0].to}>
            {index > 0 && <SidebarSeparator />}
            <SidebarMenu>
              {group.map((item) => (
                <NavMenuItem key={item.to} item={item} />
              ))}
            </SidebarMenu>
          </Fragment>
        ))}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
