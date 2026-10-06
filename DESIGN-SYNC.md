# Pending design sync

Changes made in `apps/web` that Storybook and the AthenaDS Figma file have not
caught up with yet. Add an entry when a change lands in the app, and tick both
boxes and delete the entry once both are updated in one batch.

Each entry names the app file, the Storybook story, and the Figma node from
`packages/ui/figma-map.json`, so the batch can be done without re-reading the
diff.

## Pending

### Split view: two more pane layouts, "Side by side" and "Card, then CV"

- **Date:** 2026-10-06
- **App:** `lib/split-variant.ts` (`tabs` default, `side-by-side`, `card-cv`), read by
  `SplitView` in `components/candidate-list/split-view.tsx`. Side by side drops the CV / Profile
  tabs for `SidePane`: two equal columns headed "Profile" (left) and "CV" (right), each scrolling
  on its own inside a card that fills the pane (stacked, profile first, below a 48rem pane).
  Card, then CV (`CardThenCv`) is a short summary card — the pane's header, Snapshot's
  four-number strip and its skills match (`SnapshotStats` / `SnapshotSkills`, now exported) — over
  a ringed card holding the CV, in one scroll; no career, education or tags, which the CV repeats. A dashed "Pane" switcher (`FloatingVariantSwitcher`, now shared
  with the card one) sticks to the foot of the list column, and /settings gains a "Split view"
  row. `CandidateCv`'s page margins are container queries now, so the page is narrower-margined
  in a half-width column.
- **Storybook:** Compositions → Response manager → Split view gains a side-by-side story and a
  card-then-CV story; the Settings row composition gains the "Split view" toggle.
- **Figma:** the Response manager composition (`117:3`) gains side-by-side and card-then-CV
  split frames; the Settings row board (`69:2`) gains the row.
- [x] Storybook
- [ ] Figma

### Candidate card: a fifth layout, "Screening"

- **Date:** 2026-10-06
- **App:** `screening` in `components/card-variant-provider.tsx`, drawn by `ScreeningCard` in
  `components/candidate-list/applicant-card.tsx` — Snapshot reordered as a two-pass screen:
  **who** ("Title at Company · 3 yrs in role"), **the must-haves** (`ScreeningGates`, one grey
  panel: experience, location verdict, notice, expected pay with "now ₹110L · +25%", then the
  posting's skills in the posting's order as a checklist — white chip with a tick for had, dashed
  with a minus for missing, "+N other skills" on hover; a search's criteria lines follow the
  panel), **the record** ("Previously" with a duration per role, "Signals", Education). Decisions,
  footer and responsive behaviour are Snapshot's.
- **Storybook:** Compositions → Response manager gains a Screening card (wide and phone); the
  Settings row composition's "Candidate card" Select gains a fifth value.
- **Figma:** the Response manager composition (an ApplicantCard variant for Screening) and the
  Settings composition frame's row.
- [x] Storybook
- [ ] Figma

### Candidate card: a fourth layout, "Snapshot"

- **Date:** 2026-10-06
- **App:** `snapshot` in `components/card-variant-provider.tsx`, drawn by `SnapshotCard` in
  `components/candidate-list/applicant-card.tsx`, top to bottom: name (18px) with arrival, role
  "· since 2023"; experience, notice, pay ("₹110L/yr") and location as one stat strip (2×2 on a
  narrow card, four across from `@lg/card`); "Skills match" with an N-of-M meter, matched chips
  and a "Missing" line; "Previously" (the roles before the current one) as a timeline beside
  Education, which carries the "Top institute" badge, and the other tags as a line of words under
  it. Section headings are 14px semibold, strip labels 12px muted. No green in the facts: matched
  skills are `secondary` chips with a tick, the meter fills in the foreground. The location cell
  says "In / Open to / Not open to <the posting's city>" (`targetCities` on `CandidateList`, from
  the job). The footer is `QuietCardActions`: ghost Save, Message and interview, outline View
  profile. Below `@xl/card` the decisions move to the foot of the card, full width and labelled
  (`DecisionGroup` gains `className` / `labelClassName`, threaded through `RowActions`). The
  /settings "Candidate card" switcher becomes a Select.
- **Storybook:** Compositions → Response manager has no Snapshot card; add one (wide and phone).
  The Settings row composition's "Candidate card" toggle becomes a Select with a fourth value.
- **Figma:** the Response manager composition (an ApplicantCard variant for Snapshot) and the
  Settings composition frame's row.
- [x] Storybook
- [ ] Figma

### Post a job: "Chat v3", Chat v2 with the AI Agent's ideas

- **Date:** 2026-10-01
- **App:** a seventh "Post a job" value, `rail3`. The rail (`components/posting-rail.tsx`
  gains an optional `extras` prop) shows a source chip under every value, a lock beside
  it, insight Apply links, a status panel on top, Must have / Good to have requirement
  rows with pool moves and a guardrail, a third "Candidates" view and an activity log.
  The transcript gains lock and filter markers, a "Share the hiring manager's brief"
  card and "See who this finds". `components/chat-v3/`, `lib/chat-v3.ts`.
- **Storybook:** the Settings row composition's "Post a job" switcher gains a seventh
  value. There is no composition for the Dashboard conversation; add one only if wanted.
- **Figma:** the Settings composition frame, the same row. There is no frame for the
  variant.
- [ ] Storybook
- [ ] Figma

### Post a job: "AI Agent (V2.3)", a peer's prototype ported in

- **Date:** 2026-10-01
- **App:** a sixth "Post a job" value, `agent` in `lib/posting-variant.ts`, drawn by
  `components/ai-agent/` over `lib/ai-agent/`, and mounted in `routes/agent.tsx`. It is
  the brief screen, five steps (Role details, Job description, Screening questions,
  Targeting, Candidates) with the agent panel beside them, then Review, "Choose how your
  agents source" and a done page, under its own white top bar. It uses only existing
  tokens and components. The /settings row gains the value and a sentence.
- **Storybook:** the Settings row composition's "Post a job" switcher gains a sixth value.
  There is no composition for the variant; add one only if wanted.
- **Figma:** the Settings composition frame, the same row. There is no frame for the
  variant.
- [ ] Storybook
- [ ] Figma

### Post a job: "Chat with rail v2", "Form beside chat" and "Chat, then form" on the Dashboard, and a /settings row

- **Date:** 2026-09-28
- **App:** `lib/posting-variant.ts`, `components/posting-form-panel.tsx`, the layout branch in
  `routes/agent.tsx`, `PlanBar` in `components/posting-rail.tsx`, and a "Post a job" row on
  `/settings` with four values (Chat with rail / Chat with rail v2 — the plan as a horizontal
  stepper across the top, the rail without it / Form beside chat / Chat, then form — the rail
  until the posting is gathered, then the form beside the chat).
  Under the variant a posting conversation is the post-a-job form on the left (the same form as
  `/jobs/new`, now `components/job-form.tsx`) with a "N of M people this would find · Open the
  search" footer, and the chat as a 26rem column on the right with a left border; the rail is
  gone and replies lose their posting card.
- **Storybook:** the Settings row composition gains a fourth switcher, a five-way one ("Post a job": rail, rail v2, form, chat-then-form, Chat alt), and under it a "Selection criteria" on/off switch (`routes/settings.tsx`, `lib/selection-criteria.ts`); there is no story for the
  Dashboard's conversation layout, so nothing to redo there unless one is wanted.
- **Figma:** the Settings composition frame, the same row.
- [ ] Storybook
- [ ] Figma


### Post a job: the live iimjobs form, field for field

