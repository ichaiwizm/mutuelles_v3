import React from 'react'

type Props = { children: React.ReactNode }

export default class ErrorBoundary extends React.Component<Props, { error?: Error }> {
  state: { error?: Error } = {}

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Renderer error:', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="p-4">
        <div className="rounded-md border border-red-300 bg-red-50 text-red-800 p-3">
          <div className="font-semibold mb-1">Une erreur est survenue</div>
          <div className="text-sm whitespace-pre-wrap">{String(error.message || error)}</div>
          <button
            className="mt-3 px-3 py-1.5 rounded-md border border-neutral-300"
            onClick={() => this.setState({ error: undefined })}
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }
}

