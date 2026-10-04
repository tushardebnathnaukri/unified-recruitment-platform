import * as React from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import {
  ChevronRightIcon,
  CircleCheckIcon,
  ListChecksIcon,
  SparklesIcon,
  MessageCircleIcon,
  XIcon,
  ArrowRightLeftIcon,
  LockIcon,
  LockOpenIcon,
  Undo2Icon,
  UsersIcon,
} from "lucide-react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import type { Brand } from "@workspace/ui/lib/brands"
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble"
import { Button } from "@workspace/ui/components/button"
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@workspace/ui/components/marker"
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@workspace/ui/components/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@workspace/ui/components/message-scroller"
import { Spinner } from "@workspace/ui/components/spinner"
import { toast } from "@workspace/ui/components/toast"
import { cn } from "@workspace/ui/lib/utils"

import { AgentComposer } from "@/components/agent-composer"
import { Aura, AuraStill } from "@/components/aura"
import { StatTiles, WorkSections } from "@/components/overview"
import { AgentQuestionnaire } from "@/components/agent-questionnaire"
import { AgentBlocks } from "@/components/agent-reply"
import { PostingFormPanel } from "@/components/posting-form-panel"
import { PostingWizard } from "@/components/posting-wizard"
import { AiAgentFlow } from "@/components/ai-agent"
import { PostingStatusCard } from "@/components/posting-status-card"
import { PlanBar, PostingRail } from "@/components/posting-rail"
import { ChatV3Rail } from "@/components/chat-v3/rail"
import { HiringManagerNote } from "@/components/chat-v3/note"
import { useCollapseNav } from "@/components/use-collapse-nav"
import {
  answersFor,
  CARDS,
  HERO_ACTIONS,
  heroExamples,
  ROUTE_IDS,
  routeHint,
  askAssist,
  askLabel,
  modeHint,
  decodeAsk,
  encodeAsk,
  skillFor,
  type Answer,
  type Block,
  type WorkStep,
  attachmentIn,
} from "@/lib/agent"
import { routeWithAi, type RouteDecision } from "@/lib/agent-route-ai"
import { composeAssist, type ComposeAssist } from "@/lib/job-compose"
import { useAgentLandingVariant } from "@/lib/agent-landing-variant"
import { usePostingVariant } from "@/lib/posting-variant"
import {
  FIELD_LABEL,
  FILTER_LABEL,
  decodeFilter,
  decodeLock,
  decodeNote,
  provenanceFor,
} from "@/lib/chat-v3"
import { useSelectionCriteria } from "@/lib/selection-criteria"
import {
  isSessionId,
  localTurns,
  newSessionId,
  remoteTurns,
  saveSession,
  sessionPath,
} from "@/lib/agent-sessions"
import { dictationVocabulary } from "@/lib/dictation"
import { describesRole, openerChecks } from "@/lib/job-start"
import { railFor, searchRailFor } from "@/lib/posting-rail"
import { searchChangeItem, SEARCH_LABELS } from "@/lib/search-intake"
import { play } from "@/lib/sound"
import type { IntakeState } from "@/lib/job-intake"
import { advanceWithAi } from "@/lib/job-intake-ai"
import {
  changeItem,
  decodeAnswers,
  decodeChange,
  encodeChange,
  LABELS,
  type RefineId,
} from "@/lib/job-refine"
import type { FieldId } from "@/lib/job-intake"

/**
 * The Agent — one box, and the whole product behind it.
 *
 * THE PAGE OPENS AS AN INVITATION, NOT AS AN EMPTY THREAD. A chat screen that
 * starts blank asks the recruiter to guess what it knows, and the guesses are
 * always either too small ("show me my jobs") or far too large. So the first
 * state is a hero: six cards naming the six things it can do, each carrying an
 * example rather than a category. The
 * moment anything is asked the hero goes and the transcript takes the screen —
 * the same box, now at the bottom of a conversation.
 *
 * A CONVERSATION IS ITS TURNS, AND ITS LINK IS AN ID. Every answer is
 * computed from the prompts and the brand's own data at the moment it is drawn
 * (see `lib/agent.ts`), so the list of questions IS the conversation. The
 * list lives under a short id (`lib/agent-sessions.ts`) — kept in this browser
 * and on the AI server — and the address is `/dashboard/c/<id>`, so a reply worth
 * showing someone is still a link they can open, just not a paragraph long.
 * It used to be the turns themselves, `?ask=` once per turn; such a link still
 * opens, and becomes a session as it does.
 *
 * THE FACE IS THE AURA FROM `avatar-kit/` (`components/aura.tsx`). It is not
 * named on this screen and the older copilot is untouched — whether these are
 * one assistant with two front doors or two different things is a product
 * question, and a name would answer it before the design team has.
 */

/** Long enough to read as listening, short enough not to be waiting. */
const THINKING_MS = 450

/** What an old, pre-session link carried: the turns, one `?ask=` each. */
const LEGACY_ASK = "ask"

type Session = {
  id: string | null
  turns: string[]
  /** `loading` — waiting on the server's copy; `missing` — nobody has one. */
  status: "ready" | "loading" | "missing"
}

function sessionFor(id: string | null): Session {
  if (!id) return { id: null, turns: [], status: "ready" }
  const local = localTurns(id)
  return local
    ? { id, turns: local, status: "ready" }
    : { id, turns: [], status: "loading" }
}