- **Date:** 2026-09-28
- **App:** `routes/new-job.tsx` rebuilt to mirror `beta-recruiter.iimjobs.com/post-job`: a Job
  type card (Pro "Recommended" / Basic, each with "Know more", and a Pro + Boost switch with a
  "Formerly Premium Posting" badge), then two steps under a two-segment progress bar. **Basic
  Details** — "Already have a JD?" upload banner, Job title, Location (up to 3), Years of
  experience (two selects), Skills (chips + a "Suggestion" row from the title), Job description
  with "Generate JD with AI" on its label row, the "Format my JD" switch, Video JD, Industry (up
  to 5), Category + Functional area (with a suggestion chip), Annual salary (four selects,
  Lakhs/Crores), Hide salary, Graduating year, Course type chips; Cancel / Continue. **Additional
  Details** — Add Screening Questions, Video/Audio Profile, Application redirection URL, Diversity
  hiring chips, company name + "Don't show company name", LinkedIn share row; Back / Post job.
  A "Switch to Basic?" dialog. Must-have / good-to-have skills, Team, Work mode and Relocation
  are gone.
- **Storybook:** `Compositions → Post a job form` (`compositions/job-form.stories.tsx`) draws the
  old single-card form. Redo it as the two steps, plus the Basic dialog drawn in place.
- **Figma:** the "Post a job form — board" frame (see `figma-map.json`), the same way.
- [ ] Storybook
- [ ] Figma

### The Agent is the Dashboard; the old Dashboard is gone

- **Date:** 2026-09-28
- **App:** `routes/dashboard.tsx` deleted; `/dashboard` renders `routes/agent.tsx`
  (conversations at `/dashboard/c/<id>`, `/agent…` redirects); one "Dashboard" nav
  item in `lib/nav.ts`; the tiles, Live jobs and Recent searches are
  `components/overview.tsx`, under the Agent's box.
- **Storybook:** `Compositions → Dashboard` now draws a page that no longer
  exists (the green aurora band, the greeting, the Smart Hire box over the tiles).
  Redo it as the Agent landing with the overview under it, or retire it. The
  sidebar stories' nav should read Dashboard, Jobs… with no "Agent" item.
- **Figma:** the Dashboard composition frame, the same way; the Sidebar page's
  nav frames lose the Agent row.
- [ ] Storybook
- [ ] Figma

### Agent: a chat landing beside the cards

- **Date:** 2026-09-28
- **App:** `ChatLanding` in `routes/agent.tsx`, `HERO_ACTIONS` / `heroPlaceholder` in
  `lib/agent.ts`, `size="hero"` on `components/agent-composer.tsx`, the switch in
  `lib/agent-landing-variant.ts` and on `/settings`.
  - **The Aura centred on top**, then the cards landing's own "Who are you hiring
    today?" and its subheading, over four pills — Create Job,
    Search Resume, Review applicants, Hiring Insights — and one big
    box whose placeholder types out example questions in turn — pay, top
    matches on the busiest posting, city value, the diary, a note — and stops on
    the whole current one when the box is focused.
  - **Review applicants carries a count** in a small brand-tinted chip — "92
    waiting" — the number its answer opens on. Nothing is drawn at zero.
  - **The hero box:** "+" on the left (Attach a JD or a CV · Quick actions), the mic
    on the right as a filled circle, and the send arrow only once there is text or
    a file. A softer focus ring, because the box is focused on arrival.
  - **A faint glow** in the Aura's own cyan, blue and magenta behind the box — not
    a brand colour, so hirist does not turn it orange.
  - **The Dashboard's overview under the box** (2026-09-28): the four stat tiles,
    then Live jobs beside Recent searches — the same parts the Dashboard draws
    (`components/overview.tsx`), so its frame and this one share them.
- **Storybook:** on `Compositions → Agent` when it is written — both landings.
- **Figma:** no node yet.
- [ ] Storybook
- [ ] Figma

### Post a job: what an answer recorded, as rows

