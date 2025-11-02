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

function ToastComponent({ id, type, title, message, duration, onClose }: ToastComponentProps) {
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
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)
  React.useEffect(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    const d = duration !== undefined ? duration : (type === 'info' ? 0 : 5000)
    if (d && d > 0) {
      timerRef.current = setTimeout(() => onClose(id), d)
      return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    }
  }, [id, type, duration, onClose])

  // Forcer le recalcul du timer si le type change (loading → success/error)
  const prevTypeRef = React.useRef(type)
  React.useEffect(() => {
    if (prevTypeRef.current !== type) {
      prevTypeRef.current = type
      // Le useEffect précédent se déclenchera automatiquement car `type` est dans ses dépendances
    }
  }, [type])

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
