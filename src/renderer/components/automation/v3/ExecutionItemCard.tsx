import React from 'react'
import { Eye, Square, FolderOpen, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'
import type { ExecutionItem } from '../../../hooks/useAutomation'

interface ExecutionItemCardProps {
  item: ExecutionItem
  onOpenFolder?: () => void
  onStop?: () => void
  onMakeVisible?: () => void
}

export default function ExecutionItemCard({
  item,
  onOpenFolder,
  onStop,
  onMakeVisible
}: ExecutionItemCardProps) {
  const getDuration = () => {
    if (!item.startedAt) return null
    const endTime = item.completedAt ? new Date(item.completedAt).getTime() : Date.now()
    const startTime = new Date(item.startedAt).getTime()
    const durationMs = endTime - startTime
    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${seconds}s`
  }

  const getStatusConfig = () => {
    switch (item.status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-neutral-500',
          bgColor: 'bg-neutral-100 dark:bg-neutral-800',
          borderColor: 'border-neutral-200 dark:border-neutral-700',
          label: 'En attente'
        }
      case 'running':
        return {
          icon: Loader2,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950',
          borderColor: 'border-blue-200 dark:border-blue-800',
          label: 'En cours',
          spin: true
        }
      case 'success':
        return {
          icon: CheckCircle,
          color: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950',
          borderColor: 'border-emerald-200 dark:border-emerald-800',
          label: 'Réussi'
        }
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950',
          borderColor: 'border-red-200 dark:border-red-800',
          label: 'Échoué'
        }
    }
  }

  const config = getStatusConfig()
  const StatusIcon = config.icon
  const duration = getDuration()
  const progress = item.currentStep && item.totalSteps
    ? Math.round((item.currentStep / item.totalSteps) * 100)
    : 0

  return (
    <div
      className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4 transition-all`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon
              size={16}
              className={`${config.color} ${config.spin ? 'animate-spin' : ''}`}
            />
            <span className={`text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
          </div>
          <h4 className="font-semibold text-sm truncate">{item.leadName}</h4>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
            <span>{item.platformName}</span>
            {item.flowName && (
              <>
                <span>•</span>
                <span className="truncate">{item.flowName}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {item.status === 'running' && onMakeVisible && (
            <button
              onClick={onMakeVisible}
              title="Rendre visible"
              className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-800 transition-colors"
            >
              <Eye size={16} className="text-neutral-600 dark:text-neutral-400" />
            </button>
          )}
          {item.status === 'running' && onStop && (
            <button
              onClick={onStop}
              title="Arrêter"
              className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-800 transition-colors"
            >
              <Square size={16} className="text-neutral-600 dark:text-neutral-400" />
            </button>
          )}
          {(item.status === 'success' || item.status === 'error') && item.runDir && onOpenFolder && (
            <button
              onClick={onOpenFolder}
              title="Ouvrir le dossier"
              className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-800 transition-colors"
            >
              <FolderOpen size={16} className="text-neutral-600 dark:text-neutral-400" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {item.status === 'running' && item.totalSteps && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1.5">
            <span>
              Étape {item.currentStep || 0} / {item.totalSteps}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Duration */}
      {duration && (
        <div className="text-xs text-neutral-500">
          Durée: {duration}
        </div>
      )}

      {/* Error Message */}
      {item.status === 'error' && item.message && (
        <div className="mt-2 p-2 rounded bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800">
          <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
            Erreur:
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 break-words">
            {item.message}
          </div>
        </div>
      )}
    </div>
  )
}
