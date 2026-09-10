import { Navigate, Route, Routes } from "react-router"

import { AppShell } from "@/components/app-shell"
import { BrandUrlSync } from "@/components/brand-url-sync"
import { DashboardPage } from "@/routes/dashboard"
import { JobDetailPage } from "@/routes/job"
import { CandidatePage } from "@/routes/candidate"
import { JobsPage } from "@/routes/jobs"
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
    <>
      {/* Inside the router, outside the routes: it needs `useSearchParams`,
          and it must not be remounted by navigation or it would re-apply the
          param on every page change. */}
      <BrandUrlSync />

      <Routes>
        <Route element={<AppShell />}>
          {/* No page lives at "/" — Dashboard is the landing page, so the index
            route just hands off to its real path. `replace` keeps the
            redirect out of history, so back from Dashboard leaves the app
            rather than bouncing through "/". */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={<DashboardPage />} />
          {/* Jobs is a real page now; its four states are tabs on it rather
            than routes, so the list stays one component and the state a
            recruiter is looking at stays in `?status=`. The two routes under
            it are where the rows and the create button point — named and
            routed, not designed. */}
          <Route path="jobs" element={<JobsPage />} />
          <Route
            path="jobs/new"
            element={<PlaceholderPage title="Post a job" />}
          />
          <Route path="jobs/:jobId" element={<JobDetailPage />} />
          {/* Nested under the job because a candidate here is not a person in
            the abstract — they are a person who applied to THIS posting. */}
          <Route
            path="jobs/:jobId/applicants/:applicantId"
            element={<CandidatePage />}
          />
          <Route
            path="database"
            element={<PlaceholderPage title="Database" />}
          />
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
    </>
  )
}
