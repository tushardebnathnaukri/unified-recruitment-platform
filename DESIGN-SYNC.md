# Pending design sync

Changes made in `apps/web` that Storybook and the AthenaDS Figma file have not
caught up with yet. Add an entry when a change lands in the app, and tick both
boxes and delete the entry once both are updated in one batch.

Each entry names the app file, the Storybook story, and the Figma node from
`packages/ui/figma-map.json`, so the batch can be done without re-reading the
diff.

## Pending

### Dashboard: Live jobs and Recent searches side by side

- **Date:** 2026-09-17
- **App:** `apps/web/src/routes/dashboard.tsx`. `ActiveJobs` and
  `RecentSearches` are wrapped in `grid gap-6 @5xl/main:grid-cols-2`. They sit
  in two equal columns once the content column is 64rem wide and stack below
  that. Their tops line up because each section is `grid-rows-[auto_1fr]`.
- **Storybook:** `Compositions → Dashboard`
  (`packages/ui/src/compositions/dashboard.stories.tsx`). Put the same
  two-column wrapper around the two sections.
- **Figma:** `Dashboard — full page` (node `66:2`). Put the Live jobs and Recent
  searches frames in a horizontal auto-layout row with 24px spacing, each set
  to fill the row.
- [ ] Storybook
- [ ] Figma

### App shell: flush content instead of an inset card

- **Date:** 2026-09-17
- **App:** in `apps/web/src/components/app-shell.tsx`, `AppSidebar` is now
  `variant="sidebar"` instead of `"inset"`. The content no longer has a margin,
  rounded corners or a shadow. It sits flush against the nav, and the nav's
  right border and the header's bottom border separate them. The Athena pane
  in `apps/web/src/components/athena-pane.tsx` lost its margin, rounding and
  shadow to match: it is `md:top-0 md:h-svh md:border-l`.
- **Storybook:** in `sidebar.stories.tsx`, switch `App shell`,
  `Collapsed to the icon rail` and `App shell with Athena open` from
  `variant="inset"` to `variant="sidebar"`. In the Athena story, drop the
  pane's `m-2`, `rounded-xl` and `shadow-sm` and add `border-l`. Check
  `Compositions → Athena` for the same classes.
- **Figma:** on the Sidebar page, in the three app-shell frames, remove the
  8px padding around the content frame, its corner radius and its shadow. Add
  a 1px `sidebar-border` stroke on the right of the nav, and make the content
  fill the full height. Do the same for the Athena pane, with a 1px `border`
  stroke on its left.
- [ ] Storybook
- [ ] Figma

### Navigation background: white in light mode

- **Date:** 2026-09-17
- **App:** in `packages/ui/src/styles/globals.css`, `--sidebar` in `:root` is
  now `oklch(1 0 0)` instead of `oklch(0.985 0 0)`, so it maps to `white`
  instead of `zinc/50`. Dark mode is unchanged (`zinc/900`). `tokens.json` has
  been regenerated. The nav and the content are both white now, so only the
  nav's right border separates them.
- **Storybook:** there is nothing to edit, because stories read the same CSS.
- **Figma:** in the Semantic collection, set `sidebar` to alias `white` in
  `iimjobs Light` and `hirist Light`.
- [ ] Storybook
- [ ] Figma

### Content column: mist-50

- **Date:** 2026-09-17
- **App:** there is a new shared token, `--canvas` (`bg-canvas`), in
  `packages/ui/src/styles/globals.css`. In light mode it is Tailwind's mist-50,
  `oklch(0.987 0.002 197.1)`. In dark mode it has the same value as
  `--background`. It is applied only as `<SidebarInset className="bg-canvas">`
  in `apps/web/src/components/app-shell.tsx`, so the header gets it too.
  `--background` is unchanged. `tokens.json` has been regenerated and now has
  a `mist/50` primitive.
- **Storybook:** in `sidebar.stories.tsx`, pass `className="bg-canvas"` to
  `SidebarInset` in the three app-shell stories.
- **Figma:** in Primitives, add `mist/50`. In Semantic, add a `canvas` variable
  that aliases `mist/50` in both light modes and `zinc/950` in both dark modes.
  Bind it to the content frame fill in the app-shell frames and the full-page
  compositions.
