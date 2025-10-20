import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { useFlowFiltering } from '../../../hooks/automation/useFlowFiltering'
import FlowPlatformList from './FlowPlatformList'
import type { Platform, Flow, AdvancedSettings } from '../../../hooks/useAutomation'

interface FlowsBrowserPanelProps {
  platforms: Platform[]
  flows: Flow[]
  selectedFlowIds: Set<string>
  onToggleFlow: (flowId: string) => void
  onTogglePlatform: (platformSlug: string) => void
  onSelectAllFlows: () => void
  onClearFlowSelection: () => void
  onViewFlow: (flow: Flow) => void
  settings?: AdvancedSettings
}

export default function FlowsBrowserPanel({
  platforms,
  flows,
  selectedFlowIds,
  onToggleFlow,
  onTogglePlatform,
  onSelectAllFlows,
  onClearFlowSelection,
  onViewFlow,
  settings
}: FlowsBrowserPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Use flow filtering hook
  const {
    visiblePlatforms,
    visibleFlows,
    filteredFlows,
    flowsByPlatform,
    hiddenButSelectedFlows,
    getDefaultFlow
  } = useFlowFiltering(platforms, flows, searchQuery, settings, selectedFlowIds)

  // Select all checkbox state
  const allSelected = visibleFlows.length > 0 && visibleFlows.every(flow => selectedFlowIds.has(flow.slug))
  const someSelected = visibleFlows.some(flow => selectedFlowIds.has(flow.slug)) && !allSelected

  const handleToggleAll = () => {
    if (allSelected) {
      onClearFlowSelection()
    } else {
      onSelectAllFlows()
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Flows par Plateforme</h3>
        <div className="text-sm text-neutral-500">
          {selectedFlowIds.size} / {flows.length} sélectionnés
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          size={16}
        />
        <input
          type="text"
          placeholder="Rechercher un flow..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Select All Checkbox */}
      <label className="flex items-center gap-2 mb-3 pb-3 border-b border-neutral-200 dark:border-neutral-800 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 -mx-2 px-2 py-1 rounded">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected
          }}
          onChange={handleToggleAll}
          className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm font-medium">
          {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
        </span>
      </label>

      {/* Platform List */}
      <FlowPlatformList
        platforms={visiblePlatforms}
        flowsByPlatform={flowsByPlatform}
        selectedFlowIds={selectedFlowIds}
        onToggleFlow={onToggleFlow}
        onTogglePlatform={onTogglePlatform}
        onViewFlow={onViewFlow}
        getDefaultFlow={getDefaultFlow}
        hiddenButSelectedFlows={hiddenButSelectedFlows}
      />

      {/* Search Results Info */}
      {searchQuery && filteredFlows.length < flows.length && (
        <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 text-center">
          {filteredFlows.length} sur {flows.length} flows affichés
        </div>
      )}
    </div>
  )
}
