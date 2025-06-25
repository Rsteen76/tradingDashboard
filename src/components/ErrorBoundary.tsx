import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  componentName?: string
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Component Error Boundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })
    
    // Log to external service if needed
    // errorReporting.logError(error, errorInfo, this.props.componentName)
  }

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 m-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <h3 className="text-red-400 font-semibold">
              Component Error {this.props.componentName ? `in ${this.props.componentName}` : ''}
            </h3>
          </div>
          
          <div className="text-sm text-gray-300 mb-3">
            Something went wrong with this component. The error has been logged.
          </div>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
              <summary className="cursor-pointer mb-2 text-red-400">Error Details (Development)</summary>
              <div className="whitespace-pre-wrap font-mono">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </div>
            </details>
          )}
          
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined, errorInfo: undefined })
              window.location.reload()
            }}
            className="mt-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component wrapper for easier usage
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string,
  fallback?: ReactNode
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary componentName={componentName} fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return WithErrorBoundaryComponent
}

// Specialized error boundary for trading components
export function TradingErrorBoundary({ children, componentName }: { children: ReactNode, componentName?: string }) {
  return (
    <ErrorBoundary
      componentName={componentName}
      fallback={
        <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 m-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-orange-400 font-medium">Trading Component Unavailable</span>
          </div>
          <div className="text-sm text-gray-300">
            This trading component encountered an error. Trading functionality may be impacted.
          </div>
          <div className="text-xs text-orange-400 mt-2">
            ⚠️ Check console for details or reload the page
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
} 