import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Upload, Mail, Sparkles, FileEdit } from 'lucide-react'
import { useToastContext } from '../contexts/ToastContext'
import type { LeadStats, FullLead, LeadFilters } from '../../shared/types/leads'
import LeadsTable from '../components/leads/LeadsTable'
import LeadsFilters from '../components/leads/LeadsFilters'
import AddLeadModal from '../components/leads/AddLeadModal'
import ViewEditLeadModal from '../components/leads/ViewEditLeadModal'
import ConfirmModal from '../components/ConfirmModal'

export default function Leads() {
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [leads, setLeads] = useState<FullLead[]>([])
  const [loading, setLoading] = useState({ stats: false, leads: false })
  const [filters, setFilters] = useState<LeadFilters>({})
  const [pagination, setPagination] = useState({ page: 1, limit: 20 })
  const [modals, setModals] = useState({
    addLead: false,
    viewEditLead: null as FullLead | null,
    confirmDelete: null as FullLead | null
  })
  const [addLeadMode, setAddLeadMode] = useState<'intelligent' | 'manual'>('intelligent')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const toast = useToastContext()

  // Charger les statistiques
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

  // Charger les leads
  const loadLeads = useCallback(async () => {
    setLoading(prev => ({ ...prev, leads: true }))
    try {
      const result = await window.api.leads.list(filters, pagination)
      if (result.success) {
        setLeads(result.data.items)
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

  // Handlers pour les actions de la table
  const handleAddLead = (mode: 'intelligent' | 'manual' = 'intelligent') => {
    setAddLeadMode(mode)
    setModals({ addLead: true, viewEditLead: null, confirmDelete: null })
  }

  const handleViewLead = (lead: FullLead) => {
    setModals({ addLead: false, viewEditLead: lead, confirmDelete: null })
  }

  const handleEditLead = (lead: FullLead) => {
    setModals({ addLead: false, viewEditLead: lead, confirmDelete: null })
  }

  const handleDeleteLead = (lead: FullLead) => {
    setModals({ addLead: false, viewEditLead: null, confirmDelete: lead })
  }

  const confirmDelete = async () => {
    if (!modals.confirmDelete) return

    setDeleteLoading(true)
    const toastId = toast.loading('Suppression du lead...')

    try {
      const result = await window.api.leads.delete(modals.confirmDelete.id)

      if (result.success) {
        toast.update(toastId, { type: 'success', title: 'Lead supprimé avec succès' })
        loadLeads()
        loadStats()
        closeModals()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast.update(toastId, { type: 'error', title: 'Erreur lors de la suppression', message: String(error) })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleLeadCreated = () => {
    loadLeads()
    loadStats()
  }

  const closeModals = () => {
    setModals({ addLead: false, viewEditLead: null, confirmDelete: null })
  }

  const handleFiltersChange = (newFilters: LeadFilters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page when filtering
  }

  const handleResetFilters = () => {
    setFilters({})
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Leads</h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm">
            <Mail size={16} />
            Extraire Gmail
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm">
            <Upload size={16} />
            Importer
          </button>
          {/* Bouton split pour ajouter un lead */}
          <div className="inline-flex rounded-md overflow-hidden border border-neutral-300 dark:border-neutral-700">
            <button
              onClick={() => handleAddLead('intelligent')}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 text-sm transition-colors"
            >
              <Sparkles size={16} />
              Intelligent
            </button>
            <div className="w-px bg-neutral-300 dark:bg-neutral-700" />
            <button
              onClick={() => handleAddLead('manual')}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 text-sm transition-colors"
            >
              <FileEdit size={16} />
              Manuel
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Filtres */}
      <LeadsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      {/* Table des leads */}
      <LeadsTable
        leads={leads}
        loading={loading.leads}
        onAddLead={handleAddLead}
        onViewLead={handleViewLead}
        onEditLead={handleEditLead}
        onDeleteLead={handleDeleteLead}
      />

      {/* Modals */}
      <AddLeadModal
        isOpen={modals.addLead}
        initialMode={addLeadMode}
        onClose={closeModals}
        onLeadCreated={handleLeadCreated}
      />

      <ViewEditLeadModal
        lead={modals.viewEditLead}
        isOpen={!!modals.viewEditLead}
        onClose={closeModals}
        onDelete={handleDeleteLead}
        onLeadUpdated={handleLeadCreated}
      />

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={!!modals.confirmDelete}
        onClose={closeModals}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Supprimer le lead"
        message={`Êtes-vous sûr de vouloir supprimer le lead "${modals.confirmDelete?.contact.prenom} ${modals.confirmDelete?.contact.nom}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
      />
    </section>
  )
}
