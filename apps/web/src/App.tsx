import { Navigate, Route, Routes } from "react-router"

import { AppShell } from "@/components/app-shell"
import { CreateProjectPage } from "@/routes/create-project"
import { DatabasePage } from "@/routes/database"
import { JobCandidatesPage } from "@/routes/job-candidates"
import { JobsPage } from "@/routes/jobs"
import { PlaceholderPage } from "@/routes/placeholder"
import { PostJobPage } from "@/routes/post-job"
import { PlaygroundPage } from "@/routes/playground"
import { SettingsPage } from "@/routes/settings"

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
        <Route path="jobs" element={<JobsPage />} />
        {/* Where a row in the jobs table lands: the job's applicants, as a
            pipeline. The list has been linking here since its title became a
            link. */}
        <Route path="jobs/:id" element={<JobCandidatesPage />} />
        <Route path="post-job" element={<PostJobPage />} />
        {/* A mandate: one statement of who you need, which the post-a-job form
            and the database search both come off. The project surface it
            creates is not designed yet. */}
        <Route path="projects/new" element={<CreateProjectPage />} />
        <Route
          path="projects/:id"
          element={<PlaceholderPage title="Project" />}
        />
        {/* Resume database: a search form, and the results surface it hands
            off to. Only the form is designed — the results page is a slot the
            search button already points at. */}
        <Route path="database" element={<DatabasePage />} />
        <Route
          path="database/results"
          element={<PlaceholderPage title="Search results" />}
        />
        <Route path="search" element={<PlaceholderPage title="Search" />} />
        <Route
          path="analytics"
          element={<PlaceholderPage title="Analytics" />}
        />
        <Route path="playground" element={<PlaygroundPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
