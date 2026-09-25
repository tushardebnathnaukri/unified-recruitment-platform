import * as React from "react"
import { useNavigate, useSearchParams } from "react-router"
import {
  ArrowRightIcon,
  CheckIcon,
  SparklesIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  WandSparklesIcon,
} from "lucide-react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble"
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

import { BriefRail, type Stage } from "@/components/brief-rail"
import { CriteriaEvidence } from "@/components/criteria-evidence"
import { SmartHireBar } from "@/components/smart-hire-bar"
import {
  criteriaFor,
  poolFor,
  recalibrate,
  toReview,
  whatMoved,
  widenings,
  type Reviewee,
} from "@/lib/calibration"
import {
  answersFrom,
  contextFor,
  pending,
  QUESTIONS,
  skippedFrom,
  transcriptFor,
  SKIP_KEY,
  type Option,
  type Question,
  type QuestionId,
} from "@/lib/intake"
import { readBack, type SmartChip } from "@/lib/smart-hire"

/**
 * Smart Hire's requirement chat — the step between the sentence and the people.
 *
 * ONE SENTENCE IS NEVER A BRIEF. The bar takes "a Product Manager in Pune" and
 * that is a start, not a requirement: nothing in it says how senior, how soon,
 * or what the person has to have done. This asks for the rest, one question at
 * a time, and only ever asks what is still missing — the sentence already
 * naming a city means the city is never asked about.
 *
 * A CONVERSATION WITH NOTHING BEHIND IT BUT THE URL. There is no model here and
 * no session: `?q=` is the sentence, and every answer lands on the refine
 * panel's own filter keys (`cur`, `xp`, `ind`, `np`, `ctc`). The transcript is
 * DERIVED from those by `transcriptFor`, so a reload, a back button or a link
 * pasted to a colleague rebuilds the same conversation — which is the same
 * trick the rest of this prototype plays with `?tab=` and `?picked=`, just
 * applied to something that looks like a chat.
 *
 * THE PAUSE IS THE ONLY PRETENCE. An answer is acknowledged after a beat, with
 * a spinner, because a reply that lands in the same frame as the question reads
 * as a form validating rather than somebody listening. It is 500ms of theatre
 * over a decision tree, and it is worth being honest that that is what it is.
 */

/** Long enough to read as listening, short enough not to be waiting. */
const THINKING_MS = 550

/**
 * Below this many people, the brief has narrowed further than it can answer,
 * and the chat offers to loosen something rather than marching on to the next
 * question. A number, not a feeling — every gain beside a suggestion is
 * counted against the real pool.
 */
const THIN_POOL = 25

