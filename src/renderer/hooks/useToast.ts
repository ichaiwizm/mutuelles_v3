import React from 'react'
import { Toast, ToastType } from '../components/Toast'

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substr(2, 9)
    const toast: Toast = { id, type, title, message }
    setToasts(prev => [...prev, toast])
    return id
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = React.useCallback((title: string, message?: string) => {
    return addToast('success', title, message)
  }, [addToast])

  const error = React.useCallback((title: string, message?: string) => {
    return addToast('error', title, message)
  }, [addToast])

  const warning = React.useCallback((title: string, message?: string) => {
    return addToast('warning', title, message)
  }, [addToast])

  return {
    toasts,
    removeToast,
    success,
    error,
    warning
  }
}