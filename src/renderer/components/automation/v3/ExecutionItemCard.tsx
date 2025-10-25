import React, { useMemo } from 'react'
import { Eye, RotateCcw, Square, Minimize2, Maximize2, Pause, Play } from 'lucide-react'
import type { ExecutionItem } from '../../../hooks/useAutomation'
import { useNow } from '../../../hooks/useNow'
import { getExecutionStatusConfig } from '../../../utils/statusStyles'
import { formatDuration } from '../../../utils/dateGrouping'
import TimeEstimator from './TimeEstimator'

interface ExecutionItemCardProps {
  item: ExecutionItem
  onViewDetails?: (runId: string, itemId: string, runDir: string, leadName: string, platformName: string, flowName: string) => void
  onRetryItem?: (itemId: string) => void
  isRunning?: boolean
  estimatedDurationMs?: number // Optional estimated duration for pending items
  onStopItem?: (itemId: string) => void
  onTogglePauseItem?: (itemId: string) => void
}

export default function ExecutionItemCard({
  item,
  onViewDetails,
  onRetryItem,
  isRunning = false,
  estimatedDurationMs,
  onStopItem,
  onTogglePauseItem
}: ExecutionItemCardProps) {
  // Use useNow hook to update timestamp every second (instead of forcing re-render every 200ms)
  const now = useNow(
    item.status === 'running' || item.status === 'pending',
    1000 // Update every 1 second instead of 200ms = 80% reduction in re-renders
  )

  const duration = useMemo(() => {
    if (!item.startedAt) return null
    const endTime = item.completedAt ? new Date(item.completedAt).getTime() : now
    const startTime = new Date(item.startedAt).getTime()
    const durationMs = endTime - startTime
    return formatDuration(durationMs)
  }, [item.startedAt, item.completedAt, now])

  const config = useMemo(() => getExecutionStatusConfig(item.status), [item.status])

  const StatusIcon = config.icon

  // Window state (best-effort, only for headed modes)
  const [winState, setWinState] = React.useState<'visible' | 'minimized' | null>(null)
  React.useEffect(() => {
    let canceled = false
    const fetchState = async () => {
      if (!isRunning) return
      try {
        const resp = await window.api.scenarios.window.getState(item.runId, item.id)
        if (!canceled && resp?.success) {
          const s = resp.state === 'minimized' ? 'minimized' : resp.state ? 'visible' : null
          setWinState(s)
        }
      } catch {}
    }
    fetchState()
    const t = setInterval(fetchState, 2500)
    return () => { canceled = true; clearInterval(t) }
  }, [item.id, item.runId, isRunning])

  const minimizeWin = async () => {
    try {
      const r = await window.api.scenarios.window.minimize(item.runId, item.id)
      if (r?.success) setWinState('minimized')
    } catch {}
  }
  const restoreWin = async () => {
    try {
      const r = await window.api.scenarios.window.restore(item.runId, item.id)
      if (r?.success) setWinState('visible')
    } catch {}
  }

  const progress = useMemo(
    () =>
      item.currentStep && item.totalSteps
        ? Math.round((item.currentStep / item.totalSteps) * 100)
        : 0,
    [item.currentStep, item.totalSteps]
  )

  return (
    <div
      className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3 transition-all`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon
              size={16}
              className={`${config.color} ${config.spin ? 'animate-spin' : ''} ${config.pulse ? 'animate-pulse' : ''}`}
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
          {/* Pause/Resume toggle (UI-only, not a persisted status) */}
          {isRunning && onTogglePauseItem && (item.status === 'running' || item.status === 'pending' || item.isPaused) && (
            <button
              onClick={() => onTogglePauseItem(item.id)}
              title={item.isPaused ? 'Reprendre' : 'Mettre en pause'}
              className="p-1.5 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group"
            >
              {item.isPaused ? (
                <Play size={16} className="text-neutral-700 dark:text-neutral-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              ) : (
                <Pause size={16} className="text-neutral-700 dark:text-neutral-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              )}
            </button>
          )}
          {/* Window toggle (headed modes only): one button on/off */}
          {isRunning && winState !== null && (item.status === 'running' || item.status === 'pending') && (
            <button
              onClick={async () => {
                if (winState === 'minimized') await restoreWin(); else await minimizeWin()
              }}
              title={winState === 'minimized' ? 'Afficher la fenêtre' : 'Réduire la fenêtre'}
              className="p-1.5 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group"
            >
              {winState === 'minimized' ? (
                <Maximize2 size={16} className="text-neutral-600 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              ) : (
                <Minimize2 size={16} className="text-neutral-600 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              )}
            </button>
          )}
          {/* Stop single item - visible for pending/running during active run */}
          {(isRunning && onStopItem && (item.status === 'pending' || item.status === 'running')) && (
            <button
              onClick={() => onStopItem(item.id)}
              title="Arrêter l'exécution de cet item"
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950 transition-colors group"
            >
              <Square size={16} className="text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors" />
            </button>
          )}
          {/* Retry button - visible only for errors during active run */}
  {(item.status === 'error') && isRunning && onRetryItem && (
            <button
              onClick={() => onRetryItem(item.id)}
              title="Réessayer"
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950 transition-colors group"
            >
              <RotateCcw size={16} className="text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors" />
            </button>
          )}

          {/* View details button */}
      {(item.status === 'success' || item.status === 'error' || item.status === 'cancelled') && item.runDir && onViewDetails && (
            <button
              onClick={() => onViewDetails(item.runId, item.id, item.runDir!, item.leadName, item.platformName, item.flowName || '')}
              title="Voir les détails"
              className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-800 transition-colors group"
            >
              <Eye size={16} className="text-neutral-600 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
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

      {/* Duration or Status Message */}
      {item.status === 'pending' ? (
        <div className="space-y-1">
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            En attente de démarrage...
          </div>
          {winState && (
            <div className="text-xs text-neutral-500">Fenêtre: {winState === 'minimized' ? 'minimisée' : 'visible'}</div>
          )}
          {estimatedDurationMs && (
            <TimeEstimator durationMs={estimatedDurationMs} />
          )}
        </div>
      ) : duration ? (
        <div className="text-xs text-neutral-500">
          Durée: {duration}
          {winState && (
            <span className="ml-2">• Fenêtre: {winState === 'minimized' ? 'minimisée' : 'visible'}</span>
          )}
          {item.isPaused && (
            <span className="ml-2 text-neutral-600 dark:text-neutral-400">• En pause</span>
          )}
        </div>
      ) : null}

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