export function SmartHireBriefPage() {
  const { brand } = useBrand()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const query = params.get("q") ?? ""

  // The sentence, read back into chips — the same pass the bar makes, so what
  // the chat believes it was told matches what the bar showed.
  const draft = React.useMemo(() => {
    const chips: SmartChip[] = []
    for (const part of readBack(query, brand)) {
      if ("chip" in part) chips.push(part.chip)
    }
    return { text: query, chips }
  }, [query, brand])

  const context = React.useMemo(() => contextFor(draft, brand), [draft, brand])
  const answered = React.useMemo(() => answersFrom(params), [params])
  const skipped = React.useMemo(() => skippedFrom(params), [params])
  const turns = React.useMemo(
    () => transcriptFor(context, answered, skipped),
    [context, answered, skipped]
  )

  const left = pending(context, answered, skipped)
  const current = left[0]

  /**
   * The people behind the brief, and what the brief currently asks of them.
   * Recomputed from the URL like everything else here, so the rail's number and
   * the chat's suggestions can never disagree about who matches.
   */
  const pool = React.useMemo(
    () => poolFor(brand, query, params),
    [brand, query, params]
  )

  // The criteria the answers imply — stable, because the three profiles are
  // chosen against them and must not change as the ranking does.
  const implied = React.useMemo(() => criteriaFor(pool, params), [pool, params])
  const criteria = params.getAll("crit").length
    ? params.getAll("crit")
    : implied

  const reviewees = React.useMemo(
    () => (current ? [] : toReview(pool, implied)),
    [current, pool, implied]
  )

  const kept = params.getAll("keep")
  const dropped = params.getAll("drop")
  const judgedCount = kept.length + dropped.length
  const calibrated = reviewees.length > 0 && judgedCount >= reviewees.length

  const widen = React.useMemo(
    () =>
      pool.matching.length < THIN_POOL && pool.matching.length > 0
        ? widenings(pool, params)
        : [],
    [pool, params]
  )

  // Only meaningful once the criteria have actually been re-ordered.
  const moved = calibrated ? whatMoved(implied, criteria) : null

  const stages: Stage[] = [
    { label: "Read the role", state: "done" },
    {
      label: "Fill the brief",
      detail: `${QUESTIONS.length - left.length} of ${QUESTIONS.length}`,
      state: current ? "active" : "done",
    },
    {
      label: "Calibrate against your taste",
      detail: reviewees.length
        ? `${judgedCount} of ${reviewees.length}`
        : undefined,
      state: current ? "waiting" : calibrated ? "done" : "active",
    },
    {
      label: "Find the people",
      state: calibrated ? "active" : "waiting",
    },
  ]

  const [thinking, setThinking] = React.useState(false)
  const timer = React.useRef<number | null>(null)

  React.useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    []
  )

  /** Take the beat, then let the next question through. */
  const beat = (next: URLSearchParams) => {
    setThinking(true)
    setParams(next, { replace: true })

    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setThinking(false), THINKING_MS)
  }

  /** Record an answer, then take a beat before the next question appears. */
  const answer = (question: Question, values: string[]) => {
    if (!values.length) return

    const next = new URLSearchParams(params)
    const key = question.param ?? "skill"
    next.delete(key)
    for (const value of values) next.append(key, value)
    beat(next)
  }

  /** "Doesn't matter" — recorded, so a reload does not ask again. */
  const skip = (question: Question) => {
    const next = new URLSearchParams(params)
    next.append(SKIP_KEY, question.id)
    beat(next)
  }

  /**
   * A verdict on one of the three. The last one recalibrates: the criteria
   * those profiles MET move by the decision, and because `scoreFor` is
   * rank-weighted, that re-ordering re-scores the whole pool.
   */
  const judge = (reviewee: Reviewee, verdict: "keep" | "drop") => {
    const next = new URLSearchParams(params)
    next.append(verdict, reviewee.profile.id)

    const keeps = next.getAll("keep")
    const drops = next.getAll("drop")
    const judged = reviewees
      .map((candidate) => {
        const id = candidate.profile.id
        if (keeps.includes(id))
          return { verdicts: candidate.verdicts, judgement: "kept" as const }
        if (drops.includes(id))
          return { verdicts: candidate.verdicts, judgement: "dropped" as const }
        return null
      })
      .filter((entry) => entry !== null)

    if (judged.length >= reviewees.length) {
      next.delete("crit")
      for (const criterion of recalibrate(implied, judged)) {
        next.append("crit", criterion)
      }
    }

    beat(next)
  }

  /** Everything the brief knows, minus the bookkeeping the next page ignores. */
  const finish = () => {
    const next = new URLSearchParams(params)
    next.delete(SKIP_KEY)
    navigate(`/smart-hire/candidates?${next.toString()}`)
  }

  return (
    // The chat owns the screen below the header: a transcript that scrolls and
    // a composer that does not. `-mt-4 md:-mt-6` takes back the shell's own
    // vertical rhythm, which is why the height subtracts only the header.
    <div className="-mt-4 flex h-[calc(100svh-var(--header-height))] md:-mt-6">
      <div className="flex min-w-0 flex-1 flex-col">
        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6">
                {turns.map((turn) => {
                  // While the beat runs, the next question is not on screen yet.
                  if (
                    thinking &&
                    turn.kind === "ask" &&
                    turn.id === `ask-${current?.id}`
                  ) {
                    return null
                  }
                  // "Ready" waits for the three profiles to be judged.
                  if (turn.kind === "done" && (thinking || !calibrated))
                    return null

                  return (
                    <MessageScrollerItem
                      key={turn.id}
                      messageId={turn.id}
                      scrollAnchor={turn.kind === "said"}
                    >
                      <Turn
                        turn={turn}
                        context={context}
                        answered={answered}
                        skipped={skipped}
                        moved={moved}
                        onAnswer={answer}
                        onSkip={skip}
                        onFinish={finish}
                      />
                    </MessageScrollerItem>
                  )
                })}

                {/* NARROWED TOO FAR. Offered where it happens rather than as a
                  warning at the end, and every gain is counted against the
                  real pool by `expansions` — not an estimate. */}
                {!thinking && widen.length ? (
                  <Message>
                    <Athena />
                    <MessageContent>
                      <Bubble variant="secondary">
                        <BubbleContent>
                          <p className="flex items-center gap-1.5">
                            <WandSparklesIcon className="size-4 text-primary" />
                            That is down to {pool.matching.length} people. I can
                            widen it:
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {widen.map((expansion) => (
                              <Button
                                key={expansion.label}
                                size="xs"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => beat(expansion.params)}
                              >
                                {expansion.label}
                                <span className="font-medium text-primary tabular-nums">
                                  +{expansion.gain}
                                </span>
                              </Button>
                            ))}
                          </div>
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                ) : null}

                {/* CALIBRATION. The three the search already ranks first: if its
                  best is wrong, the criteria are wrong, which is the only
                  version of this step that means anything. */}
                {!thinking && !current && reviewees.length && !calibrated ? (
                  <Message>
                    <Athena />
                    <MessageContent>
                      <Bubble variant="secondary">
                        <BubbleContent>
                          <p>
                            Before I go further — tell me if these{" "}
                            {reviewees.length} are the sort of person you meant.
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            They are the strongest matches so far. What you keep
                            moves the criteria.
                          </p>
                        </BubbleContent>
                      </Bubble>

                      <div className="mt-2 flex flex-col gap-2">
                        {reviewees.map((reviewee) => (
                          <ReviewCard
                            key={reviewee.profile.id}
                            reviewee={reviewee}
                            judged={
                              kept.includes(reviewee.profile.id)
                                ? "kept"
                                : dropped.includes(reviewee.profile.id)
                                  ? "dropped"
                                  : null
                            }
                            onJudge={judge}
                          />
                        ))}
                      </div>
                    </MessageContent>
                  </Message>
                ) : null}

                {thinking ? (
                  <Marker>
                    <MarkerIcon>
                      <Spinner />
                    </MarkerIcon>
                    <MarkerContent>Noting that down…</MarkerContent>
                  </Marker>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        {/* The composer is the Smart Hire bar with its furniture off: a chat
          already says what it understood in its own transcript, so the tray
          and the proposals would be the conversation repeated underneath
          itself. The ghost text and the chips stay, which is what makes
          answering "which city" a matter of typing three letters. */}
        <div className="border-t bg-background">
          <div className="mx-auto w-full max-w-3xl px-4 py-4 lg:px-6">
            <SmartHireBar
              key={current?.id ?? "done"}
              size="composer"
              placeholder={
                current
                  ? `${current.ask} — or type your own answer`
                  : "Anything else?"
              }
              onSubmit={(reply) => {
                if (current) answer(current, [reply.text.trim()])
              }}
              submitHint={current ? undefined : "Nothing left to answer"}
            />
          </div>
        </div>
      </div>

      {/* Beside the chat where there is room, and nowhere below that: on a
          narrow column the transcript already is the page, and a second one
          would halve it. */}
      <div className="hidden @3xl/main:block">
        <BriefRail
          stages={stages}
          pool={pool.matching.length}
          total={pool.all.length}
          criteria={criteria}
        />
      </div>
    </div>
  )
}

