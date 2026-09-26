import * as React from "react"
import { useNavigate } from "react-router"
import {
  ArrowUpIcon,
  CheckIcon,
  CircleDashedIcon,
  LoaderIcon,
  MicIcon,
  PaperclipIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Kbd } from "@workspace/ui/components/kbd"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { toast } from "@workspace/ui/components/toast"
import { cn } from "@workspace/ui/lib/utils"

import { attachmentPrompt, matchCommands, type Command } from "@/lib/agent"
import { aiHealth, transcribe } from "@/lib/ai-client"
import { readDocument } from "@/lib/read-document"
import {
  dictationAvailable,
  MAX_RECORDING_MS,
  recordingAvailable,
  startDictation,
  startRecording,
  StartError,
} from "@/lib/dictation"

/**
 * The Agent page's box, and the `/` menu over it.
 *
 * ENTER SENDS, SHIFT+ENTER BREAKS THE LINE. The other way round is right for a
 * document and wrong for a conversation, and everything typed in here is one
 * or two sentences.
 *
 * THE MENU IS OPEN WHEN THE TEXT IS A SLASH QUERY, AND THAT IS THE WHOLE OF
 * THE STATE. `/`, `/int`, `/interviews` — a slash and no spaces — is the
 * condition, so there is no second boolean saying whether the list is showing
 * and no way for the two to disagree. The sparkle does not toggle anything: it
 * types the slash, which is why it reads as pressed afterwards. A space closes
 * the menu, because "/5 people in Pune" is a sentence and not a command.
 *
 * THREE CONTROLS, AND NONE OF THEM IS A MIME. A dead control in a hero is the
 * first thing everyone in a design review clicks, so each of these does the
 * real thing or says plainly that it cannot:
 *
 * - THE PAPERCLIP READS THE FILE — and so does dropping one anywhere on the
 *   box. A `.txt`, `.md`, `.pdf` or `.docx` is read in the browser
 *   (`lib/read-document.ts`), and the answer quotes what it found. An old
 *   `.doc`, or a scanned PDF with no text layer, is kept as a chip and
 *   answered with why it could not be read.
 * - THE MICROPHONE RECORDS AND GEMINI TRANSCRIBES — when the AI server is
 *   up. The clip goes to `gemini-3.5-transcribe` with this conversation's
 *   vocabulary, and the transcript is added to the box, not sent. Without the
 *   server it falls back to the browser's own speech recognition; with
 *   neither, it is disabled and says why.
 * - THE SPARKLE TYPES THE SLASH, which is the one gesture the `/` menu needs.
 */
