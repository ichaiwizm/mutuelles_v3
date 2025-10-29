import { useState } from 'react'
import Modal from '../../../Modal'
import LeadModal from '../../../leads/LeadModal'
import type { EnrichedLeadData } from '@renderer/hooks/useEmailToLead'
import type { EmailMessage } from '../../../../../shared/types/email'
import { LeadSelectionHeader } from './LeadSelectionHeader'
import { LeadPreviewList } from './LeadPreviewList'
import { useLeadSelection } from './useLeadSelection'
import { useToastContext } from '@renderer/contexts/ToastContext'

interface LeadConversionModalProps {
  isOpen: boolean
  leads: EnrichedLeadData[]
  emails: EmailMessage[]
  isCreating: boolean
  onClose: () => void
  onCreate: (selectedLeads: EnrichedLeadData[]) => Promise<void>
}

/**
 * Modal principal de conversion des emails en leads
 * Orchestre la sélection et la création des leads
 */
export function LeadConversionModal({
  isOpen,
  leads,
  emails,
  isCreating,
  onClose,
  onCreate
}: LeadConversionModalProps) {
  const toast = useToastContext()
  const selection = useLeadSelection(leads)

  const [editingLead, setEditingLead] = useState<EnrichedLeadData | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const handleEdit = (lead: EnrichedLeadData) => {
    setEditingLead(lead)
    setShowEditModal(true)
  }

  const handleEditClose = () => {
    setShowEditModal(false)
    setEditingLead(null)
  }

  const handleEditSuccess = () => {
    // Le lead a été créé directement en base
    // On le retire de la liste de preview et on ferme le modal
    handleEditClose()
    toast.success('Lead créé', 'Le lead a été créé avec succès')

    // TODO: Optionnellement, retirer ce lead de la liste de preview
    // pour éviter de le créer une seconde fois
  }

  const handleCreate = async () => {
    const selectedLeads = selection.getSelectedLeads()

    if (selectedLeads.length === 0) {
      toast.warning('Aucun lead sélectionné', 'Veuillez sélectionner au moins un lead')
      return
    }

    await onCreate(selectedLeads)
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Leads détectés (${leads.length})`}
        size="large"
      >
        <div className="flex flex-col h-full -m-6">
          {/* Header avec stats et actions */}
          <LeadSelectionHeader
            totalCount={selection.totalCount}
            selectedCount={selection.selectedCount}
            completeCount={selection.completeCount}
            onSelectAll={selection.selectAll}
            onDeselectAll={selection.deselectAll}
            leads={leads}
            emails={emails}
          />

          {/* Liste des leads */}
          <LeadPreviewList
            leads={leads}
            isSelected={selection.isSelected}
            isComplete={selection.isComplete}
            onToggle={selection.toggle}
            onEdit={handleEdit}
          />

          {/* Footer avec actions */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating || selection.selectedCount === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Création en cours...
                </>
              ) : (
                <>
                  Créer {selection.selectedCount} lead{selection.selectedCount > 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal d'édition/création */}
      {editingLead && (
        <LeadModal
          mode="create"
          lead={{
            id: editingLead.parsedData.metadata.sourceEmailId,
            data: {
              platformData: editingLead.formData  // formData au format plat dans platformData
            },
            metadata: editingLead.metadata,
            createdAt: new Date().toISOString()
          }}
          isOpen={showEditModal}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  )
}
