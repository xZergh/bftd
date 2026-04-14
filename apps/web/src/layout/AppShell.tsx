import { Link, Outlet } from "react-router-dom";
import "../App.css";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./AppShell.css";

export function AppShell() {
  const { transportMessage, payloadAppError } = useShellErrors();

  return (
    <div className="app" data-testid="app-root">
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

      <nav className="app-nav" aria-label="Main">
        <Link to="/" data-testid="nav-home">
          Home
        </Link>
        <Link to="/projects" data-testid="nav-projects">
          Projects
        </Link>
      </nav>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
