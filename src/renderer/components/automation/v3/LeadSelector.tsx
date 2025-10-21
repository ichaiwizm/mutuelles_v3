import React, { useState, useMemo } from 'react'
import { Search, Check, User, Clock } from 'lucide-react'
import type { Lead } from '../../../hooks/useAutomation'
import type { RunHistoryItem } from '../../../../shared/types/automation'

interface LeadSelectorProps {
  leads: Lead[]
  selectedLeadIds: Set<string>
  onToggleLead: (leadId: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  getLeadName: (leadId: string) => string
  selectedFlowSlugs?: string[]
  runHistory?: RunHistoryItem[]
}

type FilterType = 'all' | 'recent'

export default function LeadSelector({
  leads,
  selectedLeadIds,
  onToggleLead,
  onSelectAll,
  onClearSelection,
  getLeadName,
  selectedFlowSlugs = [],
  runHistory = []
}: LeadSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  // Get recent leads (last 7 days)
  const recentLeads = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    return leads.filter(lead => {
      if (!lead.createdAt) return false
      const createdAt = new Date(lead.createdAt)
      return createdAt >= sevenDaysAgo
    })
  }, [leads])

  // Apply filter based on active filter type
  const baseFilteredLeads = useMemo(() => {
    switch (activeFilter) {
      case 'recent':
        return recentLeads
      default:
        return leads
    }
  }, [leads, recentLeads, activeFilter])

  // Filter leads by search query
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return baseFilteredLeads

    const query = searchQuery.toLowerCase()
    return baseFilteredLeads.filter(lead => {
      const name = getLeadName(lead.id).toLowerCase()
      const email = lead.data?.subscriber?.email?.toLowerCase() || ''
      const phone = lead.data?.subscriber?.telephone || ''
      return name.includes(query) || email.includes(query) || phone.includes(query)
    })
  }, [baseFilteredLeads, searchQuery, getLeadName])

  const allSelected = filteredLeads.length > 0 && filteredLeads.every(lead => selectedLeadIds.has(lead.id))
  const someSelected = filteredLeads.some(lead => selectedLeadIds.has(lead.id)) && !allSelected

  const handleToggleAll = () => {
    if (allSelected) {
      onClearSelection()
    } else {
      onSelectAll()
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <User size={18} />
          Leads
        </h3>
        <div className="text-sm text-neutral-500">
          {selectedLeadIds.size} / {leads.length} sélectionnés
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeFilter === 'all'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          Tous ({leads.length})
        </button>

        <button
          onClick={() => setActiveFilter('recent')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeFilter === 'recent'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Clock size={14} />
          Récents ({recentLeads.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
        <input
          type="text"
          placeholder="Rechercher par nom, email, téléphone..."
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

      {/* Lead List */}
      <div className="max-h-96 overflow-y-auto space-y-1">
        {filteredLeads.length === 0 ? (
          <div className="text-sm text-neutral-500 text-center py-8">
            {searchQuery ? 'Aucun lead trouvé' : 'Aucun lead disponible'}
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const isSelected = selectedLeadIds.has(lead.id)

            return (
              <label
                key={lead.id}
                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-transparent'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleLead(lead.id)}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {getLeadName(lead.id)}
                  </div>
                  {lead.data?.subscriber?.email && (
                    <div className="text-xs text-neutral-500 truncate">
                      {lead.data.subscriber.email}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <Check size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                )}
              </label>
            )
          })
        )}
      </div>

      {searchQuery && filteredLeads.length < leads.length && (
        <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 text-center">
          {filteredLeads.length} sur {leads.length} leads affichés
        </div>
      )}
    </div>
  )
}
