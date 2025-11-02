/**
 * Status Styles Utility
 * Centralized configuration for execution status colors, icons, and labels
 */

import { Clock, Loader2, CheckCircle, XCircle, CheckCircle2, AlertCircle, StopCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface StatusConfig {
  icon: LucideIcon
  color: string
  bgColor: string
  borderColor: string
  label: string
  pulse?: boolean
  spin?: boolean
  progressColor?: string
}

/**
 * Get status configuration for execution items
 * Used in ExecutionItemCard and similar components
 */
export function getExecutionStatusConfig(
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
): StatusConfig {
  const configs: Record<string, StatusConfig> = {
    pending: {
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
      borderColor: 'border-amber-200 dark:border-amber-800',
      label: 'En file d\'attente',
      pulse: true
    },
    running: {
      icon: Loader2,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800',
      label: 'En cours',
      spin: true
    },
    success: {
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      label: 'Réussi'
    },
    error: {
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-200 dark:border-red-800',
      label: 'Échoué'
    },
    cancelled: {
      icon: StopCircle,
      color: 'text-neutral-600 dark:text-neutral-400',
      bgColor: 'bg-neutral-50 dark:bg-neutral-950',
      borderColor: 'border-neutral-200 dark:border-neutral-800',
      label: 'Annulé'
    }
  }

  return configs[status] || configs.pending
}

/**
 * Get status configuration for history items
 * Used in HistoryItemCard
 */
export function getHistoryStatusConfig(
  status: 'success' | 'error' | 'pending' | 'cancelled'
): Omit<StatusConfig, 'label'> {
  return getExecutionStatusConfig(status)
}

