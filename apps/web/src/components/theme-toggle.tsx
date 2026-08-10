import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { useTheme } from "@/components/theme-provider"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const Icon = theme === "dark" ? MoonIcon : SunIcon

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      onClick={toggleTheme}
    >
      <Icon />
    </Button>
  )
}
