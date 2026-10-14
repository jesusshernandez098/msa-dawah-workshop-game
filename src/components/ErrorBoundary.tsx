import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.hash = '#/';
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback-container" role="alert">
          <div className="error-fallback-card">
            <AlertCircle size={48} className="icon-destructive" aria-hidden="true" />
            <h2>Something went wrong</h2>
            <p>
              An unexpected error occurred. You can return to the main page or reload the session.
            </p>
            {this.state.error?.message && (
              <pre className="error-fallback-details">{this.state.error.message}</pre>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={this.handleReset}
            >
              <RefreshCw size={18} />
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