- [ ] Storybook
- [ ] Figma

### Neutrals: zinc → mist

- **Date:** 2026-09-17
- **App:** in `packages/ui/src/styles/globals.css`, every zinc value in `:root`
  and `.dark` is now the mist step with the same number (zinc-500 became
  mist-500, and so on). That covers background, foreground, card, popover,
  secondary, muted, accent, border, input, ring, sidebar and `--chart-2`…`-5`.
  White and the translucent-white borders in dark are unchanged. The contrast
  figures in the chart comments were re-measured, and every value still clears
  3:1. `tokens.json` has been regenerated and has no zinc primitives left;
  `tokens:check` passes. `cross-sell-banner.tsx` uses `text-mist-900` and
  `border-mist-200` instead of neutral.
- **Storybook:** the tokens need no edit. The contrast table in
  `chart.stories.tsx` and the ramp name in `insights.stories.tsx` were updated
  with the CSS. Still to do: `sidebar.stories.tsx` lines ~206–216, the
  cross-sell card copy, still uses `neutral-100/200/400/900`. Switch it to
  mist to match the app.
- **Figma:** in Primitives, add `mist/50`…`mist/950` and remove the zinc
  primitives once nothing aliases them. In Semantic, re-point every alias from
  `zinc/N` to `mist/N` in all four modes. `node scripts/figma-variables.mjs
  --print` then `--diff` against `tokens.json` confirms it. Check the Chart
  page's contrast figures, and the Sidebar cross-sell card's fixed greys.
- [ ] Storybook
- [ ] Figma

### Site header: white over the mist-50 content column

- **Date:** 2026-09-17
- **App:** the `<header>` in `apps/web/src/components/site-header.tsx` now has
  `bg-background`, so the top bar is white while the page below it stays
  `bg-canvas`. Dark mode has no visible change, because `--canvas` equals
  `--background` there.
- **Storybook:** in `sidebar.stories.tsx`, add `bg-background` to the header in
  the three app-shell stories.
- **Figma:** in the app-shell frames and the full-page compositions, give the
  header frame a `background` fill instead of `canvas`.
- [ ] Storybook
- [ ] Figma

### iimjobs primary: emerald-600 → emerald-700 (light)

- **Date:** 2026-09-17
- **App:** in the `:root[data-brand="iimjobs"]:not(.dark)` block of
  `packages/ui/src/styles/globals.css`, `--primary`, `--chart-1`, `--ring`
  (60%) and `--sidebar-primary` are now emerald-700,
  `oklch(0.508 0.118 165.612)`, #007a55. The foregrounds stay emerald-50, which
  now measures 5.09:1 instead of 3.48:1. `--chart-1` measures 5.37:1 on a
  card. Dark mode (emerald-500) and hirist are unchanged. `tokens.json` has
  been regenerated: `emerald/600` is gone and `emerald/700` has been added.
  `tokens:check` passes.
- **Storybook:** there is nothing to edit for the tokens. The `--chart-1` row
  in `chart.stories.tsx` was updated with the CSS.
- **Figma:** in Primitives, add `emerald/700` and remove `emerald/600`. In
  Semantic's `iimjobs Light` mode, re-point `primary`, `chart-1`, `ring` and
  `sidebar-primary` to `emerald/700`. Update the contrast figure on the Chart
  page.
- [ ] Storybook
- [ ] Figma

### iimjobs primary: emerald-500 → emerald-600 (dark)

- **Date:** 2026-09-17
- **App:** in the `:root[data-brand="iimjobs"].dark` block of
  `packages/ui/src/styles/globals.css`, `--primary`, `--chart-1`, `--ring`
  (60%) and `--sidebar-primary` are now emerald-600,
  `oklch(0.596 0.145 163.225)`. The foregrounds stay emerald-950, which
  measures 4.13:1. `--chart-1` measures 4.74:1 on a dark card. hirist is
  unchanged. `tokens.json` has been regenerated, and `tokens:check` passes.
- **Storybook:** there is nothing to edit for the tokens. The `--chart-1` row
  in `chart.stories.tsx` was updated with the CSS.
