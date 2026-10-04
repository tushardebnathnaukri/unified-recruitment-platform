import * as React from "react"
import { Link } from "react-router"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ListIcon,
  LightbulbIcon,
  LoaderIcon,
  LockIcon,
  MinusIcon,
  PencilIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

import type { Brand } from "@workspace/ui/lib/brands"

import { AgentComposer } from "@/components/agent-composer"
import { AgentQuestionnaire } from "@/components/agent-questionnaire"
import { AgentBlocks } from "@/components/agent-reply"
import type { Answer, Block } from "@/lib/agent"
import type { AskedItem, IntakeState } from "@/lib/job-intake"
import { encodeChange } from "@/lib/job-refine"
import type { RailModel } from "@/lib/posting-rail"
import {
  askingNow,
  insightsFor,
  wizardFor,
  wizardProgress,
  type WizardSection,
  type WizardStep,
} from "@/lib/posting-wizard"

/**
 * The posting as an onboarding — "Chat alt" (`lib/posting-variant.ts`).
 *
 * TWO PANES, ONE QUESTION. The left asks the current question and nothing
 * else: the prompt large, its options as the rows the questionnaire already
 * draws, what the page knows that bears on it ("Worth knowing" — the market's
 * pay band under the pay question, where the profiles are under location),
 * and a reply box for saying it in words instead. The right is a tracker of
 * every question under the four steps, so the recruiter can see how long
 * this is and where they are, and can go back to any answer by clicking it.
 *
 * IT IS THE SAME CONVERSATION. The current question is the first item of the
 * card the chat would have docked (`docked.items[0]`), submitted alone as an
 * `Answers:` turn — the readers take partial answers, so the next card is
 * simply the rest. A click on a done step is the rail's pencil: the same
 * change card, sending the same `Change:` turn. Switch to any other variant
 * and the transcript is all there, because no turn here is different.
 */