function Turn({
  turn,
  context,
  answered,
  skipped,
  moved,
  onAnswer,
  onSkip,
  onFinish,
}: {
  turn: ReturnType<typeof transcriptFor>[number]
  context: ReturnType<typeof contextFor>
  answered: Partial<Record<QuestionId, string[]>>
  skipped: Set<QuestionId>
  /** What the calibration changed, said in a line. */
  moved: string | null
  onAnswer: (question: Question, values: string[]) => void
  onSkip: (question: Question) => void
  onFinish: () => void
}) {
  if (turn.kind === "note") {
    return (
      <Marker variant="separator">
        <MarkerContent>{turn.text}</MarkerContent>
      </Marker>
    )
  }

  if (turn.kind === "said") {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble align="end">
            <BubbleContent>{turn.text}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    )
  }

  if (turn.kind === "done") {
    return (
      <Message>
        <Athena />
        <MessageContent>
          <Bubble variant="secondary">
            <BubbleContent>
              {/* What the three profiles actually changed. Null when nothing
                  moved, which is an honest outcome and not a failure. */}
              {moved ? <p className="mb-1 font-medium">{moved}</p> : null}
              <p>{turn.text}</p>
              <Button className="mt-3" onClick={onFinish}>
                See the people
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    )
  }

  const already = answered[turn.question.id] ?? []
  const waved = skipped.has(turn.question.id)

  return (
    <Message>
      <Athena />
      <MessageContent>
        <Bubble variant="secondary">
          <BubbleContent>
            <p>{turn.text}</p>
            <p className="mt-1 text-xs text-muted-foreground">{turn.because}</p>
          </BubbleContent>
        </Bubble>

        {already.length || waved ? null : (
          <Choices
            question={turn.question}
            context={context}
            onAnswer={onAnswer}
            onSkip={onSkip}
          />
        )}
      </MessageContent>
    </Message>
  )
}

