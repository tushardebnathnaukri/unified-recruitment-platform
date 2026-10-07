/**
 * A burst of confetti from a point on the screen — Chat v2.7's cheer when a
 * step of the posting finishes (`small`) and when the last one does (`big`).
 *
 * WRITTEN HERE, NOT `canvas-confetti`. An `npm install` in this repo can drop
 * rolldown's native bindings from the lockfile (see CLAUDE.md), and a burst
 * of paper rectangles is a hundred lines: one fixed canvas over the page,
 * gone when the last piece has fallen.
 *
 * THE COLOURS ARE THE BRAND'S, read from the tokens at the moment of the
 * burst — `--primary` and a lighter mix of it, with two of the chart
 * neutrals — so it is emerald on iimjobs and the placeholder orange on
 * hirist, and follows the theme. Never written in.
 *
 * NOTHING UNDER REDUCED MOTION. The milestone line in the transcript says the
 * same thing without moving.
 */
type Piece = {
  x: number
  y: number
  vx: number
  vy: number
  spin: number
  angle: number
  tilt: number
  size: number
  color: string
  life: number
}

const SIZES = {
  small: { count: 36, power: 9, spread: 70, life: 70 },
  big: { count: 140, power: 13, spread: 110, life: 110 },
}

export function confetti(
  origin: { x: number; y: number },
  size: keyof typeof SIZES = "small"
) {
  if (typeof window === "undefined") return
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

  const { count, power, spread, life } = SIZES[size]
  const colors = brandColors()
  const ratio = window.devicePixelRatio || 1

  const canvas = document.createElement("canvas")
  canvas.setAttribute("aria-hidden", "true")
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "100",
  })
  canvas.width = window.innerWidth * ratio
  canvas.height = window.innerHeight * ratio
  document.body.appendChild(canvas)
  const context = canvas.getContext("2d")
  if (!context) {
    canvas.remove()
    return
  }
  context.scale(ratio, ratio)

  // Up and out from the origin, in a fan `spread` degrees wide.
  const pieces: Piece[] = Array.from({ length: count }, (_, index) => {
    const angle = ((-90 + (Math.random() - 0.5) * spread) * Math.PI) / 180
    const speed = power * (0.55 + Math.random() * 0.6)
    return {
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: (Math.random() - 0.5) * 0.4,
      angle: Math.random() * Math.PI,
      tilt: Math.random() * Math.PI,
      size: 5 + Math.random() * 5,
      color: colors[index % colors.length],
      life: life * (0.7 + Math.random() * 0.5),
    }
  })

  let frame = 0
  const tick = () => {
    frame += 1
    context.clearRect(0, 0, window.innerWidth, window.innerHeight)
    let alive = 0
    for (const piece of pieces) {
      if (frame > piece.life) continue
      alive += 1
      piece.vx *= 0.96
      piece.vy = piece.vy * 0.96 + 0.32
      piece.x += piece.vx
      piece.y += piece.vy
      piece.angle += piece.spin
      piece.tilt += 0.12
      context.save()
      context.globalAlpha = Math.min(1, (piece.life - frame) / 20)
      context.translate(piece.x, piece.y)
      context.rotate(piece.angle)
      context.fillStyle = piece.color
      // The tilt squashes the rectangle, which reads as paper turning over.
      context.fillRect(
        -piece.size / 2,
        (-piece.size / 2) * Math.abs(Math.cos(piece.tilt)),
        piece.size,
        piece.size * 0.6 * Math.abs(Math.cos(piece.tilt)) + 1
      )
      context.restore()
    }
    if (alive > 0) requestAnimationFrame(tick)
    else canvas.remove()
  }
  requestAnimationFrame(tick)
}

/**
 * The brand's colours as canvas can use them. The tokens are `oklch()`, so
 * each is painted into a one-pixel canvas and read back as RGB — which works
 * for any colour syntax the browser understands.
 */
function brandColors() {
  const style = getComputedStyle(document.documentElement)
  const probe = document.createElement("canvas")
  probe.width = probe.height = 1
  const context = probe.getContext("2d", { willReadFrequently: true })
  const rgb = (token: string): number[] | null => {
    const value = style.getPropertyValue(token).trim()
    if (!context || !value) return null
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data
    return [r, g, b]
  }
  const css = ([r, g, b]: number[]) => `rgb(${r}, ${g}, ${b})`

  const primary = rgb("--primary")
  const colors = [
    primary,
    // A lighter mix of the brand, so the burst is not one flat colour.
    primary?.map((channel) => Math.round(channel + (255 - channel) * 0.45)),
    rgb("--chart-2"),
    rgb("--chart-4"),
  ].filter((color): color is number[] => Boolean(color))

  // A neutral if the tokens cannot be read — never a brand colour written in.
  return colors.length > 0 ? colors.map(css) : ["rgb(128, 128, 128)"]
}
