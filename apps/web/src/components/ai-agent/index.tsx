import * as React from "react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { toast } from "@workspace/ui/components/toast"
import { BRANDS } from "@workspace/ui/lib/brands"

import { AgentBrief } from "@/components/ai-agent/brief"
import { AgentDone, AgentPreview } from "@/components/ai-agent/finish"
import { AgentReview } from "@/components/ai-agent/review"
import { AgentContext } from "@/components/ai-agent/shared"
import { AgentTopBar } from "@/components/ai-agent/top-bar"
import { AgentController } from "@/lib/ai-agent/controller"
import { loadAgentState, saveAgentState } from "@/lib/ai-agent/persist"

/**
 * "AI Agent (V2.3)" — a peer's job-posting prototype, ported into this design
 * system as a sixth "Post a job" variant (`lib/posting-variant.ts`).
 *
 * IT KEEPS ITS OWN LOGIC. Brief, role details, JD, screening, targeting,
 * sample candidates, review and "choose how to source" all run on the
 * prototype's canned roles and rules (`lib/ai-agent/`), carried over method
 * by method — not on this app's posting state or readers — so the variant
 * shows its author's design rather than ours. The conversation's turns only
 * say that a posting began; the work itself is kept in this browser per
 * conversation (`lib/ai-agent/persist.ts`).
 *
 * `initialBrief` is the sentence that started the posting when it already
 * described a role ("hire an FMCG product manager in Delhi"): it lands in
 * the brief box, ready to send, instead of being asked for again.
 */
export function AiAgentFlow({
  sessionId,
  initialBrief,
}: {
  sessionId: string | null
  initialBrief?: string
}) {
  const { brand } = useBrand()
  const brandName = BRANDS.find((entry) => entry.id === brand)?.label ?? brand

  const [agent] = React.useState(() => {
    const controller = new AgentController(loadAgentState(sessionId))
    const { stage, note } = controller.state
    if (initialBrief && stage === "start" && !note)
      controller.setState({ note: initialBrief })
    return controller
  })
  const state = React.useSyncExternalStore(
    agent.subscribe,
    agent.getSnapshot,
    agent.getSnapshot
  )

  React.useEffect(() => {
    agent.setNoticeHandler((message) => toast.add({ title: message }))
    return () => {
      agent.setNoticeHandler(null)
      agent.dispose()
    }
  }, [agent])

  React.useEffect(() => {
    saveAgentState(sessionId, state)
  }, [sessionId, state])

  // `poolFor` reads the must/good buckets as module state, as the prototype
  // did; they are refreshed from the controller before anything derives.
  agent.syncBuckets()

  const value = React.useMemo(
    () => ({ agent, state, brandName }),
    [agent, state, brandName]
  )

  return (
    <AgentContext.Provider value={value}>
      <div className="flex min-h-0 flex-1 flex-col">
        <AgentTopBar />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {state.stage === "start" ? (
            <AgentBrief />
          ) : state.stage === "review" ? (
            <AgentReview />
          ) : state.stage === "preview" ? (
            <AgentPreview />
          ) : (
            <AgentDone />
          )}
        </div>
      </div>
    </AgentContext.Provider>
  )
}
