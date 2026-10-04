import { aiHealth, askRoute } from "@/lib/ai-client"

/**
 * Where a typed sentence goes when the keywords cannot tell — asked of Gemini.
 *
 * RULES FIRST, THE MODEL ONLY ON A TIE OR A MISS. `answersFor` in
 * `lib/agent.ts` routes free text by keyword and answers at once when one
 * skill wins outright, which is most questions. Only "hiring insights" (two
 * skills, one point each) or "mujhe ek sales head chahiye" (no keyword at
 * all) comes here, and the turn waits for it the way a posting answer waits
 * for its reading.
 *
 * THE MODEL PICKS; THE PAGE ANSWERS. The reply is a skill id checked against
 * the page's own list, and the answer is that skill's own, from the page's own
 * data. Unsure is kept as unsure: the page asks "Which did you mean?" with the
 * options rather than taking the first.
 *
 * EVERY FAILURE IS THE RULES. No key, no server, a timeout or a reply naming
 * a skill that does not exist: the decision is the keywords' tie (or nothing,
 * for a miss), marked as the rules', and the page asks or refuses from that.
 */

export type RouteDecision = {
  /** The skill to answer with, when someone was sure. */
  skill: string | null
  /** What it could be, best first, when nobody was — empty for "none of them". */
  options: string[]
  by: "gemini" | "rules"
  /** Milliseconds, measured around the whole call. */
  took?: number
  /** Why the rules decided when Gemini was meant to. */
  note?: string
}

/** A router should not keep anyone waiting the way a JD reading may. */
const TIMEOUT_MS = 8_000

export async function routeWithAi(
  text: string,
  /** The skills the keywords tied between, best first — the fallback's options. */
  tied: string[],
  /** Every skill id the page can answer with. */
  ids: string[]
): Promise<RouteDecision> {
  const rules = (note: string): RouteDecision => ({
    skill: null,
    options: tied,
    by: "rules",
    note,
  })

  const health = await aiHealth()
  if (!health.available) return rules("Gemini isn't configured")

  try {
    const { result } = await withTimeout(askRoute(text), TIMEOUT_MS)
    const read = (result ?? {}) as {
      skill?: unknown
      confident?: unknown
      alternatives?: unknown
    }
    const known = (id: unknown): id is string =>
      typeof id === "string" && ids.includes(id)
    const skill = known(read.skill) ? read.skill : null
    const alternatives = Array.isArray(read.alternatives)
      ? read.alternatives.filter(known)
      : []
    // An unknown id that is not "none" is a malformed reply, not an answer.
    if (read.skill !== "none" && !skill)
      return rules("Gemini's reply was unusable")

    if (skill && read.confident === true)
      return { skill, options: [], by: "gemini" }
    const options = [...new Set([...(skill ? [skill] : []), ...alternatives])]
    return { skill: null, options: options.slice(0, 3), by: "gemini" }
  } catch (error) {
    console.warn("[agent] Gemini did not route; using the keywords.", error)
    return rules("Gemini didn't answer")
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`No reply in ${ms / 1000}s`)),
      ms
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}
