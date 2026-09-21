import type { SortColumn } from "@/lib/applicants"

/**
 * The response manager table's columns, as data: what each is called, whether
 * it can be hidden, and whether it shows until somebody hides it.
 *
 * Kept apart from the column definitions in `candidate-list.tsx` because the
 * Columns menu sits in the tab row, outside the table (one per tab), and has to
 * list the columns without a table instance to ask.
 *
 * VISIBILITY IS IN THE URL, like everything else on this screen worth showing
 * somebody: `?cols=` lists the columns switched ON that are off by default,
 * `?hidecols=` the ones switched OFF that are on by default. At the default
 * both are absent, so the plain URL stays plain. Not `hide`: Search Resume
 * already spends that on "Hide viewed profiles".
 */
export type TableColumnId = "select" | SortColumn | "actions"

export const TABLE_COLUMNS: {
  id: TableColumnId
  label: string
  hideable: boolean
  defaultVisible: boolean
}[] = [
  { id: "select", label: "Select", hideable: false, defaultVisible: true },
  {
    id: "candidate",
    label: "Candidate",
    hideable: false,
    defaultVisible: true,
  },
  {
    id: "matched",
    label: "Matched skills",
    hideable: true,
    defaultVisible: true,
  },
  { id: "location", label: "Location", hideable: true, defaultVisible: true },
  { id: "experience", label: "Exp", hideable: true, defaultVisible: true },
  { id: "pay", label: "Current", hideable: true, defaultVisible: true },
  { id: "notice", label: "Notice", hideable: true, defaultVisible: true },
  { id: "applied", label: "Applied", hideable: true, defaultVisible: true },
  { id: "match", label: "Match", hideable: true, defaultVisible: false },
  {
    id: "education",
    label: "Education",
    hideable: true,
    defaultVisible: false,
  },
  { id: "status", label: "Status", hideable: true, defaultVisible: false },
  { id: "actions", label: "Actions", hideable: false, defaultVisible: true },
]

export type ColumnVisibility = Record<string, boolean>

const list = (value: string | null) => (value ?? "").split(",").filter(Boolean)

export function visibilityFrom(params: URLSearchParams): ColumnVisibility {
  const on = list(params.get("cols"))
  const off = list(params.get("hidecols"))
  return Object.fromEntries(
    TABLE_COLUMNS.map((column) => [
      column.id,
      !column.hideable
        ? true
        : column.defaultVisible
          ? !off.includes(column.id)
          : on.includes(column.id),
    ])
  )
}

/** `cols` and `hidecols` for a visibility, null where they would be empty. */
export function visibilityParams(visibility: ColumnVisibility) {
  const on: string[] = []
  const off: string[] = []
  for (const column of TABLE_COLUMNS) {
    if (!column.hideable) continue
    const visible = visibility[column.id] ?? column.defaultVisible
    if (visible && !column.defaultVisible) on.push(column.id)
    if (!visible && column.defaultVisible) off.push(column.id)
  }
  return {
    cols: on.length ? on.join(",") : null,
    hidecols: off.length ? off.join(",") : null,
  }
}
