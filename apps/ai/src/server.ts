import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"
import { dirname, extname, join, resolve, sep } from "node:path"

import { geminiBody, parseRequest, resultFrom } from "./intake.ts"
import { jdReadBody, parseJdRead, parseProbe, probeBody } from "./jd.ts"
import { parseRoute, routeBody } from "./route.ts"
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
 * FIVE ROUTES.
 *   GET  /api/health       — whether a key is configured, and which models.
 *   POST /api/intake       — one answer read into a job posting (`intake.ts`).
 *   POST /api/route        — which Dashboard skill a sentence asks for, when
 *                            its keywords cannot tell (`route.ts`).
 *   POST /api/jd           — a JD's must-haves, good-to-haves and diversity
 *                            options (Chat v2.5, `jd.ts`).
 *   POST /api/probe        — the questions to draft a JD with (Chat v2.5).
 *   POST /api/transcribe   — a short recording, as text (`transcribe.ts`).
 *   GET|PUT /api/sessions/:id — an Agent conversation's turns, by id, so a
 *                            `/agent/c/<id>` link opens for anyone (no key needed).
 *
 * The page asks /api/health once, before its first question, so a missing key
 * becomes "the rules answered" up front rather than a failed call mid-flow.
 *
 * AND, WHEN `STATIC_DIR` IS SET, THE SITE. The Launchpad preview is one
 * container: this server answers `/api/*` and serves the built `apps/web`
 * from `STATIC_DIR`, falling back to `index.html` for app routes. One origin,
 * so the page calls `/api` on itself and needs no `VITE_AI_URL`. Unset (local
 * dev), Vite serves the page and this serves only the API.
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

