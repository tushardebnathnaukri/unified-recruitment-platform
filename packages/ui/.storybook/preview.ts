import { definePreview } from "@storybook/react-vite"
import { withThemeByClassName } from "@storybook/addon-themes"

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
  parameters: {
    layout: "centered",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
})
