import * as React from "react"
import { Link, useSearchParams } from "react-router"
import type { LucideIcon } from "lucide-react"
import {
  BriefcaseIcon,
  DatabaseIcon,
  ListPlusIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import { cn } from "@workspace/ui/lib/utils"

import { CandidateList } from "@/components/candidate-list"
import {
  ChoiceSelect,
  SortSelect,
  type FilterUpdate,
} from "@/components/database-filters"
import { NewListDialog } from "@/components/save-to-list"
import { useSavedLists } from "@/components/saved-lists-provider"
import {
  SAVED_FROM,
  type SavedCandidate,
  type SavedFromKind,
  type SavedList,
} from "@/lib/lists"

const FROM_ICONS: Record<SavedFromKind, LucideIcon> = {
  job: BriefcaseIcon,
  search: DatabaseIcon,
}

const ALL: SavedList = {
  id: "",
  name: "All saved",
  description:
    "Everybody you have saved, once each, whichever lists they are in.",
}

/**
 * My Lists — the recruiter's personal database of people they kept, from
 * Jobs and Search Resume. See `lib/lists.ts` for the model.
 *
 * THE LISTS ARE A COLUMN, THE PEOPLE ARE RESULTS. The column is where the
 * Search Resume filters sit, because picking a list is narrowing the same pool
 * — not moving to another page. The people are `CandidateList` laid out as
 * results: a pool you read and search, not a queue to clear, so no decision
 * tabs.
 *
 * `?list=` is the list (absent is All saved), `?from=` where they were saved
 * from, `?find=` the search within. The pile itself is `SavedListsProvider`'s,
 * so somebody saved from a posting or a search a moment ago is at the top, and
 * the card's own save menu re-files them — untick their last list and they
 * leave. Lists made here, or from a save menu, last the session.
 */
export function ListsPage() {
  const [params, setParams] = useSearchParams()
  const { lists, saved, createList } = useSavedLists()

  const list = lists.find((option) => option.id === params.get("list")) ?? ALL
  const from = params.get("from") ?? ""

  const inList = React.useMemo(
    () =>
      list.id
        ? saved.filter((person) => person.lists.includes(list.id))
        : saved,
    [saved, list.id]
  )
  const people = React.useMemo(
    () =>
      from ? inList.filter((person) => person.from.kind === from) : inList,
    [inList, from]
  )
  const byId = React.useMemo(
    () => new Map(saved.map((person) => [person.id, person])),
    [saved]
  )

  const update: FilterUpdate = (key, value) => {
    const next = new URLSearchParams(params)
    next.delete(key)
    if (Array.isArray(value)) value.forEach((item) => next.append(key, item))
    else if (value) next.set(key, value)
    setParams(next, { replace: true })
  }

  const counts = (id: string) =>
    id
      ? saved.filter((person) => person.lists.includes(id)).length
      : saved.length

  const create = (name: string) => update("list", createList(name))

  return (
    <CandidateList
      source="saved"
      people={people}
      requiredSkills={[]}
      searchKey="find"
      layout="results"
      // Their own, kept from when they were saved — what an interview booked
      // from here is recorded against.
      candidateSource={(applicant) => byId.get(applicant.id)!.from}
      sidebar={
        <ListsColumn
          lists={lists}
          active={list.id}
          count={counts}
          onPick={(id) => update("list", id || null)}
          onCreate={create}
        />
      }
      toolbar={
        <ListsToolbar
          lists={lists}
          active={list.id}
          params={params}
          onUpdate={update}
        />
      }
      header={<ListHeader list={list} total={inList.length} />}
      empty={null}
      annotate={(applicant) => {
        const person = byId.get(applicant.id)
        return person ? (
          <SavedNote person={person} lists={lists} current={list.id} />
        ) : null
      }}
    />
  )
}

function ListHeader({ list, total }: { list: SavedList; total: number }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-heading text-lg font-medium">{list.name}</h2>
      <Meta>
        <MetaItem className="tabular-nums">
          {total} {total === 1 ? "candidate" : "candidates"}
        </MetaItem>
        <MetaItem>{list.description}</MetaItem>
      </Meta>
    </div>
  )
}

/**
 * The lists, beside the people. A column from `@4xl/main` up, sticky like the
 * Search Resume filters; below that it is hidden and the toolbar's select
 * picks the list instead.
 */
