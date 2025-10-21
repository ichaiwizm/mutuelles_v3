/**
 * useConfirmation Hook
 * Utility hook for standardized confirmation dialogs
 */

import { useCallback } from 'react'

export interface UseConfirmationResult {
  confirm: (message: string, onConfirm: () => void) => void
}

/**
 * Hook to manage confirmation dialogs
 * Provides a standardized way to show confirmation dialogs
 * Used in RunHistoryCard, ExecutionHistoryView, and similar components
 */
export function useConfirmation(): UseConfirmationResult {
  const confirm = useCallback((message: string, onConfirm: () => void) => {
    if (window.confirm(message)) {
      onConfirm()
    }
  }, [])

  return { confirm }
}
