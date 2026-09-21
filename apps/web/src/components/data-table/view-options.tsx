import { Columns3Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { useListCopy } from "@/lib/list-source"
import { TABLE_COLUMNS, type ColumnVisibility } from "@/lib/table-columns"

/**
 * The Columns menu — shadcn's `DataTableViewOptions`, reading the column list
 * from `TABLE_COLUMNS` rather than a table instance, because it sits in the
 * tab row and every tab renders its own table.
 */
export function DataTableViewOptions({
  visibility,
  onChange,
}: {
  visibility: ColumnVisibility
  onChange: (next: ColumnVisibility) => void
}) {
  const { arrivedColumn } = useListCopy()
  const hideable = TABLE_COLUMNS.filter((column) => column.hideable)
  const atDefault = hideable.every(
    (column) => visibility[column.id] === column.defaultVisible
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            <Columns3Icon data-icon="inline-start" />
            Columns
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-48">
        {/* The label INSIDE a group — Base UI's GroupLabel throws outside one. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show columns</DropdownMenuLabel>
          {hideable.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={visibility[column.id]}
              closeOnClick={false}
              onCheckedChange={(checked) =>
                onChange({ ...visibility, [column.id]: checked })
              }
            >
              {column.id === "applied" ? arrivedColumn : column.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={atDefault}
          onClick={() =>
            onChange(
              Object.fromEntries(
                TABLE_COLUMNS.map((column) => [
                  column.id,
                  column.defaultVisible,
                ])
              )
            )
          }
        >
          Reset columns
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
