import type { ComponentType } from "react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import type { Brand } from "@workspace/ui/lib/brands"
import { cn } from "@workspace/ui/lib/utils"

/**
 * The active brand's wordmark.
 *
 * A map keyed by brand rather than a branch on it. The rule against
 * `if (brand === "hirist")` is about absorbing PRODUCT divergence into a
 * component — a logo is not a divergence, it is what a brand is, and the
 * `Record<Brand, …>` makes TypeScript demand a mark the day a third brand is
 * added rather than letting it silently fall through.
 *
 * The marks carry NO fill of their own, so they take `currentColor` from
 * whatever they sit in and need no dark-mode variant. That is also why they are
 * inlined rather than served as `<img src>`: an `<img>` cannot be recoloured,
 * and the sidebar is `sidebar-foreground` in one theme and its inverse in the
 * other.
 */

/**
 * The real iimjobs wordmark, from
 * js-static.iimjobs.com/production/19.2.3/logo/iimjobs.svg — vendored rather
 * than hotlinked so the prototype renders offline and a deployed preview does
 * not depend on iimjobs' CDN staying reachable and CORS-open.
 *
 * The ".com" line under the word is dropped: its four paths are gone and the
 * viewBox ends just below the j's descender.
 */
function IimjobsWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="7.9 62.9 184.7 59"
      fill="currentColor"
      role="img"
      aria-label="iimjobs"
      className={className}
    >
      <path d="M13.5,69.8c0,0.8-0.3,1.4-0.8,2c-0.6,0.6-1.2,0.8-2,0.8s-1.4-0.3-2-0.8c-0.6-0.6-0.8-1.2-0.8-2s0.3-1.4,0.8-2 s1.2-0.8,2-0.8s1.4,0.3,2,0.8C13.2,68.3,13.5,69,13.5,69.8z M8.4,78.8c0-0.6,0.2-1.1,0.7-1.6c0.4-0.4,1-0.7,1.6-0.7 s1.1,0.2,1.6,0.7c0.4,0.4,0.7,1,0.7,1.6v27c0,0.6-0.2,1.2-0.7,1.6c-0.4,0.4-1,0.7-1.6,0.7s-1.2-0.2-1.6-0.7c-0.4-0.4-0.7-1-0.7-1.6 V78.8z" />
      <path d="M27,69.8c0,0.8-0.3,1.4-0.8,2c-0.6,0.6-1.2,0.8-2,0.8s-1.4-0.3-2-0.8c-0.6-0.6-0.8-1.2-0.8-2s0.3-1.4,0.8-2s1.2-0.8,2-0.8 s1.4,0.3,2,0.8C26.7,68.3,27,69,27,69.8z M21.9,78.8c0-0.6,0.2-1.1,0.7-1.6c0.4-0.4,1-0.7,1.6-0.7s1.1,0.2,1.6,0.7 c0.4,0.4,0.7,1,0.7,1.6v27c0,0.6-0.2,1.2-0.7,1.6c-0.4,0.4-1,0.7-1.6,0.7s-1.2-0.2-1.6-0.7c-0.4-0.4-0.7-1-0.7-1.6V78.8z" />
      <path d="M37.5,105.8c0,0.6,0,1.2-0.5,1.6c-0.4,0.4-1,0.7-1.6,0.7s-1.1-0.2-1.6-0.7c-0.4-0.4-0.7-1-0.7-1.6v-27 c0-0.6,0.2-1.1,0.7-1.6c0.4-0.4,1-0.7,1.6-0.7s1.1,0.2,1.6,0.7c0.4,0.4,0.7,1,0.7,1.6v0.6c2.2-1.9,4.9-2.8,7.9-2.8 c3.4,0,6.3,1.2,8.8,3.6c0.5,0.5,1,1,1.4,1.6c0.4-0.6,0.9-1.1,1.4-1.6c2.4-2.4,5.3-3.6,8.8-3.6c3.4,0,6.3,1.2,8.8,3.6 c2.4,2.4,3.6,5.3,3.6,8.8v16.9c0,0.6-0.2,1.2-0.7,1.6c-0.4,0.4-1,0.7-1.6,0.7s-1.2-0.2-1.6-0.7c-0.4-0.4-0.7-1-0.7-1.6v-17 c0-2.2-0.8-4-2.3-5.6C69.9,81.8,68,81,65.8,81c-2.2,0-4,0.8-5.6,2.3c-1.5,1.5-2.3,3.4-2.3,5.6v16.9c0,0.6-0.2,1.2-0.7,1.6 c-0.4,0.4-1,0.7-1.6,0.7s-1.2-0.2-1.6-0.7c-0.4-0.4-0.7-1-0.7-1.6V88.9c0-2.2-0.8-4-2.3-5.6c-1.5-1.5-3.4-2.3-5.6-2.3 c-2.2,0-4,0.8-5.6,2.3c-1.5,1.5-2.3,3.4-2.3,5.6L37.5,105.8L37.5,105.8z" />
      <path d="M85.7,108.1V78.8c0-0.6,0.2-1.1,0.7-1.6c0.4-0.4,1-0.7,1.6-0.7s1.1,0.2,1.6,0.7c0.4,0.4,0.7,1,0.7,1.6v29.3 c0,3.7-1.3,6.9-4,9.6c-2.6,2.6-5.8,4-9.6,4c-0.6,0-1.2-0.2-1.6-0.7c-0.4-0.4-0.7-1-0.7-1.6s0.2-1.1,0.7-1.6s1-0.7,1.6-0.7 c2.5,0,4.6-0.9,6.4-2.6C84.8,112.7,85.7,110.6,85.7,108.1z M90.8,69.8c0,0.8-0.3,1.4-0.8,2c-0.6,0.6-1.2,0.8-2,0.8s-1.4-0.3-2-0.8 c-0.6-0.6-0.8-1.2-0.8-2s0.3-1.4,0.8-2c0.6-0.6,1.2-0.8,2-0.8s1.4,0.3,2,0.8S90.8,69,90.8,69.8z" />
      <path d="M126.7,92.3c0,4.4-1.5,8.1-4.6,11.2s-6.8,4.6-11.2,4.6c-4.4,0-8.1-1.5-11.2-4.6s-4.6-6.8-4.6-11.2c0-4.4,1.5-8.1,4.6-11.2 s6.8-4.6,11.2-4.6c4.4,0,8.1,1.5,11.2,4.6C125.2,84.2,126.7,87.9,126.7,92.3z M111,81c-3.1,0-5.8,1.1-8,3.3c-2.2,2.2-3.3,4.9-3.3,8 s1.1,5.8,3.3,8c2.2,2.2,4.9,3.3,8,3.3s5.8-1.1,8-3.3c2.2-2.2,3.3-4.9,3.3-8s-1.1-5.8-3.3-8C116.7,82.1,114.1,81,111,81z" />
      <path d="M135.7,81.3l0.1-0.1c3.1-3.1,6.8-4.6,11.2-4.6s8.1,1.5,11.2,4.6c3.1,3.1,4.6,6.8,4.6,11.2c0,4.4-1.5,8.1-4.6,11.2 s-6.8,4.6-11.2,4.6s-8.1-1.5-11.2-4.6c-3.1-3.1-4.6-6.8-4.6-11.2V65.2c0-0.6,0.2-1.1,0.7-1.6c0.4-0.4,1-0.7,1.6-0.7 s1.2,0.2,1.6,0.7c0.4,0.4,0.7,1,0.7,1.6v16.1L135.7,81.3z M147,103.6c3.1,0,5.8-1.1,8-3.3s3.3-4.9,3.3-8s-1.1-5.8-3.3-8 s-4.9-3.3-8-3.3s-5.8,1.1-8,3.3c-2.2,2.2-3.3,4.9-3.3,8s1.1,5.8,3.3,8C141.2,102.5,143.9,103.6,147,103.6z" />
      <path d="M172.9,92.3c-1.7-0.6-2.9-1.3-3.6-2c-1.3-1.3-2-2.9-2-4.8s0.7-3.5,2.1-4.9c2.7-2.8,6.2-4.1,10.6-4.1 c4.7,0,8.7,1.9,12.1,5.7c0.3,0.4,0.4,0.8,0.4,1.3c0,0.6-0.2,1.2-0.7,1.6c-0.4,0.4-1,0.7-1.6,0.7s-1.1-0.2-1.5-0.6s-0.6-0.7-0.8-0.8 c-2.2-2.2-4.9-3.3-8-3.3s-5.6,1-7.5,2.9c-0.5,0.5-0.7,1.2-0.7,1.9c0.1,0.9,0.5,1.5,1.4,1.8l13.9,4.6c1.7,0.6,2.9,1.3,3.6,2 c1.3,1.3,2,2.9,2,4.8s-0.7,3.5-2.1,4.9c-2.7,2.8-6.2,4.1-10.6,4.1c-4.7,0-8.8-1.9-12.1-5.7c-0.3-0.4-0.4-0.8-0.4-1.3 c0-0.6,0.2-1.1,0.7-1.6c0.4-0.4,1-0.7,1.6-0.7s1.1,0.2,1.5,0.6s0.6,0.7,0.8,0.8c2.2,2.2,4.9,3.3,8,3.3s5.6-1,7.5-2.9 c0.5-0.5,0.7-1.2,0.7-1.9c-0.1-0.9-0.5-1.5-1.4-1.8L172.9,92.3z" />
    </svg>
  )
}

