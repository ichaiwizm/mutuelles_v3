import React, { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import type { LeadFilters } from '../../../shared/types/leads'

interface LeadsFiltersProps {
  filters: LeadFilters
  onFiltersChange: (filters: LeadFilters) => void
  onReset: () => void
}

export default function LeadsFilters({ filters, onFiltersChange, onReset }: LeadsFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const updateFilter = (key: keyof LeadFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const hasActiveFilters = Object.values(filters).some(value =>
    value !== undefined && value !== '' && value !== null
  )

  return (
    <div className="space-y-3">
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

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
            showAdvanced
              ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900'
              : 'border-neutral-300 dark:border-neutral-700 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Filter size={16} />
          Filtres
        </button>

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

      {/* Filtres avancés */}
      {showAdvanced && (
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-md p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Source */}
            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <select
                value={filters.source || ''}
                onChange={(e) => updateFilter('source', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
              >
                <option value="">Toutes</option>
                <option value="gmail">Gmail</option>
                <option value="file">Fichier</option>
                <option value="manual">Manuel</option>
              </select>
            </div>

            {/* Provider */}
            <div>
              <label className="block text-sm font-medium mb-1">Provider</label>
              <select
                value={filters.provider || ''}
                onChange={(e) => updateFilter('provider', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
              >
                <option value="">Tous</option>
                <option value="assurprospect">AssurProspect</option>
                <option value="assurlead">Assurlead</option>
                <option value="generic">Générique</option>
              </select>
            </div>

            {/* Score minimum */}
            <div>
              <label className="block text-sm font-medium mb-1">Score min</label>
              <select
                value={filters.minScore || ''}
                onChange={(e) => updateFilter('minScore', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
              >
                <option value="">Tous</option>
                <option value="8">Excellent (8+)</option>
                <option value="5">Bon (5+)</option>
                <option value="3">Acceptable (3+)</option>
                <option value="1">Faible (1+)</option>
              </select>
            </div>

            {/* Statut plateforme */}
            <div>
              <label className="block text-sm font-medium mb-1">Statut</label>
              <select
                value={filters.status || ''}
                onChange={(e) => updateFilter('status', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
              >
                <option value="">Tous</option>
                <option value="pending">En attente</option>
                <option value="processing">En cours</option>
                <option value="completed">Terminé</option>
                <option value="error">Erreur</option>
              </select>
            </div>
          </div>

          {/* Filtres de date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Date de début</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date de fin</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
              />
            </div>
          </div>

          {/* Résumé des filtres actifs */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-neutral-500">Filtres actifs:</span>
                {filters.search && (
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                    "{filters.search}"
                  </span>
                )}
                {filters.source && (
                  <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded">
                    {filters.source}
                  </span>
                )}
                {filters.provider && (
                  <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded">
                    {filters.provider}
                  </span>
                )}
                {filters.minScore && (
                  <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded">
                    Score ≥{filters.minScore}
                  </span>
                )}
                {filters.status && (
                  <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
                    {filters.status}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}