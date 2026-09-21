import * as React from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  EyeOffIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"

/**
 * A sortable, filterable, hideable column heading — shadcn's
 * `DataTableColumnHeader`, as a POPOVER rather than its dropdown menu. A
 * header filter is a text box or a set of radios, and neither belongs in a
 * menu: typing in a menu fights its type-ahead, and Base UI's menu group parts
 * throw outside their groups.
 *
 * It takes the sort as values rather than a TanStack `Column`, because the
 * sort lives in the URL and the list is ordered upstream of the table — see
 * `ApplicantTable`.
 */
export function DataTableColumnHeader({
  title,
  align = "start",
  sorted,
  onSort,
  filter,
  filtered = false,
  onHide,
}: {
  title: string
  align?: "start" | "end"
  sorted: false | "asc" | "desc"
  /** `null` clears the sort back to the list's default. */
  onSort: (desc: boolean | null) => void
  /** The filter's controls. Given `close` so picking a radio can shut it. */
  filter?: (close: () => void) => React.ReactNode
  filtered?: boolean
  /** Absent for columns that cannot be hidden. */
  onHide?: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const close = () => setOpen(false)
  const SortIcon =
    sorted === "asc"
      ? ArrowUpIcon
      : sorted === "desc"
        ? ArrowDownIcon
        : ChevronsUpDownIcon

  return (
    <div className={cn("flex", align === "end" && "justify-end")}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "-mx-2 h-8 gap-1 px-2 font-medium text-muted-foreground data-popup-open:bg-accent",
                (sorted || filtered) && "text-foreground"
              )}
            >
              {title}
              {filtered && (
                <span
                  aria-label="Filtered"
                  className="size-1.5 rounded-full bg-primary"
                />
              )}
              <SortIcon className={cn("size-3.5!", !sorted && "opacity-50")} />
            </Button>
          }
        />
        <PopoverContent
          align={align === "end" ? "end" : "start"}
          className="w-60 gap-1 p-1"
        >
          <HeaderAction
            icon={ArrowUpIcon}
            active={sorted === "asc"}
            onClick={() => {
              onSort(false)
              close()
            }}
          >
            Sort ascending
          </HeaderAction>
          <HeaderAction
            icon={ArrowDownIcon}
            active={sorted === "desc"}
            onClick={() => {
              onSort(true)
              close()
            }}
          >
            Sort descending
          </HeaderAction>
          {sorted && (
            <HeaderAction
              icon={XIcon}
              onClick={() => {
                onSort(null)
                close()
              }}
            >
              Clear sort
            </HeaderAction>
          )}

          {filter && (
            <>
              <Separator className="my-1" />
              <div className="px-2 py-1.5">{filter(close)}</div>
            </>
          )}

          {onHide && (
            <>
              <Separator className="my-1" />
              <HeaderAction
                icon={EyeOffIcon}
                onClick={() => {
                  onHide()
                  close()
                }}
              >
                Hide column
              </HeaderAction>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function HeaderAction({
  icon: Icon,
  active = false,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent",
        active && "font-medium text-primary"
      )}
    >
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </button>
  )
}
