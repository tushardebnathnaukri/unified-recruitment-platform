import * as React from "react"
import { useSearchParams } from "react-router"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { isBrand, DEFAULT_BRAND } from "@workspace/ui/lib/brands"

/**
 * Keeps `?brand=` and the active product in step.
 *
 * WITHOUT THIS THERE IS NO WAY TO SHOW SOMEBODY HIRIST. The brand lives in
 * `localStorage`, so a link opens on whatever product the person receiving it
 * last picked — which for anyone opening it for the first time is always
 * iimjobs. "Look at this screen on hirist" could not be said in a URL, which
 * for a prototype whose whole job is design review is the bigger gap of the
 * two this change closes.
 *
 * THE URL WINS ON ARRIVAL. A link is an explicit instruction about what to
 * show; `localStorage` is a leftover preference. So the param sets the brand on
 * load, and after that switching product rewrites the param.
 *
 * The default is written as an ABSENT param rather than `?brand=iimjobs`, the
 * same rule the response manager's filters follow — a plain URL should stay
 * plain, and a link is only worth the noise when it is saying something.
 *
 * It lives in the app rather than in `BrandProvider` because it needs the
 * router: `history.replaceState` behind React Router's back leaves the router's
 * own location stale, and the param goes missing on the next navigation.
 */
export function BrandUrlSync() {
  const { brand, setBrand } = useBrand()
  const [searchParams, setSearchParams] = useSearchParams()
  const param = searchParams.get("brand")

  /**
   * Arrival: the link decides — but only when the LINK changes.
   *
   * The obvious version, "if the param disagrees with the brand, follow the
   * param", is a loop: switching product sets the brand, this effect then sees
   * the not-yet-rewritten param still holding the old one, and sets it back.
   * The switcher looked broken while both halves worked exactly as written.
   *
   * So it remembers the param it last acted on and only acts when that value
   * moves. A rewrite of its own making comes back through here, matches, and
   * stops — which is what makes the other direction possible at all.
   */
  const applied = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (param === applied.current) return
    applied.current = param
    if (isBrand(param) && param !== brand) setBrand(param)
  }, [param, brand, setBrand])

  // Departure: the switcher decides, and the URL follows so it stays sharable.
  React.useEffect(() => {
    const wanted = brand === DEFAULT_BRAND ? null : brand
    if ((param ?? null) === wanted) return

    const next = new URLSearchParams(searchParams)
    if (wanted === null) next.delete("brand")
    else next.set("brand", wanted)

    setSearchParams(next, { replace: true })
  }, [brand, param, searchParams, setSearchParams])

  return null
}
