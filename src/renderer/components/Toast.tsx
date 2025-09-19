import React from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastComponentProps extends Toast {
  onClose: (id: string) => void
}

function ToastComponent({ id, type, title, message, onClose }: ToastComponentProps) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle
  }

  const styles = {
    success: 'border-green-300 bg-green-50 text-green-800',
    error: 'border-red-300 bg-red-50 text-red-800',
    warning: 'border-amber-300 bg-amber-50 text-amber-800'
  }

  const Icon = icons[type]

  React.useEffect(() => {
    const timer = setTimeout(() => onClose(id), 5000)
    return () => clearTimeout(timer)
  }, [id, onClose])

  return (
    <div className={`rounded-md border p-3 shadow-lg ${styles[type]} max-w-md animate-in slide-in-from-right`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className="mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium">{title}</div>
          {message && <div className="mt-1 text-sm opacity-90">{message}</div>}
        </div>
        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onClose: (id: string) => void
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {toasts.map(toast => (
        <ToastComponent key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  )
}