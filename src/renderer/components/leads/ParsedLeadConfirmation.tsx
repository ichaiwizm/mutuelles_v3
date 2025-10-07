import React, { useEffect } from 'react'
import { Check, X, AlertCircle, Edit, RotateCcw } from 'lucide-react'
import type { CreateLeadData, LeadProvider, EnfantInfo } from '../../../shared/types/leads'
import { useLeadFormState } from '../../hooks/useLeadFormState'
import { useLeadValidation } from '../../hooks/useLeadValidation'
import ContactSection from './sections/ContactSection'
import SouscripteurSection from './sections/SouscripteurSection'
import ConjointSection from './sections/ConjointSection'
import EnfantsSection from './sections/EnfantsSection'
import BesoinsSection from './sections/BesoinsSection'
import PlatformFieldsSection from './PlatformFieldsSection'

interface ParsedLeadConfirmationProps {
  provider: LeadProvider | null
  data: CreateLeadData
  score: number
  onConfirm: (editedData: CreateLeadData) => void
  onCancel: () => void
  loading?: boolean
  onDataChange?: (data: CreateLeadData) => void
}

const providerLabels: Record<string, string> = {
  assurprospect: 'AssurProspect',
  assurlead: 'Assurlead',
  generic: 'Générique'
}

const getScoreColor = (score: number) => {
  if (score >= 7) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 4) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

const getScoreLabel = (score: number) => {
  if (score >= 7) return 'Excellent'
  if (score >= 4) return 'Moyen'
  return 'Faible'
}

export default function ParsedLeadConfirmation({
  provider,
  data,
  score,
  onConfirm,
  onCancel,
  loading,
  onDataChange
}: ParsedLeadConfirmationProps) {
  const formState = useLeadFormState(data)
  const { validationErrors, validateData, clearError, clearAllErrors } = useLeadValidation()

  // Synchroniser avec data externe si elle change
  useEffect(() => {
    formState.updateData(data)
  }, [data])

  // Notifier le parent des changements
  useEffect(() => {
    if (onDataChange) {
      onDataChange(formState.data)
    }
  }, [formState.data, onDataChange])

  const handleCancelEdit = () => {
    formState.resetForm()
    clearAllErrors()
  }

  const handleConfirm = () => {
    if (formState.isEditing && !validateData(formState.data)) {
      return
    }
    onConfirm(formState.data)
  }

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

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${formState.isEditing ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
              {formState.isEditing ? (
                <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">{formState.isEditing ? 'Edition du lead' : 'Lead identifié'}</h3>
              <p className="text-sm text-neutral-500">
                Source: {provider ? providerLabels[provider] : 'Inconnue'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}/10
            </div>
            <div className="text-xs text-neutral-500">{getScoreLabel(score)}</div>
          </div>
        </div>

        {/* Bouton Modifier / Annuler */}
        {!loading && (
          <div className="flex justify-end">
            {formState.isEditing ? (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <RotateCcw size={14} />
                Annuler les modifications
              </button>
            ) : (
              <button
                type="button"
                onClick={() => formState.setEditing(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <Edit size={14} />
                Modifier
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content avec sections */}
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

        <ConjointSection
          data={formState.data}
          isEditing={formState.isEditing}
          validationErrors={validationErrors}
          onChange={handleFieldChange}
        />

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

        {/* Section Plateformes */}
        {formState.data.platformData && (
          <PlatformFieldsSection
            platformData={formState.data.platformData}
            onPlatformDataChange={handlePlatformDataChange}
            editable={formState.isEditing}
          />
        )}

        {/* Warning si score faible */}
        {score < 4 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300">Données incomplètes</p>
              <p className="text-amber-700 dark:text-amber-400">
                Certaines informations importantes sont manquantes. Vérifiez les données avant de créer le lead.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-200 dark:border-neutral-800">
        {/* Message d'erreur de validation */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-red-800 dark:text-red-300">Erreurs de validation</p>
                <p className="text-red-700 dark:text-red-400">
                  Veuillez corriger les erreurs avant de créer le lead.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 p-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Création...' : 'Créer le lead'}
          </button>
        </div>
      </div>
    </div>
  )
}
