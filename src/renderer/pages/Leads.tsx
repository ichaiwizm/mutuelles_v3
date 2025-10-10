import React, { useState, useEffect, useCallback } from 'react'
import { Upload, Mail, Sparkles, FileEdit } from 'lucide-react'
import { useToastContext } from '../contexts/ToastContext'
import type { LeadStats, Lead, LeadFilters } from '../../shared/types/leads'
import LeadsTable from '../components/leads/LeadsTable'
import LeadsFilters from '../components/leads/LeadsFilters'
import ConfirmModal from '../components/ConfirmModal'
import LeadModal from '@renderer/components/leads/LeadModal'

export default function Leads() {
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState({ stats: false, leads: false })
  const [filters, setFilters] = useState<LeadFilters>({})
  const [pagination, setPagination] = useState({ page: 1, limit: 20 })
  const [confirmDelete, setConfirmDelete] = useState<Lead | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Lead modal state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [leadModalMode, setLeadModalMode] = useState<'create' | 'view' | 'edit'>('create')
  const [showLeadModal, setShowLeadModal] = useState(false)

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
    if (mode === 'manual') {
      setSelectedLead(null)
      setLeadModalMode('create')
      setShowLeadModal(true)
    } else {
      toast.info('Ajout intelligent', 'Fonctionnalité en cours de développement')
    }
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

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={closeModals}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Supprimer le lead"
        message={`Êtes-vous sûr de vouloir supprimer le lead "${confirmDelete?.data.contact.prenom} ${confirmDelete?.data.contact.nom}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
      />

      {/* Modal de lead (view/edit/create) */}
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
    </section>
  )
}
