import React, { useState } from 'react'
import { Search, Filter, X, Trash2, ChevronDown } from 'lucide-react'
import type { RunHistoryStatus } from '../../../../shared/types/automation'
import type { DateGroupKey } from '../../../utils/dateGrouping'

export interface HistoryFilterState {
  searchQuery: string
  statusFilter: RunHistoryStatus | 'all'
  dateFilter: DateGroupKey | 'all'
}

interface HistoryFiltersProps {
  filters: HistoryFilterState
  onFiltersChange: (filters: HistoryFilterState) => void
  totalRuns: number
  filteredRuns: number
  onDeleteAll?: () => void
}

export default function HistoryFilters({
  filters,
  onFiltersChange,
  totalRuns,
  filteredRuns,
  onDeleteAll
}: HistoryFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchQuery: value })
  }

  const handleStatusChange = (status: RunHistoryStatus | 'all') => {
    onFiltersChange({ ...filters, statusFilter: status })
  }

  const handleDateChange = (date: DateGroupKey | 'all') => {
    onFiltersChange({ ...filters, dateFilter: date })
  }

  const handleReset = () => {
    onFiltersChange({
      searchQuery: '',
      statusFilter: 'all',
      dateFilter: 'all'
    })
  }

  const hasActiveFilters = filters.searchQuery !== '' || filters.statusFilter !== 'all' || filters.dateFilter !== 'all'

  return (
    <div className="space-y-3">
      {/* Top row: Search and actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher par nom de lead..."
            className="w-full pl-10 pr-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-md transition-colors ${
            showFilters || hasActiveFilters
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
              : 'border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Filter size={16} />
          Filtres
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 dark:bg-blue-500 text-white rounded-full">
              {[filters.searchQuery !== '', filters.statusFilter !== 'all', filters.dateFilter !== 'all'].filter(Boolean).length}
            </span>
          )}
          <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* Delete All button */}
        {totalRuns > 0 && onDeleteAll && (
          <button
            onClick={onDeleteAll}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            title="Supprimer tout l'historique"
          >
            <Trash2 size={16} />
            Tout supprimer
          </button>
        )}
      </div>

      {/* Filter options (collapsible) */}
      {showFilters && (
        <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 space-y-4">
          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Statut
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Tous', color: 'neutral' },
                { value: 'completed', label: 'Succès complets', color: 'emerald' },
                { value: 'partial', label: 'Partiels', color: 'blue' },
                { value: 'failed', label: 'Échecs', color: 'red' },
                { value: 'stopped', label: 'Arrêtés', color: 'neutral' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value as RunHistoryStatus | 'all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    filters.statusFilter === option.value
                      ? option.color === 'emerald'
                        ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : option.color === 'blue'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                        : option.color === 'red'
                        ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700'
                      : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Période
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Toutes' },
                { value: 'today', label: "Aujourd'hui" },
                { value: 'yesterday', label: 'Hier' },
                { value: 'thisWeek', label: 'Cette semaine' },
                { value: 'thisMonth', label: 'Ce mois' },
                { value: 'older', label: 'Plus ancien' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleDateChange(option.value as DateGroupKey | 'all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    filters.dateFilter === option.value
                      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                      : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <div className="flex justify-end pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                <X size={14} />
                Réinitialiser
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="text-xs text-neutral-500">
        {hasActiveFilters ? (
          <span>
            {filteredRuns} run{filteredRuns > 1 ? 's' : ''} trouvée{filteredRuns > 1 ? 's' : ''} sur {totalRuns}
          </span>
        ) : (
          <span>
            {totalRuns} run{totalRuns > 1 ? 's' : ''} au total
          </span>
        )}
      </div>
    </div>
  )
}
