import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")

  // THE AI SERVER IS ANOTHER PROCESS (`apps/ai`). In development the page
  // calls `/api/…` on its own origin and Vite forwards it, so there is no CORS
  // to think about and nothing in the page knows a second server exists. A
  // deployed build sets `VITE_AI_URL` instead — see `src/lib/ai-client.ts`.
  const api = {
    "/api": {
      target: env.AI_SERVER_URL || "http://localhost:8787",
      changeOrigin: true,
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: { proxy: api },
    preview: { proxy: api },
  }
})
