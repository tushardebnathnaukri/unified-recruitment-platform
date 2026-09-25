import * as React from "react"
import {
  columnVisibilityFeature,
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  ApplicantAvatar,
  ApplicantStatusBadge,
} from "@/components/applicant-controls"
import { LocationPicker } from "@/components/location-picker"
import { DataTableColumnHeader } from "@/components/data-table/column-header"
import { TABLE_COLUMNS } from "@/lib/table-columns"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import {
  EXPERIENCE_BANDS,
  isNew,
  NOTICE_BANDS,
  parseSort,
  type SortColumn,
  type Applicant,
  type ApplicantStatus,
} from "@/lib/applicants"
import { useListCopy } from "@/lib/list-source"
import type { ListRun, TableControls } from "@/components/candidate-list/shared"
import { PickBox, SelectAll } from "@/components/candidate-list/selection"
import { RowActions } from "@/components/candidate-list/applicant-actions"
import { MatchedSkills } from "@/components/candidate-list/applicant-card"

/**
 * The table view — its columns, the filters in their headers, and the cells.
 *
 * TANSTACK OWNS THE COLUMNS, NOT THE ROWS. `CandidateList` has already filtered
 * and sorted by the time this draws, because the cards, the split view, the tab
 * counts and Athena all read that same order; this is `manualSorting` over it.
 */

const tableFeaturesUsed = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
})

const columnHelper = createColumnHelper<typeof tableFeaturesUsed, Applicant>()

const labelOf = (id: string) =>
  TABLE_COLUMNS.find((column) => column.id === id)?.label ?? id

/**
 * What the column renderers read. A CONTEXT, NOT CLOSURES: the column
 * definitions below are one module-level constant, so a header's popover is
 * never remounted by a filter changing underneath it — built inside the
 * component, every keystroke in the Candidate search rebuilt the columns and
 * threw the box (and its focus) away.
 */
const ApplicantTableContext = React.createContext<{
  controls: TableControls
  everyone: Applicant[]
  requiredSkills: string[]
  onDecide: (id: string, status: ApplicantStatus) => void
  onOpenProfile: (id: string) => void
} | null>(null)

function useApplicantTable() {
  const context = React.useContext(ApplicantTableContext)
  if (!context) throw new Error("Outside ApplicantTable")
  return context
}

const NUMERIC_COLUMNS: SortColumn[] = ["experience", "pay", "notice", "match"]

/** A sortable column's heading, with the filter that column carries, if any. */
function ColumnHead({ id }: { id: SortColumn }) {
  const { controls } = useApplicantTable()
  const { filters, locations, onFilter, visibility, onVisibility } = controls
  const { searchLabel, arrivedColumn } = useListCopy()
  const parsed = parseSort(controls.sort)
  const sorted =
    parsed?.column === id ? (parsed.desc ? "desc" : "asc") : (false as const)

  const radios =
    (
      label: string,
      value: string,
      options: { value: string; label: string }[],
      onChange: (value: string) => void
    ) =>
    (close: () => void) => (
      <HeaderRadios
        label={label}
        value={value}
        options={options}
        onChange={(next) => {
          onChange(next)
          close()
        }}
      />
    )

  const filter =
    id === "candidate"
      ? {
          filtered: Boolean(filters.q),
          render: () => (
            <Input
              autoFocus
              value={filters.q}
              onChange={(event) => onFilter({ q: event.target.value })}
              placeholder="Search name, role or skill"
              aria-label={searchLabel}
            />
          ),
        }
      : id === "location"
        ? {
            filtered: filters.location.length > 0,
            // The picker, not radios — the same control the rail and the pill
            // carry, so a header and the rail stay one filter in two places.
            // It stays open on a pick, because picking several is the point.
            render: () => (
              <LocationPicker
                label="Current location"
                placeholder="Search locations"
                options={locations}
                chosen={filters.location}
                onChange={(location) => onFilter({ location })}
              />
            ),
          }
        : id === "experience"
          ? {
              filtered: Boolean(filters.exp),
              render: radios(
                "Experience",
                filters.exp,
                [
                  { value: "", label: "Any experience" },
                  ...EXPERIENCE_BANDS.map(({ value, label }) => ({
                    value,
                    label,
                  })),
                ],
                (exp) => onFilter({ exp })
              ),
            }
          : id === "notice"
            ? {
                filtered: Boolean(filters.notice),
                render: radios(
                  "Notice period",
                  filters.notice,
                  [
                    { value: "", label: "Any notice period" },
                    ...NOTICE_BANDS.map(({ value, label }) => ({
                      value,
                      label,
                    })),
                  ],
                  (notice) => onFilter({ notice })
                ),
              }
            : null

  const chosen = controls.headerFilters[id] ?? filter

  return (
    <DataTableColumnHeader
      title={id === "applied" ? arrivedColumn : labelOf(id)}
      align={NUMERIC_COLUMNS.includes(id) ? "end" : "start"}
      sorted={sorted}
      onSort={(desc) => controls.onSort(id, desc)}
      filter={chosen?.render}
      filtered={chosen?.filtered}
      onHide={
        TABLE_COLUMNS.find((column) => column.id === id)?.hideable
          ? () => onVisibility({ ...visibility, [id]: false })
          : undefined
      }
    />
  )
}

