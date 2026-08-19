import { Route, Routes } from "react-router"

import { AppShell } from "@/components/app-shell"
import { HomePage } from "@/routes/home"
import { JobsPage } from "@/routes/jobs"
import { PlaceholderPage } from "@/routes/placeholder"
import { PostJobPage } from "@/routes/post-job"
import { PlaygroundPage } from "@/routes/playground"
import { SettingsPage } from "@/routes/settings"

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route
          path="dashboard"
          element={<PlaceholderPage title="Dashboard" />}
        />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="post-job" element={<PostJobPage />} />
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
