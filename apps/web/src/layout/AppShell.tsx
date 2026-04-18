import { Link, Outlet } from "react-router-dom";
import { ProjectPicker } from "../components/ProjectPicker";
import "../App.css";
import { useShellErrors } from "../shell/ShellErrorsContext";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import "./AppShell.css";

export function AppShell() {
  const { transportMessage, payloadAppError } = useShellErrors();

  return (
    <div className="app" data-testid="app-root">
      <a href="#main-content" className="skip-to-main" data-testid="skip-to-main">
        Skip to main content
      </a>
      <header className="app-header">
        <h1>TCMS</h1>
        <p className="tagline">Local Test Case Management</p>
      </header>

      {transportMessage !== null && (
        <div className="shell-banner err" role="alert" data-testid="shell-transport-error">
          {transportMessage}
        </div>
      )}

      {payloadAppError !== null && (
        <div className="shell-banner app-error-panel" role="alert" data-testid="shell-app-error">
          <div className="app-error-code" data-testid="shell-app-error-code">
            {payloadAppError.code}
          </div>
          <p className="app-error-message" data-testid="shell-app-error-message">
            {payloadAppError.message}
          </p>
          <p className="app-error-fixhint" data-testid="shell-app-error-fixhint">
            {payloadAppError.fixHint}
          </p>
          {payloadAppError.context != null && payloadAppError.context !== "" && (
            <pre className="app-error-context" data-testid="shell-app-error-context">
              {payloadAppError.context}
            </pre>
          )}
        </div>
      )}

      <div className="app-nav-row">
        <nav className="app-nav" aria-label="Main">
          <Link to="/" data-testid="nav-home">
            Home
          </Link>
          <Link to="/projects" data-testid="nav-projects">
            Projects
          </Link>
        </nav>
        <ProjectPicker />
      </div>

      <main id="main-content" className="app-main" tabIndex={-1}>
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
    </div>
  );
}
