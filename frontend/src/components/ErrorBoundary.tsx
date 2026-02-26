import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console — never log sensitive auth data
    console.error('[ErrorBoundary] Unhandled render error:', error, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center gap-6 font-mono p-8"
        >
          <p className="text-[#ff4444] text-[13px] text-center max-w-md">
            ⚠ Something went wrong. The application encountered an unexpected error.
          </p>
          {this.state.error && (
            <p className="text-[#555] text-[11px] text-center max-w-md break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReload}
            className="font-pixel text-[8px] px-4 py-2 border-2 border-[#00ff88] text-[#00ff88] bg-transparent hover:bg-[#00ff88] hover:text-[#0f0f0f] motion-safe:transition-colors focus:outline focus:outline-1 focus:outline-[#00ff88]"
            aria-label="Reload the application"
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
