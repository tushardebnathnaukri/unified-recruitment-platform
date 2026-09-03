import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { FRAG_SRC, VERT_SRC } from "@/lib/island-glow-shader"

/**
 * The dashboard's brand band, with the app's Island Glow aurora running on it.
 *
 * THE BRAND COLOUR COMES FROM THE TOKEN, NOT THE HANDOFF'S HEX. The shader doc
 * pins `uBrand` to #1A7838, but it also says the cool and warm curtain colours
 * are *derived* from `uBrand` at render time so re-theming re-tunes the whole
 * aurora. Reading `--primary` instead of hardcoding a green is the same idea
 * carried one step further: switch to hirist and the curtains turn orange
 * rather than staying the other product's colour.
 *
 * `--canvas` is hardcoded dark, and deliberately. It is not a brand accent —
 * it is the darkness the curtains need to read as light, and pointing it at
 * `--background` would make it near-white in light mode and erase the effect.
 *
 * IT DEGRADES TO A PLAIN BAND. The canvas sits behind the content inside an
 * isolated stacking context, over a `bg-primary` div. No WebGL2, a failed
 * compile, a lost context: the solid band is still there and nothing below
 * moves.
 */
export function AuroraBand({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      // The band is redrawn every frame, so there is nothing to preserve, and
      // saying so lets the driver skip a full-buffer copy per frame.
      preserveDrawingBuffer: false,
    })
    if (!gl || gl.isContextLost()) return

    const program = buildProgram(gl)
    if (!program) return
    gl.useProgram(program)

    const loc = {
      size: gl.getUniformLocation(program, "uSize"),
      time: gl.getUniformLocation(program, "uTime"),
      brand: gl.getUniformLocation(program, "uBrand"),
      canvas: gl.getUniformLocation(program, "uCanvas"),
      cool: gl.getUniformLocation(program, "uCool"),
      warm: gl.getUniformLocation(program, "uWarm"),
    }

    let palette = readPalette()

    // The token changes under us when the brand switcher or the theme toggle
    // writes to <html>, and the aurora has to follow. Cheaper and more exact
    // than re-reading computed styles on every frame.
    const observer = new MutationObserver(() => {
      palette = readPalette()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-brand"],
    })

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    let raf = 0
    let running = false
    // Accumulated rather than derived from a fixed start, so pausing off-screen
    // and resuming does not jump the curtains forward by however long the user
    // spent scrolled past.
    let elapsed = reduceMotion ? FROZEN_AT : 0
    let last = 0

    const resize = () => {
      // Capped at 2: the aurora is soft-edged noise, and the third device pixel
      // costs 2.25x the fragment work to render detail nothing can see.
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
        return true
      }
      return false
    }

    const draw = () => {
      resize()
      gl.uniform2f(loc.size, canvas.width, canvas.height)
      gl.uniform1f(loc.time, elapsed)
      gl.uniform3fv(loc.brand, palette.brand)
      gl.uniform3fv(loc.canvas, palette.canvas)
      gl.uniform3fv(loc.cool, palette.cool)
      gl.uniform3fv(loc.warm, palette.warm)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const frame = (now: number) => {
      elapsed += Math.min((now - last) / 1000, 0.1)
      last = now
      draw()
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (running || reduceMotion) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    // Reduce Motion parks on one frame mid-phase, so the curtains do not sit
    // flat on their phase origin — a still aurora that looks like a gradient
    // would be worse than no aurora.
    draw()

    // A GPU loop for a band nobody is looking at is pure heat. Both the
    // observer and the visibility listener gate it.
    const visible = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 }
    )
    visible.observe(canvas)

    const onVisibility = () =>
      document.hidden ? stop() : visible.takeRecords().length === 0 && start()
    document.addEventListener("visibilitychange", onVisibility)

    const onResize = () => {
      if (!running && resize()) draw()
    }
    window.addEventListener("resize", onResize)

    return () => {
      stop()
      observer.disconnect()
      visible.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("resize", onResize)
      // Release the program, NOT the context. `loseContext()` is permanent for
      // the canvas that owns it, and `getContext` hands the same dead object
      // back on the next mount — so under StrictMode's double-mount every
      // compile after the first failed, with a null info log to explain it.
      // The context is reused on remount and collected with the element.
      gl.deleteProgram(program)
    }
    // Runs once. NOTE FOR ANYONE TUNING THE SHADER: editing the GLSL hot-swaps
    // the module without necessarily re-running this effect, so the previously
    // compiled program stays on screen and the edit looks like it did nothing.
    // Reload the page after a shader change before judging it — the constants
    // are module scope, so they cannot go in this list to force it.
  }, [])

  return (
    <div
      className={cn("relative isolate overflow-hidden bg-primary", className)}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full"
      />

      {/* Scrim. The curtains are emissive and they drift, so a crest wanders
          behind the greeting every few seconds and drags its worst-case
          contrast down to the floor. Dimming the aurora to fix that would be
          fixing the wrong thing — the text needs a darker ground, not a duller
          background. Weighted to the left, where the text is, so the right two
          third of the band untouched. It fades out just past where the longer
          greeting line ends, which is as far as it has anything to protect —
          an earlier version carried a 20% tail across the full width and muted
          the whole aurora to guard pixels that had no text over them.

          Black rather than a token: a scrim is not a brand colour, and mixing
          the accent into it would tint the aurora it sits over. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-r from-black/72 via-black/38 via-45% to-transparent to-78%"
      />

      {children}
    </div>
  )
}

/** Mid-phase, per the shader handoff's Reduce Motion note. */
const FROZEN_AT = 18

/**
 * The darkness the curtains are lit against. Not a brand token on purpose —
 * see the note on the component.
 */
const CANVAS_RGB: [number, number, number] = [0.0588, 0.0588, 0.0588]

type Palette = {
  brand: Float32Array
  canvas: Float32Array
  cool: Float32Array
  warm: Float32Array
}

function readPalette(): Palette {
  const primary = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim()
  const brand = resolve(primary) ?? [0.102, 0.4706, 0.2196]

  return {
    brand: new Float32Array(brand),
    canvas: new Float32Array(CANVAS_RGB),
    // The same shift the Dart side's `_shiftHue` applies to IslandColors.brand.
    cool: new Float32Array(shiftHue(brand, 30, 0.1)),
    warm: new Float32Array(shiftHue(brand, -26, 0.28)),
  }
}

/**
 * Resolves any CSS colour to sRGB by painting one pixel of it.
 *
 * The tokens are `oklch(...)`, which nothing in JS parses natively — but the
 * 2-D context accepts every colour syntax the browser does and hands back the
 * converted bytes, which makes this exact rather than an approximation.
 */
function resolve(color: string): [number, number, number] | null {
  if (!color) return null
  const probe = document.createElement("canvas")
  probe.width = probe.height = 1
  const ctx = probe.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  ctx.fillStyle = "#000"
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

function shiftHue(
  [r, g, b]: [number, number, number] | number[],
  degrees: number,
  lightnessDelta: number
): [number, number, number] {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min

  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }

  return hslToRgb(
    (h + degrees + 360) % 360,
    s,
    Math.max(0, Math.min(1, l + lightnessDelta))
  )
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let rgb: [number, number, number]
  if (h < 60) rgb = [c, x, 0]
  else if (h < 120) rgb = [x, c, 0]
  else if (h < 180) rgb = [0, c, x]
  else if (h < 240) rgb = [0, x, c]
  else if (h < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]

  return [rgb[0] + m, rgb[1] + m, rgb[2] + m]
}

function buildProgram(gl: WebGL2RenderingContext) {
  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      // Warn rather than throw: a band that fails to compile should fall back
      // to flat colour, not take the dashboard down with it.
      console.warn("[aurora] shader failed:", gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }
    return shader
  }

  const vert = compile(gl.VERTEX_SHADER, VERT_SRC)
  const frag = compile(gl.FRAGMENT_SHADER, FRAG_SRC)
  if (!vert || !frag) return null

  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  gl.deleteShader(vert)
  gl.deleteShader(frag)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("[aurora] link failed:", gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}
