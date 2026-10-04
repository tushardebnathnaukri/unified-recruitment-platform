import * as React from "react"
import {
  ArrowRightIcon,
  CheckIcon,
  FileTextIcon,
  HistoryIcon,
  MicIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TextIcon,
  UploadIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { useAgent } from "@/components/ai-agent/shared"
import { CITY_ALIAS, ORDER, ROLES } from "@/lib/ai-agent/data"
import {
  briefSuggestions,
  sampleJd,
  type BriefSuggestion,
} from "@/lib/ai-agent/suggest"

const BRIEF_LABEL = {
  role: "Job title",
  loc: "Location",
  exp: "Experience",
  sal: "Budget",
  skills: "Key skills",
  ind: "Industry / domain",
} as const

const BRIEF_TEMPLATE: Record<keyof typeof BRIEF_LABEL, string> = {
  role: " Role: ",
  loc: " Location: ",
  exp: " Experience: __–__ yrs.",
  sal: " Budget: __–__L.",
  skills: " Key skills: ",
  ind: " Industry / domain: ",
}

/** Every skill any sample role knows, for the "has skills" check. */
const ALL_SKILLS = ORDER.flatMap((key) =>
  ROLES[key].skills.concat(ROLES[key].moreSkills).map((x) => x.toLowerCase())
)

/**
 * The prototype's brief-strength meter (its `N1`): six things a good brief
 * covers, read off the text as it is typed, and a nudge to add the missing
 * ones as fill-in-the-blank stubs.
 */
function briefStrength(note: string) {
  const t = " " + (note || "").toLowerCase() + " "
  const has = {
    role: /manager|head|lead|director|partner|executive|analyst|hrbp|pm\b|vp|officer|specialist|associate/.test(
      t
    ),
    loc:
      Object.keys(CITY_ALIAS).some((a) => t.indexOf(a) > -1) ||
      /remote|hybrid/.test(t),
    exp: /\d{1,2}\s*(?:-|–|to)\s*\d{1,2}\s*\+?\s*(?:yrs|years|yr)|\d{1,2}\+?\s*(?:yrs|years)/.test(
      t
    ),
    sal: /\d+\s*(?:-|–|to)?\s*\d*\s*(?:l\b|lpa|lakh|lakhs|cr\b)|(?:budget|ctc)[^.\n]{0,12}\d/.test(
      t
    ),
    skills:
      ALL_SKILLS.some((x) => t.indexOf(x) > -1) ||
      /skills?:\s*(?!industry|budget|location|experience|role)[a-z]{3,}|experience (?:in|with) [a-z]{3,}|expert in|strong (?:on|in)/.test(
        t
      ),
    ind:
      /saas|fintech|bfsi|banking|fmcg|d2c|e-?commerce|startup|consumer|payments|pharma|healthcare|it services|insurance|retail|manufacturing|edtech/.test(
        t
      ) ||
      /(?:industry|domain)[^:\n]{0,10}:\s*(?!budget|location|experience|role|key)[a-z]{3,}/.test(
        t
      ),
  }
  const keys = Object.keys(has) as (keyof typeof has)[]
  const n = keys.filter((k) => has[k]).length
  const empty = !t.trim()
  const level = empty ? 0 : n === 6 ? 4 : n === 5 ? 3 : n >= 3 ? 2 : 1
  const missing = keys.filter((k) => !has[k])
  return {
    level,
    // Covered first, so the meter fills from the left.
    segments: keys
      .map((k) => ({
        k,
        on: has[k],
        tip: BRIEF_LABEL[k] + (has[k] ? " ✓" : " · missing"),
      }))
      .sort((a, b) => Number(b.on) - Number(a.on)),
    count: empty ? "" : n + "/6",
    label: [
      "Brief",
      "Basic brief",
      "Good brief",
      "Almost complete",
      "Complete brief",
    ][level],
    hint: empty
      ? "Tip: include job title, location, experience, budget, key skills and industry"
      : !missing.length
        ? "All key details covered."
        : "Add to complete role details & targeting:",
    adds: empty ? [] : missing.slice(0, 4),
  }
}

/** The meter's colour by level: empty, thin, good (AI violet), complete. */
const LEVEL_FILL = [
  "bg-muted-foreground/30",
  "bg-warning",
  "bg-primary",
  "bg-primary",
  "bg-primary",
]
const LEVEL_TEXT = [
  "text-muted-foreground",
  "text-warning",
  "text-primary",
  "text-primary",
  "text-primary",
]

/** The brief screen: "Who should I find for you?" */
/**
 * The prototype's introduction — the "Who should I find for you?" header,
 * "How it works" and "Meet your agent team" — hidden for now, not deleted,
 * so the brief box opens the page. Flip this to bring them back.
 */
const SHOW_INTRO = false

export function AgentBrief() {
  const { agent, state, brandName } = useAgent()
  const box = React.useRef<HTMLTextAreaElement>(null)
  const strength = briefStrength(state.note)
  const voiceLabel =
    ROLES[state.voiceKey || ORDER[state.voiceIdx % ORDER.length]].fn

  // The suggestions sheet: open while the box is focused and the recruiter is
  // typing a short line, closed by Escape or by picking one until they type
  // again.
  const [focused, setFocused] = React.useState(false)
  const [dismissed, setDismissed] = React.useState(false)
  const [active, setActive] = React.useState(-1)
  const suggestions = focused && !dismissed ? briefSuggestions(state.note) : []

  const pick = (suggestion: BriefSuggestion) => {
    const R = ROLES[suggestion.role]
    if (suggestion.kind === "past") {
      agent.setState({
        note: R.note,
        fileMsg: "",
        srcJd: false,
        pjOpen: false,
        pastJob:
          suggestion.title + " (" + suggestion.meta.split(" · ")[0] + ")",
      })
      agent.toast(
        "Pre-filled from your past job: " +
          suggestion.title +
          ". Edit anything before you continue."
      )
    } else if (suggestion.kind === "brief") {
      agent.setState({ note: R.note, fileMsg: "", srcJd: false, pastJob: null })
    } else {
      agent.setState({
        note: sampleJd(suggestion.role),
        fileMsg:
          "Loaded a sample " +
          R.fn +
          " JD. Press Find candidates and I’ll read it.",
        srcJd: true,
        pastJob: null,
      })
    }
    setDismissed(true)
    setActive(-1)
    box.current?.focus()
  }

  const onBriefKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!suggestions.length) return
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const step = event.key === "ArrowDown" ? 1 : -1
      setActive((i) => (i + step + suggestions.length) % suggestions.length)
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault()
      pick(suggestions[active])
    } else if (event.key === "Escape") {
      setDismissed(true)
    }
  }

  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (/\.(txt|md)$/i.test(file.name)) {
      void file.text().then((text) =>
        agent.setState({
          note: text.slice(0, 4000),
          fileMsg:
            "Read “" +
            file.name +
            "”. Review the text, then press Find candidates or Post a job.",
        })
      )
    } else {
      agent.setState({
        fileMsg:
          "Got “" +
          file.name +
          "”. In production I parse PDF and DOC files; this prototype reads .txt only, so paste the JD text, or start typing the role to pick a sample.",
      })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6 px-4 py-10 md:py-14 lg:px-6">
      {SHOW_INTRO ? (
        <div className="flex flex-col items-start gap-3">
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-primary">
            <AiTile className="size-6.5 rounded-lg" iconClassName="size-3.5" />
            Your {brandName} AI Agent
            <span className="font-medium text-muted-foreground">·</span>
            <span className="text-foreground">Sources candidates for you</span>
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Who should I find for you?
          </h1>
          <p className="max-w-[640px] text-base leading-relaxed text-muted-foreground">
            Brief me once. I’ll shape the role, find relevant candidates and do
            the legwork. You review and decide.
          </p>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[13px] font-semibold text-primary">
            <ShieldCheckIcon className="size-3.5" />
            Your agent does the legwork. You stay in control.
          </span>
        </div>
      ) : null}

      {/* The brief, in a card, with the suggestions sheet hanging under it. */}
      <div className="relative">
        <div className="relative flex flex-col gap-3.5 overflow-hidden rounded-2xl border border-border bg-background p-4.5 shadow-[0_12px_32px_color-mix(in_oklch,var(--foreground)_8%,transparent)] ring-4 ring-muted">
          <label htmlFor="brief" className="sr-only">
            Role brief
          </label>
          <textarea
            id="brief"
            ref={box}
            value={state.note}
            onChange={(event) => {
              agent.setState({ note: event.target.value })
              setDismissed(false)
              setActive(-1)
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={onBriefKey}
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls="brief-suggestions"
            aria-autocomplete="list"
            aria-activedescendant={
              active >= 0 ? "brief-s-" + suggestions[active]?.id : undefined
            }
            placeholder="e.g. Need a Regional Sales Manager for Mumbai, enterprise SaaS, 8–12 yrs, has sold to BFSI, manages 5–6 AEs, budget 35–45L, backfill…"
            className="min-h-[150px] resize-y bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground"
          />

          {state.recording ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted px-3 py-2.5">
              <Wave />
              <span className="text-sm font-semibold text-primary">
                Listening… speak, I'm typing it in
              </span>
              <span className="text-xs text-muted-foreground">
                (demo dictates a sample {voiceLabel} brief)
              </span>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => agent.stopVoice()}
              >
                Stop
              </Button>
            </div>
          ) : null}

          {/* How complete the brief is, and what would complete it. */}
          <div className="flex flex-wrap items-center gap-2.5 text-[12.5px]">
            <span
              className="inline-flex gap-[3px]"
              role="img"
              aria-label={`${strength.count} key details covered`}
            >
              {strength.segments.map((segment) => (
                <span
                  key={segment.k}
                  title={segment.tip}
                  className={cn(
                    "h-1.5 w-3.5 rounded-full",
                    segment.on ? LEVEL_FILL[strength.level] : "bg-muted"
                  )}
                />
              ))}
            </span>
            <span className={cn("font-bold", LEVEL_TEXT[strength.level])}>
              {strength.label}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {strength.count}
            </span>
            <span className="text-muted-foreground">{strength.hint}</span>
            {strength.adds.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  agent.setState({
                    note:
                      (state.note || "").replace(/\s*$/, "") +
                      BRIEF_TEMPLATE[k],
                  })
                  setTimeout(() => box.current?.focus(), 0)
                }}
                className="rounded-full border border-dashed border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-primary transition-colors hover:border-primary/40"
              >
                + {BRIEF_LABEL[k]}
              </button>
            ))}
          </div>

          {state.fileMsg ? (
            <div className="rounded-lg bg-warning/10 px-3 py-2 text-[13px] text-foreground">
              {state.fileMsg}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<label />}
              className="relative cursor-pointer"
            >
              <UploadIcon data-icon="inline-start" />
              Upload JD
              <input
                type="file"
                accept=".txt,.md,.pdf,.doc,.docx"
                onChange={onFile}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </Button>
            <span className="flex-1" />
            <Button
              variant={state.recording ? "default" : "outline"}
              size="icon-lg"
              aria-label={
                state.recording ? "Stop dictation" : "Dictate your brief"
              }
              title={state.recording ? "Stop dictation" : "Dictate your brief"}
              onClick={() => agent.toggleVoice()}
            >
              <MicIcon />
            </Button>
            <Button
              size="lg"
              disabled={!state.note.trim()}
              onClick={() => agent.understand()}
            >
              <SparklesIcon data-icon="inline-start" />
              Find candidates
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
        {suggestions.length ? (
          <SuggestionSheet
            suggestions={suggestions}
            active={active}
            onHover={setActive}
            onPick={pick}
          />
        ) : null}
      </div>

      {SHOW_INTRO ? (
        <>
          <HowItWorks />
          <AgentTeam brandName={brandName} />
        </>
      ) : null}
    </div>
  )
}

