import type { LucideIcon } from "lucide-react"
import {
  BriefcaseIcon,
  ChartColumnIcon,
  CircleHelpIcon,
  HouseIcon,
  LayoutDashboardIcon,
  SearchIcon,
  Settings2Icon,
  SwatchBookIcon,
} from "lucide-react"

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end: boolean
}

/** A utility-nav entry. Without `to` it renders as a button and goes nowhere. */
export type SecondaryItem = {
  label: string
  icon: LucideIcon
  to?: string
}

/**
 * Primary nav. Lives here rather than in the sidebar component so the header
 * can reuse it for the page title without importing a component module —
 * `react-refresh/only-export-components` is on in this app.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    end: false,
  },
  { to: "/jobs", label: "Jobs", icon: BriefcaseIcon, end: false },
  { to: "/analytics", label: "Analytics", icon: ChartColumnIcon, end: false },
]

/**
 * Routes that exist but stay out of the sidebar: they describe the prototype
 * rather than the recruiter product, so they hang off Settings instead. Listed
 * here rather than hardcoded into the Settings page so `titleForPath` keeps
 * naming them in the header, and so adding one only means editing this array.
 */
export const PROTOTYPE_ITEMS: NavItem[] = [
  { to: "/", label: "Overview", icon: HouseIcon, end: true },
  { to: "/playground", label: "Playground", icon: SwatchBookIcon, end: false },
]

/**
 * Utility nav. Get Help stays a button because it has no route behind it — a
 * NavLink to a route with no match renders an empty page, which reads as a bug
 * during a design review.
 */
export const SECONDARY_ITEMS: SecondaryItem[] = [
  { label: "Settings", icon: Settings2Icon, to: "/settings" },
  { label: "Get Help", icon: CircleHelpIcon },
  { label: "Search", icon: SearchIcon, to: "/search" },
]

/**
 * Routes with no nav entry at all — reached from a button rather than the
 * sidebar. Listed only so the header can still name them.
 */
const UNLISTED_TITLES: { to: string; label: string; end: boolean }[] = [
  { to: "/post-job", label: "Post a job", end: false },
]

/** Longest matching nav item wins, so nested routes keep their parent's title. */
export function titleForPath(pathname: string) {
  const routable = [
    ...NAV_ITEMS,
    ...PROTOTYPE_ITEMS,
    ...UNLISTED_TITLES,
    ...SECONDARY_ITEMS.filter((item): item is SecondaryItem & { to: string } =>
      Boolean(item.to)
    ).map((item) => ({ ...item, end: false })),
  ]

  const match = [...routable]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) =>
      item.end ? pathname === item.to : pathname.startsWith(item.to)
    )

  return match?.label ?? "Recruiter prototype"
}
