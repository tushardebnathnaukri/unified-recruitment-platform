# Unified recruitment platform

A prototype and playground for the **iimjobs** and **hirist** design team, for
designing the _recruiter-side_ product.

This is not production code. There is no backend, no auth, and no performance
budget — mock data is fine, and the whole thing optimizes for how fast a
designer can try an idea and share it.

iimjobs and hirist are today two separate products. Whether they unify is the
open question this work informs, so when a choice would foreclose either
outcome, we take the reversible one.

## Getting started

Requires Node 20+ and npm (the repo pins `npm@11.6.0` — don't use pnpm or yarn,
despite what any stray shadcn docs say).

```bash
npm install
```

Then run either surface — both can run at once:

```bash
npm run dev
```

| Command             | What it does                           | URL   |
| ------------------- | -------------------------------------- | ----- |
| `npm run dev`       | The clickable prototype (`apps/web`)   | :5173 |
| `npm run storybook` | Component docs (`packages/ui`)         | :6006 |
| `npm run build`     | Production build of the prototype      |       |
| `npm run lint`      | ESLint across both workspaces          |       |
| `npm run typecheck` | `tsc --noEmit` across both workspaces  |       |
| `npm run format`    | Prettier, incl. Tailwind class sorting |       |

Turborepo fans each command out to the workspaces. Scope one with `-w web` or
`-w @workspace/ui`.

## Layout

```
apps/web            Vite + React SPA — the prototype you click through
packages/ui         @workspace/ui — the design system, plus its Storybook
```

`@workspace/ui` is consumed as **raw TypeScript source**, not a build artifact.
Its `exports` map points straight into `src/`, so there is no build step and an
edit to a component hits the running dev server immediately.

Import from it by path:

```tsx
import { Button } from "@workspace/ui/components/button"
```

## One design system, two brands

This is the constraint everything else follows from.

Components are authored **once**, in `packages/ui`. A brand never gets its own
component. Brand differences live _only_ as CSS variable overrides in the
`[data-brand="…"]` blocks at the bottom of
`packages/ui/src/styles/globals.css`, and they cover five accent tokens.
Neutrals, radii and type are shared deliberately: if the two products ever
unify, we delete a brand layer and no component changes.

Two rules matter more than anything else here:

- **Never hardcode a brand colour in a component.** Add a token to the brand
  layer instead.
- **Never write `if (brand === "hirist")` in a component.** That is a real
  product divergence, not a styling problem — surface it to the design team
  rather than absorbing it into the code.

The brand switcher and the theme toggle both live on the **Settings** page.
Both write to `<html>`, and both persist, so a shared preview link renders
identically for everyone who opens it. Theme is also bound to a bare `d`
keypress anywhere in the app, which is the one way to flip it without
navigating.

> **iimjobs' palette is real** (Tailwind's emerald ramp). **hirist's is still a
> placeholder orange**, picked only to be visibly distinct while the switcher
> was wired up — see the `TODO(design)` in `globals.css`.

## Adding a component

```bash
npx shadcn@latest add <name> -c apps/web
```

Components land in `packages/ui/src/components/`. The CLI has a monorepo blind
spot, so check three things after every add:

1. Any hook landed in `packages/ui/src/hooks/`, not in `apps/web`.
2. `globals.css` wasn't clobbered — `git diff` it and confirm the brand layers
   survived.
3. Whether the component needs a root provider in `main.tsx`. These are **Base
   UI, not Radix**: roots often don't self-provide, and composition uses a
   `render` prop rather than `asChild`.

## More detail

`CLAUDE.md` at the repo root is the long-form version — architecture,
conventions, the traps this setup has, and how to verify a change without a
test runner. Worth reading before a first substantial change.
