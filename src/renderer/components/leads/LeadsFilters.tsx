import React from 'react'
import { Search, X } from 'lucide-react'
import type { LeadFilters } from '@shared/types/leads'

interface LeadsFiltersProps {
  filters: LeadFilters
  onFiltersChange: (filters: LeadFilters) => void
  onReset: () => void
}

export default function LeadsFilters({ filters, onFiltersChange, onReset }: LeadsFiltersProps) {
  const updateFilter = (key: keyof LeadFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const hasActiveFilters = Object.values(filters).some(value =>
    value !== undefined && value !== '' && value !== null
  )


  const providerOptions = [
    { value: 'assurprospect', label: 'AssurProspect' },
    { value: 'assurlead', label: 'Assurlead' },
    { value: 'generic', label: 'Générique' }
  ]

  return (
    <div className="space-y-4">
      {/* Recherche principale */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher un lead (nom, email, téléphone...)"
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 text-sm"
          >
            <X size={16} />
            Reset
          </button>
        )}
      </div>

      {/* Filtre provider simplifié */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">Provider:</span>
        <div className="flex gap-1">
          {providerOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateFilter('provider', filters.provider === option.value ? undefined : option.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filters.provider === option.value
                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}