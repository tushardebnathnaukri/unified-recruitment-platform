import * as React from "react"

import { useBrand } from "@workspace/ui/components/brand-provider"

/**
 * True while a page's data would be arriving — on entry, and again whenever the
 * product changes underneath it.
 *
 * THE DELAY IS A DESIGN CLAIM, NOT A FUDGE. Every screen in here reads from a
 * roster that in anything real is a request: opening a job's responses fetches
 * 148 people, and moving between iimjobs and hirist swaps both products'
 * postings and candidates. Rendering instantly teaches a reviewer that all of
 * it is free, and then every decision downstream — whether the product switcher
 * belongs in the shell, whether filters should survive a navigation, whether a
 * list needs its own empty and error states — gets made against a feeling the
 * real thing will not reproduce.
 *
 * IT STARTS TRUE. Arriving on a page IS the load, so the first paint is the
 * skeleton rather than a frame of content that then gets replaced by one.
 *
 * The brand is a dependency rather than a separate hook: a page has one loading
 * state whatever caused it, and a reviewer switching product mid-list should
 * see the same thing they saw when they opened the list.
 *
 * NOTE(design): the numbers are guesses at plausible fetches, not measurements
 * — and they are the one part of this worth arguing with, because they set how
 * fast the product feels in every review from here on. Replace them the moment
 * there is an API to time.
 */
export function usePageLoading(ms = 400) {
  const { brand } = useBrand()

  /**
   * The state is WHICH BRAND HAS FINISHED LOADING, and `loading` is derived
   * from it. Holding a boolean and flipping it to `true` at the top of the
   * effect is the obvious shape and `react-hooks` rejects it — a synchronous
   * `setState` in an effect is a cascading render. Deriving it means a brand
   * change reads as loading in the same render that changed it, with no second
   * pass, and the only `setState` left runs inside the timeout.
   *
   * `null` until the first timer fires, so entry is a load like any other.
   */
  const [loaded, setLoaded] = React.useState<string | null>(null)

  React.useEffect(() => {
    const timer = setTimeout(() => setLoaded(brand), ms)

    // Cleanup makes this StrictMode-safe on its own: the doubled setup just
    // restarts a timer that has not fired, rather than double-counting a
    // "first run" the way a mounted-ref version would.
    return () => clearTimeout(timer)
  }, [brand, ms])

  return loaded !== brand
}
