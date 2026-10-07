import * as React from "react"
import { Link, useLocation } from "react-router"
import { Questionnaire } from "@shadcn/react/questionnaire"
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClipboardListIcon,
  GripVerticalIcon,
  PencilIcon,
  PlusIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Kbd } from "@workspace/ui/components/kbd"
import { cn } from "@workspace/ui/lib/utils"

import { encodeRanked, withChat, type AskedItem } from "@/lib/job-intake"
import { DOCKED_CARD } from "@/lib/docked"
import { encodeAnswers, type Answers } from "@/lib/job-refine"

/**
 * The agent's questions, docked where the chat box was — the way Claude asks.
 *
 * IT TAKES THE COMPOSER'S PLACE, NOT A PLACE IN THE TRANSCRIPT. While there
 * are questions to answer, answering them IS the next thing to type, so the
 * card sits at the bottom of the screen where the box was, and the transcript
 * above keeps only what the agent said. Close (×) hands the box back — typed
 * text is then read against the same open questions — and the page offers the
 * card again.
 *
 * BUILT ON THE UNSTYLED PRIMITIVE, NOT THE STYLED COMPONENT. The styled
 * `Questionnaire` in `packages/ui` draws bordered pills and an action bar;
 * this layout is a question and its pager on one line, numbered rows with
 * rules between them, and "Something else" with Skip as the last row. Every
 * behaviour — progress, validation, skip, focus, native radios and checkboxes
 * — is still `@shadcn/react/questionnaire`'s; only the markup is ours.
 *
 * ONE ANSWER MOVES ON BY ITSELF. Picking a single-answer row with the pointer
 * or its number goes straight to the next question (and on the last one,
 * submits), because a second click to say "yes, that one" is a click nobody
 * needs. Arrow keys only move between rows — native radios select as they
 * move, so advancing on every change would jump away from a row you were
 * passing through; Enter confirms. A several-answer question has a Next.
 *
 * NUMBERS, NOT LETTERS, FOR THE SHORTCUTS. A bare A opens Athena and D
 * switches theme; letters on the rows would fight both. 1–9 fight nothing.
 *
 * WHAT IT SENDS IS A TURN. Submit writes the answers into one prompt
 * (`encodeAnswers`), so the transcript is still the URL, and the recruiter's
 * bubble shows them as a list. A skipped question is sent as `null`.
 */
