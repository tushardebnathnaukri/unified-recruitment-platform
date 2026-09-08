import * as React from "react"
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"
import {
  ArrowRightIcon,
  BriefcaseIcon,
  CalendarCheckIcon,
  ClockIcon,
  MapPinIcon,
  SearchIcon,
  SparklesIcon,
  TicketIcon,
  UsersIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Chip } from "@workspace/ui/components/chip"
import { Item, ItemActions, ItemContent } from "@workspace/ui/components/item"
import { ListCard } from "@workspace/ui/components/list-card"
import { Meta as MetaLine, MetaItem } from "@workspace/ui/components/meta"
import { SectionHeader } from "@workspace/ui/components/section-header"
import { StatCard, StatGrid } from "@workspace/ui/components/stat-card"
import { Textarea } from "@workspace/ui/components/textarea"

/**
 * The recruiter dashboard, rebuilt from the design system's parts and
 * nothing else. Mirrors `apps/web/src/routes/dashboard.tsx`; the app version
 * adds the router and the WebGL aurora on the hero band. Mock data is a
 * copy of `apps/web/src/lib/dashboard.ts` — packages/ui cannot import from
 * the app.
 */

const STATS = [
  {
    label: "Active jobs",
    value: "6",
    detail: "2 expiring this week",
    icon: BriefcaseIcon,
  },
  {
    label: "Applicants",
    value: "271",
    detail: "48 you haven't opened",
    icon: UsersIcon,
  },
  {
    label: "Interviews",
    value: "5",
    detail: "2 today",
    icon: CalendarCheckIcon,
  },
  {
    label: "Posting credits",
    value: "9",
    detail: "of 25 used this quarter",
    icon: TicketIcon,
  },
]

const JOBS = [
  {
    id: "j1",
    title: "Principal Engineer, Platform Infrastructure",
    location: "Bengaluru",
    applicants: 148,
    unread: 32,
    expiresInDays: 6,
    plan: "Pro",
  },
  {
    id: "j2",
    title: "Engineering Manager — Payments",
    location: "Multiple locations",
    applicants: 61,
    unread: 0,
    expiresInDays: 3,
    plan: "Pro",
  },
  {
    id: "j3",
    title: "Product Designer II",
    location: "Pune",
    applicants: 7,
    unread: 7,
    expiresInDays: 14,
    plan: "Basic",
  },
  {
    id: "j4",
    title: "Head of Talent Acquisition",
    location: "Gurugram",
    applicants: 55,
    unread: 9,
    expiresInDays: 21,
    plan: "Basic",
  },
]

const SEARCHES = [
  {
    id: "s1",
    query: "Kafka, Kubernetes, platform",
    filters: ["Bengaluru", "9–14 yrs"],
    matches: 214,
    ranAgo: "2 hours ago",
    newSince: 6,
  },
  {
    id: "s2",
    query: "Engineering manager, payments",
    filters: ["Multiple locations", "7–11 yrs"],
    matches: 88,
    ranAgo: "Yesterday",
    newSince: 0,
  },
  {
    id: "s3",
    query: "Design systems, Figma, mobile",
    filters: ["Pune", "6+ yrs"],
    matches: 37,
    ranAgo: "3 days ago",
    newSince: 4,
  },
]

const PROJECTS = [
  {
    id: "p1",
    name: "Staff Platform Engineer",
    channels: ["Posted", "Sourcing"],
    shortlisted: 12,
    contacted: 5,
    updatedAgo: "Today",
  },
  {
    id: "p2",
    name: "Engineering Manager, Payments",
    channels: ["Sourcing"],
    shortlisted: 7,
    contacted: 0,
    updatedAgo: "2 days ago",
  },
  {
    id: "p3",
    name: "Design lead — confidential",
    channels: [],
    shortlisted: 0,
    contacted: 0,
    updatedAgo: "5 days ago",
  },
]

const STARTERS = [
  {
    label: "Platform engineer",
    text: "Staff platform engineer in Bengaluru, 9–14 years, has run Kafka at scale",
  },
  {
    label: "Engineering manager",
    text: "Engineering manager for payments, 7–11 years, has managed a team of 6+",
  },
  {
    label: "Product designer",
    text: "Senior product designer, 6+ years, owns a design system end to end",
  },
]

function ViewAll({ children }: { children: React.ReactNode }) {
  return (
    <Button variant="link" size="sm" className="px-0" render={<a href="#" />}>
      {children}
      <ArrowRightIcon data-icon="inline-end" />
    </Button>
  )
}

/** Card + Textarea + Chip + Button. No accent tint: position and size do the emphasis. */
function RequirementBox() {
  const [draft, setDraft] = React.useState("")

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-lg">
      <label className="flex cursor-text items-start gap-3 p-4">
        <SparklesIcon className="mt-1 size-4 shrink-0 text-primary" />
        <Textarea
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Describe the role you are hiring for"
          placeholder="Describe who you're hiring for — seniority, location, and what they need to have actually done."
          className="min-h-14 resize-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-sm dark:bg-transparent"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Try</span>
          {STARTERS.map((starter) => (
            <Chip key={starter.label} onClick={() => setDraft(starter.text)}>
              {starter.label}
            </Chip>
          ))}
        </div>
        <Button size="sm" disabled={draft.trim() === ""}>
          Start project
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </Card>
  )
}

function StatRow() {
  return (
    <StatGrid>
      {STATS.map((stat) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          detail={stat.detail}
          icon={<stat.icon />}
        />
      ))}
    </StatGrid>
  )
}

