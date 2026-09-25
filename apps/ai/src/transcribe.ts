/**
 * Voice input, transcribed by Gemini — the server half.
 *
 * A DEDICATED TRANSCRIPTION MODEL, NOT A PROMPT. `gemini-3.5-transcribe` is
 * called through the Interactions API with the clip inline (no upload step —
 * a dictated answer is seconds long, well under the 20 MB inline limit), and
 * it takes a CUSTOM VOCABULARY: the page sends the product's cities, the pay
 * words ("lakh", "LPA", "CTC") and whatever role and skills the conversation
 * already holds, which is exactly what a general transcriber gets wrong in
 * this market. Override the model with `GEMINI_TRANSCRIBE_MODEL`.
 *
 * NARROW, LIKE THE INTAKE ROUTE. One clip in, one transcript out; the audio
 * types are an allow-list and the size is capped, so the route cannot be used
 * to send Gemini anything but a short recording.
 */

export const TRANSCRIBE_MODEL =
  process.env.GEMINI_TRANSCRIBE_MODEL || "gemini-3.5-transcribe"

/**
 * Base64 of about a minute of Opus is under 1 MB; eight leaves room for a
 * browser that records something heavier, and nowhere near the 20 MB limit.
 */
export const MAX_TRANSCRIBE_BODY = 8 * 1024 * 1024

/**
 * What the browsers record, onto the names Gemini lists. Chrome and Edge
 * record WebM/Opus and Firefox Ogg/Opus, both accepted as they are; Safari
 * records MP4/AAC, which Gemini calls M4A.
 */
const MIME: Record<string, string> = {
  "audio/webm": "audio/webm",
  "audio/ogg": "audio/ogg",
  "audio/mp4": "audio/m4a",
  "audio/m4a": "audio/m4a",
  "audio/aac": "audio/aac",
  "audio/mpeg": "audio/mpeg",
  "audio/wav": "audio/wav",
}

export type TranscribeRequest = {
  audio: string
  mimeType: string
  vocabulary: string[]
}

export function parseTranscribe(body: unknown): TranscribeRequest | string {
  if (!body || typeof body !== "object") return "Expected a JSON object"
  const value = body as Record<string, unknown>
  if (typeof value.audio !== "string" || !value.audio)
    return "audio must be base64 text"
  const base = String(value.mimeType ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase()
  const mimeType = MIME[base]
  if (!mimeType) return `unsupported audio type: ${base || "none"}`
  const vocabulary = Array.isArray(value.vocabulary)
    ? value.vocabulary
        .filter((term): term is string => typeof term === "string")
        .map((term) => term.trim())
        .filter((term) => term && term.length <= 60)
    : []
  return {
    audio: value.audio,
    mimeType,
    // The docs cap it at 1,000 and say it works best under 100.
    vocabulary: [...new Set(vocabulary)].slice(0, 100),
  }
}

/** The body for `POST /v1beta/interactions`. */
export function transcribeBody(request: TranscribeRequest) {
  return {
    model: TRANSCRIBE_MODEL,
    input: [
      { type: "audio", data: request.audio, mime_type: request.mimeType },
    ],
    ...(request.vocabulary.length
      ? {
          generation_config: {
            transcription_config: { custom_vocabulary: request.vocabulary },
          },
        }
      : {}),
  }
}

/**
 * The transcript out of an interaction.
 *
 * READ OFF A REAL RESPONSE, NOT THE DOCS. The SDKs expose `output_text`, and
 * the docs show nothing else; the REST reply (25 Sep 2026) carries it as
 * `steps[]` of type `model_output`, each with `content[]` text parts. That is
 * read first; the SDK-style field is kept as a fallback in case the shape
 * moves.
 */
export function transcriptFrom(response: unknown): string {
  const value = response as {
    status?: string
    steps?: { type?: string; content?: { type?: string; text?: unknown }[] }[]
    output_text?: unknown
  }
  const steps = (value.steps ?? [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join(" ")
    .trim()
  if (steps) return steps
  if (typeof value.output_text === "string" && value.output_text.trim())
    return value.output_text.trim()
  // A finished transcription with no words in it is silence, not a failure:
  // the page says "I didn't hear anything" rather than reporting an error.
  if (value.status === "completed") return ""
  throw new Error("Gemini returned no transcript")
}
