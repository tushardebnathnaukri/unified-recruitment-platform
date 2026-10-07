# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A **prototype and playground for the iimjobs and hirist design team**, for designing the
*recruiter-side* product. Not production code, no backend — optimize for design iteration speed.
Mock data is fine; auth, real APIs and performance budgets are out of scope.

iimjobs and hirist are today **two separate products**. Whether they unify is the open question
this work informs, so prefer the reversible option when a choice would foreclose either outcome.

## Commands

Run from the repo root; Turborepo fans out to the workspaces. Scope with `-w web` / `-w ai` /
`-w @workspace/ui`.

```bash
npm run dev              # apps/web on :5173 AND apps/ai on :8787
npm run dev -w ai        # the AI server alone
npm run storybook        # packages/ui on :6006
npm run build            # apps/web only — packages/ui has no build step
npm run build-storybook
npm run lint / typecheck / format
```

npm is the package manager (`npm@11.6.0`). If a Vite command fails with `Cannot find native
binding`, the lockfile lost rolldown's optional deps ([npm bug](https://github.com/npm/cli/issues/4828)):
`grep -c '"node_modules/@rolldown/binding-' package-lock.json` should report 14. If it reports 0,
`rm -rf node_modules package-lock.json && npm install`. Never hand-add one platform's binding.

**The preview pane runs the app on :5174, not :5173.** Another local project's dev server
(`~/bud`, an electron-vite app) holds 5173, so the `web` entry in `.claude/launch.json` passes
`--port 5174 --strictPort`. `npm run dev` from a terminal still asks for 5173 and moves to the next
free port if it is taken, so check which port it printed before you curl it.

**The Gemini key lives in `apps/ai/.env.local`** (gitignored; `cp apps/ai/.env.example
apps/ai/.env.local` and fill in `GEMINI_API_KEY`). It is read by the AI server only and never
reaches the browser. Never print it, commit it, or copy it into a deployment unless asked to.
`curl -s http://localhost:8787/api/health` says `available: true` once the key is picked up.

## Verifying a change

No test runner. `typecheck` also catches less than you'd expect — path aliases resolve to
directories, so a wrong import path passes clean, and nothing type-checks CSS. Both dev servers
are curl-inspectable (they can run at once):

**`apps/web`'s typecheck used to check nothing at all.** Its `tsconfig.json` is `"files": []` plus
project references, so the old `tsc --noEmit` compiled an empty program and exited 0 — undefined
identifiers, missing imports and duplicate declarations all reached the browser instead of the
terminal, because esbuild strips types without checking them. The script is `tsc -b --noEmit` now,
which honours the references. `packages/ui` was never affected; its tsconfig has a real `include`.

```bash
# Vite compiles the module (catches bad imports typecheck misses)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/src/components/app-shell.tsx

# Tailwind generated a utility/token layer — read the SERVED css, not the source
curl -s "http://localhost:5173/@fs/$PWD/packages/ui/src/styles/globals.css?direct" | grep -c 'data-brand'

# Storybook indexed what it should have
curl -s http://localhost:6006/index.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(Object.keys(JSON.parse(s).entries)))"
```

Wait on a server's log rather than sleeping: `until grep -qiE "Local:|ERROR" /tmp/dev.log; do sleep 0.5; done`.

**After installing a dependency, a running dev server reports a React that is not broken.** Vite
re-optimizes its dep bundle and the page ends up holding two prebundles at once, which surfaces as
`Invalid hook call` and `more than one copy of React` while everything still renders. Check
`npm ls react` first — if it says `deduped`, it is the optimizer, not the tree. The fix is
`rm -rf node_modules/.vite` and a server restart, not a lockfile change.

**A browser console read returns accumulated history, not the current state.** Errors from before a
fix keep coming back and read as "still broken". Log a marker, force a re-render, and look only at
what lands after it.

## Architecture

Turborepo + npm workspaces:

- **`apps/web`** — Vite 8 + React 19 SPA, the clickable prototype. `main.tsx` → `BrandProvider` →
  `ThemeSync` + `TooltipProvider` → `BrowserRouter` → `App`.

**Shared state is Jotai atoms (v3), not providers** — in the default store, so nothing wraps the
app for it. The session overlays (`useDecisions`, `useSavedLists`, `useInterviews`, `useMessages`)
hold this session's changes in an atom, and where many components read one (every card's Save
menu, every card's interview slot) the merged view is a **derived atom per brand**, worked out once
per change rather than once per card. Per-viewer settings (theme, the /settings variants, sounds)
are `persistedAtom` (`lib/persisted.ts`): raw strings in `localStorage`, read on init, never
throwing when storage is blocked, and synced across tabs. **The URL still holds anything a reviewer
should be able to link to** (see Routing) — atoms are for what is not worth a link. The files kept
their `*-provider.tsx` names so no import moved. Still Context, on purpose: `BrandProvider` (it is
`packages/ui`'s, and Storybook drives it), `AthenaProvider` (it borrows the sidebar's own context)
and `PageHeaderProvider` (a portal slot, not state).
- **`packages/ui`** (`@workspace/ui`) — shadcn/ui components on Base UI primitives, documented in Storybook.
- **`apps/ai`** — a small Node server that holds the Gemini key, so the page never does. Node ≥
  22.18 runs its TypeScript directly (type stripping): no dependencies, no build, `tsc --noEmit`
  only to check. Seven routes — `GET /api/health`, `POST /api/intake`, `POST /api/route` (which
  Dashboard skill a sentence asks for), `POST /api/jd` and `POST /api/probe` (Chat v2.5's JD
  step, `jd.ts`), `POST /api/transcribe`, and
  `GET|PUT /api/sessions/:id` (an Agent conversation's turns, no key needed) —
  each deliberately narrow (a fixed schema in, a fixed shape out), with a per-IP rate limit
  (40 per 5 minutes) and CORS from `ALLOWED_ORIGINS` (localhost when unset). Vite's dev and
  preview servers proxy `/api` to it (`AI_SERVER_URL`, default `http://localhost:8787`); a
  deployed build points at it with `VITE_AI_URL`. **Everything that calls it has a rules
  fallback**, so the prototype works with the server down — see the Agent page below.

**`@workspace/ui` is consumed as raw TypeScript source, not a build artifact.** Its `exports` map
points into `src/`, so there's no build script and edits hit the dev server immediately. Vite
resolves it via the workspace symlink; `tsconfig` `paths` alias `@workspace/ui/*` → `packages/ui/src/*`.

Aliases: `@/*` → `apps/web/src/*` (app-local only; declared in both `vite.config.ts` and
`tsconfig.app.json` — keep in sync) and `@workspace/ui/{components,hooks,lib}/*`.

**Anything a `packages/ui` file imports must also live in `packages/ui`.** A shared component
importing `@/…` resolves to nothing at runtime and typechecks clean.

## Brands — the load-bearing constraint

**One design system, two brand theme layers.** Components are authored once in `packages/ui`;
brand differences live *only* as CSS variable overrides in the `[data-brand="…"]` blocks at the
bottom of `globals.css`, covering five accent tokens (`--primary`, `--primary-foreground`,
`--ring`, `--sidebar-primary`, `--sidebar-primary-foreground`). Neutrals, radii and type are shared.

Two rules matter more than anything else here:

- **Never hardcode a brand colour in a component** — add a token to the brand layer.
- **Never write `if (brand === "hirist")` in a component** — that's a real product divergence;
  surface it to the design team instead of absorbing it.

**Per-brand DATA is not what that second rule forbids.** The two products have different postings
and different candidates, which is them being different products rather than one component being
forked. So the rosters are a `Record<Brand, Job[]>` lookup in `apps/web/src/lib/jobs.ts`, screens
ask for the active brand's roster (`jobsFor`, `liveJobsFor`, `jobStatusesFor`, `statsFor`,
`activeJobsFor`), and no component branches on brand. A `domain: "tech" | "management"` on each job
picks which title, skill, school and company pools `lib/applicants.ts` generates from — hirist is
technology, iimjobs is management and senior non-tech.

`BrandProvider` writes `data-brand` onto `<html>`; the roster is `packages/ui/src/lib/brands.ts`.
Selectors are `:root[data-brand="x"]:not(.dark)` / `:root[data-brand="x"].dark`, which **assume
`data-brand` and the theme class sit on the same element** — keep both on `<html>`.

**The greys are Tailwind's mist ramp, not zinc.** Every neutral in `:root` and `.dark` (background,
foreground, muted, border, ring, sidebar, the chart neutrals) is the mist step at the same number
the zinc it replaced was, so the light/dark structure did not move. White and the translucent-white
borders in dark are unchanged. The cross-sell banner's fixed text and border greys are mist too.

Palettes: **iimjobs is real** (Tailwind's emerald ramp verbatim — 700/50 light, 600/950 dark).
**hirist is still a placeholder** orange; see the `TODO(design)` in `globals.css`.

## Styling

Charts are `packages/ui/src/components/chart.tsx` (shadcn's wrapper over **recharts 3.8**) —
`ChartContainer` + a `ChartConfig` whose colours point at `var(--chart-N)`. Used on `/insights` and
the Dashboard's performance section.

**`--chart-1` is the brand; `--chart-2`…`-5` are shared, theme-scoped neutrals.** The first series
on a chart is the recruiter's own data, so it takes `--primary` and changes with the product —
which is why the brand layers now carry **six** tokens, not five. Whichever series holds `--chart-1`
is the one the card is pointing at, so put it on the number being acted on (on `/insights` that is
the *ask*, not current pay).

It is deliberately not the whole ramp: five steps of one hue is a sequential palette, nothing here
charts sequential data, and it would put five oranges on hirist 18° from `--warning`.

The neutrals are theme-scoped because the card is white in one theme and near-black in the other.
They did not used to be — one set of five values was reused verbatim in `.dark`, so the ramp ran one
way and `--chart-1` measured **1.48:1** on a light card while `--chart-5` measured **1.19:1** on a
dark one. Every value now clears the 3:1 WCAG 1.4.11 asks of a graphical object in its own theme;
mist-500 is the pivot and holds in both. The figures are in `chart.stories.tsx` and on the Figma
**Chart** page.

**recharts animates a series in from zero via `requestAnimationFrame`.** Anywhere rAF does not tick
— a background tab, a screenshot runner, a hidden preview pane — the series stays at zero size and
the chart draws its axes and grid and *nothing else*. That reads exactly like a colour bug and is
not one. The Storybook chart stories pass `isAnimationActive={false}` so a shared link renders the
same for whoever opens it; the app keeps the animation.

Tailwind v4, configured entirely in CSS — there is no `tailwind.config`.
`packages/ui/src/styles/globals.css` is the single source of truth: `@theme inline` token map,
oklch `:root`/`.dark` palettes, brand layers, and `@source` globs pulling `apps/**` into the scan.

Theming is class-based. `theme-provider.tsx` holds the theme in a persisted atom, and its
`ThemeSync` (mounted once in `main.tsx`) toggles `light`/`dark` on `<html>` and binds a bare `d`
keypress; it syncs across tabs. It is **two-state on purpose —
no `system` mode**: this is a design-review tool, so the mode must be unambiguous from the icon
and a shared preview link must render identically for everyone. Storybook's switcher matches.

## Routing

React Router v8 **declarative mode** — plain `<Routes>`/`<Route>`, no loaders, no codegen, no
framework mode. Import from `react-router` (`react-router-dom` is a deprecated shim). Routes in
`src/App.tsx`, pages in `src/routes/`.

Designed so far: `/dashboard` (the Agent — a chat that gathers a posting, over the recruiter's
overview), `/jobs` (four status tabs), `/jobs/:jobId` — the response manager,
the biggest surface in here — `/jobs/:jobId/applicants/:applicantId`, `/insights`, `/database`
(search box, recent searches, results), `/interviews`, `/my-candidates` (My Lists) and `/jobs/new` (the same posting as a form). Still
`PlaceholderPage`: `/credits`, `/search`, `/projects/new`. `/reference/dashboard` is a hardcoded replica of the live iimjobs dashboard, kept
for side-by-side comparison and deliberately outside the design system — see the note at the top of
`legacy-dashboard.tsx`.

**The response manager is `components/candidate-list/`, not `routes/job.tsx`.** It moved out
when the database's results turned out to be the same screen: `CandidateList` takes the people, the
skills they are matched against, a header and an empty state, and owns everything else — tabs,
views, pills, panel, undo. `routes/job.tsx` is now the job header and a thin wrapper. The words that
differ between the two ("Applied" / "Updated", "New since …", what the skills were asked for by)
come from `lib/list-source.ts` through a context that `CandidateList` sets from its `source` prop;
it defaults to `posting`, so the candidate page and anything older needs no provider. Change triage
there and it lands on both screens.

**It is a folder of parts, and every import in it runs one way.** `index.tsx` is the screen — the
query string, the decisions, the arrangement — and it is what `@/components/candidate-list`
resolves to, so no caller changed when it stopped being one 4,600-line file. Beside it:
`applicant-card.tsx` (both card layouts and their buckets), `applicant-table.tsx` (the TanStack
columns), `split-view.tsx`, `applicant-list.tsx` (paging, run headings, empty states),
`applicant-actions.tsx` (the decisions and the ⋯ menu, drawn by the card and the table row alike),
`selection.tsx` (the tick boxes and the selection bar), and the filters in their three shapes —
`filter-panel.tsx` (the one implementation of what a filter is), `filter-bar.tsx` (the pills) and
`filter-rail.tsx` (the column). **`shared.ts` holds what more than one of them needs** — the views,
the tabs, the runs, the filter helpers — and it is deliberately not in `index.tsx`, because a part
importing the screen it is drawn on is a cycle. `PickingContext` lives there too, for the reason
`apps/web`'s providers carry a file-level eslint-disable: a file exporting a context beside its
components loses fast refresh, and `shared.ts` exports no components.

**`/database` is one box with three modes under it** — Keywords, Natural language, Job
description — not the live product's three tabs over three forms. The mode only changes how the
text is read, so the draft survives a switch. `mode`, `boolean` and `q` are in the URL; `q`
present means the page is that search's results. A bare `?q=` (what the Dashboard's box sends) is
a natural-language search. The results' search-within box is `?find=`, because `q` is taken.

`lib/database.ts` deals a search's people from the same generator as a posting's, through a
posting-shaped stand-in: the recent row's `matches` is the count and its `newSince` is who carries
the new dot. Search results pass `layout="results"` — a ranked list, not a queue: no decision tabs
(a decision is a badge, not a move), cards only, and the caller's own `sidebar` and `toolbar`. The
job page is `layout="queue"` and keeps its three filters as pills — except in the **cards view at
`@4xl/main`**, where they become `FilterRail`: a fixed white column flush against the nav and the tab
block, as tall as the screen below that block and sticky there, with the "Filters" heading and
search pinned and the collapsible sections scrolling inside it. Radios, because each filter holds one
value, and beside each option how many people it would leave. The tab block's height is measured
through a callback ref, which is what `top` and the column's height come from. Above the cards,
`AppliedFilters` shows Insights' applied bar: "N of M match", a removable chip per filter (search,
experience, notice, location — not sort) and Clear all. It shows only beside the rail, and only when
something is on.

