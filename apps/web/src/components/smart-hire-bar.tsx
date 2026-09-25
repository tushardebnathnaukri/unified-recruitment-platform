import * as React from "react"
import { ArrowRightIcon, MicIcon, PaperclipIcon, XIcon } from "lucide-react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { toast } from "@workspace/ui/components/toast"
import { cn } from "@workspace/ui/lib/utils"

import {
  exactMatch,
  readBack,
  suggest,
  INTENTS,
  type SmartHireIntent,
  type SmartChip,
  type Suggestion,
  type SuggestionKind,
} from "@/lib/smart-hire"

/**
 * The Smart Hire bar: one description, and a search or a job post out of it.
 *
 * IT IS A `contenteditable`, NOT A TEXTAREA, and it has to be. A textarea can
 * hold characters and nothing else — it cannot paint grey ghost text after the
 * caret and it cannot hold a chip, and both of those are the point of this box.
 * Base UI's Autocomplete does have an inline mode, but it works by rewriting
 * the input's own value from the highlighted list item and accepting on Enter,
 * which is a different interaction from a suffix you take with Tab.
 *
 * THE DOM OWNS THE CONTENT, NOT REACT. Nothing inside the editor is rendered
 * from state: the chips and the ghost are real nodes put there imperatively,
 * and `snapshot` is read back out on every input for the things drawn AROUND
 * the box. Render the content from state instead and React replaces the nodes
 * under the caret on every keystroke, which is how contenteditable boxes end
 * up typing backwards.
 *
 * `contentEditable="true"` IS SPELT OUT ON PURPOSE. The global `d` (theme) and
 * `a` (Athena) keypresses skip anything inside `[contenteditable='true']` —
 * they test for that literal string, so `plaintext-only` would leave a
 * recruiter flipping to dark mode halfway through the word "dashboard".
 *
 * ONE COMPONENT, TWO SIZES. `hero` is the Smart Hire page, `compact` is the
 * Dashboard's quick way into the same thing. Two boxes that looked alike and
 * behaved differently would be the worst of both.
 */

export type SmartHireDraft = {
  text: string
  chips: SmartChip[]
  /** Set when the draft is submitted; absent while it is being read back. */
  intent?: SmartHireIntent
}

type SmartHireBarProps = {
  /**
   * `hero` is the Smart Hire page, `compact` the Dashboard's quick way in, and
   * `composer` the requirement chat — the same box, minus the furniture that
   * only makes sense when the box IS the page. A chat already says what it
   * understood in its own transcript, so the tray and the proposals would be
   * the conversation repeated underneath itself.
   */
  size?: "hero" | "compact" | "composer"
  placeholder?: string
  /** Text the box opens with — the Dashboard hands its draft over this way. */
  defaultValue?: string
  /** Which way the switcher starts. Posting, unless something says otherwise. */
  defaultIntent?: SmartHireIntent
  /** Left out, the arrow is drawn but parked. */
  onSubmit?: (draft: SmartHireDraft) => void
  /** Said on the parked arrow, so it reads as unfinished rather than broken. */
  submitHint?: string
  className?: string
}

const DEFAULT_PLACEHOLDER =
  "Describe who you're hiring for — seniority, location, and what they need to have actually done."

/* -------------------------------------------------------------------------
   The editor's DOM. Plain functions over nodes, kept out of the component so
   the React half stays readable.
   ------------------------------------------------------------------------- */

const isChip = (node: Node | null | undefined): node is HTMLElement =>
  node instanceof HTMLElement && node.dataset.chip !== undefined

function chipNode(
  kind: SuggestionKind,
  value: string,
  label: string,
  inData = true
) {
  const el = document.createElement("span")
  el.dataset.chip = kind
  // Marked on the node so it survives being read back out of the DOM. The
  // inline chip is drawn the same either way — the sentence stays a sentence —
  // and the tray is where it is said.
  if (!inData) el.dataset.thin = ""
  // The chip READS as the short name and CARRIES the canonical one, so the
  // sentence stays a sentence and the filter still gets the value the refine
  // panel knows.
  el.dataset.value = value
  el.contentEditable = "false"
  // Sized in `em` so one chip component works in both the hero and the compact
  // bar, and `align-baseline` so a chip sits on the line of the sentence
  // rather than pushing it open.
  el.className =
    "mx-0.5 inline-flex items-center rounded-4xl bg-secondary px-2 py-0.5 align-baseline text-[0.9em] font-medium text-secondary-foreground"
  el.textContent = label
  return el
}

