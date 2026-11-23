import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application boundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9F7] text-[#18181B] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#E7E2D8] rounded-xl p-8">
            <h2 className="font-display text-2xl font-semibold text-[#18181B]">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-[#52525B] leading-relaxed">
              We encountered an error syncing with the bakery data service. Your local bag and cached menu remain safe.
            </p>
            <pre className="mt-4 p-3 bg-[#F4F3EF] border border-[#E7E2D8] rounded-lg text-xs font-mono text-[#3F3F46] overflow-x-auto max-h-40">
              {this.state.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 text-sm font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534] transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
