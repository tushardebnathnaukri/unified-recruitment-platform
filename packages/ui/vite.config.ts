import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Only used by Storybook — the package itself ships as TypeScript source.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@workspace/ui": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
