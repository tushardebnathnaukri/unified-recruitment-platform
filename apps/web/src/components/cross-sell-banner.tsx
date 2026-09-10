import { ArrowRightIcon } from "lucide-react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { Button } from "@workspace/ui/components/button"
import { BRANDS, type Brand } from "@workspace/ui/lib/brands"
import hiristArtwork from "@/assets/hirist-cross-sell.jpg"
import iimjobsArtwork from "@/assets/iimjobs-cross-sell.jpg"

/**
 * The other product, sold from inside this one.
 *
 * IT IS THE COMMERCIAL ARGUMENT FOR THE PRODUCT SWITCHER. A recruiter on
 * iimjobs hiring a VP of Sales will eventually need an engineer, and today that
 * means finding out hirist exists and starting again somewhere else. One
 * account across both is the thing the unification question is actually about,
 * and this is the smallest surface that states it — which also makes it the
 * cheapest thing to delete if the answer is no.
 *
 * IT NEVER NAMES A BRAND IN A CONDITION. It promotes "the other one", found by
 * elimination rather than by asking which brand is active, so adding a third
 * product would need copy but not a branch. The copy is keyed by the brand
 * being SOLD, not the one being viewed, which is why it reads correctly in
 * both directions without being written twice.
 *
 * IT IS A HEADLINE AND A BUTTON, nothing else. The supporting line under it
 * went: at 256px of sidebar it was three wrapped rows of 12px type explaining
 * a claim the headline had already made, and the artwork it sat on could not
 * be seen behind it. A cross-sell has about one sentence of a recruiter's
 * attention, and this spends it on the sentence rather than on the caveat.
 *
 * NOTE(design): there is no dismiss. A cross-sell you cannot get rid of is a
 * complaint waiting to happen, and the real one needs at least a "not now" —
 * left off deliberately so the banner is actually visible in a review rather
 * than dismissed in the first thirty seconds. The question of whether it
 * should come back, and when, is a product decision rather than this file's.
 */
/**
 * EACH PITCH WEARS THE COLOUR OF THE PRODUCT IT IS SELLING, not the one it is
 * sitting in — orange for hirist, emerald for iimjobs. On the iimjobs app the
 * banner is therefore the one orange thing in a green sidebar, which is the
 * point: it is a window into somewhere else rather than more of here.
 *
 * `artwork` is REQUIRED, so a third product cannot quietly ship the flat
 * treatment — the type asks the question at the point somebody adds a brand.
 */
const PITCHES: Record<Brand, { headline: string; artwork: string }> = {
  hirist: {
    headline: "Need to close your tech hiring?",
    artwork: hiristArtwork,
  },
  iimjobs: {
    headline: "Hiring for your leadership team?",
    artwork: iimjobsArtwork,
  },
}

export function CrossSellBanner() {
  const { brand, setBrand } = useBrand()
  const other = BRANDS.find((option) => option.id !== brand)

  if (!other) return null

  const pitch = PITCHES[other.id]

  return (
    // FIXED AT 120px, not sized by its contents. The two pitches wrap to a
    // different number of lines — "Need to close your tech hiring?" takes two,
    // "Hiring beyond engineering?" takes one — so a content-height banner
    // changed size when you switched product, which on a fixed element in the
    // sidebar reads as the nav shifting under you.
    //
    // `justify-between` rather than centring: the headline anchors to the top
    // and the button to the bottom, so both sit at the same height whichever
    // pitch is showing and however many lines it wraps to. Centred, a one-line
    // headline floated its button up and the two products disagreed about
    // where the same control lived.
    //
    // Hidden in the collapsed rail: 64px fits an icon, and an icon is not an
    // argument. The nav below it keeps working, which is what a rail is for.
    <div className="relative mx-2 flex h-[120px] flex-col justify-between gap-2 overflow-hidden rounded-lg bg-sidebar-accent p-3 group-data-[collapsible=icon]:hidden">
      {/* THE ARTWORK DOES NOT THEME, SO WHAT SITS ON IT MUST NOT EITHER. The
          banner is the same photograph in light and dark, which is the point —
          a photograph is not a surface you invert. But the tokens over it do
          flip, and in dark mode the headline went to near-white on a light
          image: 1.06:1, measured. Not low-contrast, invisible. So the headline
          and the button below are fixed colours rather than tokens. It is the
          one place in the app where that is right: everywhere else a surface
          and its text theme together, and here the surface cannot. */}
      {/* MIRRORED, because the source asset is not what the design shows. The
          Figma node flips it horizontally, which moves the laptop from the left
          of the frame to the right — and that flip is the whole point of the
          composition: it puts the subject on the side away from the copy and
          leaves the calm gradient under the text. Reproducing the asset without
          the transform would put a laptop directly behind the headline.

          Decorative, so `alt=""` and `aria-hidden` — the headline beside it
          already says what it is selling, and a screen reader reading out a
          stock photograph of a desk is noise. */}
      <img
        src={pitch.artwork}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full -scale-x-100 object-cover"
      />

      <p className="relative text-base leading-snug font-medium text-neutral-900">
        {pitch.headline}
      </p>

      {/* White, opaque, and fixed for the same reason the headline is. Over a
          photograph the outline variant's translucent fill picks up whatever
          is behind it — here a gradient that shifts across the button's own
          width — so it stops reading as a button and starts reading as a
          tinted pane. */}
      <Button
        variant="outline"
        size="sm"
        className="relative w-fit border-neutral-200 bg-white text-neutral-900 hover:bg-white hover:text-neutral-900"
        onClick={() => setBrand(other.id)}
      >
        Try {other.label}
        <ArrowRightIcon data-icon="inline-end" />
      </Button>
    </div>
  )
}