export function PostingWizard({
  posting,
  brand,
  answer,
  thinking,
  docked,
  editItem,
  people,
  vocabulary,
  checklist,
  waitingForJd,
  waitingForRole,
  onAsk,
  onAttach,
  onEdit,
  onCancelEdit,
}: {
  posting: IntakeState
  brand: Brand
  /** The last reply — what it recorded, and any card it carries. */
  answer: Answer | null | undefined
  thinking: boolean
  docked: Extract<Block, { kind: "questionnaire" }> | undefined
  /** A step being changed from the tracker, as the rail's pencil asks it. */
  editItem: AskedItem | null
  people: RailModel["people"]
  vocabulary: string[]
  checklist?: (text: string) => { label: string; done: boolean }[]
  waitingForJd: boolean
  waitingForRole: boolean
  onAsk: (prompt: string) => void
  onAttach: (file: { name: string; text: string | null }) => void
  onEdit: (id: string) => void
  onCancelEdit: () => void
}) {
  const sections = React.useMemo(() => wizardFor(posting), [posting])
  const progress = wizardProgress(sections)
  const asking = editItem ? editItem.id : askingNow(posting)
  const section =
    sections.find((entry) => entry.steps.some((step) => step.id === asking)) ??
    sections.find((entry) => entry.state === "active")
  const sectionIndex = Math.max(
    0,
    sections.findIndex((entry) => entry === section)
  )
  const insights = React.useMemo(
    () => insightsFor(asking, posting, brand),
    [asking, posting, brand]
  )

  // One question: the first the card would ask. Its Continue is the card's
  // own submit only on the last one; before that it is simply the next.
  const item = docked?.items[0]
  const submit = docked
    ? docked.items.length > 1
      ? "Continue"
      : docked.submit
    : "Continue"
  const reading = thinking || answer === null
  const done = posting.stage === "done" && !editItem

  // BACK IS THE PREVIOUS QUESTION ASKED AGAIN, with its answer filled in —
  // the tracker's own click on that step. Nothing is undone: the turn that
  // answered it stays in the conversation, and Save sends a change over it,
  // which is what going back to fix something means here.
  // BELOW THE TWO-PANE WIDTH THE TRACKER IS A DRAWER, opened from the count
  // — the one place on a phone that already says where you are.
  const [stepsOpen, setStepsOpen] = React.useState(false)
  const steps = sections.flatMap((entry) => entry.steps)
  const at = steps.findIndex((step) => step.id === asking)
  const previous = steps
    .slice(0, at === -1 ? steps.length : at)
    .reverse()
    .find((step) => step.editable)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* THE TOP BAR, WHITE, OVER BOTH PANES: the back arrow, the name of
          the thing being done, and the count. The Dashboard draws no bar of
          its own from `md` up, so this is the one this screen has — and an
          onboarding wants one, because it is a place you are IN rather than
          a page you are on. */}
      <div className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background px-3 lg:px-4">
        <button
          type="button"
          disabled={!previous || reading}
          onClick={() => previous && onEdit(previous.id)}
          aria-label={
            previous ? `Back to ${previous.label.toLowerCase()}` : "Back"
          }
          title={
            previous ? `Back to ${previous.label.toLowerCase()}` : undefined
          }
          className="grid size-8 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ArrowLeftIcon className="size-4" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
          Post a job
        </h1>
        <button
          type="button"
          onClick={() => setStepsOpen(true)}
          aria-label="Show all the steps"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs text-muted-foreground tabular-nums transition-colors hover:bg-muted hover:text-foreground @3xl/main:pointer-events-none @3xl/main:hover:bg-transparent"
        >
          {editItem
            ? "Changing an answer"
            : done
              ? "All answered"
              : `Question ${Math.min(progress.current, progress.total)} of ${progress.total}`}
          <ListIcon className="size-3.5 @3xl/main:hidden" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 lg:px-6">
              {/* WHERE WE ARE: the step as a title of its own, with its icon
                and its number, since "which of the four am I on" is the
                question an onboarding answers first; and one progress
                segment per step, each filling as its questions are
                answered, so the bar says both how far through this step and
                how far through the whole. */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  {section ? (
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                      <section.icon className="size-5" />
                    </span>
                  ) : null}
                  <span className="flex min-w-0 flex-col">
                    <span className="text-xs text-muted-foreground">
                      Step {sectionIndex + 1} of {sections.length}
                    </span>
                    <span className="flex items-center gap-1.5 text-base leading-6 font-semibold">
                      {section?.title}
                      {section?.private ? (
                        <LockIcon
                          className="size-3.5 text-muted-foreground"
                          aria-label="Private"
                        />
                      ) : null}
                    </span>
                  </span>
                </div>

                <div
                  className="flex gap-1.5"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={progress.total}
                  aria-valuenow={progress.done}
                  aria-label={`${progress.done} of ${progress.total} questions answered`}
                >
                  {sections.map((entry) => {
                    const settled = entry.steps.filter(
                      (step) =>
                        step.state === "done" || step.state === "skipped"
                    ).length
                    // The review step has no answer to count; it fills when
                    // everything before it has.
                    const fill =
                      entry.id === "review"
                        ? done
                          ? 1
                          : 0
                        : settled / Math.max(entry.steps.length, 1)
                    return (
                      <span
                        key={entry.id}
                        className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
                      >
                        <span
                          className="block h-full rounded-full bg-primary transition-[width] duration-500"
                          style={{ width: `${fill * 100}%` }}
                        />
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* What the last answer recorded — the confirmation before the
                next question, small, so the question stays the page. */}
              {!reading && answer?.noted?.length ? (
                <Recorded rows={answer.noted} />
              ) : null}

              {reading ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Spinner />
                  {answer === null ? "Reading your answer…" : "Working it out…"}
                </div>
              ) : editItem ? (
                <AgentQuestionnaire
                  key={`edit-${editItem.id}`}
                  frame="page"
                  items={[editItem]}
                  submit="Save"
                  encode={encodeChange}
                  onAsk={(prompt) => {
                    onCancelEdit()
                    onAsk(prompt)
                  }}
                  onClose={onCancelEdit}
                  footer={
                    <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                      Cancel
                    </Button>
                  }
                />
              ) : item ? (
                <AgentQuestionnaire
                  // A new question is a new form: nothing carries over.
                  key={`${posting.stage}-${item.id}-${progress.done}`}
                  frame="page"
                  items={[item]}
                  submit={submit}
                  form={docked?.form}
                  postNow={docked?.postNow}
                  postNowLabel={docked?.postNowLabel}
                  onAsk={onAsk}
                  onClose={() => {}}
                />
              ) : answer ? (
                // No card: the agent is asking in words (the opener, the JD),
                // or it has finished and this is the posting to review.
                <div className="flex flex-col gap-4">
                  <p
                    className={cn(
                      "text-balance",
                      done
                        ? "text-sm leading-relaxed text-muted-foreground"
                        : "text-xl leading-7 font-semibold"
                    )}
                  >
                    {answer.said}
                  </p>
                  {answer.blocks.length ? (
                    <AgentBlocks blocks={answer.blocks} onAsk={onAsk} live />
                  ) : null}
                  {/* THE TWO QUESTIONS THAT ARE FREE TEXT BY NATURE — the
                    opening sentence and the JD — take their box here, as the
                    question's own answer field. Every other question is
                    answered from its rows; there is no chat box under the
                    page. */}
                  {!done && (waitingForRole || waitingForJd) ? (
                    <AgentComposer
                      vocabulary={vocabulary}
                      checklist={waitingForRole ? checklist : undefined}
                      placeholder={
                        waitingForJd
                          ? "Paste the job description, or drop a PDF or Word doc here…"
                          : "e.g. Head of Marketing, Mumbai, 12+ years, FMCG — brand strategy, P&L, team leadership"
                      }
                      onSubmit={onAsk}
                      onAttach={onAttach}
                    />
                  ) : null}
                </div>
              ) : null}

              {!reading && insights.length ? (
                <section className="flex flex-col gap-2">
                  <h2 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <LightbulbIcon className="size-3.5" />
                    Worth knowing
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {insights.map((insight) => (
                      <div
                        key={insight.label}
                        className="flex flex-col gap-1 rounded-2xl border bg-muted/30 px-4 py-3"
                      >
                        <p className="text-xs text-muted-foreground">
                          {insight.label}
                        </p>
                        <p className="text-base leading-6 font-semibold tabular-nums">
                          {insight.value}
                        </p>
                        {insight.note ? (
                          <p className="text-xs leading-5 text-muted-foreground">
                            {insight.note}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>

        {/* The tracker: every question under its step, and where you are. */}
        <aside className="hidden h-full w-[22rem] shrink-0 flex-col overflow-y-auto border-l bg-background @3xl/main:flex">
          <div className="flex flex-col gap-4 px-4 py-6">
            <Tracker sections={sections} reading={reading} onEdit={onEdit} />
            {people ? (
              <div className="flex flex-col gap-1 rounded-2xl border bg-muted/40 px-3.5 py-3">
                <p className="text-xs text-muted-foreground">
                  People this would find
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {people.matching.toLocaleString("en-IN")}
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                    of {people.total.toLocaleString("en-IN")}
                  </span>
                </p>
                <Link
                  to={people.href}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Open the search
                  <ArrowRightIcon className="size-3" />
                </Link>
              </div>
            ) : null}
          </div>
        </aside>

        {/* The same tracker as a sheet, where there is no room beside the
          question. Choosing a step closes it and asks that question. */}
        <Drawer open={stepsOpen} onOpenChange={setStepsOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Your posting, step by step</DrawerTitle>
              <DrawerDescription>
                {progress.done} of {progress.total} answered. Tap an answer to
                change it.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
              <Tracker
                sections={sections}
                reading={reading}
                onEdit={(id) => {
                  setStepsOpen(false)
                  onEdit(id)
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  )
}

function Tracker({
  sections,
  reading,
  onEdit,
}: {
  sections: WizardSection[]
  reading: boolean
  onEdit: (id: string) => void
}) {
  return (
    <>
      {sections.map((entry) => (
        <TrackerSection
          key={entry.id}
          section={entry}
          reading={reading}
          onEdit={onEdit}
        />
      ))}
    </>
  )
}

/** "Got it" — what the last turn recorded, as label and value rows. */
function Recorded({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border bg-background px-4 py-3">
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
        <CheckIcon className="size-3" strokeWidth={3} />
      </span>
      <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-xs leading-5 text-muted-foreground">
              {row.label}
            </dt>
            <dd className="min-w-0 leading-5 font-medium break-words">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function TrackerSection({
  section,
  reading,
  onEdit,
}: {
  section: WizardSection
  reading: boolean
  onEdit: (id: string) => void
}) {
  const Icon = section.icon
  const settled = section.steps.filter(
    (step) => step.state === "done" || step.state === "skipped"
  ).length
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border",
        section.state === "upcoming" ? "bg-muted/30" : "bg-background"
      )}
    >
      <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2.5">
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-lg",
            section.state === "done"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {section.state === "done" ? (
            <CheckIcon className="size-4" strokeWidth={3} />
          ) : (
            <Icon className="size-4" />
          )}
        </span>
        <h2 className="flex min-w-0 flex-1 items-center gap-1 truncate text-sm font-semibold">
          {section.title}
          {section.private ? (
            <LockIcon
              className="size-3 shrink-0 text-muted-foreground"
              aria-label="Private"
            />
          ) : null}
        </h2>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {section.state === "active" && reading ? (
            <LoaderIcon className="size-3.5 animate-spin" />
          ) : section.id === "review" ? (
            section.state === "active" ? (
              "Now"
            ) : (
              "Last"
            )
          ) : (
            `${settled} of ${section.steps.length}`
          )}
        </span>
      </div>
      <ol className="flex flex-col border-t px-2 py-2">
        {section.steps.map((step, index) => (
          <TrackerStep
            key={step.id}
            step={step}
            last={index === section.steps.length - 1}
            onEdit={onEdit}
          />
        ))}
      </ol>
    </section>
  )
}

function TrackerStep({
  step,
  last,
  onEdit,
}: {
  step: WizardStep
  last: boolean
  onEdit: (id: string) => void
}) {
  const active = step.state === "active"
  const done = step.state === "done"
  const skipped = step.state === "skipped"
  const body = (
    <>
      <span
        className={cn(
          "relative z-10 mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
          done && "bg-primary text-primary-foreground",
          skipped && "bg-muted text-muted-foreground",
          active && "border-2 border-primary",
          step.state === "upcoming" && "border border-border"
        )}
      >
        {done ? (
          <CheckIcon className="size-2.5" strokeWidth={3} />
        ) : skipped ? (
          <MinusIcon className="size-2.5" strokeWidth={3} />
        ) : active ? (
          <span className="size-1.5 rounded-full bg-primary" />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "flex items-center gap-1.5 text-sm leading-5",
            active ? "font-medium text-foreground" : "text-foreground",
            step.state === "upcoming" && "text-muted-foreground"
          )}
        >
          {step.label}
          {step.forecast ? (
            <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              Likely
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            "text-xs leading-5 break-words",
            done ? "text-muted-foreground" : "text-muted-foreground/70",
            skipped && "italic"
          )}
        >
          {done && step.value
            ? step.value
            : skipped
              ? (step.value ?? "Skipped")
              : step.prompt}
        </span>
      </span>
      {step.editable ? (
        <PencilIcon className="mt-1 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/step:opacity-100 group-focus-visible/step:opacity-100" />
      ) : null}
    </>
  )
  const classes = cn(
    "relative flex w-full gap-3 rounded-xl px-2 py-1.5 text-left",
    !last &&
      "after:absolute after:top-6 after:bottom-0 after:left-[15px] after:w-px after:bg-border",
    active && "bg-primary/5"
  )
  return (
    <li className="group/step">
      {step.editable ? (
        <button
          type="button"
          onClick={() => onEdit(step.id)}
          aria-label={`Change ${step.label.toLowerCase()}`}
          className={cn(
            classes,
            "transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
          )}
        >
          {body}
        </button>
      ) : (
        <div className={classes} aria-current={active ? "step" : undefined}>
          {body}
        </div>
      )}
    </li>
  )
}
