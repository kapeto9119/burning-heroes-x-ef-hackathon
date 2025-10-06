'use client';

import { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full"
          >
            <div className="bg-gradient-to-br from-gray-900 to-black border border-red-500/20 rounded-2xl p-8 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white mb-2">
                  Something went wrong
                </h2>

                {/* Description */}
                <p className="text-white/70 mb-6">
                  We encountered an unexpected error. Please try refreshing the page.
                </p>

                {/* Error details (dev mode) */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="w-full mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
                    <p className="text-xs font-mono text-red-400 break-all">
                      {this.state.error.message}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 w-full">
                  <Button
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Page
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/'}
                    variant="outline"
                    className="flex-1 bg-white/5 border-white/20"
                  >
                    Go Home
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional error component for specific errors
export function ErrorMessage({ 
  title = 'Error',
  message,
  onRetry
}: { 
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-500/10 border border-red-500/20 rounded-xl p-6"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-400 mb-1">{title}</h3>
          <p className="text-sm text-red-300/80">{message}</p>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              className="mt-3 bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
