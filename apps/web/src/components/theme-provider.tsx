/* eslint-disable react-refresh/only-export-components -- the theme's hook and
   its one effects component belong in one file. */
import * as React from "react"
import { useAtom } from "jotai"

import { persistedAtom } from "@/lib/persisted"

type Theme = "dark" | "light"

const THEME_VALUES: Theme[] = ["dark", "light"]

function disableTransitionsTemporarily() {
  const style = document.createElement("style")
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}"
    )
  )
  document.head.appendChild(style)

  return () => {
    window.getComputedStyle(document.body)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove()
      })
    })
  }
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']")
  )
}

/**
 * Deliberately two-state, with no "system" option. This is a design-review
 * tool: the mode has to be unambiguous from the toggle alone, and a shared
 * preview link has to look identical for everyone opening it — following the
 * viewer's OS setting breaks both. Storybook's theme switcher matches.
 *
 * A stale "system" value from an older build is not on the list, so it reads
 * as the default.
 */
const themeAtom = persistedAtom<Theme>("theme", "light", THEME_VALUES)

export function useTheme() {
  const [theme, setTheme] = useAtom(themeAtom)
  const toggleTheme = React.useCallback(
    () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    [setTheme]
  )
  return { theme, setTheme, toggleTheme }
}

/**
 * What the theme does to the page: the class on `<html>`, and the bare `d`
 * key. It was the provider; the state is an atom now (`lib/persisted.ts`), so
 * this is only the side effects, mounted once beside the app in `main.tsx`.
 */
export function ThemeSync({
  disableTransitionOnChange = true,
}: {
  disableTransitionOnChange?: boolean
}) {
  const { theme, toggleTheme } = useTheme()

  React.useEffect(() => {
    const root = document.documentElement
    const restoreTransitions = disableTransitionOnChange
      ? disableTransitionsTemporarily()
      : null

    root.classList.remove("light", "dark")
    root.classList.add(theme)

    if (restoreTransitions) {
      restoreTransitions()
    }
  }, [theme, disableTransitionOnChange])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      toggleTheme()
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [toggleTheme])

  return null
}
