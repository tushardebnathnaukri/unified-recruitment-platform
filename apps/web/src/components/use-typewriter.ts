import * as React from "react"

const TYPE_MS = 45
const HOLD_MS = 2200
/** Keep in step with the placeholder's `duration-*` in `AgentComposer`. */
const FADE_MS = 300
/** Reduced motion swaps whole lines instead, at a reading pace. */
const SWAP_MS = 4000

type Step = { line: number; length: number; fading: boolean }

/**
 * Lines typed out, held, faded out and replaced by the next — the box's
 * rotating example questions. Faded rather than backspaced: erasing a line
 * letter by letter reads as the page un-asking the question.
 *
 * `running` false pauses it where it is, and `full` is then the whole of the
 * current line, so a paused box shows a question rather than half of one.
 * Under `prefers-reduced-motion` nothing is typed: whole lines swap.
 *
 * `lines` must keep its identity between renders (a memo), or every render
 * restarts the timer.
 */
export function useTypewriter(lines: string[], running: boolean) {
  const [reduced] = React.useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
  const [step, setStep] = React.useState<Step>({
    line: 0,
    length: 0,
    fading: false,
  })

  const current = lines.length ? lines[step.line % lines.length] : ""

  React.useEffect(() => {
    if (!running || lines.length < 1) return
    const nextLine = (step.line + 1) % lines.length

    let delay: number
    let next: Step
    if (reduced) {
      delay = SWAP_MS
      next = { line: nextLine, length: 0, fading: false }
    } else if (step.fading) {
      // The fade has run; the next line starts from nothing, fully opaque.
      delay = FADE_MS
      next = { line: nextLine, length: 0, fading: false }
    } else if (step.length < current.length) {
      delay = TYPE_MS
      next = { ...step, length: step.length + 1 }
    } else {
      delay = HOLD_MS
      next = { ...step, fading: true }
    }

    const timer = window.setTimeout(() => setStep(next), delay)
    return () => window.clearTimeout(timer)
  }, [step, running, lines, current, reduced])

  return {
    typed: reduced ? current : current.slice(0, step.length),
    full: current,
    /** True while the whole line is fading out, before the next one types. */
    fading: !reduced && step.fading,
  }
}
