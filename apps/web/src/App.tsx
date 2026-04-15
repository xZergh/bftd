import { Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { HomePage } from "./pages/HomePage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsListPage } from "./pages/ProjectsListPage";
import { RequirementDetailPage } from "./pages/RequirementDetailPage";
import { RequirementsListPage } from "./pages/RequirementsListPage";
import { RunDetailPage } from "./pages/RunDetailPage";
import { TestCaseDetailPage } from "./pages/TestCaseDetailPage";
import { TestCasesListPage } from "./pages/TestCasesListPage";
import { TestRunsListPage } from "./pages/TestRunsListPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="projects" element={<ProjectsListPage />} />
        <Route path="projects/:projectId/requirements/:requirementId" element={<RequirementDetailPage />} />
        <Route path="projects/:projectId/requirements" element={<RequirementsListPage />} />
        <Route path="projects/:projectId/test-cases/:testCaseId" element={<TestCaseDetailPage />} />
        <Route path="projects/:projectId/test-cases" element={<TestCasesListPage />} />
        <Route path="projects/:projectId/runs/:runId" element={<RunDetailPage />} />
        <Route path="projects/:projectId/runs" element={<TestRunsListPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
      </Route>
    </Routes>
  );
}
