import React from 'react'
import type { CreateLeadData } from '@shared/types/leads'
import LeadForm from '../LeadForm'
import ErrorBanner from '../../common/ErrorBanner'

interface ManualModeProps {
  formData: CreateLeadData
  onFormDataChange: (data: CreateLeadData) => void
  onSubmit: () => void
  onCancel: () => void
  loading: boolean
}

export default function ManualMode({
  formData,
  onFormDataChange,
  onSubmit,
  onCancel,
  loading
}: ManualModeProps) {
  return (
    <LeadForm
      data={formData}
      onDataChange={onFormDataChange}
      mode="create"
      initialEditing={true}
      showToggleConjoint={true}
      showPlatformFields={true}
      onSubmit={onSubmit}
      onCancel={onCancel}
      loading={loading}
      renderFooter={({ validationErrors, onCancel, onSubmit }) => (
        <>
          {/* Validation errors banner */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="px-4 pt-3 pb-2">
              <ErrorBanner errors={validationErrors} />
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 p-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              onClick={onSubmit}
              disabled={loading}
              className="px-4 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Création...' : 'Créer le lead'}
            </button>
          </div>
        </>
      )}
    />
  )
}
