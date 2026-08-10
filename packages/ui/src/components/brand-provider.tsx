import * as React from "react"

import { DEFAULT_BRAND, isBrand, type Brand } from "@workspace/ui/lib/brands"

type BrandProviderProps = {
  children: React.ReactNode
  defaultBrand?: Brand
  storageKey?: string
}

type BrandProviderState = {
  brand: Brand
  setBrand: (brand: Brand) => void
}

const BrandProviderContext = React.createContext<
  BrandProviderState | undefined
>(undefined)

/**
 * Writes the active brand to `data-brand` on <html>, where the brand token
 * layers in globals.css pick it up. Deliberately mirrors ThemeProvider: both
 * attributes land on the same element, which the CSS selectors rely on.
 */
export function BrandProvider({
  children,
  defaultBrand = DEFAULT_BRAND,
  storageKey = "brand",
}: BrandProviderProps) {
  const [brand, setBrandState] = React.useState<Brand>(() => {
    const storedBrand = localStorage.getItem(storageKey)
    if (isBrand(storedBrand)) {
      return storedBrand
    }

    return defaultBrand
  })

  const setBrand = React.useCallback(
    (nextBrand: Brand) => {
      localStorage.setItem(storageKey, nextBrand)
      setBrandState(nextBrand)
    },
    [storageKey]
  )

  React.useEffect(() => {
    document.documentElement.setAttribute("data-brand", brand)
  }, [brand])

  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || event.key !== storageKey) {
        return
      }

      setBrandState(isBrand(event.newValue) ? event.newValue : defaultBrand)
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [defaultBrand, storageKey])

  const value = React.useMemo(() => ({ brand, setBrand }), [brand, setBrand])

  return (
    <BrandProviderContext.Provider value={value}>
      {children}
    </BrandProviderContext.Provider>
  )
}

export const useBrand = () => {
  const context = React.useContext(BrandProviderContext)

  if (context === undefined) {
    throw new Error("useBrand must be used within a BrandProvider")
  }

  return context
}