function SelectAllHead() {
  return <SelectAll people={useApplicantTable().everyone} compact />
}

/**
 * Who they are and where they are now, as one cell: the role is how a
 * recruiter tells two names apart, and as its own column it was the widest
 * thing on the table. The photo is here as on the cards, and New is the
 * avatar's dot, not a badge — the other statuses keep their badges, because
 * those are decisions and a dot cannot say which one.
 */
function CandidateCell({ applicant }: { applicant: Applicant }) {
  const { onOpenProfile } = useApplicantTable()

  return (
    <div className="flex items-center gap-3">
      <ApplicantAvatar
        name={applicant.name}
        photo={applicant.photo}
        fresh={isNew(applicant)}
        className="size-9"
      />
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          {/* The row's click is mouse-only, so the name is the same action as
              a real button — the keyboard and screen-reader way in. */}
          <button
            type="button"
            onClick={() => onOpenProfile(applicant.id)}
            className="rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {applicant.name}
          </button>
          {isNew(applicant) ? (
            <span className="sr-only">New</span>
          ) : (
            <ApplicantStatusBadge status={applicant.status} />
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {applicant.title} at {applicant.company}
        </span>
      </div>
    </div>
  )
}

/**
 * Only the matches, unlike the card's skills bucket: the column is here to
 * answer "do they have what the job needs".
 */
function MatchedCell({ applicant }: { applicant: Applicant }) {
  const { requiredSkills } = useApplicantTable()
  return (
    <MatchedSkills
      skills={applicant.skills.filter((skill) =>
        requiredSkills.includes(skill)
      )}
    />
  )
}

function ActionsCell({ applicant }: { applicant: Applicant }) {
  const { onDecide } = useApplicantTable()
  return (
    <RowActions
      applicant={applicant}
      onDecide={onDecide}
      className="justify-end"
    />
  )
}

const TABLE_COLUMN_DEFS = columnHelper.columns([
  columnHelper.display({
    id: "select",
    header: () => <SelectAllHead />,
    cell: ({ row }) => <PickBox applicant={row.original} />,
  }),
  columnHelper.accessor((applicant) => applicant.name, {
    id: "candidate",
    enableHiding: false,
    header: () => <ColumnHead id="candidate" />,
    cell: ({ row }) => <CandidateCell applicant={row.original} />,
  }),
  // Sorted upstream by count; the accessor only makes the column sortable.
  columnHelper.accessor((applicant) => applicant.skills.length, {
    id: "matched",
    header: () => <ColumnHead id="matched" />,
    cell: ({ row }) => <MatchedCell applicant={row.original} />,
  }),
  columnHelper.accessor((applicant) => applicant.location, {
    id: "location",
    header: () => <ColumnHead id="location" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.location}</span>
    ),
  }),
  columnHelper.accessor((applicant) => applicant.experienceYears, {
    id: "experience",
    header: () => <ColumnHead id="experience" />,
    cell: ({ row }) => row.original.experienceYears,
  }),
  columnHelper.accessor((applicant) => applicant.currentCtcLakh, {
    id: "pay",
    header: () => <ColumnHead id="pay" />,
    cell: ({ row }) => `₹${row.original.currentCtcLakh}L`,
  }),
  columnHelper.accessor((applicant) => applicant.noticeDays, {
    id: "notice",
    header: () => <ColumnHead id="notice" />,
    cell: ({ row }) =>
      row.original.noticeDays === 0 ? (
        <span className="text-muted-foreground">Now</span>
      ) : (
        `${row.original.noticeDays}d`
      ),
  }),
  columnHelper.accessor((applicant) => applicant.appliedDaysAgo, {
    id: "applied",
    header: () => <ColumnHead id="applied" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.appliedAgo}</span>
    ),
  }),
  columnHelper.accessor((applicant) => applicant.match, {
    id: "match",
    header: () => <ColumnHead id="match" />,
    cell: ({ row }) => `${row.original.match}%`,
  }),
  columnHelper.accessor((applicant) => applicant.education.school, {
    id: "education",
    header: () => <ColumnHead id="education" />,
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span>{row.original.education.school}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.education.degree}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor((applicant) => applicant.status, {
    id: "status",
    header: () => <ColumnHead id="status" />,
    cell: ({ row }) => <ApplicantStatusBadge status={row.original.status} />,
  }),
  columnHelper.display({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <ActionsCell applicant={row.original} />,
  }),
])

