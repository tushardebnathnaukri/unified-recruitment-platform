import * as React from "react"

/**
 * Reads a media query as an external store, so it is correct on the very first
 * render rather than after an effect — same reasoning as `use-mobile`, which
 * stays separate because it is pinned to the sidebar's 768px breakpoint and
 * `shadcn add sidebar --overwrite` regenerates it.
 *
 * `subscribe` and `getSnapshot` are memoised on `query`: an unstable
 * `subscribe` makes `useSyncExternalStore` tear down and re-add the listener on
 * every render.
 */
export function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onStoreChange)

      return () => list.removeEventListener("change", onStoreChange)
    },
    [query]
  )

  const getSnapshot = React.useCallback(
    () => window.matchMedia(query).matches,
    [query]
  )

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
