import { useState, useCallback, useMemo } from 'react'
import type { EnrichedLeadData } from '../../../../../shared/types/emailParsing'

/**
 * Hook pour gérer la sélection des leads dans la preview
 * Gère automatiquement le filtrage des leads incomplets
 */
export function useLeadSelection(leads: EnrichedLeadData[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Filtre les leads complets (ont tous les champs critiques)
  const completeLeads = useMemo(
    () => leads.filter((lead) => lead.validationStatus === 'valid'),
    [leads]
  )

  const completeLeadIds = useMemo(
    () => new Set(completeLeads.map((lead) => lead.metadata.emailId)),
    [completeLeads]
  )

  // Sélectionne tous les leads complets
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(completeLeadIds))
  }, [completeLeadIds])

  // Désélectionne tous
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Toggle un lead individuel
  const toggle = useCallback((leadId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(leadId)) {
        next.delete(leadId)
      } else {
        next.add(leadId)
      }
      return next
    })
  }, [])

  // Vérifie si un lead est sélectionné
  const isSelected = useCallback(
    (leadId: string) => selectedIds.has(leadId),
    [selectedIds]
  )

  // Vérifie si un lead est complet (sélectionnable)
  const isComplete = useCallback(
    (leadId: string) => completeLeadIds.has(leadId),
    [completeLeadIds]
  )

  // Récupère les leads sélectionnés
  const getSelectedLeads = useCallback(() => {
    return leads.filter((lead) =>
      selectedIds.has(lead.metadata.emailId)
    )
  }, [leads, selectedIds])

  // Permet de remplacer entièrement la sélection (utile après déduplication)
  const updateSelected = useCallback((ids: Set<string>) => {
    setSelectedIds(new Set(ids))
  }, [])

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    completeCount: completeLeads.length,
    totalCount: leads.length,
    selectAll,
    deselectAll,
    toggle,
    isSelected,
    isComplete,
    getSelectedLeads,
    updateSelected
  }
}
