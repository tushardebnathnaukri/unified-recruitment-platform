# Pending design sync

Changes made in `apps/web` that Storybook and the AthenaDS Figma file have not
caught up with yet. Add an entry when a change lands in the app, and tick both
boxes and delete the entry once both are updated in one batch.

Each entry names the app file, the Storybook story, and the Figma node from
`packages/ui/figma-map.json`, so the batch can be done without re-reading the
diff.

## Pending

### Search Resume: table view

- **Date:** 2026-09-17
- **App:** `apps/web/src/routes/database.tsx`, `apps/web/src/components/candidate-list.tsx`
  and `database-filters.tsx`. The results have a Cards/Table toggle and, in
  table view, the Columns button, right of the toolbar under both filter
  designs. The table is the Response manager's data table:
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
- [ ] Storybook
- [ ] Figma

### Response manager: table view as a data table

- **Date:** 2026-09-17
- **App:** `apps/web/src/components/candidate-list.tsx` (`ApplicantTable`),
  `apps/web/src/components/data-table/column-header.tsx` and
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
- [ ] Storybook
- [ ] Figma

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

### Response manager and Search Resume: headers moved into the top bar

- **Date:** 2026-09-20
- **App:** `apps/web/src/components/page-header.tsx` (new),
  `site-header.tsx`, `app-shell.tsx`, `apps/web/src/routes/job.tsx` and
  `candidate-list.tsx`. The posting's header is no longer a white band above
  the tabs — it is the top bar itself, and the route title ("Jobs") steps
  aside for it:
  - One row inside `--header-height`: a ghost circular back button (`size-8`,
    `-ml-2`), the job title at `text-base` (was `text-lg`, and it truncates),
    the plan and status badges, then a vertical separator and the location /
    expiry meta. The separator and meta are hidden below `lg`.
  - The white band is gone with it, so the sticky tab toolbar is now the first
    thing in the content column and runs straight into the bar.
  - Any page can do this: `<PageHeader>` portals into a slot in `SiteHeader`.

  **Search Resume's results do the same**, under both filter designs, from one
  `SearchHeader` outside the branch:
  - Back button (still "back is edit" — the box with this search in it), the
    query truncated to one line (it clamped to two), the mode badge, then a
    separator and "N profiles · chips · Last run …", all hidden below `lg`.
  - The **"Looking for" skills row left the header** for `LookingFor`, drawn
    above the cards under the toolbar, beside the green chips it explains.
  - **Juicebox's query pill is gone.** The pill was the search plus a press
    back to the box, which is what the bar's title and back button now are.
    Its band keeps Filters, Criteria and Expand pool.
  - The refine design has no band left at all — the sticky filter column
    starts straight under the bar.

  My Lists still uses the band.
- **Storybook:** `Components/Sidebar → App shell` shows the bar with a plain
  title; add a variant with a page header in it. In
  `Compositions → Response manager`, drop the header band from every story and
  put the job, its badges and the back button in the top bar instead. In
  `Compositions → Database`, do the same to the two results stories: no
  header block, the query pill gone from the Juicebox one, and a "Looking for"
  row under the toolbar on the refine one.
- **Figma:** the **Sidebar** page (app shell frames), `Response manager — full
  page` (node `117:3`) and the Database page (node `144:2`). Same move: delete
  the header block from the Response manager and both results frames, rebuild
  the top bar row with the back button, title, badges, separator and meta, and
  move the "Looking for" chips under the toolbar in the refine results frame.
- [ ] Storybook
- [ ] Figma

### Response manager: Apply and Clear on the filter bar

- **Date:** 2026-09-20
- **App:** `apps/web/src/components/candidate-list.tsx` (`FilterBar`). The pill
  row now holds a draft:
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
- [ ] Storybook
- [ ] Figma

### Response manager: the split view's list becomes a column

- **Date:** 2026-09-20
- **App:** `apps/web/src/components/candidate-list.tsx` (`SplitView`,
  `QueueHeading`, `SplitRow`). At `@3xl/main` the candidate list beside the CV
  is no longer a rounded card:
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
- [ ] Storybook
- [ ] Figma

### Response manager: current and preferred location

