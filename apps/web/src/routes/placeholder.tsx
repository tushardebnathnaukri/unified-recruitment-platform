/**
 * Stand-in for a route the design team has claimed a slot for but not designed
 * yet. One component rather than a file per page, so replacing any of them with
 * a real page is a one-line change in `App.tsx`.
 */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-2 px-4 lg:px-6">
      {/* The page title lives in SiteHeader — a second <h1> here would
          compete with it for screen readers. */}
      <p className="text-2xl font-medium">{title}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Nothing designed here yet.
      </p>
    </div>
  )
}
