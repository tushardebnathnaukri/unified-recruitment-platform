import * as React from "react"
import { useSearchParams } from "react-router"
import {
  ChevronRightIcon,
  CircleCheckIcon,
  ListChecksIcon,
  SparklesIcon,
} from "lucide-react"

import { useBrand } from "@workspace/ui/components/brand-provider"
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
import { cn } from "@workspace/ui/lib/utils"

import { AgentComposer } from "@/components/agent-composer"
import { Aura, AuraStill } from "@/components/aura"
import { AgentQuestionnaire } from "@/components/agent-questionnaire"
import { AgentBlocks } from "@/components/agent-reply"
import { PostingRail } from "@/components/posting-rail"
import { useCollapseNav } from "@/components/use-collapse-nav"
import {
  answersFor,
  CARDS,
  HERO_ACTIONS,
  heroExamples,
  type Answer,
  type Block,
  type WorkStep,
} from "@/lib/agent"
import { useAgentLandingVariant } from "@/lib/agent-landing-variant"
import { dictationVocabulary } from "@/lib/dictation"
import { openerChecks } from "@/lib/job-start"
import { railFor } from "@/lib/posting-rail"
import { play } from "@/lib/sound"
import type { IntakeState } from "@/lib/job-intake"
import { advanceWithAi } from "@/lib/job-intake-ai"
import { decodeAnswers, LABELS } from "@/lib/job-refine"

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
 * THE TRANSCRIPT IS IN THE URL, AS `?ask=`, ONE PER TURN. It can be, because
 * there is no model here: every answer is computed from the prompt and the
 * brand's own data at the moment it is drawn (see `lib/agent.ts`), so the list
 * of questions IS the conversation and a reload, a back button or a link
 * pasted to a colleague rebuilds it exactly. It is the trick the rest of this
 * prototype plays with `?tab=` and `?picked=`, and it means a reply worth
 * showing someone in a review can be sent as a link. Back walks the
 * conversation backwards one turn at a time, which is the right thing for it
 * to do here.
 *
 * THE FACE IS THE AURA FROM `avatar-kit/` (`components/aura.tsx`). It is not
 * named on this screen and the older copilot is untouched — whether these are
 * one assistant with two front doors or two different things is a product
 * question, and a name would answer it before the design team has.
 */

/** Long enough to read as listening, short enough not to be waiting. */
const THINKING_MS = 450

const ASK = "ask"

export function AgentPage() {
  const { brand } = useBrand()
  const [params, setParams] = useSearchParams()

  const asked = params.getAll(ASK)
  const started = asked.length > 0
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
  const ask = (prompt: string) => {
    askedHere.current = true
    const next = new URLSearchParams(params)
    next.append(ASK, prompt)
    setParams(next)
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

  // Answered as a whole rather than turn by turn: a reply inside the posting
  // conversation depends on the turns before it (see `answersFor`).
  const { turns, pending, posting } = React.useMemo(() => {
    const prompts = transcript ? transcript.split("\u0000") : []
    const { answers, pending, posting } = answersFor(
      prompts,
      brand,
      files,
      readings
    )
    return {
      pending,
      posting,
      turns: prompts.map((prompt, index) => ({
        id: `${index}-${prompt}`,
        prompt,
        answer: answers[index],
      })),
    }
  }, [transcript, brand, files, readings])

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
  const rail = React.useMemo(
    () => (posting ? railFor(posting, brand) : null),
    [posting, brand]
  )
  const showCard = Boolean(docked && last && closed !== last.id)
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

  return (
    // The conversation owns the screen below the header: a transcript that
    // scrolls and a box that does not. `-mt-4 md:-mt-6` takes back the shell's
    // own vertical rhythm, which is why the height subtracts only the header.
    // BOTH ENDS OF THE SHELL'S PADDING ARE TAKEN BACK. The shell pads the
    // page `py-4 md:py-6`; cancelling only the top left the view 24px taller
    // than the screen, so the whole page scrolled and the header slid away
    // under the docked card. The split view cancels its bottom the same way.
    <div className="-mt-4 -mb-4 flex h-[calc(100svh-var(--header-height))] md:-mt-6 md:-mb-6">
      <div className="flex min-w-0 flex-1 flex-col">
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
                              {turn.answer === null
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
                                <Bubble variant="secondary">
                                  <BubbleContent>
                                    <Said answer={answer} />
                                  </BubbleContent>
                                </Bubble>
                                <div className="mt-1 w-full">
                                  <AgentBlocks
                                    blocks={answer.blocks}
                                    onAsk={ask}
                                    live={index === turns.length - 1}
                                  />
                                </div>
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
            {showCard && docked && last ? (
              <AgentQuestionnaire
                // A new card is a new form: answers from the last one must not
                // carry over into questions that happen to share a name.
                key={last.id}
                items={docked.items}
                submit={docked.submit}
                form={docked.form}
                postNow={docked.postNow}
                onAsk={ask}
                onClose={() => setClosed(last.id)}
              />
            ) : docked ? (
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
            ) : null}
            {/* No suggestion row under the conversation: the `/` menu is the
              list of what it can do, and a permanent row of the same prompts
              would be the transcript's own furniture repeated. */}
            <AgentComposer
              vocabulary={vocabulary}
              checklist={waitingForRole ? checklist : undefined}
              peekOnFocus={!showCard && !waitingForJd && !waitingForRole}
              className={showCard ? "mt-3" : undefined}
              placeholder={
                showCard
                  ? "Or reply directly…"
                  : waitingForJd
                    ? "Paste the job description, or drop a PDF or Word doc here…"
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
      {rail ? (
        <div className="hidden h-full @3xl/main:block">
          <PostingRail model={rail} reading={Boolean(pending)} />
        </div>
      ) : null}
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
 * The chat landing: the Aura, the question, five action pills, and one big box.
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
  return (
    <div className="relative isolate flex min-h-[calc(100svh-var(--header-height)-3rem)] flex-col items-center justify-center px-4 pb-[10svh] lg:px-6">
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

      <div className="mt-10 flex max-w-4xl flex-wrap justify-center gap-3">
        {HERO_ACTIONS.map((action) => {
          const count = action.count?.(brand)
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => onAsk(action.prompt)}
              className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-xs transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <action.icon className="size-4 text-muted-foreground" />
              {action.label}
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
        examples={examples}
        className="mt-6 w-full max-w-4xl"
        onSubmit={onAsk}
        onAttach={onAttach}
      />
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
// the posting started; v5 what an answer recorded, as rows (`noted`).
const READINGS_KEY = "agent:intake-readings:v5"

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
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 font-medium">{row.value}</dd>
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
  const answers = decodeAnswers(prompt)
  if (!answers) return prompt

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-left">
      {Object.entries(answers).map(([id, answer]) => (
        <div key={id} className="contents">
          <dt className="opacity-75">
            {LABELS[id as keyof typeof LABELS] ?? id}
          </dt>
          <dd className={cn("min-w-0", answer === null && "opacity-75")}>
            {answer ?? "Skipped"}
          </dd>
        </div>
      ))}
    </dl>
  )
}
