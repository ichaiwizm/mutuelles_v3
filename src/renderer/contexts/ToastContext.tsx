import React from 'react'
import { useToast } from '../hooks/useToast'

interface ToastContextType {
  success: (title: string, message?: string) => string
  error: (title: string, message?: string) => string
  warning: (title: string, message?: string) => string
}

const ToastContext = React.createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast, success, error, warning } = useToast()

  return (
    <ToastContext.Provider value={{ success, error, warning }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-3">
        {toasts.map(toast => (
          <div key={toast.id} className={`rounded-md border p-3 shadow-lg max-w-md animate-in slide-in-from-right ${
            toast.type === 'success' ? 'border-green-300 bg-green-50 text-green-800' :
            toast.type === 'error' ? 'border-red-300 bg-red-50 text-red-800' :
            'border-amber-300 bg-amber-50 text-amber-800'
          }`}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{toast.title}</div>
                {toast.message && <div className="mt-1 text-sm opacity-90">{toast.message}</div>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-black/10"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}