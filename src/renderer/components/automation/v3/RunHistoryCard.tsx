import React, { useEffect, useMemo, useState } from 'react'
import { RefreshCw, ChevronDown, Trash2, CheckCircle2, CheckCircle, AlertCircle, XCircle, StopCircle } from 'lucide-react'
import type { RunHistoryItem, ExecutionHistoryItem } from '../../../../shared/types/automation'
import { formatRelativeTime, formatDuration } from '../../../utils/dateGrouping'
import HistoryItemCard from './HistoryItemCard'

interface RunHistoryCardProps {
  run: RunHistoryItem
  onRerun: (runId: string) => void
  onRerunItem: (item: ExecutionHistoryItem) => void
  onDelete: (runId: string) => void
  onViewDetails?: (
    runId: string,
    itemId: string,
    runDir: string,
    leadName: string,
    platformName: string,
    flowName: string
  ) => void
}

export default function RunHistoryCard({
  run,
  onRerun,
  onRerunItem,
  onDelete,
  onViewDetails
}: RunHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [items, setItems] = useState<ExecutionHistoryItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const getStatusConfig = () => {
    switch (run.status) {
      case 'completed':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950',
          borderColor: 'border-emerald-200 dark:border-emerald-800',
          label: 'Succès complet',
          progressColor: 'bg-emerald-600'
        }
      case 'partial':
        const successRate = run.totalItems > 0 ? (run.successItems / run.totalItems) * 100 : 0
        if (successRate >= 50) {
          return {
            icon: CheckCircle,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-950',
            borderColor: 'border-blue-200 dark:border-blue-800',
            label: 'Succès partiel',
            progressColor: 'bg-blue-600'
          }
        } else {
          return {
            icon: AlertCircle,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-50 dark:bg-amber-950',
            borderColor: 'border-amber-200 dark:border-amber-800',
            label: 'Échec partiel',
            progressColor: 'bg-amber-600'
          }
        }
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950',
          borderColor: 'border-red-200 dark:border-red-800',
          label: 'Échec total',
          progressColor: 'bg-red-600'
        }
      case 'stopped':
        return {
          icon: StopCircle,
          color: 'text-neutral-600 dark:text-neutral-400',
          bgColor: 'bg-neutral-50 dark:bg-neutral-950',
          borderColor: 'border-neutral-200 dark:border-neutral-800',
          label: 'Arrêté',
          progressColor: 'bg-neutral-600'
        }
    }
  }

  const config = getStatusConfig()
  const StatusIcon = config.icon
  const successRate = run.totalItems > 0 ? Math.round((run.successItems / run.totalItems) * 100) : 0

  const handleRerun = () => {
    onRerun(run.runId)
  }

  const handleDelete = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette run de l\'historique ?')) {
      onDelete(run.runId)
    }
  }

  // Lazy-load items when expanding for the first time
  useEffect(() => {
    let cancelled = false
    const loadItems = async () => {
      if (!isExpanded) return
      if (items && items.length > 0) return
      setLoadingItems(true)
      setLoadError(null)
      try {
        const resp = await window.api.scenarios.getRunItems(run.runId)
        if (!resp?.success || !Array.isArray(resp.data)) {
          throw new Error(resp?.error || 'Réponse invalide')
        }
        const mapped: ExecutionHistoryItem[] = resp.data.map((row: any) => ({
          id: row.id,
          leadId: row.lead_id || '',
          leadName: row.lead_name || row.lead_id || '',
          platform: row.platform,
          platformName: row.platform_name || row.platform,
          flowSlug: row.flow_slug || '',
          flowName: row.flow_name || row.flow_slug || '',
          status: row.status,
          runDir: row.run_dir || undefined,
          error: row.error_message || undefined,
          startedAt: row.started_at || '',
          completedAt: row.completed_at || undefined,
          durationMs: row.duration_ms || undefined
        }))
        if (!cancelled) setItems(mapped)
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || String(e))
      } finally {
        if (!cancelled) setLoadingItems(false)
      }
    }
    void loadItems()
    return () => { cancelled = true }
  }, [isExpanded])

  const displayedCount = useMemo(() => {
    if (items && items.length >= 0) return items.length
    return run.totalItems || 0
  }, [items, run.totalItems])

  return (
    <div
      className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3 transition-all hover:shadow-md`}
      style={{ animation: 'fadeInScale 0.2s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <StatusIcon size={16} className={`flex-shrink-0 mt-0.5 ${config.color}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm">{config.label}</h4>
              <span className="text-xs text-neutral-500">
                {formatRelativeTime(run.startedAt)} • {formatDuration(run.durationMs)}
              </span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {run.totalItems} exécution{run.totalItems > 1 ? 's' : ''}
              {run.successItems > 0 && (
                <span className="ml-1">• {run.successItems} réussie{run.successItems > 1 ? 's' : ''}</span>
              )}
              {run.errorItems > 0 && (
                <span className="ml-1">• {run.errorItems} échouée{run.errorItems > 1 ? 's' : ''}</span>
              )}
              {run.cancelledItems > 0 && (
                <span className="ml-1">• {run.cancelledItems} annulé{run.cancelledItems > 1 ? 's' : ''}</span>
              )}
              {run.pendingItems > 0 && (
                <span className="ml-1">• {run.pendingItems} en attente</span>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleRerun}
            className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-800 transition-colors group"
            title="Relancer la run"
          >
            <RefreshCw size={16} className="text-neutral-600 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-800 transition-colors"
            title={isExpanded ? 'Masquer les détails' : 'Voir les détails'}
          >
            <ChevronDown
              size={16}
              className={`text-neutral-600 dark:text-neutral-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-800 transition-colors group"
            title="Supprimer de l'historique"
          >
            <Trash2 size={16} className="text-neutral-600 dark:text-neutral-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1.5">
          <span>Progression</span>
          <span className={`font-semibold ${config.color}`}>{successRate}%</span>
        </div>
        <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.progressColor} transition-all duration-300 rounded-full`}
            style={{ width: `${successRate}%` }}
          />
        </div>
      </div>

      {/* Expanded items */}
      {isExpanded && (
        <div
          className="space-y-2 pt-3 border-t border-neutral-200 dark:border-neutral-800"
          style={{ animation: 'slideIn 0.2s ease-out' }}
        >
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
              Exécutions ({displayedCount})
            </h5>
            <span className="text-xs text-neutral-500">
              Run ID: {run.runId.slice(0, 8)}
            </span>
          </div>
          {loadingItems && (
            <p className="text-xs text-neutral-500">Chargement…</p>
          )}
          {loadError && (
            <p className="text-xs text-red-500">Erreur lors du chargement: {loadError}</p>
          )}
          {!loadingItems && !loadError && items && items.length === 0 && (
            <p className="text-xs text-neutral-500">Aucune exécution</p>
          )}
          {!loadingItems && !loadError && items && items.length > 0 && (
            <>
              {items.map((item) => (
                <HistoryItemCard
                  key={item.id}
                  runId={run.runId}
                  item={item}
                  onRerun={onRerunItem}
                  onViewDetails={onViewDetails}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
