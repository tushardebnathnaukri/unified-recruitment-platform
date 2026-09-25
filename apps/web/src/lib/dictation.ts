import type { Brand } from "@workspace/ui/lib/brands"

import { companiesFor } from "@/lib/applicants"
import type { IntakeState } from "@/lib/job-intake"
import { JOB_LOCATIONS } from "@/lib/taxonomy"

/**
 * Dictation, on the browser's own speech recognition.
 *
 * IT IS REALLY WIRED, OR IT IS REALLY OFF. `SpeechRecognition` exists in
 * Chrome and Edge (behind the `webkit` prefix) and does not exist in Firefox,
 * so `available()` is the honest gate: where it works the words in the box are
 * the words that were said, and where it does not the microphone is disabled
 * with a tooltip saying which browsers have it. The alternative — a button
 * that toggles a "Listening…" state and produces nothing — is the version of
 * this control that gets demoed once and believed.
 *
 * INTERIM RESULTS ARE SHOWN AND THEN CORRECTED. The engine revises a phrase as
 * it hears more of it, so the box updates mid-sentence and settles when the
 * result is marked final. That flicker is what dictation looks like; hiding it
 * until the end makes a four-second pause where the recruiter thinks nothing
 * is happening.
 *
 * THE TYPES ARE LOCAL because `lib.dom` does not ship them — this is a vendor
 * API with a draft spec, and declaring what we touch is smaller than pulling a
 * types package in for one control.
 */

type SpeechAlternative = { transcript: string }
type SpeechResult = { 0: SpeechAlternative; isFinal: boolean; length: number }
type SpeechResultList = { length: number; [index: number]: SpeechResult }

type SpeechEvent = { resultIndex: number; results: SpeechResultList }
type SpeechErrorEvent = { error: string }

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechEvent) => void) | null
  onerror: ((event: SpeechErrorEvent) => void) | null
  onend: (() => void) | null
}

type RecognitionConstructor = new () => Recognition

function constructor(): RecognitionConstructor | undefined {
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition
}

export function dictationAvailable() {
  return constructor() !== undefined
}

/** What went wrong, in the words the recruiter needs rather than the spec's. */
export function dictationError(error: string) {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "The microphone is blocked for this page. Allow it in the browser's address bar and try again."
  }
  if (error === "no-speech") return "I didn't hear anything."
  if (error === "audio-capture") return "No microphone found."
  if (error === "network") return "Speech recognition needs a connection."
  return `Dictation stopped: ${error}.`
}

export type DictationHandlers = {
  /** The transcript so far — interim while it is still being revised. */
  onText: (text: string, final: boolean) => void
  onError: (message: string) => void
  onEnd: () => void
}

/**
 * Starts listening. Returns the stopper, or null where the browser has no
 * speech recognition — which the caller should have checked already.
 */
export function startDictation({
  onText,
  onError,
  onEnd,
}: DictationHandlers): (() => void) | null {
  const Recognition = constructor()
  if (!Recognition) return null

  const recognition = new Recognition()
  // Indian English: this is a market where the names, the cities and the
  // "lakh" in a pay figure all come out wrong under en-US.
  recognition.lang = "en-IN"
  recognition.continuous = true
  recognition.interimResults = true

  recognition.onresult = (event) => {
    let text = ""
    let final = false
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      text += result[0].transcript
      if (result.isFinal) final = true
    }
    onText(text, final)
  }
  recognition.onerror = (event) => onError(dictationError(event.error))
  recognition.onend = onEnd

  recognition.start()
  return () => recognition.abort()
}

// --- Recording, for Gemini to transcribe ---------------------------------------

/**
 * RECORD, THEN TRANSCRIBE — WHEN THE AI SERVER IS THERE. The browser's own
 * recogniser streams words as you speak, but it is Chrome-only, sends the
 * audio to Google's speech service with no vocabulary, and hears "sixty
 * lakhs" as "sixty lacks". With the AI server up, the mic records the clip
 * instead and `gemini-3.5-transcribe` writes it down, with this product's
 * cities, pay words and the conversation's own role and skills as its
 * vocabulary. Without the server, `startDictation` above is still the mic.
 *
 * No interim words: a recording is transcribed when it stops. The composer
 * shows a running timer while it records and "Transcribing…" after, so the
 * gap is never silent.
 */

/** Long enough for a JD read aloud in brief; short enough to stay one answer. */
export const MAX_RECORDING_MS = 60_000

export function recordingAvailable() {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  )
}

/** The first of the formats Gemini accepts that this browser can record. */
function recordingType() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ]
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
}

/**
 * The microphone opened but recording could not begin — as opposed to the
 * recruiter refusing the microphone. The composer falls back to the
 * browser's own speech recognition on this one, and not on a refusal.
 */
export class StartError extends Error {}