/**
 * The tap-to-answer row.
 *
 * A question that can take several answers keeps its options up until the
 * recruiter says they are done — a role open in three cities is one answer,
 * not three conversations.
 */
function Choices({
  question,
  context,
  onAnswer,
  onSkip,
}: {
  question: Question
  context: ReturnType<typeof contextFor>
  onAnswer: (question: Question, values: string[]) => void
  onSkip: (question: Question) => void
}) {
  const [picked, setPicked] = React.useState<string[]>([])

  // THE REAL CONTEXT, not a fresh one. The skills a role implies are a
  // function of the sentence, so building the options against an empty draft
  // asked "what do they need to have done?" and then offered nothing to
  // answer it with.
  const options = React.useMemo(
    () => question.options(context),
    [question, context]
  )

  // No options is not the same as no question — the skip still has to be
  // reachable, or a question with nothing to offer is a dead end.
  const skip = (
    <Button
      size="xs"
      variant="ghost"
      className="text-muted-foreground"
      onClick={() => onSkip(question)}
    >
      Doesn't matter
    </Button>
  )

  if (!options.length) {
    return <div className="mt-2 flex items-center gap-1.5">{skip}</div>
  }

  const toggle = (option: Option) => {
    if (!question.multiple) {
      onAnswer(question, [option.value])
      return
    }
    setPicked((current) =>
      current.includes(option.value)
        ? current.filter((value) => value !== option.value)
        : [...current, option.value]
    )
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {options.map((option) => {
        const on = picked.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option)}
            aria-pressed={question.multiple ? on : undefined}
            className={cn(
              "inline-flex items-center gap-1 rounded-4xl border px-3 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              on
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background hover:bg-muted"
            )}
          >
            {on ? <CheckIcon className="size-3" /> : null}
            {option.label}
          </button>
        )
      })}

      {question.multiple ? (
        <Button
          size="xs"
          variant={picked.length ? "default" : "ghost"}
          disabled={!picked.length}
          onClick={() => onAnswer(question, picked)}
        >
          Done
        </Button>
      ) : null}

      {skip}
    </div>
  )
}

/** Who is asking. Unnamed for now — see the note on the page. */
function Athena() {
  return (
    <MessageAvatar>
      <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
        <SparklesIcon className="size-4" />
      </span>
    </MessageAvatar>
  )
}

/**
 * One of the three, with the search's reasons and two ways to answer.
 *
 * THE VERDICTS ARE THE POINT, not the person. A name and a title would make
 * this a shortlist; the criteria lines are what turn it into a question about
 * the SEARCH — "it thinks this matters, does it?" — which is the only thing a
 * recruiter can usefully calibrate. They are the same lines the result cards
 * draw, from the same `verdictsFor`.
 */
function ReviewCard({
  reviewee,
  judged,
  onJudge,
}: {
  reviewee: Reviewee
  judged: "kept" | "dropped" | null
  onJudge: (reviewee: Reviewee, verdict: "keep" | "drop") => void
}) {
  const { profile } = reviewee
  const role = profile.positions[0]

  return (
    <div
      className={cn(
        "rounded-xl border bg-background p-3 transition-colors",
        judged === "dropped" && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{profile.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {role ? `${role.title} at ${role.company}` : profile.location}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 tabular-nums">
          {reviewee.score}%
        </Badge>
      </div>

      <CriteriaEvidence verdicts={reviewee.verdicts} />

      {judged ? (
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          {judged === "kept" ? "Kept" : "Not a fit"}
        </p>
      ) : (
        <div className="mt-3 flex items-center gap-1.5">
          <Button size="xs" onClick={() => onJudge(reviewee, "keep")}>
            <ThumbsUpIcon data-icon="inline-start" />
            Looks good
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => onJudge(reviewee, "drop")}
          >
            <ThumbsDownIcon data-icon="inline-start" />
            Not a fit
          </Button>
        </div>
      )}
    </div>
  )
}