- **Figma:** in Semantic's `iimjobs Dark` mode, re-point `primary`, `chart-1`,
  `ring` and `sidebar-primary` to `emerald/600`, and keep `emerald/600` in
  Primitives (the previous entry said to remove it; ignore that). Remove
  `emerald/500` if nothing else aliases it. Update the contrast figure on the
  Chart page.
- [ ] Storybook
- [ ] Figma

### Page headers: white bands under the site header

- **Date:** 2026-09-17
- **App:** the header block at the top of each object screen is a white,
  full-width band under the white site header, over the mist content column.
  It escapes the shell's top padding and the page gutter with
  `-mx-4 -mt-4 md:-mt-6 lg:-mx-6`.
  - `apps/web/src/components/candidate-list.tsx` wraps `{header}`, so every
    `CandidateList` screen gets the band.
    - **Job page (queue):** `pt-5 pb-3 -mb-5` with no border. It runs straight
      into the white sticky tab toolbar as one block, and the toolbar's
      border is the only divider.
    - **Search Resume results (both filter designs), My Lists, and a queue
      showing its empty state:** `pt-5 pb-5 border-b`, because grey sits
      under it.
  - `apps/web/src/routes/candidate.tsx`: the candidate page header (back link,
    avatar, name, decisions, Download CV and Message) is wrapped in the same
    band, with `py-5 border-b`.
  - `JobHeader` in `job.tsx` itself is unchanged.
- **Storybook:** apply the same treatment in `Compositions → Response manager`
  (the header and tab toolbar as one white block), `Compositions → Database`
  (the results header as a white band with a bottom border, in both the
  Juicebox and Refine stories) and `Compositions → Candidate profile`.
- **Figma:** on the Response manager, Database (the two results frames) and
  Candidate profile pages, make the header frame full width with a
  `background` fill. On Response manager, put it directly on the toolbar with
  no stroke. On the others, add a 1px `border` stroke on the bottom.
- [ ] Storybook
- [ ] Figma

### Response manager: a filter rail in the cards view

- **Date:** 2026-09-17
- **App:** in `apps/web/src/components/candidate-list.tsx`, the queue layout's
  **cards** view now shows the filters as a left rail, `FilterRail`, once the
  content column is `@4xl/main` (896px) wide, and hides the pill row there.
  Table view, split view and cards below `@4xl` keep the pills.
  - The rail is a **fixed column, not a floating card**: `w-64 bg-background
    border-r`, flush against the nav edge (the negative margin cancels the
    gutter) and against the bottom of the sticky tab block, with no gap. It is
    sticky at the tab block's height, measured through a callback ref with a
    `ResizeObserver`, and exactly `100svh` minus that height tall.
  - Inside it, a `h-12 border-b` heading ("Filters", a count badge, and
    "Reset all" when something is on) and a search input are pinned. Below
    them, collapsible `border-t` sections for Sort by, Experience, Notice
    period and Location scroll inside the column.
  - The options are radios, with "Any …" first, because each filter holds one
    value. Beside each option is how many people on the posting it would
    leave, with the other filters held.
  - There is no Apply button, because filters apply as you pick them.
  - Above the cards, `AppliedFilters` repeats Insights' applied bar:
    "**N** of M match", then one chip per active filter (`rounded-4xl border
    bg-muted/40 text-xs` with an ✕), then a Clear all link. Each chip removes
    only its own filter. It covers search (shown in quotes), experience, notice
    and location, but not sort, and appears only beside the rail when something
    is on.
  - It reads and writes the same URL keys as the pills (`exp`, `notice`,
    `location`, `sort`, `q`).
- **Storybook:** in `Compositions → Response manager`, add the rail beside the
  cards in the cards story, drop the pill row there, and keep the pills in the
  table and split stories. Consider a `FilterRail` story.
- **Figma:** on the Response manager page, in the cards frame, draw the rail as
  a full-height 256px column with a `background` fill and a 1px `border`
  stroke on the right. Put it flush left, directly under the tab toolbar. Pin
  the heading with a bottom border and the search input, make the section
  list its own clipped scroll area, and remove the pill row from that frame.
  Add a variant of the frame with filters on, showing the applied-chips row
  above the cards (reuse the Insights frame's chips).
- [ ] Storybook
- [ ] Figma
