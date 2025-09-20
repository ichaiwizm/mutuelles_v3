import React from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, AlertCircle, X, Info, Loader2 } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number // ms; 0 = persistant
}

interface ToastComponentProps extends Toast {
  onClose: (id: string) => void
}

function ToastComponent({ id, type, title, message, onClose }: ToastComponentProps) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info
  }

  const styles = {
    success: 'border-green-300 bg-green-50 text-green-800',
    error: 'border-red-300 bg-red-50 text-red-800',
    warning: 'border-amber-300 bg-amber-50 text-amber-800',
    info: 'border-blue-300 bg-blue-50 text-blue-800'
  }

  const Icon = icons[type]

  // Auto-fermeture configurable; 0 = persistant
  const durationRef = React.useRef<number | undefined>()
  const [duration, setDuration] = React.useState<number | undefined>(undefined)
  React.useEffect(() => { setDuration((window as any).__toastDurationMap?.[id]) }, [id])
  React.useEffect(() => {
    const d = duration ?? 5000
    durationRef.current = d
    if (d && d > 0) {
      const timer = setTimeout(() => onClose(id), d)
      return () => clearTimeout(timer)
    }
  }, [id, onClose, duration])

  return (
    <div className={`rounded-md border p-3 shadow-lg ${styles[type]} max-w-md animate-in slide-in-from-right`}>
      <div className="flex items-start gap-3">
        {type === 'info' ? <Loader2 size={20} className="mt-0.5 flex-shrink-0 animate-spin" /> : <Icon size={20} className="mt-0.5 flex-shrink-0" />}
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
  if (typeof document === 'undefined') return null
  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[9999] space-y-3 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastComponent {...toast} onClose={onClose} />
        </div>
      ))}
    </div>,
    document.body
  )
}
