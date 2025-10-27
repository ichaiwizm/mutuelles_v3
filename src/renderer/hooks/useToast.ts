import React from 'react'
import { Toast, ToastType } from '../components/Toast'

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((type: ToastType, title: string, message?: string, opts?: { duration?: number; id?: string }) => {
    const id = opts?.id ?? Math.random().toString(36).substr(2, 9)
    const toast: Toast = { id, type, title, message, duration: opts?.duration }
    const MAX = 4
    setToasts(prev => {
      const next = [...prev, toast]
      if (next.length <= MAX) return next
      const idx = next.findIndex(t => t.duration !== 0 && t.type !== 'info')
      if (idx !== -1) next.splice(idx, 1)
      while (next.length > MAX) next.shift()
      return next
    })
    ;(window as any).__toastDurationMap = { ...(window as any).__toastDurationMap, [id]: opts?.duration }
    return id
  }, [])

  const updateToast = React.useCallback((id: string, patch: Partial<Omit<Toast, 'id'>>) => {
    setToasts(prev => prev.map(t => {
      if (t.id !== id) return t

      const needsDefaultDuration = t.type === 'info' && t.duration === 0 && patch.type && patch.type !== 'info' && patch.duration === undefined

      return {
        ...t,
        ...patch,
        duration: needsDefaultDuration ? 1000 : (patch.duration !== undefined ? patch.duration : t.duration)
      }
    }))
    if (patch.duration !== undefined) {
      (window as any).__toastDurationMap = { ...(window as any).__toastDurationMap, [id]: patch.duration }
    }
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = React.useCallback((title: string, message?: string, opts?: { duration?: number }) => addToast('success', title, message, opts), [addToast])
  const error = React.useCallback((title: string, message?: string, opts?: { duration?: number }) => addToast('error', title, message, opts), [addToast])
  const warning = React.useCallback((title: string, message?: string, opts?: { duration?: number }) => addToast('warning', title, message, opts), [addToast])
  const info = React.useCallback((title: string, message?: string, opts?: { duration?: number }) => addToast('info', title, message, opts), [addToast])

  const loading = React.useCallback((title: string, message?: string) => addToast('info', title, message, { duration: 0 }), [addToast])

  return { toasts, removeToast, updateToast, success, error, warning, info, loading }
}
