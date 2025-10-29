import React, { useState, useEffect, useCallback } from 'react'
import { FileEdit, Mail } from 'lucide-react'
import { useToastContext } from '../contexts/ToastContext'
import type { LeadStats, Lead, LeadFilters } from '../../shared/types/leads'
import LeadsTable from '../components/leads/LeadsTable'
import LeadsFilters from '../components/leads/LeadsFilters'
import ConfirmModal from '../components/ConfirmModal'
import LeadModal from '@renderer/components/leads/LeadModal'
import { ImportPanel } from '../components/import-panel/ImportPanel'

export default function Leads() {
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState({ stats: false, leads: false })
  const [filters, setFilters] = useState<LeadFilters>({})
  const [pagination, setPagination] = useState({ page: 1, limit: 20 })
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 })
  const [confirmDelete, setConfirmDelete] = useState<Lead | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [leadModalMode, setLeadModalMode] = useState<'create' | 'view' | 'edit'>('create')
  const [showLeadModal, setShowLeadModal] = useState(false)

  const [showImportPanel, setShowImportPanel] = useState(false)

  // Sélection pour suppression multiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toast = useToastContext()

  const loadStats = useCallback(async () => {
    setLoading(prev => ({ ...prev, stats: true }))
    try {
      const result = await window.api.leads.stats()
      if (result.success) {
        setStats(result.data)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques', String(error))
    } finally {
      setLoading(prev => ({ ...prev, stats: false }))
    }
  }, [toast])

  const loadLeads = useCallback(async () => {
    setLoading(prev => ({ ...prev, leads: true }))
    try {
      const result = await window.api.leads.list(filters, pagination)
      if (result.success) {
        setLeads(result.data.items)
        setMeta({ total: result.data.total, totalPages: result.data.totalPages })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des leads', String(error))
    } finally {
      setLoading(prev => ({ ...prev, leads: false }))
    }
  }, [filters, pagination, toast])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  const handleAddLead = () => {
    setSelectedLead(null)
    setLeadModalMode('create')
    setShowLeadModal(true)
  }

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead)
    setLeadModalMode('view')
    setShowLeadModal(true)
  }

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead)
    setLeadModalMode('edit')
    setShowLeadModal(true)
  }

  const handleDeleteLead = (lead: Lead) => {
    setConfirmDelete(lead)
  }

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return

    setDeleteLoading(true)
    const toastId = toast.loading('Suppression du lead...')

    try {
      const result = await window.api.leads.delete(confirmDelete.id)

      if (result.success) {
        toast.update(toastId, { type: 'success', title: 'Lead supprimé avec succès' })
        loadLeads()
        loadStats()
        setConfirmDelete(null)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast.update(toastId, { type: 'error', title: 'Erreur lors de la suppression', message: String(error) })
    } finally {
      setDeleteLoading(false)
    }
  }

  const closeModals = () => {
    setConfirmDelete(null)
  }

  const toggleLeadSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)))
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Supprimer ${selectedIds.size} lead(s) ?`)) return
    const toastId = toast.loading('Suppression des leads...')
    try {
      const result = await window.api.leads.deleteMany(Array.from(selectedIds))
      if (result.success) {
        toast.update(toastId, { type: 'success', title: 'Suppression effectuée' })
        clearSelection()
        loadLeads()
        loadStats()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast.update(toastId, { type: 'error', title: 'Erreur suppression', message: String(error) })
    }
  }

  const handleFiltersChange = (newFilters: LeadFilters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleResetFilters = () => {
    setFilters({})
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const goToPage = (p: number) => {
    setPagination(prev => ({ ...prev, page: Math.max(1, Math.min(p, meta.totalPages)) }))
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Leads</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportPanel(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm transition-colors border border-gray-300 dark:border-gray-600"
            title="Importer des leads par email"
          >
            <Mail size={16} />
            Importer
          </button>
          <button
            onClick={handleAddLead}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 text-sm transition-colors"
          >
            <FileEdit size={16} />
            Ajouter un lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
          <div className="text-2xl font-bold">
            {loading.stats ? '...' : stats?.total || 0}
          </div>
          <div className="text-sm text-neutral-500">Total</div>
        </div>
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
          <div className="text-2xl font-bold">
            {loading.stats ? '...' : stats?.new || 0}
          </div>
          <div className="text-sm text-neutral-500">Nouveaux</div>
        </div>
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
          <div className="text-2xl font-bold">
            {loading.stats ? '...' : stats?.processed || 0}
          </div>
          <div className="text-sm text-neutral-500">Traités</div>
        </div>
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
          <div className="text-2xl font-bold">
            {loading.stats ? '...' : stats?.processing || 0}
          </div>
          <div className="text-sm text-neutral-500">En cours</div>
        </div>
      </div>

      <LeadsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      <LeadsTable
        leads={leads}
        loading={loading.leads}
        onAddLead={handleAddLead}
        onViewLead={handleViewLead}
        onEditLead={handleEditLead}
        onDeleteLead={handleDeleteLead}
        selectedIds={selectedIds}
        onToggleLead={toggleLeadSelection}
        onToggleAll={toggleSelectAll}
        onDeleteSelected={handleDeleteSelected}
      />

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-neutral-500">
            Total {meta.total} leads
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={pagination.page === 1}
              className="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-50"
              title="Première page"
            >
              «
            </button>
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-50"
              title="Page précédente"
            >
              Préc.
            </button>
            <span className="text-xs">
              Page {pagination.page} / {meta.totalPages}
            </span>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= meta.totalPages}
              className="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-50"
              title="Page suivante"
            >
              Suiv.
            </button>
            <button
              onClick={() => goToPage(meta.totalPages)}
              disabled={pagination.page >= meta.totalPages}
              className="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-50"
              title="Dernière page"
            >
              »
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={closeModals}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Supprimer le lead"
        message={`Êtes-vous sûr de vouloir supprimer le lead "${confirmDelete?.data.subscriber?.firstName || ''} ${confirmDelete?.data.subscriber?.lastName || ''}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
      />

      <LeadModal
        mode={leadModalMode}
        lead={selectedLead || undefined}
        isOpen={showLeadModal}
        onClose={() => {
          setShowLeadModal(false)
          setSelectedLead(null)
        }}
        onSuccess={() => {
          loadLeads()
          loadStats()
          setShowLeadModal(false)
          setSelectedLead(null)
        }}
      />

      <ImportPanel
        isOpen={showImportPanel}
        onClose={() => setShowImportPanel(false)}
        onCreated={() => {
          setShowImportPanel(false)
          loadLeads()
          loadStats()
        }}
      />
    </section>
  )
}