**Location is two filters and one card row: where they are, and where they would go.**
`preferredLocations` is on `Applicant` (their own city first), not dealt by `toProfile` as it used
to be — the cards and the filters read it, so it is a fact about the person rather than something
only a database search knows. The rail, the pills, the drawer and the table's Location header all
carry **Current location** (`?location=`) and **Preferred location** (`?preferred=`), and the card's
Location row reads "Noida · open to Pune, Anywhere", the current city repeated as the emphasis
because the two only mean anything together. **"Anywhere" matches every city a recruiter can pick**
and is kept out of the options: as a value it would mean "only people who said Anywhere", which is
not a question anybody asks.

**Both are pick-many, through one `LocationPicker`** — shadcn's **Combobox in its `multiple`
shape** (`ComboboxChips` + `ComboboxValue` + `ComboboxChipsInput`): a box you type into with the
list narrowing as you do, and a chip inside the box per city taken. They are the only filters here
that are not one-of-a-list, so they are the only two that do not go through the radios: a role in
one city is usually open to the ones around it, and with a single value seeing who was in reach of
three cities meant running the list three times. Repeated params
(`?location=Pune&location=Noida`), OR within a filter and AND between them.

**`autoHighlight` is not decoration.** Without it nothing is highlighted until an arrow key is
pressed, so typing "pun" and hitting Return did nothing — and typing then Return is how anybody
uses a box like this. **The chips are the only "clear" it needs**, so there is no "Any city" option
sitting in the list pretending to be a city. In the rail each option carries what the list would
hold **with that city added**, since a second city widens rather than narrows; in a popover or a
table header the count is left out rather than shown wrong. The applied bar draws one chip per
city, not one per filter. `filters.location` and `.preferred` are arrays, so anything keying a memo
on them keys on `.join()` — `getAll` returns a fresh array every render.

A first pass built this out of `Command` and hand-rolled pill buttons. It looked the same and had
none of the behaviour: no Backspace-removes-the-chip-behind-the-caret, no focusable chip list, no
popup that anchors, flips and sizes itself against the input. **Adding `combobox` also re-ran the
Vite optimizer**, which reported `Invalid hook call` and "more than one copy of React" on a tree
where `npm ls react` said `deduped` — `rm -rf node_modules/.vite` and a restart, as above.

**The split view fills the viewport exactly, to the bottom edge, and the page does not scroll behind
it.** Its height is `100svh` less the header and the **measured** tab block (`top`, the same number
the filter rail sticks below) — those two are everything above it, so the rest of the screen is
what it gets. It used to be a hand-counted constant, which was wrong by however much the tab block's
real height differed from the guess, and that block wraps. `SPLIT_CHROME` — the page's own `py-6`
bottom and gutter — is then cancelled as a **negative bottom margin** rather than taken off the
height: subtract it and the columns stop short with a band of mist under them.

**Both split columns are `relative`, and that is load-bearing.** `sr-only` is `position: absolute`,
and an absolutely-positioned element is only clipped by an `overflow` ancestor that is its own
containing block. With the columns unpositioned, the "New" label on every row resolved against
`main` instead — so a hundred rows scrolled out of sight still staked out a hundred rows of
document, and the page scrolled ~1800px past a screen that looked full. Any scroll container here
whose rows carry an absolute child (a badge, an `sr-only`) needs `relative` for the same reason.

**The split view's list is the rail's column too.** At `@3xl/main` it drops the rounding, the ring
and the card fill, runs flush against the nav (a negative margin cancelling the page gutter),
divides with a `border-r`, and pins each run heading the way the rail pins "Filters" — so selection
reads as a full-bleed band rather than a rounded pill inside a card. A floating card in one view and
a flush column one view away was the same furniture in two shapes. The split container takes
`-mt-4` and four units off its height so the column starts where the tab toolbar ends; the CV pane
puts that gap back for itself with `pt-4`. Below the breakpoint the columns stack and it goes back
to being a card, because nothing is beside it to be a column against — a narrow band of widths
(roughly 768–816px, since `CandidateList` has already collapsed the nav to its icon rail by then).

**The pill row applies as you pick, like the rail.** It was a draft behind **Apply** and **Clear**
until 6 Oct 2026, so "12+ years, in Pune" landed as one change; that went because most pills close
on one pick (so batching saved almost nothing), the rail already applied as you picked, and the two
buttons sat disabled most of the time. Two places still hold a draft: each **location picker's
popover applies when it closes** (the only pick-many pills, so three cities land as one change),
and the **drawer on a phone** is edited as a draft, started from what is applied each time it
opens, and applied by **"Show N results"** (N counted over the draft with `matchesFilters`, which
is why `FilterBar` takes `people`). Closing the drawer any other way discards it. The search
popover narrows as you type. **Clear** shows only while a filter is on, as a quiet ghost button;
each pill's "Any …" option still undoes that one. Sort was never in a draft: it removes nobody.

**The database has two filter designs, picked on /settings** ("Database filters", via
`useFilterVariant` in `lib/filter-variant.ts` — localStorage, no provider). **Refine panel** (the
default) is the live hirist column below. **Juicebox** (`components/juicebox-filters.tsx`): a
Filters dialog that is edited
as a draft with a live match count and applied on Save, ranked plain-English Criteria (`?crit=`)
that decide what the cards highlight and the Best match order but remove nobody, and "Expand
pool" chips whose `+N` is counted against the real pool (`expansions` in `lib/database-filters`).
Both read and write the same URL keys, so a
link keeps its filters whichever design opens it.

