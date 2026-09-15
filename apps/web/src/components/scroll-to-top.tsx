import * as React from "react"
import { useLocation } from "react-router"

/**
 * A new page starts at the top.
 *
 * DECLARATIVE MODE HAS NO `<ScrollRestoration>` — that component needs a data
 * router — so without this the window keeps whatever scroll the last page had,
 * and opening a job from the bottom of the Jobs list lands you halfway down its
 * responses.
 *
 * ON THE PATH, NOT THE WHOLE URL. Everything a screen holds lives in its query
 * string — the tab, the filters, the open profile panel, the list on My Lists —
 * and none of those is a new page. Resetting on them would throw you back to
 * the top every time you ticked a filter.
 *
 * BACK AND FORWARD STILL RETURN YOU WHERE YOU WERE. This resets first, and the
 * browser's own scroll restoration lands after it on a history step — checked:
 * down a job's responses, over to My Lists, back, and the job is at the same
 * place. Only links and redirects start a page at the top.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()

  // Layout effect, so the reset lands before the new page paints rather than
  // flashing it at the old position for a frame.
  React.useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