const SHEET_GROUPS: { kind: BriefSuggestion["kind"][]; title: string }[] = [
  { kind: ["past"], title: "From your past jobs" },
  { kind: ["brief", "jd"], title: "Samples" },
]

/**
 * What matches the line being typed, under the box: past jobs to pre-fill
 * from, then sample briefs and JDs. It never takes focus — the caret stays in
 * the box, arrows move the highlight and Return uses it.
 */
function SuggestionSheet({
  suggestions,
  active,
  onHover,
  onPick,
}: {
  suggestions: BriefSuggestion[]
  active: number
  onHover: (index: number) => void
  onPick: (suggestion: BriefSuggestion) => void
}) {
  return (
    <div
      id="brief-suggestions"
      role="listbox"
      aria-label="Suggestions"
      className="absolute inset-x-0 top-full z-30 mt-2 flex max-h-96 animate-in flex-col gap-1 overflow-y-auto rounded-2xl border bg-background p-1.5 shadow-lg fade-in slide-in-from-top-1"
    >
      {SHEET_GROUPS.map((group) => {
        const rows = suggestions.filter((s) => group.kind.includes(s.kind))
        if (!rows.length) return null
        return (
          <div key={group.title} role="group" aria-label={group.title}>
            <div className="px-2.5 pt-1.5 pb-1 text-xs font-semibold text-muted-foreground">
              {group.title}
            </div>
            {rows.map((suggestion) => {
              const index = suggestions.indexOf(suggestion)
              const Icon =
                suggestion.kind === "past"
                  ? HistoryIcon
                  : suggestion.kind === "jd"
                    ? FileTextIcon
                    : TextIcon
              return (
                <div
                  key={suggestion.id}
                  id={"brief-s-" + suggestion.id}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => onHover(index)}
                  onClick={() => onPick(suggestion)}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2",
                    index === active && "bg-muted"
                  )}
                >
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {suggestion.title}
                      {suggestion.kind !== "past" ? (
                        <span className="rounded-full bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground">
                          {suggestion.kind === "jd"
                            ? "Sample JD"
                            : "Sample brief"}
                        </span>
                      ) : null}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {suggestion.meta}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/** The AI's mark: a sparkle on the AI gradient. */
export function AiTile({
  className,
  iconClassName,
}: {
  className?: string
  iconClassName?: string
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center bg-primary text-primary-foreground",
        className
      )}
    >
      <SparklesIcon className={iconClassName} />
    </span>
  )
}

/** The prototype's dictation wave: six bars rising and falling in turn. */
export function Wave() {
  return (
    <span aria-hidden="true" className="flex h-4 items-center gap-[3px]">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="w-[3px] animate-pulse rounded-full bg-primary"
          style={{
            height: `${[8, 14, 10, 16, 9, 12][i]}px`,
            animationDelay: `${i * 120}ms`,
          }}
        />
      ))}
    </span>
  )
}

const STEPS = [
  {
    n: 1,
    tag: "You",
    tagTone: "bg-primary/10 text-primary",
    title: "Describe the role",
    body: "Type, paste, upload a JD or just speak it.",
  },
  {
    n: 2,
    tag: "Your agent works",
    tagTone: "bg-primary text-primary-foreground",
    title: "Discover candidates",
    body: "Your agent shapes the role, sets the targeting and finds matching candidates.",
    ai: true,
  },
  {
    n: 3,
    tag: "You decide",
    tagTone: "bg-primary/10 text-primary",
    title: "Choose how to source",
    body: "Post the job for applicants, or let your AI Agent find profiles without posting.",
  },
]

function HowItWorks() {
  return (
    <section
      aria-label="How it works"
      className="mt-1.5 flex flex-col gap-3.5 rounded-2xl border border-border/60 bg-linear-135 from-muted/60 to-background p-4.5"
    >
      <div className="flex flex-wrap items-baseline gap-2.5">
        <span className="text-lg font-semibold tracking-tight">
          Your agent does the legwork. You make the calls.
        </span>
        <span className="text-[13px] text-muted-foreground">
          From brief to relevant candidates in minutes.
        </span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="flex flex-col gap-2 rounded-xl border bg-background p-4"
          >
            <div className="flex items-center gap-2">
              <span className="grid size-5.5 place-items-center rounded-full bg-muted text-xs font-bold">
                {step.n}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                  step.tagTone
                )}
              >
                {step.ai ? <SparklesIcon className="size-3" /> : null}
                {step.tag}
              </span>
            </div>
            <span className="text-[15px] font-bold">{step.title}</span>
            <span className="text-[13px] leading-snug text-muted-foreground">
              {step.body}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-[12.5px] font-semibold text-primary">
        {[
          "Every suggestion shows its source",
          "Your edits are never overwritten",
          "Nothing goes live without you",
        ].map((line) => (
          <span key={line} className="inline-flex items-center gap-1.5">
            <CheckIcon className="size-3" strokeWidth={3} />
            {line}
          </span>
        ))}
      </div>
    </section>
  )
}

