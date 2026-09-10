/* eslint-disable react-refresh/only-export-components -- provider and its hook
   belong in one file; splitting them to satisfy fast refresh is not worth it. */
import * as React from "react"

import { useSidebar } from "@workspace/ui/components/sidebar"

/**
 * Whether Athena — the copilot — is open, for the whole app.
 *
 * IT LIVES IN THE SHELL, NOT ON A PAGE. The point of a copilot is that it is
 * there whatever you are looking at, so the state sits above the router outlet
 * and a half-typed question survives navigating from a job to a candidate.
 *
 * OPENING IT COLLAPSES THE NAV. Three columns do not fit at most widths, and
 * of the three the nav is the one you are least likely to be reading while
 * asking a question. The nav's previous state is remembered and restored on
 * close, so the copilot borrows the room rather than taking it — collapsing it
 * permanently would make every use of Athena cost a click to get the nav back.
 */
type AthenaContext = {
  open: boolean
  setOpen: (open: boolean) => void
}

const Context = React.createContext<AthenaContext | null>(null)

export function AthenaProvider({ children }: { children: React.ReactNode }) {
  const { open: navOpen, setOpen: setNavOpen } = useSidebar()
  const [open, setOpenState] = React.useState(false)

  /**
   * What the nav was doing before Athena borrowed its room. A ref rather than
   * state because nothing renders from it — writing it during `setOpen` would
   * be a second render for a value only the next close reads.
   */
  const navWasOpen = React.useRef(navOpen)

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (next) {
        navWasOpen.current = navOpen
        setNavOpen(false)
      } else if (navWasOpen.current) {
        setNavOpen(true)
      }
      setOpenState(next)
    },
    [navOpen, setNavOpen]
  )

  // No `toggle`: the header only opens and the pane only closes, so nothing
  // needs to flip a value it cannot see. It can come back the moment something
  // does — a keyboard shortcut would be the obvious one.
  const value = React.useMemo(() => ({ open, setOpen }), [open, setOpen])

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useAthena() {
  const context = React.useContext(Context)
  if (!context) {
    throw new Error("useAthena must be used within an AthenaProvider.")
  }
  return context
}