export function AgentPage() {
  const { brand } = useBrand()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { id: routeId } = useParams()
  const id = isSessionId(routeId) ? routeId : null

  /**
   * THE TURNS, AND WHOSE THEY ARE. This browser's copy is read at once, so a
   * reload or "Back to the chat" draws with no wait; the server's copy is
   * asked for below, and wins when it has more — somebody else's link, or
   * this conversation continued in another tab. Following the route id is
   * derived during render, like the rest of this page's state.
   */
  const [session, setSession] = React.useState<Session>(() => sessionFor(id))
  if (id && session.id !== id) setSession(sessionFor(id))
  const sessionRef = React.useRef(session)
  React.useEffect(() => {
    sessionRef.current = session
  }, [session])

  React.useEffect(() => {
    if (!id) return
    let live = true
    void remoteTurns(id).then((remote) => {
      const current = sessionRef.current
      if (!live || current.id !== id) return
      if (remote && remote.length > current.turns.length) {
        setSession({ id, turns: remote, status: "ready" })
        saveSession(id, remote)
      } else if (current.status === "loading") {
        setSession({ ...current, status: "missing" })
      } else if (remote === null && current.turns.length) {
        // The server lost it (a redeploy) but this browser has it: put it back.
        saveSession(id, current.turns)
      }
    })
    return () => {
      live = false
    }
  }, [id])

  // An old `?ask=` link: the same turns, moved into a session, and the
  // address replaced so the next link copied is the short one.
  const legacy = id ? [] : params.getAll(LEGACY_ASK)
  const legacyKey = legacy.join("\u0000")
  React.useEffect(() => {
    if (!legacyKey) return
    const turns = legacyKey.split("\u0000")
    const next = newSessionId()
    // Saved first, so the session page reads it from this browser at once.
    saveSession(next, turns)
    navigate(sessionPath(next), { replace: true })
  }, [legacyKey, navigate])

  const asked = id ? (session.id === id ? session.turns : []) : legacy
  const started = asked.length > 0 || Boolean(id)
  const { variant: landing } = useAgentLandingVariant()
  // A conversation wants the room at every width — the transcript plus the
  // posting rail beside it. The landing keeps the nav; its cards fit.
  useCollapseNav(started ? "all" : null)

  /**
   * The transcript, as one comparable value.
   *
   * `getAll` builds a fresh array every render, so it cannot be a dependency
   * of anything — the memo below and the beat above both key on this instead.
   * It is the same reason the filter arrays elsewhere in here key on `.join()`.
   */
  const transcript = asked.join("\u0000")

  /**
   * The last reply is held back for a beat, so an answer does not land in the
   * same frame as the question and read as a form validating.
   *
   * The state is WHICH TRANSCRIPT has settled, not how many turns have — a
   * count cannot tell a new question from a back button, and the effect ended
   * up setting state synchronously to cover the difference. Comparing the
   * transcript itself means one beat per change, whichever direction it came
   * from, and a reload settles instantly because the initial state is already
   * the transcript in the URL.
   */
  const [settled, setSettled] = React.useState(transcript)
  const thinking = settled !== transcript
  React.useEffect(() => {
    if (settled === transcript) return
    const timer = setTimeout(() => setSettled(transcript), THINKING_MS)
    return () => clearTimeout(timer)
  }, [transcript, settled])

  // Asked in THIS visit — a reply to it pops; a transcript rebuilt from a
  // link or a reload arrives silently, because nobody is waiting for it.
  const askedHere = React.useRef(false)
  // Takes the newest turn back — a hiring manager's note undone while it is
  // still the last thing said. The conversation is its turns, so this is all
  // an undo needs to be.
  const unsay = () => {
    if (!id || session.id !== id || !asked.length) return
    const turns = asked.slice(0, -1)
    setSession({ ...session, turns })
    saveSession(id, turns)
  }
  const ask = (prompt: string) => {
    askedHere.current = true
    const turns = [...asked, prompt]
    if (id && session.id === id) {
      setSession({ ...session, turns })
      saveSession(id, turns)
      return
    }
    // The first question: the conversation gets its id, and its address.
    const next = newSessionId()
    saveSession(next, turns)
    setSession({ id: next, turns, status: "ready" })
    navigate(sessionPath(next))
  }

  /**
   * What has been read this session, by filename.
   *
   * THE ONE THING ON THIS PAGE THAT IS NOT IN THE URL, because a file cannot
   * be. The turn still goes in the link — the question survives — and this is
   * the reading, which does not: open the link tomorrow and that turn says the
   * file did not travel. A value of `null` is a file whose format the browser
   * cannot turn into words, which is a different answer from one that was
   * never here.
   */
  const [files, setFiles] = React.useState<Record<string, string | null>>({})

  /**
   * What each posting answer was read as — by Gemini, or by the rules when it
   * is not there. A CACHE OF THE URL, NOT A SECOND TRANSCRIPT: every entry is
   * keyed by the turns that produced it, so reopening a link re-reads them in
   * order and a reload in the same tab reads nothing twice (sessionStorage).
   */
  const [readings, setReadings] =
    React.useState<Record<string, IntakeState>>(loadReadings)

  /**
   * Where each sentence the keywords could not route was sent — by Gemini, or
   * by the rules standing in. The same kind of cache as `readings`, keyed by
   * the sentence alone, because where it goes does not depend on the turns
   * before it.
   */
  const [routes, setRoutes] =
    React.useState<Record<string, RouteDecision>>(loadRoutes)

  // Whether a posting asks for Selection criteria (/settings). Read here and
  // folded into the conversation, so every layout below agrees.
  const { enabled: criteria } = useSelectionCriteria()
  // Which layout a posting is drawn in — and, for Chat v3, how it is read.
  const { variant: postingVariant } = usePostingVariant()
  const v3 = postingVariant === "rail3"

  // Answered as a whole rather than turn by turn: a reply inside the posting
  // conversation depends on the turns before it (see `answersFor`).
  const {
    turns,
    pending,
    pendingRoute,
    routable,
    posting,
    search,
    flow,
    provenance,
    prompts,
    states,
  } = React.useMemo(() => {
    const prompts = transcript ? transcript.split("\u0000") : []
    const {
      answers,
      pending,
      pendingRoute,
      routable,
      posting,
      search,
      flow,
      states,
    } = answersFor(prompts, brand, files, readings, {
      criteria,
      suggest: v3,
      routes,
    })
    return {
      pending,
      pendingRoute,
      routable,
      posting,
      search,
      flow,
      prompts,
      states,
      provenance: v3
        ? provenanceFor(
            prompts,
            states,
            (prompt) => attachmentIn(prompt) !== null
          )
        : null,
      turns: prompts.map((prompt, index) => ({
        id: `${index}-${prompt}`,
        prompt,
        answer: answers[index],
      })),
    }
  }, [transcript, brand, files, readings, criteria, v3, routes])

  // Read the first unread posting answer. One at a time and in order, because
  // each is read against the draft the one before it left — `answersFor`
  // only ever reports the first. The ref stops a re-render (or Strict Mode's
  // double effect) sending the same answer twice while it is in flight.
  const reading = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!pending || reading.current === pending.key) return
    reading.current = pending.key
    const { key, state, input } = pending
    // Timed here, around the whole call, so the work step says how long the
    // recruiter actually waited — network included — not only the model.
    const started = performance.now()
    void advanceWithAi(state, input, brand).then((result) => {
      const took = Math.round(performance.now() - started)
      setReadings((current) => {
        const next = { ...current, [key]: { ...result, took } }
        saveReadings(next)
        return next
      })
    })
  }, [pending, brand])

  // Route the first sentence the keywords could not, the same way: one at a
  // time, in order, guarded against a second send while one is in flight.
  const routing = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!pendingRoute || routing.current === pendingRoute.prompt) return
    routing.current = pendingRoute.prompt
    const { prompt, tied } = pendingRoute
    const started = performance.now()
    void routeWithAi(prompt, tied, ROUTE_IDS).then((decision) => {
      const took = Math.round(performance.now() - started)
      setRoutes((current) => {
        const next = { ...current, [prompt]: { ...decision, took } }
        saveRoutes(next)
        return next
      })
    })
  }, [pendingRoute])

  /**
   * THE LIVE CARD, IF THERE IS ONE. The newest turn's questionnaire, once its
   * reply is on screen — it is docked in the composer's place rather than
   * drawn in the transcript. `closed` is the turn whose card was dismissed;
   * a new turn brings a new card up on its own.
   */
  const last = turns[turns.length - 1]

  // The reply's pop: once per turn, when its answer is on screen, and only
  // while the tab is being looked at.
  const landed = last?.answer && !thinking ? last.id : null
  const announced = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!landed || landed === announced.current) return
    announced.current = landed
    if (askedHere.current && document.visibilityState === "visible") play("pop")
  }, [landed])
  const docked =
    last?.answer && !thinking
      ? last.answer.blocks.find(
          (block): block is Extract<Block, { kind: "questionnaire" }> =>
            block.kind === "questionnaire"
        )
      : undefined
  const [closed, setClosed] = React.useState<string | null>(null)

  // The rail beside a posting conversation: the steps, what has been
  // gathered, and how many people it would find. Only while there is one.
  // Whichever conversation started last owns the rail.
  const rail = React.useMemo(
    () =>
      flow === "search" && search
        ? searchRailFor(search, brand)
        : flow === "posting" && posting
          ? railFor(posting, brand)
          : null,
    [flow, search, posting, brand]
  )
  // What the form beside the chat still needs — for the chat's status card.
  const [formMissing, setFormMissing] = React.useState<string[]>([])
  const showCard = Boolean(docked && last && closed !== last.id)

  // "Form beside chat" (`lib/posting-variant.ts`): the post-a-job form takes
  // the rail's place on the left and the chat becomes a column on the right.
  // Only while there is a posting to fill; any other question is the plain
  // conversation either way. "Chat, then form" is the same layout, entered
  // only once the posting is gathered — the rail while it asks, the form
  // at "Review and post".
  const formBeside =
    flow === "posting" &&
    posting !== null &&
    rail !== null &&
    (postingVariant === "form" ||
      (postingVariant === "hybrid" && posting.stage === "done"))
  // What the form beside the chat still needs, and whether the chat is
  // tucked away to give the form the width — both cues from Hiremate's
  // assistant: its last card is the form's submit, and it can be hidden.
  // "Chat with rail v2": the plan across the top, the rail without it — and
  // the questions asked IN the transcript, at the end of the reply that asks
  // them, rather than docked where the box is. The box stays a plain reply
  // box. A change card from the rail's pencil is a side action and still
  // docks.
  // Chat v3 is v2's layout with more on it, so both flags hold for it too.
  const planBar = (postingVariant === "rail2" || v3) && rail !== null
  const inlineCards = postingVariant === "rail2" || v3
  const [chatHidden, setChatHidden] = React.useState(false)
  // Chat v3: the finish card asks the rail to show who the posting finds.
  const [openView, setOpenView] = React.useState<string | null>(null)

  /**
   * A CHANGE FROM THE RAIL: one question, asked again in the composer's
   * place, over whatever card was there. `key` makes each press a fresh
   * card, so a second pencil on the same row starts from the answer as it
   * is now rather than from a half-edited one. Submit sends a change turn
   * (`encodeChange`) and the reply re-docks whatever was being asked.
   */
  // A change belongs to the conversation it was opened in: tagged with its
  // id, and treated as none once the page shows another — otherwise a card
  // opened on one posting sat over the first question of the next.
  const [edit, setEditing] = React.useState<{
    id: string
    key: number
    session: string | null
  } | null>(null)
  const editing = edit && edit.session === id ? edit : null
  const editItem = React.useMemo(() => {
    if (!editing) return null
    if (flow === "search" && search)
      return searchChangeItem(editing.id, search, brand)
    if (flow === "posting" && posting)
      return changeItem(
        editing.id as FieldId | RefineId | "screening",
        posting,
        brand
      )
    return null
  }, [editing, flow, search, posting, brand])
  // The status card takes the composer's place once the posting is gathered
  // and nothing else is being asked.
  const statusCard = Boolean(
    formBeside && posting?.stage === "done" && !editing && !docked
  )
  // What the transcriber should expect if the recruiter dictates next.
  const vocabulary = React.useMemo(
    () => dictationVocabulary(brand, posting),
    [brand, posting]
  )

  // The box says what the conversation is waiting for, when it is a JD.
  const waitingForJd = Boolean(
    posting?.stage === "posting" && posting.opener && posting.origin === "jd"
  )
  // The opener's checklist, ticked as the recruiter types.
  const checklist = React.useCallback(
    (text: string) => openerChecks(text, brand),
    [brand]
  )

  // …and an example of a good opening answer, where it can be read rather
  // than tapped, while the from-scratch question waits.
  // …and for a search, the same, in its own words.
  const waitingForSearch = flow === "search" && search?.stage === "opener"
  const waitingForRole = Boolean(
    posting?.stage === "posting" &&
    posting.opener &&
    posting.origin === "scratch"
  )

  const attach = (file: { name: string; text: string | null }) =>
    setFiles((current) => ({ ...current, [file.name]: file.text }))

  if (!started)
    return landing === "chat" ? (
      <ChatLanding onAsk={ask} onAttach={attach} />
    ) : (
      <Landing onAsk={ask} onAttach={attach} />
    )

  if (id && session.id === id && session.status !== "ready")
    return <SessionState status={session.status} />

  // "AI Agent (V2.3)" (`lib/posting-variant.ts`): a peer's prototype, ported.
  // It takes over the posting from its own brief screen and keeps its own
  // logic, so only the start of the posting is read from the turns — and a
  // first sentence that already describes the role becomes its brief.
  // The first sentence, as said — a Create Job turn carries it inside.
  const opener = turns[0]
    ? (decodeAsk(turns[0].prompt)?.text ?? turns[0].prompt)
    : null
  if (postingVariant === "agent" && flow === "posting")
    return (
      <div className="-mt-4 -mb-4 flex h-[calc(100svh-var(--header-height))] flex-col md:-mt-6 md:-mb-6 md:h-svh">
        <AiAgentFlow
          key={id ?? "new"}
          sessionId={id}
          initialBrief={
            opener && describesRole(opener, brand) ? opener : undefined
          }
        />
      </div>
    )

  // "Chat alt" (`lib/posting-variant.ts`): the posting as an onboarding —
  // one question at a time on the left, the tracker of every question on
  // the right. The same turns; only how they are asked differs.
  if (postingVariant === "wizard" && flow === "posting" && posting && rail)
    return (
      <div className="-mt-4 -mb-4 flex h-[calc(100svh-var(--header-height))] flex-col md:-mt-6 md:-mb-6 md:h-svh">
        <PostingWizard
          posting={posting}
          brand={brand}
          answer={last?.answer}
          thinking={thinking}
          docked={docked}
          editItem={editing ? editItem : null}
          people={rail.people}
          vocabulary={vocabulary}
          checklist={checklist}
          waitingForJd={waitingForJd}
          waitingForRole={waitingForRole}
          onAsk={ask}
          onAttach={attach}
          onEdit={(field) =>
            setEditing({ id: field, key: Date.now(), session: id })
          }
          onCancelEdit={() => setEditing(null)}
        />
      </div>
    )

  return (
    // The conversation owns the screen below the header: a transcript that
    // scrolls and a box that does not. `-mt-4 md:-mt-6` takes back the shell's
    // own vertical rhythm, which is why the height subtracts only the header.
    // BOTH ENDS OF THE SHELL'S PADDING ARE TAKEN BACK. The shell pads the
    // page `py-4 md:py-6`; cancelling only the top left the view 24px taller
    // than the screen, so the whole page scrolled and the header slid away
    // under the docked card. The split view cancels its bottom the same way.
    // From `md` up the shell draws no header here at all (`bare` in
    // `app-shell.tsx`), so the conversation takes the whole height.
    <div className="-mt-4 -mb-4 flex h-[calc(100svh-var(--header-height))] flex-col md:-mt-6 md:-mb-6 md:h-svh">
      <div className="flex min-h-0 flex-1">
        {/* The form, where there is room for both; below that the chat is the
          page, as it is under the rail variant. */}
        {formBeside && posting && rail ? (
          // Keyed on the variant so the hybrid's arrival — the rail giving
          // way to the form — plays the entrance once, not on every render.
          <div
            key={postingVariant}
            className="hidden h-full min-w-0 flex-1 @3xl/main:block @3xl/main:animate-in @3xl/main:duration-300 @3xl/main:fade-in @3xl/main:slide-in-from-left-4"
          >
            <PostingFormPanel
              posting={posting}
              people={rail.people}
              reading={Boolean(pending)}
              onAsk={ask}
              onStatus={setFormMissing}
            />
          </div>
        ) : null}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            // Beside the form it is a panel, not a column: white, lifted off
            // the page by a shadow rather than ruled off by a border.
            formBeside &&
              "@3xl/main:w-[26rem] @3xl/main:flex-none @3xl/main:bg-background @3xl/main:shadow-[-4px_0_24px_rgba(9,30,66,0.06)]",
            formBeside && chatHidden && "@3xl/main:hidden"
          )}
        >
          {/* The plan, inside the chat: the conversation's progress. */}
          {planBar && rail ? (
            <PlanBar steps={rail.steps} reading={Boolean(pending)} />
          ) : null}
          {formBeside ? (
            <div className="hidden items-center gap-3 border-b px-4 py-3 @3xl/main:flex">
              <Aura size={32} state={pending ? "thinking" : "idle"} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Posting assistant</p>
                <p
                  className="truncate text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  {pending ? "Reading your answer…" : rail?.status}
                </p>
              </div>
              <button
                type="button"
                aria-label="Hide the chat"
                onClick={() => setChatHidden(true)}
                className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          ) : null}
          <MessageScrollerProvider autoScroll defaultScrollPosition="end">
            <MessageScroller className="min-h-0 flex-1">
              <MessageScrollerViewport>
                <MessageScrollerContent className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6">
                  {turns.map((turn, index) => {
                    // The newest turn waits for the beat; ANY turn waits while it is
                    // being read — which, on a link opened cold, is every posting
                    // answer in turn.
                    const waiting =
                      turn.answer === null ||
                      (thinking && index === turns.length - 1)
                    const answer = turn.answer
                    // The live card, at the end of the newest turn — after a
                    // reply, or under a marker, which asks nothing new.
                    const inlineCard =
                      inlineCards && index === turns.length - 1 && docked ? (
                        <div className="mt-3 w-full">
                          {showCard ? (
                            <AgentQuestionnaire
                              key={turn.id}
                              items={docked.items}
                              submit={docked.submit}
                              form={docked.form}
                              postNow={docked.postNow}
                              postNowLabel={docked.postNowLabel}
                              onAsk={ask}
                              onClose={() => setClosed(turn.id)}
                            />
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setClosed(null)}
                            >
                              <ListChecksIcon data-icon="inline-start" />
                              Answer the questions
                            </Button>
                          )}
                        </div>
                      ) : null
                    // A lock is a marker in the transcript, not a message:
                    // nothing was said, only what the agent may change.
                    const lock = decodeLock(turn.prompt)
                    const filterMove = decodeFilter(turn.prompt)
                    // Outside Chat v3 its own turns are not drawn at all:
                    // nothing there applies them.
                    if ((lock || filterMove) && !v3)
                      return inlineCard ? (
                        <MessageScrollerItem key={turn.id} messageId={turn.id}>
                          {inlineCard}
                        </MessageScrollerItem>
                      ) : null
                    if (filterMove)
                      return (
                        <MessageScrollerItem key={turn.id} messageId={turn.id}>
                          <Marker className="my-1">
                            <MarkerIcon>
                              <ArrowRightLeftIcon />
                            </MarkerIcon>
                            <MarkerContent>
                              {filterMove.to === "none"
                                ? `Removed ${FILTER_LABEL[filterMove.id].toLowerCase()}`
                                : `${FILTER_LABEL[filterMove.id]} is now a ${
                                    filterMove.to === "must"
                                      ? "must-have"
                                      : "good-to-have"
                                  }`}
                            </MarkerContent>
                          </Marker>
                          {inlineCard}
                        </MessageScrollerItem>
                      )
                    if (lock)
                      return (
                        <MessageScrollerItem key={turn.id} messageId={turn.id}>
                          <Marker className="my-1">
                            <MarkerIcon>
                              {lock.on ? <LockIcon /> : <LockOpenIcon />}
                            </MarkerIcon>
                            <MarkerContent>
                              {lock.on ? "Locked" : "Unlocked"}{" "}
                              {FIELD_LABEL[lock.field].toLowerCase()}
                              {lock.on ? ": the agent won't change it" : ""}
                            </MarkerContent>
                          </Marker>
                          {inlineCard}
                        </MessageScrollerItem>
                      )
                    return (
                      <MessageScrollerItem
                        key={turn.id}
                        messageId={turn.id}
                        scrollAnchor
                      >
                        <div className="flex flex-col gap-4">
                          <Message align="end">
                            <MessageContent>
                              <Bubble align="end">
                                <BubbleContent>
                                  <Prompt prompt={turn.prompt} />
                                </BubbleContent>
                              </Bubble>
                            </MessageContent>
                          </Message>

                          {waiting || !answer ? (
                            <Marker>
                              <MarkerIcon>
                                <Spinner />
                              </MarkerIcon>
                              <MarkerContent>
                                {pendingRoute?.index === index
                                  ? "Working out what you mean…"
                                  : turn.answer === null
                                    ? "Reading your answer…"
                                    : "Working it out…"}
                              </MarkerContent>
                            </Marker>
                          ) : (
                            <>
                              {answer.step ? (
                                <WorkStepRow step={answer.step} />
                              ) : null}
                              <Message>
                                <Head live={index === turns.length - 1} />
                                <MessageContent>
                                  {formBeside ? (
                                    // In the narrow panel the reply is plain
                                    // text, as an assistant's is; the bubble
                                    // was the width it does not have.
                                    <div className="px-1 py-1.5 text-sm leading-relaxed">
                                      <Said answer={answer} />
                                    </div>
                                  ) : (
                                    <Bubble variant="secondary">
                                      <BubbleContent>
                                        <Said answer={answer} />
                                      </BubbleContent>
                                    </Bubble>
                                  )}
                                  <div className="mt-1 w-full">
                                    <AgentBlocks
                                      // The finish card's posting block is the
                                      // form's job when the form is beside it.
                                      blocks={
                                        formBeside
                                          ? answer.blocks.filter(
                                              (block) =>
                                                block.kind !== "posting"
                                            )
                                          : answer.blocks
                                      }
                                      onAsk={ask}
                                      live={index === turns.length - 1}
                                    />
                                  </div>
                                  {v3 &&
                                  index === turns.length - 1 &&
                                  answer.blocks.some(
                                    (block) => block.kind === "posting"
                                  ) ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2 hidden @3xl/main:inline-flex"
                                      onClick={() =>
                                        setOpenView(`candidates#${Date.now()}`)
                                      }
                                    >
                                      <UsersIcon data-icon="inline-start" />
                                      See who this finds
                                    </Button>
                                  ) : null}
                                  {v3 &&
                                  index === turns.length - 1 &&
                                  decodeNote(turn.prompt) !== null ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="mt-1"
                                      onClick={unsay}
                                    >
                                      <Undo2Icon data-icon="inline-start" />
                                      Undo these changes
                                    </Button>
                                  ) : null}
                                  {v3 &&
                                  index === turns.length - 1 &&
                                  flow === "posting" &&
                                  posting &&
                                  (posting.stage === "refine" ||
                                    posting.stage === "screen") &&
                                  !prompts.some(
                                    (prompt) => decodeNote(prompt) !== null
                                  ) ? (
                                    <div className="mt-3 w-full">
                                      <HiringManagerNote
                                        vocabulary={vocabulary}
                                        onAsk={ask}
                                      />
                                    </div>
                                  ) : null}
                                  {inlineCard}
                                </MessageContent>
                              </Message>
                            </>
                          )}
                        </div>
                      </MessageScrollerItem>
                    )
                  })}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>

          {/* No band of its own — no white fill, no rule above. The box and the
          card have their own edges, so the transcript's canvas runs under
          them and a strip around them would be a box drawn twice. */}
          <div>
            <div className="mx-auto w-full max-w-3xl px-4 py-4 lg:px-6">
              {/* The card sits ON the reply box, not instead of it: answering the
              questions is the likeliest next thing, but saying something else
              should never take closing a card first. */}
              {editing && editItem ? (
                <AgentQuestionnaire
                  key={`edit-${editing.key}`}
                  items={[editItem]}
                  submit="Save"
                  encode={encodeChange}
                  onAsk={(prompt) => {
                    setEditing(null)
                    ask(prompt)
                  }}
                  onClose={() => setEditing(null)}
                />
              ) : !inlineCards && showCard && docked && last ? (
                <AgentQuestionnaire
                  // A new card is a new form: answers from the last one must not
                  // carry over into questions that happen to share a name.
                  key={last.id}
                  items={docked.items}
                  submit={docked.submit}
                  form={docked.form}
                  postNow={docked.postNow}
                  postNowLabel={docked.postNowLabel}
                  onAsk={ask}
                  onClose={() => setClosed(last.id)}
                />
              ) : !inlineCards && docked ? (
                // Closed, not answered: the questions are still open and typed
                // text is read against them, so the way back stays in view.
                <Button
                  variant="outline"
                  size="sm"
                  className="mb-2"
                  onClick={() => setClosed(null)}
                >
                  <ListChecksIcon data-icon="inline-start" />
                  Answer the questions
                </Button>
              ) : statusCard && posting ? (
                <PostingStatusCard
                  missing={formMissing}
                  search={rail?.people?.href}
                  onPost={() =>
                    toast.add({
                      title: `Ready to post: ${posting.draft.title}`,
                      description:
                        "Publishing isn't wired up in this prototype. This is where the posting would go to moderation.",
                    })
                  }
                />
              ) : null}
              {/* No suggestion row under the conversation: the `/` menu is the
              list of what it can do, and a permanent row of the same prompts
              would be the transcript's own furniture repeated. */}
              <AgentComposer
                vocabulary={vocabulary}
                checklist={waitingForRole ? checklist : undefined}
                route={routable ? routeHint : undefined}
                className={
                  (showCard && !inlineCards) || statusCard ? "mt-3" : undefined
                }
                placeholder={
                  showCard
                    ? "Or reply directly…"
                    : waitingForJd
                      ? "Paste the job description, or drop a PDF or Word doc here…"
                      : waitingForSearch
                        ? "e.g. Product managers in Pune, 8+ years, FMCG — brand strategy, P&L"
                        : waitingForRole
                          ? "e.g. Head of Marketing, Mumbai, 12+ years, FMCG — brand strategy, P&L, team leadership"
                          : undefined
                }
                onSubmit={ask}
                onAttach={attach}
              />
            </div>
          </div>
        </div>

        {/* Beside the conversation where there is room, and nowhere below that:
          on a narrow column the transcript already is the page. */}
        {/* The chat, tucked away: a pill in the corner brings it back. */}
        {formBeside && chatHidden ? (
          <button
            type="button"
            onClick={() => setChatHidden(false)}
            className="fixed right-6 bottom-6 z-30 hidden items-center gap-2 rounded-full border bg-background py-2 pr-4 pl-2 text-sm font-medium shadow-lg transition-colors hover:bg-muted @3xl/main:flex"
          >
            <Aura size={24} state={pending ? "thinking" : "idle"} />
            <MessageCircleIcon className="size-4 text-muted-foreground" />
            Open the chat
          </button>
        ) : null}

        {rail &&
        !formBeside &&
        v3 &&
        flow === "posting" &&
        posting &&
        provenance ? (
          <div className="hidden h-full @3xl/main:block">
            <ChatV3Rail
              model={rail}
              posting={posting}
              provenance={provenance}
              prompts={prompts}
              states={states}
              steps={turns.flatMap((turn) =>
                turn.answer?.step ? [turn.answer.step] : []
              )}
              brand={brand}
              openView={openView}
              reading={Boolean(pending)}
              onEdit={(field) =>
                setEditing({ id: field, key: Date.now(), session: id })
              }
              onAsk={ask}
            />
          </div>
        ) : rail && !formBeside ? (
          <div className="hidden h-full @3xl/main:block">
            <PostingRail
              model={rail}
              reading={Boolean(pending)}
              onEdit={(field) =>
                setEditing({ id: field, key: Date.now(), session: id })
              }
              plan={!planBar}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * A link to a conversation this browser does not have: waiting on the AI
 * server's copy, or neither has it — an id from before the preview was
 * redeployed, or the server is not running locally. Said plainly, with the way
 * on, rather than an empty landing that looks like the link was ignored.
 */
function SessionState({ status }: { status: "loading" | "missing" }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      {status === "loading" ? (
        <Marker>
          <MarkerIcon>
            <Spinner />
          </MarkerIcon>
          <MarkerContent>Opening the conversation…</MarkerContent>
        </Marker>
      ) : (
        <>
          <p className="text-base font-semibold">
            This conversation isn't here
          </p>
          <p className="text-sm text-muted-foreground">
            It isn't saved in this browser, and the AI server that keeps shared
            conversations doesn't have it — it may be from before the preview
            was last deployed.
          </p>
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            className="mt-2"
            render={<Link to="/dashboard" />}
          >
            Start a new conversation
          </Button>
        </>
      )}
    </div>
  )
}

/**
 * The work behind a posting reply, collapsed above it — "Read by Gemini in
 * 2.8s ›" — and opening onto exactly what that answer recorded. A native
 * `details`, because a disclosure is what it is and it needs no state.
 */
function WorkStepRow({ step }: { step: WorkStep }) {
  const who = step.by === "gemini" ? "Read by Gemini" : "Read by rules"
  const time =
    step.took && step.took >= 200 ? ` in ${(step.took / 1000).toFixed(1)}s` : ""
  return (
    <details className="group/step ml-10 text-xs text-muted-foreground">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md py-0.5 hover:text-foreground [&::-webkit-details-marker]:hidden">
        <CircleCheckIcon className="size-3.5" />
        {who}
        {time}
        {step.note ? ` · ${step.note}` : null}
        <ChevronRightIcon className="size-3.5 transition-transform group-open/step:rotate-90" />
      </summary>
      <div className="mt-2 mb-1 rounded-xl border bg-background px-3 py-2">
        {step.recorded.length ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {step.recorded.map((row) => (
              <div key={row.label} className="contents">
                <dt>{row.label}</dt>
                <dd className="min-w-0 text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>Nothing new was recorded from that answer.</p>
        )}
      </div>
    </details>
  )
}

/**
 * The chat landing: the Aura, the question, the action pills and one big box,
 * with the Dashboard's overview — tiles, Live jobs, Recent searches — under it.
 *
 * THE BOX IS THE INVITATION. The cards landing is an inventory first and a box
 * second; this one says hello, offers five shortcuts, and puts an example
 * question in the box — so the first thing it asks for is a sentence. Each
 * pill asks a question the agent answers (`HERO_ACTIONS`); nothing here is a
 * mock-up of a button.
 *
 * THE GLOW IS THE AURA'S OWN PALETTE, not a brand's — the same three colours
 * as the face above it (`lib/aura/presets.js`), so it does not turn orange on
 * hirist, and it is faint enough to sit behind either theme.
 */
/** The skills the chat landing draws as pills, lit rather than named in the box. */
const PILLS = HERO_ACTIONS.map((action) => action.skill)

/**
 * WHAT EACH PILL TURNS THE BOX INTO once pressed. Create Job and Search Resume
 * are described, so the box helps write the description — the parts it
 * covers ticked inside it, the next part offered under it (`composeAssist`).
 * Review applicants and Hiring Insights are asked, so the box offers their
 * questions to send as they are (`askAssist`), and stays out of the way while
 * something is being typed. An empty Enter is the pill's own question either
 * way (`submitEmpty`), which is what pressing it used to do.
 */
const MODES: Record<
  string,
  {
    placeholder: string
    assist: (text: string, brand: Brand) => ComposeAssist
  }
> = {
  posting: {
    placeholder:
      "Start with the role — e.g. Head of Marketing in Mumbai, 12+ years",
    assist: (text, brand) => composeAssist(text, brand, "posting"),
  },
  find: {
    placeholder:
      "Who are you looking for? — e.g. Product managers in Pune, 8+ years, FMCG",
    assist: (text, brand) => composeAssist(text, brand, "search"),
  },
  decisions: {
    placeholder:
      "Ask about your applicants — or press Enter for who's waiting on you",
    assist: (text, brand) =>
      text.trim() ? NOTHING : askAssist("decisions", brand),
  },
  funnel: {
    placeholder: "Ask about your hiring — or press Enter for how it's going",
    assist: (text, brand) =>
      text.trim() ? NOTHING : askAssist("funnel", brand),
  },
}

const NOTHING: ComposeAssist = { checks: [], rows: [] }

function ChatLanding({
  onAsk,
  onAttach,
}: {
  onAsk: (prompt: string) => void
  onAttach: (file: { name: string; text: string | null }) => void
}) {
  const { brand } = useBrand()
  const vocabulary = React.useMemo(
    () => dictationVocabulary(brand, null),
    [brand]
  )
  const examples = React.useMemo(() => heroExamples(brand), [brand])
  // The pills the box's text is heading for, once typing pauses — one for a
  // clear match, both for a tie. The pill is the hint: same name, same place,
  // nothing new on screen and nothing moving.
  const [lit, setLit] = React.useState<string[]>([])
  // The pressed pill, if any — the box is writing or asking for it.
  const [mode, setMode] = React.useState<string | null>(null)
  // Whether the box has focus — the page behind it dims while it does.
  const [focused, setFocused] = React.useState(false)
  const pressed = HERO_ACTIONS.find((action) => action.skill === mode)
  const assist = React.useCallback(
    (text: string) => (mode ? MODES[mode].assist(text, brand) : NOTHING),
    [mode, brand]
  )
  // Under a pill, the hint speaks only when the sentence is about to leave it
  // — the pill it is heading for lights, or the line by the send button says
  // what Enter will do instead.
  const route = React.useCallback(
    (text: string) => (mode ? modeHint(mode, text, brand) : routeHint(text)),
    [mode, brand]
  )
  // Written under a pill, the sentence goes where the pill said. A file, or
  // a `/` command picked from the menu, is still its own turn.
  const submit = (text: string) =>
    onAsk(
      mode && attachmentIn(text) === null && !skillFor(text)
        ? encodeAsk(mode, text)
        : text
    )
  return (
    <div className="flex flex-col items-center px-4 pb-10 lg:px-6">
      {/* The hero: its own positioned box, so the glow sits behind the box
          and the pills rather than drifting down the page with the overview. */}
      {/* Raised while the box has focus, so the scrim inside it covers the
          overview below and the nav beside it rather than sitting under them. */}
      <div
        className={cn(
          "relative isolate flex w-full flex-col items-center pt-[6svh]",
          focused && "z-20"
        )}
      >
        {/* THE SCRIM: everything but the box and the pills dims while the box
            has focus — the pills stay lit because they are part of the same
            act (Create Job pressed, a pill lighting as you type). A press on
            it leaves the box, which is what takes it away. */}
        <div
          aria-hidden
          data-on={focused ? "" : undefined}
          className="pointer-events-none fixed inset-0 z-40 bg-black/20 opacity-0 transition-opacity duration-200 data-on:pointer-events-auto data-on:opacity-100 supports-backdrop-filter:backdrop-blur-xs dark:bg-black/50"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 mx-auto h-[28rem] max-w-5xl -translate-y-1/4 blur-3xl dark:opacity-50"
          style={{
            background: [
              "radial-gradient(ellipse 40% 50% at 25% 55%, rgb(212 44 240 / 0.10), transparent)",
              "radial-gradient(ellipse 45% 55% at 75% 50%, rgb(90 134 255 / 0.16), transparent)",
              "radial-gradient(ellipse 50% 45% at 50% 70%, rgb(95 230 234 / 0.12), transparent)",
            ].join(", "),
          }}
        />

        <Aura size={112} />

        <h1 className="mt-8 text-center text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Who are you hiring today?
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-center text-sm text-muted-foreground">
          <SparklesIcon className="size-4 shrink-0 text-primary" />
          Ask about your postings, your applicants, your diary or the market.
        </p>

        <div
          className={cn(
            "relative mt-10 flex max-w-4xl flex-wrap justify-center gap-3",
            focused && "z-50"
          )}
        >
          {HERO_ACTIONS.map((action) => {
            const count = action.count?.(brand)
            const on = lit.includes(action.skill)
            const moded = action.skill in MODES
            const selected = mode === action.skill
            return (
              <button
                key={action.label}
                type="button"
                onClick={() =>
                  moded
                    ? setMode(selected ? null : action.skill)
                    : onAsk(action.prompt)
                }
                aria-pressed={moded ? selected : undefined}
                data-lit={on ? "" : undefined}
                data-selected={selected ? "" : undefined}
                className="group flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-xs transition-[color,background-color,border-color,box-shadow] outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-lit:border-primary/50 data-lit:bg-primary/5 data-lit:ring-[3px] data-lit:ring-primary/15 data-selected:border-primary data-selected:bg-primary data-selected:text-primary-foreground data-selected:hover:bg-primary/90"
              >
                <action.icon className="size-4 text-muted-foreground transition-colors group-data-lit:text-primary group-data-selected:text-primary-foreground" />
                {action.label}
                {on ? (
                  <span className="sr-only">
                    {lit.length > 1
                      ? " — one of what your message could mean"
                      : " — what Enter will do"}
                  </span>
                ) : null}
                {count ? (
                  <span className="-mr-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary tabular-nums">
                    {count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <AgentComposer
          size="hero"
          vocabulary={vocabulary}
          examples={pressed ? undefined : examples}
          placeholder={pressed ? MODES[pressed.skill].placeholder : undefined}
          route={route}
          pills={PILLS}
          onRoute={setLit}
          mode={
            pressed
              ? {
                  label: pressed.label,
                  onExit: () => setMode(null),
                  submitEmpty: pressed.prompt,
                }
              : undefined
          }
          assist={pressed ? assist : undefined}
          onFocusChange={setFocused}
          className={cn("mt-6 w-full max-w-4xl", focused && "z-50")}
          onSubmit={submit}
          onAttach={onAttach}
        />
      </div>

      {/* The Dashboard's own overview, under the box — the same parts
          (`components/overview.tsx`), so the numbers and rows are the ones the
          Dashboard shows. What to ask about is right there to look at. */}
      <div className="mt-16 flex w-full max-w-7xl flex-col gap-6">
        <StatTiles />
        <WorkSections />
      </div>
    </div>
  )
}

/**
 * The first screen: what it is, what it can do, and the box.
 *
 * The cards are the six things it can answer, so the hero is also the honest
 * inventory — there is nothing behind this screen that is not on it.
 */
function Landing({
  onAsk,
  onAttach,
}: {
  onAsk: (prompt: string) => void
  onAttach: (file: { name: string; text: string | null }) => void
}) {
  const { brand } = useBrand()
  // No conversation yet, so only the product's own words.
  const landingVocabulary = React.useMemo(
    () => dictationVocabulary(brand, null),
    [brand]
  )
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 py-10 lg:px-6">
      {/* The top margin is room for the glow, which spills past the orb. */}
      <Aura size={80} className="mt-6" />

      <h1 className="mt-5 text-center text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Who are you hiring today?
      </h1>
      <p className="mt-2 flex items-center gap-1.5 text-center text-sm text-muted-foreground">
        <SparklesIcon className="size-4 shrink-0 text-primary" />
        Ask about your postings, your applicants, your diary or the market.
      </p>

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((skill) => (
          <button
            key={skill.id}
            type="button"
            onClick={() => onAsk(skill.prompt)}
            className="flex flex-col items-start gap-2 rounded-2xl border bg-background p-4 text-left transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {skill.card ? <skill.card.icon className="size-4.5" /> : null}
            </span>
            <span className="text-sm font-semibold">{skill.card?.title}</span>
            <span className="text-sm text-muted-foreground">
              {skill.card?.example}
            </span>
          </button>
        ))}
      </div>

      <AgentComposer
        vocabulary={landingVocabulary}
        route={routeHint}
        className="mt-10 w-full"
        onSubmit={onAsk}
        onAttach={onAttach}
      />
    </div>
  )
}

/**
 * Who is answering. Unnamed for now — see the note on the page.
 *
 * `self-start`, against the component's own `self-end`: a reply here is a line
 * and then a stack of cards, sometimes a screen tall, and an avatar pinned to
 * the bottom of that stack ends up beside the fifth candidate looking like it
 * belongs to them. It goes beside the sentence it is saying.
 *
 * Only the newest reply is live; `overflow-visible` lets its glow spill.
 */
function Head({ live }: { live: boolean }) {
  return (
    <MessageAvatar className="self-start overflow-visible bg-transparent">
      {live ? <Aura size={28} /> : <AuraStill size={28} />}
    </MessageAvatar>
  )
}

// Versioned: a reading is a whole `IntakeState`. v2 added the stage and the
// brief; v3 the opener and the batch shape the questionnaire needs; v4 how
// the posting started; v5 what an answer recorded, as rows (`noted`); v6
// the screening questions on the draft, and the stage that asks them.
const READINGS_KEY = "agent:intake-readings:v6"

/** Per-tab, and allowed to be empty — a cache, so losing it costs a re-read. */
function loadReadings(): Record<string, IntakeState> {
  try {
    const raw = sessionStorage.getItem(READINGS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, IntakeState>) : {}
  } catch {
    return {}
  }
}

/**
 * Only Gemini's readings are kept across a reload. A fallback is the rules
 * standing in for a model that was missing or failed — keep that and the tab
 * goes on saying "read by rules" for those turns after the key is added and
 * the server restarted, which is exactly when somebody is checking whether it
 * worked. Held in memory for this visit, re-read on the next.
 */
function saveReadings(readings: Record<string, IntakeState>) {
  try {
    const kept = Object.fromEntries(
      Object.entries(readings).filter(([, state]) => state.engine === "gemini")
    )
    sessionStorage.setItem(READINGS_KEY, JSON.stringify(kept))
  } catch {
    // Private mode or a full quota: the page still works, it just re-reads.
  }
}

// Versioned like the readings: a decision is a `RouteDecision`.
const ROUTES_KEY = "agent:routes:v1"

/** Per-tab, and allowed to be empty — losing it costs a re-route. */
function loadRoutes(): Record<string, RouteDecision> {
  try {
    const raw = sessionStorage.getItem(ROUTES_KEY)
    return raw ? (JSON.parse(raw) as Record<string, RouteDecision>) : {}
  } catch {
    return {}
  }
}

/** Only Gemini's decisions outlive a reload, for the readings' reason. */
function saveRoutes(routes: Record<string, RouteDecision>) {
  try {
    const kept = Object.fromEntries(
      Object.entries(routes).filter(([, decision]) => decision.by === "gemini")
    )
    sessionStorage.setItem(ROUTES_KEY, JSON.stringify(kept))
  } catch {
    // Private mode or a full quota: the page still works, it just re-routes.
  }
}

/**
 * What the agent said, in its bubble. What the last answer recorded comes
 * first, as "Got it." and a label beside each value — the same grid the
 * recruiter's own bubble uses for their answers — and the sentence after.
 */
function Said({ answer }: { answer: Answer }) {
  if (!answer.noted?.length) return answer.said
  return (
    <div className="flex flex-col gap-2">
      <p>Got it.</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {answer.noted.map((row) => (
          <div key={row.label} className="contents">
            <dt className="py-0.5 text-xs leading-5 text-muted-foreground">
              {row.label}
            </dt>
            <dd className="min-w-0 py-0.5 leading-5 font-medium">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {answer.said ? <p>{answer.said}</p> : null}
    </div>
  )
}

/**
 * What the recruiter said, in their bubble. A submitted questionnaire is a
 * turn whose text is JSON behind a marker (`encodeAnswers`), and printing
 * that would be printing the plumbing — so it is drawn as the answers it
 * holds, one line per question, in the order they were asked.
 */
function Prompt({ prompt }: { prompt: string }) {
  // A sentence written under a pill: said under the pill's name.
  const asked = decodeAsk(prompt)
  if (asked)
    return (
      <span className="flex flex-col gap-1 text-left">
        <span className="text-xs opacity-75">{askLabel(asked.skill)}</span>
        <span className="whitespace-pre-line">{asked.text}</span>
      </span>
    )
  // Chat v3's hiring manager's note: said as whose words they are.
  const note = decodeNote(prompt)
  if (note !== null)
    return (
      <span className="flex flex-col gap-1 text-left">
        <span className="text-xs opacity-75">From the hiring manager</span>
        <span className="whitespace-pre-line">{note}</span>
      </span>
    )
  const change = decodeChange(prompt)
  const answers = decodeAnswers(prompt) ?? change
  if (!answers) return prompt

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-left">
      {Object.entries(answers).map(([id, answer]) => (
        <div key={id} className="contents">
          <dt className="py-0.5 text-xs leading-5 opacity-75">
            {LABELS[id as keyof typeof LABELS] ??
              SEARCH_LABELS[id as keyof typeof SEARCH_LABELS] ??
              id}
          </dt>
          <dd
            className={cn(
              "min-w-0 py-0.5 leading-5 font-medium whitespace-pre-line",
              answer === null && "opacity-75"
            )}
          >
            {answer === null
              ? "Skipped"
              : id === "calibrate"
                ? calibrationSaid(answer)
                : answer}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** "2 kept, 1 not a fit" — the calibration turn, said rather than printed. */
function calibrationSaid(answer: string) {
  const verdicts = answer.split("\n").map((line) => line.split("=")[1])
  const kept = verdicts.filter((v) => v === "kept").length
  const dropped = verdicts.filter((v) => v === "dropped").length
  return `${kept} kept, ${dropped} not a fit`
}
