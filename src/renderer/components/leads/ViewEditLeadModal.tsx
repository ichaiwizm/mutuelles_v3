import React, { useState, useEffect } from 'react'
import { useToastContext } from '../../contexts/ToastContext'
import type { FullLead, CreateLeadData } from '../../../shared/types/leads'
import ViewEditLeadModalHeader from './ViewEditLeadModalHeader'
import LeadForm from './LeadForm'

interface ViewEditLeadModalProps {
  lead: FullLead | null
  isOpen: boolean
  onClose: () => void
  onDelete: (lead: FullLead) => void
  onLeadUpdated: () => void
}

export default function ViewEditLeadModal({
  lead,
  isOpen,
  onClose,
  onDelete,
  onLeadUpdated
}: ViewEditLeadModalProps) {
  const [editedData, setEditedData] = useState<CreateLeadData | null>(null)
  const [loading, setLoading] = useState(false)
  const toast = useToastContext()

  useEffect(() => {
    if (lead && isOpen) {
      // Convertir FullLead en CreateLeadData
      setEditedData({
        contact: lead.contact,
        souscripteur: lead.souscripteur,
        conjoint: lead.conjoint,
        enfants: lead.enfants,
        besoins: lead.besoins,
        platformData: lead.platformData
      })
    }
  }, [lead, isOpen])

  if (!isOpen || !lead || !editedData) return null

  const handleSave = async (data: CreateLeadData) => {
    setLoading(true)
    const toastId = toast.loading('Mise à jour du lead...')

    try {
      const result = await window.api.leads.update(lead.id, data)

      if (result.success) {
        toast.update(toastId, { type: 'success', title: 'Lead mis à jour' })
        onLeadUpdated()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast.update(toastId, { type: 'error', title: 'Erreur', message: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <LeadForm
          data={editedData}
          onDataChange={setEditedData}
          mode="edit"
          initialEditing={false}
          showToggleConjoint={true}
          showPlatformFields={true}
          onSubmit={handleSave}
          onCancel={onClose}
          loading={loading}
          containerHeight="max-h-[80vh]"
          renderHeader={({ isEditing, onToggleEdit }) => (
            <ViewEditLeadModalHeader
              lead={lead}
              isEditing={isEditing}
              loading={loading}
              onEdit={onToggleEdit}
              onCancelEdit={onToggleEdit}
              onSave={() => handleSave(editedData)}
              onDelete={onDelete}
              onClose={onClose}
            />
          )}
        />
      </div>
    </div>
  )
}
