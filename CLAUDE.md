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

```bash
# Vite compiles the module (catches bad imports typecheck misses)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/src/components/app-shell.tsx

# Tailwind generated a utility/token layer — read the SERVED css, not the source
curl -s "http://localhost:5173/@fs/$PWD/packages/ui/src/styles/globals.css?direct" | grep -c 'data-brand'

# Storybook indexed what it should have
curl -s http://localhost:6006/index.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(Object.keys(JSON.parse(s).entries)))"
```

Wait on a server's log rather than sleeping: `until grep -qiE "Local:|ERROR" /tmp/dev.log; do sleep 0.5; done`.

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

`BrandProvider` writes `data-brand` onto `<html>`; the roster is `packages/ui/src/lib/brands.ts`.
Selectors are `:root[data-brand="x"]:not(.dark)` / `:root[data-brand="x"].dark`, which **assume
`data-brand` and the theme class sit on the same element** — keep both on `<html>`.

Palettes: **iimjobs is real** (Tailwind's emerald ramp verbatim — 600/50 light, 500/950 dark).
**hirist is still a placeholder** orange; see the `TODO(design)` in `globals.css`.

## Styling

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

`AppShell` is the layout route: `SidebarProvider` → `AppSidebar variant="inset"` + `SidebarInset`
→ `SiteHeader` + `<Outlet />`. Shell dimensions (`--sidebar-width`, `--header-height`) are set as
inline CSS variables on `SidebarProvider` so the header and sidebar read the same numbers; the
structure follows shadcn's `dashboard-01` block. Pages own their gutters (`px-4 lg:px-6`) — the
shell only supplies vertical rhythm.

Nav lives in `src/lib/nav.ts`, not in the sidebar component: `SiteHeader` needs it for the page
title, and `react-refresh/only-export-components` is on in `apps/web`. `NAV_ITEMS` renders through
`NavMain`, `SECONDARY_ITEMS` through `NavSecondary`. Every routed item is its own component
(`NavMenuItem`, `SecondaryLinkItem`) because active state comes from `useMatch`, which can't be
called in a loop body — and it's why `NavSecondary` splits link and button variants rather than
branching inside one component.

**Both the brand switcher and the theme toggle live on `/settings`**, leaving the top bar as
trigger + title. That was a deliberate call, against the earlier arrangement of keeping both in the
header for side-by-side comparison — flipping either now costs a navigation, and the bare `d`
keypress bound in `ThemeProvider` is the only global way to change theme.

## Authoring components

`cva` for variants + `cn()` for merging — `packages/ui/src/components/button.tsx` is the reference
shape (`data-slot`, `variant`/`size` groups, Base UI primitive).

These are **Base UI, not Radix**, which bites twice:
- Composition is a **`render` prop**, not `asChild`: `<Button render={<Link to="/x" />}>`.
- Roots often **don't self-provide** — `Tooltip` is a bare root, so its users need `TooltipProvider`.

`react-refresh/only-export-components` is **off for `packages/ui/src/components/**`** (every shadcn
component exports its `*Variants` alongside). It stays on in `apps/web`, so a provider there that
also exports its hook carries a file-level `eslint-disable`.

## Adding shadcn components

```bash
npx shadcn@latest add <name> -c apps/web    # lands in packages/ui/src/components/
```

Style is `base-maia`, `baseColor: neutral`, CSS variables. Both `components.json` files point
`ui`/`hooks`/`lib`/`utils` at `@workspace/ui`; only `components` differs. (README says `pnpm dlx` —
this repo uses npm.)

**After every add, check three things** — the CLI has a monorepo blind spot:

1. **Hooks landed in `packages/ui/src/hooks/`.** A stray hook in `apps/web` is an unresolved import
   at runtime, not a type error.
2. **`globals.css` wasn't clobbered** — the CLI rewrites it to inject tokens. `git diff` it and
   confirm the brand layers survived.
3. **Whether it needs a root provider** in `main.tsx` (see Base UI note above).

**Local divergence:** `packages/ui/src/hooks/use-mobile.ts` uses `useSyncExternalStore` instead of
the stock seed-`undefined`-then-assign-in-effect, which trips `react-hooks`' cascading-render rule
and misreports desktop on first paint. `--overwrite` restores the stock version and the lint failure.

## Storybook

Storybook 10 (`@storybook/react-vite`) lives in `packages/ui`, beside the components. Stories are
`src/components/<name>.stories.tsx` and import through the public entry point, so a story breaks if
the `exports` map does.

`packages/ui/vite.config.ts` exists **only to serve Storybook** (Tailwind plugin + alias); the
package still ships as source. `.storybook/preview.ts` carries two decorators that mirror the app's
providers rather than approximating them — `withThemeByClassName` for `light`/`dark`, and one
writing `data-brand` from a **Brand** toolbar built from `BRANDS`. Adding a brand to `brands.ts`
therefore updates the Storybook toolbar and the app switcher at once.

Addons: `addon-docs`, `addon-a11y`, `addon-themes`.

## Conventions

Prettier: no semicolons, double quotes, 2-space indent, 80 cols, `prettier-plugin-tailwindcss`
class sorting (aware of `cn`/`cva`). `apps/web` compiles under `noUnusedLocals`,
`noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax` — use `import type`.

`npm run format` **rewrites Tailwind class order in place**, so files you just wrote come back
changed. Run it before reading a file back, not after.