- **Date:** 2026-09-26
- **App:** `noted` on `IntakeState` (`notedFrom` in `lib/job-intake.ts`,
  `refineNoted` in `lib/job-refine.ts`), drawn by `Said` in `routes/agent.tsx`.
  - The agent's bubble opens "Got it." and then a label beside each value
    (Role · Location · Experience · Skills · Pay · Work mode, and in
    refinement the brief's own labels), the same grid the recruiter's answer
    bubble uses — instead of "Got it — Head of Marketing · Delhi NCR · 4–5
    years · Fintech." run together in a sentence. The follow-up line comes
    after the rows. "Also noted: …" is gone; those facts are rows too.
- **Storybook:** on `Compositions → Agent` when it is written.
- **Figma:** no node yet.
- [ ] Storybook
- [ ] Figma

### Post a job: a plain opener, and a checklist while typing

- **Date:** 2026-09-25
- **App:** `lib/agent.ts` (the from-scratch reply), `openerChecks` in
  `lib/job-start.ts`, the `checklist` prop on `components/agent-composer.tsx`,
  `coveredTopics` in `lib/job-refine.ts`.
  - **The from-scratch opener is one plain ask:** "Tell me about the role — the
    job title, location, years of experience, industry and the skills that
    matter. The more you tell me now, the fewer questions I'll need to ask."
    No hint line, no example chips, no form link under it; the reply box holds
    an example instead ("e.g. Head of Marketing, Mumbai, 12+ years, FMCG —
    brand strategy, P&L, team leadership").
  - **A checklist above the box ticks as you type:** Location · Job title ·
    Years of experience · Industry — a green tick when covered, a dashed
    circle when not (shape, not only colour). Skills are left off on purpose:
    a keystroke-speed read can't tell a skill from a phrase. It is read by the
    rules, instantly, so it is a nudge — anything missing is asked in the next
    card anyway.
  - **An industry named early is kept.** The opener asks for one, so any
    posting-stage answer records it on the brief ("Also noted: from FMCG"),
    and refinement drops any topic the conversation already covered.
- **Storybook:** the composer with its checklist, empty and fully ticked.
- **Figma:** no node yet.
- [ ] Storybook
- [ ] Figma

### Agent: voice input transcribed by Gemini

- **Date:** 2026-09-25
- **App:** `POST /api/transcribe` in `apps/ai` (`src/transcribe.ts`,
  `gemini-3.5-transcribe` over the Interactions API, audio inline);
  `startRecording` and `dictationVocabulary` in `lib/dictation.ts`;
  `transcribe` in `lib/ai-client.ts`; the mic in `components/agent-composer.tsx`.
  - **Press to record, press to stop.** A running timer beside the mic
    ("0:07 · 53s left", capped at a minute), then "Transcribing…" with a
    spinner in the button. The transcript is ADDED to the reply box, not
    sent, so it is read before it is an answer.
  - **A custom vocabulary rides with every clip:** the conversation's role,
    skills, cities and neighbouring titles, the form's cities (and Bengaluru /
    Gurugram), the pay words (lakh, LPA, CTC, crore), and the product's
    companies. Tested on a synthesised clip: "…Gurugram, 12+ years, budget
    around 60 lakhs, hybrid", ~4–5s.
  - **Silence is not an error:** an empty transcript says "I didn't hear
    anything — try again a little closer to the mic."
  - **Without the AI server** the mic falls back to the browser's speech
    recognition, as before; the tooltip says which one is listening.
- **Storybook / Figma:** the composer's recording and transcribing states, on
  `Compositions → Agent` when it is written.
- [ ] Storybook
- [ ] Figma

### Post a job: the first question is how to start

- **Date:** 2026-09-25 (options relabelled and a fourth added 2026-09-26)
- **App:** new `lib/job-start.ts`; the intake state carries an `origin`
  (`lib/job-intake.ts`); the start step runs before any reading, rules or
  Gemini (`advance`, `advanceWithAi`); `lib/agent.ts` draws the four replies.
  - **"How would you like to start?"** as a one-question card: *I have a JD* ·
    *Fill in a form* · *Let's chat about it* · *Use one of my existing jobs as
    a base*. Picking moves on at once; the page reads it, never a model, and
    no "Read by …" step is drawn over a button press.
  - **I have a JD** → "Paste the job description below, or attach it with the
    paperclip", and the reply box says "Paste the job description here…".
    Pasted text is read as a document: a full JD fills all six fields, skips
    the posting card entirely, and whatever it says about the search ("manage
    a team of 4") is recorded too — the plan drops the topics it covered.
  - **Fill in a form** → a link-out reply ("Post a job", to `postingHref`)
    rather than a stage of its own — there is no draft yet to carry over, so
    this is the below-card escape hatch every other posting card offers,
    surfaced as a first-class choice instead, since it is the first question
    asked. The below-card link is left off this one card so the same words
    don't appear twice.
  - **Use one of my existing jobs** → a second card listing live postings,
    then closed ones. Picking copies the title, city and matched skills
    ("Starting from Financial Controller — Bangalore · …"); experience, pay
    and work mode aren't on a posting, and the card says so before asking
    them.
  - **Let's chat about it** (was "Start from scratch") → "Who would you like
    to hire?" as before. Typing a sentence instead of picking also counts as
    this; attaching a file counts as a JD.
  - **A single-question card has no pager** ("1 of 1" was noise), and a card
    with nothing optional doesn't offer Esc to skip.
  - **The rail** reads "Choosing how to start" / "Waiting for the JD" /
    "Choosing a job to start from", and step 1 says where it came from
    ("From a JD", "From Financial Controller — Bengaluru").
- **Storybook:** on `Compositions → Agent` (not yet written), the start card
  (now four options), the job list, and the JD prompt.
- **Figma:** no node yet.
- [ ] Storybook
- [ ] Figma

### Post a job: a rail of stages beside the conversation

- **Date:** 2026-09-25
- **App:** new `components/posting-rail.tsx` and `lib/posting-rail.ts`;
  `routes/agent.tsx` lays the rail beside the chat from `@3xl/main` up; each
  posting reply carries a collapsed work step (`WorkStep` in `lib/agent.ts`).
  - **A new rail, not `BriefRail`.** Status line (the active step, or
    "Reading your answer…"); **Plan** — Understand the role · Fill in the
    posting (4 of 6) · Sharpen the search (2 of 4) · Review and post, which is
    never ticked because posting happens on the form; **The posting so far**
    as chips, skills split into must-have and good-to-have; **Who we're
    looking for** marked Private; **People this would find — 24 of 145**,
    with a link to open that search.
  - **The count is exact, not a range.** It is `poolFor` over the very link
    "Find people now" opens, so the rail and Search Resume cannot disagree
    (checked: 30 of 176 in both for the same brief). While an answer is being
    read it dims and says "Updating…" rather than showing a stale number.
  - **Work steps in the transcript:** "✓ Read by Gemini in 4.7s ›" above each
    posting reply, opening onto exactly what that answer recorded. The time
    is measured by the page around the whole call. It replaces the small
    "Read by …" line that sat under the cards.
  - **The reply box stays under the card** ("Or reply directly…"), so saying
    something else never takes closing the card first. × still collapses the
    card, with "Answer the questions" to bring it back.
  - **Known quirk of the mock:** adding neighbouring titles changes the search
    text, and `resultsFor` deals a different pool for different text — so the
    total moves (258 → 145) instead of only widening. The rail is faithful to
    what the search would show; the generator is what would need to change.
- **Storybook:** on `Compositions → Agent` (not yet written), the rail at each
  stage, a work step open and closed, and the card over the reply box.
- **Figma:** no node yet.
- [ ] Storybook
- [ ] Figma

### Post a job: questions arrive as a questionnaire, not one per turn

- **Date:** 2026-09-25
- **Design system:** new `packages/ui/src/components/questionnaire.tsx`
  (shadcn's Base UI Questionnaire over `@shadcn/react/questionnaire`, added
  with the CLI; its stray `import { cn } from "cn"` fixed and the `cn`
  package removed, as every add so far has needed).
- **App:** new `components/agent-questionnaire.tsx`; the intake reads a
  whole card at once (`advance` in `lib/job-refine.ts`, the batch contract in
  `lib/job-intake-ai.ts` and `apps/ai/src/intake.ts`).
  - **The opener stays a sentence** ("Who would you like to hire?", answered
    in the chat box, because one sentence often fills three fields).
    **Everything after it is a card**: every posting field still missing, one
    step at a time — choices, a free-text "Or say it in your words…", Skip,
    Previous, Next — then **Continue**. Refinement is a second card ending in
    **Finish**, with "Skip these, post it now" beside it. A posting that took
    about ten turns takes three or four, and one Gemini call per card.
  - **A card is one turn.** Its answers go into `?ask=` as one prompt, and
    the recruiter's bubble draws them as a list (Experience · 12+ years,
    Industry · Skipped), so the transcript is still the URL.
  - **Anything unreadable comes back in the next card with a note**, alone;
    anything skipped is never asked again.
  - **Number shortcuts (1–9), not letters** — bare A opens Athena and D
    switches theme. A new card takes focus only when nothing has it, so a
    keyboard run works without stealing the composer from someone typing.
  - **Docked, Claude-style.** The live card takes the chat box's place at the
    bottom of the screen instead of sitting in the transcript: the question on
    the left with **‹ 2 of 4 ›** and × on the right, numbered rows with rules
    between them, and **Something else** with **Skip** as the last row, key
    hints underneath. A single-answer row moves on when clicked or numbered
    (the last one submits); arrows only move, Enter confirms, Esc skips; a
    several-answer question shows **Next**. × hands the chat box back with
    **Answer the questions** to reopen. Built on the unstyled
    `@shadcn/react/questionnaire`, not the styled `packages/ui` component,
    whose pills and action bar are a different layout — so if this shape
    holds up, it is the candidate for a Pattern of its own.
  - **Two questions keep the page's own wording:** the skills split (a tick
    means "must-have", which Gemini's phrasing did not always say) and work
    mode's options (Gemini offered the raw values).
- **Storybook:** a `Components → Questionnaire` story for the stock
  component (single, multiple, freeform, skip, progress); on
  `Compositions → Agent` (not yet written), the docked card — posting and
  refinement — the closed state with "Answer the questions", and an answers
  bubble.
- **Figma:** a Questionnaire component page, in Storybook's order; add its
  key to `figma-map.json`.
- [ ] Storybook
- [ ] Figma

### Post a job: refinement, and a private brief beside the posting

- **Date:** 2026-09-25
- **App:** new `lib/job-refine.ts`; the intake state gains a stage (posting →
  refine → done) and a private brief (`lib/job-intake.ts`); Gemini reads both
  stages (`lib/job-intake-ai.ts`, `apps/ai/src/intake.ts`); the finished card
  and the refinement question are new shapes in `components/agent-reply.tsx`;
  the form gains three fields (`routes/new-job.tsx`).
  - **After the six posting fields, up to four refinement questions** from
    nine: which skills are must-haves, neighbouring roles, people who'd
    relocate, industry, team scale, target companies, preferred institutes,
    budget stretch, and who to rule out. Gemini picks the ones that fit the
    role; the page caps them at four and fixes the order. Each shows
    **"2 of 4"** and a **"Skip, post it now"**. The first says "That's the
    posting. Before it goes up, a few quick questions…".
  - **Without a model only the tap-answerable topics are asked** —
    neighbouring roles and rule-outs are free text and are left out rather
    than read badly by the rules.
  - **The finished card is two sections of one card**: *The posting* (now
    with must-have / good-to-have skills, a Team line and relocation support)
    and *Who we're looking for* — labelled private, with a note on what the
    search can and cannot do with it. **Two actions**: Review and post, and
    **Find people now**, which opens Search Resume with the brief as filters
    (industry, has led a team, budget, people who'd move) and as Juicebox
    criteria (skills, institutes, rule-outs).
  - **It refuses to screen on who someone is** — age, gender, family,
    religion or caste, disability, nationality, career gaps. Said first,
    every time: "I've left out anything about gender or age — I can't screen
    on that. Got it — ruling out people who change jobs every year."
  - **The form** gains Good-to-have skills, Team, and a Relocation support
    switch, so the chat's posting and the form's are still the same fields.
- **Storybook:** on `Compositions → Agent` (not yet written), a refinement
  question with its progress and post-now link, a refusal, and the two-part
  finished card; on `Compositions → Post a job`, the three new fields.
- **Figma:** no node for either yet.
- [ ] Storybook
- [ ] Figma

### Post a job: a conversation, and the form it hands off to

- **Date:** 2026-09-25
- **App:** new `lib/job-intake.ts` and `routes/new-job.tsx`; `/jobs/new` is no
  longer a `PlaceholderPage`. The Agent's "Post a job" card (`lib/agent.ts`)
  now opens the intake, folded turn by turn in `answersFor`, and
  `components/agent-reply.tsx` gained a `question` block and a `posting` block.
  - **It opens on "Who would you like to hire?"** and then asks only what the
    answer left out. "A senior product manager in Pune, 8–12 years" fills the
    role, the city and the years at once and goes straight to skills. Six
    fields in all — role, location, experience, skills, pay, work mode — each
    with tap-to-answer chips and a Skip (except the title). An answer that
    cannot be read is asked again with an example, and anything it *did* say
    is kept: "Pune" alone records Pune and re-asks the title.
  - **"Fill in a form instead" is on every question**, not just the first, and
    carries what has been said so far — leaving three questions in loses
    nothing. The finished posting is a summary card, a description written
    from the fields (every sentence is one of them; nothing about the team or
    the mission is invented) and **Review and post**, which opens the same
    form filled in.
  - **The form is the same six fields** plus the description, in the same
    order, reading `?title=`, `?loc=`, `?xp=`, `?pay=`, `?skill=`, `?mode=` as
    opening values. `loc` rather than the refine panel's `cur`, so a posting's
    cities can never land on a search as a filter. It has its own "Talk it
    through instead" back to the Agent, a "Redraft from the fields" that never
    fires on its own (the recruiter may have edited the paragraph), and a Post
    button that says publishing isn't wired rather than faking a Jobs row.
  - **An attached JD during the intake answers everything it can at once** —
    the first short line as the title, the rest scanned the same way a file is.
  - **Answers are read by Gemini** through the new `apps/ai` server when it has
    a key, and by the rules otherwise. Every question and the finished posting
    carry a small **"Read by Gemini" / "Read by rules · reason"** line under
    them, for review rather than for recruiters — a good reading from a model
    and from a regex look identical. The Agent's footer now says which part of
    the page is which.
- **Storybook:** a `Compositions → Post a job` with the form empty and filled,
  and on `Compositions → Agent` (not yet written) the question block live and
  the finished posting card.
- **Figma:** no node for either yet.
- [ ] Storybook
- [ ] Figma

### Agent: one box over the whole product

- **Date:** 2026-09-25
- **App:** new `routes/agent.tsx`, `components/agent-composer.tsx`,
  `components/agent-reply.tsx`, `lib/agent.ts` and `lib/dictation.ts`, plus the
  `/agent` route in `App.tsx` and a first nav item in `lib/nav.ts` (divider
  under it, so it does not read as another object screen).
  - **Two states, one screen.** It opens as a hero — the Aura, "Who are you
    hiring today?", six cards naming the six things it can answer, and the box
    (the row of follow-up chips was removed 2026-09-26). The first question replaces all of it with a
    transcript and the same box pinned to the bottom.
  - **The card order is the argument.** Top row is what a recruiter comes to
    START — **Post a job**, **Search people**, **Get insights** — because that
    is where a hiring day begins and what somebody with nothing in flight
    needs. Bottom row is work already moving: Clear the queue, The strongest
    five, This week's diary, all useful daily and useless on day one. The `/`
    menu lists them in the same order (`/post`, `/people`, `/insights`, then
    `/queue`, `/strongest`, `/diary`), so the hero and the menu read alike.
  - **`?ask=`, one per turn, is the whole conversation.** There is no model:
    every reply is computed from the brand's own mock data at the moment it is
    drawn, so the list of questions IS the transcript and a reload, a back
    button or a pasted link rebuilds it exactly. A reply worth showing someone
    is a link.
  - **Replies are blocks, not paragraphs** — text, figures, candidate rows,
    link rows, prompt chips and a draft. Nothing in them decides, sends or
    books: the block gets the recruiter to the screen that holds the evidence.
  - **A miss is a refusal.** Free text is keyword-routed; anything that misses
    gets "I can't answer that one" plus the questions that do work, drawn as
    chips that ask themselves.
  - **The face is the Aura** from `avatar-kit/` (2026-09-26, replacing the
    owl `assets/athena/head-2.png`): an animated WebGL glass sphere, vendored
    into `lib/aura/` and drawn by `components/aura.tsx`. Live in the hero and
    on the newest reply only (one WebGL context each); older replies draw a
    still gradient orb. It is NOT named on the screen, and the Athena pane is
    untouched — whether these are one assistant with two front doors is still
    open.
  - **Quick actions on `/`** — a menu above the box, thirteen commands, opened
    by typing a slash (the sparkle types it rather than toggling a panel, so
    there is one mechanism and the box shows what happened). Arrow keys, Enter
    or Tab to take, Escape to close, filtering as you type. The rows are two
    kinds on one list — six that ask a question and seven that open a page —
    because asking "who is waiting on a decision" and opening the Jobs list are
    the same size of intention. **One icon colour, not a hue per row:** the
    accent here is the product and swaps with brand, so a rainbow would be the
    one thing on the page that does not, and a green row beside an amber one
    would read as a status.
  - **Attach really reads the file.** `.txt`/`.md` come back as words, and the
    reply quotes what it found — the word count, the title line, the city and
    years `criteriaFrom` reads, and the skills that are in this product's own
    pool. `.pdf`/`.docx` are accepted and answered with "that is bytes, not
    words". **A link carries the question, not the file:** the turn is in
    `?ask=` and the reading is in memory, so reopening the link says the file
    did not travel and offers to take it again.
  - **Dictate is the browser's own `SpeechRecognition`** (`lib/dictation.ts`,
    `en-IN`, interim results appended to whatever was already typed). Where the
    browser has no speech recognition the button is disabled and says which
    browsers do — there is no "Listening…" state with nothing behind it. This
    is a **divergence from the Smart Hire bar**, whose paperclip and microphone
    both toast "isn't wired up yet"; if this one holds up in review, that bar
    should take the same two implementations.
- **Storybook:** nothing yet. It wants a `Compositions → Agent` with the
  landing hero, a transcript, the `/` menu drawn open, the composer with a file
  chip attached, and a story per reply block (figures, candidates, links,
  draft, file read, refusal) — the shape `Compositions → Athena` already uses.
  Draw the menu and the chip in place rather than as live overlays, as the
  other compositions do, so a Docs page shows them without covering itself.
- **Figma:** no node yet. A new page, mirroring whatever Storybook titles the
  composition, with its `figma-map.json` key added.
- [ ] Storybook
- [ ] Figma

### Smart Hire bar: the tray and the suggestion row are gone

- **Date:** 2026-09-24
- **App:** `components/smart-hire-bar.tsx`. Both things under the box are
  removed — the five-part checklist (Location / Job Title / Years of
  Experience / Industry / Skills) and the "A Head of Marketing usually has
  these skills" proposals.
  - **Why it reads better without them:** the sentence above already shows what
    was understood. The words are right there and the recognised ones are
    chips, so the row under it was the same information a second time, in a
    band that pushed the page down on every keystroke.
  - **The suggestion row went too** — the strip of alternatives under the box,
    with their `0` markers. The bar is now the box and the action row, nothing
    else.
  - What stays: the inline chips, the ghost text, the switcher, Attach a JD and
    Dictate. An attached JD still shows as a chip below the card — nothing else
    on screen says a file is there.
  - **Two things the row was carrying are now unreachable in the bar**: the
    substring matches (the live form's "fin" → Recruitment / Staffing) can
    never be ghost text, and an exact match has no visible affordance — typing
    "Pune" in full leaves nothing on screen, though Tab still chips it.
    `matchesFor` stays in `lib/smart-hire.ts`, used only through `suggest` and
    `exactMatch` now.
  - `skillsForTitle` and `roleIn` are untouched and still used, by the
    requirement chat's own skills question (`lib/intake.ts`).
  - `requirementParts` in `lib/requirement.ts` goes back to being **parked** —
    written, unused, kept on purpose, as the note in CLAUDE.md asks.
  - Gone with them: the "should have the following skills:" clause wording and
    the space-aware lead-in helpers, which only existed to word a taken
    proposal into the sentence. The bar is ~130 lines lighter.
- **Storybook:** any Smart Hire bar story should show the card alone; the tray
  states are no longer real.
- **Figma:** same — the bar frame loses its lower band.
- [ ] Storybook
- [ ] Figma

### Smart Hire: the bar says what the arrow will do

- **Date:** 2026-09-24
- **App:** `components/smart-hire-bar.tsx` (a segmented `ToggleGroup` in the
  action row), `lib/smart-hire.ts` (`SmartHireIntent` and `INTENTS` live there,
  not in the component, because `react-refresh/only-export-components` is on in
  `apps/web`), plus `routes/smart-hire.tsx`, `routes/dashboard.tsx` and a new
  `/smart-hire/post` route.
  - **Post a job | Find candidates, posting selected by default.** The page has
    claimed "a search and a job post out of one description" since it was
    written; this is the first time that is a control rather than a sentence.
  - The choice travels: the Dashboard's bar sends `?intent=`, the Smart Hire
    page opens its switcher on it, and the arrow goes to `/smart-hire/post` or
    `/smart-hire/brief` accordingly.
  - `/smart-hire/post` is a **blank placeholder** ("Write the posting") — the
    screen is the next thing to design, and the restored form at
    `/reference/post-job` is the obvious candidate to grow into it.
  - The switcher is hidden in the chat's `composer` size, where the question
    was settled on the way in.
- **Storybook:** the Smart Hire bar states now include the switcher; a story
  should show both settings, since the default changes what the page is for.
- **Figma:** same — the bar frame needs the segmented control.
- [ ] Storybook
- [ ] Figma

### Post a job: two designs, both now reachable

- **Date:** 2026-09-24
- **App:** `apps/web/src/routes/post-job.tsx`, `lib/post-job.ts` and
  `components/tag-input.tsx` restored verbatim from commit `fdfc4da` (dropped
  by `cab0f1b`, "clean slate — keep the shell, drop every page"). Routed at
  `/reference/post-job` and linked from Settings, beside a new external link to
  the Storybook composition. Nothing in the product points at either; `/jobs/new`
  is still a placeholder.
- **The two disagree, and that is the thing to resolve.** The restored route is
  a two-step form with a plan picker, `TagInput` locations capped at 3, video
  JD, grouped functional areas and a salary-visibility switch. `Compositions →
  Post a job form` is a single card with six fields. Same name, same Figma
  entry (`job-form` → "Post a job form — board"), different designs.
- **And their vocabularies disagree.** `lib/post-job.ts` groups functional
  areas into eight engineering-flavoured buckets; `lib/taxonomy.ts` has the 36
  the live form actually offers, read off it today. Whichever form survives
  should use the extracted list.
- **Storybook:** no change yet — but the composition should either grow into
  the restored design or be retired, not sit beside it under the same name.
- **Figma:** same question for the mirrored frame.
- [ ] Storybook
- [ ] Figma

### Smart Hire: the brief gathers, widens and calibrates

- **Date:** 2026-09-24
- **App:** `apps/web/src/lib/calibration.ts` (new),
  `apps/web/src/components/brief-rail.tsx` (new),
  `apps/web/src/components/criteria-evidence.tsx` (new, lifted out of
  `candidate-list/applicant-card.tsx`), plus `lib/intake.ts` and
  `routes/smart-hire-brief.tsx`. Modelled on Juicebox's agent, and mostly a
  matter of calling machinery this repo already had:
  - **Two more questions** — which companies (`org`) and which institutes
    (`inst`, offering IITs / NITs / IIMs before the individual colleges). Both
    ask last, because both narrow hard and neither is a requirement.
  - **Every question can be waved away** (`?skip=`, repeated). A skipped
    question stays in the transcript, answered "Doesn't matter".
  - **A Plan rail beside the chat** — four stages ticking, the live qualified
    pool against what the sentence alone found, and the criteria in rank order.
  - **When the pool thins below 25**, the chat offers `expansions()` as chips
    whose `+N` is counted, not estimated — apply one and the pool lands exactly
    where the chip said.
  - **Three profiles to calibrate on**, each with its `verdictsFor` lines. A
    rejection sinks the criteria that person met and an acceptance lifts them;
    since `scoreFor` is rank-weighted, that re-ordering re-scores the pool. The
    chat then says which criterion moved.
  - Fixed two silent bugs in the existing questions: `xp` is a RANGE the panel
    splits on a dash (so "12+" parsed to NaN and filtered nothing) and `np` is
    a SELECT tested with `Number(value)` (so "now" matched nobody). Both now
    read the section's own vocabulary.
- **Storybook:** the `Compositions → Smart Hire brief` story (still unwritten)
  now wants four states rather than one: a question with chips and a skip, the
  thin-pool suggestion, the three-profile calibration, and the finished brief
  with the rail beside it. `CriteriaEvidence` is now a shared component and
  should get a story of its own under Patterns.
- **Figma:** no frame. Beyond the five chat components, the rail and the review
  card are new shapes; the review card is the result card's evidence block on a
  smaller surface, so check whether it is a variant before drawing it.
- [ ] Storybook
- [ ] Figma

### Smart Hire: the requirement chat

- **Date:** 2026-09-24
- **App:** `apps/web/src/routes/smart-hire-brief.tsx` (new),
  `apps/web/src/lib/intake.ts` (new), plus a `composer` size on
  `smart-hire-bar.tsx` and two routes in `App.tsx`. The bar's arrow is no
  longer parked: it goes to `/smart-hire/brief`, and the finished brief goes
  to `/smart-hire/candidates`, which is a `PlaceholderPage` until that screen
  is designed.
  - Built from the **new shadcn chat components** — `message-scroller`,
    `message`, `bubble`, `marker`, `spinner`. All four arrived with the
    `from "cn"` import bug; `globals.css` survived untouched this time.
  - **It only asks what the search can use.** Six questions, each landing on a
    refine-panel key (`cur`, `xp`, `ind`, `np`, `ctc`) or the query text. Team
    size and reporting line are the sort of thing a recruiter would happily
    answer and nothing downstream could use, so they are not asked.
  - **It only asks what the sentence left out** — name a city in the bar and
    the city is never asked about.
  - **The transcript is derived, not stored.** `transcriptFor(context,
    answers)` rebuilds it from `?q=` plus the answer params, so reload, back
    and a pasted link all restore the same conversation.
  - Answers are tapped from chips (cities, bands, the title's own skills) or
    typed into the bar, which keeps its ghost text and chips in composer size.
  - The 550ms pause with a spinner before each reply is the only pretence, and
    it is marked as such in the file.
- **Storybook:** nothing yet. Wants a `Compositions → Smart Hire brief` with
  the opening state, a question with chips, a mid-conversation transcript and
  the finished state. The chat components themselves are `Components → …` and
  need their own stories before the composition.
- **Figma:** no frame. Five new components to mirror (Message, Bubble, Marker,
  MessageScroller, Spinner) before the page can be assembled from instances.
- [ ] Storybook
- [ ] Figma

### Smart Hire: the bar

- **Date:** 2026-09-24
- **App:** `apps/web/src/components/smart-hire-bar.tsx` (new),
  `apps/web/src/lib/smart-hire.ts` (new), `apps/web/src/routes/smart-hire.tsx`
  (new, replacing the placeholder) and `routes/dashboard.tsx`. A new nav item,
  second under Dashboard, and a composer that is nothing else in the app:
  - A `contenteditable`, not a textarea — it has to paint ghost text and hold
    chips, and a textarea can do neither.
  - **Inline autocomplete**: grey ghost text after the caret for job title,
    city and industry, taken with Tab, dismissed with Esc. The vocabulary is
    the generators' own (`applicants.ts`), per brand, so a suggestion is
    always a value the search can find.
  - **An accepted value becomes a chip in the sentence**, and the chip reads
    short while carrying the canonical value — "Fintech" over "Banking /
    Financial Services / Broking", the call `INDUSTRY_TAGS` already makes on a
    card. Backspace behind a chip removes it whole.
  - **The tray merges the checklist and the summary**: a part the recruiter
    confirmed prints its chip with an `✕`, a part only spotted in the prose
    keeps the grey tick, the rest stay grey labels. It appears only once
    there is something in the box.
  - **Attach a JD and Dictate** sit left of the arrow. Drawn, not wired.
  - Two sizes from one component: `hero` on /smart-hire, `compact` on the
    Dashboard, whose arrow hands the draft to /smart-hire rather than
    searching. The hand-off re-reads its chips out of the text (`readBack`).
  - The arrow on /smart-hire is **parked** until submit is decided.
- **Storybook:** nothing yet. It wants a `Compositions → Smart Hire` with the
  bar empty, mid-suggestion (ghost drawn in place, not live), and with chips
  and the tray — plus the compact size. Ghost and chips are DOM the stories
  will have to draw statically, the way the Athena overlays are.
- **Figma:** no frame. Needs a Smart Hire page mirroring those states; the
  chip is close to `Chip (secondary)` but inline in a text block, so check
  whether it is a new component or an instance before drawing it.
- [ ] Storybook
- [ ] Figma

### Response manager: a third card layout, Sections

- **Date:** 2026-09-22
- **App:** `apps/web/src/components/candidate-list/applicant-card.tsx`
  (`BucketSections`), `card-variant-provider.tsx` and `routes/settings.tsx`.
  A third value on the /settings card toggle, beside Stacked and Columns:
  - The buckets become full-width bands under their own headings, with a rule
    between. No label column at all, so values get the card's width.
  - **Tags are the first band and carry no visible heading** — they are the
    summary of what is below them, and the chips say what they are.
  - **Experience and education share a band**, side by side, heading over
    value, experience on the wider track. They stack below `@2xl/card`.
  - **Location and availability share the last band**, split by a 1px rule
    rather than a `·`, because both values already use `·` inside themselves.
  - So the card is four bands, not six: tags, background, skills, availability.
  - The roles keep their "Show all (6)" expander, as in Stacked.
  - It is the tallest of the three: 479px against Stacked's 440px and
    Columns' 420px on a 916px card.
- **Storybook:** `Compositions → Response manager`. The card stories draw the
  stacked shape; add a Sections story beside them, and the toggle on the
  settings-row composition needs its third item.
- **Figma:** `Response manager — full page` (node `117:3`). ApplicantCard has
  no Sections variant yet; the Database frames clone that component, so it
  lands there too once it exists.
- [x] Storybook
- [ ] Figma

### Smart Hire: the real taxonomy, and what a title implies

- **Date:** 2026-09-24
- **App:** `apps/web/src/lib/taxonomy.ts` (new), `lib/title-intel.ts` (new),
  `lib/smart-hire.ts`, `lib/requirement.ts` and `components/smart-hire-bar.tsx`.
  The bar completes against the live iimjobs lists now, not our generators:
  - `taxonomy.ts` is read off `recruit.iimjobs.com/post-job` — 120 posting
    locations, 66 industries, 36 functional areas, 8 categories and 1,071
    skill tags (the clinical half of their 2,084 is cut; see the file header).
  - **906 job titles** come from a second product: Naukri's posting form
    (`hiring.naukri.com`), whose designation suggester is a typeahead rather
    than a list, so they were sampled with 105 seed words across both markets.
    Neither iimjobs nor hirist completes a title at all, so this is the one
    piece of vocabulary with no equivalent in either of our own products.
  - Every entry carries **`inData`** — whether our mock pool could return
    anybody. Kolkata and "Brand Management" are offered and marked with a
    quiet `0` in the suggestion row.
  - **Finishing a recognised phrase makes it a chip** — type "Product Manager
    in Indore" straight through and both are chips by the time you reach the
    end, no Tab needed. Titles, cities and industries only; skills and
    functional areas are never taken unprompted.
  - The tray row is **ticks, not pills** — five parts, lit when covered. It
    ticks from the same vocabulary the completion uses, so a city the box can
    complete is a city the row counts.
  - **A suggestion row under the box**, not a popup: the ghost keeps the best
    prefix, the row holds up to five alternatives including the substring hits
    a ghost cannot paint ("fin" → Recruitment / Staffing). `↓` walks in, Enter
    or Tab takes one.
  - **A title now proposes the skills that go with it** — ranked, must-have
    and nice-to-have, as dashed "+" chips that are offered rather than added.
    This mirrors the live form's `suggest-tags`. The title is read out of the
    prose (`roleIn`), so it fires on "hiring for a junior sales manager" and
    does not need a chip.
  - **The functional area is NOT proposed**, though `suggest-cat-fa` does it
    live and `functionForTitle` still computes it. It restated the title, put
    a 46-character string mid-sentence, and claimed to be findable when the
    only functional-area filter here (`fn`) runs on a different nine-value
    vocabulary. The 36 areas stay typeable, marked unfindable.
  - The checklist is back to **five** lines; Function was added and removed
    with the proposal.
  - **A taken proposal is written INTO the sentence**, not stuck on the end:
    "… , within ⟨Sales / Business Development⟩ should have the following
    skills: ⟨Sales⟩, ⟨Channel sales⟩". Skills gather into one clause behind a
    lead-in that is removed again with the last chip it introduced.
  - The checklist gained a sixth line, **Function**.
- **Storybook:** the Smart Hire composition (still unwritten) now needs the
  suggestion row and the proposal block as two more states, both drawn
  statically. Worth one story per state rather than a live bar.
- **Figma:** no frame yet. The dashed proposal chip and the `0` marker are new
  shapes — decide whether they are Chip variants or their own component before
  drawing the page.
- [ ] Storybook
- [ ] Figma

### Search Resume: table view

- **Date:** 2026-09-17
- **App:** `apps/web/src/routes/database.tsx`,
  `apps/web/src/components/candidate-list/` (`index.tsx` for the toggle,
  `applicant-table.tsx` for the table) and `database-filters.tsx`. The results
  have a Cards/Table toggle and, in table view, the Columns button, right of
  the toolbar under both filter designs. The table is the Response manager's
  data table:
  - The arrival column reads "Updated".
  - Location, Exp, Current and Notice filter from their headers with the
    refine panel's own controls (the location checklist, min/max selects, the
    notice select).
  - The Sort select can read e.g. "Current pay ↓".
- **Storybook:** `Compositions → Database`. Add a results-in-table story
  under Juicebox, with the toggle and Columns button in the toolbar row.
- **Figma:** the Database page (node `144:2`). Add a results frame in table
  view beside the Juicebox results frame, and the Location header popover
  drawn open.
- **Figma, still to do:** there is no table frame on the Database page to give
  this treatment to — the page has the search, the two results frames and the
  two dialogs. It has to be built rather than edited.
- [x] Storybook
- [ ] Figma

### Response manager: table view as a data table

- **Date:** 2026-09-17
- **App:** `apps/web/src/components/candidate-list/applicant-table.tsx`
  (`ApplicantTable`), `apps/web/src/components/data-table/column-header.tsx` and
  `view-options.tsx`. Every column heading except the checkbox and actions is
  now a ghost button with a sort arrow (⇅ faded, ↑ or ↓ when sorted). It opens
  a popover with Sort ascending, Sort descending, Clear sort, a filter where
  the column has one, and Hide column:
  - Candidate filters with a search box.
  - Location, Exp and Notice filter with radios.
  - A primary dot beside the label means that column is filtered.
  - Number columns are right-aligned.

  A **Columns** outline button sits left of the view toggle in table view.
  It opens a menu of checkboxes plus Reset columns. Three new columns are
  hidden by default: Match (%), Education (school over degree) and Status (the
  decision badge). The sort pill can now read e.g. "Current pay ↓".
- **Storybook:** `Compositions → Response manager`
  (`packages/ui/src/compositions/response-manager.stories.tsx`). Change the
  table story's headings to the sortable header, add the Columns button, and
  add a story with a header popover drawn open (Location, filter picked) and
  one with the Columns menu drawn open.
- **Figma:** `Response manager — full page` (node `117:3`). Same header treatment and Columns button on the table
  frame. Add the open header popover and Columns menu as overlay frames.
- **Figma, still to do:** `Response manager — full page` is the cards view and
  is the only frame on that page. The table frame the header treatment and the
  Columns button belong on does not exist yet, nor do the two overlay frames.
- [x] Storybook
- [ ] Figma

### Response manager: Apply and Clear on the filter bar

- **Date:** 2026-09-20
- **App:** `apps/web/src/components/candidate-list/filter-bar.tsx`
  (`FilterBar`). The pill row now holds a draft:
  - **Apply** (primary, `size="sm"`) and **Clear** (outline) sit at the right
    end of the row, pushed there with `ml-auto`. Both are disabled until there
    is something to apply or clear.
  - Picking in a pill's menu changes the pill's label but not the list — the
    URL is only written on Apply. The menus keep their "Any …" reset option.
  - The row's "N of M match" hides while changes are pending.
  - The drawer (below `md`) edits the same draft and carries the same two
    buttons in a `DrawerFooter`; its description reads "Not applied yet" while
    dirty.
  - Sort is not in the draft — it still applies on pick.
  - `FilterRail` is unchanged: it applies as you pick.
- **Storybook:** `Compositions → Response manager` has its own `FilterBar` copy
  (`response-manager.stories.tsx` ~line 355). Add the two buttons at the right
  of the pill row, and a story with a pending change (pill set, Apply enabled,
  no match count). The drawer story, if there is one, needs the footer.
- **Figma:** `Response manager — full page` (node `117:3`). Add Apply and Clear
  to the right of the pill row in the table and split frames, in both states
  (disabled, and Apply active with a pill changed).
- **Figma, still to do:** the pill row has left the cards frame, which is
  correct — beside the rail the cards view hides it. It now belongs to the
  table and split frames, and neither exists yet.
- [x] Storybook
- [ ] Figma

### Response manager: the split view's list becomes a column

- **Date:** 2026-09-20
- **App:** `apps/web/src/components/candidate-list/split-view.tsx` (`SplitView`,
  `SplitRow`) and `applicant-list.tsx` (`QueueHeading`). At `@3xl/main` the
  candidate list beside the CV is no longer a rounded card:
  - Flush against the nav (`-ml-4`, `lg:-ml-6`), `bg-background`, `border-r`,
    no radius, no ring, no padding — the `FilterRail` treatment.
  - Run headings ("New since …", "Earlier") are sticky bars with a
    `border-b`, pinned as the rows scroll under them.
  - Rows lose their rounding, so the selected row is a full-bleed band.
  - The split block is pulled up `-mt-4` so the column meets the tab toolbar;
    the CV pane keeps its gap with `pt-4`. Its height is measured off the tab
    block and the page's bottom gutter is cancelled, so both columns run from
    the toolbar to the bottom edge of the screen and the page does not scroll.
- **Storybook:** `Compositions → Response manager` — the split story's list
  column needs the same treatment (flush, bordered, sticky heading, full-bleed
  selection).
- **Figma:** `Response manager — full page` (node `117:3`), split frame. Redraw
  the list column as the cards frame's filter rail: same flush left edge, 1px
  `border` stroke on the right, `background` fill, heading bar with a bottom
  border, and the selected row spanning the full column width.
- **Figma, still to do:** there is no split frame on the page to redraw.
- [x] Storybook
- [ ] Figma

### Response manager: current and preferred location

- **Date:** 2026-09-20
- **App:** `apps/web/src/lib/applicants.ts` (`preferredLocations` on
  `Applicant`, `preferred` on `Filters`), `lib/database-filters.ts`
  (`toProfile` reads it instead of dealing its own), and, under
  `components/candidate-list/`, `filter-rail.tsx`, `filter-bar.tsx`,
  `filter-panel.tsx`, `applicant-table.tsx` and `applicant-card.tsx`.
  - **Two location filters** everywhere the filters are drawn: the rail
    ("Current location" / "Preferred location"), the pill row, the drawer
    panel and the table's Location header.
  - **Both are pick-many, drawn by `LocationPicker`** — shadcn's Combobox in
    its `multiple` shape (`combobox.tsx`, added for this). A `rounded-4xl`
    chips box: the picked cities sit inside it as `ComboboxChip`s with an ✕,
    the caret after them, and the popup below lists what is left (plus its
    count, in the rail only). `autoHighlight`, so the first match is live to
    Return. There is no "Any city" row: the chips are the clear.
  - The pill-row triggers read "Any current location", the city itself, or
    "2 current locations"; preferred reads "Open to Pune" / "Open to 3
    locations". On a pointer they open the picker in a `w-64` popover.
  - The applied bar draws **one chip per city**, with "Open to <city>" for the
    preferred ones so they cannot be mistaken for the current-city chips.
  - **Cards gain a Location row** between Skills match and Availability:
    "Noida · open to Pune, Anywhere", current city in `foreground`, the rest
    muted. Present in both card shapes; the columns shape is five columns at
    `@5xl/card` now, not four.
  - "Anywhere" is a real value on a candidate and matches any city filter, but
    is not offered as an option.
- **Storybook:** `Compositions → Response manager` — add the Location row to
  the card stories, the two pills to the pill row, and the two picker sections
  to the rail. A `LocationPicker` story (empty, two picked, mid-search) would
  be worth having; it is the first pick-many control on this screen.
  `Patterns → List card` may want the card row too if it mirrors the card.
- **Figma:** `Response manager — full page` (node `117:3`). Add the Location
  row to the ApplicantCard component (so the Database frames' clones inherit
  it), the two pills to the pill row, and the two picker sections to the filter
  rail — search box, city list, and the picked-city pills under it. Draw the
  pill's popover open as an overlay frame.
- **Figma, done:** the Location row is on every ApplicantCard and ResultCard
  (both pages), and the rail carries both picker sections, drawn with the new
  `ComboboxChips` component.
- **Figma, still to do:** the two pills and the pill's open popover, which need
  the pill row — see the Apply/Clear entry above.
- [x] Storybook
- [ ] Figma

### Candidate profile panel floats; the card's name opens it

- **Date:** 2026-09-21
- **App:** `apps/web/src/components/candidate-panel.tsx` and
  `candidate-list/applicant-card.tsx` (`ApplicantCard`).
  - The profile sheet is **inset, not flush**: 12px from the top, right and
    bottom, `rounded-2xl`, a 1px `border` on all four sides (was `border-l`
    only), `overflow-hidden` so the header and CV clip to the corners. Width is
    half the viewport less the inset (`calc(50% - 24px)`), full width less the
    inset below `sm`. The stock `h-full` had to become `h-auto` — it is 100vh
    against the viewport, so an inset top hung the bottom off the screen.
  - **Only this sheet.** The mobile nav is a Sheet too and stays flush, where
    the sheet *is* the side of the screen.
  - **A card's candidate name is now a button** that opens the panel, matching
    the table's `CandidateCell`: hover underline, visible focus ring. The card
    itself is still not clickable, and "View profile" stays at the foot.
- **Storybook:** `Compositions → Response manager` — the profile-panel story
  needs the inset treatment, and the card stories should show the name as a
  link-ish control (underline on hover).
- **Figma:** `Candidate profile` composition and the Response manager page
  (node `117:3`). Draw the panel as a floating card with a 12px gutter on three
  sides and an 18px radius rather than a full-height flush panel.
- **Figma, still to do:** there is no profile-panel frame on the Response
  manager page to redraw as a floating card.
- [x] Storybook
- [ ] Figma

### Response manager: a Tags row opens the card

- **Date:** 2026-09-21
- **App:** `apps/web/src/lib/applicants.ts` (`tagsFor`) and
  `candidate-list/applicant-card.tsx` (`TagsBucket`, both card shapes). A
  **Tags** row above Experience, `secondary` chips like the skills row but
  neutral:
  - "Fast riser" (a leading title under eight years) or "Leads a team", then
    the **sector** ("Fintech", "E-commerce", "SaaS", "FMCG", "Retail",
    "Auto", "Chemicals", "Conglomerate"), "One sector", "Top institute", then
    "Long tenure" or "Moves often". Every card has at least the sector, so the
    row always draws.
  - **Three chips, then a `+N`** in an outline chip with the rest on hover.
    About one card in ten overflows.
  - All derived from the roles, title, school and dates already on the card.
  - In the columns card shape it is a band across the top, not a sixth column.
- **Storybook:** `Compositions → Response manager` card stories, and
  `Patterns → List card` if it mirrors the card. Worth one story per tag
  since they are the card's new first line.
- **Figma:** the ApplicantCard component on `Response manager — full page`
  (node `117:3`), so the Database frames' clones inherit it. Add the Tags row
  above Experience in both the rows and columns variants.
- **Figma, done:** the Tags row is on all six cards across the Response manager
  and Database pages, three chips then a `+N` where one overflows.
- **Figma, still to do:** the columns card shape, where the row is a band across
  the top rather than a sixth column — that variant does not exist in Figma.
- [x] Storybook
- [ ] Figma

### Database: the refine panel becomes the rail, and the default

- **Date:** 2026-09-21
- **App:** `apps/web/src/components/database-filters.tsx` (`RefinePanel`,
  `FilterSection`), `apps/web/src/lib/filter-variant.ts`,
  `apps/web/src/routes/settings.tsx`.
  - **Refine panel is the default design** on /settings, and is listed first in
    the switcher. Juicebox is the alternative.
  - The column is now the response manager's `FilterRail`, not a floating card:
    `w-64`, `bg-background`, `border-r`, no radius and no ring, flush against
    the nav (`-ml-4`, `lg:-ml-6`) and against the top bar (`-mt-4`,
    `md:-mt-6`), `h-svh` and sticky at `top-0`.
  - A pinned `h-12` header with a bottom border: a sliders icon, **Filters**, a
    `secondary` count badge, and **Reset all** on the right — replacing
    "Refine your search" and its Clear all. The "N of M profiles" line is
    gone — it moved to the applied bar. The count is one per VALUE (three
    cities are three) and includes the search-within box, as the rail's does.
  - Only the sections scroll, inside the column, with the gutter on the
    scroller so each section's rule is inset.
  - Section headings take the rail's treatment: `font-medium`, `py-3`, a
    `secondary` count badge beside the label, a faded chevron pointing right
    when closed and down when open, no hover fill. Labels are sentence case
    ("Current location", "Notice period"). Experience, Current location and
    Preferred location open by default, plus any section with a value.
  - **A count beside every option** (`text-xs` muted, tabular, right-aligned):
    how many people the list would hold with it picked. On the two toggles,
    every checkbox list, and the location pickers' popups.
  - **Current and Preferred location are `LocationPicker`** — the response
    manager's Combobox with chips (now `components/location-picker.tsx`),
    not a checkbox list.
  - **Notice period, Work permit, Handled a team?, Willing to relocate?** are
    radios with an "Any notice period" / "Any work permit" / "Either" first,
    not selects. Checkbox lists lost their per-section "Clear" link.
  - **An applied bar above the cards** (`AppliedRefinements`), the response
    manager's: "N of M match", a removable chip per value ("9–14 yrs",
    "Bengaluru", "Open to Pune", "Notice period: ≤ 3 months", "Salary ≥ ₹20L"),
    and Clear all. Only at `@4xl/main`, beside the column.
  - The drawer below `@4xl/main` is titled "Filter results", says "N of M
    match", and its link is "Reset all".
- **Storybook:** `Compositions → Database` has its own `RefinePanel` copy
  (`packages/ui/src/compositions/database.stories.tsx` ~line 1431) and a
  `RefinePanelStory`. Redraw both as the rail, and make the refine-panel
  results story the first one on the page since it is now the default.
- **Figma:** the Database page (node `144:2`), the "results under the Refine
  panel" frame and its standalone panel. Same treatment as the Response
  manager's filter rail on node `117:3`: flush left edge, 1px `border` stroke
  on the right, `background` fill, and a header bar with a bottom border.
- [ ] Storybook
- [ ] Figma
