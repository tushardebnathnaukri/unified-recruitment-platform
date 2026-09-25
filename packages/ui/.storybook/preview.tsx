import { definePreview } from "@storybook/react-vite"
import addonA11y from "@storybook/addon-a11y"
import addonDesigns from "@storybook/addon-designs"
import addonDocs from "@storybook/addon-docs"
import addonThemes, { withThemeByClassName } from "@storybook/addon-themes"

import { TooltipProvider } from "../src/components/tooltip"
import { BRANDS, DEFAULT_BRAND } from "../src/lib/brands"
import "../src/styles/globals.css"

export default definePreview({
  /**
   * THE ADDONS ARE REGISTERED TWICE, AND BOTH ARE LOAD-BEARING. `main.ts` turns
   * an addon on — its preset and its panel in the manager. This turns on the
   * half that runs inside the preview: the parameters and decorators each addon
   * contributes to a story. Under `definePreview` (Storybook 10's CSF Next) that
   * half is opt-in, and listing an addon only in `main.ts` gets the panel
   * without it.
   *
   * IT IS NOT COSMETIC. `addonDocs()` is what supplies `parameters.docs.renderer`,
   * so without it every Docs page — and `tags: ["autodocs"]` below means every
   * component has one — died on `baseDocsParameter.renderer is not a function`
   * and rendered blank, while the stories beside them were fine.
   *
   * Declaring them here is also what makes each addon's parameters type-safe in
   * a story file, which is what `design("<key>")` and
   * `parameters.docs.description.component` are written against.
   */
  addons: [addonDocs(), addonA11y(), addonThemes(), addonDesigns()],
  decorators: [
    // Mirrors apps/web's ThemeProvider: the palette is driven by a
    // `light` / `dark` class on the html element.
    withThemeByClassName({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      parentSelector: "html",
    }),
    // Mirrors BrandProvider: brand token layers key off `data-brand` on the
    // same element the theme class lands on.
    (Story, context) => {
      document.documentElement.setAttribute("data-brand", context.globals.brand)
      return Story()
    },
    // Mirrors main.tsx's TooltipProvider. Base UI's Tooltip is a bare root, so
    // anything with a tooltip — the sidebar's collapsed rail, for one — needs
    // this above it just as it does in the app.
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
  initialGlobals: {
    brand: DEFAULT_BRAND,
  },
  globalTypes: {
    brand: {
      description: "Brand token layer",
      toolbar: {
        title: "Brand",
        icon: "paintbrush",
        dynamicTitle: true,
        items: BRANDS.map((brand) => ({
          value: brand.id,
          title: brand.label,
        })),
      },
    },
  },
  // Every component gets a generated Docs page; the description in each
  // story file's `parameters.docs.description.component` is what fills it.
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          "Overview",
          ["Introduction", "Component inventory"],
          "Foundations",
          "Components",
          "Patterns",
          "Compositions",
        ],
      },
    },
  },
})
