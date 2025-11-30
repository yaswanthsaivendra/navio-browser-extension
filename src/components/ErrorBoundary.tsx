import { Component, ErrorInfo, ReactNode } from "react"

import { logError } from "~/utils/errors"
import { logger } from "~/utils/logger"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component to catch React rendering errors
 * Prevents the entire UI from crashing when a component throws
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console and error tracking
    logger.error("React Error Boundary caught error", error, {
      componentStack: errorInfo.componentStack,
    })

    logError(error, {
      context: "react-error-boundary",
      componentStack: errorInfo.componentStack,
    })

    // Call optional error callback
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI or default error message
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <h2 className="mb-2 text-lg font-semibold text-red-600">
            Something went wrong
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={this.handleReset}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
