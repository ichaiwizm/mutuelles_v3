import React, { useState, useEffect } from 'react'
import Modal from '../Modal'
import CommonFieldsSection from '../forms/CommonFieldsSection'
import PlatformSpecificSection from '../forms/PlatformSpecificSection'
import LeadFormActions from './LeadFormActions'
import { useFormSchema } from '@renderer/hooks/useFormSchema'
import { useLeadForm } from '@renderer/hooks/useLeadForm'
import { useToastContext } from '@renderer/contexts/ToastContext'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddLeadModal({
  isOpen,
  onClose,
  onSuccess
}: AddLeadModalProps) {
  const { schema, loading: schemaLoading, error: schemaError } = useFormSchema()
  const toast = useToastContext()

  const [alptisExpanded, setAlptisExpanded] = useState(false)
  const [swisslifeExpanded, setSwisslifeExpanded] = useState(false)
  const [loadingToastId, setLoadingToastId] = useState<string | null>(null)

  const leadForm = useLeadForm({
    schema,
    onSuccess: () => {
      // Close or update the loading toast and show success
      if (loadingToastId) {
        toast.update(loadingToastId, {
          type: 'success',
          title: 'Lead créé avec succès',
          duration: 1000
        })
        setLoadingToastId(null)
      } else {
        toast.success('Lead créé avec succès', undefined, { duration: 1000 })
      }
      onSuccess()
    },
    onError: (error) => {
      // Close or update the loading toast and show error
      if (loadingToastId) {
        toast.update(loadingToastId, {
          type: 'error',
          title: 'Erreur lors de la création',
          message: error,
          duration: 3000
        })
        setLoadingToastId(null)
      } else {
        toast.error('Erreur lors de la création', error)
      }
    },
    onLoadingChange: (isLoading, message) => {
      if (isLoading && message) {
        const id = toast.loading(message)
        setLoadingToastId(id)
      } else if (loadingToastId) {
        // If loading is done but no success/error yet, just close it
        toast.close(loadingToastId)
        setLoadingToastId(null)
      }
    }
  })

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      leadForm.handleReset()
      setAlptisExpanded(false)
      setSwisslifeExpanded(false)
    }
  }, [isOpen])

  const handleGenerateProjectName = () => {
    const lastName = leadForm.formState.values['subscriber.lastName'] || ''
    const firstName = leadForm.formState.values['subscriber.firstName'] || ''

    if (lastName && firstName) {
      const generated = `Simulation ${lastName} ${firstName}`
      leadForm.handleFieldChange('project.name', generated)
      toast.success('Nom généré', generated)
    } else {
      toast.warning('Nom et prénom requis', 'Veuillez d\'abord renseigner le nom et le prénom')
    }
  }

  const handleFillDefaults = () => {
    leadForm.handleFillDefaults()
    toast.success('Valeurs par défaut appliquées', 'Les champs vides ont été remplis avec leurs valeurs par défaut')
  }

  const handleFillTest = () => {
    leadForm.handleFillTest()
  }

  const handleClose = () => {
    if (!leadForm.formState.isSubmitting) {
      onClose()
    }
  }

  if (schemaLoading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Ajouter un lead manuellement" size="large">
        <div className="flex items-center justify-center py-12">
          <div className="text-neutral-500">Chargement du formulaire...</div>
        </div>
      </Modal>
    )
  }

  if (schemaError || !schema) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Ajouter un lead manuellement" size="large">
        <div className="flex items-center justify-center py-12">
          <div className="text-red-600 dark:text-red-400">
            Erreur lors du chargement du formulaire: {schemaError || 'Schema non disponible'}
          </div>
        </div>
      </Modal>
    )
  }

  // Merge all spouse fields (common + platform-specific) with badges
  const allSpouseFields = [
    ...schema.common.filter(f => f.domainKey.startsWith('spouse.')),
    ...schema.platformSpecific.alptis.filter(f => f.domainKey.startsWith('spouse.')).map(f => ({ ...f, platform: 'alptis' as const })),
    ...schema.platformSpecific.swisslifeone.filter(f => f.domainKey.startsWith('spouse.')).map(f => ({ ...f, platform: 'swisslifeone' as const }))
  ]

  // Merge all children fields (common + platform-specific) with badges
  const allChildrenFields = [
    ...schema.common.filter(f => f.domainKey.startsWith('children[].')),
    ...schema.platformSpecific.alptis.filter(f => f.domainKey.startsWith('children[].')).map(f => ({ ...f, platform: 'alptis' as const })),
    ...schema.platformSpecific.swisslifeone.filter(f => f.domainKey.startsWith('children[].')).map(f => ({ ...f, platform: 'swisslifeone' as const }))
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Ajouter un lead manuellement"
      size="large"
      headerActions={
        <div className="flex gap-2">
          <button
            onClick={handleFillDefaults}
            disabled={leadForm.formState.isSubmitting || !schema}
            className="px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Remplir par défaut
          </button>
          <button
            onClick={handleFillTest}
            disabled={leadForm.formState.isSubmitting || !schema}
            className="px-3 py-1.5 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Remplir Test
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <CommonFieldsSection
          commonFields={schema.common.filter(f => !f.domainKey.startsWith('spouse.') && !f.domainKey.startsWith('children'))}
          spouseFields={allSpouseFields}
          childrenFields={allChildrenFields}
          values={leadForm.formState.values}
          onChange={leadForm.handleFieldChange}
          onGenerate={handleGenerateProjectName}
          errors={leadForm.formState.errors}
          hasSpouse={leadForm.hasSpouse}
          onToggleSpouse={leadForm.handleToggleSpouse}
          hasChildren={leadForm.hasChildren}
          onToggleChildren={leadForm.handleToggleChildren}
          children={leadForm.children}
          onAddChild={leadForm.handleAddChild}
          onRemoveChild={leadForm.handleRemoveChild}
        />

        <div className="space-y-4">
          <PlatformSpecificSection
            platform="alptis"
            schema={schema}
            values={leadForm.formState.values}
            onChange={leadForm.handleFieldChange}
            errors={leadForm.formState.errors}
            isExpanded={alptisExpanded}
            onToggle={setAlptisExpanded}
          />

          <PlatformSpecificSection
            platform="swisslifeone"
            schema={schema}
            values={leadForm.formState.values}
            onChange={leadForm.handleFieldChange}
            errors={leadForm.formState.errors}
            isExpanded={swisslifeExpanded}
            onToggle={setSwisslifeExpanded}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={handleClose}
            disabled={leadForm.formState.isSubmitting}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={leadForm.handleSubmit}
            disabled={leadForm.formState.isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {leadForm.formState.isSubmitting ? 'Création...' : 'Créer le lead'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
