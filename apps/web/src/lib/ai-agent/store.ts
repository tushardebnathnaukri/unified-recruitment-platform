/**
 * A class with React's `state` / `setState` semantics, readable from React
 * through `useSyncExternalStore`.
 *
 * WHY NOT A REDUCER. The prototype is one class component whose methods call
 * `this.setState` with partial objects and updater functions, chain timers,
 * and read `this.state` again a moment later. Rewriting forty methods as
 * reducer actions would mean re-deriving every one of those sequences; giving
 * the port the same two primitives lets each method be carried over line for
 * line, which is what "keep its own logic" asks for.
 *
 * `setState` merges shallowly and applies at once (React batches; nothing here
 * depends on that). `later` is the prototype's timer helper: every timer is
 * remembered so `dispose` can clear them when the variant unmounts.
 */
export class Store<S extends object> {
  state: S
  private listeners = new Set<() => void>()
  private timers: ReturnType<typeof setTimeout>[] = []
  private intervals: ReturnType<typeof setInterval>[] = []

  constructor(initial: S) {
    this.state = initial
  }

  setState = (patch: Partial<S> | ((current: S) => Partial<S>)) => {
    const next = typeof patch === "function" ? patch(this.state) : patch
    this.state = { ...this.state, ...next }
    this.listeners.forEach((listener) => listener())
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.state

  later(fn: () => void, ms: number) {
    const timer = setTimeout(fn, ms)
    this.timers.push(timer)
    return timer
  }

  every(fn: () => void, ms: number) {
    const interval = setInterval(fn, ms)
    this.intervals.push(interval)
    return interval
  }

  /** The prototype's "clear every pending timer", used when a run restarts. */
  clearTimers() {
    this.timers.forEach((timer) => clearTimeout(timer))
    this.timers = []
  }

  dispose() {
    this.clearTimers()
    this.intervals.forEach((interval) => clearInterval(interval))
    this.intervals = []
    this.listeners.clear()
  }
}
