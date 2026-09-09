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
    /**
     * The URL outranks the stored preference. A link saying `?brand=hirist` is
     * an instruction about what to show; `localStorage` is a leftover from
     * whatever the person opening it last looked at.
     *
     * It is read HERE, in the initial state, rather than only in the app's
     * `BrandUrlSync` — otherwise a linked brand arrives as a change one tick
     * after mount, and anything watching for a brand change (the switch
     * skeleton) fires on a plain page load. Reading `location.search` once,
     * without writing, needs no router and cannot fight one.
     */
    const fromUrl = new URLSearchParams(window.location.search).get("brand")
    if (isBrand(fromUrl)) {
      return fromUrl
    }

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