function AgentTeam({ brandName }: { brandName: string }) {
  const agents = [
    {
      name: "Posting Agent",
      body: `Publishes your job on ${brandName} and brings in applicants.`,
      plan: "Pro · Pro + Boost",
      brand: true,
    },
    {
      name: "Promotion Agent",
      body: `Puts your job in front of 3× more relevant candidates across ${brandName}, app and email.`,
      plan: "Pro + Boost",
    },
    {
      name: "Sourcing Agent",
      body: `Searches the ${brandName} database for people who match your must-haves.`,
      plan: "Every option",
    },
    {
      name: "Screening Agent",
      body: "Ranks every applicant and profile against your must-haves, with reasons.",
      plan: "Every option",
    },
    {
      name: "Outreach Agent",
      body: "Invites matching candidates by email and app notification, using the message you approve.",
      plan: "Pro · Pro + Boost",
    },
  ]
  return (
    <section
      aria-label="Meet your agent team"
      className="flex flex-col gap-3.5 rounded-2xl border border-border/60 bg-background p-4.5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <AiTile className="size-9.5 rounded-xl" iconClassName="size-4.5" />
        <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
          <span className="text-lg font-semibold tracking-tight">
            Meet your agent team
          </span>
          <span className="text-[13px] text-muted-foreground">
            Your {brandName} AI Agent manages five specialist agents. Each has
            one job. You choose which ones work on each role.
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-bold text-primary">
        <span className="h-px w-4.5 bg-border" />
        Managed by your {brandName} AI Agent
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 @3xl/main:grid-cols-5">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className="flex min-w-0 flex-col gap-2 rounded-xl border bg-background p-3.5"
          >
            {agent.brand ? (
              <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
                <SparklesIcon className="size-3.5" />
              </span>
            ) : (
              <AiTile className="size-7 rounded-lg" iconClassName="size-3.5" />
            )}
            <span className="text-sm font-bold">{agent.name}</span>
            <span className="flex-1 text-[12.5px] leading-snug text-muted-foreground">
              {agent.body}
            </span>
            <span className="self-start rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-primary">
              {agent.plan}
            </span>
          </div>
        ))}
      </div>
      <span className="text-[12.5px] font-semibold text-primary">
        ✓ No agent publishes, hires or messages anyone without your go-ahead.
      </span>
    </section>
  )
}
