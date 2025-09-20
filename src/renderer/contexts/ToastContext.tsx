import React from 'react'
import { useToast } from '../hooks/useToast'
import ToastContainer from '../components/Toast'

interface ToastContextType {
  success: (title: string, message?: string, opts?: { duration?: number }) => string
  error: (title: string, message?: string, opts?: { duration?: number }) => string
  warning: (title: string, message?: string, opts?: { duration?: number }) => string
  info: (title: string, message?: string, opts?: { duration?: number }) => string
  loading: (title: string, message?: string) => string
  update: (id: string, patch: { type?: 'success'|'error'|'warning'|'info'; title?: string; message?: string; duration?: number }) => void
  close: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast, updateToast, success, error, warning, info, loading } = useToast()

  return (
    <ToastContext.Provider value={{ success, error, warning, info, loading, update: updateToast, close: removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
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
