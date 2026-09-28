import * as React from "react"
import { getDefaultStore, useAtom } from "jotai"

import { persistedAtom } from "@/lib/persisted"

/**
 * The prototype's sounds — six short clips from one family (SoundShelfStudio's
 * UI set on Pixabay, Pixabay Content License: no attribution, product use
 * allowed), played quietly and only in answer to something the recruiter did.
 *
 * - `pop` — the agent's reply lands.
 * - `tick` — a decision that keeps somebody (Shortlist, Maybe, Contacted).
 * - `dismiss` / `undo` — Not a fit, and taking a decision back: a matched
 *   out-and-back pair.
 * - `mic-on` / `mic-off` — the same click at two pitches.
 *
 * FILES ARE OPTIONAL. They are found with `import.meta.glob`, so a missing
 * file is silence rather than a broken build. Errors have no sound at all —
 * the words already say it, and a buzz would only punish.
 *
 * ONE ELEMENT PER SOUND, RESTARTED rather than stacked, so twelve decisions in
 * a second are one tick, not a crowd.
 */
export type Sound = "pop" | "tick" | "dismiss" | "undo" | "mic-on" | "mic-off"

const FILES = import.meta.glob("../assets/sounds/*.mp3", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

const VOLUME = 0.35
const players = new Map<Sound, HTMLAudioElement>()

export function play(sound: Sound) {
  if (!read()) return
  const src = FILES[`../assets/sounds/${sound}.mp3`]
  if (!src) return
  let player = players.get(sound)
  if (!player) {
    player = new Audio(src)
    player.volume = VOLUME
    players.set(sound, player)
  }
  player.currentTime = 0
  // A browser refuses audio before the first gesture; nothing here plays
  // before one, and a refusal is not worth a console error.
  void player.play().catch(() => {})
}

/** Which sound a decision makes: keeping somebody ticks, letting go swooshes. */
export function soundForDecision(status: string): Sound {
  return status === "rejected" ? "dismiss" : "tick"
}

// --- The switch on /settings --------------------------------------------------
// ON by default: the point of the prototype is to hear them in a review.

const soundsAtom = persistedAtom("sounds", "on", ["on", "off"] as const)

// Kept mounted from the start, so a switch flipped in another tab reaches
// `play()` even when nothing on this page shows the setting.
getDefaultStore().sub(soundsAtom, () => {})

/** Outside React, for `play()`: the same atom the switch writes. */
function read() {
  return getDefaultStore().get(soundsAtom) === "on"
}

export function useSounds() {
  const [value, setValue] = useAtom(soundsAtom)
  const setEnabled = React.useCallback(
    (next: boolean) => setValue(next ? "on" : "off"),
    [setValue]
  )
  return { enabled: value === "on", setEnabled }
}