/**
 * The same applicants, one to a line.
 *
 * THE COLUMNS ARE THE CARD'S FACTS, IN THE CARD'S ORDER, so switching view
 * moves the information around rather than changing what there is to know.
 * Name and current role share the first cell, stacked as they are on the card,
 * rather than taking a column each. The
 * skills are the one thing that does not come across: three badges per row is
 * the widest column on the table and the least comparable thing on it, and a
 * table earns its keep by being scannable down a column.
 *
 * Numbers are right-aligned and tabular so experience, pay and notice actually
 * line up — that alignment is the entire reason to be in this view.
 *
 * It scrolls sideways inside its own card rather than widening the page; `Table`
 * brings its own `overflow-x-auto` container.
 */
export function ApplicantTable({
  sections,
  everyone,
  requiredSkills,
  onDecide,
  onOpenProfile,
  controls,
}: {
  sections: ListRun[]
  /** The whole tab, not the page of it on screen — what "select all" ticks. */
  everyone: Applicant[]
  requiredSkills: string[]
  onDecide: (id: string, status: ApplicantStatus) => void
  onOpenProfile: (id: string) => void
  controls: TableControls
}) {
  const { visibility } = controls

  // A click anywhere on a row opens the profile, except on the things in it
  // that do something else. Two traps: React bubbles events out of PORTALS
  // along the component tree, so a click inside a dialog or menu opened from
  // the row's actions would reach this handler too — the `contains` check
  // drops those, because a portal is not inside the row in the DOM. And a
  // drag to copy a name ends in a click; leaving that alone is the difference
  // between a table you can read and one that fights you.
  const onRowClick = (event: React.MouseEvent<HTMLElement>, id: string) => {
    const target = event.target as Element
    if (!event.currentTarget.contains(target)) return
    if (target.closest("button, a, input, [role=menuitem], [data-row-actions]"))
      return
    if (window.getSelection()?.toString()) return
    onOpenProfile(id)
  }

  /**
   * TANSTACK OWNS THE COLUMNS, NOT THE ROWS. The list arrives already filtered
   * and sorted by `CandidateList`, because the cards, the split view, the tab
   * counts, Athena and the New/Earlier runs all read that same order — a table
   * that sorted its own copy would disagree with the tab it sits in. So the
   * table is `manualSorting`, its sort state is read back off the URL only to
   * draw the header arrows, and the rows are drawn by section below.
   */
  const parsed = parseSort(controls.sort)
  const sorting = parsed ? [{ id: parsed.column, desc: parsed.desc }] : []

  const rows = React.useMemo(
    () => sections.flatMap((section) => section.rows),
    [sections]
  )

  const table = useTable({
    features: tableFeaturesUsed,
    columns: TABLE_COLUMN_DEFS,
    data: rows,
    getRowId: (applicant) => applicant.id,
    manualSorting: true,
    state: { sorting, columnVisibility: visibility },
  })

  const rowsById = new Map(table.getRowModel().rows.map((row) => [row.id, row]))
  const span = table.getVisibleLeafColumns().length

  /** Per-column cell classes: numbers right-aligned, the edges tight. */
  const cellClass = (id: string, head = false) =>
    cn(
      id === "select" && "w-10 pr-0",
      id === "matched" && !head && "min-w-40 whitespace-normal",
      ["experience", "pay", "match"].includes(id) &&
        !head &&
        "text-right font-medium tabular-nums",
      id === "notice" && !head && "text-right tabular-nums",
      ["experience", "pay", "notice", "match"].includes(id) &&
        head &&
        "text-right",
      // Pinned: the decision buttons are the point of the row, and on a table
      // this wide they were the first thing to scroll out of sight. The cell
      // carries the row's own background so the columns pass underneath.
      id === "actions" && "sticky right-0 border-l border-border bg-card",
      id === "actions" &&
        !head &&
        "cursor-default py-1 group-hover/row:bg-muted/50"
    )

  const context = {
    controls,
    everyone,
    requiredSkills,
    onDecide,
    onOpenProfile,
  }

  return (
    <ApplicantTableContext.Provider value={context}>
      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((head) => (
                  <TableHead
                    key={head.id}
                    className={cellClass(head.column.id, true)}
                  >
                    {head.isPlaceholder ? null : (
                      <table.FlexRender header={head} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {sections.map((section) => (
              <React.Fragment key={section.key}>
                {/* A run's heading is a row of its own spanning the table, so
                  New and Earlier stay one table with one set of columns
                  rather than two tables that line up by coincidence. */}
                {section.heading && (
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell
                      colSpan={span}
                      className="py-2 whitespace-normal"
                    >
                      {section.heading}
                    </TableCell>
                  </TableRow>
                )}
                {section.rows.map((applicant) => {
                  const row = rowsById.get(applicant.id)
                  if (!row) return null
                  return (
                    <TableRow
                      key={applicant.id}
                      className="group/row cursor-pointer"
                      onClick={(event) => onRowClick(event, applicant.id)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          data-row-actions={
                            cell.column.id === "select" ||
                            cell.column.id === "actions"
                              ? true
                              : undefined
                          }
                          className={cellClass(cell.column.id)}
                        >
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </ApplicantTableContext.Provider>
  )
}

/** A header filter's options, one of which is always picked ("Any …"). */
function HeaderRadios({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const name = React.useId()

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        Filter by {label.toLowerCase()}
      </span>
      <RadioGroup
        aria-label={label}
        className="max-h-56 gap-2 overflow-y-auto p-px"
        value={value}
        onValueChange={(next) => onChange(String(next))}
      >
        {options.map((option) => {
          const id = `${name}-${option.value || "any"}`
          return (
            <div key={id} className="flex items-center gap-2">
              <RadioGroupItem id={id} value={option.value} />
              <Label htmlFor={id} className="text-sm font-normal">
                {option.label}
              </Label>
            </div>
          )
        })}
      </RadioGroup>
    </div>
  )
}