- **Date:** 2026-09-20
- **App:** `apps/web/src/lib/applicants.ts` (`preferredLocations` on
  `Applicant`, `preferred` on `Filters`), `lib/database-filters.ts`
  (`toProfile` reads it instead of dealing its own), `candidate-list.tsx`.
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
- [ ] Storybook
- [ ] Figma

### Candidate profile panel floats; the card's name opens it

- **Date:** 2026-09-21
- **App:** `apps/web/src/components/candidate-panel.tsx` and
  `candidate-list.tsx` (`ApplicantCard`).
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
- [ ] Storybook
- [ ] Figma

### Messages moves from a corner dock to a page

- **Date:** 2026-09-21
- **App:** `apps/web/src/routes/messages.tsx` (new), `components/message-
  thread.tsx` (was `message-dock.tsx`), `messages-provider.tsx`,
  `app-shell.tsx`, `lib/nav.ts`, `App.tsx`, `lib/messages.ts`.
  - **The floating launcher and panel are gone.** No more bubble in the
    bottom-right corner of every page.
  - **A `Messages` nav item** (`MessageCircleIcon`) sits between Interviews and
    Credits — downstream of a candidate, beside My Lists and Interviews.
  - The page is one card: the thread list in a 320px left column with a right
    border, the open thread filling the rest. Two columns at `@3xl/main`, one
    below, where the thread's back arrow returns to the list. Empty state on
    the right when nothing is open.
  - The open thread is `?thread=`. `openThread` navigates rather than opening
    a panel, so Athena's draft cards, the selection bar's Message action and
    the candidate page's Message button all land here.
  - `photoOf` moved to `lib/messages.ts`.
  - **The undo bar is now a toast** (`Components → Toast`, added for this;
    `app-toaster.tsx` composes it in the bottom-right corner, shifting left by
    `--athena-width` when Athena is open).
    Same words — "Rohit Verma moved to Shortlisted" + Undo — but a white pill
    with a close X on the right, not the old centred black bar, and it leads
    with the candidate's avatar (an `AvatarGroup` of up to three on a batch,
    beside e.g. "12 people moved to Shortlisted"). `sm:max-w-md`.
- **Storybook:** there is no dock story to retire, but `Compositions` could use
  a `Messages` page story (list + open thread, and the one-column state).
  `Compositions → Athena` draft cards still say they open the dock. The
  Response manager's undo-bar story becomes a Toast; `Components → Toast` has
  no stories at all yet.
- **Figma:** no dock frame exists yet either. The Athena page (still unbuilt)
  and any frame showing the corner launcher need it removed; add a Messages
  page frame when the Compositions batch is next done.
- [ ] Storybook
- [ ] Figma

### Response manager: the three decision icons carry their colour at rest

- **Date:** 2026-09-21
- **App:** `apps/web/src/components/applicant-controls.tsx` (`DecisionGroup`).
  The tick, the question mark and the ✕ are `--success` (green-600),
  `--warning` (amber-600) and `--destructive` at rest, not
  `text-muted-foreground`. The active state is unchanged — the same token at
  `/10` behind the icon. Only the icon is tinted until hover, so a page of
  cards does not become a page of traffic lights.
  - They are the **semantic** tokens, not the brand's: tying the tick to
    `--primary` would make it orange on hirist, the same colour as Maybe
    beside it.
  - The selection bar's copies of the same three are unchanged — they sit on
    the dark pill and take `text-background`.
- **Storybook:** `Compositions → Response manager` (card stories) and any
  `Patterns` story showing the decision group. `Components → Toggle group`
  does not need to change.
- **Figma:** the ApplicantCard component on `Response manager — full page`
  (node `117:3`), so the Database frames' clones inherit it. Three icon
  colours at rest; the pressed states already exist.
- [ ] Storybook
- [ ] Figma

### Response manager: a Tags row opens the card

- **Date:** 2026-09-21
- **App:** `apps/web/src/lib/applicants.ts` (`tagsFor`) and
  `candidate-list.tsx` (`TagsBucket`, both card shapes). A **Tags** row above
  Experience, `secondary` chips like the skills row but neutral:
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
- [ ] Storybook
- [ ] Figma