function ActiveJobs() {
  return (
    <section className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <SectionHeader title="Active jobs" action={<ViewAll>View all</ViewAll>} />
      <ListCard>
        {JOBS.map((job) => {
          const expiringSoon = job.expiresInDays <= 7
          return (
            <Item
              key={job.id}
              render={<a href="#job" />}
              className="items-start"
            >
              <ItemContent className="min-w-0 basis-56 gap-1.5">
                {/* Wraps rather than truncates: the title is what a recruiter
                    identifies the row by, so ItemTitle's clamp is skipped. */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{job.title}</span>
                  <Badge variant={job.plan === "Pro" ? "secondary" : "outline"}>
                    {job.plan}
                  </Badge>
                </div>
                <MetaLine separator={false}>
                  <MetaItem>
                    <MapPinIcon />
                    {job.location}
                  </MetaItem>
                  <MetaItem tone={expiringSoon ? "warning" : "default"}>
                    <ClockIcon />
                    Expires in {job.expiresInDays} days
                  </MetaItem>
                </MetaLine>
              </ItemContent>
              <ItemActions className="items-baseline">
                {job.unread > 0 ? (
                  <>
                    <span className="text-lg font-medium tabular-nums">
                      {job.unread}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      new of {job.applicants}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {job.applicants} applicants
                  </span>
                )}
              </ItemActions>
            </Item>
          )
        })}
      </ListCard>
    </section>
  )
}

function RecentSearches() {
  return (
    <section className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <SectionHeader
        title="Recent searches"
        action={<ViewAll>New search</ViewAll>}
      />
      <ListCard>
        {SEARCHES.map((search) => (
          <Item
            key={search.id}
            render={<a href="#search" />}
            className="flex-col items-stretch gap-2"
          >
            <div className="flex items-start gap-2">
              <SearchIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 text-sm font-medium">
                {search.query}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {search.filters.map((filter) => (
                <Badge key={filter} variant="outline" className="font-normal">
                  {filter}
                </Badge>
              ))}
            </div>
            <MetaLine>
              <span>{search.matches} matches</span>
              <span>{search.ranAgo}</span>
              {search.newSince > 0 && (
                <Badge variant="success" className="font-normal">
                  {search.newSince} new
                </Badge>
              )}
            </MetaLine>
          </Item>
        ))}
      </ListCard>
    </section>
  )
}

function RecentProjects() {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <SectionHeader
        title="Recent projects"
        action={<ViewAll>New project</ViewAll>}
      />
      <ListCard>
        {PROJECTS.map((project) => {
          const notStarted = project.channels.length === 0
          const stalled = !notStarted && project.contacted === 0
          return (
            <Item key={project.id} render={<a href="#project" />}>
              <ItemContent className="min-w-0 basis-64 flex-row flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{project.name}</span>
                {notStarted ? (
                  <Badge variant="outline" className="font-normal">
                    Not started
                  </Badge>
                ) : (
                  project.channels.map((channel) => (
                    <Badge
                      key={channel}
                      variant="secondary"
                      className="font-normal"
                    >
                      {channel}
                    </Badge>
                  ))
                )}
              </ItemContent>
              <MetaLine>
                <MetaItem>{project.shortlisted} shortlisted</MetaItem>
                <MetaItem tone={stalled ? "warning" : "default"}>
                  {project.contacted} contacted
                </MetaItem>
                <MetaItem className="whitespace-nowrap">
                  {project.updatedAgo}
                </MetaItem>
              </MetaLine>
            </Item>
          )
        })}
      </ListCard>
    </section>
  )
}

const meta = {
  title: "Compositions/Dashboard",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `
The recruiter dashboard assembled from the parts documented under
Components and Patterns, and nothing else. \`apps/web\` renders the same
tree with the router and the aurora hero on top.

Each block is its own story so the pieces can be reviewed alone. Read the
whole page to see the layout rules: two *equal* columns for jobs and
searches (neither is an aside), projects on their own full-width row above
them, and every breakpoint a container query on the content column.
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="@container min-h-svh bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const FullPage: Story = {
  name: "Full page",
  render: () => (
    <div className="flex flex-col">
      <div className="bg-primary pt-8 pb-28">
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-6">
          <div className="flex flex-col gap-1 text-primary-foreground">
            <p className="text-xl font-semibold">Good afternoon, Priya</p>
            <p className="text-sm">
              Two interviews today, and 48 applicants you haven&rsquo;t opened.
            </p>
          </div>
        </div>
      </div>
      <div className="relative mx-auto -mt-16 flex w-full max-w-7xl flex-col gap-6 px-4 pb-8 lg:px-6">
        <RequirementBox />
        <StatRow />
        <RecentProjects />
        <div className="grid gap-6 @3xl:grid-cols-2">
          <ActiveJobs />
          <RecentSearches />
        </div>
      </div>
    </div>
  ),
}

const padded: Decorator = (Story) => (
  <div className="mx-auto max-w-3xl p-6">
    <Story />
  </div>
)

export const RequirementBoxStory: Story = {
  name: "Requirement box",
  decorators: [padded],
  render: () => <RequirementBox />,
}

export const StatRowStory: Story = {
  name: "Stat row",
  decorators: [padded],
  render: () => <StatRow />,
}

export const ActiveJobsStory: Story = {
  name: "Active jobs",
  decorators: [padded],
  render: () => <ActiveJobs />,
}

export const RecentSearchesStory: Story = {
  name: "Recent searches",
  decorators: [padded],
  render: () => <RecentSearches />,
}

export const RecentProjectsStory: Story = {
  name: "Recent projects",
  decorators: [padded],
  render: () => <RecentProjects />,
}
