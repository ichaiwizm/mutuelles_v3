import React, { useState, useMemo } from 'react'
import ExecutionHistoryFoldersView from './ExecutionHistoryFoldersView'
import HistoryFilters from './HistoryFilters'
import type { RunHistoryItem, ExecutionHistoryItem } from '../../../../shared/types/automation'
import type { HistoryFilterState } from './HistoryFilters'
import { getDateGroup } from '../../../utils/dateGrouping'

interface ExecutionHistoryViewProps {
  runHistory: RunHistoryItem[]
  onRerunHistory: (runId: string) => void
  onRerunHistoryItem: (item: ExecutionHistoryItem) => void
  onDeleteHistory: (runId: string) => void
  onClearAllHistory: () => void
  onOpenFolder: (runDir: string) => void
  onViewManifest: (runDir: string) => void
}

/**
 * Displays the execution history with filtering capabilities
 */
export default function ExecutionHistoryView({
  runHistory,
  onRerunHistory,
  onRerunHistoryItem,
  onDeleteHistory,
  onClearAllHistory,
  onOpenFolder,
  onViewManifest
}: ExecutionHistoryViewProps) {
  // History filters
  const [historyFilters, setHistoryFilters] = useState<HistoryFilterState>({
    searchQuery: '',
    statusFilter: 'all',
    dateFilter: 'all'
  })

  // Filtered history
  const filteredHistory = useMemo(() => {
    let filtered = runHistory

    // Search filter
    if (historyFilters.searchQuery) {
      const query = historyFilters.searchQuery.toLowerCase()
      filtered = filtered.filter(run =>
        run.items.some((item: ExecutionHistoryItem) => item.leadName.toLowerCase().includes(query))
      )
    }

    // Status filter
    if (historyFilters.statusFilter !== 'all') {
      filtered = filtered.filter(run => run.status === historyFilters.statusFilter)
    }

    // Date filter
    if (historyFilters.dateFilter !== 'all') {
      filtered = filtered.filter(run => getDateGroup(run.startedAt) === historyFilters.dateFilter)
    }

    return filtered
  }, [runHistory, historyFilters])

  const handleClearHistory = () => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer tout l'historique (${runHistory.length} runs) ?`)) {
      onClearAllHistory()
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <HistoryFilters
        filters={historyFilters}
        onFiltersChange={setHistoryFilters}
        onClearHistory={handleClearHistory}
        totalRuns={runHistory.length}
        filteredRuns={filteredHistory.length}
      />

      {/* History list */}
      <ExecutionHistoryFoldersView
        runs={filteredHistory}
        onRerun={onRerunHistory}
        onRerunItem={onRerunHistoryItem}
        onDelete={onDeleteHistory}
        onOpenFolder={onOpenFolder}
        onViewManifest={onViewManifest}
      />
    </div>
  )
}
