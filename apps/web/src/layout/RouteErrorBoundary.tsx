import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Paragraph, YStack } from "tamagui";

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
          <YStack gap="$3" padding="$2">
            <Paragraph fontSize="$6" fontWeight="700" margin={0} color="$color12">
              Something went wrong
            </Paragraph>
            <Paragraph margin={0} data-testid="route-error-message" color="$color11">
              {this.state.error.message}
            </Paragraph>
            <Paragraph margin={0} size="$3" color="$color10">
              You can go home and try again.
            </Paragraph>
            <Button
              size="$3"
              data-testid="route-error-retry"
              onPress={() => {
                this.setState({ hasError: false, error: null });
                window.location.assign("/projects");
              }}
            >
              Go home
            </Button>
          </YStack>
        </section>
      );
    }
    return this.props.children;
  }
}
