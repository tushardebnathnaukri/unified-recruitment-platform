import type { Meta, StoryObj } from "@storybook/react-vite"

import { Badge } from "@workspace/ui/components/badge"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { design } from "@workspace/ui/lib/figma"

const JOBS = [
  {
    title: "Principal Engineer, Platform",
    location: "Bengaluru",
    applicants: 148,
    unread: 32,
    plan: "Pro",
    status: "Live",
  },
  {
    title: "Engineering Manager — Payments",
    location: "Multiple",
    applicants: 61,
    unread: 0,
    plan: "Pro",
    status: "Expiring",
  },
  {
    title: "Product Designer II",
    location: "Pune",
    applicants: 7,
    unread: 7,
    plan: "Basic",
    status: "Live",
  },
  {
    title: "Head of Talent Acquisition",
    location: "Gurugram",
    applicants: 55,
    unread: 9,
    plan: "Basic",
    status: "Live",
  },
]

const meta = {
  title: "Components/Table",
  component: Table,
  parameters: {
    design: design("table"),
    layout: "padded",
    docs: {
      description: {
        component: `
Plain HTML table parts with the system's type and hairlines. The wrapper
scrolls horizontally, so a wide table never widens the page.

Use it when the recruiter is *comparing* rows — applicant counts across jobs,
candidates across a shortlist. When each row is a destination rather than a
data point, a \`ListCard\` of \`Item\`s reads better and wraps on narrow
columns, which a table cannot.

Numeric columns: right-align and \`tabular-nums\`, so 7 and 148 line up.
        `,
      },
    },
  },
} satisfies Meta<typeof Table>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Table className="w-3xl">
      <TableHeader>
        <TableRow>
          <TableHead>Job</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead className="text-right">Applicants</TableHead>
          <TableHead className="text-right">Unread</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {JOBS.map((job) => (
          <TableRow key={job.title}>
            <TableCell className="font-medium">{job.title}</TableCell>
            <TableCell>{job.location}</TableCell>
            <TableCell>
              <Badge variant={job.plan === "Pro" ? "secondary" : "outline"}>
                {job.plan}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {job.applicants}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {job.unread}
            </TableCell>
            <TableCell>
              <Badge
                variant={job.status === "Expiring" ? "warning" : "success"}
                className="font-normal"
              >
                {job.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>4 active jobs</TableCell>
          <TableCell className="text-right tabular-nums">271</TableCell>
          <TableCell className="text-right tabular-nums">48</TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  ),
}

export const Selectable: Story = {
  render: () => (
    <Table className="w-2xl">
      <TableCaption>Shortlist for Staff Platform Engineer</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">
            <Checkbox aria-label="Select all" />
          </TableHead>
          <TableHead>Candidate</TableHead>
          <TableHead>Current role</TableHead>
          <TableHead className="text-right">Experience</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[
          ["Aditi Kapoor", "Staff Engineer, Razorpay", "11 yrs"],
          ["Rohan Mehta", "Principal Engineer, Flipkart", "13 yrs"],
          ["Sneha Iyer", "Engineering Lead, PhonePe", "9 yrs"],
        ].map(([name, role, exp], index) => (
          <TableRow
            key={name}
            data-state={index === 0 ? "selected" : undefined}
          >
            <TableCell>
              <Checkbox
                defaultChecked={index === 0}
                aria-label={`Select ${name}`}
              />
            </TableCell>
            <TableCell className="font-medium">{name}</TableCell>
            <TableCell>{role}</TableCell>
            <TableCell className="text-right tabular-nums">{exp}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}