function originAllowed(origin: string | undefined, host: string | undefined) {
  if (!origin) return true
  // The page this server itself serves (`STATIC_DIR`) is always allowed: a
  // browser sends Origin on a same-origin POST too.
  if (host && (origin === `http://${host}` || origin === `https://${host}`))
    return true
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
/** Routing has its own budget, so a few odd sentences never cost a posting. */
const routeCalls = new Map<string, number[]>()

function overLimit(address: string, limit = LIMIT, log = calls) {
  const now = Date.now()
  const recent = (log.get(address) ?? []).filter((at) => now - at < WINDOW_MS)
  recent.push(now)
  log.set(address, recent)
  return recent.length > limit
}

function callerOf(req: IncomingMessage) {
  return (
    String(req.headers["x-forwarded-for"] ?? "")
      .split(",")[0]
      .trim() ||
    req.socket.remoteAddress ||
    "unknown"
  )
}

// --- Agent conversations ------------------------------------------------------

/**
 * WHAT A `/agent/c/<id>` LINK OPENS. The page makes the id and keeps its own
 * copy in localStorage, so the chat works with this server down; this is the
 * copy that lets somebody ELSE open the link. The body is only the turns —
 * the same strings the old `?ask=` links carried — and nothing is derived
 * from them here.
 *
 * In memory, and in `SESSIONS_FILE` when that is set (the preview sets it), so
 * a restart keeps them; a redeploy is a new container and does not. Capped in
 * every direction: a session's turns, a turn's length, the body, the number
 * of sessions (oldest dropped), and writes per caller.
 */
const SESSION_ID = /^[a-z0-9]{8,32}$/
const MAX_TURNS = 200
const MAX_TURN = 20_000
const MAX_SESSION_BODY = 256 * 1024
const MAX_SESSIONS = 5_000
const SESSION_WRITES = 240
const sessionWrites = new Map<string, number[]>()
const sessions = new Map<string, string[]>()
const SESSIONS_FILE = process.env.SESSIONS_FILE
  ? resolve(process.env.SESSIONS_FILE)
  : null

if (SESSIONS_FILE) {
  try {
    const saved = JSON.parse(await readFile(SESSIONS_FILE, "utf8")) as Record<
      string,
      string[]
    >
    for (const [id, turns] of Object.entries(saved)) sessions.set(id, turns)
  } catch {
    // First run, or an unreadable file: start empty rather than refuse to boot.
  }
}

let saving: ReturnType<typeof setTimeout> | null = null
function persistSessions() {
  if (!SESSIONS_FILE || saving) return
  // Batched: a conversation writes on every turn, the disk does not need to.
  saving = setTimeout(async () => {
    saving = null
    try {
      await mkdir(dirname(SESSIONS_FILE), { recursive: true })
      await writeFile(
        SESSIONS_FILE,
        JSON.stringify(Object.fromEntries(sessions))
      )
    } catch (error) {
      console.error(`[sessions] could not save: ${String(error)}`)
    }
  }, 1000)
}

function readTurns(body: unknown): string[] | string {
  const turns = (body as { turns?: unknown })?.turns
  if (!Array.isArray(turns) || turns.length === 0) return "turns must be a list"
  if (turns.length > MAX_TURNS) return "Too many turns"
  if (
    !turns.every((turn) => typeof turn === "string" && turn.length <= MAX_TURN)
  )
    return "Each turn must be text"
  return turns as string[]
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin
  if (!originAllowed(origin, req.headers.host))
    return send(res, 403, { error: "Origin not allowed" })
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Vary", "Origin")
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT")
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
    if (overLimit(callerOf(req)))
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

  // Free text the page's keywords could not route (`route.ts`).
  if (req.method === "POST" && path === "/api/route") {
    if (!KEY) {
      return send(res, 503, {
        error:
          "GEMINI_API_KEY is not set. Put it in apps/ai/.env.local and restart.",
      })
    }
    if (overLimit(callerOf(req), LIMIT, routeCalls))
      return send(res, 429, { error: "Too many requests" })

    try {
      const request = parseRoute(JSON.parse(await readBody(req)))
      if (typeof request === "string") return send(res, 400, { error: request })

      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(routeBody(request)),
        }
      )
      const payload: unknown = await upstream.json()
      if (!upstream.ok) {
        const message =
          (payload as { error?: { message?: string } }).error?.message ??
          `Gemini returned ${upstream.status}`
        console.error(`[route] ${upstream.status} ${message}`)
        return send(res, 502, { error: message })
      }

      return send(res, 200, { model: MODEL, result: resultFrom(payload) })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[route] ${message}`)
      return send(res, 502, { error: message })
    }
  }

  // Chat v2.5's JD step (`jd.ts`): reading a JD, and the questions to draft
  // one with. Part of a posting, so on the intake's budget.
  if (req.method === "POST" && (path === "/api/jd" || path === "/api/probe")) {
    if (!KEY) {
      return send(res, 503, {
        error:
          "GEMINI_API_KEY is not set. Put it in apps/ai/.env.local and restart.",
      })
    }
    if (overLimit(callerOf(req)))
      return send(res, 429, { error: "Too many requests" })
    const label = path.slice("/api/".length)

    try {
      const raw: unknown = JSON.parse(await readBody(req))
      let body: unknown
      if (path === "/api/jd") {
        const request = parseJdRead(raw)
        if (typeof request === "string")
          return send(res, 400, { error: request })
        body = jdReadBody(request)
      } else {
        const request = parseProbe(raw)
        if (typeof request === "string")
          return send(res, 400, { error: request })
        body = probeBody(request)
      }

      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      )
      const payload: unknown = await upstream.json()
      if (!upstream.ok) {
        const message =
          (payload as { error?: { message?: string } }).error?.message ??
          `Gemini returned ${upstream.status}`
        console.error(`[${label}] ${upstream.status} ${message}`)
        return send(res, 502, { error: message })
      }

      return send(res, 200, { model: MODEL, result: resultFrom(payload) })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[${label}] ${message}`)
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
    if (overLimit(callerOf(req)))
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

  const session = /^\/api\/sessions\/([^/]+)$/.exec(path)?.[1]
  if (session !== undefined) {
    if (!SESSION_ID.test(session))
      return send(res, 400, { error: "Bad session id" })

    if (req.method === "GET") {
      const turns = sessions.get(session)
      return turns
        ? send(res, 200, { turns })
        : send(res, 404, { error: "No such conversation" })
    }

    if (req.method === "PUT") {
      if (overLimit(callerOf(req), SESSION_WRITES, sessionWrites))
        return send(res, 429, { error: "Too many requests" })
      try {
        const turns = readTurns(
          JSON.parse(await readBody(req, MAX_SESSION_BODY))
        )
        if (typeof turns === "string") return send(res, 400, { error: turns })
        // Re-inserted so the map's order is least recently written first.
        sessions.delete(session)
        sessions.set(session, turns)
        while (sessions.size > MAX_SESSIONS)
          sessions.delete(sessions.keys().next().value!)
        persistSessions()
        res.statusCode = 204
        return res.end()
      } catch (error) {
        return send(res, 400, {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return send(res, 405, { error: "GET or PUT" })
  }

  if (await serveStatic(req, path, res)) return

  send(res, 404, { error: "Not found" })
})

server.listen(PORT, () => {
  console.log(
    `AI server on http://localhost:${PORT} · ${MODEL} · ${
      KEY ? "key configured" : "NO KEY — the page will use its rules"
    }${STATIC_DIR ? ` · serving the site from ${STATIC_DIR}` : ""}`
  )
})

// --- The site, when this server is the whole preview ------------------------

const STATIC_DIR = process.env.STATIC_DIR
  ? resolve(process.env.STATIC_DIR)
  : null

/** By extension — `.mjs` included, which a server that guesses gets wrong. */
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
}

async function isFile(path: string) {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

/**
 * A file from `STATIC_DIR`, or `index.html` for a path with no extension (an
 * app route like `/jobs/i1`). A missing path WITH an extension is a real 404,
 * so a broken asset link fails loudly instead of returning the page.
 */
async function serveStatic(
  req: IncomingMessage,
  path: string,
  res: ServerResponse
): Promise<boolean> {
  if (!STATIC_DIR || path.startsWith("/api/")) return false
  if (req.method !== "GET" && req.method !== "HEAD") return false

  let decoded: string
  try {
    decoded = decodeURIComponent(path)
  } catch {
    send(res, 400, { error: "Bad path" })
    return true
  }
  const file = resolve(STATIC_DIR, `.${decoded}`)
  // Nothing outside the site, whatever `..` the path carries.
  if (file !== STATIC_DIR && !file.startsWith(STATIC_DIR + sep)) {
    send(res, 404, { error: "Not found" })
    return true
  }

  let target = (await isFile(file))
    ? file
    : (await isFile(join(file, "index.html")))
      ? join(file, "index.html")
      : null
  if (!target) {
    if (extname(decoded)) {
      send(res, 404, { error: "Not found" })
      return true
    }
    target = join(STATIC_DIR, "index.html")
  }

  const body = await readFile(target)
  res.statusCode = 200
  res.setHeader(
    "Content-Type",
    TYPES[extname(target).toLowerCase()] ?? "application/octet-stream"
  )
  // Hashed build assets never change under the same name; the page does.
  res.setHeader(
    "Cache-Control",
    target.startsWith(join(STATIC_DIR, "assets") + sep)
      ? "public, max-age=31536000, immutable"
      : "no-cache"
  )
  res.end(req.method === "HEAD" ? undefined : body)
  return true
}

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
