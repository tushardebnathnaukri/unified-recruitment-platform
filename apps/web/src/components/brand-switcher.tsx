import { BRANDS } from "@workspace/ui/lib/brands"
import { useBrand } from "@workspace/ui/components/brand-provider"
import { Button } from "@workspace/ui/components/button"

/**
 * Segmented control for flipping the active brand. Built from Buttons rather
 * than a Select so designers can see both options at once — comparing the two
 * products is the point of this prototype.
 */
export function BrandSwitcher() {
  const { brand, setBrand } = useBrand()

  return (
    <div
      role="radiogroup"
      aria-label="Brand"
      className="flex items-center gap-0.5 rounded-4xl bg-muted p-0.5"
    >
      {BRANDS.map((entry) => {
        const isActive = entry.id === brand

        return (
          <Button
            key={entry.id}
            role="radio"
            aria-checked={isActive}
            size="sm"
            variant={isActive ? "default" : "ghost"}
            onClick={() => setBrand(entry.id)}
          >
            {entry.label}
          </Button>
        )
      })}
    </div>
  )
}
