import { Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { HomePage } from "./pages/HomePage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsListPage } from "./pages/ProjectsListPage";
import { RequirementDetailPage } from "./pages/RequirementDetailPage";
import { RequirementsListPage } from "./pages/RequirementsListPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="projects" element={<ProjectsListPage />} />
        <Route path="projects/:projectId/requirements/:requirementId" element={<RequirementDetailPage />} />
        <Route path="projects/:projectId/requirements" element={<RequirementsListPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
      </Route>
    </Routes>
  );
}
