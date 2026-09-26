import * as React from "react"

import { useSidebar } from "@workspace/ui/components/sidebar"

import { useAthena } from "@/components/athena-provider"

/**
 * Borrow the nav while a media query holds, and give it back after.
 *
 * `when` is a media query, or null for "not now". The response manager passes
 * a width (below 1400px it wants the room for its filter column); the Agent
 * passes `"all"` once a conversation starts, because the transcript and the
 * posting rail want the room at every width. The nav is only given back if
 * this hook is what collapsed it — a nav the recruiter closed stays closed.
 */
export function useCollapseNav(when: string | null) {
  const { open, setOpen } = useSidebar()
  // Giving the nav back goes through Athena, who may be using the room.
  const { restoreNav } = useAthena()

  /**
   * Both of these are refs so the effect below can depend on `when` alone.
   *
   * `setOpen` is a `useCallback` keyed on `open`, so it gets a new identity
   * every time the sidebar moves. With it in the dependency array the effect
   * tore down and re-ran on its own state change — and since teardown is what
   * restores the sidebar, that was: collapse, cleanup, expand, collapse,
   * "Maximum update depth exceeded". Reading both through refs makes this a
   * mount-once effect, which is what it always meant to be, and cleanup then
   * happens only on the way out of the page.
   */
  const openRef = React.useRef(open)
  const setOpenRef = React.useRef(setOpen)
  const restoreNavRef = React.useRef(restoreNav)
  React.useEffect(() => {
    openRef.current = open
    setOpenRef.current = setOpen
    restoreNavRef.current = restoreNav
  }, [open, setOpen, restoreNav])

  const collapsedByUs = React.useRef(false)

  React.useEffect(() => {
    if (!when) return
    const query = window.matchMedia(when)

    const apply = () => {
      if (query.matches) {
        if (openRef.current) {
          collapsedByUs.current = true
          setOpenRef.current(false)
        }
      } else if (collapsedByUs.current) {
        collapsedByUs.current = false
        restoreNavRef.current()
      }
    }

    apply()
    query.addEventListener("change", apply)

    return () => {
      query.removeEventListener("change", apply)
      // Give it back on the way out: the next screen does not need the room.
      if (collapsedByUs.current) {
        collapsedByUs.current = false
        restoreNavRef.current()
      }
    }
  }, [when])
}

export function useCollapseNavBelow(minWidth: number) {
  useCollapseNav(`(max-width: ${minWidth - 1}px)`)
}
