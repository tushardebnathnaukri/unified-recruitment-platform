import * as React from "react"
import type { LucideIcon } from "lucide-react"
import {
  CalendarPlusIcon,
  CheckIcon,
  BookmarkIcon,
  ListPlusIcon,
  DownloadIcon,
  EllipsisIcon,
  MailIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Item } from "@workspace/ui/components/item"
import { Label } from "@workspace/ui/components/label"
import { useMessages } from "@/components/messages-provider"
import { NewListDialog } from "@/components/save-to-list"
import { useSavedLists } from "@/components/saved-lists-provider"
import { firstMessageTo } from "@/lib/messages"
import { BulkScheduleDialog } from "@/components/schedule-interview"
import { CandidateSourceContext } from "@/lib/candidate-source"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import type { Applicant, ApplicantStatus } from "@/lib/applicants"
import { PickingContext } from "@/components/candidate-list/shared"

/**
 * Ticking people, and the bar that comes up once any are ticked.
 *
 * The tick itself is a context in `shared.ts`. A card is four layers below the
 * list and a table cell deeper still, and neither takes a prop for it.
 */

/** How many people a comparison holds: three columns is what the pane fits. */
const COMPARE_MAX = 3

/**
 * Centred on what is left of the window once Athena has her column, not on the
 * window. Centred on the window, the bars ran under the message dock's
 * launcher, which moves aside for her and lands at the content's right edge.
 * Above `md` only, where she is a column rather than a cover.
 */
const BAR_BESIDE_ATHENA = "md:left-[calc((100vw-var(--athena-width))/2)]"

const BULK_DECISIONS: {
  value: Extract<ApplicantStatus, "shortlisted" | "rejected">
  label: string
  icon: LucideIcon
}[] = [
  { value: "rejected", label: "Reject", icon: XIcon },
  { value: "shortlisted", label: "Shortlist", icon: CheckIcon },
]

/** Ghost controls on the dark pill, where the system's ghost would vanish. */
const ON_BAR =
  "rounded-full text-background hover:bg-background/15 hover:text-background aria-expanded:bg-background/15 aria-expanded:text-background dark:hover:bg-background/15"

/**
 * What to do with the ticked people.
 *
 * DECISIONS AND ATHENA ON THE BAR, THE REST BEHIND ⋯. The two decisions are
 * the card's own no / yes, in the same order and icons, because they
 * are what a recruiter ticks a dozen people to do. Athena is the other thing
 * worth a button — and only for one to three people, the most a comparison
 * holds; past that she steps off the bar rather than sitting there disabled.
 * Save, message and download are occasional, and a pill that carries all of
 * them is too wide to sit beside Athena's pane.
 *
 * The bottom lane is its own: toasts sit above it (`app-toaster.tsx`), because
 * a toast is about the last thing you did and this is about what you are
 * about to do.
 */
export function SelectionBar({
  beside,
  picked,
  onAsk,
  onDecide,
  onClear,
}: {
  /** Athena is open, so centre on the content rather than the window. */
  beside: boolean
  picked: Applicant[]
  onAsk: () => void
  onDecide: (status: ApplicantStatus) => void
  onClear: () => void
}) {
  return (
    <div
      role="region"
      aria-label="Selected candidates"
      className={cn(
        "fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full bg-foreground py-1.5 pr-1.5 pl-4 text-sm whitespace-nowrap text-background shadow-lg",
        beside && BAR_BESIDE_ATHENA
      )}
    >
      <span className="mr-1 tabular-nums">{picked.length} selected</span>

      {BULK_DECISIONS.map((decision) => (
        <Tooltip key={decision.value}>
          <TooltipTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`${decision.label} ${picked.length}`}
                className={ON_BAR}
                onClick={() => onDecide(decision.value)}
              />
            }
          >
            <decision.icon />
          </TooltipTrigger>
          <TooltipContent>{decision.label}</TooltipContent>
        </Tooltip>
      ))}

      <BulkMore picked={picked} onDone={onClear} />

      {picked.length <= COMPARE_MAX && (
        <Button size="sm" className="ml-1 rounded-full" onClick={onAsk}>
          <SparklesIcon data-icon="inline-start" />
          {picked.length === 1 ? "Ask Athena" : "Compare in Athena"}
        </Button>
      )}

      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Clear selection"
        className={ON_BAR}
        onClick={onClear}
      >
        <XIcon />
      </Button>
    </div>
  )
}

/**
 * The bar's occasional actions. SAVE FILES, IT DOES NOT TOGGLE: the card's
 * menu ticks and unticks one person's lists, but a dozen people are in a dozen
 * different lists already, so picking a list here adds everybody to it and
 * takes nobody out of anything. MESSAGE WRITES DRAFTS, one per thread, and
 * opens the dock on them — the same promise Athena's drafts make, that nothing
 * goes until the recruiter sends it.
 *
 * The new-list dialog sits outside the menu, which unmounts when it closes.
 */
