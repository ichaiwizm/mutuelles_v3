import React, { useState, useEffect } from 'react'
import { Pencil, Bug } from 'lucide-react'
import Modal from '../Modal'
import CommonFieldsSection from '../forms/CommonFieldsSection'
import PlatformSpecificSection from '../forms/PlatformSpecificSection'
import { useFormSchema } from '@renderer/hooks/useFormSchema'
import { useLeadForm } from '@renderer/hooks/useLeadForm'
import { useToastContext } from '@renderer/contexts/ToastContext'
import type { Lead } from '@shared/types/leads'
import { transformToCleanLead } from '@shared/utils/leadFormData'
import { shouldShowField } from '@renderer/utils/formSchemaGenerator'

export interface LeadModalProps {
  mode: 'create' | 'view' | 'edit'
  lead?: Lead
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  submitBehavior?: 'db' | 'local'
  submitLabelOverride?: string
  onLocalSubmit?: (payload: { cleanLead: any; formValues: Record<string, any> }) => void
  titleOverride?: string
}

export default function LeadModal({
  mode: initialMode,
  lead,
  isOpen,
  onClose,
  onSuccess,
  submitBehavior = 'db',
  submitLabelOverride,
  onLocalSubmit,
  titleOverride
}: LeadModalProps) {
  const { schema, loading: schemaLoading, error: schemaError } = useFormSchema()
  const toast = useToastContext()

  // Local state to handle VIEW → EDIT transition
  const [currentMode, setCurrentMode] = useState(initialMode)

  const [alptisExpanded, setAlptisExpanded] = useState(false)
  const [swisslifeExpanded, setSwisslifeExpanded] = useState(false)

  // Reset currentMode when modal opens/closes or mode changes
  useEffect(() => {
    setCurrentMode(initialMode)
  }, [initialMode, isOpen])

  const leadForm = useLeadForm({
    schema,
    mode: currentMode === 'view' ? 'edit' : currentMode,
    initialLead: lead,
    onSuccess: () => {
      const message = currentMode === 'create' ? 'Lead créé avec succès' : 'Lead modifié avec succès'
      toast.success(message, undefined, { duration: 1000 })
      onSuccess()
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'opération', error)
    }
  })

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      leadForm.handleReset()
      setAlptisExpanded(false)
      setSwisslifeExpanded(false)
      setCurrentMode(initialMode)
    }
  }, [isOpen])

  // Auto-expand carrier sections if data exists for them
  useEffect(() => {
    const vals = leadForm.formState.values
    if (!alptisExpanded && Object.keys(vals).some(k => k.startsWith('alptis.'))) {
      setAlptisExpanded(true)
    }
    if (!swisslifeExpanded && Object.keys(vals).some(k => k.startsWith('swisslifeone.'))) {
      setSwisslifeExpanded(true)
    }
  }, [leadForm.formState.values])

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

  const handleDebug = () => {
    if (!schema) {
      toast.warning('Schema non disponible', 'Impossible de générer les informations de debug')
      return
    }

    // Collect all fields from schema
    const allFields = [
      ...schema.common,
      ...schema.platformSpecific.alptis.map(f => ({ ...f, _platform: 'alptis' })),
      ...schema.platformSpecific.swisslifeone.map(f => ({ ...f, _platform: 'swisslifeone' }))
    ]

    const values = leadForm.formState.values

    // Analyze field visibility and values
    const visibleFields: string[] = []
    const hiddenFields: string[] = []
    const filledFields: string[] = []
    const emptyFields: string[] = []
    const requiredMissing: string[] = []
    const fieldsWithErrors: Array<{ field: string; error: string }> = []

    allFields.forEach(field => {
      const isVisible = shouldShowField(field, values)
      const fieldValue = values[field.domainKey]
      const isEmpty = fieldValue === undefined || fieldValue === null || fieldValue === ''
      const hasError = leadForm.formState.errors[field.domainKey]

      if (isVisible) {
        visibleFields.push(field.domainKey)
        if (!isEmpty) {
          filledFields.push(field.domainKey)
        } else {
          emptyFields.push(field.domainKey)
        }
        if (field.required && isEmpty) {
          requiredMissing.push(field.domainKey)
        }
      } else {
        hiddenFields.push(field.domainKey)
      }

      if (hasError) {
        fieldsWithErrors.push({ field: field.domainKey, error: hasError })
      }
    })

    // Build complete debug info
    const debugInfo = {
      timestamp: new Date().toISOString(),
      mode: currentMode,
      formState: {
        values: leadForm.formState.values,
        errors: leadForm.formState.errors,
        touched: leadForm.formState.touched,
        isSubmitting: leadForm.formState.isSubmitting
      },
      sections: {
        hasSpouse: leadForm.hasSpouse,
        hasChildren: leadForm.hasChildren,
        childrenCount: leadForm.children.length,
        childrenIds: leadForm.children.map(c => c.id),
        alptisExpanded,
        swisslifeExpanded
      },
      schema: {
        totalFields: allFields.length,
        commonFieldsCount: schema.common.length,
        alptisFieldsCount: schema.platformSpecific.alptis.length,
        swisslifeFieldsCount: schema.platformSpecific.swisslifeone.length
      },
      fieldAnalysis: {
        totalFields: allFields.length,
        visibleFieldsCount: visibleFields.length,
        hiddenFieldsCount: hiddenFields.length,
        filledFieldsCount: filledFields.length,
        emptyFieldsCount: emptyFields.length,
        requiredMissingCount: requiredMissing.length,
        errorsCount: fieldsWithErrors.length,
        visibleFields,
        hiddenFields,
        filledFields,
        emptyFields,
        requiredMissing,
        fieldsWithErrors
      }
    }

    // Format as pretty JSON
    const jsonOutput = JSON.stringify(debugInfo, null, 2)

    // Copy to clipboard
    navigator.clipboard
      .writeText(jsonOutput)
      .then(() => {
        toast.success('Debug info copié', 'Les informations de débogage ont été copiées dans le presse-papier')
        console.group('🐛 Lead Form Debug State')
        console.log('Mode:', currentMode)
        console.log('Total Fields:', allFields.length)
        console.log('Visible Fields:', visibleFields.length)
        console.log('Filled Fields:', filledFields.length)
        console.log('Required Missing:', requiredMissing.length)
        console.log('Full Debug Info:', debugInfo)
        console.groupEnd()
      })
      .catch(err => {
        toast.error('Erreur de copie', 'Impossible de copier dans le presse-papier')
        console.error('Failed to copy debug info:', err)
      })
  }

  const handleSwitchToEdit = () => {
    setCurrentMode('edit')
  }

  const handleClose = () => {
    if (!leadForm.formState.isSubmitting) {
      onClose()
    }
  }

  // Get modal title based on mode
  const getModalTitle = () => {
    if (currentMode === 'create') {
      return 'Ajouter un lead manuellement'
    }
    if (lead) {
      const name = `${lead.data.subscriber?.firstName || ''} ${lead.data.subscriber?.lastName || ''}`.trim()
      return currentMode === 'view' ? `Détails du lead${name ? ` - ${name}` : ''}` : `Modifier le lead${name ? ` - ${name}` : ''}`
    }
    return currentMode === 'view' ? 'Détails du lead' : 'Modifier le lead'
  }

  // Determine if fields should be disabled (view mode only)
  const fieldsDisabled = currentMode === 'view'

  const handleLocalSave = () => {
    const cleanLead = transformToCleanLead(leadForm.formState.values)
    onLocalSubmit?.({ cleanLead, formValues: leadForm.formState.values })
  }

  if (schemaLoading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={getModalTitle()} size="large">
        <div className="flex items-center justify-center py-12">
          <div className="text-neutral-500">Chargement du formulaire...</div>
        </div>
      </Modal>
    )
  }

  if (schemaError || !schema) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={getModalTitle()} size="large">
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
    ...schema.common.filter(f => f.domainKey.includes('.spouse.') || f.domainKey.startsWith('spouse.')),
    ...schema.platformSpecific.alptis.filter(f => f.domainKey.includes('.spouse.')).map(f => ({ ...f, platform: 'alptis' as const })),
    ...schema.platformSpecific.swisslifeone.filter(f => f.domainKey.includes('.spouse.')).map(f => ({ ...f, platform: 'swisslifeone' as const }))
  ]

  // Merge all children fields (common + platform-specific) with badges
  const allChildrenFields = [
    ...schema.common.filter(f => f.domainKey.includes('children[].')),
    ...schema.platformSpecific.alptis.filter(f => f.domainKey.includes('children[].')).map(f => ({ ...f, platform: 'alptis' as const })),
    ...schema.platformSpecific.swisslifeone.filter(f => f.domainKey.includes('children[].')).map(f => ({ ...f, platform: 'swisslifeone' as const }))
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={titleOverride || getModalTitle()}
      size="large"
      headerActions={
        <div className="flex gap-2">
          {currentMode === 'view' && (
            <button
              onClick={handleSwitchToEdit}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-blue-600 dark:border-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Pencil size={14} />
              Modifier
            </button>
          )}
          {currentMode !== 'view' && (
            <>
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
            </>
          )}
          <button
            onClick={handleDebug}
            disabled={leadForm.formState.isSubmitting || !schema}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Bug size={14} />
            Debug État
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <CommonFieldsSection
          commonFields={schema.common.filter(f => !f.domainKey.includes('.spouse.') && !f.domainKey.startsWith('spouse.') && !f.domainKey.includes('children'))}
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
          disabled={fieldsDisabled}
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
            disabled={fieldsDisabled}
          />

          <PlatformSpecificSection
            platform="swisslifeone"
            schema={schema}
            values={leadForm.formState.values}
            onChange={leadForm.handleFieldChange}
            errors={leadForm.formState.errors}
            isExpanded={swisslifeExpanded}
            onToggle={setSwisslifeExpanded}
            disabled={fieldsDisabled}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={handleClose}
            disabled={leadForm.formState.isSubmitting}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {currentMode === 'view' ? 'Fermer' : 'Annuler'}
          </button>
          {currentMode !== 'view' && (
            <button
              onClick={submitBehavior === 'local' ? handleLocalSave : leadForm.handleSubmit}
              disabled={leadForm.formState.isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitBehavior === 'local'
                ? (submitLabelOverride || 'Enregistrer')
                : (leadForm.formState.isSubmitting
                    ? (currentMode === 'create' ? 'Création...' : 'Modification...')
                    : (currentMode === 'create' ? 'Créer le lead' : 'Sauvegarder les modifications'))}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
