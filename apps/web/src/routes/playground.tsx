import { Button } from "@workspace/ui/components/button"

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Playground</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Flip the brand and theme in the header to see tokens resolve.
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