function BulkMore({
  picked,
  onDone,
}: {
  picked: Applicant[]
  onDone: () => void
}) {
  const { lists, listsOf, setLists, createList } = useSavedLists()
  const { fillDrafts } = useMessages()
  const sourceFor = React.useContext(CandidateSourceContext)
  const [naming, setNaming] = React.useState(false)
  const [scheduling, setScheduling] = React.useState(false)
  // Held while the dialog is open: the selection is cleared on save, and the
  // dialog must still know who it is filing.
  const [filing, setFiling] = React.useState<Applicant[]>([])

  const fileAll = (people: Applicant[], listId: string) => {
    for (const person of people) {
      const current = listsOf(person.id)
      if (!current.includes(listId))
        setLists(person, [...current, listId], sourceFor?.(person))
    }
    onDone()
  }

  const messageAll = () => {
    fillDrafts(
      picked.map((person) => {
        const source = sourceFor?.(person)
        return {
          to: {
            id: person.id,
            name: person.name,
            role: source?.label ?? person.title,
            photo: person.photo,
          },
          body: firstMessageTo(person.name, source),
        }
      })
    )
    onDone()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="More actions for the selected"
              className={ON_BAR}
            />
          }
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="center" className="min-w-56">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <BookmarkIcon />
              Save to list
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
              {/* The label inside the group: Base UI's GroupLabel throws
                  outside one (see CLAUDE.md). */}
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  Add {picked.length}{" "}
                  {picked.length === 1 ? "person" : "people"} to
                </DropdownMenuLabel>
                {lists.map((list) => (
                  <DropdownMenuItem
                    key={list.id}
                    onClick={() => fileAll(picked, list.id)}
                  >
                    <span className="truncate">{list.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setFiling(picked)
                  setNaming(true)
                }}
              >
                <ListPlusIcon />
                New list…
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem onClick={() => setScheduling(true)}>
            <CalendarPlusIcon />
            Set up{" "}
            {picked.length === 1 ? "interview" : `${picked.length} interviews`}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={messageAll}>
            <MailIcon />
            Message {picked.length}
          </DropdownMenuItem>

          {/* A no-op, like the card's own: there are no CVs to download. */}
          <DropdownMenuItem>
            <DownloadIcon />
            Download {picked.length === 1 ? "CV" : `${picked.length} CVs`}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Outside the menu, like the list dialog. The selection is kept while
          it is open and cleared only if invites went out — cancelling leaves
          the ticks where they were. */}
      <BulkScheduleDialog
        people={picked}
        open={scheduling}
        onClose={(booked) => {
          setScheduling(false)
          if (booked) onDone()
        }}
      />

      <NewListDialog
        open={naming}
        onOpenChange={setNaming}
        description={`Name it by what it is for. The ${filing.length} selected go straight in.`}
        onCreate={(name) => fileAll(filing, createList(name))}
      />
    </>
  )
}

/**
 * Ticks everybody in the tab — ALL OF IT, NOT THE PAGE ON SCREEN, and it says
 * the number so that is not a surprise. Half-ticked when some are. `compact` is
 * the table's header cell, where the column is the label.
 */
export function SelectAll({
  people,
  compact = false,
}: {
  people: Applicant[]
  compact?: boolean
}) {
  const picking = React.useContext(PickingContext)
  if (!picking || people.length === 0) return null

  const ids = people.map((person) => person.id)
  const count = ids.filter((id) => picking.isPicked(id)).length
  const every = count === ids.length
  const label = every ? "Clear selection" : `Select all ${ids.length}`

  const box = (
    <Checkbox
      checked={every}
      indeterminate={count > 0 && !every}
      onCheckedChange={() => picking.setMany(ids, !every)}
      aria-label={label}
    />
  )

  if (compact) return box

  // THE CARDS' OWN SHAPE — `Item` with the applicant card's fill, ring and
  // `px-5` — so the box lines up with the tick on every card below it and the
  // row reads as the head of the stack rather than a stray label above it.
  return (
    <Item className="bg-card px-5 py-3 ring-1 ring-foreground/10">
      <Label className="flex w-fit items-center gap-2 text-sm font-normal text-muted-foreground">
        {box}
        {label}
      </Label>
    </Item>
  )
}

/** A card's or row's tick. Absent outside a list that can pick. */
export function PickBox({
  applicant,
  className,
}: {
  applicant: Applicant
  className?: string
}) {
  const picking = React.useContext(PickingContext)
  if (!picking) return null

  return (
    <Checkbox
      checked={picking.isPicked(applicant.id)}
      onCheckedChange={() => picking.toggle(applicant.id)}
      aria-label={`Select ${applicant.name}`}
      className={className}
    />
  )
}
