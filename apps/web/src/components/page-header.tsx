/* eslint-disable react-refresh/only-export-components -- the slot hook ships
   beside the provider and the component that fills it; splitting them would be
   three files for one mechanism. */
import * as React from "react"
import { createPortal } from "react-dom"

/**
 * A PAGE'S OWN HEADER, DRAWN IN THE TOP BAR.
 *
 * `SiteHeader` names the page from the route (`titleForPath`), which is right
 * for a list — "Jobs", "Insights" — and wrong for a screen about one object:
 * on a posting the bar said "Jobs" while the page restated the job underneath
 * it, so the top of the screen spent two rows saying where you were. A page
 * that is about one thing renders that thing here instead, back button and
 * all, and the route title steps aside.
 *
 * IT IS A PORTAL, NOT A REGISTERED NODE. Handing the bar a `React.ReactNode`
 * through context means re-registering it on every render — a new element
 * identity each time, so any effect that stores it loops. A portal keeps the
 * content owned by the page: it re-renders with the page's own state, in the
 * page's own context (the router's, the brand's), and simply lands somewhere
 * else in the DOM.
 *
 * The claim count is separate from the content for the one thing a portal
 * cannot say: whether anybody filled it. It is a count rather than a boolean
 * because a route change mounts the next page's header in the same commit as
 * it unmounts the last one's, and cleanup runs first — 1 → 0 → 1, which a
 * boolean would leave off if the two ever arrived out of order.
 */
type Slot = {
  /** The bar's own element, once `SiteHeader` has mounted it. */
  node: HTMLElement | null
  setNode: (node: HTMLElement | null) => void
  /** How many pages are filling it — 0 means the route title stands. */
  claims: number
  claim: () => () => void
}

const Context = React.createContext<Slot | null>(null)

export function PageHeaderProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [node, setNode] = React.useState<HTMLElement | null>(null)
  const [claims, setClaims] = React.useState(0)

  const claim = React.useCallback(() => {
    setClaims((count) => count + 1)
    return () => setClaims((count) => count - 1)
  }, [])

  const value = React.useMemo(
    () => ({ node, setNode, claims, claim }),
    [node, claims, claim]
  )

  return <Context value={value}>{children}</Context>
}

function useSlot() {
  const slot = React.useContext(Context)
  if (!slot)
    throw new Error("Page headers need a PageHeaderProvider above them")
  return slot
}

/**
 * The bar's end of it: a ref for the element the page's header lands in, and
 * whether a page has taken it over.
 */
export function usePageHeaderSlot() {
  const { setNode, claims } = useSlot()
  return { ref: setNode, filled: claims > 0 }
}

/**
 * The page's end of it. Render this anywhere in a route and its children draw
 * in the top bar in place of the route's title.
 *
 * `useLayoutEffect`, so the title has stepped aside in the same frame the
 * header appears — with a passive effect the two overlap for a paint.
 */
export function PageHeader({ children }: { children: React.ReactNode }) {
  const { node, claim } = useSlot()
  React.useLayoutEffect(claim, [claim])

  return node ? createPortal(children, node) : null
}
