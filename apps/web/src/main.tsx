import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"

import "@workspace/ui/globals.css"
import { BrandProvider } from "@workspace/ui/components/brand-provider"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { App } from "./App.tsx"
import { CardVariantProvider } from "@/components/card-variant-provider.tsx"
import { DecisionsProvider } from "@/components/decisions-provider.tsx"
import { InterviewsProvider } from "@/components/interviews-provider.tsx"
import { SavedListsProvider } from "@/components/saved-lists-provider.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrandProvider>
      <ThemeProvider>
        <CardVariantProvider>
          <DecisionsProvider>
            <SavedListsProvider>
              <InterviewsProvider>
                {/* Required by the sidebar: its collapsed-icon labels are
              Tooltips, and this component's Tooltip root does not
              self-provide. */}
                <TooltipProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                </TooltipProvider>
              </InterviewsProvider>
            </SavedListsProvider>
          </DecisionsProvider>
        </CardVariantProvider>
      </ThemeProvider>
    </BrandProvider>
  </StrictMode>
)
