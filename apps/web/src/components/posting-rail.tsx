import * as React from "react"
import { Link } from "react-router"
import {
  ArrowRightIcon,
  CheckIcon,
  LoaderIcon,
  LockIcon,
  MinusIcon,
  PencilIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"

import { CriteriaEvidence } from "@/components/criteria-evidence"
import { PostingCard } from "@/components/posting-card"
import { PostingPage } from "@/components/posting-page"
import type { SearchPerson } from "@/lib/search-intake"
import type { RailModel, RailRow, RailStep } from "@/lib/posting-rail"

/**
 * The rail beside the posting conversation.
 *
 * WHY A TRANSCRIPT IS NOT ENOUGH. A conversation shows what has been said; it
 * does not show how much is left or what has been gathered, and a recruiter
 * three cards in should not have to scroll back through bubbles to see what
 * the posting says. So the rail holds the four steps and where the current one
 * is, the posting as it stands, the private brief as it builds, and how many
 * people it would find — all of it moving as answers land.
 *
 * A STEPPER, NOT A TODO LIST. The plan used to tick and strike through each
 * step the way a task list does, which read as "cancelled" rather than
 * "done", and its current-step glyph was a spinner that only spun while an
 * answer was being read — so most of the time it was a spinner standing
 * still. Now: a filled tick for done, a ring for where you are (the tick
 * spins inside it while reading), an empty ring for what is to come, and a
 * line joining them, which is what four steps in order look like.
 *
 * FACTS ARE ROWS; SETS ARE CHIPS. The posting and the brief are labelled
 * rows, because "Mumbai", "8–12 years" and "Hybrid" as three identical chips
 * had to be decoded one at a time, and a row can hold a dash where an answer
 * is still owed. Skills are chips, because a skill is one of a set and the
 * set is what is being read.
 *
 * A PENCIL ON EVERY ROW, AND IT ASKS THE QUESTION AGAIN. The rail is where a
 * recruiter notices "8–12 years — no, 10+", so it is where the way to change
 * it should be. It is not an input in the rail: the draft is folded from the
 * turns, so a change has to become one (`encodeChange`), and the form is
 * already the full editor. The pencil hands the page the question's id, and
 * the page docks that one question in the composer's place with the answer
 * as it stands ticked. Hidden while an answer is being read — the row is
 * about to move.
 *
 * STATUS AND COUNT PAUSE WHILE AN ANSWER IS BEING READ. The count would
 * otherwise sit there describing the brief before the answer, as if it were
 * current; while a reading is in flight it says "Updating…" instead.
 */
/** The record, or the posting as a candidate meets it — in the list, then opened. */
type View = string

/**
 * What Chat v3 (`components/chat-v3/`) adds to the rail, slot by slot. Every
 * slot is optional and absent everywhere else, so the other layouts draw the
 * rail exactly as before.
 */
export type RailExtras = {
  /** Beside a row's value: where it came from, and its lock. */
  rowAside?: (id: string) => React.ReactNode
  /** Under a row: what the market says about it. */
  rowBelow?: (id: string) => React.ReactNode
  /** Rows reveal in turn as they fill — this row's place in that order. */
  rowReveal?: (id: string) => number | null
  /** Above the sections, in Details. */
  top?: React.ReactNode
  /** Instead of Candidate details' skills chips. */
  requirements?: React.ReactNode
  /** Another view beside Details and Preview. */
  view?: { id: string; label: string; content: React.ReactNode }
  /** Asked to open a view — a finish card's "See who this finds" — as "id#n". */
  openView?: string | null
  /** Under everything, in Details. */
  bottom?: React.ReactNode
}

export function PostingRail({
  model,
  reading,
  onEdit,
  plan = true,
  extras,
}: {
  model: RailModel
  /** An answer is being read — the numbers below are about to change. */
  reading: boolean
  /** Ask this question again, to change its answer. */
  onEdit?: (id: string) => void
  /** The Plan section — off when `PlanBar` draws the steps across the top. */
  plan?: boolean
  extras?: RailExtras
}) {
  const edit = reading ? undefined : onEdit
  // WHAT HAS BEEN GATHERED, OR WHAT IT WILL LOOK LIKE. Details is the record
  // — the rows, the chips, the brief, with pencils. Preview is the posting
  // as a candidate meets it in the app: the list card, then the page it
  // opens to. Local to the rail: which way you are looking is not worth a
  // link.
  const [view, setView] = React.useState<View>("details")
  // A request to open a view, from outside: followed when it changes.
  const [opened, setOpened] = React.useState<string | null>(null)
  if ((extras?.openView ?? null) !== opened) {
    setOpened(extras?.openView ?? null)
    // "candidates#3": the view, and which press asked — so a second press
    // after looking elsewhere opens it again.
    if (extras?.openView) setView(extras.openView.split("#")[0])
  }
  const rowProps = {
    aside: extras?.rowAside,
    below: extras?.rowBelow,
    reveal: extras?.rowReveal,
  }
  const { people } = model
  // 375px — a phone's width, so the job card reads at the size a candidate
  // would see it.
  return (
    <aside className="flex h-full w-[375px] shrink-0 flex-col overflow-y-auto border-l bg-background">
      {/* Only the switcher up top: the Aura and the status line went — the
          bar (or the column's own steps) already says where things are. */}
      <div className="flex flex-col px-4 pt-4 pb-3">
        <Tabs
          value={view}
          onValueChange={(next) => setView(next as View)}
          className="w-full"
        >
          <TabsList className="w-full" aria-label="How to see the posting">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            {extras?.view ? (
              <TabsTrigger value={extras.view.id}>
                {extras.view.label}
              </TabsTrigger>
            ) : null}
          </TabsList>
        </Tabs>
      </div>

      {view === "preview" && model.draft ? (
        <div className="flex flex-col gap-4 px-4 pb-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              In the list
            </p>
            <PostingCard draft={model.draft} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Opened</p>
            <PostingPage draft={model.draft} />
          </div>
          <p className="text-xs text-muted-foreground">
            How a candidate would meet it in the app. Nothing is posted yet.
          </p>
        </div>
      ) : null}

      {/* A search's preview: the three people it ranks first, as Search
          Resume's cards draw them — with the verdict lines, because they are
          the reason each one is there. */}
      {view === "preview" && model.kind === "search" ? (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {model.preview?.length ? (
            <>
              <p className="text-xs font-medium text-muted-foreground">
                The first three it would find
              </p>
              {model.preview.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
              {people ? (
                <p className="text-xs text-muted-foreground">
                  {people.matching.toLocaleString("en-IN")} people in all — the
                  rest are on Search Resume.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {model.preview
                ? "The filters leave nobody — loosen one and people appear here."
                : "Nobody to show until the role is named."}
            </p>
          )}
        </div>
      ) : null}

      {extras?.view && view === extras.view.id ? (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {extras.view.content}
        </div>
      ) : null}

      {view === "details" ? (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {extras?.top}
          {plan ? (
            <Panel title="Plan">
              <ol className="flex flex-col">
                {model.steps.map((step, index) => (
                  <Step
                    key={step.label}
                    step={step}
                    last={index === model.steps.length - 1}
                    reading={reading}
                  />
                ))}
              </ol>
            </Panel>
          ) : null}

          {model.sections
            ? model.sections.map((section) => {
                const step =
                  section.step === undefined
                    ? undefined
                    : model.steps[section.step]
                return (
                  <Panel
                    key={section.id}
                    icon={step?.icon}
                    title={section.title}
                    aside={
                      <>
                        {section.private ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <LockIcon className="size-3" />
                            Private
                          </span>
                        ) : null}
                        <StepStatus step={step} reading={reading} />
                      </>
                    }
                  >
                    {section.rows?.length ? (
                      <Rows rows={section.rows} onEdit={edit} />
                    ) : null}
                    {section.chips?.map((group) => (
                      <div
                        key={group.label}
                        className={cn(
                          "flex flex-col gap-2",
                          section.rows?.length && "border-t pt-3"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            {group.label}
                          </p>
                          {edit &&
                          group.editId &&
                          (group.items.length || group.empty) ? (
                            <Pencil
                              label={`Change ${group.label.toLowerCase()}`}
                              onClick={() => edit(group.editId!)}
                            />
                          ) : null}
                        </div>
                        {group.items.length ? (
                          <Chips chips={group.items} tone="strong" />
                        ) : group.empty ? (
                          <p className="text-sm leading-5 text-muted-foreground">
                            {group.empty}
                          </p>
                        ) : (
                          <Dash />
                        )}
                      </div>
                    ))}
                    {section.list ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {section.list.label}
                        </p>
                        {section.list.items.length ? (
                          <ol className="flex flex-col gap-1.5 text-sm">
                            {section.list.items.map((item, index) => (
                              <li key={item} className="flex gap-2">
                                <span className="w-4 shrink-0 text-right text-muted-foreground tabular-nums">
                                  {index + 1}.
                                </span>
                                <span className="min-w-0 break-words">
                                  {item}
                                </span>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {section.list.empty}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </Panel>
                )
              })
            : null}

          {!model.sections ? (
            <>
              <Panel
                icon={model.steps[0]?.icon}
                title="Job details"
                aside={<StepStatus step={model.steps[0]} reading={reading} />}
              >
                <Rows rows={model.job} onEdit={edit} {...rowProps} />
              </Panel>

              <Panel
                icon={model.steps[1]?.icon}
                title="Candidate details"
                aside={<StepStatus step={model.steps[1]} reading={reading} />}
              >
                <Rows rows={model.requirements} onEdit={edit} {...rowProps} />
                {extras?.requirements ? (
                  <div className="border-t pt-3">{extras.requirements}</div>
                ) : (
                  <div className="flex flex-col gap-2 border-t pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {model.nice.length ? "Must have" : "Skills"}
                      </p>
                      {edit && model.must.length ? (
                        <Pencil
                          label="Change the skills"
                          onClick={() => edit("skills")}
                        />
                      ) : null}
                    </div>
                    {model.must.length ? (
                      <Chips chips={model.must} tone="strong" />
                    ) : (
                      <Dash />
                    )}
                    {model.nice.length ? (
                      <>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">
                          Good to have
                        </p>
                        <Chips chips={model.nice} />
                      </>
                    ) : null}
                  </div>
                )}
              </Panel>

              {model.brief.length || model.screening !== null ? (
                <Panel
                  icon={model.steps[2]?.icon}
                  // The step's own name: "Selection criteria", or "Screening
                  // questions" when the brief is switched off on /settings.
                  title={model.steps[2]?.label ?? "Selection criteria"}
                  aside={
                    <>
                      {model.steps[2]?.private ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <LockIcon className="size-3" />
                          Private
                        </span>
                      ) : null}
                      <StepStatus step={model.steps[2]} reading={reading} />
                    </>
                  }
                >
                  {model.brief.length ? (
                    <Rows rows={model.brief} onEdit={edit} {...rowProps} />
                  ) : null}
                  {/* The optional tail of the step: what candidates answer when
                  they apply. Drawn once the step has reached it. */}
                  {model.screening !== null ? (
                    <div
                      className={cn(
                        "flex flex-col gap-2",
                        model.brief.length && "border-t pt-3"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* The panel is already called that when the brief
                            is switched off. */}
                        <p className="text-xs font-medium text-muted-foreground">
                          {model.steps[2]?.private ? "Screening questions" : ""}
                        </p>
                        {edit ? (
                          <Pencil
                            label="Change the screening questions"
                            onClick={() => edit("screening")}
                          />
                        ) : null}
                      </div>
                      {model.screening.length ? (
                        <ol className="flex flex-col gap-1.5 text-sm">
                          {model.screening.map((question, index) => (
                            <li key={question} className="flex gap-2">
                              <span className="w-4 shrink-0 text-right text-muted-foreground tabular-nums">
                                {index + 1}.
                              </span>
                              <span className="min-w-0 break-words">
                                {question}
                              </span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          None — candidates apply straight away.
                        </p>
                      )}
                    </div>
                  ) : null}
                </Panel>
              ) : null}
            </>
          ) : null}

          {people ? (
            <Panel icon={UsersIcon} title="People this would find" tone="muted">
              <p
                className={cn(
                  "text-2xl font-semibold tabular-nums transition-opacity",
                  reading && "opacity-40"
                )}
              >
                {people.matching.toLocaleString("en-IN")}
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                  of {people.total.toLocaleString("en-IN")}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {reading
                  ? "Updating…"
                  : "Estimated across the database, with this brief's filters."}
              </p>
              <Link
                to={people.href}
                className="inline-flex items-center gap-1 self-start text-xs font-medium text-primary hover:underline"
              >
                Open the search
                <ArrowRightIcon className="size-3" />
              </Link>
            </Panel>
          ) : null}
          {extras?.bottom}
        </div>
      ) : null}
    </aside>
  )
}

/**
 * One step of the plan: the glyph in a column of its own, the line down from
 * it to the next glyph, and the label and detail beside. The line is drawn
 * from the glyph's centre to the bottom of the row, so the gap between steps
 * is the row's own padding rather than a flex gap the line could not cross.
 */
function Step({
  step,
  last,
  reading,
}: {
  step: RailStep
  last: boolean
  reading: boolean
}) {
  const active = step.state === "active"
  return (
    <li
      className={cn(
        "relative flex gap-3 pb-4 text-sm",
        !last &&
          "after:absolute after:top-6 after:bottom-0 after:left-[9px] after:w-px after:bg-border"
      )}
    >
      <Glyph state={step.state} reading={reading} className="mt-px" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            active ? "font-medium text-foreground" : "text-muted-foreground"
          )}
        >
          {step.label}
        </span>
        {step.detail ? (
          <span className="truncate text-xs text-muted-foreground">
            {step.detail}
          </span>
        ) : null}
      </span>
    </li>
  )
}

/** The step's mark: a filled tick, a ring with a dot (a spinner while reading), an empty ring. */
function Glyph({
  state,
  reading,
  className,
}: {
  state: RailStep["state"]
  reading: boolean
  className?: string
}) {
  const active = state === "active"
  const done = state === "done"
  return (
    <span
      className={cn(
        "relative z-10 grid size-5 shrink-0 place-items-center rounded-full",
        done && "bg-primary text-primary-foreground",
        active && "border-2 border-primary text-primary",
        state === "waiting" && "border border-border",
        state === "skipped" && "bg-muted text-muted-foreground",
        className
      )}
    >
      {done ? (
        <CheckIcon className="size-3" strokeWidth={3} />
      ) : state === "skipped" ? (
        <MinusIcon className="size-3" strokeWidth={3} />
      ) : active ? (
        reading ? (
          <LoaderIcon className="size-3 animate-spin" />
        ) : (
          <span className="size-1.5 rounded-full bg-primary" />
        )
      ) : null}
    </span>
  )
}

/**
 * The plan across the top of the chat — "Chat with rail v2". Four segments
 * with a rule between, each an icon tile beside "Step N" over the step's
 * name, the current one underlined in the brand — a stepper of the kind a
 * multi-page form draws, since that is what the five stages are. Done steps
 * swap their icon for a tick; the current one spins while an answer is read.
 *
 * SIZED BY WHAT IT SAYS. Each step takes an equal share of the bar and
 * stretches only if its own words need more (`flex-1` with no `min-w-0`,
 * so a segment never shrinks below its label), so four steps fit the bar
 * at any width that can hold their names, and nothing wraps or is cut.
 * Narrower than that the bar scrolls sideways, snapping to a step, with
 * the current step scrolled into view as it changes; the scrollbar is not
 * drawn, the step cut off at the edge being the affordance. It sits inside
 * the chat column, not across the rail, so it is the conversation's
 * progress and the rail stays the posting's record.
 *
 * `meter` (Chat v2.7) swaps the bottom border and the current step's
 * underline for a PROGRESS BAR along the bar's bottom edge, a section under
 * each step: full for a step that is done, part-filled for the current one by
 * its own questions answered (`progress` on `RailStep` — Job details at 3 of 4
 * is three quarters), empty for what is to come. The fill's width is a CSS
 * transition, so it glides forward as answers land. One section per step
 * rather than one bar across the whole, because the steps are not equal
 * widths (each is sized by its label) and a single bar's quarter marks would
 * not sit under them.
 *
 * `cheer` (Chat v2.7) is a step that has just finished in this visit: its
 * tick badge pops in, its segment flashes the brand's tint, and the next
 * step's tile pulses — the eye taken from what is done to what is next, while
 * the meter fills. Web Animations on elements that are always there (the
 * flash is an invisible layer in every segment), so nothing re-renders to
 * play it and nothing plays on a reload. Skipped under reduced motion.
 */
export function PlanBar({
  steps,
  reading,
  cheer,
  meter = false,
  className,
}: {
  steps: RailStep[]
  reading: boolean
  cheer?: { label: string; at: number } | null
  meter?: boolean
  className?: string
}) {
  const current = React.useRef<HTMLLIElement>(null)
  const list = React.useRef<HTMLOListElement>(null)
  const cheered = cheer?.label
  const cheeredAt = cheer?.at
  React.useEffect(() => {
    if (!cheered || !list.current) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const done = list.current.querySelector<HTMLElement>(
      `[data-plan-step="${CSS.escape(cheered)}"]`
    )
    done?.querySelector("[data-plan-badge]")?.animate(
      [
        { transform: "scale(0.2)", opacity: 0 },
        { transform: "scale(1.4)", opacity: 1, offset: 0.6 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 520, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
    )
    done
      ?.querySelector("[data-plan-flash]")
      ?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 1200,
        easing: "ease-out",
      })
    const next = list.current.querySelector<HTMLElement>(
      '[aria-current="step"]'
    )
    next
      ?.querySelector("[data-plan-tile]")
      ?.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.12)" },
          { transform: "scale(1)" },
        ],
        { duration: 520, delay: 260, easing: "ease-out" }
      )
  }, [cheered, cheeredAt])
  const activeLabel = steps.find((step) => step.state === "active")?.label
  React.useEffect(() => {
    current.current?.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: "smooth",
    })
  }, [activeLabel])

  return (
    <ol
      ref={list}
      aria-label="Plan"
      className={cn(
        "flex shrink-0 snap-x [scrollbar-width:none] divide-x overflow-x-auto bg-background [&::-webkit-scrollbar]:hidden",
        !meter && "border-b",
        className
      )}
    >
      {steps.map((step, index) => {
        const active = step.state === "active"
        const done = step.state === "done"
        const Icon = step.icon
        return (
          <li
            key={step.label}
            ref={active ? current : undefined}
            aria-current={active ? "step" : undefined}
            data-plan-step={step.label}
            className={cn(
              "relative flex flex-1 snap-start items-center gap-3 px-4 py-3",
              // The underline: a bar along the segment's bottom edge, over
              // the rail's own border — or, with `meter`, the progress bar
              // below instead.
              active &&
                !meter &&
                "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary"
            )}
          >
            {meter ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-muted"
              >
                <span
                  className={cn(
                    "block h-full transition-[width] duration-700 ease-out",
                    step.state === "skipped"
                      ? "bg-muted-foreground/40"
                      : "bg-primary"
                  )}
                  style={{
                    width: `${
                      done || step.state === "skipped"
                        ? 100
                        : active
                          ? Math.max((step.progress ?? 0) * 100, 6)
                          : 0
                    }%`,
                  }}
                />
              </span>
            ) : null}
            {/* The flash `cheer` plays when this step finishes: the brand's
                tint, invisible until then. */}
            <span
              data-plan-flash
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-primary/10 opacity-0"
            />
            {/* The step's own icon, always; done is a badge on the tile's
                corner — a white tick in a brand circle — not a tick in
                place of the icon, so a finished step still says what it
                was. */}
            <span
              data-plan-tile
              className={cn(
                "relative grid size-10 shrink-0 place-items-center rounded-lg bg-muted",
                step.state === "waiting"
                  ? "text-muted-foreground"
                  : "text-foreground"
              )}
            >
              {active && reading ? (
                <LoaderIcon className="size-5 animate-spin" />
              ) : (
                <Icon className="size-5" />
              )}
              {done ? (
                <span
                  data-plan-badge
                  aria-label="Done"
                  className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-background"
                >
                  <CheckIcon className="size-2.5" strokeWidth={3} />
                </span>
              ) : step.state === "skipped" ? (
                <span
                  aria-label="Skipped"
                  className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-muted-foreground text-background ring-2 ring-background"
                >
                  <MinusIcon className="size-2.5" strokeWidth={3} />
                </span>
              ) : null}
            </span>
            <span className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                Step {index + 1}
              </span>
              <span
                className={cn(
                  "flex items-center gap-1 text-sm leading-5 font-semibold whitespace-nowrap",
                  step.state === "waiting"
                    ? "text-muted-foreground"
                    : "text-foreground"
                )}
              >
                {step.label}
                {step.private ? (
                  <LockIcon
                    className="size-3 shrink-0 text-muted-foreground"
                    aria-label="Private"
                  />
                ) : null}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Label beside value. A missing value is a dash, so the row still says what
 * it is for. The pencil shows on hover or focus, on rows that have a value
 * to change — a dash is a question the conversation is about to ask anyway.
 */
function Rows({
  rows,
  onEdit,
  aside,
  below,
  reveal,
}: {
  rows: RailRow[]
  onEdit?: (id: string) => void
  aside?: RailExtras["rowAside"]
  below?: RailExtras["rowBelow"]
  reveal?: RailExtras["rowReveal"]
}) {
  return (
    <dl className="grid grid-cols-[minmax(5.5rem,auto)_1fr] gap-x-3 gap-y-1.5 text-sm">
      {rows.map((row) => {
        const id = row.id
        const editable = onEdit && id && row.value !== null
        const order = id && reveal ? reveal(id) : null
        const under = id && below ? below(id) : null
        return (
          // Keyed on the value where rows reveal, so a row that fills plays
          // its entrance then and only then.
          <div
            key={reveal ? `${row.label}\u0001${row.value}` : row.label}
            className="group/row contents"
          >
            <dt className="py-0.5 text-xs leading-5 text-muted-foreground">
              {row.label}
            </dt>
            <dd
              className={cn(
                "flex min-w-0 flex-col gap-1 py-0.5 leading-5",
                order !== null &&
                  "animate-in duration-500 fill-mode-both fade-in slide-in-from-left-1"
              )}
              style={
                order !== null
                  ? { animationDelay: `${order * 140}ms` }
                  : undefined
              }
            >
              <span className="flex min-w-0 items-start gap-1">
                <span className="min-w-0 flex-1 font-medium break-words">
                  {row.value ?? <Dash />}
                </span>
                {id && aside ? aside(id) : null}
                {editable ? (
                  <Pencil
                    label={`Change ${row.label.toLowerCase()}`}
                    onClick={() => onEdit(id)}
                    className="-my-0.5 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
                  />
                ) : null}
              </span>
              {under}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function Pencil({
  label,
  onClick,
  className,
}: {
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-[opacity,color,background-color] outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className
      )}
    >
      <PencilIcon className="size-3.5" />
    </button>
  )
}

function Dash() {
  return (
    <span className="text-muted-foreground/50" aria-label="Not yet">
      —
    </span>
  )
}

/**
 * A card per section, in the Details view — headed by the step's own icon
 * and its state, so the rail's sections read as the bar's steps opened up:
 * done, in progress with its count, or next. `muted` is the count's card,
 * which is a figure rather than a record.
 */
function Panel({
  icon: Icon,
  title,
  aside,
  tone = "card",
  children,
}: {
  icon?: LucideIcon
  title: string
  aside?: React.ReactNode
  tone?: "card" | "muted"
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border",
        tone === "muted" ? "bg-muted/40" : "bg-background"
      )}
    >
      <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2.5">
        {Icon ? (
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
        ) : null}
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {title}
        </h2>
        <div className="flex shrink-0 items-center gap-2">{aside}</div>
      </div>
      <div className="flex flex-col gap-3 border-t px-3.5 py-3">{children}</div>
    </section>
  )
}

/** The step's state as a small chip: a tick, its count, or "Next". */
function StepStatus({
  step,
  reading,
}: {
  step: RailStep | undefined
  reading: boolean
}) {
  if (!step) return null
  if (step.state === "done")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        <CheckIcon className="size-3" strokeWidth={3} />
        Done
      </span>
    )
  if (step.state === "skipped")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <MinusIcon className="size-3" strokeWidth={3} />
        Skipped
      </span>
    )
  if (step.state === "active")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
        {reading ? (
          <LoaderIcon className="size-3 animate-spin" />
        ) : (
          <span className="size-1.5 rounded-full bg-primary" />
        )}
        {step.detail ?? "Now"}
      </span>
    )
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Next
    </span>
  )
}

function Chips({
  chips,
  tone = "soft",
}: {
  chips: string[]
  tone?: "soft" | "strong"
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip}
          className={cn(
            "max-w-full truncate rounded-4xl px-2.5 py-1 text-xs font-medium",
            tone === "strong"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-foreground"
          )}
        >
          {chip}
        </span>
      ))}
    </div>
  )
}

/**
 * One of a search's first three, for the Preview: who they are, how they
 * score, and the verdict lines that put them there — the same lines the
 * result cards draw, from the same `verdictsFor`.
 */
export function PersonCard({ person }: { person: SearchPerson }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-background p-3">
      <div className="flex items-start gap-3">
        <Avatar className="size-10">
          <AvatarImage src={person.photo} alt="" />
          <AvatarFallback>
            {person.name
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{person.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {person.title
              ? `${person.title}${person.company ? ` at ${person.company}` : ""}`
              : person.location}
          </p>
          <p className="text-xs text-muted-foreground">
            {person.years} yrs · {person.location}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 tabular-nums">
          {person.score}%
        </Badge>
      </div>
      <CriteriaEvidence verdicts={person.verdicts} stacked />
    </div>
  )
}
