import type { LucideIcon } from "lucide-react"
import {
  BriefcaseIcon,
  CalendarCheckIcon,
  ChartColumnIcon,
  CircleHelpIcon,
  ClipboardListIcon,
  CoinsIcon,
  DatabaseIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  MessageCircleIcon,
  LibraryBigIcon,
  SearchIcon,
  Settings2Icon,
  SwatchBookIcon,
  UsersIcon,
} from "lucide-react"

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end: boolean
  /** Draws a divider above this item, separating it from the one before. */
  separatorBefore?: boolean
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
  // FIRST, AND ON ITS OWN. The Dashboard is the Agent: one box that takes a
  // question before the recruiter has decided which screen it is about, with
  // their overview under it. Every other row opens a screen about a thing
  // they already have, and the divider under this one says so rather than
  // filing it with the objects. (It was two items, Agent and Dashboard,
  // until the overview moved under the box.)
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    end: false,
  },
  {
    to: "/jobs",
    label: "Jobs",
    icon: BriefcaseIcon,
    end: false,
    separatorBefore: true,
  },
  // Sits next to Jobs because it is the other way into a candidate: Jobs is
  // who came to you, Search Resume is who you go and find.
  {
    to: "/database",
    label: "Search Resume",
    icon: DatabaseIcon,
    end: false,
  },
  // INSIGHTS, NOT ANALYTICS. What lives here is the market — what a role pays,
  // where the people are, whether demand is rising — and a recruiter reads
  // "analytics" as "how is my hiring going". That question is answered on the
  // Dashboard, by numbers about their own postings.
  { to: "/insights", label: "Insights", icon: ChartColumnIcon, end: false },
  {
    to: "/my-candidates",
    label: "My Lists",
    icon: UsersIcon,
    end: false,
    separatorBefore: true,
  },
  {
    to: "/interviews",
    label: "Interviews",
    icon: CalendarCheckIcon,
    end: false,
  },
  // Beside My Lists and Interviews rather than up with Jobs: like them it is
  // downstream of a candidate having come in through one of the two doors, and
  // it records which. It was a dock in the corner of every page until a
  // conversation turned out to want the room a page has.
  {
    to: "/messages",
    label: "Messages",
    icon: MessageCircleIcon,
    end: false,
  },
  {
    to: "/credits",
    label: "Credits",
    icon: CoinsIcon,
    end: false,
    separatorBefore: true,
  },
]

/**
 * Routes that exist but stay out of the sidebar: they describe the prototype
 * rather than the recruiter product, so they hang off Settings instead. Listed
 * here rather than hardcoded into the Settings page so `titleForPath` keeps
 * naming them in the header, and so adding one only means editing this array.
 *
 * There is no "/" entry any more — Dashboard is the landing page now, reached
 * through `NAV_ITEMS` like every other recruiter surface, so there is nothing
 * left here for the index route to point at.
 */
export const PROTOTYPE_ITEMS: NavItem[] = [
  { to: "/playground", label: "Playground", icon: SwatchBookIcon, end: false },
  // A replica of the live recruiter dashboard, kept for side-by-side reference.
  // It belongs here rather than on /dashboard: it is what the product looks
  // like today, not a claim about what it should look like next.
  {
    to: "/reference/dashboard",
    label: "Live dashboard (replica)",
    icon: HistoryIcon,
    end: false,
  },
  // The two-step posting form from before the clean slate (commit `cab0f1b`
  // dropped every page), restored to be looked at rather than used: /jobs/new
  // is still where a real one would live. Its lists in `lib/post-job.ts`
  // predate `lib/taxonomy.ts` and say different things about the same
  // vocabulary — see the note there.
  {
    to: "/reference/post-job",
    label: "Post a job (earlier design)",
    icon: ClipboardListIcon,
    end: false,
  },
]

/**
 * Prototype links that LEAVE the app.
 *
 * Kept apart from `PROTOTYPE_ITEMS` rather than folded in with an optional
 * `href`, because they are a different kind of thing: those are routes this
 * router owns and `titleForPath` can name, these are somewhere else entirely
 * and can be shut. Storybook runs separately, so a link here is dead unless
 * `npm run storybook` is up — which is the honest state of an external link
 * and worth saying on the page rather than hiding.
 */
export type ExternalItem = {
  label: string
  icon: LucideIcon
  href: string
}

export const PROTOTYPE_LINKS: ExternalItem[] = [
  {
    label: "Post a job form (Storybook)",
    icon: LibraryBigIcon,
    href: "http://localhost:6006/?path=/docs/compositions-post-a-job-form--docs",
  },
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
  { to: "/projects/new", label: "Create Project", end: false },
  // OUT OF THE SIDEBAR, STILL ROUTED. Smart Hire is reached from the
  // Dashboard's box rather than from the nav, so it keeps its title here and
  // nothing else — /smart-hire/brief and /smart-hire/post inherit it by the
  // longest-match rule below.
  { to: "/smart-hire", label: "Smart Hire", end: false },
  // Longer than "/jobs", so it wins the longest-match sort and the header says
  // "Post a job" rather than inheriting the list's title.
  { to: "/jobs/new", label: "Post a job", end: false },
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
