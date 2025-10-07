import React, { useState, useEffect, ReactNode } from 'react'
import { Users } from 'lucide-react'
import type { CreateLeadData, EnfantInfo } from '../../../shared/types/leads'
import { useLeadFormState } from '../../hooks/useLeadFormState'
import { useLeadValidation } from '../../hooks/useLeadValidation'
import ContactSection from './sections/ContactSection'
import SouscripteurSection from './sections/SouscripteurSection'
import ConjointSection from './sections/ConjointSection'
import EnfantsSection from './sections/EnfantsSection'
import BesoinsSection from './sections/BesoinsSection'
import PlatformFieldsSection from './PlatformFieldsSection'
import ToggleableSectionWrapper from '../common/ToggleableSectionWrapper'

interface LeadFormHeaderProps {
  isEditing: boolean
  onToggleEdit: () => void
  validationErrors: Record<string, string>
  data: CreateLeadData
}

interface LeadFormFooterProps {
  isEditing: boolean
  data: CreateLeadData
  validationErrors: Record<string, string>
  onCancel: () => void
  onSubmit: () => void
  loading?: boolean
}

interface LeadFormProps {
  // Données
  data: CreateLeadData
  onDataChange: (data: CreateLeadData) => void

  // Comportement
  mode: 'create' | 'edit' | 'view' | 'confirmation'
  initialEditing?: boolean // Par défaut: true si mode=create, false sinon

  // Sections optionnelles
  showToggleConjoint?: boolean // Par défaut: true
  showPlatformFields?: boolean // Par défaut: true si platformData existe

  // Header (slot configurable)
  renderHeader?: (props: LeadFormHeaderProps) => ReactNode

  // Footer (slot configurable)
  renderFooter?: (props: LeadFormFooterProps) => ReactNode

  // Callbacks
  onSubmit?: (data: CreateLeadData) => void | Promise<void>
  onCancel?: () => void

  // UI
  className?: string
  containerHeight?: string // Par défaut: 'h-[500px]'
  loading?: boolean
}

export default function LeadForm({
  data,
  onDataChange,
  mode,
  initialEditing,
  showToggleConjoint = true,
  showPlatformFields = true,
  renderHeader,
  renderFooter,
  onSubmit,
  onCancel,
  className = '',
  containerHeight = 'h-[500px]',
  loading = false
}: LeadFormProps) {
  // Déterminer initialEditing basé sur le mode si non fourni
  const defaultInitialEditing = mode === 'create' || mode === 'confirmation'
  const shouldStartEditing = initialEditing !== undefined ? initialEditing : defaultInitialEditing

  const formState = useLeadFormState(data)
  const { validationErrors, validateData, clearError, clearAllErrors } = useLeadValidation()
  const [hasConjoint, setHasConjoint] = useState(!!data.conjoint)

  // Initialiser l'état d'édition
  useEffect(() => {
    formState.setEditing(shouldStartEditing)
  }, [shouldStartEditing])

  // Sync avec props externe
  useEffect(() => {
    formState.updateData(data)
    setHasConjoint(!!data.conjoint)
  }, [data])

  // Notifier le parent des changements
  useEffect(() => {
    onDataChange(formState.data)
  }, [formState.data, onDataChange])

  // Handlers unifiés
  const handleFieldChange = (section: keyof CreateLeadData, field: string, value: any) => {
    formState.updateField(section, field, value)
    clearError(`${section}.${field}`)
  }

  const handleNestedFieldChange = (section: keyof CreateLeadData, subSection: string, field: string, value: any) => {
    formState.updateNestedField(section, subSection, field, value)
  }

  const handleEnfantsChange = (enfants: EnfantInfo[]) => {
    formState.updateField('enfants' as keyof CreateLeadData, '', enfants)
  }

  const handlePlatformDataChange = (newPlatformData: any) => {
    formState.updateField('platformData' as keyof CreateLeadData, '', newPlatformData)
  }

  const handleToggleConjoint = (active: boolean) => {
    setHasConjoint(active)
    if (active) {
      formState.updateField('conjoint' as keyof CreateLeadData, '', {
        civilite: 'Mme',
        prenom: '',
        nom: '',
        dateNaissance: '',
        profession: '',
        regimeSocial: 'Salarié'
      })
    } else {
      formState.updateField('conjoint' as keyof CreateLeadData, '', undefined)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!validateData(formState.data)) {
      return
    }
    await onSubmit?.(formState.data)
  }

  const handleCancel = () => {
    formState.resetForm()
    clearAllErrors()
    onCancel?.()
  }

  const handleToggleEdit = () => {
    if (formState.isEditing) {
      // Annuler l'édition
      formState.resetForm()
      clearAllErrors()
    }
    formState.setEditing(!formState.isEditing)
  }

  return (
    <div className={`flex flex-col ${containerHeight} ${className}`}>
      {/* Header optionnel */}
      {renderHeader && renderHeader({
        isEditing: formState.isEditing,
        onToggleEdit: handleToggleEdit,
        validationErrors,
        data: formState.data
      })}

      {/* Content scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <ContactSection
          data={formState.data}
          isEditing={formState.isEditing}
          validationErrors={validationErrors}
          onChange={handleFieldChange}
        />

        <SouscripteurSection
          data={formState.data}
          isEditing={formState.isEditing}
          validationErrors={validationErrors}
          onChange={handleFieldChange}
        />

        {showToggleConjoint ? (
          <ToggleableSectionWrapper
            title="Conjoint"
            icon={Users}
            isActive={hasConjoint}
            onToggle={handleToggleConjoint}
            isEditing={formState.isEditing}
          >
            {hasConjoint && (
              <ConjointSection
                data={formState.data}
                isEditing={formState.isEditing}
                validationErrors={validationErrors}
                onChange={handleFieldChange}
              />
            )}
          </ToggleableSectionWrapper>
        ) : (
          formState.data.conjoint && (
            <ConjointSection
              data={formState.data}
              isEditing={formState.isEditing}
              validationErrors={validationErrors}
              onChange={handleFieldChange}
            />
          )
        )}

        <EnfantsSection
          data={formState.data}
          isEditing={formState.isEditing}
          onEnfantsChange={handleEnfantsChange}
        />

        <BesoinsSection
          data={formState.data}
          isEditing={formState.isEditing}
          validationErrors={validationErrors}
          onChange={handleFieldChange}
          onNestedChange={handleNestedFieldChange}
        />

        {showPlatformFields && formState.data.platformData && (
          <PlatformFieldsSection
            platformData={formState.data.platformData}
            onPlatformDataChange={handlePlatformDataChange}
            editable={formState.isEditing}
          />
        )}
      </div>

      {/* Footer optionnel */}
      {renderFooter && (
        <div className="border-t border-neutral-200 dark:border-neutral-800">
          {renderFooter({
            isEditing: formState.isEditing,
            data: formState.data,
            validationErrors,
            onCancel: handleCancel,
            onSubmit: handleSubmit,
            loading
          })}
        </div>
      )}
    </div>
  )
}