/**
 * TODO(design): hirist has no mark here yet — same gap as its placeholder
 * palette in `globals.css`. `null` is deliberate: it falls back to the brand
 * name set in type, which is honest about the gap. A stand-in logo would not
 * be.
 */
const WORDMARKS: Record<Brand, ComponentType<{ className?: string }> | null> = {
  iimjobs: IimjobsWordmark,
  hirist: null,
}

export function BrandWordmark({ className }: { className?: string }) {
  const { brand } = useBrand()
  const Wordmark = WORDMARKS[brand]

  // Sized to sit at the same optical weight as the iimjobs wordmark, so
  // flipping brands does not change how heavy the header reads. The wordmark's
  // box is 26px ascender-to-descender, so its letters are shorter than 26px of
  // type would be — hence 20px here.
  if (!Wordmark) {
    return <span className="text-xl font-semibold">{brand}</span>
  }

  // Height-driven: the viewBox is ~2.5:1 and every mark will have its own
  // ratio, so width is left to `w-auto` rather than pinned per brand. The box
  // spans ascender to descender, so it has to run taller than a cap-height-only
  // mark would to read at the same size. 26px keeps the letters the size they
  // were at 32px with the ".com" line under them.
  return <Wordmark className={cn("h-6.5 w-auto", className)} />
}
