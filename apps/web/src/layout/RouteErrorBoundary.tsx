import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = {
  hasError: boolean;
  error: Error | null;
};

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Route render error", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error !== null) {
      return (
        <section className="projects-page" data-testid="route-error-boundary">
          <h2>Something went wrong</h2>
          <p data-testid="route-error-message">{this.state.error.message}</p>
          <p className="hint">You can go home and try again.</p>
          <button
            type="button"
            data-testid="route-error-retry"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.assign("/");
            }}
          >
            Go home
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
