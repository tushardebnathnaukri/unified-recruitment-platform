import * as React from "react"
import { getDefaultStore, useAtom } from "jotai"

import { persistedAtom } from "@/lib/persisted"

/**
 * The prototype's sounds — six short clips from one family (SoundShelfStudio's
 * UI set on Pixabay, Pixabay Content License: no attribution, product use
 * allowed), played quietly and only in answer to something the recruiter did.
 *
 * - `pop` — the agent's reply lands.
 * - `tick` — a decision that keeps somebody (Shortlist).
 * - `dismiss` / `undo` — Not a fit, and taking a decision back: a matched
 *   out-and-back pair.
 * - `mic-on` / `mic-off` — the same click at two pitches.
 * - `step` / `done` — Chat v2.7: a step of the posting finished, and the last
 *   one. NOT FILES YET: Pixabay's CDN refuses scripted downloads, so they are
 *   synthesised (`SYNTH`) — a two-note rise, and a four-note arpeggio. A
 *   `step.mp3` or `done.mp3` from the same SoundShelfStudio set, dropped into
 *   `assets/sounds/`, takes over from the synth with no code change.
 *
 * FILES ARE OPTIONAL. They are found with `import.meta.glob`, so a missing
 * file is silence rather than a broken build. Errors have no sound at all —
 * the words already say it, and a buzz would only punish.
 *
 * ONE ELEMENT PER SOUND, RESTARTED rather than stacked, so twelve decisions in
 * a second are one tick, not a crowd.
 */
export type Sound =
  "pop" | "tick" | "dismiss" | "undo" | "mic-on" | "mic-off" | "step" | "done"

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
  if (!src) {
    const notes = SYNTH[sound]
    if (notes) synthesise(notes)
    return
  }
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

/**
 * The sounds that have no file yet, as notes: a frequency in Hz and when it
 * starts, in seconds. A rise says "done, and on"; the arpeggio is the same
 * rise carried to the octave, for the end.
 */
const SYNTH: Partial<Record<Sound, [number, number][]>> = {
  step: [
    [659.25, 0],
    [987.77, 0.09],
  ],
  done: [
    [523.25, 0],
    [659.25, 0.08],
    [783.99, 0.16],
    [1046.5, 0.26],
  ],
}

let context: AudioContext | null = null

/**
 * A soft bell: each note a sine with a quieter octave over it, struck and left
 * to decay, at the files' own level. One shared context, made on first use —
 * which is always after a gesture, so the browser lets it play.
 */
function synthesise(notes: [number, number][]) {
  try {
    context ??= new AudioContext()
    void context.resume()
    const now = context.currentTime
    for (const [frequency, at] of notes) {
      for (const [overtone, level] of [
        [1, 1],
        [2, 0.25],
      ] as const) {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = "sine"
        oscillator.frequency.value = frequency * overtone
        const start = now + at
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(
          VOLUME * 0.3 * level,
          start + 0.01
        )
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(start)
        oscillator.stop(start + 0.65)
      }
    }
  } catch {
    // No Web Audio (or blocked): silence, as with a missing file.
  }
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
