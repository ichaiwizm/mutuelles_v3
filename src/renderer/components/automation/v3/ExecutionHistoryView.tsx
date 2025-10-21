import React, { useState, useMemo } from 'react'
import ExecutionHistoryFoldersView from './ExecutionHistoryFoldersView'
import HistoryFilters from './HistoryFilters'
import RunDetailsModal from './RunDetailsModal'
import type { RunHistoryItem, ExecutionHistoryItem } from '../../../../shared/types/automation'
import type { HistoryFilterState } from './HistoryFilters'
import { getDateGroup } from '../../../utils/dateGrouping'
import { useRunDetails } from '../../../hooks/useRunDetails'
import { useConfirmation } from '../../../hooks/useConfirmation'

interface ExecutionHistoryViewProps {
  runHistory: RunHistoryItem[]
  onRerunHistory: (runId: string) => void
  onRerunHistoryItem: (item: ExecutionHistoryItem) => void
  onDeleteHistory: (runId: string) => void
}

/**
 * Displays the execution history with filtering capabilities
 */
export default function ExecutionHistoryView({
  runHistory,
  onRerunHistory,
  onRerunHistoryItem,
  onDeleteHistory
}: ExecutionHistoryViewProps) {
  // History filters
  const [historyFilters, setHistoryFilters] = useState<HistoryFilterState>({
    searchQuery: '',
    statusFilter: 'all',
    dateFilter: 'all'
  })

  const { selectedRunDetails, handleViewDetails, clearDetails } = useRunDetails()
  const { confirm } = useConfirmation()

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

  // Clear history removed - filesystem-based history cannot be bulk-deleted from UI
  // Individual runs can still be deleted via onDeleteHistory

  return (
    <div className="space-y-4">
      {/* Filters */}
      <HistoryFilters
        filters={historyFilters}
        onFiltersChange={setHistoryFilters}
        totalRuns={runHistory.length}
        filteredRuns={filteredHistory.length}
      />

      {/* History list */}
      <ExecutionHistoryFoldersView
        runs={filteredHistory}
        onRerun={onRerunHistory}
        onRerunItem={onRerunHistoryItem}
        onDelete={onDeleteHistory}
        onViewDetails={handleViewDetails}
      />

      {/* Details Modal */}
      {selectedRunDetails && (
        <RunDetailsModal
          runDir={selectedRunDetails.runDir}
          leadName={selectedRunDetails.leadName}
          platformName={selectedRunDetails.platformName}
          flowName={selectedRunDetails.flowName}
          onClose={clearDetails}
        />
      )}
    </div>
  )
}
