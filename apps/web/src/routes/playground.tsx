import { Button } from "@workspace/ui/components/button"
import { Kbd } from "@workspace/ui/components/kbd"

const VARIANTS = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const

/**
 * Scratch surface for trying components against both brands at once. Storybook
 * is the documentation; this is the place to check a component in situ.
 */
export function PlaygroundPage() {
  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div className="flex flex-col gap-2">
        {/* Title comes from SiteHeader. */}
        <p className="text-sm leading-relaxed text-muted-foreground">
          Flip the brand or theme on Settings to see tokens resolve — or press{" "}
          <Kbd>d</Kbd> for theme without leaving this page.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
      </div>
    </div>
  )
}
