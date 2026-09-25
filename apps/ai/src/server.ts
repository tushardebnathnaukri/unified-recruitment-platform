import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"

import { geminiBody, parseRequest, resultFrom } from "./intake.ts"
import {
  MAX_TRANSCRIBE_BODY,
  parseTranscribe,
  TRANSCRIBE_MODEL,
  transcribeBody,
  transcriptFrom,
} from "./transcribe.ts"

/**
 * The prototype's AI server — the one part of this repo that needs a secret.
 *
 * WHY A SERVER AT ALL. The web app is a static SPA, and anything it can read,
 * anybody opening a deployed preview can read. `GEMINI_API_KEY` lives here,
 * in this process's environment (`apps/ai/.env.local`, gitignored like every
 * `.env*`), and the page only ever sees the answers.
 *
 * NO DEPENDENCIES AND NO BUILD. Node 24 runs this file directly, stripping the
 * types, so there is nothing to install and nothing to compile — `npm run dev`
 * from the repo root starts it beside the web app, and `npm start` in this
 * folder is the whole of a deployment.
 *
 * THREE ROUTES.
 *   GET  /api/health      — whether a key is configured, and which models.
 *   POST /api/intake      — one answer read into a job posting (`intake.ts`).
 *   POST /api/transcribe  — a short recording, as text (`transcribe.ts`).
 *
 * The page asks /api/health once, before its first question, so a missing key
 * becomes "the rules answered" up front rather than a failed call mid-flow.
 */

const PORT = Number(process.env.PORT) || 8787
const KEY = process.env.GEMINI_API_KEY ?? ""
/**
 * `gemini-3.5-flash` is the GA Flash model on generateContent per the Gemini
 * API docs as of Sep 2026. Override with `GEMINI_MODEL` when it moves rather
 * than editing this line.
 */
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash"
const MAX_BODY = 64 * 1024

/**
 * Who may call this from a browser. Unset, it is anything on localhost — the
 * dev setup, where Vite forwards `/api` and the page never talks to this port
 * directly. Deployed, set it to the preview's origin(s), comma-separated.
 *
 * NOT A LOCK. Origin is a header a browser sets and `curl` does not; it stops
 * another website spending this key through its visitors, not somebody who
 * wants to. The rate limit below is what bounds that.
 */
const ALLOWED = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

function originAllowed(origin: string | undefined) {
  if (!origin) return true
  if (ALLOWED.length) return ALLOWED.includes(origin)
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

/**
 * Forty calls per address per five minutes. A whole posting is six or seven,
 * so this is generous for a person and a ceiling for a loop. In memory, so it
 * resets with the process — which is the right amount of machinery for a
 * prototype's one endpoint.
 */
const WINDOW_MS = 5 * 60 * 1000
const LIMIT = 40
const calls = new Map<string, number[]>()

function overLimit(address: string) {
  const now = Date.now()
  const recent = (calls.get(address) ?? []).filter((at) => now - at < WINDOW_MS)
  recent.push(now)
  calls.set(address, recent)
  return recent.length > LIMIT
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin
  if (!originAllowed(origin))
    return send(res, 403, { error: "Origin not allowed" })
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Vary", "Origin")
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    res.statusCode = 204
    return res.end()
  }

  const path = (req.url ?? "").split("?")[0]

  if (req.method === "GET" && path === "/api/health") {
    return send(res, 200, {
      available: Boolean(KEY),
      model: MODEL,
      transcribeModel: TRANSCRIBE_MODEL,
    })
  }

  if (req.method === "POST" && path === "/api/intake") {
    if (!KEY) {
      return send(res, 503, {
        error:
          "GEMINI_API_KEY is not set. Put it in apps/ai/.env.local and restart.",
      })
    }
    // Behind Vite's proxy every call is from localhost; the forwarded header
    // is the real caller when this is deployed behind one of its own.
    const address =
      String(req.headers["x-forwarded-for"] ?? "")
        .split(",")[0]
        .trim() ||
      req.socket.remoteAddress ||
      "unknown"
    if (overLimit(address))
      return send(res, 429, { error: "Too many requests" })

    try {
      const request = parseRequest(JSON.parse(await readBody(req)))
      if (typeof request === "string") return send(res, 400, { error: request })

      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(geminiBody(request)),
        }
      )
      const payload: unknown = await upstream.json()
      if (!upstream.ok) {
        const message =
          (payload as { error?: { message?: string } }).error?.message ??
          `Gemini returned ${upstream.status}`
        console.error(`[intake] ${upstream.status} ${message}`)
        return send(res, 502, { error: message })
      }

      return send(res, 200, { model: MODEL, result: resultFrom(payload) })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[intake] ${message}`)
      return send(res, 502, { error: message })
    }
  }

  // Voice input: a short recording in, its transcript out (`transcribe.ts`).
  if (req.method === "POST" && path === "/api/transcribe") {
    if (!KEY) {
      return send(res, 503, {
        error:
          "GEMINI_API_KEY is not set. Put it in apps/ai/.env.local and restart.",
      })
    }
    const address =
      String(req.headers["x-forwarded-for"] ?? "")
        .split(",")[0]
        .trim() ||
      req.socket.remoteAddress ||
      "unknown"
    if (overLimit(address))
      return send(res, 429, { error: "Too many requests" })

    try {
      const request = parseTranscribe(
        JSON.parse(await readBody(req, MAX_TRANSCRIBE_BODY))
      )
      if (typeof request === "string") return send(res, 400, { error: request })

      const upstream = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transcribeBody(request)),
        }
      )
      const payload: unknown = await upstream.json()
      if (!upstream.ok) {
        const message =
          (payload as { error?: { message?: string } }).error?.message ??
          `Gemini returned ${upstream.status}`
        console.error(`[transcribe] ${upstream.status} ${message}`)
        return send(res, 502, { error: message })
      }
      return send(res, 200, {
        model: TRANSCRIBE_MODEL,
        text: transcriptFrom(payload),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[transcribe] ${message}`)
      return send(res, 502, { error: message })
    }
  }

  send(res, 404, { error: "Not found" })
})

server.listen(PORT, () => {
  console.log(
    `AI server on http://localhost:${PORT} · ${MODEL} · ${
      KEY ? "key configured" : "NO KEY — the page will use its rules"
    }`
  )
})

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage, limit = MAX_BODY) {
  return new Promise<string>((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error("Request body too large"))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    req.on("error", reject)
  })
}
