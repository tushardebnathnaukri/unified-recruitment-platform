import { defineMain } from "@storybook/react-vite/node"

export default defineMain({
  framework: "@storybook/react-vite",
  // Stories sit beside their components; MDX pages live in `src/docs`.
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
    // Renders the AthenaDS Figma node for a story in a side panel. Parameter-
    // driven, so it adds no decorator and leaves preview.tsx alone.
    "@storybook/addon-designs",
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
