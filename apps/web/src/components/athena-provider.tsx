/* eslint-disable react-refresh/only-export-components -- provider and its hook
   belong in one file; splitting them to satisfy fast refresh is not worth it. */
import * as React from "react"

import { useSidebar } from "@workspace/ui/components/sidebar"
import type { AthenaPageContext } from "@/lib/athena"

/**
 * Whether Athena — the copilot — is open, for the whole app, and what the page
 * underneath her has told her about itself.
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
 *
 * PAGES REGISTER, THE PANE NEVER ASKS WHERE IT IS. A page calls
 * `useAthenaContext` with its name and the questions it can answer, because
 * the page is what holds the people and the decisions those answers are
 * computed from. A switch on the route inside the pane would need every page's
 * data imported into one file.
 */
type AthenaState = {
  open: boolean
  setOpen: (open: boolean) => void
  /** The page's context, or `null` on a page that has not registered one. */
  context: AthenaPageContext | null
  setContext: React.Dispatch<React.SetStateAction<AthenaPageContext | null>>
  /**
   * Give the nav back after collapsing it for room. If Athena is open the nav
   * is hers for now, so it reopens when she closes instead of under her.
   */
  restoreNav: () => void
}

const Context = React.createContext<AthenaState | null>(null)

export function AthenaProvider({ children }: { children: React.ReactNode }) {
  const { open: navOpen, setOpen: setNavOpen } = useSidebar()
  const [open, setOpenState] = React.useState(false)
  const [context, setContext] = React.useState<AthenaPageContext | null>(null)

  /**
   * What the nav was doing before Athena borrowed its room. A ref rather than
   * state because nothing renders from it — writing it during `setOpen` would
   * be a second render for a value only the next close reads.
   */
  const navWasOpen = React.useRef(navOpen)

  /**
   * THE NAV HAS TWO BORROWERS. The response manager collapses it below 1400px
   * for its filter column and gives it back when you leave; Athena collapses it
   * for her pane. Each restoring on its own terms meant leaving a job page with
   * Athena open threw the nav back open beside her. Whoever gives it back goes
   * through here, and while Athena holds the room the hand-back waits for her.
   */
  const openRef = React.useRef(open)
  React.useEffect(() => {
    openRef.current = open
  }, [open])

  const restoreNav = React.useCallback(() => {
    if (openRef.current) navWasOpen.current = true
    else setNavOpen(true)
  }, [setNavOpen])

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

  // No `toggle`: the header and the dock only open and the pane only closes,
  // so nothing needs to flip a value it cannot see. It can come back the moment
  // something does — a keyboard shortcut would be the obvious one.
  const value = React.useMemo(
    () => ({ open, setOpen, context, setContext, restoreNav }),
    [open, setOpen, context, restoreNav]
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useAthena() {
  const context = React.useContext(Context)
  if (!context) {
    throw new Error("useAthena must be used within an AthenaProvider.")
  }
  return context
}

/**
 * Tell Athena what this page is and what she can answer on it.
 *
 * THE ANSWERS READ THE PAGE AS IT IS WHEN ASKED, not as it was on mount. The
 * registered openers call through a ref to the latest render's, so asking for
 * the strongest five after shortlisting two does not hand the two back. Only
 * the words Athena shows — the label, the detail, the prompts — re-register,
 * because those are all the pane renders.
 *
 * Unregistering only clears the context if it is still this page's, so a page
 * mounting in the same commit as the old one unmounts cannot be wiped by it.
 */
export function useAthenaContext(page: AthenaPageContext) {
  const { setContext } = useAthena()

  const latest = React.useRef(page)
  React.useLayoutEffect(() => {
    latest.current = page
  })

  const prompts = page.openers.map((opener) => opener.prompt).join("\n")

  React.useEffect(() => {
    const registered: AthenaPageContext = {
      label: page.label,
      detail: page.detail,
      openers: latest.current.openers.map((opener, index) => ({
        prompt: opener.prompt,
        answer: () => (latest.current.openers[index] ?? opener).answer(),
      })),
    }
    setContext(registered)
    return () =>
      setContext((current) => (current === registered ? null : current))
    // `prompts` stands in for the openers: their functions are new every
    // render, and the ref already keeps the answers current.
  }, [page.label, page.detail, prompts, setContext])
}
