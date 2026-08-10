import { defineMain } from "@storybook/react-vite/node"

export default defineMain({
  framework: "@storybook/react-vite",
  // Add "../src/**/*.mdx" here if you start writing MDX docs pages.
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
  ],
  core: {
    builder: {
      name: "@storybook/builder-vite",
      options: {
        viteConfigPath: "vite.config.ts",
      },
    },
  },
})
