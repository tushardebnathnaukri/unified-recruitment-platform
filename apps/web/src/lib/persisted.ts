import { atomWithStorage } from "jotai/utils"

/**
 * A per-viewer setting kept in `localStorage`, as a Jotai atom — the theme,
 * the design variants on /settings, sounds on or off. State that is about the
 * person looking, not about what they are showing someone, so it is not in
 * the URL (see "Routing" in CLAUDE.md for what is).
 *
 * RAW STRINGS, NOT JSON. Every value here is one word from a fixed list, and
 * it was stored that way before these were atoms ("panel", "on", "dark"), so
 * a choice saved last week still reads. Anything not on the list is the
 * default.
 *
 * IT NEVER THROWS. Storage can be unavailable — a private window, blocked
 * site data, an embedded preview — and a switch that throws there takes the
 * page with it. The atom then simply lives in memory for this tab.
 *
 * READ ON INIT (`getOnInit`), so the first render already has the stored
 * value: without it the page paints the default theme, then flips.
 *
 * OTHER TABS FOLLOW through the `storage` event, which only fires in the tabs
 * that did not make the change — a design review with two windows open stays
 * in step.
 */
export function persistedAtom<T extends string>(
  key: string,
  initial: T,
  allowed: readonly T[]
) {
  const valid = (value: string | null): value is T =>
    value !== null && (allowed as readonly string[]).includes(value)

  // Checked against `atomWithStorage`'s synchronous storage shape at the call
  // below; jotai 3 does not export that type by name.
  const storage = {
    getItem: (name: string, fallback: T): T => {
      try {
        const stored = localStorage.getItem(name)
        return valid(stored) ? stored : fallback
      } catch {
        return fallback
      }
    },
    setItem: (name: string, value: T) => {
      try {
        localStorage.setItem(name, value)
      } catch {
        // Kept in memory for this tab only.
      }
    },
    removeItem: (name: string) => {
      try {
        localStorage.removeItem(name)
      } catch {
        // Nothing to remove from storage that cannot be reached.
      }
    },
    subscribe: (name: string, callback: (value: T) => void, fallback: T) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key !== name) return
        callback(valid(event.newValue) ? event.newValue : fallback)
      }
      window.addEventListener("storage", onStorage)
      return () => window.removeEventListener("storage", onStorage)
    },
  }

  return atomWithStorage<T>(key, initial, storage, { getOnInit: true })
}
