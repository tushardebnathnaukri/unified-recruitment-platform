import { definePreview } from "@storybook/react-vite"
import { withThemeByClassName } from "@storybook/addon-themes"

import { TooltipProvider } from "../src/components/tooltip"
import { BRANDS, DEFAULT_BRAND } from "../src/lib/brands"
import "../src/styles/globals.css"

export default definePreview({
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
