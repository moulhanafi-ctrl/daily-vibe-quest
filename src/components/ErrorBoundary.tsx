import * as Sentry from "@sentry/react";
import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <h1 className="text-xl font-semibold">Something went wrong</h1>
            </div>
            
            <p className="text-muted-foreground">
              We're sorry, but something unexpected happened. Our team has been notified and will look into it.
            </p>

            {this.state.error && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Technical details
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleReset} className="flex-1">
                Return to Home
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Reload Page
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default Sentry.withErrorBoundary(ErrorBoundary, {
  fallback: <div>An error has occurred</div>,
  showDialog: false,
});
