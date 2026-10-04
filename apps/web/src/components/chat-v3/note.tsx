import * as React from "react"
import { MicIcon, PencilLineIcon, SquareIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import { toast } from "@workspace/ui/components/toast"

import { aiHealth, transcribe } from "@/lib/ai-client"
import { encodeNote } from "@/lib/chat-v3"
import {
  StartError,
  dictationAvailable,
  recordingAvailable,
  startDictation,
  startRecording,
} from "@/lib/dictation"

type Mic = "idle" | "listening" | "transcribing"

/**
 * "Share the hiring manager's brief": a note recorded (Gemini transcribes it,
 * the browser's own recogniser when it can't) or typed, read back to the
 * recruiter in a box, and only then added — as a `Note:` turn the readers
 * take across the whole posting and brief. A transcript is read before it is
 * an answer, the way the composer's dictation is.
 */
export function HiringManagerNote({
  vocabulary,
  onAsk,
}: {
  vocabulary: string[]
  onAsk: (prompt: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [text, setText] = React.useState("")
  const [mic, setMic] = React.useState<Mic>("idle")
  const stopper = React.useRef<(() => void) | null>(null)
  React.useEffect(() => () => stopper.current?.(), [])

  const fail = (message: string) => {
    toast.add({ title: "Hiring manager's note", description: message })
    stopper.current = null
    setMic("idle")
  }

  const record = async () => {
    if (mic === "listening") {
      // The clip (or the recogniser's end) moves the button on from here.
      stopper.current?.()
      stopper.current = null
      return
    }
    setOpen(true)
    const health = await aiHealth()
    if (health.available && recordingAvailable()) {
      try {
        stopper.current = await startRecording({
          onClip: (clip) => {
            stopper.current = null
            setMic("transcribing")
            transcribe(clip, vocabulary)
              .then((heard) => {
                if (heard) setText((before) => `${before} ${heard}`.trim())
                else
                  fail("I didn't hear anything. Try again closer to the mic.")
                setMic("idle")
              })
              .catch((error: unknown) =>
                fail(
                  `Couldn't transcribe that: ${error instanceof Error ? error.message : String(error)}`
                )
              )
          },
          onError: fail,
        })
        setMic("listening")
        return
      } catch (error) {
        if (!(error instanceof StartError) || !dictationAvailable()) {
          fail(error instanceof Error ? error.message : String(error))
          return
        }
      }
    }
    if (!dictationAvailable()) {
      fail("The microphone isn't available here. Type the note instead.")
      return
    }
    const start = text ? `${text} ` : ""
    stopper.current = startDictation({
      onText: (heard) => setText(`${start}${heard}`),
      onError: fail,
      onEnd: () => {
        stopper.current = null
        setMic("idle")
      },
    })
    setMic(stopper.current ? "listening" : "idle")
  }

  const add = () => {
    if (!text.trim()) return
    stopper.current?.()
    onAsk(encodeNote(text))
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-background p-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold">
          Share the hiring manager's brief
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Record a note or type it. I'll turn it into requirements and say what
          it changed.
        </p>
      </div>
      {open ? (
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="e.g. Must have scaled a payments product past a million users. Ideally from a bank or a fintech."
          className="min-h-24"
          autoFocus={mic === "idle"}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={mic === "listening" ? "destructive" : "outline"}
          size="sm"
          disabled={mic === "transcribing"}
          onClick={() => void record()}
        >
          {mic === "listening" ? (
            <SquareIcon data-icon="inline-start" />
          ) : mic === "transcribing" ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <MicIcon data-icon="inline-start" />
          )}
          {mic === "listening"
            ? "Stop recording"
            : mic === "transcribing"
              ? "Transcribing…"
              : "Record a note"}
        </Button>
        {!open ? (
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <PencilLineIcon data-icon="inline-start" />
            Type it instead
          </Button>
        ) : (
          <Button
            size="sm"
            className="ml-auto"
            disabled={!text.trim() || mic !== "idle"}
            onClick={add}
          >
            Add to the brief
          </Button>
        )}
      </div>
    </section>
  )
}
