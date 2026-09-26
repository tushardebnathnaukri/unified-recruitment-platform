import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

import { AuraAvatar, type AuraState } from "@/lib/aura/aura-avatar.js"

/**
 * The agent's face: the Aura from `avatar-kit/`, vendored into `lib/aura/`.
 *
 * THE CANVAS IS 2.2× THE ORB. The kit frames its sphere at about 45% of the
 * canvas so the halo has room, so `size` is the orb's diameter and the canvas
 * is centred over it, spilling out and ignoring the pointer. Layout only ever
 * sees `size`.
 *
 * ONE WEBGL CONTEXT EACH, AND BROWSERS CAP THEM AT ABOUT SIXTEEN — so only the
 * hero and the newest reply are live; every older reply draws `AuraStill`.
 */
const SPILL = 2.2

export function Aura({
  size,
  state = "idle",
  className,
}: {
  size: number
  state?: AuraState
  className?: string
}) {
  const canvas = React.useRef<HTMLDivElement>(null)
  const avatar = React.useRef<AuraAvatar | null>(null)

  React.useEffect(() => {
    const created = new AuraAvatar(canvas.current!)
    avatar.current = created
    return () => {
      created.dispose()
      avatar.current = null
    }
  }, [])

  React.useEffect(() => {
    avatar.current?.setState(state)
  }, [state])

  return (
    <span
      className={cn("relative block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <span
        ref={canvas}
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: size * SPILL, height: size * SPILL }}
      />
    </span>
  )
}

/**
 * The Aura without WebGL, for replies that are no longer the newest. Its
 * colours are the kit's idle palette (`DEFAULTS` in `lib/aura/presets.js`) —
 * the avatar's own, not a brand's, so they do not come from a token.
 */
export function AuraStill({
  size,
  className,
}: {
  size: number
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn("block shrink-0 rounded-full", className)}
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 40% 38%, #e6fffb 0%, #5fe6ea 28%, #5a86ff 60%, #d42cf0 100%)",
        boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.5)",
      }}
    />
  )
}
