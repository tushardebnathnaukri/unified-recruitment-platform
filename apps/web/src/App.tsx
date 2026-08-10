import { Route, Routes } from "react-router"

import { AppShell } from "@/components/app-shell"
import { HomePage } from "@/routes/home"
import { PlaygroundPage } from "@/routes/playground"

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="playground" element={<PlaygroundPage />} />
      </Route>
    </Routes>
  )
}