export function AgentComposer({
  placeholder = "Ask about your postings, your applicants or the market… (press / for quick actions)",
  autoFocus,
  onSubmit,
  onAttach,
  vocabulary = [],
  checklist,
  className,
}: {
  placeholder?: string
  autoFocus?: boolean
  onSubmit: (text: string) => void
  /** A file that has been read, handed up for the page to answer about. */
  onAttach?: (file: { name: string; text: string | null }) => void
  /** Words the transcriber should expect — see `dictationVocabulary`. */
  vocabulary?: string[]
  /**
   * A row of things the answer should cover, ticked as they are typed — the
   * posting opener's "Location · Job title · …". Worked out from the box's
   * own text on every keystroke, so it is a function, not a list.
   */
  checklist?: (text: string) => { label: string; done: boolean }[]
  className?: string
}) {
  const navigate = useNavigate()
  const box = React.useRef<HTMLTextAreaElement>(null)
  const fileInput = React.useRef<HTMLInputElement>(null)
  const [text, setText] = React.useState("")
  const [active, setActive] = React.useState(0)
  const [attached, setAttached] = React.useState<string | null>(null)
  const [reading, setReading] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)

  /**
   * DICTATION, TWO WAYS. With the AI server up, the mic RECORDS and Gemini
   * transcribes the clip when it stops (`startRecording`, `transcribe`), with
   * this conversation's vocabulary. Without it, the browser's own recogniser
   * streams words into the box as before (`startDictation`). Which one is
   * decided once, from the server's health, before the mic is ever pressed.
   *
   * The stopper is a ref rather than state because it is not drawn — and the
   * effect is only there to stop a recording the page is navigating away
   * from, which is what turns the microphone light off after the screen has
   * gone.
   */
  const [engine, setEngine] = React.useState<"gemini" | "browser" | "none">(
    () => (dictationAvailable() ? "browser" : "none")
  )
  React.useEffect(() => {
    let current = true
    void aiHealth().then((health) => {
      if (current && health.available && recordingAvailable())
        setEngine("gemini")
    })
    return () => {
      current = false
    }
  }, [])

  const stopper = React.useRef<(() => void) | null>(null)
  const [mic, setMic] = React.useState<"idle" | "listening" | "transcribing">(
    "idle"
  )
  const [seconds, setSeconds] = React.useState(0)
  // Which engine is listening THIS time — Gemini, or the browser after a
  // recording failed to start. The timer and its "60s" cap are Gemini's only.
  const [via, setVia] = React.useState<"gemini" | "browser">("gemini")
  // What was in the box when dictation started. Speech is APPENDED to it, so
  // a half-typed question is not wiped by pressing the microphone.
  const before = React.useRef("")

  React.useEffect(() => () => stopper.current?.(), [])

  // The running timer while recording — the only sign of life until the
  // transcript arrives, so it is worth a tick a second.
  React.useEffect(() => {
    if (mic !== "listening" || via !== "gemini") return
    const started = Date.now()
    const timer = window.setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      250
    )
    return () => window.clearInterval(timer)
  }, [mic, via])

  const stopListening = () => {
    stopper.current?.()
    stopper.current = null
    if (via !== "gemini") setMic("idle")
  }

  const fail = (message: string) => {
    toast.add({ title: "Dictation", description: message })
    stopper.current = null
    setMic("idle")
  }

  const toggleDictation = async () => {
    if (mic === "transcribing") return
    if (mic === "listening") {
      stopListening()
      return
    }
    before.current = text ? `${text.trimEnd()} ` : ""
    box.current?.focus()

    if (engine === "gemini") {
      setSeconds(0)
      try {
        stopper.current = await startRecording({
          onClip: (clip) => {
            stopper.current = null
            setMic("transcribing")
            transcribe(clip, vocabulary)
              .then((heard) => {
                // Added, not sent: a transcript is read before it is an
                // answer, the way a typed one is.
                if (heard) setText(`${before.current}${heard}`)
                else
                  toast.add({
                    title: "Dictation",
                    description:
                      "I didn't hear anything — try again a little closer to the mic.",
                  })
                setMic("idle")
                box.current?.focus()
              })
              .catch((error: unknown) =>
                fail(
                  `Couldn't transcribe that: ${error instanceof Error ? error.message : String(error)}`
                )
              )
          },
          onError: fail,
        })
        setVia("gemini")
        setMic("listening")
        return
      } catch (error) {
        // Recording couldn't start on this device: the browser's own
        // recogniser may still work, so try it rather than stopping here.
        // A refused microphone is not retried — asking again is the page
        // overriding the recruiter's answer.
        if (!(error instanceof StartError) || !dictationAvailable()) {
          fail(error instanceof Error ? error.message : String(error))
          return
        }
        toast.add({
          title: "Dictation",
          description: `${error.message} Using the browser's speech recognition instead.`,
        })
      }
    }

    setVia("browser")
    stopper.current = startDictation({
      onText: (heard) => setText(`${before.current}${heard}`),
      onError: fail,
      // The engine ends a session on its own after a long silence; the button
      // has to come back up when it does, not only when it is pressed again.
      onEnd: () => {
        stopper.current = null
        setMic("idle")
      },
    })
    setMic(stopper.current ? "listening" : "idle")
  }
  const listening = mic === "listening"

  // A slash and no whitespace. The capture is everything typed after it, which
  // is what filters the list.
  const query = /^\/(\S*)$/.exec(text)?.[1]
  const matches = React.useMemo(
    () => (query === undefined ? [] : matchCommands(query)),
    [query]
  )
  const open = matches.length > 0

  // A query that has changed is a different list, so the highlight goes back to
  // the top rather than landing wherever the last one left it. Derived during
  // render — an effect would paint the old highlight for a frame first.
  const [lastQuery, setLastQuery] = React.useState(query)
  if (query !== lastQuery) {
    setLastQuery(query)
    setActive(0)
  }

  // A file on its own is a question, so the arrow lights up for one even with
  // nothing typed.
  const ready = text.trim().length > 0 || attached !== null

  /**
   * ONE PRESS, ONE TURN — and a file wins.
   *
   * With something attached, the turn is about the file, and anything typed
   * stays in the box for the next press rather than being silently folded into
   * a question about a document or thrown away. Two turns from one arrow would
   * be tidier to write and worse to watch.
   */
  const send = () => {
    if (!ready) return
    if (listening) stopListening()

    if (attached !== null) {
      onSubmit(attachmentPrompt(attached))
      setAttached(null)
      return
    }

    onSubmit(text.trim())
    setText("")
  }

  const run = (command: Command) => {
    setText("")
    if (command.kind === "go") navigate(command.to)
    else onSubmit(command.prompt)
  }

  /**
   * A chosen file, read where reading it is possible.
   *
   * THE READ HAPPENS ON ATTACH, NOT ON SEND. The chip can then say how big the
   * thing is and whether its words came through at all, so the recruiter is
   * not sending a question in the dark — and by the time they press the arrow,
   * the answer is about a file that has already been opened.
   */
  const takeFile = async (file: File) => {
    // Anything is accepted and the reply says what could not be read, rather
    // than a picker that greys out the recruiter's actual JD.
    setReading(true)
    const body = await readDocument(file)
    setReading(false)
    setAttached(file.name)
    onAttach?.({ name: file.name, text: body })
  }

  // A file dropped anywhere on the box is the paperclip, without the dialog.
  const dropProps = onAttach
    ? {
        onDragOver: (event: React.DragEvent) => {
          if (!event.dataTransfer.types.includes("Files")) return
          event.preventDefault()
          setDragging(true)
        },
        onDragLeave: (event: React.DragEvent) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node))
            setDragging(false)
        },
        onDrop: (event: React.DragEvent) => {
          event.preventDefault()
          setDragging(false)
          const file = event.dataTransfer.files[0]
          if (file) void takeFile(file)
        },
      }
    : {}

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault()
        const step = event.key === "ArrowDown" ? 1 : -1
        setActive(
          (current) => (current + step + matches.length) % matches.length
        )
        return
      }
      // Tab as well as Enter: the list is a completion, and Tab is what the
      // Smart Hire bar's ghost text already trains this into.
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault()
        run(matches[active])
        return
      }
      if (event.key === "Escape") {
        event.preventDefault()
        setText("")
        return
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  const checks = checklist?.(text)

  return (
    <div className={cn("relative", className)}>
      {/* Above the box, where the eye is while typing: what the sentence
          already covers, ticked as it is written. */}
      {checks?.length ? (
        <ul
          aria-label="What your answer covers"
          className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-xs"
        >
          {checks.map((check) => (
            <li
              key={check.label}
              className={cn(
                "flex items-center gap-1 transition-colors",
                check.done
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {/* Different in SHAPE, not only colour: a faint tick beside a
                  green one read as the same tick at a glance. The dashed
                  circle is the rail's "not yet" too. */}
              {check.done ? (
                <CheckIcon className="size-3.5 text-primary" />
              ) : (
                <CircleDashedIcon className="size-3.5 text-muted-foreground/60" />
              )}
              {check.label}
              <span className="sr-only">
                {check.done ? " — covered" : " — not yet"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {open ? (
        <CommandMenu
          commands={matches}
          active={active}
          onHover={setActive}
          onPick={run}
        />
      ) : null}

      <div
        {...dropProps}
        className={cn(
          // `focus-within` rather than a focus ring on the textarea: the box is
          // what reads as the control, and the textarea inside it has no border
          // of its own.
          "relative rounded-3xl border bg-background p-2 shadow-xs transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          dragging && "border-ring ring-[3px] ring-ring/50"
        )}
      >
        {dragging ? (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-3xl bg-background/90 text-sm font-medium text-primary">
            Drop to attach — PDF, Word (.docx) or text
          </div>
        ) : null}
        <Textarea
          ref={box}
          rows={1}
          autoFocus={autoFocus}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? "agent-commands" : undefined}
          aria-activedescendant={
            open ? `agent-command-${matches[active]?.token}` : undefined
          }
          className="max-h-48 min-h-10 border-0 bg-transparent px-2.5 py-2 focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
        />

        {/* NOTHING ELSE ON SCREEN SAYS A FILE IS THERE — the same reason the
            Smart Hire bar keeps its attachment strip. It is the chip or it is
            invisible, so it sits inside the box, above the controls. */}
        {reading ? (
          <p className="px-2.5 pb-1 text-xs text-muted-foreground">
            Reading the file…
          </p>
        ) : null}
        {attached ? (
          <div className="px-1.5 pb-1">
            <button
              type="button"
              onClick={() => setAttached(null)}
              className="inline-flex max-w-full items-center gap-1 rounded-4xl bg-muted py-1 pr-1.5 pl-2.5 text-xs font-medium ring-1 ring-foreground/10 transition-colors outline-none hover:bg-muted/70 focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <PaperclipIcon className="size-3 shrink-0" />
              <span className="min-w-0 truncate">{attached}</span>
              <XIcon className="size-3 shrink-0" />
              <span className="sr-only">— remove</span>
            </button>
          </div>
        ) : null}

        <div className="flex items-center gap-1 px-1 pt-1">
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.md,.pdf,.doc,.docx"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void takeFile(file)
              // Cleared so choosing the SAME file twice still fires a change.
              event.target.value = ""
            }}
          />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => fileInput.current?.click()}
                  className="text-muted-foreground"
                />
              }
            >
              <PaperclipIcon />
              <span className="sr-only">Attach a file</span>
            </TooltipTrigger>
            <TooltipContent>Attach a JD or a CV</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={engine === "none" || mic === "transcribing"}
                  aria-pressed={listening}
                  onClick={() => void toggleDictation()}
                  className={cn(
                    "text-muted-foreground",
                    // A live microphone is the one control here with a
                    // consequence outside the page, so it says so in colour
                    // rather than only in a tooltip.
                    listening && "bg-destructive/10 text-destructive"
                  )}
                />
              }
            >
              {mic === "transcribing" ? (
                <LoaderIcon className="animate-spin" />
              ) : (
                <MicIcon />
              )}
              <span className="sr-only">
                {listening
                  ? "Stop and transcribe"
                  : mic === "transcribing"
                    ? "Transcribing"
                    : "Dictate"}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {engine === "none"
                ? "This browser can't record or recognise speech"
                : listening
                  ? engine === "gemini"
                    ? "Stop — Gemini will transcribe it"
                    : "Stop dictating"
                  : engine === "gemini"
                    ? "Dictate — transcribed by Gemini"
                    : "Dictate (the browser's speech recognition)"}
            </TooltipContent>
          </Tooltip>

          {/* Said beside the mic, not in a toast: while it records, the timer
              is the proof it is listening, and after, that something is
              coming back. */}
          {via === "gemini" && mic !== "idle" ? (
            <span
              aria-live="polite"
              className={cn(
                "text-xs tabular-nums",
                listening ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {listening
                ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} · ${MAX_RECORDING_MS / 1000 - seconds}s left`
                : "Transcribing…"}
            </span>
          ) : null}

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-pressed={open}
                  onClick={() => {
                    // It types the slash rather than opening a panel, so the
                    // menu has one way in and the box shows what happened.
                    setText("/")
                    box.current?.focus()
                  }}
                  className={cn(
                    "text-muted-foreground",
                    open && "bg-muted text-primary"
                  )}
                />
              }
            >
              <SparklesIcon />
              <span className="sr-only">Quick actions</span>
            </TooltipTrigger>
            <TooltipContent>
              Quick actions <Kbd>/</Kbd>
            </TooltipContent>
          </Tooltip>

          <div className="flex-1" />

          <Button
            size="icon"
            disabled={!ready}
            onClick={send}
            className="rounded-full"
          >
            <ArrowUpIcon />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * The list itself.
 *
 * ABOVE THE BOX, NOT BELOW IT. The box sits at the bottom of the screen in the
 * conversation and near the bottom on the landing, so a list under it would
 * open off the edge — and the thing being typed should stay where the eye
 * already is.
 *
 * ONE ICON COLOUR, NOT SIX. The screen this is modelled on gives every row its
 * own hue. Here the accent is the product — swapping brand turns it orange —
 * so a rainbow would be the one thing on the page that does not, and a green
 * row beside an amber one would read as a status. They take the same
 * `bg-primary/10` chip the hero's cards take.
 */
function CommandMenu({
  commands,
  active,
  onHover,
  onPick,
}: {
  commands: Command[]
  active: number
  onHover: (index: number) => void
  onPick: (command: Command) => void
}) {
  // THIRTEEN COMMANDS AND ROOM FOR FIVE. Arrowing past the last visible row
  // left the highlight below the fold, so the keyboard walked a list the eye
  // could not follow. `block: "nearest"` scrolls only when it has to, which is
  // what keeps the list still while the pointer is the one moving.
  const list = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const row = list.current?.children[active]
    row?.scrollIntoView({ block: "nearest" })
  }, [active])

  return (
    <div className="absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden rounded-2xl border bg-background shadow-lg">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Quick actions
        </span>
        <Kbd>/</Kbd>
      </div>

      <div
        ref={list}
        id="agent-commands"
        role="listbox"
        className="max-h-80 overflow-y-auto"
      >
        {commands.map((command, index) => (
          <button
            key={command.token}
            id={`agent-command-${command.token}`}
            type="button"
            role="option"
            aria-selected={index === active}
            // The pointer moves the highlight rather than fighting it, so the
            // keyboard and the mouse never disagree about which row is next.
            onMouseMove={() => onHover(index)}
            // `mousedown`, not `click`: the textarea keeps focus, so the box
            // does not blur and re-render between the press and the release.
            onMouseDown={(event) => {
              event.preventDefault()
              onPick(command)
            }}
            className={cn(
              "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors",
              index === active && "bg-muted"
            )}
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <command.icon className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">{command.title}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {command.token}
                </span>
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {command.detail}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