export type RecordingHandlers = {
  /** The clip, once the recording stops. An empty one is reported as an error. */
  onClip: (clip: Blob) => void
  onError: (message: string) => void
}

/**
 * Starts recording. Resolves to the stopper once the microphone is open, or
 * rejects with a message the recruiter can act on. Stops by itself at
 * `MAX_RECORDING_MS`, and always releases the microphone — the browser's
 * "in use" light going off is how people know it stopped listening.
 */
export async function startRecording({
  onClip,
  onError,
}: RecordingHandlers): Promise<() => void> {
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (error) {
    const name = error instanceof DOMException ? error.name : ""
    throw new Error(
      name === "NotAllowedError"
        ? "The microphone is blocked for this page. Allow it in the browser's address bar and try again."
        : name === "NotFoundError"
          ? "No microphone found."
          : "Couldn't open the microphone.",
      { cause: error }
    )
  }

  const release = () => stream.getTracks().forEach((track) => track.stop())

  /**
   * A MICROPHONE THE BROWSER OPENED IS NOT ONE THE SYSTEM LETS IT HEAR. When
   * the page has permission but the app running it does not (macOS: System
   * Settings → Privacy & Security → Microphone), `getUserMedia` still
   * resolves — with a track that is dead or muted — and `MediaRecorder` then
   * throws "There was an error starting the MediaRecorder", which says
   * nothing useful. Checked here first, so the message can say where to look.
   */
  const track = stream.getAudioTracks()[0]
  const described = track
    ? {
        label: track.label,
        readyState: track.readyState,
        muted: track.muted,
        enabled: track.enabled,
        settings: track.getSettings(),
      }
    : null
  if (!track || track.readyState !== "live") {
    release()
    console.warn("[dictation] no live microphone track", described)
    throw new StartError(
      "The microphone opened but isn't sending audio. Check that this browser — or the Claude app — is allowed to use the microphone in System Settings → Privacy & Security → Microphone."
    )
  }

  const chunks: Blob[] = []
  const wire = (recorder: MediaRecorder) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data)
    }
    recorder.onerror = () => onError("Recording stopped unexpectedly.")
    recorder.onstop = () => {
      release()
      const clip = new Blob(chunks, { type: recorder.mimeType || "audio/webm" })
      // An empty recording still has to end the recording state, or the mic
      // sits there showing "listening" to nothing.
      if (clip.size) onClip(clip)
      else onError("Nothing was recorded — the microphone sent no audio.")
    }
    recorder.start()
    return recorder
  }

  // The preferred format first, then whatever the browser picks for itself —
  // "supported" by `isTypeSupported` and startable with THIS device are not
  // always the same thing.
  const type = recordingType()
  let recorder: MediaRecorder
  try {
    recorder = wire(
      new MediaRecorder(stream, type ? { mimeType: type } : undefined)
    )
  } catch (first) {
    try {
      recorder = wire(new MediaRecorder(stream))
    } catch (second) {
      release()
      console.warn("[dictation] MediaRecorder would not start", {
        type,
        track: described,
        first: String(first),
        second: String(second),
      })
      throw new StartError(
        "This browser couldn't start recording from the microphone.",
        { cause: second }
      )
    }
  }

  const cap = window.setTimeout(() => {
    if (recorder.state !== "inactive") recorder.stop()
  }, MAX_RECORDING_MS)

  return () => {
    window.clearTimeout(cap)
    if (recorder.state !== "inactive") recorder.stop()
  }
}

/**
 * What the transcriber is told to expect: the words most likely to come out
 * of a recruiter's mouth here, and most likely to come back wrong.
 *
 * The conversation's own words first — the role, its skills, its cities, the
 * neighbouring titles — because they are the next answer's most likely
 * subject; then the posting form's cities (with the spellings people SAY:
 * Bengaluru, Gurugram), the pay words ("lakh", "LPA", "CTC", "crore"), and the
 * companies this product's candidates work at. Capped at 100, where the docs
 * say custom vocabulary works best.
 */
export function dictationVocabulary(
  brand: Brand,
  posting: IntakeState | null
): string[] {
  const context = posting
    ? [
        posting.draft.title,
        ...posting.draft.skills,
        ...posting.draft.niceSkills,
        ...posting.draft.locations,
        ...posting.brief.adjacentTitles,
        ...posting.brief.targetCompanies,
      ]
    : []
  const terms = [
    ...context,
    ...JOB_LOCATIONS.slice(0, 16),
    "Bengaluru",
    "Gurugram",
    "Noida",
    "lakh",
    "lakhs",
    "LPA",
    "CTC",
    "crore",
    "JD",
    "notice period",
    "hybrid",
    "fresher",
    "IIM",
    "IIT",
    "MBA",
    ...companiesFor(brand),
  ].filter((term): term is string => Boolean(term))
  return [...new Set(terms)].slice(0, 100)
}
