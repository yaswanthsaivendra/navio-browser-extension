import { Component, ReactNode } from "react"

import { logError } from "~/utils/errors"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: unknown): void {
    logError(error, { errorInfo })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 16,
            minWidth: 300,
            textAlign: "center",
          }}>
          <h2>Something went wrong</h2>
          <p>Please reload the extension or contact support.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined })
            }}>
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
