import { Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { E2eThrowRoute } from "./pages/E2eThrowRoute";
import { HomePage } from "./pages/HomePage";
import { ShellDiagnosticsPage } from "./pages/ShellDiagnosticsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsListPage } from "./pages/ProjectsListPage";
import { RequirementDetailPage } from "./pages/RequirementDetailPage";
import { RequirementsListPage } from "./pages/RequirementsListPage";
import { ProjectDesignLinksPage } from "./pages/ProjectDesignLinksPage";
import { ProjectImportsPage } from "./pages/ProjectImportsPage";
import { ProjectReportingPage } from "./pages/ProjectReportingPage";
import { RunDetailPage } from "./pages/RunDetailPage";
import { TestCaseDetailPage } from "./pages/TestCaseDetailPage";
import { TestCasesListInlinePage } from "./pages/TestCasesListInlinePage";
import { TestRunsListPage } from "./pages/TestRunsListPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        {import.meta.env.DEV ? <Route path="dev/shell" element={<ShellDiagnosticsPage />} /> : null}
        {import.meta.env.DEV ? <Route path="e2e-throw" element={<E2eThrowRoute />} /> : null}
        <Route path="projects" element={<ProjectsListPage />} />
        <Route path="projects/:projectId/requirements/:requirementId" element={<RequirementDetailPage />} />
        <Route path="projects/:projectId/requirements" element={<RequirementsListPage />} />
        <Route path="projects/:projectId/test-cases/:testCaseId" element={<TestCaseDetailPage />} />
        <Route path="projects/:projectId/test-cases" element={<TestCasesListInlinePage />} />
        <Route path="projects/:projectId/runs/:runId" element={<RunDetailPage />} />
        <Route path="projects/:projectId/runs" element={<TestRunsListPage />} />
        <Route path="projects/:projectId/reporting" element={<ProjectReportingPage />} />
        <Route path="projects/:projectId/imports" element={<ProjectImportsPage />} />
        <Route path="projects/:projectId/design-links" element={<ProjectDesignLinksPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
      </Route>
    </Routes>
  );
}
