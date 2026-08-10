import { Link } from "react-router"

import { Button } from "@workspace/ui/components/button"

export function HomePage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Recruiter prototype</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          A playground for the iimjobs and hirist design team. Components come
          from the shared design system in{" "}
          <code className="font-mono text-xs text-foreground">packages/ui</code>
          ; the brand switcher above swaps only token layers, never components.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">No product flows yet</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This shell is deliberately empty — routes for the real recruiter
          journeys get added once the team picks which to prototype first.
        </p>
      </div>

      <div>
        {/* Base UI composes via `render`, not Radix's `asChild`. */}
        <Button render={<Link to="/playground" />}>Open the playground</Button>
      </div>
    </div>
  )
}