export function AgentQuestionnaire({
  items,
  submit,
  form,
  postNow,
  postNowLabel = "Skip these, post it now",
  onAsk,
  onClose,
  aside,
  encode = encodeAnswers,
  frame = "docked",
  footer,
  step,
}: {
  items: AskedItem[]
  submit: string
  form?: { label: string; to: string }
  postNow?: string
  /** What the skip-all says — a search finds people rather than posting. */
  postNowLabel?: string
  onAsk: (prompt: string) => void
  onClose: () => void
  /** Under the card, on the right — who read the last answer. */
  aside?: React.ReactNode
  /** The turn a submit sends: answers by default, a change from the rail. */
  encode?: (answers: Answers) => string
  /**
   * `docked` is the card in the composer's place. `page` is the same
   * questions drawn as the page itself — no card chrome, no close, a larger
   * prompt — for the one-question-at-a-time flow ("Chat alt").
   */
  frame?: "docked" | "page"
  /**
   * Drawn at the left of the page frame's action row — the wizard's Cancel
   * while an answer is being changed.
   */
  footer?: React.ReactNode
  /**
   * The posting step these questions belong to, called out over each
   * question — "Step 2/4 · Candidate details" (Chat v2.7), so the card says
   * where in the posting it is, and how many steps there are, as well as
   * which question it is.
   */
  step?: { number: number; total: number; label: string }
}) {
  const page = frame === "page"
  // Each item's status, so the page frame's Next is disabled until there is
  // an answer to move on with — pressed empty it would send a skip.
  const [status, setStatus] = React.useState<Record<string, string>>({})
  const root = React.useRef<HTMLFormElement>(null)
  // The form link carries this chat's address, so the form can come back.
  const { pathname, search } = useLocation()
  // A single question needs no pager, and "1 of 1" is only noise. Nor does a
  // card with nothing optional offer Esc to skip.
  const paged = items.length > 1
  const skippable = items.some((item) => !item.required)

  // The collection the primitive wants for its progress, order and shortcuts.
  const definitions = React.useMemo(
    () =>
      items.map((item) => ({
        name: item.id,
        required: item.required,
        choices: item.options.map((value) => ({ value })),
      })),
    [items]
  )
  const byId = React.useMemo(
    () => new Map(items.map((item) => [item.id as string, item])),
    [items]
  )

  /**
   * A NEW CARD TAKES FOCUS — BUT ONLY IF NOTHING HAS IT. When the previous
   * card is submitted, or the opener is sent from the chat box, whatever had
   * focus unmounts and focus falls to the body; without this the 1–9
   * shortcuts are dead until somebody clicks in.
   */
  React.useEffect(() => {
    const active = document.activeElement
    // An EMPTY reply box counts as nothing: the recruiter just sent from it,
    // and the questions are what they came back to answer.
    const idle =
      !active ||
      active === document.body ||
      (active instanceof HTMLTextAreaElement && active.value === "")
    if (!idle) return
    root.current
      ?.querySelector<HTMLElement>("fieldset[data-active] input")
      ?.focus({ preventScroll: true })
  }, [])

  /** The active item, and the one button that moves it on (Next, or Submit). */
  const activeItem = () =>
    root.current?.querySelector<HTMLFieldSetElement>("fieldset[data-active]")
  const press = (role: "advance" | "skip") => {
    const fieldset = activeItem()
    const button = fieldset?.querySelector<HTMLButtonElement>(
      `[data-role=${role}]:not([data-hidden]):not([hidden])`
    )
    button?.click()
  }

  // Set when the next change to a single-answer item came from a pointer or a
  // number key — the two gestures that mean "this one" rather than "passing".
  const advanceOnChange = React.useRef(false)
  const isSingle = () => {
    const name = activeItem()?.dataset.name
    const item = name ? byId.get(name) : undefined
    return Boolean(item && !item.multiple)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const answers: Answers = {}
    for (const item of items) {
      const values = data
        .getAll(item.id)
        .map((value) => String(value).trim())
        .filter(Boolean)
      if (!values.length) {
        answers[item.id] = null
        continue
      }
      if (item.multiple) {
        answers[item.id] = values.join(item.separator ?? ", ")
        continue
      }
      // Typed text beats a picked row: typing is the more deliberate act.
      const typed = values.find((value) => !item.options.includes(value))
      answers[item.id] = typed ?? values[0]
    }
    onAsk(encode(answers))
  }

  return (
    <div className="flex flex-col gap-2">
      <Questionnaire.Root
        ref={root}
        items={definitions}
        shortcuts="numbers"
        onSubmit={handleSubmit}
        onKeyDown={(event) => {
          // Esc skips, as the hint under the card says. A required question
          // has no Skip, so nothing happens — the only way past it is an answer.
          if (event.key === "Escape") {
            event.preventDefault()
            press("skip")
            return
          }
          if (/^[1-9]$/.test(event.key) && isSingle()) {
            advanceOnChange.current = true
          }
        }}
        className={frame === "page" ? "flex flex-col" : DOCKED_CARD}
      >
        {items.map((item) => {
          // IN THE PAGE FRAME THE WAY FORWARD IS ALWAYS VISIBLE: a Next (or
          // Save) in a row of its own under the choices, beside Skip and
          // whatever the caller puts on the left, disabled until the question
          // has an answer. A single answer still advances on its own when
          // picked; the button is for anyone who looks for one — and on a
          // phone, where a row that moves on by itself reads as a jump.
          const answered = status[item.id] === "answered"
          const actions = (
            <>
              <Questionnaire.Skip
                data-role="skip"
                className="h-8 shrink-0 rounded-full border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted data-hidden:hidden"
              >
                Skip
              </Questionnaire.Skip>
              {/* Kept in the DOM for every item — a single answer advances by
                    clicking this — but only shown where it has to be pressed. */}
              <Questionnaire.Next
                data-role="advance"
                disabled={page && !answered}
                className={cn(
                  "h-8 shrink-0 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-40 data-hidden:hidden",
                  !item.multiple && !page && "hidden"
                )}
              >
                Next
              </Questionnaire.Next>
              <Questionnaire.Submit
                data-role="advance"
                disabled={page && !answered}
                className={cn(
                  "h-8 shrink-0 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-40 data-hidden:hidden",
                  !item.multiple && !page && "hidden"
                )}
              >
                {submit}
              </Questionnaire.Submit>
            </>
          )
          // The docked card keeps the actions in its "Something else" row;
          // the page puts them in a row of their own.
          const inRow = page ? null : actions
          return (
            <Questionnaire.Item
              key={item.id}
              name={item.id}
              data-name={item.id}
              required={item.required}
              multiple={item.multiple}
              onStatusChange={(next) =>
                setStatus((current) =>
                  current[item.id] === next
                    ? current
                    : { ...current, [item.id]: next }
                )
              }
              className="flex min-w-0 flex-col outline-none"
            >
              {/* The question on the left, where it moves on the right. */}
              <div
                className={cn(
                  "flex items-start gap-3 pb-2",
                  frame === "page" ? "px-2 pt-0" : "px-5 pt-4"
                )}
              >
                <div className="min-w-0 flex-1">
                  {step ? (
                    <p className="mb-1 text-xs font-medium text-primary">
                      Step {step.number}/{step.total} · {step.label}
                    </p>
                  ) : null}
                  <Questionnaire.Title
                    className={cn(
                      "font-semibold text-balance",
                      frame === "page" ? "text-xl leading-7" : "text-base"
                    )}
                  >
                    {item.prompt}
                  </Questionnaire.Title>
                  <Questionnaire.Description
                    className={cn(
                      "mt-0.5 text-muted-foreground",
                      frame === "page" ? "text-sm leading-5" : "text-xs"
                    )}
                  >
                    {item.note ? (
                      <span className="text-destructive">{item.note} </span>
                    ) : null}
                    {item.hint}
                    {item.multiple && item.options.length
                      ? " Pick as many as apply."
                      : null}
                  </Questionnaire.Description>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
                  {paged ? (
                    <>
                      <Questionnaire.Previous
                        aria-label="Previous question"
                        className="grid size-7 place-items-center rounded-full transition-colors hover:bg-muted hover:text-foreground data-hidden:invisible"
                      >
                        <ChevronLeftIcon className="size-4" />
                      </Questionnaire.Previous>
                      <Questionnaire.Progress
                        render={(props, state) => (
                          <span
                            {...props}
                            className="min-w-12 text-center text-xs tabular-nums"
                          >
                            {state.current} of {state.total}
                          </span>
                        )}
                      />
                      <Questionnaire.Next
                        aria-label="Next question"
                        className="grid size-7 place-items-center rounded-full transition-colors hover:bg-muted hover:text-foreground data-hidden:invisible"
                      >
                        <ChevronRightIcon className="size-4" />
                      </Questionnaire.Next>
                    </>
                  ) : null}
                  {frame === "page" ? null : (
                    <button
                      type="button"
                      aria-label="Close the questions"
                      onClick={onClose}
                      className="ml-1 grid size-7 place-items-center rounded-full transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <XIcon className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {item.rank ? (
                <RankedSkills item={item} rank={item.rank} actions={inRow} />
              ) : (
                <>
                  <Questionnaire.Choices
                    className={cn(
                      "flex flex-col overflow-y-auto",
                      // ON THE PAGE EACH OPTION IS A CARD — bordered, with air
                      // between — because the page has the room and a row
                      // with a hairline under it reads as a list to scan
                      // rather than a thing to choose. The docked card keeps
                      // its rows; it has neither.
                      page ? "gap-2 px-2" : "max-h-[32svh] px-3"
                    )}
                  >
                    {item.options.map((option) => (
                      <Questionnaire.Choice
                        key={option}
                        value={option}
                        defaultChecked={item.current?.includes(option)}
                        onPointerDown={() => {
                          if (!item.multiple) advanceOnChange.current = true
                        }}
                        onChange={() => {
                          if (item.multiple || !advanceOnChange.current) return
                          advanceOnChange.current = false
                          // A beat, so the tick is seen before the question changes.
                          window.setTimeout(() => press("advance"), 140)
                        }}
                        className={cn(
                          // `relative`: the native input is `sr-only`, which is
                          // absolutely positioned and must resolve inside the row.
                          "group/choice relative flex cursor-pointer items-center gap-3 text-sm transition-colors",
                          page
                            ? "rounded-2xl border bg-background px-3 py-3 hover:border-foreground/20 hover:bg-muted/40 has-[input:focus-visible]:border-foreground/20 data-checked:border-primary data-checked:bg-primary/5 data-checked:ring-1 data-checked:ring-primary"
                            : "rounded-xl border-b px-2 py-2.5 last-of-type:border-b-0 hover:bg-muted/60 has-[input:focus-visible]:bg-muted/60 data-checked:bg-primary/5",
                          "data-disabled:pointer-events-none data-disabled:opacity-50"
                        )}
                      >
                        <Questionnaire.ChoiceInput className="sr-only" />
                        <Questionnaire.ChoiceShortcut className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-medium tabular-nums transition-colors group-data-checked/choice:bg-primary group-data-checked/choice:text-primary-foreground" />
                        <Questionnaire.ChoiceLabel className="min-w-0 flex-1">
                          {option}
                        </Questionnaire.ChoiceLabel>
                      </Questionnaire.Choice>
                    ))}
                  </Questionnaire.Choices>

                  {/* Something else, and the ways on: Skip for any optional
                  question, Next for one that takes several answers. The input
                  lives in Choices so the primitive names it with the item. */}
                  <div
                    className={cn(
                      "m-2 flex items-center gap-2 rounded-2xl p-1.5",
                      page ? "border bg-background" : "mt-1 bg-muted/60"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground",
                        page ? "bg-muted" : "bg-background"
                      )}
                    >
                      <PencilIcon className="size-3.5" />
                    </span>
                    <Questionnaire.Choices className="min-w-0 flex-1">
                      <Questionnaire.Input
                        aria-label={`Something else: ${item.prompt}`}
                        placeholder={
                          item.options.length ? "Something else" : "Your answer"
                        }
                        // Asked again to change it: an answer that was typed
                        // the first time is here to be edited, not retyped.
                        defaultValue={
                          item.current
                            ?.filter((value) => !item.options.includes(value))
                            .join(", ") || undefined
                        }
                        className="h-8 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </Questionnaire.Choices>
                    {inRow}
                  </div>
                </>
              )}
              {page ? (
                <div className="mt-2 flex items-center gap-2 px-2">
                  {footer}
                  <span className="ml-auto flex items-center gap-2">
                    {actions}
                  </span>
                </div>
              ) : null}
              <Questionnaire.Error className="px-5 pb-3 text-xs text-destructive" />
            </Questionnaire.Item>
          )
        })}
      </Questionnaire.Root>

      {/* Under the card: the ways out on the left, how to drive it on the
          right. The keys are hidden on a phone, where there are none — and
          on the page frame, where the row of buttons above already says how
          to move on. */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-xs text-muted-foreground",
          page && !postNow && !form && !aside && "hidden"
        )}
      >
        {postNow ? (
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0 text-xs"
            onClick={() => onAsk(postNow)}
          >
            <ArrowRightIcon data-icon="inline-start" />
            {postNowLabel}
          </Button>
        ) : null}
        {form ? (
          <Button
            nativeButton={false}
            variant="link"
            size="sm"
            className="h-auto px-0 text-xs"
            render={<Link to={withChat(form.to, pathname + search)} />}
          >
            <ClipboardListIcon data-icon="inline-start" />
            {form.label}
          </Button>
        ) : null}
        {aside}
        <span
          className={cn(
            "ml-auto hidden items-center gap-3",
            !page && "sm:flex"
          )}
        >
          <span>
            <Kbd>1</Kbd>–<Kbd>9</Kbd> to choose
          </span>
          <span>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> to move
          </span>
          <span>
            <Kbd>Enter</Kbd> to confirm
          </span>
          {skippable ? (
            <span>
              <Kbd>Esc</Kbd> to skip
            </span>
          ) : null}
        </span>
      </div>
    </div>
  )
}

