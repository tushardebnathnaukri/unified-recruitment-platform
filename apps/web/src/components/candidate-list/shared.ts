import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { LayoutListIcon, PanelsTopLeftIcon, Table2Icon } from "lucide-react"
import type { ColumnVisibility } from "@/lib/table-columns"
import type {
  Filters,
  SortColumn,
  Applicant,
  ResponseBucket,
} from "@/lib/applicants"

/**
 * What every part of the response manager has to agree on: its three views, its
 * six tabs, the runs a list is drawn in, and who is ticked.
 *
 * IT IS NOT IN `index.tsx`, because that is the file that renders these parts —
 * a card importing the screen it is drawn on is a cycle. With the shared
 * vocabulary here instead, every import in this folder runs one way, from the
 * screen down. Nothing in here draws anything, which is also why
 * `PickingContext` sits here rather than beside the checkbox that reads it: a
 * file exporting a context alongside its components loses fast refresh.
 */

/** How many cards a page of responses is. */
export const PAGE_SIZE = 20

/**
 * Cards or a table, over the same people in the same order.
 *
 * They are not three designs of one thing, they are three densities, and each
 * answers a different question. Cards are for scanning: four lines a person,
 * enough to triage and no more. The table is for comparing: one line a person
 * with every number in a column, which is the only way to answer "who here is
 * on a short notice period" across a hundred and forty-eight rows. Split is for
 * reading: a thin list beside a whole profile, for when the list is down to the
 * ten people worth an hour. None of them wins.
 */
export type View = "cards" | "table" | "split"

export const VIEWS: { value: View; label: string; icon: LucideIcon }[] = [
  { value: "cards", label: "Cards", icon: LayoutListIcon },
  { value: "table", label: "Table", icon: Table2Icon },
  { value: "split", label: "Split", icon: PanelsTopLeftIcon },
]

/**
 * TO REVIEW FIRST, AND IT IS WHERE THE PAGE OPENS. A recruiter comes here each
 * day to get through who is waiting on a decision, so that queue is the page;
 * the rest are where decisions land. Not a fit and All go last — you rarely go
 * back to a rejection, and All is for finding one particular person.
 */
export const BUCKETS: { value: ResponseBucket; label: string }[] = [
  { value: "undecided", label: "To review" },
  { value: "maybe", label: "Maybe" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "contacted", label: "Contacted" },
  { value: "rejected", label: "Not a fit" },
  { value: "all", label: "All" },
]

export const DEFAULT_BUCKET: ResponseBucket = "undecided"

/**
 * Who is ticked, and asking Athena about people — handed down to the cards and
 * table rows by context rather than threaded through four layers of props. The
 * split view does not take part: its list already has a selection, the person
 * whose CV is open, and a second kind of selected in the same narrow column
 * would be two highlights meaning two things.
 */
export type Picking = {
  isPicked: (id: string) => boolean
  toggle: (id: string) => void
  /** Ticks or unticks a whole run at once — "Select all" over a tab. */
  setMany: (ids: string[], on: boolean) => void
  askAbout: (people: Applicant[]) => void
}

export const PickingContext = React.createContext<Picking | null>(null)

/**
 * The To review queue's order: everybody new since the last visit, then
 * everybody older. The sort applies inside each half, never across them — a
 * better match from three weeks ago does not jump ahead of today's arrivals.
 * `filter` is stable, so each half keeps the order the sort already gave it.
 */
export function queueOrder(applicants: Applicant[]) {
  return [
    ...applicants.filter((applicant) => applicant.newSinceVisit),
    ...applicants.filter((applicant) => !applicant.newSinceVisit),
  ]
}

/**
 * The page chrome under the split view — its `py-6` bottom and the rest of the
 * gutter the shell puts around a page — cancelled with a negative bottom
 * margin so the two columns run to the bottom of the screen. Only the md+
 * figure, because the split view is not offered below it: `useIsMobile` sends
 * that width to the cards.
 */
export const SPLIT_CHROME = 44

export const EMPTY_FILTERS: Filters = {
  q: "",
  exp: "",
  notice: "",
  location: [],
  preferred: [],
}

/** Whether two filter sets ask the same thing — what "unapplied" is measured against. */
export function sameFilters(a: Filters, b: Filters) {
  return (
    a.q === b.q &&
    a.exp === b.exp &&
    a.notice === b.notice &&
    a.location.join() === b.location.join() &&
    a.preferred.join() === b.preferred.join()
  )
}

/** One run of the list under its own heading — see `ApplicantList`. */
export type ListRun = {
  key: string
  heading: React.ReactNode
  rows: Applicant[]
}

/** What the table's headers need from the list: the URL's filters and sort. */
export type TableControls = {
  filters: Filters
  locations: string[]
  sort: string
  onFilter: (updates: Partial<Filters>) => void
  /** `null` clears back to the list's default order. */
  onSort: (column: SortColumn, desc: boolean | null) => void
  visibility: ColumnVisibility
  onVisibility: (next: ColumnVisibility) => void
  headerFilters: TableFilters
}

/** A column header's filter: whether it is on, and its controls. */
export type TableFilters = Partial<
  Record<
    SortColumn,
    { filtered: boolean; render: (close: () => void) => React.ReactNode }
  >
>

