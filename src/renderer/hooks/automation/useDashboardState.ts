import { useState, useEffect, useMemo } from 'react'
import type { ExecutionItem } from '../../hooks/useAutomation'
import type { GroupingMode } from '../../utils/executionGrouping'
import { calculateExecutionStats } from '../../utils/executionStats'

export type DashboardMode = 'current' | 'history'
export type ViewMode = 'grid' | 'folders'

interface UseDashboardStateProps {
  items: ExecutionItem[]
  isRunning: boolean
  onModeChange?: (newMode: DashboardMode, previousMode: DashboardMode) => void
}

interface DashboardState {
  mode: DashboardMode
  viewMode: ViewMode
  groupingMode: GroupingMode
  setMode: (mode: DashboardMode) => void
  setViewMode: (mode: ViewMode) => void
  setGroupingMode: (mode: GroupingMode) => void
  currentStats: {
    total: number
    pending: number
    running: number
    success: number
    error: number
    completed: number
    progress: number
  }
  showCurrent: boolean
  showHistory: boolean
  isRunning: boolean
}

/**
 * Hook to manage ExecutionDashboard state with localStorage persistence
 * and auto-switching logic
 */
export function useDashboardState({
  items,
  isRunning,
  onModeChange
}: UseDashboardStateProps): DashboardState {
  // Dashboard mode (current, history)
  const [mode, setMode] = useState<DashboardMode>(() => {
    const saved = localStorage.getItem('executionDashboardMode')
    return (saved === 'current' || saved === 'history') ? saved : 'current'
  })

  // View mode: grid or folders (with localStorage persistence)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('executionViewMode')
    return (saved === 'grid' || saved === 'folders') ? saved : 'grid'
  })

  // Grouping mode for folders view
  const [groupingMode, setGroupingMode] = useState<GroupingMode>(() => {
    const saved = localStorage.getItem('executionGroupingMode')
    return (saved === 'flow' || saved === 'platform' || saved === 'status') ? saved : 'flow'
  })

  // Persist mode to localStorage and trigger callback on change
  useEffect(() => {
    const previousMode = localStorage.getItem('executionDashboardMode') as DashboardMode | null
    localStorage.setItem('executionDashboardMode', mode)

    // Trigger callback if mode changed
    if (previousMode && previousMode !== mode && onModeChange) {
      onModeChange(mode, previousMode)
    }
  }, [mode, onModeChange])

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem('executionViewMode', viewMode)
  }, [viewMode])

  // Persist grouping mode to localStorage
  useEffect(() => {
    localStorage.setItem('executionGroupingMode', groupingMode)
  }, [groupingMode])

  // Auto-switching has been removed to give users full control
  // Users can manually switch between 'current' and 'history' modes

  // Current run stats
  const currentStats = useMemo(() => calculateExecutionStats(items), [items])

  return {
    mode,
    viewMode,
    groupingMode,
    setMode,
    setViewMode,
    setGroupingMode,
    currentStats,
    showCurrent: mode === 'current',
    showHistory: mode === 'history',
    isRunning
  }
}