/** The line between must-haves and good-to-haves, as an entry in the list. */
const LINE = "\u0000line"

/** Something always sits above the line — see `readRanked`. */
function settle(list: string[]) {
  if (list[0] !== LINE || list.length < 2) return list
  return [list[1], LINE, ...list.slice(2)]
}

/**
 * The skills as a ranking: must-haves above the line, good-to-haves below,
 * in the order they matter. ONE LIST WITH THE LINE IN IT, so moving a skill
 * past the line is the same gesture as moving it past another skill — drag
 * it, or its arrows — and the line can be dragged too.
 *
 * THE ANSWER GOES THROUGH THE PRIMITIVE AS ONE HIDDEN VALUE (`encodeRanked`),
 * so answered, skipped and submitted behave exactly as for every other item;
 * only drawing the list is ours. Arrows beside the grip because a drag is a
 * pointer gesture and touch has no HTML drag and drop.
 */
function RankedSkills({
  item,
  rank,
  actions,
}: {
  item: AskedItem
  rank: { must: string[]; nice: string[] }
  actions: React.ReactNode
}) {
  const [list, setList] = React.useState(() =>
    settle([...rank.must, LINE, ...rank.nice])
  )
  const [adding, setAdding] = React.useState("")
  const [dragging, setDragging] = React.useState<string | null>(null)

  const line = list.indexOf(LINE)
  const must = list.slice(0, line)
  const nice = list.slice(line + 1)
  const value = must.length ? encodeRanked(must, nice) : ""

  const moved = (from: number, to: number) => {
    const next = [...list]
    const [entry] = next.splice(from, 1)
    next.splice(to, 0, entry)
    return settle(next)
  }
  const canMove = (from: number, to: number) =>
    to >= 0 && to < list.length && moved(from, to).join() !== list.join()
  const move = (from: number, to: number) => {
    if (canMove(from, to)) setList(moved(from, to))
  }
  const remove = (skill: string) =>
    setList(settle(list.filter((entry) => entry !== skill)))
  // Typed skills join the must-haves, at the bottom: typing one is a
  // deliberate act, and it is one drag from wherever it belongs.
  const add = () => {
    const known = list.map((entry) => entry.toLowerCase())
    const skills = [
      ...new Set(
        adding
          .split(/[,;]/)
          .map((part) => part.trim())
          .filter(Boolean)
      ),
    ].filter((skill) => !known.includes(skill.toLowerCase()))
    setAdding("")
    if (!skills.length) return
    const next = [...list]
    next.splice(next.indexOf(LINE), 0, ...skills)
    setList(settle(next))
  }

  const icon =
    "grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"

  return (
    <>
      {/* The answer, as the primitive sees it. Empty means unanswered. */}
      <Questionnaire.Input
        value={value}
        readOnly
        tabIndex={-1}
        aria-hidden
        className="sr-only"
      />
      <ol
        aria-label={`${item.prompt} Ranked, most important first.`}
        className="relative flex max-h-[32svh] flex-col overflow-y-auto px-3"
      >
        <li className="px-2 pb-1 text-xs font-medium text-muted-foreground">
          Must have
          <span className="font-normal"> — decides who is shortlisted</span>
        </li>
        {must.length ? null : (
          <li className="px-2 py-2 text-sm text-muted-foreground">
            No skills yet — add the ones that matter below.
          </li>
        )}
        {list.map((entry, index) => {
          const drag = {
            draggable: true,
            onDragStart: (event: React.DragEvent) => {
              event.dataTransfer.effectAllowed = "move"
              setDragging(entry)
            },
            // Reordered as it passes over, so the list shows where it lands.
            onDragOver: (event: React.DragEvent) => {
              if (dragging === null) return
              event.preventDefault()
              if (dragging !== entry) move(list.indexOf(dragging), index)
            },
            onDragEnd: () => setDragging(null),
          }

          if (entry === LINE)
            return (
              <li
                key={entry}
                {...drag}
                aria-label="Good to have below this line"
                className={cn(
                  "flex cursor-grab items-center gap-2 px-2 pt-3 pb-1 text-xs font-medium text-muted-foreground active:cursor-grabbing",
                  dragging === LINE && "text-primary"
                )}
              >
                <span className="shrink-0">
                  Good to have
                  <span className="font-normal"> — only ranks them</span>
                </span>
                <span className="h-px flex-1 bg-border" />
                {nice.length ? null : (
                  <span className="shrink-0 font-normal">
                    Drag a skill here
                  </span>
                )}
              </li>
            )

          const place = index < line ? index + 1 : index
          return (
            <li
              key={entry}
              {...drag}
              className={cn(
                "group/row relative flex cursor-grab items-center gap-2 rounded-xl border-b py-1.5 pr-1 pl-1 text-sm transition-colors last:border-b-0 hover:bg-muted/60 active:cursor-grabbing",
                list[index + 1] === LINE && "border-b-0",
                dragging === entry && "bg-muted/60 opacity-60"
              )}
            >
              <GripVerticalIcon className="size-4 shrink-0 text-muted-foreground" />
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-lg text-xs font-medium tabular-nums",
                  index < line
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {place}
              </span>
              <span className="min-w-0 flex-1 truncate">{entry}</span>
              <button
                type="button"
                aria-label={`Move ${entry} up`}
                disabled={!canMove(index, index - 1)}
                onClick={() => move(index, index - 1)}
                className={icon}
              >
                <ChevronUpIcon className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Move ${entry} down`}
                disabled={!canMove(index, index + 1)}
                onClick={() => move(index, index + 1)}
                className={icon}
              >
                <ChevronDownIcon className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Remove ${entry}`}
                onClick={() => remove(entry)}
                className={icon}
              >
                <XIcon className="size-4" />
              </button>
            </li>
          )
        })}
      </ol>

      <div className="m-2 mt-1 flex items-center gap-2 rounded-2xl bg-muted/60 p-1.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground">
          <PlusIcon className="size-3.5" />
        </span>
        <input
          value={adding}
          onChange={(event) => setAdding(event.target.value)}
          // Enter adds, rather than moving the card on: the primitive leaves
          // an event it did not ask for alone once it is prevented.
          onKeyDown={(event) => {
            if (event.key !== "Enter" || !adding.trim()) return
            event.preventDefault()
            add()
          }}
          // Typed and not added is still meant: Next takes it too.
          onBlur={add}
          aria-label={`Add a skill: ${item.prompt}`}
          placeholder="Add a skill"
          className="h-8 w-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {actions}
      </div>
    </>
  )
}
