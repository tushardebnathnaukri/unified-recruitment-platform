/**
 * The page's side of `apps/ai`.
 *
 * SAME ORIGIN IN DEVELOPMENT, A URL WHEN DEPLOYED. Vite forwards `/api` to the
 * AI server while `npm run dev` is up, so the default base is empty. A static
 * deployment has nothing to forward it, so it sets `VITE_AI_URL` to wherever
 * the server lives. That is an address, not a secret — it is fine in the
 * bundle, which is exactly why the key is not.
 */
const BASE = String(import.meta.env.VITE_AI_URL ?? "").replace(/\/$/, "")

/** An AI-server path, wherever the server is. */
export const aiUrl = (path: string) => `${BASE}${path}`

export type AiHealth = { available: boolean; model?: string }

/**
 * Asked once and remembered — except a failure, which is asked again after a
 * while, so starting the AI server after the page does not need a reload.
 */
let health: { value: Promise<AiHealth>; at: number } | null = null
const RETRY_MS = 15_000

export function aiHealth(): Promise<AiHealth> {
  const stale =
    health && Date.now() - health.at > RETRY_MS
      ? health.value.then((value) => !value.available)
      : Promise.resolve(false)

  return stale.then((retry) => {
    if (!health || retry) {
      health = {
        at: Date.now(),
        value: fetch(`${BASE}/api/health`)
          .then((response) =>
            response.ok
              ? (response.json() as Promise<AiHealth>)
              : { available: false }
          )
          .catch(() => ({ available: false })),
      }
    }
    return health.value
  })
}

export type IntakePayload = {
  brand: string
  stage: "posting" | "refine" | "done"
  draft: unknown
  brief: unknown
  skipped: string[]
  /** Every question open this turn — a whole questionnaire, or the opener. */
  asking: string[]
  /** Each open question in the page's words, so the model knows what was asked. */
  questions: { id: string; prompt: string }[]
  /** A submitted questionnaire: an answer per question, `null` for skipped. */
  answers?: Record<string, string | null>
  /** Typed text or an attached document, when the turn is not a questionnaire. */
  answer?: string
  document: boolean
  /** The lists answers must land on, so the model maps onto them. */
  vocab: { industries: string[]; institutes: string[] }
}

/** One answer read by the model. Throws with the server's reason on failure. */
export async function askIntake(
  payload: IntakePayload
): Promise<{ model: string; result: unknown }> {
  const response = await fetch(`${BASE}/api/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body = (await response.json().catch(() => ({}))) as {
    error?: string
    model?: string
    result?: unknown
  }
  if (!response.ok)
    throw new Error(body.error ?? `AI server returned ${response.status}`)
  return { model: body.model ?? "", result: body.result }
}

/**
 * Which Dashboard skill a sentence asks for, read by the model — only asked
 * when the page's keywords tie or miss (`lib/agent-route-ai.ts`). Throws with
 * the server's reason on failure.
 */
export async function askRoute(
  text: string
): Promise<{ model: string; result: unknown }> {
  const response = await fetch(`${BASE}/api/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
  const body = (await response.json().catch(() => ({}))) as {
    error?: string
    model?: string
    result?: unknown
  }
  if (!response.ok)
    throw new Error(body.error ?? `AI server returned ${response.status}`)
  return { model: body.model ?? "", result: body.result }
}

/**
 * A recording, transcribed by Gemini on the AI server. `vocabulary` is the
 * words this conversation is likely to hold — cities, pay words, the role and
 * its skills — which the transcriber is told to expect.
 */
export async function transcribe(
  clip: Blob,
  vocabulary: string[]
): Promise<string> {
  const audio = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "")
    reader.onerror = () => reject(new Error("Couldn't read the recording."))
    reader.readAsDataURL(clip)
  })
  const response = await fetch(`${BASE}/api/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio, mimeType: clip.type, vocabulary }),
  })
  const body = (await response.json().catch(() => ({}))) as {
    error?: string
    text?: string
  }
  if (!response.ok)
    throw new Error(body.error ?? `AI server returned ${response.status}`)
  return body.text ?? ""
}