Under Juicebox each card also carries **one evidence line per criterion** (`CriteriaEvidence` in
`candidate-list/applicant-card.tsx`, fed by `CandidateList`'s `verdicts` prop). The verdicts come
from `verdictsFor` in `lib/criteria.ts`, and Best match is summed from the same verdicts
(`scoreFor`), so a card's lines are the reason it ranks where it does. A criterion naming a known
skill is checked against the person's skills and cites a role on their card; free text gets a
stable per-person yes/no and a line saying only where it looked — no invented quotations.

**A search's city and years arrive as filters, not as a fact about the results.** `searchHref`
writes `cur`/`xp` from `criteriaFrom`, and `resultsFor` deals a wider pool — the same people plus
some in the next three cities and a few years either side — so the list opens on exactly the recent
row's count and loosening a filter finds somebody. The Dashboard's box goes through `searchHref`
too.

**The refine panel matches live hirist search** (`search.hirist.tech/search/…`): the same 20
sections in the same order, declared as rows in `SECTIONS` in `lib/database-filters.ts` and drawn
by `components/database-filters.tsx` (a drawer below `@4xl/main`). **It is drawn as `FilterRail`,
not as a card of its own** — the same fixed white column flush against the nav and the top bar, as
tall as the screen and sticky there, "Filters" with a count and Reset all pinned at the top and
the sections scrolling below. **The inside is the rail's too, not only the column**: sentence-case
headings, a count beside every option (what the list would hold with it picked — which is what
makes applying as you pick safe), radios with "Any …" for one-of-a-list, `LocationPicker` (now
`components/location-picker.tsx`) for both locations, a heading count of one per value (search
within included, because Reset all clears it), and `AppliedRefinements` above the cards — chips
from `appliedFilters` in `lib/database-filters.ts`. Only the first three sections open, since twenty
open is several screens. Narrowing a list is then one piece of furniture a recruiter learns
once; what differs is what is in it, and twenty questions against a posting's four is a real
difference between a search and a queue rather than one component forked. Every one
narrows something — the fields the generator never dealt (expected pay, preferred cities,
languages…) are dealt there off each person's id by `toProfile`. **Diversity is drawn gated, as it
is live ("Maven Exclusive"), and the mock deals nobody a gender** — it would only be guessing from
a first name. The panel's URL keys (`xp`, `cur`, `org`…) deliberately avoid the ones
`CandidateList` reads (`exp`, `location`, `notice`, `q`).
The people **conform** to what the search pinned down (city and years, read by `criteriaFrom`)
rather than being filtered after, so the row's count and the page's agree. Highlighted skills are
exactly the ones the search named (`skillsIn`) — none if it named none. Recent searches live there
too; the Dashboard shows the first three through the shared `SearchRow`, so those three are what its
Storybook composition and Figma frame copy.

The response manager keeps its tab, view, sort, filters, selected candidate and open profile panel
in the query string, so any state worth showing someone is in the URL;
`applicants.ts` generates its people from a seeded LCG so a row can be pointed at in a review, and
their bucket sizes come from the job's own counts so the Jobs list and the detail page cannot
disagree.

**The table view is a TanStack Table v9 data table, and TanStack owns the columns, not the
rows.** `CandidateList` still filters and sorts upstream (`matchesFilters`, `sortApplicants`),
because the cards, split view, tab counts, Athena and the New/Earlier runs all read that order;
the table is `manualSorting` and draws its rows by section. The column definitions are one
module-level constant reading an `ApplicantTableContext` — built inside the component, every
keystroke in a header filter rebuilt the columns and remounted the popover, losing focus.
Header sorts write `?sort=<column>.<asc|desc>`, except where that is a named sort (`match`,
`experience`, `notice`, `recent`), which keeps its name; **current pay is sortable from its header**,
though still not offered as a pill. Header filters write the pills' own keys. Column visibility
is `?cols=` (off-by-default columns shown) and `?hidecols=` (on-by-default columns hidden) — not
`hide`, which Search Resume spends on "Hide viewed profiles" — with the column list in
`lib/table-columns.ts`.

**Search Resume has the table too** (`tableView` on `CandidateList`, cards or table, no split);
My Lists does not yet. Its header filters are the refine panel's own sections, passed in as
`tableFilters` and drawn by `SectionControl` from `database-filters.tsx`: Location is `cur`, Exp
`xp`, Current `ctc`, Notice `np`. So a header, the refine panel and the Juicebox dialog are one
filter in three places. The Candidate header keeps the list's `find` box.

**The response manager is organised by decision, not by reading.** Statuses are `undecided`,
`shortlisted`, `rejected` — a yes or a no; Maybe and Contacted were removed on 6 Oct 2026, and
reaching out (Message, an interview) is something done to a person rather than a place they sit.
There is no unread or seen, because the screen
cannot know what was read and a recruiter's daily question is "who still needs a decision from me".
Arrival is a separate fact: `newSinceVisit`, against a constant `LAST_VISIT` (one user, no
accounts). The page opens on **To review** — everybody undecided — as two runs, "New since …" then
"Earlier", and the sort (Most recent / Best match) applies *inside* each run, never across. A
decision removes the card at once, with an undo bar. The avatar's dot means new AND undecided
(`isNew`).

**Avatars are generated photos, and one candidate in five has none on purpose** — a real pool is a
mix, so the card must read either way. `apps/web/scripts/generate-avatars.mjs` (Gemini, key in
`GEMINI_API_KEY`) writes made-up faces into `src/assets/avatars/`: named fixture people by full
name, and candidates as a pool of three per first name, the age band picked from experience by
`candidatePhoto` in `lib/avatars.ts`. The pool mixes studio, natural-light and phone-quality shots
deliberately. Adding a first name to `applicants.ts` means adding it to the script and re-running
it; a missing file just falls back to initials.

Jobs carry `newSinceVisit`, not `unread`, and that is what "N new" means on the Jobs list
and the Dashboard.

**The old Dashboard is gone** (2026-09-28): the Agent took its name and its place, with the tiles,
Live jobs and Recent searches moved under the box. Its requirement box (which only searched,
`/database?q=`) went with it, and so did the "Dashboard bar" Form variant, which is kept in a git
stash ("Dashboard bar (Form variant) — saved before the old Dashboard was removed"). Projects are meant to file
themselves by role rather than be created, and two pieces from shapes that were tried and pulled are
**parked — written, unused, kept on purpose**: `projectForRole` in `lib/dashboard.ts` (which project
a role would land in) and `requirementParts` in `lib/requirement.ts` (which of location, title,
experience, industry and skills a description covers). Do not delete them as dead code without
asking. Word-list autocomplete on the box was built and removed.

**A candidate comes in through exactly two doors: Jobs (they applied) and Search Resume (a search
found them)** — `CandidateSource` in `lib/candidate-source.ts`. Everything else is downstream and
records which door, rather than being a door itself: **Interviews are driven from Jobs and Search
Resume** (each row is booked against a posting and says "Applied" or "Sourced from <search>", the
candidate linking to their applicant page or to their profile over the search), and My Lists'
"Saved from" has the same two values. Screens say which door their people came through by providing
`CandidateSourceContext` — `CandidateList`'s `candidateSource` prop, or the candidate page's job.

**"Set up interview" books a slot** (`ScheduleInterview`, a render-prop around whatever trigger —
the card icon, the overflow item, the panel, the candidate page). An applicant's job is fixed; a
sourced person picks one of the live postings. It warns on a calendar clash, lands as Awaiting
Candidate Response, and booking again reschedules (one interview per person per posting). State is
`useInterviews` (atoms), the same seeded-plus-overlay shape as the other overlays, and /interviews
reads it. **Booking shortlists the person only when the dialog closes**: on a queue the
decision takes the card away, and the dialog lives inside the card. The overflow item's dialog sits
around the whole menu for the same reason — menu items unmount when the menu closes.

On /interviews, **Reschedule** opens the same form (`RescheduleDialog`) and **Cancel interview**
asks first, then takes the slot off (`cancel` in `useInterviews`). Both dialogs are held by the
page, not the row: rescheduling makes a slot Awaiting Candidate Response, which filters its row out
of the table while the confirmation is still showing. Completed rows have no actions.

**Add feedback** (`FeedbackDialog`) is a four-way recommendation — Strong hire / Hire / No hire /
Strong no hire, no middle — plus notes, and **submitting marks the interview Completed**: feedback
is only ever about one that happened. A written verdict shows as a badge that opens the notes; an
invite still Awaiting Candidate Response takes none. It deliberately does not move the candidate's
decision on the posting. `Interview.feedback` is `InterviewFeedback | null`.

**My Lists (`/my-candidates`) is the recruiter's personal database** — people kept from Jobs and
Search Resume, within one product. A person is saved once and filed in one or more
named lists; "All saved" is the pool and a list is a view onto it. Each keeps where they were saved
from, as a link back. It is a pool, not a queue: `CandidateList` with `layout="results"`,
`source="saved"`, the lists as the sticky column, and the card's last block (`annotate`) carrying
the saved-from link, the other lists and the recruiter's note. `?list=`, `?from=`, `?find=`. Data
is `lib/lists.ts`, dealt from the same generators as the screens the people came from.

**Saving is `SaveToList`** — a menu of the lists, ticked where the person already is, on every card
and in the split view and profile panel of both the response manager and Search Resume's results.
Ticking files, unticking the last list unsaves. State is `useSavedLists` (atoms, an
overlay over the seeded pile like the decisions, per brand, reset on reload). Where somebody
was saved from comes from `CandidateList`'s `savedFrom` prop through `SavedFromContext`; My Lists
passes none, because everybody there already has one.

**`/insights` is the market; the Dashboard is you.** Insights answers "what does this role pay,
where are the people, is demand rising" and reads the same for whoever searches it — it is modelled
on `calculus.hirist.tech`, which serves the same thing at `/insights/`. "How is my hiring going" —
funnel, time to fill, reply rate, which channel the hires came from — lives on the Dashboard,
because a recruiter reads "analytics" as the second question and there is nowhere else to ask it.
The nav item was renamed rather than one page trying to be both.

`AppShell` is the layout route: `SidebarProvider` → `AppSidebar variant="sidebar"` + `SidebarInset`
+ `AthenaPane` → `SiteHeader` + `<Outlet />`. Shell dimensions (`--sidebar-width`,
`--header-height`, `--athena-width`) are set as inline CSS variables on `SidebarProvider` so the
header, sidebar and copilot pane read the same numbers; the structure follows
shadcn's `dashboard-01` block. Pages own their gutters (`px-4 lg:px-6`) — the shell only supplies
vertical rhythm. The shell is flush, not `inset`: no margin or rounded card around the content,
with the nav's right border and the header's bottom border dividing the three regions. Athena's
pane matches (`top-0 h-svh border-l`), so a change back to `inset` has to change both. The nav is white (`--sidebar`) and the content
column is Tailwind's mist-50 (`bg-canvas` on `SidebarInset`), except the header, which paints its own
`bg-background` so the top bar stays white. Object screens continue that white: `CandidateList` wraps its
`header` in an edge-to-edge `bg-background` band (merged into the white sticky tab toolbar on a
queue, ending in its own `border-b` on results and empty queues), and the candidate page wraps its
`Header` the same way. The negative margins assume the header is the first thing on the page. `--canvas` is its own token rather
than a new `--background`, because chips, active tabs and switches use `bg-background` to stand out.

**A screen about one object puts its header in the top bar** — `PageHeader` in
`components/page-header.tsx` portals into a slot in `SiteHeader`, and `titleForPath` steps aside
while anything fills it. The route title names the *section*, so a posting read "Jobs" above a band
naming the job: two rows to say where you are. The response manager and Search Resume's results do
this, which is why they pass `CandidateList` **no `header`** (it is optional; without one no band
draws, and a queue's sticky tab toolbar takes the `-mt-4 md:-mt-6` that joins it to the bar). It is
a portal rather than a registered node because a `ReactNode` through context re-registers a new
element identity every render, which loops; the claim count beside it is the one thing a portal
cannot say — whether anybody filled the slot — and it is a count, not a boolean, because a route
change mounts the next header in the same commit it unmounts the last.

Fitting one row at `--header-height` costs the second and third lines: the title drops to the bar's
`text-base` and truncates instead of clamping, the back button is a ghost circle rather than an
outlined one, and the meta sits behind a separator that hides below `lg`. Two things moved rather
than shrank — Search Resume's "Looking for" skills are now `LookingFor` above the cards, next to the
green chips they explain, and Juicebox's query pill is gone entirely, because the bar's title and
back button were the same control.

**The Dashboard has no top bar from `md` up** (`bare` on `SiteHeader`, set in `AppShell` by
`useMatch("/dashboard/*")`), and its conversation is `md:h-svh` instead of the screen less the
header. Below `md` the bar stays, because it holds the only trigger that opens the nav there.

**Athena is the third column.** `AthenaProvider` sits inside `SidebarProvider` because opening the
copilot collapses the nav (and restores whatever it was doing on close), which means it needs
`useSidebar`. The pane is a sibling of `SidebarInset`, not a child — it sits *beside* the page, not
over it — and it is `sticky` + `h-svh` rather than a plain flex child, because the shell wrapper is
`min-h-svh` and grows with the page, which otherwise puts the composer at the bottom of a long
document instead of the bottom of the screen. Below `md` it covers the page. The trigger is in `SiteHeader` and only opens; the pane carries its own close.

**Athena answers what the page can compute, and nothing else.** A page calls `useAthenaContext`
(in `athena-provider.tsx`) with a label, a detail and its **openers**. Each opener is a prompt plus
an `answer()` run at the moment it is asked, against the page's current data. The answers are built
in `lib/athena.ts` from the same mock data and decisions overlay (`useDecisions`) the screen reads, so "the
strongest five" are Best match's top five, and shortlisting from the pane moves the tab count
behind it. Free text gets `CANNOT_ANSWER`, never a plausible invention. Replies are **blocks**
(`athena-blocks.tsx`): text, candidate rows with Shortlist, a **proposal** (a batch decision
that does nothing until Apply, and has Undo), link rows (to a route or to a message thread), and a
**draft**. The job page, the candidate page, Search Resume's results and the Dashboard register contexts so
far. Every other page shows only the "Looking at" line.

**On /interviews, Athena reads the whole diary**, not just the status the dropdown shows. Her
questions are what's on this week (`THIS_WEEK` in `lib/interviews.ts`, since today is 15 Sep 2026),
who hasn't accepted (with a nudge draft for all of them), whether any calendar is double-booked,
and who got a hire recommendation. The seeded diary does hold a clash, and each clashing row opens
the page's own `RescheduleDialog` through a link row's `open`. **There is no "missing feedback"
question**, because every mock slot is dated after today, so the answer could only ever be "none".

**"Set up N interviews" is on the selection bar's ⋯ menu** (`BulkScheduleDialog` in
`schedule-interview.tsx`). It asks only what the batch shares (one calendar, a start day, and a
posting for anyone found through a search) and lays people into that calendar's free slots in tick
order, skipping taken slots. The whole plan is shown before Send. Anyone who already has a slot is
skipped rather than moved, and anyone who doesn't fit says so. Invites go out as Awaiting Candidate
Response. The people booked are shortlisted only when the dialog closes, and the selection clears
only if invites went out.

**On Search Resume, Athena reads the same numbers the page does.** "Why is the best match first?"
prints the top person's verdicts, the same `verdictsFor` lines the card shows. It says when the top
two are level on the criteria and the search's own order decides. "How can I find more people?"
runs `expansions` (under both filter designs, since they share URL keys), and each row's Apply is
the page's own `apply`, so +64 really lands 64 more people. "Save the top five" files people into a
list and removes nobody from any list, like the bulk save.

**The card opens with Tags** — `tagsFor` in `lib/applicants.ts`, drawn above Experience because it
is the summary of it: "Leads a team" / "Fast riser", the sector, "Top institute", "Long tenure" /
"Moves often" are what a recruiter would come away with after reading the roles, the employer and
the school, so putting them under would be a conclusion after its own evidence. Every one is
**derived from facts already on the card**, never dealt, so a tag cannot disagree with the block
below it and adding one costs a rule rather than a field on every generated person.

**The card shows three and counts the rest** (`TAGS_SHOWN` in
`candidate-list/applicant-card.tsx`): `+2` is a handle rather than a full stop, so the rest are on
hover in the order they would have been drawn.
`tagsFor` therefore returns ALL of them — how many fit is the card's business — which makes the
ordering in it the only thing deciding what gets seen. About one card in ten overflows.

**A tag written as the common half of a fact is a word the eye learns to skip.** "Switched sector"
was true of 111 people in 120, because the generator picks each earlier employer independently; the
rule is written as **"One sector"** instead, which is uncommon and is the actual signal — deep in
one domain. Check which half is rare before choosing the wording.

**The sector tag and the database's Industry filter are one vocabulary.** `industry` is on
`Applicant` (from `industryOf`, a company → industry map in `applicants.ts`) rather than dealt in
`toProfile`, for the same reason `preferredLocations` is: the card shows it. `INDUSTRY_TAGS` maps
the canonical name to the chip — "Banking / Financial Services / Broking" is built to be
unambiguous in a filter list, and a card has room for "Fintech". Anything without a shorthand goes
untagged rather than printing the long one. **The map lives in `applicants.ts`, not beside the rest
of `COMPANY_FACTS`**, because `database-filters.ts` already imports values from `applicants.ts` and
the other direction would be a real cycle; the clusters stay there, since only the refine panel
asks for them. They are `secondary` chips, not the skills' `success` green — green means "one of the
skills this posting asked for", and a tag is a fact about the person nobody asked for. Nothing here
repeats the notice period or the location, which have rows of their own. In the columns card shape
they are a band across the top rather than a sixth column, since a narrow column wraps every chip
onto its own line.

**Check that an answer can actually appear before designing it.** Tags cost two goes at this. "Moves
often" was written as an average stint **under** two years, and the generator deals every stint as
two, three or four — no card could ever have carried it. "Strong match" was `match >= 80`, and
`match` is `fits * 25 + jitter * 25` where `fits` peaks at two of four required skills on a real
posting, so the ceiling is 74%: also unreachable, and dropped for "Fast riser" (a leading title
under eight years), which the data does produce.

The same trap caught Athena: the mock pools never deal anybody all of a posting's four required
skills, so "shortlist the full matches" could never produce its proposal, and the job page's batch
question is "clear out people with none of the skills" instead. **Ask the generators
(`applicantsFor`, `requiredSkillsFor`, `tagsFor`) for the distribution first** — count it across the
whole pool, not the first page, because a rule that fires on one card in ten looks broken on twenty.

**Athena writes messages; she never sends them.** Messages' state is `useMessages`
(`components/messages-provider.tsx`, atoms), so Athena can read the live threads
("which threads are waiting" drops somebody the moment you reply) and fill drafts. A draft card puts
text into each recipient's composer and goes to `/messages` — one recipient lands on that thread,
several on the list. The recruiter sends it from the thread, and
the list row says "Draft:" until they do. A thread started for an applicant carries `applicantId`;
sending moves nobody. The Message button on a card, the profile panel and the candidate page opens
that person's thread the same way (`useMessageTo`), with a first message drafted. The body may
say `{first name}`, filled in per recipient, so one draft serves a shortlist. The composer is
a textarea because a draft is read before it is sent.

**Questions also come from the list, not only the page.** Every card and table row in
`CandidateList` has a checkbox, plus "Select all N" over the cards and in the table header (the
whole tab, not the page on screen). The ticked people are `?picked=`, in tick order. The selection
bar carries the card's two decisions (Reject / Shortlist, with one Undo for the whole
batch, on results as well as queues), a ⋯ menu, and Athena. The ⋯ menu has Save to list, Message and
Download CVs. **Save to list adds everyone to a list and removes nobody from any**, unlike the card's
menu, which toggles. **Message writes drafts** into each thread with `firstMessageTo` and opens the
page, just like Athena's drafts. Athena offers "Ask Athena" for one person and "Compare in Athena"
for two or three (`COMPARE_MAX`), and leaves the bar entirely for more. A decision or action clears
the selection. A card's
⋯ menu has "Ask Athena" too. Both go through `ask()` on the Athena provider, which opens the pane and
leaves the question in `pending` for the pane to answer like an opener. The answers are
`aboutCandidate` and `compareCandidates`, which take whatever skills the list was asked for (a
posting's or a search's), so they work on Jobs, Search Resume and My Lists alike. The comparison only
highlights the leader on facts with an agreed direction (most skills, soonest start); pay and
experience are shown but not ranked. The split view has no checkboxes, because its list already
selects whose CV is open. Bare **A** toggles Athena, guarded like the theme's **D**. With Athena
open, the selection and undo bars centre on the content column (`BAR_BESIDE_ATHENA`), because
centred on the window they ran under the copilot's own edge.

