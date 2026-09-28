import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"

import "@workspace/ui/globals.css"
import { BrandProvider } from "@workspace/ui/components/brand-provider"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { App } from "./App.tsx"
import { ThemeSync } from "@/components/theme-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* The app's shared state — theme, settings, decisions, saved lists,
        interviews, messages — is Jotai atoms in the default store, so there
        is no provider for it here. Brand stays a provider: it belongs to
        `packages/ui`, and the Storybook toolbar drives the same one. */}
    <BrandProvider>
      <ThemeSync />
      {/* Required by the sidebar: its collapsed-icon labels are Tooltips,
          and this component's Tooltip root does not self-provide. */}
      <TooltipProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </TooltipProvider>
    </BrandProvider>
  </StrictMode>
)
