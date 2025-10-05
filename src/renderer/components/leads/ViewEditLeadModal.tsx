import React, { useState, useEffect } from 'react'
import { useToastContext } from '../../contexts/ToastContext'
import type { FullLead, CreateLeadData } from '../../../shared/types/leads'
import ViewEditLeadModalHeader from './ViewEditLeadModalHeader'
import ContactSection from './sections/ContactSection'
import SouscripteurSection from './sections/SouscripteurSection'
import ConjointSection from './sections/ConjointSection'
import EnfantsSection from './sections/EnfantsSection'
import BesoinsSection from './sections/BesoinsSection'
import PlatformFieldsSection from './PlatformFieldsSection'

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
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<CreateLeadData | null>(null)
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
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
      setIsEditing(false)
      setValidationErrors({})
    }
  }, [lead, isOpen])

  if (!isOpen || !lead || !editedData) return null

  const handleFieldChange = (section: keyof CreateLeadData, field: string, value: any) => {
    setEditedData(prev => ({
      ...prev!,
      [section]: {
        ...(prev![section] as any),
        [field]: value
      }
    }))
  }

  const handleNestedFieldChange = (section: keyof CreateLeadData, subSection: string, field: string, value: any) => {
    setEditedData(prev => ({
      ...prev!,
      [section]: {
        ...(prev![section] as any),
        [subSection]: {
          ...((prev![section] as any)?.[subSection] || {}),
          [field]: value
        }
      }
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    const toastId = toast.loading('Mise à jour du lead...')

    try {
      const result = await window.api.leads.update(lead.id, editedData)

      if (result.success) {
        toast.update(toastId, { type: 'success', title: 'Lead mis à jour' })
        setIsEditing(false)
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

  const handleCancelEdit = () => {
    setEditedData({
      contact: lead.contact,
      souscripteur: lead.souscripteur,
      conjoint: lead.conjoint,
      enfants: lead.enfants,
      besoins: lead.besoins,
      platformData: lead.platformData
    })
    setIsEditing(false)
    setValidationErrors({})
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <ViewEditLeadModalHeader
          lead={lead}
          isEditing={isEditing}
          loading={loading}
          onEdit={() => setIsEditing(true)}
          onCancelEdit={handleCancelEdit}
          onSave={handleSave}
          onDelete={onDelete}
          onClose={onClose}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <ContactSection
              data={editedData}
              isEditing={isEditing}
              validationErrors={validationErrors}
              onChange={handleFieldChange}
            />
            <SouscripteurSection
              data={editedData}
              isEditing={isEditing}
              validationErrors={validationErrors}
              onChange={handleFieldChange}
            />
            <ConjointSection
              data={editedData}
              isEditing={isEditing}
              validationErrors={validationErrors}
              onChange={handleFieldChange}
            />
            <EnfantsSection
              data={editedData}
              isEditing={isEditing}
              onDataChange={setEditedData}
            />
            <BesoinsSection
              data={editedData}
              isEditing={isEditing}
              validationErrors={validationErrors}
              onChange={handleFieldChange}
              onNestedChange={handleNestedFieldChange}
            />
            {editedData.platformData && (
              <PlatformFieldsSection
                platformData={editedData.platformData}
                onPlatformDataChange={(newPlatformData) => {
                  setEditedData(prev => ({
                    ...prev!,
                    platformData: newPlatformData
                  }))
                }}
                editable={isEditing}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
