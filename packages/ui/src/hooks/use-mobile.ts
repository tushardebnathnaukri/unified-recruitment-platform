import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onStoreChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY)
  query.addEventListener("change", onStoreChange)

  return () => query.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

/**
 * Diverges from the stock shadcn hook, which seeds `undefined` and assigns in
 * an effect — that trips `react-hooks`' cascading-render rule and reports
 * desktop on the first paint even on a phone. Reading the media query as an
 * external store is correct on the initial render and needs no effect.
 *
 * Re-running `shadcn add sidebar --overwrite` will restore the stock version.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
