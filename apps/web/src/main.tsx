import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"

import "@workspace/ui/globals.css"
import { BrandProvider } from "@workspace/ui/components/brand-provider"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { App } from "./App.tsx"
import { CardVariantProvider } from "@/components/card-variant-provider.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrandProvider>
      <ThemeProvider>
        <CardVariantProvider>
          {/* Required by the sidebar: its collapsed-icon labels are Tooltips,
            and this component's Tooltip root does not self-provide. */}
          <TooltipProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </TooltipProvider>
        </CardVariantProvider>
      </ThemeProvider>
    </BrandProvider>
  </StrictMode>
)
