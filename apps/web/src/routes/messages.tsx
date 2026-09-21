import * as React from "react"
import { useSearchParams } from "react-router"
import { MessageCircleIcon } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { cn } from "@workspace/ui/lib/utils"
import { useMessages } from "@/components/messages-provider"
import { Thread, ThreadList } from "@/components/message-thread"
import { photoOf } from "@/lib/messages"

/**
 * Messages, as a page rather than a dock in the corner.
 *
 * IT WAS A FLOATING PANEL, and the corner stopped being free: Athena took the
 * column beside it, the launcher had to dodge her, and a 26rem panel is a
 * poor place to read a conversation you are about to reply to. A thread is a
 * document like a CV is, so it gets the room a document gets and a place in
 * the nav you can point somebody at.
 *
 * THE OPEN THREAD IS `?thread=`, like every other piece of state on this
 * product that is worth showing somebody. `openThread` on the provider
 * navigates here, so Athena's draft cards, the selection bar's Message action
 * and the candidate page's Message button all land on the right conversation
 * without knowing anything about this page.
 *
 * TWO COLUMNS ABOVE `@3xl`, one below — the split view's bargain. Narrow, the
 * list and the thread take turns and the thread's own back arrow returns to
 * the list; wide, the list stays beside it and the arrow goes, because there
 * is nothing to go back to when it never left.
 */
export function MessagesPage() {
  const [params, setParams] = useSearchParams()
  const { conversations, threads, openThread, send } = useMessages()
  const [query, setQuery] = React.useState("")

  const activeId = params.get("thread")
  const active = conversations.find(
    (conversation) => conversation.id === activeId
  )

  return (
    <div className="px-4 lg:px-6">
      {/* The same height sum the split view uses: everything above this is the
          header and the page's own top gutter, and the columns scroll inside
          rather than the page scrolling past them. */}
      <div className="flex h-[calc(100svh-var(--header-height)---spacing(12))] overflow-hidden rounded-2xl border border-border bg-card">
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col @3xl/main:w-80 @3xl/main:flex-none @3xl/main:border-r @3xl/main:border-border",
            // Below the breakpoint the list steps aside for the open thread.
            active && "hidden @3xl/main:flex"
          )}
        >
          <ThreadList
            query={query}
            onQueryChange={setQuery}
            onOpenThread={openThread}
          />
        </div>

        <div
          className={cn(
            "min-w-0 flex-1 flex-col",
            active ? "flex" : "hidden @3xl/main:flex"
          )}
        >
          {active ? (
            <Thread
              key={active.id}
              id={active.id}
              title={active.name}
              subtitle={active.role}
              initials={active.initials}
              photo={photoOf(active)}
              online={active.online}
              messages={threads[active.id] ?? []}
              onBack={() => setParams({}, { replace: true })}
              onSend={(body) => send(active.id, body)}
            />
          ) : (
            <Empty className="m-auto">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageCircleIcon />
                </EmptyMedia>
                <EmptyTitle>No conversation open</EmptyTitle>
                <EmptyDescription>
                  Pick somebody on the left. Drafts Athena wrote are waiting in
                  their own threads, marked "Draft:".
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>
    </div>
  )
}
