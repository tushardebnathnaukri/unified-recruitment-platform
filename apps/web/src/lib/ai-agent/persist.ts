import { initialState, type AgentState } from "@/lib/ai-agent/controller"

/**
 * The variant's progress, kept in THIS BROWSER per Agent conversation —
 * `agent:ai-agent:<session id>` in localStorage. It is not a turn and not on
 * the AI server: the prototype's state is a hundred fields of its own, and
 * the conversation's turns only say that a posting began. So a reload keeps
 * the work and a shared link opens on the brief screen. Every read and write
 * is guarded, because storage can be blocked.
 */
const PREFIX = "agent:ai-agent:"

export function loadAgentState(sessionId: string | null): AgentState {
  if (!sessionId) return initialState()
  try {
    const raw = localStorage.getItem(PREFIX + sessionId)
    if (!raw) return initialState()
    return settle({
      ...initialState(),
      ...(JSON.parse(raw) as Partial<AgentState>),
    })
  } catch {
    return initialState()
  }
}

export function saveAgentState(sessionId: string | null, state: AgentState) {
  if (!sessionId) return
  try {
    localStorage.setItem(PREFIX + sessionId, JSON.stringify(state))
  } catch {
    /* storage blocked: the work lasts as long as the tab */
  }
}

/**
 * Timers do not survive a reload, so anything that was mid-animation is
 * brought to where it was going: a step still "filling" is revealed, a
 * dictation or call is stopped, an auto-advance countdown is dropped.
 */
function settle(state: AgentState): AgentState {
  const revealed = { ...(state.revealed || {}) }
  if (state.filling && state.phase) revealed[state.phase] = true
  return {
    ...state,
    filling: false,
    revealed,
    thinkStep: state.filling ? state.thinkSteps.length : state.thinkStep,
    recording: false,
    vn: state.vn === "rec" || state.vn === "processing" ? "idle" : state.vn,
    call: null,
    transit: 0,
    notice: "",
    convN: state.revealed?.addl ? 2 : state.convN,
  }
}
