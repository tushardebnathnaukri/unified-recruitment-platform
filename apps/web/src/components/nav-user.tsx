import { Link } from "react-router"
import {
  BadgeCheckIcon,
  BellIcon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  LogOutIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { SECONDARY_ITEMS } from "@/lib/nav"

/** Mock recruiter. There is no auth in this prototype. */
const USER = {
  name: "Priya Raman",
  email: "priya@example.com",
  avatar: "",
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/**
 * Account menu in the sidebar footer. `useSidebar` gives us `isMobile`, which
 * decides whether the menu opens to the side or above — on a collapsed or
 * mobile sidebar there is no room to the right.
 *
 * IT CARRIES THE UTILITY NAV NOW — Settings, Get Help, Search — which used to
 * be three rows above it. They were competing with Dashboard, Jobs, Database
 * and Analytics for the same kind of attention while being a different kind of
 * thing: the four above are where the work is, these are what you do about the
 * tool. Folding them into the account menu leaves the sidebar as the four
 * places a recruiter goes, and gives the banner above the footer a clean edge
 * to sit against.
 *
 * They keep their `to` from `SECONDARY_ITEMS`, so Settings still routes and Get
 * Help still goes nowhere — the same honesty the sidebar had about which of
 * them exist.
 */
export function NavUser() {
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarImage src={USER.avatar} alt={USER.name} />
              <AvatarFallback className="rounded-lg">
                {initials(USER.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{USER.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {USER.email}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* Base UI's DropdownMenuLabel is a GroupLabel, so it throws
                outside a Group — unlike Radix's, which stands alone. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={USER.avatar} alt={USER.name} />
                    <AvatarFallback className="rounded-lg">
                      {initials(USER.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{USER.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {USER.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheckIcon />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCardIcon />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BellIcon />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              {SECONDARY_ITEMS.map((item) => {
                const Icon = item.icon

                return item.to ? (
                  <DropdownMenuItem
                    key={item.label}
                    render={<Link to={item.to} />}
                  >
                    <Icon />
                    {item.label}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem key={item.label}>
                    <Icon />
                    {item.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem>
                <LogOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
