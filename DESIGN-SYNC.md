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
- **Figma, still to do:** there is no table frame on the Database page to give
  this treatment to — the page has the search, the two results frames and the
  two dialogs. It has to be built rather than edited.
- [x] Storybook
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
- **Figma, still to do:** `Response manager — full page` is the cards view and
  is the only frame on that page. The table frame the header treatment and the
  Columns button belong on does not exist yet, nor do the two overlay frames.
- [x] Storybook
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
- **Figma, still to do:** the pill row has left the cards frame, which is
  correct — beside the rail the cards view hides it. It now belongs to the
  table and split frames, and neither exists yet.
- [x] Storybook
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
- **Figma, still to do:** there is no split frame on the page to redraw.
- [x] Storybook
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
- **Figma, still to do:** there is no profile-panel frame on the Response
  manager page to redraw as a floating card.
- [x] Storybook
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
- **Figma, done:** the Tags row is on all six cards across the Response manager
  and Database pages, three chips then a `+N` where one overflows.
- **Figma, still to do:** the columns card shape, where the row is a band across
  the top rather than a sixth column — that variant does not exist in Figma.
- [x] Storybook
- [ ] Figma
