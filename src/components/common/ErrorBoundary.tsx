import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F5EF] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-[#E5E7EB] p-8 sm:p-10 shadow-lg text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <span className="text-[11px] font-bold font-mono uppercase tracking-widest text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              System Notice
            </span>

            <h1 className="mt-4 text-2xl font-extrabold text-[#111827] tracking-tight uppercase">
              SOMETHING WENT WRONG
            </h1>

            <p className="mt-3 text-sm text-[#4B5563] leading-relaxed">
              Please refresh the page or contact the organizers.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={this.handleReload}
                leftIcon={<RotateCcw className="w-4 h-4" />}
                className="w-full sm:w-auto font-bold"
              >
                Refresh Page
              </Button>
              <Button
                to="/"
                variant="secondary"
                size="md"
                className="w-full sm:w-auto bg-white"
              >
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
