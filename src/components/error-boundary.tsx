'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SAAVNIFY Error Boundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    // Force reload the app
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#090909] text-white p-6">
          <div className="text-3xl font-extrabold text-[#1DB954] mb-4">SAAVNIFY</div>
          <div className="text-lg font-semibold mb-2">Something went wrong</div>
          <p className="text-sm text-[#B3B3B3] text-center mb-6 max-w-sm">
            The app encountered an unexpected error. This may be a temporary issue.
          </p>
          {this.state.error && (
            <p className="text-xs text-[#727272] text-center mb-4 max-w-sm font-mono">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReload}
            className="px-6 py-3 bg-[#1DB954] text-white rounded-full font-semibold hover:bg-[#1ed760] transition-colors"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
