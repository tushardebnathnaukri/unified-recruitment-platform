import * as React from "react"
import { Link } from "react-router"
import { Questionnaire } from "@shadcn/react/questionnaire"
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  PencilIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Kbd } from "@workspace/ui/components/kbd"
import { cn } from "@workspace/ui/lib/utils"

import type { AskedItem } from "@/lib/job-intake"
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
  onAsk,
  onClose,
  aside,
}: {
  items: AskedItem[]
  submit: string
  form?: { label: string; to: string }
  postNow?: string
  onAsk: (prompt: string) => void
  onClose: () => void
  /** Under the card, on the right — who read the last answer. */
  aside?: React.ReactNode
}) {
  const root = React.useRef<HTMLFormElement>(null)
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
        answers[item.id] = values.join(", ")
        continue
      }
      // Typed text beats a picked row: typing is the more deliberate act.
      const typed = values.find((value) => !item.options.includes(value))
      answers[item.id] = typed ?? values[0]
    }
    onAsk(encodeAnswers(answers))
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
        className="relative overflow-hidden rounded-3xl border bg-background shadow-lg"
      >
        {items.map((item) => (
          <Questionnaire.Item
            key={item.id}
            name={item.id}
            data-name={item.id}
            required={item.required}
            multiple={item.multiple}
            className="flex min-w-0 flex-col outline-none"
          >
            {/* The question on the left, where it moves on the right. */}
            <div className="flex items-start gap-3 px-5 pt-4 pb-2">
              <div className="min-w-0 flex-1">
                <Questionnaire.Title className="text-base font-semibold text-balance">
                  {item.prompt}
                </Questionnaire.Title>
                <Questionnaire.Description className="mt-0.5 text-xs text-muted-foreground">
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
                <button
                  type="button"
                  aria-label="Close the questions"
                  onClick={onClose}
                  className="ml-1 grid size-7 place-items-center rounded-full transition-colors hover:bg-muted hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            </div>

            <Questionnaire.Choices className="flex max-h-[32svh] flex-col overflow-y-auto px-3">
              {item.options.map((option) => (
                <Questionnaire.Choice
                  key={option}
                  value={option}
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
                    "group/choice relative flex cursor-pointer items-center gap-3 rounded-xl border-b px-2 py-2.5 text-sm transition-colors last-of-type:border-b-0",
                    "hover:bg-muted/60 has-[input:focus-visible]:bg-muted/60 data-checked:bg-primary/5",
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
            <div className="m-2 mt-1 flex items-center gap-2 rounded-2xl bg-muted/60 p-1.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground">
                <PencilIcon className="size-3.5" />
              </span>
              <Questionnaire.Choices className="min-w-0 flex-1">
                <Questionnaire.Input
                  aria-label={`Something else: ${item.prompt}`}
                  placeholder={
                    item.options.length ? "Something else" : "Your answer"
                  }
                  className="h-8 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </Questionnaire.Choices>
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
                className={cn(
                  "h-8 shrink-0 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80 data-hidden:hidden",
                  !item.multiple && "hidden"
                )}
              >
                Next
              </Questionnaire.Next>
              <Questionnaire.Submit
                data-role="advance"
                className={cn(
                  "h-8 shrink-0 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80 data-hidden:hidden",
                  !item.multiple && "hidden"
                )}
              >
                {submit}
              </Questionnaire.Submit>
            </div>
            <Questionnaire.Error className="px-5 pb-3 text-xs text-destructive" />
          </Questionnaire.Item>
        ))}
      </Questionnaire.Root>

      {/* Under the card: the ways out on the left, how to drive it on the
          right. The keys are hidden on a phone, where there are none. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-xs text-muted-foreground">
        {postNow ? (
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0 text-xs"
            onClick={() => onAsk(postNow)}
          >
            <ArrowRightIcon data-icon="inline-start" />
            Skip these, post it now
          </Button>
        ) : null}
        {form ? (
          <Button
            nativeButton={false}
            variant="link"
            size="sm"
            className="h-auto px-0 text-xs"
            render={<Link to={form.to} />}
          >
            <ClipboardListIcon data-icon="inline-start" />
            {form.label}
          </Button>
        ) : null}
        {aside}
        <span className="ml-auto hidden items-center gap-3 sm:flex">
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