/** Everything typed, with the chips reading as their own words. */
function readEditor(editor: HTMLElement): SmartHireDraft {
  let text = ""
  const chips: SmartChip[] = []

  for (const node of Array.from(editor.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? ""
      continue
    }
    if (!(node instanceof HTMLElement)) continue
    if (node.dataset.ghost !== undefined) continue

    if (isChip(node)) {
      const label = node.textContent ?? ""
      chips.push({
        kind: node.dataset.chip as SuggestionKind,
        value: node.dataset.value ?? label,
        label,
        inData: node.dataset.thin === undefined,
      })
    }
    text += node.tagName === "BR" ? "\n" : (node.textContent ?? "")
  }

  // The space after a chip is a non-breaking one so it cannot collapse away;
  // everything reading this text wants an ordinary one.
  return { text: text.replace(/\u00a0/g, " "), chips }
}

/**
 * Is there nothing but the ghost between the caret and the end? Ghost text
 * only makes sense as a continuation, so a caret in the middle of the sentence
 * gets no suggestion at all.
 */
function caretAtEnd(editor: HTMLElement) {
  const selection = window.getSelection()
  if (!selection?.isCollapsed || !selection.rangeCount) return false

  const caret = selection.getRangeAt(0)
  if (!editor.contains(caret.endContainer)) return false

  const rest = document.createRange()
  rest.setStart(caret.endContainer, caret.endOffset)
  rest.setEnd(editor, editor.childNodes.length)

  const ghost = editor.querySelector("[data-ghost]")?.textContent ?? ""
  const after = rest.cloneContents().textContent ?? ""
  return after.replace(ghost, "").trim() === ""
}

function syncGhost(editor: HTMLElement, completion: string) {
  let ghost = editor.querySelector<HTMLElement>("[data-ghost]")

  if (!completion) {
    ghost?.remove()
    return
  }

  if (!ghost) {
    ghost = document.createElement("span")
    ghost.dataset.ghost = ""
    ghost.contentEditable = "false"
    // The screen reader hears the suggestion from the live region below, said
    // once and in words; the ghost itself would only read as stray letters.
    ghost.setAttribute("aria-hidden", "true")
    ghost.className = "pointer-events-none select-none text-muted-foreground/60"
  }

  if (ghost !== editor.lastChild) editor.append(ghost)
  if (ghost.textContent !== completion) ghost.textContent = completion
}

/** Take `count` characters back off the end, stopping at a chip. */
function deleteFromEnd(editor: HTMLElement, count: number) {
  let left = count

  while (left > 0) {
    const node = editor.lastChild
    if (!node || node.nodeType !== Node.TEXT_NODE) return

    const text = node.textContent ?? ""
    if (text.length <= left) {
      left -= text.length
      node.remove()
    } else {
      node.textContent = text.slice(0, text.length - left)
      left = 0
    }
  }
}

