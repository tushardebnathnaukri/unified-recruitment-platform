import * as React from "react"
import { BookmarkIcon, ListPlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
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
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import { useSavedLists } from "@/components/saved-lists-provider"
import type { Applicant } from "@/lib/applicants"
import { CandidateSourceContext } from "@/lib/candidate-source"

/**
 * Save a person to My Lists: a menu of the lists, ticked where they already
 * are, and "New list…" at the bottom.
 *
 * TICKING IS FILING, UNTICKING THE LAST ONE IS UNSAVING. There is no separate
 * "Save" then "choose a list" step — saving means choosing a list, so the menu
 * is the whole action and stays open while you tick several.
 *
 * `button` is the card's labelled button, which reads "Saved" once they are;
 * `icon` is the profile panel's round one, filled once they are.
 */
export function SaveToList({
  applicant,
  variant = "button",
}: {
  applicant: Applicant
  variant?: "button" | "icon"
}) {
  const { lists, listsOf, setLists, createList } = useSavedLists()
  const savedFrom = React.useContext(CandidateSourceContext)
  const [naming, setNaming] = React.useState(false)

  const current = listsOf(applicant.id)
  const saved = current.length > 0
  const from = savedFrom?.(applicant)

  const toggle = (id: string, on: boolean) =>
    setLists(
      applicant,
      on ? [...current, id] : current.filter((list) => list !== id),
      from
    )

  const label = saved
    ? `Saved to ${current.length} ${current.length === 1 ? "list" : "lists"}`
    : "Save to list"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            variant === "icon" ? (
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-full"
                aria-label={label}
                title={label}
              />
            ) : (
              <Button variant="outline" size="sm" aria-label={label} />
            )
          }
        >
          <BookmarkIcon
            data-icon={variant === "button" ? "inline-start" : undefined}
            className={cn(saved && "fill-current text-primary")}
          />
          {variant === "button" && (saved ? "Saved" : "Save")}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72">
          {/* The label inside the group: Base UI's GroupLabel throws outside
              one (see CLAUDE.md). */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Save {applicant.name} to</DropdownMenuLabel>
            {lists.map((list) => (
              <DropdownMenuCheckboxItem
                key={list.id}
                checked={current.includes(list.id)}
                onCheckedChange={(on) => toggle(list.id, on)}
                closeOnClick={false}
              >
                <span className="truncate">{list.name}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setNaming(true)}>
            <ListPlusIcon />
            New list…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewListDialog
        open={naming}
        onOpenChange={setNaming}
        description={`Name it by what it is for. ${applicant.name} goes straight in.`}
        onCreate={(name) =>
          setLists(applicant, [...current, createList(name)], from)
        }
      />
    </>
  )
}

/** Names a new list. Shared by the save menu and My Lists' own button. */
export function NewListDialog({
  open,
  onOpenChange,
  onCreate,
  description = "Name it by what it is for — the role, the reason, or when to come back to them.",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => void
  description?: string
}) {
  const [name, setName] = React.useState("")

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onCreate(name.trim())
    setName("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New list</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Silver medalists — Q4"
            aria-label="List name"
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={!name.trim()}>
              Create list
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
