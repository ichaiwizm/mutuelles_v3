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
  status: 'pending' | 'running' | 'success' | 'error'
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
    }
  }

  return configs[status] || configs.pending
}

/**
 * Get status configuration for history items
 * Used in HistoryItemCard
 */
export function getHistoryStatusConfig(
  status: 'success' | 'error' | 'pending'
): Omit<StatusConfig, 'label'> {
  return getExecutionStatusConfig(status)
}

/**
 * Get status configuration for run history
 * Used in RunHistoryCard
 */
export function getRunHistoryStatusConfig(
  status: 'completed' | 'partial' | 'failed' | 'stopped',
  successRate?: number
): StatusConfig {
  const configs: Record<string, StatusConfig> = {
    completed: {
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      label: 'Succès complet',
      progressColor: 'bg-emerald-600'
    },
    partial: {
      icon: CheckCircle,
      // Color depends on success rate
      color: successRate && successRate >= 0.7
        ? 'text-blue-600 dark:text-blue-400'
        : successRate && successRate >= 0.5
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-orange-600 dark:text-orange-400',
      bgColor: successRate && successRate >= 0.7
        ? 'bg-blue-50 dark:bg-blue-950'
        : successRate && successRate >= 0.5
        ? 'bg-amber-50 dark:bg-amber-950'
        : 'bg-orange-50 dark:bg-orange-950',
      borderColor: successRate && successRate >= 0.7
        ? 'border-blue-200 dark:border-blue-800'
        : successRate && successRate >= 0.5
        ? 'border-amber-200 dark:border-amber-800'
        : 'border-orange-200 dark:border-orange-800',
      label: 'Succès partiel',
      progressColor: successRate && successRate >= 0.7
        ? 'bg-blue-600'
        : successRate && successRate >= 0.5
        ? 'bg-amber-600'
        : 'bg-orange-600'
    },
    failed: {
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-200 dark:border-red-800',
      label: 'Échec total',
      progressColor: 'bg-red-600'
    },
    stopped: {
      icon: StopCircle,
      color: 'text-neutral-600 dark:text-neutral-400',
      bgColor: 'bg-neutral-50 dark:bg-neutral-950',
      borderColor: 'border-neutral-200 dark:border-neutral-800',
      label: 'Arrêté',
      progressColor: 'bg-neutral-600'
    }
  }

  return configs[status] || configs.completed
}