**The nav has three borrowers.** `CandidateList` collapses it below 1400px, the Dashboard collapses it
at every width once a conversation starts (the landing keeps it), and Athena collapses it for her
pane. The first two go through `useCollapseNav` (`components/use-collapse-nav.ts`, a media query or
null), which only gives back a nav it collapsed. Handing it back goes through `restoreNav` on the
Athena provider, which defers while she is open. Restoring directly used to throw the nav open
beside her when you left a job page.

**The thread survives navigation, and there is one per product.** Each message records `where` it
was asked (the page's label), and the "Moved to …" dividers are derived from that at render time
rather than stored. Walking through several pages without asking leaves one divider, and coming
back leaves none. Old answers keep their live buttons. Switching brand swaps to that product's
thread and switching back restores it, because the other product's candidates are not people this
one has. **There is one copilot**: the Messages page's
sparkle button opens Athena, and its old assistant thread with its canned replies is gone.

**The Dashboard is the Agent: a second copilot, built beside Athena rather than into her** — a
full-page chat at `/dashboard`, first in the nav, with the recruiter's overview under its box. It
was `/agent` until it replaced the old Dashboard; `/agent` and `/agent/c/<id>` redirect, keeping the
id and any `?ask=`. Its first skill is **Post a job** (Search people and Get insights answer from
the page's own data, the way Athena's openers do). Athena is otherwise untouched by it, but **she
is off on the Dashboard**: `available` on the Athena provider (a `useMatch`) hides the header button,
ignores the A shortcut and closes an open pane on arrival, because two copilots on one screen
would be one answering over the other. Whether the two merge is a later call. **A conversation is its turns, kept under a short id: `/dashboard/c/<id>`**
(`lib/agent-sessions.ts`). The page makes the id on the first question and writes every turn to
this browser's `localStorage` first and the AI server second (`PUT /api/sessions/:id`), so a
reload works with the server down and the link opens for anyone who can reach the server. Opening
a link reads this browser's copy at once and takes the server's when it has more turns; a link
neither has says so ("This conversation isn't here") rather than showing an empty landing. On the
preview the server keeps them in `SESSIONS_FILE`, which survives a restart but not a redeploy.
**An old `?ask=` link still opens** — the same turns, moved into a session, the address replaced.
Back no longer walks the turns one at a time; it leaves the conversation. A submitted
questionnaire is ONE turn, encoded as `Answers: {json}` (`encodeAnswers` / `decodeAnswers` in
`lib/job-refine.ts`). `answersFor` in `lib/agent.ts` folds the turns into the replies on every
render.

**The landing has three designs, picked on /settings** ("Dashboard landing", `useAgentLandingVariant` in
`lib/agent-landing-variant.ts`). **Chat** (the default) is the Aura centred over the cards
landing's own heading and subheading, four action pills (`HERO_ACTIONS` in `lib/agent.ts`) and `AgentComposer size="hero"` — a
taller box, attach and quick actions behind a "+", the mic on the right, and a send arrow only once
there is something to send. Under the box it shows **the Dashboard's own overview** — the four
tiles, Live jobs and Recent searches — from `components/overview.tsx`, which the Dashboard now
draws too, so the two cannot disagree. **Chat with tabs** is Chat with the pills merged into the box as
shadcn's `line` tabs along its top edge, pipes between them (`LandingTabs` in `routes/agent.tsx`,
the composer's `header` slot): an **Ask** tab comes first and is "no pill pressed", so exactly one
tab is always selected; the selected tab is the mode, so the box draws no mode chip
(`modeChip={false}`), and Esc or Backspace in an empty box goes back to Ask. A tab the text heads
for lights as a pill would. Attach and quick actions are their own buttons beside the mic
(`inlineTools`) rather than behind the "+". **Cards** is the first design. The pills are Create Job, Search Resume,
Review applicants and Hiring Insights, and every one asks a question a skill already answers.
Review applicants prints the number its answer opens on ("92 waiting") from `undecidedTotal`,
which the answer uses too, so the pill and its reply cannot disagree. A "Job updates" pill (new
since the last visit) was dropped: everyone new is also undecided, so it duplicated the queue. The box's placeholder **types out example
questions in turn** (`heroExamples` in `lib/agent.ts`, `useTypewriter` in
`components/use-typewriter.ts`) while it is empty and unfocused, and stops on the whole current one
when focused; reduced motion swaps whole lines instead. Every example is routed like typed text and
checked to reach a specific answer — pay, top matches, city value, the diary, a note — because
copying one in is the likeliest first thing anyone does.

**Posting a job is three stages, and the first question picks the road.** "How would you like
to start?" — a JD, a form, "let's chat about it", or one of my jobs as a base
(`lib/job-start.ts`) — because a recruiter holding a JD should not be asked what it already says.
**A sentence that starts a posting AND describes the role skips the question** ("hire an FMCG
product manager in Delhi" — `describesRole`): it is read as the from-scratch opener. Free text is
routed by `routeFor` in `lib/agent.ts` — whole words, a phrase weighing its word count — because
substring matching let "new" in "New Delhi" send a hiring sentence to "What changed".
**Keywords first, Gemini only on a tie or a miss.** A sentence one skill wins outright is
answered at once; a tie ("hiring insights" — posting's "hiring", the market's "insights") or a
miss ("mujhe ek sales head chahiye") waits on `/api/route` (`apps/ai/src/route.ts`, `routeWithAi`
in `lib/agent-route-ai.ts`), cached like a reading (`routes`, `pendingRoute`, sessionStorage
`agent:routes:v1`, only Gemini's kept). The model picks a skill id from a fixed list and the page
answers from its own data. **A tie never goes to the first skill any more**: unsure (the model's,
or the keywords' when the server is down) is a "Which did you mean?" card of the options' own
prompts, and none is the refusal — its buttons carry the pill's own name (`labels` on a
`prompts` block), since `ROUTE_LABELS` call a skill what its pill does ("Create Job", "Hiring
Insights"). **Where the text is heading is shown, not said** (`routeHint`, keywords only, read
400ms after typing pauses and from two words, so it does not flicker): on the chat landing the
matching pill lights (`data-lit`, both for a tie); any other clear match prints what Enter will
DO beside the send button inside the box ("↵ Show this week's interviews", `ROUTE_ACTIONS`) —
an outcome rather than "Goes to", and in space already there, so nothing moves. A miss shows
nothing. A first pass printed "Goes to Post a job" as a line above the box: it named the pill
above it by a different name, jumped the box each time it appeared, and changed on every word.
**Every pill is a mode, not a question** (`MODES` in `routes/agent.tsx`). Create Job is described
below; **Search Resume** is the same box over `composeAssist(…, "search")` — no CTC, because a
search asks pay after the sentence rather than reading it, and an empty box offers your recent
searches whole, then your postings' titles; its turn starts the search with the sentence as the
requirement. **Review applicants** and **Hiring Insights** are asked rather than described: the
box offers their questions (`askAssist`, sent on press) and anything typed stays in the pill's
family (`MODE_FAMILY` — the queue, the strongest, what changed, the note, the diary; or your
funnel, the market, the cheapest city), falling back to the pill's own question. **A clear
match breaks out of any pill** (`modeTarget`): "hire a sales head" under Review applicants starts a
posting, and the work step says "Create Job, not Review applicants" — **except a sentence that
describes a role** under Create Job or Search Resume, because descriptions hit keywords by accident
("Product Manager, Pune" is a clear win for the best-value city). A tie across the pill's edge is
not the pill's to settle and is routed like typed text (Gemini, then "Which did you mean?"). The
composer says so before send (`modeHint`): the pill it is leaving for lights, or the line by the
send button names the outcome; staying says nothing. In every mode an empty Enter is the pill's
old question (`submitEmpty`). While the box has focus a scrim dims
the page, leaving the box and the pills lit. **Create Job**, pressed, fills with the brand; the box takes the caret and carries a
"Create Job ✕" chip (Esc, or Backspace in an empty box, lets go), a Role · Location · Experience ·
CTC · Industry · Skills tick row sits inside the box, and under it `composeAssist`
(`lib/job-compose.ts`) offers what to add next — two rows at a time, each pick appended to the
sentence in plain words ("in Mumbai", ", 12–17 years", ", ₹60–80 LPA", ", FMCG", "— Brand
Strategy"). **Every option is read off the pool a search for the role finds** (`poolFor`, as Chat
v3's suggestions are): cities by share, years and CTC as the pool's thirds (the top years band
open-ended), sectors by share; skills are `skillsForTitle`. Words are finished from the Smart
Hire vocabulary (`matchesFor`, Tab takes the first) — the bar whose ghost text was taken off the
Dashboard; this only appears after the recruiter has said they are writing a job. A known title is
matched whole and longest first, because titles hold commas and dashes ("Vice President,
Enterprise Sales"). The sent turn is **`Ask: {"skill":"posting","text":…}`** (`encodeAsk`), so it
starts a posting whatever its words, always as the from-scratch opener, and the bubble shows the
sentence under "Create Job". A base job copies the title,
the city and `requiredSkillsFor` and asks for the rest, since a posting in `lib/jobs.ts` carries
no experience, pay or work mode. From scratch opens on one plain ask for title, location, years,
industry and skills, with a **checklist bar in the composer** (`openerChecks`) ticking as they
are typed — read by the rules at keystroke speed, never the model, and it leaves skills out
because a regex cannot tell a skill from a phrase. Then the six posting fields
(`lib/job-intake.ts`), then **refinement** (`lib/job-refine.ts`): up to four of nine topics
(industry, adjacent titles, scale, institutes, relocation, exclusions…) chosen by `planFor` and
dropped when an answer already covered them. Refinement fills a private **hiring brief** that is
never posted — it becomes Search Resume's filters and criteria (`searchHrefFor`), which is what
the finish card links to.

**The skills are asked once, as a ranking** (`RankedSkills` in `components/agent-questionnaire.tsx`,
`readRanked` / `encodeRanked` in `lib/job-intake.ts`): one ordered list with a line through it,
must-haves above and good-to-haves below, reordered by drag or arrows, with "Add a skill" for your
own. The order is the order the search weighs them in. It replaced ticking the skills and then being
asked which were must-haves; refinement's `skillsSplit` now only appears when the skills came from a
JD or the opener and were never ranked (`state.ranked`), and draws the same list. The card's answer is
words — "Must have: A, B · Good to have: C" — read by the page, not the model, like the institutes.

**The posting conversation has seven layouts, picked on /settings** ("Post a job",
`usePostingVariant` in `lib/posting-variant.ts`): **Chat with rail** (the default), **Chat with rail
v2** (the same, with the Plan lifted out of the rail and drawn across the top of the page by
`PlanBar` in `posting-rail.tsx`, inside the chat column rather than across the rail — five equal
segments with a rule between, an icon tile (`icon` on `RailStep`, a tick badge on its corner once done, a spinner
while reading) beside "Step N" over the name (the detail stays in the rail), the current one
underlined in the brand; **sized by its words** — equal shares, a segment stretching only
if its label needs more and never shrinking below it, so the bar fits wherever the four names fit
and scrolls sideways (snap, no scrollbar drawn) only where they do not, the current step scrolled
into view as it changes; the rail
takes `plan={false}`; and **the questionnaire cards are part of the transcript** — drawn at the end
of the reply that asks them, `inlineCards` in `agent.tsx`, the box below staying a plain reply box —
where the other layouts dock them in the composer's place; a pencil's change card still docks), **Form beside chat**, and **Chat, then
form** — the rail while the chat is asking, and the form beside the chat
once `posting.stage === "done"`, so "Review and post" brings the form in rather than bouncing to
`/jobs/new`; that one is the recommendation, kept as a third option so all three compare. Under the
form layouts, while a posting is being gathered (or, under the hybrid, once it has), the post-a-job form (`components/job-form.tsx`, the same
controlled form `/jobs/new` draws, its values and readers in `lib/job-form.ts`) takes the rail's
place on the left and the chat becomes a 26rem column on the right; the rail's count sits at the
foot of the form column, and the finish card's posting block is dropped from replies there because
the form is the posting. `components/posting-form-panel.tsx` keeps the two in step **both ways**:
a new reading writes the six chat-known fields into the form (derived during render, like the
database's search box), and a hand edit to one of them, once done with (`onCommit` — a blur, a
picker change), goes back as the same `Change:` turn the rail's pencil sends. The other fields are
the form's alone. A chat-known field cannot be emptied from the form — nothing is sent, and the next
reading puts the chat's value back. Below `@3xl/main` the chat is the page, as under the rail.
**Beside the form the chat is a panel, after Hiremate's assistant** (`hiremate-dev-handoff.vercel.app/assistant`,
read 29 Sep 2026): white and lifted by a shadow rather than ruled off, a header with the Aura, a
name and the rail's status line, a hide button (a corner pill brings it back), replies as plain
text rather than bubbles, and — once the posting is gathered — **`PostingStatusCard`** docked
where the questionnaire goes: "Your posting is ready" or "Almost there" with the form's still-needed
fields as chips (`stillNeeded` in `lib/job-form.ts`, reported up by the panel's `onStatus`), and a
Post button disabled until the form is whole. Every docked card carries `DOCKED_CARD`
(`lib/docked.ts`), a brand hairline along its top.

**"Chat alt" is the posting as an onboarding, not a chat** (`wizard` in `lib/posting-variant.ts`;
`components/posting-wizard.tsx`, its model in `lib/posting-wizard.ts`). Two panes: the left asks
ONE question at a time — the prompt large, the options as the questionnaire's own rows
(`AgentQuestionnaire frame="page"`: no card chrome, no close, a bigger title, and **the way forward
always visible** — Next, or Save on a change, in a row under the choices beside Skip and the
caller's `footer` (the wizard's Cancel), disabled until the question has an answer because pressed
empty it would send a skip; a single answer still advances on its own when picked) and "Worth knowing"
under it — **no chat box under the page**: every question is answered from its rows or its
"Something else", and only the two that are free text by nature, the opening sentence and the JD,
carry a box, as the question's own answer field. **A white top bar runs over both panes** —
the back arrow (icon only), "Post a job", and the "Question N of M" count — because the Dashboard
draws no bar of its own from `md` up and an onboarding is a place you are in rather than a page
you are on. Under it the question pane opens on the step as a title with its icon and "Step N of
4", then a progress bar of **one segment per step**, each filling as that step's questions are
answered (the review segment fills when everything before it has) — so it says how far through
this step and how far through the whole, and it is full at "All answered". **Back** re-asks the
previous answered question with its answer filled in, the tracker's own click on that step; it
undoes nothing, Save sends a change over the earlier turn, and it is disabled on the first question
because the start choice cannot be re-asked — and the right is a **tracker of every question
under the four steps**, done with its answer, current, skipped, or still to come with the question
it will ask. **It is the same conversation as the other layouts**: the current question is the
first item of the card the chat would have docked (`docked.items[0]`), submitted alone as an
`Answers:` turn, which works because both readers take partial answers — the next card is simply
the rest. Clicking a done step is the rail's pencil (the same change card, `Change:` turn, drawn in
the question's place). Switch variant mid-way and nothing is lost. **The tracker lists questions
that have not been asked yet**: the open posting fields, and — until refinement makes its plan —
the refinement topics the rules would pick for this draft (`planFor`, less `coveredTopics`),
tagged "Likely" because Gemini may choose differently; the count moves when the real plan lands
(13 became 15 in one run). The skills split is not listed under Selection criteria, since the
ranking under Candidate details already answers it. **"Worth knowing" is the page's own data, never
invented** (`insightsFor`): `/insights`' pay percentiles under Pay (with the chosen city's median),
its city shares under Location, its demand curve under Experience, the share of profiles outside
the city under Relocation, the live roster under the title — and nothing under a question none of
it bears on. `askingNow` is which question the pane is on; `wizardProgress` the "Question N of M".
Below `@3xl/main` the tracker leaves the side and the question pane is the page: forward is
answering (a single-answer row advances on its own, a pick-many has Continue, Skip is in the
"Something else" row), backward is the labelled **Back** in the header, and the "Question N of M"
count becomes a button that opens the same tracker as a bottom **Drawer**, where tapping an answer
closes it and asks that question. One guard went into the
Gemini reader for it: **a card can only skip what it asked** — shown one question, the model
reported the fields it was not shown as skipped, so `reply.skipped` is filtered to the answered
keys.

**"Chat v2.5" is Chat with rail v2 with a JD step between the posting and the selection criteria**
(`rail25` in `lib/posting-variant.ts`; the step is `stage: "jd"` in `lib/job-refine.ts`, switched on
by `answersFor`'s `jd` option and `IntakeState.jdStep`, so every other layout reads as before). Once
the six posting fields are in, `enterRefine` detours ONCE to "Do you have a JD for this role?"
(`jdItem`; skipped with Selection criteria off, or when the posting started from a JD), and the
choice is a button the page reads. **Pasting or attaching one** reads it twice at once: the intake
reader fills the brief's fixed slots and the posting's EMPTY fields (an answer always wins over the
JD), and `/api/jd` returns what fits no slot — the must-have and good-to-have lines ("Must have
handled USFDA audits"), which become `HiringBrief.requirements`, ranked as `crit` lines and removing
nobody. The rules stand in with `requirementsIn` (`lib/jd-read.ts`: by the section a line sits in, or
its own words; duties, soft skills and years-led lines left out). Refinement then asks only what the
JD did not cover. **Drafting one** asks `/api/probe` for at most four questions — the open
refinement topics that matter most for the role, plus custom ones (`Probe`, on the same card,
`probe-N` ids, their labels in the answer bubble) steered towards what JDs leave out: notice period,
non-negotiables, P&L and business size, markets, company type, certifications, reporting line.
Their answers are criterion lines ("Annual marketing budget: ₹50–100 Cr") and the "What we're
looking for" section of the JD drafted at the end (`descriptionFor`, the rules' `describePosting`
plus those lines). Probing replaces refinement on that road, so the question count stays the same;
with the server down it is refinement as ever. The JD — theirs or drafted — reaches the form as
`?jd=`.

The step was shaped by reading 37 live iimjobs JDs (5 Oct 2026): duties are generic, the "must
have" block is the signal, salary was hidden on 31, notice period was never mentioned — and real
JDs carry things that cannot be screened on. **Everything read out of a JD is checked**: `jdLines`
refuses protected lines (the model's `declined` too), and `postable` takes them, and any contact
details, out of the JD before it is posted — cleaned where it is used, so a cached reading is posted
under today's rules. `protectedIn` gained "where someone is from" ("originating from Punjab or
with family connections to the region") and an age band hidden in a years line ("typically 40–50
years"). **Diversity hiring is not screening**: "women candidates preferred", "only diversity
candidates", a retired colonel map (`diversityIn`) onto the posting form's own Diversity hiring
options (`DIVERSITY` in `lib/job-form.ts`, now shared) as `?div=`, and are not refused. That holds
for the JD step only; elsewhere a typed gender preference is still refused.

**"Chat v2.7" is Chat v2.5 that makes progress felt** (`rail27` in `lib/posting-variant.ts`; it
reads exactly as `rail25`, JD step and all). **Which steps finished on which turn is derived, not
stored**: `milestonesFor` in `lib/step-milestones.ts` steps through `answersFor`'s `states` with
`railSteps` (split out of `railFor` in `lib/posting-rail.ts`, because `railFor` also counts the
pool and is far too heavy per turn), and a step done or skipped after a turn but not before it
finished there. That gives the **milestone** in the transcript, between the answer and the reply:
a rule across the chat with "✓ Step 1/4 done · Job details" in a brand-tinted pill at its middle,
the recap under it ("Product Manager · Pune · ₹30–40L · Hybrid") and "Next: Step 2/4 · Candidate
details" — it comes back on a reload. Each question card names its step too ("Step 2/4 · Candidate
details" over the question, `step` on `AgentQuestionnaire`, from the plan bar's active step). **The
plan bar is a meter** (`meter` on `PlanBar`): its bottom border and the current step's underline
give way to a progress bar along its bottom edge, a section per step — full when done, the current
one part-filled by its own questions answered (`progress` on `RailStep`, from `railSteps`), empty
to come — whose width transitions as answers land. Sections, not one bar, because the steps are
sized by their labels and a single bar's quarters would not sit under them. **The cheer is live only**: when a turn asked in this visit lands
while the tab is visible and finished a step, it chimes (`play("step")`, `"done"` for the last)
instead of the reply's pop, the plan bar's tick pops, its segment flashes the brand tint, the next
step's tile pulses while the meter fills (`cheer` on `PlanBar`, Web Animations), the chat's milestone pill
pops in, and confetti bursts from the pill's tick — where the recruiter is looking; from the plan
bar's tick only if the pill is off screen (`lib/confetti.ts`) — **at every step, and a second, bigger burst for the last**, as the
design team asked. The confetti is hand-written rather than `canvas-confetti`, because `npm
install` can strip rolldown's bindings from the lockfile; its colours are read from `--primary`
(plus a lighter mix) and two chart neutrals at the moment of the burst. The two chimes are
synthesised with Web Audio until a `step.mp3` / `done.mp3` from the same Pixabay set is dropped
into `assets/sounds/`, which takes over with no code change. Reduced motion: no confetti and no
animation; the milestone line still says it.

**Every answer gets a work card in v2.7, inline where "Reading your answer…" was**
(`AgentWorkCard` in `components/agent-work.tsx`, built by `workFor` in `lib/step-milestones.ts`):
a dark "Step 2/4 · Candidate details" pill — the step the answer was FOR, read off the state
before it — and a checklist that runs waiting → spinner → tick: Reading your answer (who read it
and how long it took), Updating the posting (the fields it recorded), Checking who this would find
(the rail's count, once the answer is in, on the newest turn only — counting the pool per turn is
too heavy), Choosing what to ask next (the next question's own words). **What it says is never
staged; the PACE is**: the first task holds until the answer is in and at least `READ_MS` (1s) has
passed, each after takes `TASK_MS` (0.65s), and only then does the reply, the milestone, the
question card and the cheer appear (`held` in `routes/agent.tsx` gates `landed` and `docked`).
Live only on the newest turn asked in this visit (`liveTurn`, set in `ask`); done, it folds to one
line ("Step 2/4 · Candidate details · 4 done · Read by Gemini in 3.6s ›") that opens back into the
checklist. A turn opened cold and still being read keeps the plain marker, because a folded "done"
would be a claim before the fact. Pencil changes are answers too, so they get a card.

**"Chat v3" is Chat with rail v2 with the AI Agent's best ideas, on our own conversation**
(`rail3` in `lib/posting-variant.ts`; logic in `lib/chat-v3.ts`, drawing in `components/chat-v3/`).
Same turns, same Gemini readers with rules fallback, same `PlanBar` and inline cards; what it adds is
switched on by `answersFor`'s `suggest` option, which only v3 passes, so every other layout reads
exactly as before.
- **The agent fills what the pool can tell it** (`withSuggestions`): once the title is known, empty
  years, pay, city and skills are filled from the people a search for that title finds — the middle
  third of their years, the middle third of what the ones inside those years expect, where most of
  them are, and `skillsForTitle` ranked by `rankFor`. **Derived in the fold, never a turn**, so it
  replays. Because the readers never overwrite a filled field, **the suggested values are taken back
  out before every reading** (`withoutSuggestions`) and refilled after, so an answer can still set
  them. The middle half was tried first and read "8–15 years, ₹75L–1.26Cr" on a senior pool.
- **Every value says where it came from** (`provenanceFor`, over the `states` array `answersFor` now
  returns — the posting state after each turn): From your brief / JD / job, You answered, Edited by
  you, From the hiring manager, Suggested, Needs input — under the value on the rail.
- **Locks are `Lock: {…}` turns**, honoured centrally in `withSuggestions`: whichever reader ran, a
  locked field gets its old value back and the reply says so. Gemini does take corrections, which is
  what a lock is for.
- **Must have narrows, Good to have ranks**, because in `searchHrefFor` skills are `crit` lines and
  never filters. The Must have row is the posting's filters (city, years, industry, team, companies,
  pay ceiling), each with the people relaxing it would bring back (`requirementsOf`, counted with
  `poolCount`, which projects exactly as the rail's count does — `projected` / `postingSearch` in
  `lib/posting-rail.ts`). **A filter made a good-to-have is `HiringBrief.relaxed`**, set by a
  `Filter: {…}` turn, which `searchHrefFor` writes as a ranking line instead of a param. Skills move
  between key and nice through the ranked `Change:` turn and say plainly that they remove nobody. The
  last move is said with the pool before and after and an Undo (the inverse turn, `lastMoveOf`), and
  under `THIN_POOL` the guardrail offers the single relax that recovers the most people.
- **Every layout recognises `Lock:` and `Filter:` turns and only v3 applies them** — a conversation
  opened under another layout skips them rather than sending them to Gemini as answers, which it did
  until that was fixed.
- **Insights carry an Apply** (`nudgesFor`): the next city by `/insights`' share, raising pay to the
  market's middle when it is below it, and widening years with the pool's own count. Each is a
  `Change:` turn; none on a locked field.
- **Candidates** is a third rail view: the top three from `toReview` over the posting's own search,
  drawn with the search flow's `PersonCard`, "Meets N of M key skills"; the finish card's "See who
  this finds" opens it.
- **The hiring manager's note** (`components/chat-v3/note.tsx`) appears at Selection criteria:
  recorded (Gemini transcribes, the browser's recogniser otherwise) or typed, read back in a box, then
  sent as a `Note: …` turn and read by the existing readers — Gemini's schema already reads posting
  fields and the brief from any free text, so it needed no reader of its own. Undo drops the turn
  while it is the newest.
- **The status panel** at the top of the rail: Needs you, Recent (`changesFor`), Working on next; an
  activity log of every reading at the foot.

**"AI Agent (V2.3)" is a peer's prototype, ported whole rather than built on this conversation**
(`agent` in `lib/posting-variant.ts`; `components/ai-agent/`, its logic in `lib/ai-agent/`). It came
as a self-unpacking single HTML file in another design system: one class component with about 150
state keys and a template runtime. It is rebuilt here in this system's components and tokens, but
**its logic and data are its own**: four canned roles (`detectRole` — sales, HR, marketing,
product), its own pools, companies, colleges and "calculus" insights in `lib/ai-agent/data.ts`, no
Gemini, no turns, no Search Resume. The flow is a brief, five steps the agent fills in with a staged
"thinking" reveal (Role details, Job description, Screening questions, Targeting, Candidates) beside
the agent's own column (380px, flush and white like the app's other rails, scrolling on its own; a
Drawer below `@5xl/main`) — the steps as one band across the top and the footer docked under the
column, neither of which scrolls, so the band, the footer and the agent's column are the only places
progress is said; fields show their lock only on hover or focus (always when locked, always on touch) —
then Review, "Choose how your agents source" and
done. **The controller is the class, kept line for line**: `AgentController` in `controller.ts`
extends `Store` (`store.ts`), a `state` / `setState` / timers class read through
`useSyncExternalStore`, because rewriting forty methods that chain timers and re-read `this.state`
as reducer actions would have meant re-deriving each one. The prototype's 3,900-line render
function is split into typed derivations per screen (`view.ts`, `targeting.ts`, `finish.ts`), each a
function of the controller and its state; the components only draw them. `poolFor` reads the
must/good buckets as module state, as it did there, so `syncBuckets()` runs before every render.
**Progress is per session id in this browser's `localStorage`** (`agent:ai-agent:<id>`,
`persist.ts`); a reload settles whatever was mid-animation, and a shared link opens on its owner's
browser state, not the recipient's. A sentence that describes a role (`describesRole`) arrives as
the brief, already typed. The top bar keeps the prototype's two prototype controls (Paid / Free,
Auto-advance) behind a dashed "V2.3.1 · AI AGENT" menu, and "Classic form" opens `/jobs/new`. Its
data is management hiring, iimjobs' domain; on hirist only the product name changes, which is the
prototype's scope, not a fork. **Two traps it has.** The Targeting step's sticky slim bar measures
against the flow's own scrolling column, not the document, and uses a scroll listener, since an
IntersectionObserver only reports a crossing and a jump past the line skips it. **Its purple AI
accent is gone, on purpose**: an `--ai` token set was tried and pulled, so the agent's tiles, the
must-have chips and the recommended offer take `--primary`, its lilac surfaces take `--muted`, and
its purple buttons are the default and outline `Button`. The source chips (`SOURCE_TAG` in
`components/ai-agent/shared.ts`) tell sources apart by fill and outline instead of hue: yours in the
brand tint, the agent's suggestion a plain outline, a data recommendation outlined in the brand.

**Questions are asked as a questionnaire docked in the composer's place**, the way Claude asks in
plan mode (`components/agent-questionnaire.tsx`, over `@shadcn/react/questionnaire` in
`packages/ui`). Number keys pick, not letters, because bare **A** and **D** are global
shortcuts. The reply box stays under the card, so typing instead of picking always works.

**Gemini reads the answers; the page decides what they mean.** `advanceWithAi`
(`lib/job-intake-ai.ts`) sends the turn to `/api/intake` with a `responseSchema` in which every
key is required (an optional key was simply left out), then coerces and validates every field
against the page's own vocabularies, and falls back to the rules readers (`advance`) on any
failure or a 25s timeout. Each reply says which reader produced it. Start choices, skips and
"post now" never go to the model — they are buttons. Readings are cached in sessionStorage
(`agent:intake-readings:v5`, keyed by brand and the turns) so a re-render does not re-ask, and
**only Gemini's readings are cached** — a cached rules fallback outlived the key being added.

**Protected traits are refused, by both readers.** An answer asking to screen on age, gender,
family status, religion or caste and the like is not recorded: `protectedIn` catches it for the
rules, the schema's `declined` field for Gemini, and `refusalFor` says so in the reply.

**The posting has four steps, named for what a recruiter tells apart** (`railFor` in
`lib/posting-rail.ts`): **Job details** (title, location, pay, work mode), **Candidate details** (experience, skills — "on the posting"), **Selection criteria** (the private brief;
the name is Search Resume's own `crit`, which is what the brief becomes, **with the screening
questions as its optional tail**) and **Review and post**. The chat gathers the first three; the
last is the form's and is never ticked in the chat. **Screening is internally a stage of its own**
(`stage: "screen"`, between refine and done — asked after the refinement answers so the proposals
can use them — but drawn as part of step 3 on the bar, the rail and the finish card):
`screeningFor` in `job-refine.ts` proposes questions from what the chat knows — one per must-have
skill, the years, the city (and whether a move would do), the team, the industry, notice period,
expected pay — as ticks on one card (`screeningItem`), with "Something else" for the recruiter's
own; the answer is one question per line (`AskedItem.separator`, since a question can hold a comma)
and is read by the page (`readScreening`), never the model. Skip and "post it now" mean none. The
questions live on the draft (`PostingDraft.screening`, `?sq=` to the form, the form's `questions`
list, a numbered list on the rail with a pencil and on the finish card), and a hand edit on the form
comes back as a `Change:` turn — the one chat-known field a form edit can empty. The six
posting fields are asked **in the stepper's two groups** — `JOB_FIELDS` then `REQUIREMENT_FIELDS`
in `job-intake.ts`, pay before experience because it belongs to the job — and the rail, the finish
card and the form panel use the same three section names, one name per thing.

**Selection criteria can be switched off, on /settings** ("Selection criteria", beside "Post a
job"; `useSelectionCriteria` in `lib/selection-criteria.ts`, on by default), and it applies to all
five layouts because they read one conversation state. The flag rides on `IntakeState.criteria`
(set by `startIntake`, passed in through `answersFor`'s options; absent reads as on, via
`criteriaOn`, so readings cached before the flag existed still work), and **`enterRefine` is the
one place that honours it**: both readers enter refinement there, so off means an empty plan and
straight to the screening stage. Everything else only draws less: `briefRows` returns nothing, so
the rail, the finish card, the form panel and the Chat alt tracker lose the brief, and
`searchHrefFor` searches on the posting alone, which drops even an industry the opening sentence
named. **Screening questions stay, as a step of their own**: step 3 is "Screening questions", not
private, with its own icon, on the rail, the `PlanBar`, the tracker and the finish card, and the
screen-stage lead says "That's the posting." Industries still reach the form's own Industry field,
which is a public posting field. A JD's skills are all must-haves when off, since `skillsSplit` was
a refinement topic. The readings cache key gains a marker only when off, so a toggle re-reads
rather than replaying a reading made under the other setting. **The setting is not a turn**, so a
toggle re-reads existing conversations: switching on re-opens the refinement card at the end of a
finished one, and switching off turns earlier refinement answers into hidden changes.

**The Dashboard's conversation is set on one type scale**: 12px for labels, eyebrows and chips
(`text-xs`, `leading-5` in rows), 14px for body — `leading-relaxed` only for running prose in a
bubble or a description, `leading-5` for rows, lists and the bar — 14px semibold for section and
card headings (sentence case; the finish card's uppercase eyebrows are gone), 16px for a
questionnaire's prompt, 24px for the count. The bubbles' "Got it." rows and the recruiter's answer
rows use the same label/value pair as the rail's `Rows` and the finish card's.

**The rail has two views, switched at its top** (no Aura or status line up there any more): **Details** (the record — a card per section,
each headed by its step's icon and a status chip, done / its count / next, with the rows, the
chips, the brief and pencils inside) and **Preview** — the list card, then the page it opens to: **the page** (`components/posting-page.tsx`: the posting opened as
the iimjobs candidate app draws it — chrome, logo, title, "yrs · cities · Not posted yet", the
drafted description behind "Read full description", "Who you'll hear from" with the signed-in
recruiter, an inert Apply; the app's compare banner and Similar roles left out) and **the card** (`components/posting-card.tsx`: CleoDS's job
card, from the Figma Dev Mode MCP at `127.0.0.1:3845` on node 5263:3766 — a 60×60 logo tile with
16px corners, a semibold title, a "yrs · cities" line, on a 20px-radius card lifted by
`elevation/2` (0 20 40 at 4% black, written out since the system has no elevation token); the logo tile stands empty because the chat never asks for a company, and a
field not yet gathered is left out; a third, fainter line reads "Not posted yet" where the
app's list puts the posting date). The count section shows under both. Which view
is local state, not a link.

**The stage rail beside the chat** (`lib/posting-rail.ts`, `components/posting-rail.tsx`, at
`@3xl/main`, 375px wide — a phone's width, so the job card reads at the size a candidate sees) shows the stages as a stepper (tick, ring, empty ring, joined by a line — no
strikethrough, which read as "cancelled"), the posting and the brief as **labelled rows** (a dash
where an answer is still owed; the brief's rows are `briefRows`, the same the finish card prints),
skills as chips (a set, not a fact), **a pencil on every row that asks that question again** — the
same questionnaire card, docked in the composer's place with the current answer ticked, and Save
sends a **`Change: {json}` turn** (`encodeChange`, beside `Answers:`), which `applyChange` in
`lib/job-refine.ts` reads with that field's own reader and writes OVER the draft. It is its own
turn kind because an answer never overwrites (that is what lets a first sentence set the city), it
never goes to the model, it works at any stage including after "That's everything" (the loop in
`answersFor` revives the last posting state for it), and a reload replays it — and **"N people this
would find"**, counted by `poolFor` over the very search the finish card opens and then **projected
onto the database** (`DATABASE` per brand — 40 lakh iimjobs, 35 lakh hirist, from their own
public figures; one dealt person stands for `DATABASE / SAMPLE`, about 250), rounded to two
figures. **So it no longer matches Search Resume**, which
still counts its dealt sample — a deliberate rail-only call; scaling Search Resume's own counts is
how to make them agree again. Each reply also carries a work step — which reader read it, how long it
took (measured around the call, not a staged delay) and what it recorded — collapsed in a
`<details>`.

**Search Resume is the Agent's second skill, and it is rules only** (`lib/search-intake.ts`,
no model, no `/api` call). A sentence that starts a search ("find product managers in Pune with
8+ years in FMCG" — `startsSearch`, or the Search people pill) opens it, and the turns fold into a
`SearchState` beside the posting's, under `flow: "search"` in `answersFor`. Four stages, drawn as
the same rail and the same `PlanBar` as a posting (`searchRailFor`, `kind: "search"`):
**Requirement** (the sentence, read by `requirementOf` — "find" stripped, plurals singularised),
**Search criteria** (one questionnaire card with what the sentence left open, from `lib/intake.ts`'s
`QUESTIONS`; every answer is a filter, and "Skip these, find people now" is the way past all of
them), **Calibrate** (optional: the three the search ranks first, each with its evidence lines, a
thumb up or down per person, and Done re-orders the criteria by `recalibrate` — the reply says what
moved, or that nothing did) and **Open the search**, a finish card whose link is `searchHrefFor`.
Pencils on the rail's rows send the same `Change:` turn a posting's do, read by `advanceSearch`'s
change branch; a change after calibration clears its order and the reply says so.

**The sentence's industry is a filter, not just a fact about the results.** `searchParamsFor`
writes it as `ind` from the chip, because the industry question is not asked again when the
sentence named one and an answer to it would have written that key. City and years are not
written, since the pool already conforms to them (`resultsFor`). Skills are criteria, never
filters — they order, they remove nobody.

**Calibration is skipped, and says so, when it could do nothing** (`onward`): with no criteria at
all (no skill, no industry) there is nothing to re-order, and with filters that leave nobody
there is nobody to show. Both go straight to done with a `heard` line; the rail's Calibrate step
is `skipped` (a minus, muted — the fourth `RailStep` state) rather than ticked. **A finish card
for a search with fewer than three people carries "Ways to widen it"**: `searchWidenings`, the
brief page's step widenings (`widenings` in `lib/calibration.ts`) PLUS dropping each answered
filter outright, each counted against the real pool and each a link to the search with that one
change. The step alone is not enough — eight-year product managers here start at ₹40L, so "up to
₹25L" widened to ₹35L still finds nobody, and "Any pay +39" is the honest offer. The rail's
Preview tab is the same three people as the calibration card (`model.preview`), with the total
under them; before the role is named it says so, and `[]` after means the filters left nobody.

**The mic records and Gemini transcribes, when the AI server is up** (`startRecording` in
`lib/dictation.ts` → `/api/transcribe` → `gemini-3.5-transcribe` on the Interactions API, with a
custom vocabulary of the conversation's role, skills and cities plus "lakh", "LPA", "CTC").
Otherwise it falls back to the browser's `SpeechRecognition` (Chrome and Edge), and it falls back
the same way when recording cannot start. **The Interactions API returns the text in
`steps[].content[].text`, not `output_text`** as its docs show, and silence is an empty string
rather than an error. A page with mic permission can still get a dead track when the *app*
running it lacks the macOS microphone permission; `startRecording` checks the track first so
the message says where to look.

**`/jobs/new` is the same posting as a form** (`routes/new-job.tsx`), linked from every question
in the chat for anyone who would rather fill it in; `postingHref` / `draftFrom` carry the draft
so far into it through the query string (plus the brief's industries as `ind`), so leaving
half-way loses nothing. Posting only shows a toast. **It mirrors the live iimjobs post-job form**
(`beta-recruiter.iimjobs.com/post-job`, read 28 Sep 2026): a Pro / Basic job type with a Pro + Boost
switch, then Basic Details (title, up to 3 locations, experience, skills with title suggestions,
JD, format toggle, video JD, up to 5 industries, category and functional area with a suggestion
from `functionForTitle`, salary in lakhs or crores, hide salary, graduating year, course type) and
Additional Details (screening questions, video/audio profile, redirect URL, diversity hiring,
company and hiding it, LinkedIn share), with the live labels, required marks and limits. Basic is
the same form with the Pro-only fields held back; switching trims to what Basic holds instead of
discarding the draft as the live form does. The chat's facts with no field there fold in: good-to-have
skills join the one skills list, remote becomes "Work from Home", team and relocation stay in the
drafted description. The JD upload reads PDF/Word/text, "Generate JD with AI" is `describePosting`
(rules, no model), and the screening dialog was never seen, so a question is only its wording.
Every link from the chat into the form also carries the chat's own URL as `?chat=` (`withChat`),
and the form then offers **Back to the chat** to that exact conversation instead of "Talk it
through instead" (a fresh one). `chatFrom` honours only a `/dashboard` (or old `/agent`) URL, so it is not a redirect.

**Sounds are six short clips, played only in answer to something the recruiter did**
(`play()` in `lib/sound.ts`; files in `apps/web/src/assets/sounds/` as `pop`, `tick`, `dismiss`,
`undo`, `mic-on`, `mic-off`). All from SoundShelfStudio's UI set on Pixabay, one family on purpose,
under the Pixabay Content License (no attribution; do not redistribute them standalone). Wired so
far: the Agent's reply lands (`pop`, only for a question asked in this visit and only while the tab
is visible — a reloaded link is silent), the mic on and off (from the mic's state, so the time
limit sounds too), and response-manager decisions (`tick` to keep somebody, `dismiss` for Not a fit,
`undo` from the toast, one sound per batch). **Errors are silent.** Files are found with
`import.meta.glob`, so a missing one is silence rather than a broken build. The "Sounds" switch on
/settings is on by default. **Pixabay's CDN refuses scripted downloads (403)** — files come from
the page's Download button, then get trimmed of trailing silence with ffmpeg.

**Transient confirmations are toasts, mounted once** — `AppToaster` in
`components/app-toaster.tsx`, inside `AppShell`. The response manager's undo is the one so far:
`toast.add({ title, data, actionProps })`, six seconds, and `toast.close(id)` inside the handler
reads as using `id` before it exists but cannot fire until `add` has returned. The manager is
module-level, so `toast.add()` works from any component without a hook threaded through.

**A toast carries faces, where the stock component puts a type icon.** `data.faces` is up to three
`{ name, photo }`, drawn as an `AvatarGroup`: a decision takes the card off the screen, so by the
time the toast arrives the only trace of the person is their name in a sentence, and a hundred rows
all move to Shortlisted alike. Past three the count in the sentence does the work. The viewport is
`sm:max-w-md` rather than the stock `max-w-sm` because the face takes the width the sentence was
using, and a one-line message wrapping to two reads as a paragraph.

It is **composed from the parts rather than using the shipped `Toaster`**, because where a toast
sits is the app's problem and not the design system's. It keeps the stock bottom-right corner and
changes one thing: it **moves aside for Athena** by `--athena-width`, the trick the message dock
used before it became a page. It spent a while lifted to `bottom-24` to keep clear of the selection
bar, which owns the very bottom and can be up at the same time; that bought a rare collision (they
only meet under about 1300px of window, the bar being centred and this being right-aligned) at the
cost of 96px of air under every toast. If it ever bites, lift it when something is ticked rather
than lifting it always.

**The viewport is NOT portalled, and that is load-bearing.** The shell's dimensions are inline CSS
variables on `SidebarProvider`, so a viewport on `document.body` cannot see `--athena-width`: the
shift resolved against nothing and threw the toast into the far left of the window. Rendered in
place it inherits them, and `fixed` still positions against the viewport because nothing above it
is transformed. Anything else that wants a shell dimension from inside a portal has the same
problem.

**MESSAGES IS A PAGE, NOT A DOCK IN THE CORNER.** It was a launcher and a 26rem floating panel
pinned bottom-right until that corner stopped being free — Athena took the column beside it and the
launcher had to dodge her by `--athena-width` — and until it was clear a conversation you are about
to reply to wants the room a document gets. `/messages` is two columns above `@3xl/main` (threads
beside the open one) and one below, where the thread's back arrow returns to the list; the open
thread is **`?thread=`**, so a conversation is a link like everything else here. `openThread` on the
provider navigates there and marks read, which is why the provider no longer holds an `open` or an
`activeId` — there is nothing to open, only somewhere to go. `components/message-thread.tsx` holds
`ThreadList` and `Thread` (it was `message-dock.tsx`); `photoOf` moved to `lib/messages.ts` because
a file that exports components cannot also export a function under
`react-refresh/only-export-components`.

Nav lives in `src/lib/nav.ts`, not in the sidebar component: `SiteHeader` needs it for the page
title, and `react-refresh/only-export-components` is on in `apps/web`. `NAV_ITEMS` renders through
`NavMain`, `SECONDARY_ITEMS` through `NavSecondary`. Every routed item is its own component
(`NavMenuItem`, `SecondaryLinkItem`) because active state comes from `useMatch`, which can't be
called in a loop body — and it's why `NavSecondary` splits link and button variants rather than
branching inside one component.

**The theme toggle lives on `/settings`**, leaving the top bar as title only — the sidebar owns the
collapse trigger, beside the wordmark. That was a deliberate call against keeping controls in the
header for side-by-side comparison; the bare `d` keypress bound in `ThemeSync` is the only
global way to change theme.

**Brand is different, because it is a product and not a preference.** `ProductSwitcher` sits in the
sidebar header — the wordmark, pressable, opening the list of products — and `?brand=hirist` in the
URL picks one, so a review link can show a product the recipient has never opened. Without the
param the brand lives only in `localStorage`, which means a shared link opens on whatever the
*recipient* last picked. `BrandUrlSync` in `apps/web/src/components` keeps the two in step; it only
applies the param when the PARAM changes, because "follow the param whenever it disagrees with the
brand" is a loop that undoes every switch. `/settings` keeps a brand switcher too, but as a
token-layer control for design review rather than a way to move product.

The switcher is also the unification question made concrete, and reversible in the way this file
asks for: delete the component and they are two apps again, with no token, route or component
having taken a position.

## Deploying

A preview is on the internal **UED Launchpad** (`http://10.120.2.26:6001`, office network or VPN),
at `http://10.120.2.26:6100`. `.ued-launchpad.json` at the root holds the project id, port and the
commit last deployed — update that project rather than creating another. Its update key is in
`~/.config/ued-launchpad/keys/<id>`, never in the repo.

**It is one Docker container: the AI server serving the site too.** With `STATIC_DIR` set,
`apps/ai/src/server.ts` answers `/api/*` and serves the built `apps/web` (right types for `.mjs`,
`index.html` for app routes, a real 404 for a missing asset). One origin, so the page calls `/api`
on itself — no `VITE_AI_URL`, no `ALLOWED_ORIGINS`; the server always accepts the page it serves.
`GEMINI_API_KEY` is in the Launchpad project's environment, set from `apps/ai/.env.local` on the
user's say-so; a PATCH without `env` keeps it, and one with `env` replaces the whole environment.
Agent conversations (`/dashboard/c/<id>`) are kept in `/app/data/sessions.json` inside the container
(`SESSIONS_FILE`, set in the Dockerfile): a restart keeps them, a redeploy starts empty, and a
recruiter's own browser still has theirs either way.

**It deploys on push to `master`** through Launchpad's Gitea pipeline, from
`http://10.120.2.26:1000/iim-jobs/unified-recruitment-platform` — `origin` (there is no `main`;
`master` is the branch everything lands on). The repo moved there from `admin/` on 7 Oct 2026; the
old address 301-redirects, and the pipeline was re-pointed with `PUT …/pipeline` (same project,
same port, the saved Gitea token kept). A push is built from the repo by the **root `Dockerfile`**, a two-stage
build (`npm ci`, `npm run build -w web`, then the same `server/` + `public/` image as below), with
`.dockerignore` keeping every `.env*`, `node_modules`, zips and `avatar-kit/` out of the context.
Only a pushed commit deploys; a failed build keeps the previous site. Check what is live with
`GET /api/projects/{id}/pipeline` — `commit` is the last successful deploy, `lastBuild` the latest
attempt. Turning it off is `{ "enabled": false }` on the same endpoint, and a manual redeploy still
works. The pipeline's Gitea token is stored on the Launchpad server, never here.

The ZIP route below still works as a manual fallback, and `apps/ai/Dockerfile` is its Dockerfile.

**Build from the committed tree, not the working copy**, which usually holds WIP: a detached
`git worktree` in a scratch directory, `npm ci`, `npm run build -w web`, then a bundle of
`apps/ai/Dockerfile` at the root, `apps/ai` (no `.env*`) as `server/` and `apps/web/dist` as
`public/`. ZIP it, upload, PATCH the `uploadId`, deploy. It used to be a static build of `dist`
alone, which is why the old static server sent `.mjs` as `application/octet-stream` and broke
PDF reading there.

**The mic still does not work on the preview**: it is plain `http` on an IP, and Chrome allows
the microphone only on `https` or `localhost`.

## Authoring components

`cva` for variants + `cn()` for merging — `packages/ui/src/components/button.tsx` is the reference
shape (`data-slot`, `variant`/`size` groups, Base UI primitive).

These are **Base UI, not Radix**, which bites three times:
- Composition is a **`render` prop**, not `asChild`: `<Button render={<Link to="/x" />}>`.
- Roots often **don't self-provide** — `Tooltip` is a bare root, so its users need `TooltipProvider`.
- **Group parts assert on their context and THROW.** `DropdownMenuLabel` is `Menu.GroupLabel`; put
  it above a `DropdownMenuRadioGroup` instead of inside one and Base UI raises
  `MenuGroupContext is missing` — which takes the whole page white rather than rendering an
  unlabelled heading. Typecheck, lint and Vite all pass on it, so composition changes need the page
  actually opened.

Two layout traps worth knowing, both hit in this codebase:
- **`ring-*` is a box-shadow drawn OUTSIDE the border box**, so a ringed card filling a scroll
  container has its outline clipped on all four sides — `overflow-y-auto` clips both axes, not just
  the one named. One pixel of padding on the scroller fixes it.
- **A flex child of the shell wrapper is as tall as the DOCUMENT, not the viewport**, because the
  wrapper is `min-h-svh` and grows. Anything that needs to stay on screen wants `sticky` + a `svh`
  height (Athena's pane) or `fixed` + a spacer (the nav's own trick).

`react-refresh/only-export-components` is **off for `packages/ui/src/components/**` and
`src/**/*.stories.tsx`** (every shadcn component exports its `*Variants` alongside; stories export
`meta` and story objects). It stays on in `apps/web`, so a provider there that also exports its hook
carries a file-level `eslint-disable`.

## Adding shadcn components

```bash
npx shadcn@latest add <name> -c apps/web    # lands in packages/ui/src/components/
```

Style is `base-maia`, `baseColor: neutral`, CSS variables. Both `components.json` files point
`ui`/`hooks`/`lib`/`utils` at `@workspace/ui`; only `components` differs. (README says `pnpm dlx` —
this repo uses npm.)

**After every add, check four things** — the CLI has a monorepo blind spot:

1. **Hooks landed in `packages/ui/src/hooks/`.** A stray hook in `apps/web` is an unresolved import
   at runtime, not a type error.
2. **`globals.css` wasn't clobbered** — the CLI rewrites it to inject tokens. `git diff` it and
   confirm the brand layers survived.
3. **Whether it needs a root provider** in `main.tsx` (see Base UI note above).
4. **`cn` is imported from `@workspace/ui/lib/utils`, not a bare `"cn"`.** shadcn 4.21 writes
   `import { cn } from "cn"` and installs an npm package by that name into `packages/ui`. It has
   done this on **every** add so far — `kbd`, `empty`, `item`, then `drawer`, `popover`, `command`,
   `chart`, `combobox`, `toast` — so treat it as certain rather than possible. It also hits **registry dependencies you
   did not ask for**: `command` pulled `dialog` and `input-group`, and all three arrived with it.
   Grep the whole directory, not just the file you added:
   `grep -rn 'from "cn"' packages/ui/src/components/*.tsx`, fix each, then
   `npm uninstall cn -w @workspace/ui`.

If the CLI stalls on an "already exists, overwrite?" prompt (a dependency like `separator`), it is
waiting on stdin: `yes n | npx shadcn@latest add <name> -c apps/web` declines and continues.

**Local divergence:** `Checkbox` draws a filled bar for `indeterminate`. The stock indicator
drew the tick for that state too, so a half-ticked "Select all" read as all. `--overwrite` restores
the stock one. The Figma Checkbox has no indeterminate variant yet.

**Local divergence:** `packages/ui/src/hooks/use-mobile.ts` uses `useSyncExternalStore` instead of
the stock seed-`undefined`-then-assign-in-effect, which trips `react-hooks`' cascading-render rule
and misreports desktop on first paint. `--overwrite` restores the stock version and the lint failure.

## Storybook

Storybook 10 (`@storybook/react-vite`) lives in `packages/ui`, beside the components. Stories are
`src/components/<name>.stories.tsx` and import through the public entry point, so a story breaks if
the `exports` map does. `tags: ["autodocs"]` is global, so every story file gets a Docs page; the
component's documentation goes in `parameters.docs.description.component` (markdown).

The sidebar is five layers, in `storySort` order:

- **Overview** — MDX in `src/docs/` (introduction, component inventory).
- **Foundations** — `src/foundations/`: token swatches drawn live from the CSS variables.
- **Components** — the shadcn/ui components, regenerated by the CLI.
- **Patterns** — ours, extracted from the prototype once a shape repeated: `stat-card`,
  `section-header`, `list-card`, `meta`, `chip`. Also in `src/components/`, distinguished by title.
- **Compositions** — `src/compositions/`: recipes (the dashboard, a settings row, a posting form)
  built from the layers above, with mock data copied inline because `packages/ui` cannot import
  from the app. A composition repeated a third time becomes a Pattern.

**Athena and the selection bar are Compositions, not Patterns**, because each is drawn in one place.
`Compositions → Athena` has the pane (empty, and a thread across pages) and a story per reply card:
candidate rows, proposal, draft, comparison, evidence, expand pool, save to list, link rows.
`Compositions → Response manager` gained checkboxes, "Select all", the selection bar (one, three
and twelve people), its ⋯ menu drawn open, the batch undo bar and the bulk interview plan. The
overlays are drawn in place, not as live menus or modals, so a Docs page shows them without covering
itself. **Neither has a Figma frame yet.** The Figma mirror of Response manager predates selection,
and there is no Athena page.

The assembled app shell — sidebar, header and content column — is **not** in Compositions. It lives
in `sidebar.stories.tsx` as `Components/Sidebar → App shell`, `→ Collapsed to the icon rail` and
`→ App shell with Athena open`, because it is what the Sidebar component looks like in situ. Check there before adding a screen that shows the nav.

"Compositions → Dashboard" still draws the OLD Dashboard (aurora band, greeting, Smart Hire box),
which the app no longer has — see `DESIGN-SYNC.md`. The overview it shares with the new one lives
in `components/overview.tsx`: a change to a row's *shape* belongs in the pattern, a change to its
*content* in the app. Below the stat tiles, Live jobs and Recent searches share a row
(`@5xl/main:grid-cols-2`) and stack under it.

**Storybook and Figma are synced in batches, not per change.** When an app change affects a story
or a Figma frame, add an entry to `DESIGN-SYNC.md` at the repo root: the app file, the story, the
Figma node from `figma-map.json`, and a checkbox for each. Leave Storybook and Figma alone until
the batch is asked for, then remove the entries it completes.

`packages/ui/vite.config.ts` exists **only to serve Storybook** (Tailwind plugin + alias); the
package still ships as source. `.storybook/preview.tsx` carries three decorators that mirror the
app's providers rather than approximating them — `withThemeByClassName` for `light`/`dark`, one
writing `data-brand` from a **Brand** toolbar built from `BRANDS`, and a `TooltipProvider` (Base UI's
tooltip root does not self-provide). Adding a brand to `brands.ts` therefore updates the Storybook
toolbar and the app switcher at once.

Addons: `addon-docs`, `addon-a11y`, `addon-themes`, `addon-designs`. The last one renders a story's
Figma node in a side panel; it is parameter-driven, so it contributes no decorator of its own. Each
story declares its node with `design("<key>")` from `src/lib/figma.ts`, which resolves through
`figma-map.json` — never a hardcoded URL, because a rebuild in Figma changes the node id.

**Every addon is registered twice, and both halves are load-bearing.** `main.ts` turns an addon on —
its preset, and its panel in the manager. `preview.tsx`'s `addons: [addonDocs(), addonA11y(),
addonThemes(), addonDesigns()]` turns on the half that runs inside the preview: the parameters and
decorators the addon contributes to a story. Under `definePreview` (Storybook 10's CSF Next) that
half is **opt-in**, so an addon listed only in `main.ts` gets its panel and nothing behind it. The
array reads like a duplicate of `main.ts` and is not one; do not tidy it away.

**`addonDocs()` is what supplies `parameters.docs.renderer`.** Without it every Docs page — and
`tags: ["autodocs"]` is global, so every component has one — rendered **blank**, with
`baseDocsParameter.renderer is not a function` in the browser console and nothing at all in the
terminal. The stories beside them were fine, which is what made it read as a Storybook bug rather
than as configuration. Registering the addons here is also what makes each one's parameters
type-safe inside a story, which is what `design("<key>")` and
`parameters.docs.description.component` are written against.

## Figma — AthenaDS

The design system is mirrored into [AthenaDS](https://www.figma.com/design/dtzCyVUdopiY2n46tpvF8R/AthenaDS):
Primitives + Semantic + Radius variable collections, foundations documentation, and **38 components**
— every Component and every Pattern. Storybook's sidebar is mirrored as Figma pages, one per
component, **in Storybook's own order, not alphabetical order**, so the two read the same top to
bottom. Those differ: Storybook sorts `Input group` before `Input` and `Toggle group` before
`Toggle`. Take the order from `/index.json` rather than sorting the names yourself.

The file is **published as a library**, so its components can be instanced from other Figma files
rather than only used inside AthenaDS.

Overlay components (Select, DropdownMenu, Sheet, Tooltip, Sidebar) are built in their **open** state.
A closed dropdown is not designable, and Figma has no hover or focus, so where a treatment only
exists on `:focus` — a highlighted menu row, a select item — it is shown on one row so the treatment
is visible at all.

The **Compositions** layer is mirrored too — Candidate profile, Dashboard, Database, Insights, Post a
job form, Jobs list, Messages, Response manager and Settings row — assembled from instances rather
than redrawn, so a change to Input or Chip lands in the screens. A frame
cannot hold a description or `documentationLinks`, so each composition carries its Storybook URL as
an on-canvas caption instead.

**Icons are one component with a `name` property, on the Foundations `Icons` page** — 340 lucide
variants, so a glyph is swapped from the variant dropdown rather than detached and redrawn. It is a
Foundation and not a Component because lucide is a dependency the system *draws with*, like the
colour ramp, rather than something `packages/ui` authors; `Foundations → Icons` in Storybook mirrors
it, drawn live from `lucide-react` so the page cannot claim an icon the app cannot import.

**Generated from `node_modules`, never drawn.** The set is built by importing each icon's
`__iconNode` from `lucide-react/dist/esm/icons`, emitting SVG, and `createNodeFromSvg` — on lucide's
own 24 grid, then scaled to the 16px slot this library's controls use, with the stroke forced to
1.5 afterwards because scaling does not carry it. A dozen names are deprecated aliases that
re-export the canonical icon, so the node list has to be followed one hop. Redrawing one by hand is
drift, the way editing a variable in Figma is.

**The bridge plugin can `fetch` from `http://localhost:9226`–`9232`**, which is how the 57KB of path
data got in without being pasted through the tool call. Those ports are in the plugin manifest's
`allowedDomains`; bind the server dual-stack, because Figma resolves `localhost` to `::1` and an
IPv4-only bind just fails.

**There are no placeholder squares left in the file.** The ones named after their glyph were
matched by name; the ~37 named only `icon` were read off the app instead — `lib/nav.ts` for the nav,
`lib/dashboard.ts` for the stat tiles, `routes/jobs.tsx` for the row menu. Each swap keeps whatever
colour variable the placeholder was bound to, so a muted glyph stays muted and the response
manager's decisions come out green, amber and red.

**A nested Icon instance is swappable per instance, which is the whole point.** `StatCard` has ONE
icon slot, so every tile drew the same briefcase until each card's nested instance was pointed at
its own variant with `swapComponent`. Anywhere one component serves rows that should not share a
glyph, set it on the instance rather than adding a variant to the parent.

**A `+` reading as "back" is worse than no glyph.** `Button (icon)` bakes a plus into its component,
and **vector data cannot be overridden in an instance** — only `visible` and paints can. Where a
Button instance needs a different glyph, hide its `Icon` and draw an Icon instance over it, absolutely
positioned inside the row; do not detach the button.

**Database is five frames on one page**, one per story that is a screen or an overlay: the search
page, results under Juicebox, results under the Refine panel, and the two dialogs drawn open. Its
`figma-map.json` entry points at the **page** (`144:2`), not a frame, because its Docs page covers all
five. The result cards are clones of the Response manager's ApplicantCard plus a `CriteriaEvidence`
block, and the recent searches extend the Dashboard's list — so a change to either card shape has
two frames to follow. The ✓ / – in the evidence chips stand in for the app's thumbs-up and dash
icons.

**Avatar has a `badge` variant — `none` / `bottom-right` / `top-right`** — rather than a boolean,
because Figma cannot move a layer inside an instance. `bottom-right` is `AvatarBadge`'s default in
code; `top-right` is the response manager's "new" dot (`top-0 bottom-auto` in the app). On a card,
override the badge's ring stroke to `card`, as `ring-card` does in code. The component does not clip
its contents, so the badge can overlap the circle's edge the way it does in code.

The assembled app shell is the exception, and it follows the rule that governs the whole file: **a
Figma page mirrors wherever Storybook puts the story.** Storybook keeps the shell under
`Components/Sidebar`, so the Figma frames sit on the **Sidebar** page beside the component, not in
Compositions. That correspondence is the only thing making the two sidebars readable against each
other — if you move a story, move the Figma frames with it.

**`globals.css` remains the single source of truth. Tokens are generated, never drawn.**
`extract-tokens.mjs` holds a `BRAND_TOKENS` allowlist and throws if it and the brand layers
disagree in either direction, so adding a brand-scoped token means editing both.

```bash
npm run tokens         # globals.css -> packages/ui/tokens.json
npm run tokens:check   # fails if tokens.json is stale, or the ring invariant broke
```

`tokens.json` is committed and is what created every Figma variable. Editing a variable inside Figma
is drift and will be overwritten — change the CSS instead.

Five things about the mirror that are easy to trip over:

- **Semantic has four modes** — `iimjobs Light/Dark`, `hirist Light/Dark` — because `--primary` and
  friends vary on *both* axes. Four is also the Figma ceiling on a Professional plan, so a third
  brand does not fit without a plan change or a different mode model. Most neutrals alias the same
  primitive in all four modes; the six brand tokens differ per brand, and `--chart-2`…`-5` differ
  per theme.
- **Colours are approximations.** Several accents and every status colour are outside the sRGB
  gamut; Figma variables are sRGB only, so they are clipped (matching the fallback hexes Tailwind
  itself publishes). Each primitive's description carries the authoritative `oklch()` value.
- **Figma ignores paint opacity on a variable-bound paint.** Anything translucent — `bg-input/30`,
  `bg-destructive/10`, `ring-foreground/10` — is built as a separate stretched layer at
  `node.opacity`, so the label or card contents do not fade with it. `node.opacity` on the component
  itself is only right when everything inside should fade together (a disabled control).
- **Two sidebar widths, both correct.** The Sidebar component is 256px (`SIDEBAR_WIDTH`, the package
  default in `sidebar.tsx`); the app shell is 288px, because `AppShell` overrides `--sidebar-width`
  to `calc(var(--spacing) * 72)`. Do not "fix" one to match the other.
- **Figma fixtures track the app's mock data.** Nav labels come from `apps/web/src/lib/nav.ts`
  (Dashboard / Jobs / Database / Insights — Database sits next to Jobs deliberately: Jobs is who
  came to you, Database is who you go and find), and the recruiter in the sidebar footer is
  `nav-user.tsx`'s Priya Raman. When the app's fixtures change the Figma ones should follow, or a
  side-by-side comparison starts quietly lying.

Four more traps worth knowing before editing anything in Figma with the Plugin API:

- **`resize()` resets auto-layout sizing to FIXED.** Set `layoutSizingVertical = "HUG"` *after* the
  resize, or a card silently stays 10px tall with its content overflowing.
- **Reassigning `fills` on a node created by an earlier script leaves the binding unresolved** — it
  renders the placeholder colour instead. Recreate the node rather than re-filling it.
- **`clone()` on a variant drops its `componentPropertyReferences`.** The copy's text stops following
  the component's text property, so every instance of the new variant shows the component default
  ("TD") while `componentProperties` reports the override as set. Re-point the clone's text with
  `componentPropertyReferences = { characters: "<property key>" }`, then check the rendered
  characters rather than the property value.
- **`node.query()` cannot match a name containing `+`** — `[name=Avatar + new dot]` parses the `+` as
  the sibling combinator and returns nothing. Use `findOne(n => n.name === …)` for names like that.

Checking the Figma side against the code is an agent task, not an npm script: MCP tools only exist
inside the agent's tool loop. `node scripts/figma-variables.mjs --print` emits a read-only Plugin API
script that dumps the library's variables in `tokens.json`'s shape; run it through the Figma MCP,
save the result, then `--diff <file>` compares them mechanically.

There is **no Code Connect** — not on this Figma plan. Dev Mode shows generated snippets; the link
back to the real component is `documentationLinks` on each Figma component, generated from the same
`figma-map.json`.

## Conventions

Prettier: no semicolons, double quotes, 2-space indent, 80 cols, `prettier-plugin-tailwindcss`
class sorting (aware of `cn`/`cva`). `apps/web` compiles under `noUnusedLocals`,
`noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax` — use `import type`.

`npm run format` **rewrites Tailwind class order in place**, so files you just wrote come back
changed. Run it before reading a file back, not after.