function ListsColumn({
  lists,
  active,
  count,
  onPick,
  onCreate,
}: {
  lists: SavedList[]
  active: string
  count: (id: string) => number
  onPick: (id: string) => void
  onCreate: (name: string) => void
}) {
  return (
    <aside
      aria-label="Your lists"
      className="hidden shrink-0 flex-col rounded-2xl bg-card ring-1 ring-foreground/10 @4xl/main:sticky @4xl/main:top-4 @4xl/main:flex @4xl/main:max-h-[calc(100svh-var(--header-height)---spacing(8))] @4xl/main:w-64 @4xl/main:overflow-y-auto"
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h2 className="text-sm font-medium">Your lists</h2>
        <NewListButton onCreate={onCreate} />
      </div>

      <nav className="flex flex-col gap-0.5 border-t border-border p-2">
        {[ALL, ...lists].map((list, index) => (
          <React.Fragment key={list.id || "all"}>
            {/* All saved is the pool; the lists are views onto it. */}
            {index === 1 && (
              <div className="mx-2 my-1.5 border-t border-border" />
            )}
            <button
              type="button"
              aria-current={list.id === active ? "page" : undefined}
              onClick={() => onPick(list.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                list.id === active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {index === 0 && <UsersIcon className="size-4 shrink-0" />}
              <span className="min-w-0 flex-1 truncate">{list.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {count(list.id)}
              </span>
            </button>
          </React.Fragment>
        ))}
      </nav>
    </aside>
  )
}

function NewListButton({ onCreate }: { onCreate: (name: string) => void }) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="-mr-2 h-7"
        onClick={() => setOpen(true)}
      >
        <ListPlusIcon data-icon="inline-start" />
        New list
      </Button>
      <NewListDialog open={open} onOpenChange={setOpen} onCreate={onCreate} />
    </>
  )
}

/**
 * Search within, where they were saved from, and sort. The list select only
 * shows below `@4xl/main`, where the column is hidden.
 */
function ListsToolbar({
  lists,
  active,
  params,
  onUpdate,
}: {
  lists: SavedList[]
  active: string
  params: URLSearchParams
  onUpdate: FilterUpdate
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="@4xl/main:hidden">
        <ChoiceSelect
          label="List"
          anyLabel={ALL.name}
          value={active}
          options={lists.map((list) => ({ value: list.id, label: list.name }))}
          onChange={(value) => onUpdate("list", value || null)}
          className="w-48"
        />
      </div>

      <InputGroup className="h-8 max-w-sm min-w-48 flex-1">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          value={params.get("find") ?? ""}
          onChange={(event) => onUpdate("find", event.target.value || null)}
          placeholder="Search your lists"
          aria-label="Search your lists"
        />
      </InputGroup>

      <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground" aria-hidden>
            Saved from
          </span>
          <ChoiceSelect
            label="Saved from"
            anyLabel="Anywhere"
            value={params.get("from") ?? ""}
            options={SAVED_FROM}
            onChange={(value) => onUpdate("from", value || null)}
            className="w-40"
          />
        </div>
        <SortSelect params={params} onUpdate={onUpdate} defaultSort="recent" />
      </div>
    </div>
  )
}

/**
 * The last block on a saved person's card: where they came from, as a link
 * back to it, which other lists they are in, and the recruiter's note.
 */
function SavedNote({
  person,
  lists,
  current,
}: {
  person: SavedCandidate
  lists: SavedList[]
  current: string
}) {
  const Icon = FROM_ICONS[person.from.kind]
  // The list you are looking at goes without saying.
  const others = lists.filter(
    (list) => list.id !== current && person.lists.includes(list.id)
  )

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-muted-foreground">Saved from</span>
        <Link
          to={person.from.href}
          className="min-w-0 truncate font-medium underline-offset-4 hover:underline"
        >
          {person.from.label}
        </Link>
        {others.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 @lg/card:ml-auto">
            <span className="text-xs text-muted-foreground">
              {current ? "Also in" : "In"}
            </span>
            {others.map((list) => (
              <Badge
                key={list.id}
                variant="outline"
                className="font-normal"
                render={<Link to={`?list=${list.id}`} />}
              >
                {list.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {person.note && (
        <p className="text-muted-foreground">
          <span className="sr-only">Your note: </span>“{person.note}”
        </p>
      )}
    </div>
  )
}
