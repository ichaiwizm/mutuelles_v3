import React from 'react'
import Button from './Button'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  loading = false
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 max-w-md w-full mx-4 shadow-lg">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">{message}</p>

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button onClick={onConfirm} variant="danger" loading={loading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}