import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Upload, Mail } from 'lucide-react'
import { useToastContext } from '../contexts/ToastContext'
import type { LeadStats, FullLead, LeadFilters } from '../../shared/types/leads'
import LeadsTable from '../components/leads/LeadsTable'
import LeadsFilters from '../components/leads/LeadsFilters'
import AddLeadModal from '../components/leads/AddLeadModal'
import EditLeadModal from '../components/leads/EditLeadModal'
import LeadDetailModal from '../components/leads/LeadDetailModal'
import ConfirmModal from '../components/ConfirmModal'

export default function Leads() {
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [leads, setLeads] = useState<FullLead[]>([])
  const [loading, setLoading] = useState({ stats: false, leads: false })
  const [filters, setFilters] = useState<LeadFilters>({})
  const [pagination, setPagination] = useState({ page: 1, limit: 20 })
  const [modals, setModals] = useState({
    addLead: false,
    editLead: null as FullLead | null,
    detailLead: null as FullLead | null,
    confirmDelete: null as FullLead | null
  })
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
  const handleAddLead = () => {
    setModals(prev => ({ ...prev, addLead: true }))
  }

  const handleViewLead = (lead: FullLead) => {
    setModals(prev => ({ ...prev, detailLead: lead }))
  }

  const handleEditLead = (lead: FullLead) => {
    setModals(prev => ({ ...prev, editLead: lead }))
  }

  const handleDeleteLead = (lead: FullLead) => {
    setModals(prev => ({ ...prev, confirmDelete: lead }))
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
    setModals({ addLead: false, editLead: null, detailLead: null, confirmDelete: null })
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
          <button
            onClick={handleAddLead}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-sm"
          >
            <Plus size={16} />
            Ajouter
          </button>
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
        onClose={closeModals}
        onLeadCreated={handleLeadCreated}
      />

      <EditLeadModal
        lead={modals.editLead}
        isOpen={!!modals.editLead}
        onClose={closeModals}
        onLeadUpdated={handleLeadCreated}
      />

      <LeadDetailModal
        lead={modals.detailLead}
        isOpen={!!modals.detailLead}
        onClose={closeModals}
        onEdit={handleEditLead}
        onDelete={handleDeleteLead}
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