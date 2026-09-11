# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A **prototype and playground for the iimjobs and hirist design team**, for designing the
*recruiter-side* product. Not production code, no backend — optimize for design iteration speed.
Mock data is fine; auth, real APIs and performance budgets are out of scope.

iimjobs and hirist are today **two separate products**. Whether they unify is the open question
this work informs, so prefer the reversible option when a choice would foreclose either outcome.

## Commands

Run from the repo root; Turborepo fans out to the workspaces. Scope with `-w web` / `-w @workspace/ui`.

```bash
npm run dev              # apps/web on :5173
npm run storybook        # packages/ui on :6006
npm run build            # apps/web only — packages/ui has no build step
npm run build-storybook
npm run lint / typecheck / format
```

npm is the package manager (`npm@11.6.0`). If a Vite command fails with `Cannot find native
binding`, the lockfile lost rolldown's optional deps ([npm bug](https://github.com/npm/cli/issues/4828)):
`grep -c '"node_modules/@rolldown/binding-' package-lock.json` should report 14. If it reports 0,
`rm -rf node_modules package-lock.json && npm install`. Never hand-add one platform's binding.

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
  `ThemeProvider` → `TooltipProvider` → `BrowserRouter` → `App`.
- **`packages/ui`** (`@workspace/ui`) — shadcn/ui components on Base UI primitives, documented in Storybook.

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

Palettes: **iimjobs is real** (Tailwind's emerald ramp verbatim — 600/50 light, 500/950 dark).
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
zinc-500 is the pivot and holds in both. The figures are in `chart.stories.tsx` and on the Figma
**Chart** page.

**recharts animates a series in from zero via `requestAnimationFrame`.** Anywhere rAF does not tick
— a background tab, a screenshot runner, a hidden preview pane — the series stays at zero size and
the chart draws its axes and grid and *nothing else*. That reads exactly like a colour bug and is
not one. The Storybook chart stories pass `isAnimationActive={false}` so a shared link renders the
same for whoever opens it; the app keeps the animation.

Tailwind v4, configured entirely in CSS — there is no `tailwind.config`.
`packages/ui/src/styles/globals.css` is the single source of truth: `@theme inline` token map,
oklch `:root`/`.dark` palettes, brand layers, and `@source` globs pulling `apps/**` into the scan.

Theming is class-based. `theme-provider.tsx` toggles `light`/`dark` on `<html>`, persists to
`localStorage`, syncs across tabs, and binds a bare `d` keypress. It is **two-state on purpose —
no `system` mode**: this is a design-review tool, so the mode must be unambiguous from the icon
and a shared preview link must render identically for everyone. Storybook's switcher matches.

## Routing

React Router v8 **declarative mode** — plain `<Routes>`/`<Route>`, no loaders, no codegen, no
framework mode. Import from `react-router` (`react-router-dom` is a deprecated shim). Routes in
`src/App.tsx`, pages in `src/routes/`.

Designed so far: `/dashboard`, `/jobs` (four status tabs), `/jobs/:jobId` — the response manager,
the biggest surface in here — `/jobs/:jobId/applicants/:applicantId`, `/insights`, and `/database`
(search box, recent searches, results). Still `PlaceholderPage`: `/jobs/new`, `/search`,
`/projects/new`. `/reference/dashboard` is a hardcoded replica of the live iimjobs dashboard, kept
for side-by-side comparison and deliberately outside the design system — see the note at the top of
`legacy-dashboard.tsx`.

**The response manager is `components/candidate-list.tsx`, not `routes/job.tsx`.** It moved out
when the database's results turned out to be the same screen: `CandidateList` takes the people, the
skills they are matched against, a header and an empty state, and owns everything else — tabs,
views, pills, panel, undo. `routes/job.tsx` is now the job header and a thin wrapper. The words that
differ between the two ("Applied" / "Updated", "New since …", what the skills were asked for by)
come from `lib/list-source.ts` through a context that `CandidateList` sets from its `source` prop;
it defaults to `posting`, so the candidate page and anything older needs no provider. Change triage
there and it lands on both screens.

**`/database` is one box with three modes under it** — Keywords, Natural language, Job
description — not the live product's three tabs over three forms. The mode only changes how the
text is read, so the draft survives a switch. `mode`, `boolean` and `q` are in the URL; `q`
present means the page is that search's results. A bare `?q=` (what the Dashboard's box sends) is
a natural-language search. The results' search-within box is `?find=`, because `q` is taken.

