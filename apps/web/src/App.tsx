import { Navigate, Route, Routes } from "react-router"

import { AppShell } from "@/components/app-shell"
import { LegacyDashboardPage } from "@/routes/legacy-dashboard"
import { PlaceholderPage } from "@/routes/placeholder"
import { PlaygroundPage } from "@/routes/playground"
import { SettingsPage } from "@/routes/settings"

/**
 * CLEAN SLATE. Every recruiter surface is a placeholder — the names and the
 * navigation between them survive, the designs do not. The point is to be able
 * to take a fresh run at the product without the shell, the theming or the
 * design system having to be rebuilt first.
 *
 * Settings and Playground are the two exceptions, and they are not recruiter
 * product: Settings is the brand and theme switcher this prototype is steered
 * with, and Playground is the design system's own showcase.
 *
 * The earlier attempt is not lost — it is on `feat/design-system-foundation`,
 * two commits deep, if a screen is worth pulling back.
 */
export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* No page lives at "/" — Dashboard is the landing page, so the index
            route just hands off to its real path. `replace` keeps the
            redirect out of history, so back from Dashboard leaves the app
            rather than bouncing through "/". */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route
          path="dashboard"
          element={<PlaceholderPage title="Dashboard" />}
        />
        <Route path="jobs" element={<PlaceholderPage title="Jobs" />} />
        <Route path="database" element={<PlaceholderPage title="Database" />} />
        <Route
          path="analytics"
          element={<PlaceholderPage title="Analytics" />}
        />
        <Route path="search" element={<PlaceholderPage title="Search" />} />

        {/* The primary create action. Named, routed and going nowhere yet. */}
        <Route
          path="projects/new"
          element={<PlaceholderPage title="Create Project" />}
        />

        {/* Reference, not product: a rebuild of the live recruiter dashboard
            so the current design can sit beside the next one. */}
        <Route path="reference/dashboard" element={<LegacyDashboardPage />} />

        <Route path="playground" element={<PlaygroundPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