function placeCaretAtEnd(editor: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(editor)
  range.collapse(false)

  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

/** The chip the caret is sitting directly behind, if any. */
function chipBeforeCaret(editor: HTMLElement) {
  const selection = window.getSelection()
  if (!selection?.isCollapsed || !selection.rangeCount) return null

  const { startContainer, startOffset } = selection.getRangeAt(0)
  if (!editor.contains(startContainer)) return null

  const previous =
    startContainer.nodeType === Node.TEXT_NODE
      ? startOffset === 0
        ? startContainer.previousSibling
        : null
      : startContainer.childNodes[startOffset - 1]

  return isChip(previous) ? previous : null
}

/* ------------------------------------------------------------------------- */

export function SmartHireBar({
  size = "hero",
  placeholder = DEFAULT_PLACEHOLDER,
  defaultValue,
  defaultIntent = "post",
  onSubmit,
  submitHint,
  className,
}: SmartHireBarProps) {
  const { brand } = useBrand()
  const editorRef = React.useRef<HTMLDivElement>(null)

  const [draft, setDraft] = React.useState<SmartHireDraft>({
    text: "",
    chips: [],
  })
  // What Tab would take. A ref as well as state because the keydown handler
  // needs it synchronously, and state because the live region reads it.
  const suggestionRef = React.useRef<Suggestion | null>(null)
  const [announcement, setAnnouncement] = React.useState("")
  // Escape turns the ghost off until the next keystroke, rather than for good.
  const dismissed = React.useRef(false)
  const composing = React.useRef(false)

  const [intent, setIntent] = React.useState<SmartHireIntent>(defaultIntent)
  const [attached, setAttached] = React.useState<string | null>(null)
  const [listening, setListening] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const text = draft.text.trim()

  /** Read the box back, then decide what the ghost should say. */
  const refresh = React.useCallback(() => {
    const editor = editorRef.current
    if (!editor) return

    const next = readEditor(editor)
    setDraft(next)

    const live =
      dismissed.current || composing.current || !caretAtEnd(editor)
        ? null
        : suggest(next.text, brand)

    suggestionRef.current = live
    syncGhost(editor, live?.completion ?? "")
    setAnnouncement(live ? `${live.label}. Press Tab to accept.` : "")
  }, [brand])

  /**
   * Whatever the box opens with, put in once. Not a controlled value: the DOM
   * owns the content from here, and writing `defaultValue` back in on every
   * render would fight the caret for it.
   */
  const seeded = React.useRef(false)
  React.useEffect(() => {
    const editor = editorRef.current
    if (seeded.current || !editor || !defaultValue) return
    seeded.current = true

    // Read back as prose AND chips, not as flat text. A URL can only carry
    // characters, so a city chipped on the Dashboard would otherwise arrive
    // here as a word again — the recruiter's confirmation thrown away by the
    // hand-off that was meant to save them the typing.
    editor.append(
      ...readBack(defaultValue, brand).map((part) =>
        "chip" in part
          ? chipNode(
              part.chip.kind,
              part.chip.value,
              part.chip.label,
              part.chip.inData ?? true
            )
          : document.createTextNode(part.text)
      )
    )
    refresh()
  }, [defaultValue, brand, refresh])

  /** Turn a suggestion into a chip, and carry on typing after it. */
  const accept = React.useCallback(
    (live: Suggestion) => {
      const editor = editorRef.current
      if (!editor) return

      editor.querySelector("[data-ghost]")?.remove()
      deleteFromEnd(editor, live.typed.length)
      editor.append(
        chipNode(live.kind, live.value, live.label, live.inData),
        document.createTextNode("\u00a0")
      )
      placeCaretAtEnd(editor)
      editor.focus()
      refresh()
    },
    [refresh]
  )

  const submit = () => {
    if (text && onSubmit) onSubmit({ ...draft, intent })
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // FINISHING A KNOWN THING MAKES IT A CHIP, without Tab. Typing
    // "Product Manager in Indore" straight through used to leave both as
    // plain words, while pasting the same sentence in from the Dashboard
    // arrived with both as chips — the same text understood two different
    // ways depending on how it got there. The space is swallowed because the
    // chip brings its own.
    if (event.key === " ") {
      // Read the EDITOR, not the snapshot. `draft` is state set from an input
      // event, so on a fast keystroke it can still be a character behind —
      // and this runs on the keypress that finishes the word.
      const editor = editorRef.current
      const done = editor ? exactMatch(readEditor(editor).text, brand) : null
      if (done) {
        event.preventDefault()
        accept(done)
        return
      }
    }

    if (event.key === "Tab" && suggestionRef.current) {
      event.preventDefault()
      accept(suggestionRef.current)
      return
    }

    if (event.key === "Escape" && suggestionRef.current) {
      event.preventDefault()
      dismissed.current = true
      refresh()
      return
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      submit()
      return
    }

    // A chip is one thing, so it comes off in one press rather than letter by
    // letter — the same way the combobox chips behave in the filter rail.
    if (event.key === "Backspace") {
      const chip = chipBeforeCaret(editorRef.current!)
      if (chip) {
        event.preventDefault()
        chip.remove()
        refresh()
      }
    }
  }

  const hero = size === "hero"
  // The switcher and the attachment strip belong to the standalone box; the
  // chat's composer has a transcript doing both jobs.
  const chrome = size !== "composer"
  const showTray = chrome && Boolean(attached)

  return (
    <div
      className={cn(
        "shadow-lg transition-[border-radius]",
        showTray ? "rounded-[1.75rem] bg-muted p-1" : "rounded-2xl",
        className
      )}
    >
      <Card
        className={cn(
          "gap-3 shadow-none",
          hero ? "p-5" : size === "composer" ? "p-3" : "p-4"
        )}
      >
        {/* WHAT THE ARROW WILL DO, decided BEFORE the sentence is written
          rather than found under it afterwards — the choice changes what you
          would type, so it reads first. Hidden in the chat's composer, where
          the question was settled on the way in. */}
        {chrome ? (
          <Tabs
            value={intent}
            onValueChange={(next) => setIntent(next as SmartHireIntent)}
            className="self-start"
          >
            <TabsList aria-label="What to do with this description">
              {INTENTS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}

        <div className="relative">
          {/* contenteditable has no placeholder, and the `:empty::before`
              trick stops working the moment the browser leaves a stray <br>
              behind. A sibling is simply true. */}
          {!draft.text && !draft.chips.length ? (
            <p
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 text-muted-foreground",
                hero ? "text-base" : "text-sm"
              )}
            >
              {placeholder}
            </p>
          ) : null}

          <div
            ref={editorRef}
            role="combobox"
            // Off the announcement rather than the ref: a ref read during
            // render is a stale value, and this is the one place the live
            // suggestion has to be state anyway.
            aria-expanded={Boolean(announcement)}
            aria-autocomplete="inline"
            aria-label="Describe the role you are hiring for"
            contentEditable="true"
            suppressContentEditableWarning
            spellCheck={false}
            onInput={() => {
              dismissed.current = false
              refresh()
            }}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              composing.current = true
            }}
            onCompositionEnd={() => {
              composing.current = false
              refresh()
            }}
            onPaste={(event) => {
              // Plain text only: a pasted JD arrives as somebody else's fonts
              // and colours otherwise. `insertText` keeps the native undo.
              event.preventDefault()
              const pasted = event.clipboardData.getData("text/plain")
              document.execCommand("insertText", false, pasted)
              refresh()
            }}
            className={cn(
              "w-full outline-none",
              hero
                ? "min-h-16 text-base"
                : size === "composer"
                  ? "min-h-9 text-sm"
                  : "min-h-12 text-sm"
            )}
          />
        </div>

        <div className="flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              setAttached(file.name)
              toast.add({
                title: `Attached ${file.name}`,
                description:
                  "Reading a JD isn't wired up yet — the file is here so the flow can be reviewed.",
              })
              event.target.value = ""
            }}
          />

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => fileRef.current?.click()}
          >
            <PaperclipIcon data-icon="inline-start" />
            Attach a JD
          </Button>

          <Button
            variant="ghost"
            size="sm"
            aria-pressed={listening}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              listening && "bg-primary/10 text-primary hover:text-primary"
            )}
            onClick={() => {
              const next = !listening
              setListening(next)
              if (next) {
                toast.add({
                  title: "Listening…",
                  description:
                    "Dictation isn't wired up yet — this is the state, not the transcript.",
                })
              }
            }}
          >
            <MicIcon data-icon="inline-start" />
            {listening ? "Listening…" : "Dictate"}
          </Button>

          <div className="flex-1" />

          <Button
            size="icon-sm"
            className="rounded-full"
            aria-label={
              submitHint ??
              (intent === "post" ? "Write the posting" : "Search for people")
            }
            title={onSubmit ? undefined : submitHint}
            disabled={!text || !onSubmit}
            onClick={submit}
          >
            <ArrowRightIcon />
          </Button>
        </div>
      </Card>

      {/* WHAT THE BOX UNDERSTOOD, in one row rather than two. A part the
          recruiter confirmed prints its chip and can be taken off here; a part
          only spotted in the prose keeps a tick; the rest stay grey, which is
          what tells you the box is still waiting for them. The inline chips
          are the sentence — this is where they have a handle. */}
      {/* THE ONLY THING LEFT UNDER THE BOX IS A FILE YOU ADDED.
          The five-part checklist and the skills a title implies both lived
          here and both are gone: the sentence above already shows what was
          understood — the words are right there, and the recognised ones are
          chips — so restating it underneath was the same information twice,
          in a band that pushed the page down on every keystroke. An attached
          JD is different: nothing else on screen says it is there. */}
      {attached ? (
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setAttached(null)}
            className="inline-flex items-center gap-1 rounded-4xl bg-background py-0.5 pr-1.5 pl-2.5 text-xs font-medium text-foreground ring-1 ring-foreground/10 transition-colors outline-none hover:bg-background/70 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <PaperclipIcon className="size-3" />
            {attached}
            <XIcon className="size-3" />
            <span className="sr-only">— remove</span>
          </button>
        </div>
      ) : null}

      {/* Said once, in words. The checklist row deliberately has no live
          region of its own — it changes on every character. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
