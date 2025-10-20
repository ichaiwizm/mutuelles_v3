import React, { useMemo, useState, useEffect } from 'react'
import { Play, Square, Activity, Grid3x3, FolderKanban } from 'lucide-react'
import ExecutionItemCard from './ExecutionItemCard'
import ExecutionFoldersView from './ExecutionFoldersView'
import type { ExecutionItem } from '../../../hooks/useAutomation'
import type { GroupingMode } from '../../../utils/executionGrouping'

interface ExecutionDashboardProps {
  runId: string
  executionItems: Map<string, ExecutionItem>
  onStopExecution?: () => void
}

export default function ExecutionDashboard({
  runId,
  executionItems,
  onStopExecution
}: ExecutionDashboardProps) {
  const items = useMemo(() => Array.from(executionItems.values()), [executionItems])

  // View mode: grid or folders (with localStorage persistence)
  const [viewMode, setViewMode] = useState<'grid' | 'folders'>(() => {
    const saved = localStorage.getItem('executionViewMode')
    return (saved === 'grid' || saved === 'folders') ? saved : 'grid'
  })

  const [groupingMode, setGroupingMode] = useState<GroupingMode>(() => {
    const saved = localStorage.getItem('executionGroupingMode')
    return (saved === 'flow' || saved === 'platform' || saved === 'status') ? saved : 'flow'
  })

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('executionViewMode', viewMode)
  }, [viewMode])

  // Persist grouping mode
  useEffect(() => {
    localStorage.setItem('executionGroupingMode', groupingMode)
  }, [groupingMode])

  // Auto-switch to folders view when items >= 6
  useEffect(() => {
    if (items.length >= 6 && viewMode === 'grid') {
      setViewMode('folders')
    }
  }, [items.length])

  const stats = useMemo(() => {
    const total = items.length
    const pending = items.filter(i => i.status === 'pending').length
    const running = items.filter(i => i.status === 'running').length
    const success = items.filter(i => i.status === 'success').length
    const error = items.filter(i => i.status === 'error').length
    const completed = success + error

    return {
      total,
      pending,
      running,
      success,
      error,
      completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }, [items])

  const handleOpenFolder = async (runDir: string) => {
    try {
      await window.api.scenarios.openPath(runDir)
    } catch (error) {
      console.error('Failed to open folder:', error)
    }
  }

  if (!runId || items.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-600 dark:text-blue-400" size={20} />
            <div>
              <h3 className="font-semibold">Exécution en cours</h3>
              <div className="text-xs text-neutral-500">Run ID: {runId.slice(0, 8)}...</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            {items.length > 0 && (
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-md p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                  title="Vue grille"
                >
                  <Grid3x3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode('folders')}
                  className={`p-1.5 rounded transition-all ${
                    viewMode === 'folders'
                      ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                  title="Vue dossiers"
                >
                  <FolderKanban size={16} />
                </button>
              </div>
            )}

            {stats.running > 0 && onStopExecution && (
              <button
                onClick={onStopExecution}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                <Square size={16} />
                Arrêter tout
              </button>
            )}
          </div>
        </div>

        {/* Global Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="font-medium">Progression globale</span>
              <span className="text-neutral-500">
                {stats.completed} / {stats.total} exécutions
              </span>
            </div>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {stats.progress}%
            </span>
          </div>

          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 rounded-full"
              style={{ width: `${stats.progress}%` }}
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="text-center p-2 rounded bg-neutral-50 dark:bg-neutral-800">
              <div className="text-lg font-bold text-neutral-600 dark:text-neutral-400">
                {stats.pending}
              </div>
              <div className="text-xs text-neutral-500">En attente</div>
            </div>
            <div className="text-center p-2 rounded bg-blue-50 dark:bg-blue-950">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {stats.running}
              </div>
              <div className="text-xs text-neutral-500">En cours</div>
            </div>
            <div className="text-center p-2 rounded bg-emerald-50 dark:bg-emerald-950">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {stats.success}
              </div>
              <div className="text-xs text-neutral-500">Réussis</div>
            </div>
            <div className="text-center p-2 rounded bg-red-50 dark:bg-red-950">
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {stats.error}
              </div>
              <div className="text-xs text-neutral-500">Échoués</div>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Items - Grid or Folders View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ExecutionItemCard
              key={item.id}
              item={item}
              onOpenFolder={item.runDir ? () => handleOpenFolder(item.runDir!) : undefined}
            />
          ))}
        </div>
      ) : (
        <ExecutionFoldersView
          items={items}
          groupingMode={groupingMode}
          onGroupingModeChange={setGroupingMode}
          onOpenFolder={handleOpenFolder}
        />
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
          <Play className="mx-auto mb-3 text-neutral-400" size={48} />
          <h3 className="font-semibold mb-1">Aucune exécution</h3>
          <p className="text-sm text-neutral-500">
            Les exécutions apparaîtront ici une fois démarrées
          </p>
        </div>
      )}
    </div>
  )
}