`lib/database.ts` deals a search's people from the same generator as a posting's, through a
posting-shaped stand-in: the recent row's `matches` is the count and its `newSince` is who carries
the new dot. Search results pass `layout="results"` — a ranked list, not a queue: no decision tabs
(a decision is a badge, not a move), cards only, and the caller's own `sidebar` and `toolbar`. The
job page is `layout="queue"` and keeps its three filters as pills.

**The database has two filter designs, picked on /settings** ("Database filters", via
`useFilterVariant` in `lib/filter-variant.ts` — localStorage, no provider). **Juicebox** (the
default, `components/juicebox-filters.tsx`): the query as a pill, a Filters dialog that is edited
as a draft with a live match count and applied on Save, ranked plain-English Criteria (`?crit=`)
that decide what the cards highlight and the Best match order but remove nobody, and "Expand
pool" chips whose `+N` is counted against the real pool (`expansions` in `lib/database-filters`).
**Refine panel** is the live hirist column below. Both read and write the same URL keys, so a
link keeps its filters whichever design opens it.

Under Juicebox each card also carries **one evidence line per criterion** (`CriteriaEvidence` in
`candidate-list.tsx`, fed by `CandidateList`'s `verdicts` prop). The verdicts come from
`verdictsFor` in `lib/criteria.ts`, and Best match is summed from the same verdicts (`scoreFor`), so
a card's lines are the reason it ranks where it does. A criterion naming a known skill is checked
against the person's skills and cites a role on their card; free text gets a stable per-person
yes/no and a line saying only where it looked — no invented quotations.

**A search's city and years arrive as filters, not as a fact about the results.** `searchHref`
writes `cur`/`xp` from `criteriaFrom`, and `resultsFor` deals a wider pool — the same people plus
some in the next three cities and a few years either side — so the list opens on exactly the recent
row's count and loosening a filter finds somebody. The Dashboard's box goes through `searchHref`
too.

**The refine panel matches live hirist search** (`search.hirist.tech/search/…`): the same 20
sections in the same order, declared as rows in `SECTIONS` in `lib/database-filters.ts` and drawn
by `components/database-filters.tsx` as a sticky column (a drawer below `@4xl/main`). Every one
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

The response manager keeps its tab, view, sort, filters, selected candidate, open profile panel and
CV/profile tab in the query string, so any state worth showing someone is in the URL;
`applicants.ts` generates its people from a seeded LCG so a row can be pointed at in a review, and
their bucket sizes come from the job's own counts so the Jobs list and the detail page cannot
disagree.

**The response manager is organised by decision, not by reading.** Statuses are `undecided`,
`maybe`, `shortlisted`, `contacted`, `rejected` — there is no unread or seen, because the screen
cannot know what was read and a recruiter's daily question is "who still needs a decision from me".
Arrival is a separate fact: `newSinceVisit`, against a constant `LAST_VISIT` (one user, no
accounts). The page opens on **To review** — everybody undecided — as two runs, "New since …" then
"Earlier", and the sort (Most recent / Best match) applies *inside* each run, never across. A
decision removes the card at once, with an undo bar. The avatar's dot means new AND undecided
(`isNew`). Jobs carry `newSinceVisit`, not `unread`, and that is what "N new" means on the Jobs list
and the Dashboard.

**The Dashboard's requirement box only searches** (`/database?q=`). Projects are meant to file
themselves by role rather than be created, and two pieces from shapes that were tried and pulled are
**parked — written, unused, kept on purpose**: `projectForRole` in `lib/dashboard.ts` (which project
a role would land in) and `requirementParts` in `lib/requirement.ts` (which of location, title,
experience, industry and skills a description covers). Do not delete them as dead code without
asking. Word-list autocomplete on the box was built and removed.

**`/insights` is the market; the Dashboard is you.** Insights answers "what does this role pay,
where are the people, is demand rising" and reads the same for whoever searches it — it is modelled
on `calculus.hirist.tech`, which serves the same thing at `/insights/`. "How is my hiring going" —
funnel, time to fill, reply rate, which channel the hires came from — lives on the Dashboard,
because a recruiter reads "analytics" as the second question and there is nowhere else to ask it.
The nav item was renamed rather than one page trying to be both.

`AppShell` is the layout route: `SidebarProvider` → `AppSidebar variant="inset"` + `SidebarInset`
+ `AthenaPane` → `SiteHeader` + `<Outlet />`. Shell dimensions (`--sidebar-width`,
`--header-height`, `--athena-width`) are set as inline CSS variables on `SidebarProvider` so the
header, sidebar, copilot pane and message dock read the same numbers; the structure follows
shadcn's `dashboard-01` block. Pages own their gutters (`px-4 lg:px-6`) — the shell only supplies
vertical rhythm.

**Athena is the third column.** `AthenaProvider` sits inside `SidebarProvider` because opening the
copilot collapses the nav (and restores whatever it was doing on close), which means it needs
`useSidebar`. The pane is a sibling of `SidebarInset`, not a child — it sits *beside* the page, not
over it — and it is `sticky` + `h-svh` rather than a plain flex child, because the shell wrapper is
`min-h-svh` and grows with the page, which otherwise puts the composer at the bottom of a long
document instead of the bottom of the screen. Below `md` it covers the page and the message dock
hides. The trigger is in `SiteHeader` and only opens; the pane carries its own close.

Nav lives in `src/lib/nav.ts`, not in the sidebar component: `SiteHeader` needs it for the page
title, and `react-refresh/only-export-components` is on in `apps/web`. `NAV_ITEMS` renders through
`NavMain`, `SECONDARY_ITEMS` through `NavSecondary`. Every routed item is its own component
(`NavMenuItem`, `SecondaryLinkItem`) because active state comes from `useMatch`, which can't be
called in a loop body — and it's why `NavSecondary` splits link and button variants rather than
branching inside one component.

**The theme toggle lives on `/settings`**, leaving the top bar as title only — the sidebar owns the
collapse trigger, beside the wordmark. That was a deliberate call against keeping controls in the
header for side-by-side comparison; the bare `d` keypress bound in `ThemeProvider` is the only
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
   `chart` — so treat it as certain rather than possible. It also hits **registry dependencies you
   did not ask for**: `command` pulled `dialog` and `input-group`, and all three arrived with it.
   Grep the whole directory, not just the file you added:
   `grep -rn 'from "cn"' packages/ui/src/components/*.tsx`, fix each, then
   `npm uninstall cn -w @workspace/ui`.

If the CLI stalls on an "already exists, overwrite?" prompt (a dependency like `separator`), it is
waiting on stdin: `yes n | npx shadcn@latest add <name> -c apps/web` declines and continues.

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

The assembled app shell — sidebar, header and content column — is **not** in Compositions. It lives
in `sidebar.stories.tsx` as `Components/Sidebar → App shell`, `→ Collapsed to the icon rail` and
`→ App shell with Athena open`, because it is what the Sidebar component looks like in situ. Check there before adding a screen that shows the nav.

The dashboard route in `apps/web` and "Compositions → Dashboard" are the same tree; a change to a
row's *shape* belongs in the pattern, a change to its *content* in the app.

`packages/ui/vite.config.ts` exists **only to serve Storybook** (Tailwind plugin + alias); the
package still ships as source. `.storybook/preview.tsx` carries three decorators that mirror the
app's providers rather than approximating them — `withThemeByClassName` for `light`/`dark`, one
writing `data-brand` from a **Brand** toolbar built from `BRANDS`, and a `TooltipProvider` (Base UI's
tooltip root does not self-provide). Adding a brand to `brands.ts` therefore updates the Storybook
toolbar and the app switcher at once.

Addons: `addon-docs`, `addon-a11y`, `addon-themes`, `addon-designs`. The last one renders a story's
Figma node in a side panel; it is parameter-driven, so it adds no decorator and leaves `preview.tsx`
alone. Each story declares its node with `design("<key>")` from `src/lib/figma.ts`, which resolves
through `figma-map.json` — never a hardcoded URL, because a rebuild in Figma changes the node id.

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

The **Compositions** layer is mirrored too — Candidate profile, Dashboard, Insights, Post a job
form, Jobs list, Response manager and Settings row — assembled from instances rather than redrawn, so a change to Input or Chip lands in the screens. Icons in the
compositions are placeholders; swap in real instances rather than adding an icon variant. A frame
cannot hold a description or `documentationLinks`, so each composition carries its Storybook URL as
an on-canvas caption instead.

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
