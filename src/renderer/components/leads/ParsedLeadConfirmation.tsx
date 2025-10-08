import React from 'react'
import { Check, Edit, RotateCcw, AlertCircle } from 'lucide-react'
import type { CreateLeadData, LeadProvider } from '@shared/types/leads'
import LeadForm from './LeadForm'
import ErrorBanner from '../common/ErrorBanner'

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
  return (
    <LeadForm
      data={data}
      onDataChange={onDataChange || (() => {})}
      mode="confirmation"
      initialEditing={false}
      showToggleConjoint={true}
      showPlatformFields={true}
      onSubmit={onConfirm}
      onCancel={onCancel}
      loading={loading}
      renderHeader={({ isEditing, onToggleEdit }) => (
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isEditing ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                {isEditing ? (
                  <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div>
                <h3 className="font-semibold">{isEditing ? 'Edition du lead' : 'Lead identifié'}</h3>
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
              {isEditing ? (
                <button
                  type="button"
                  onClick={onToggleEdit}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <RotateCcw size={14} />
                  Annuler les modifications
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onToggleEdit}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Edit size={14} />
                  Modifier
                </button>
              )}
            </div>
          )}
        </div>
      )}
      renderFooter={({ validationErrors, onCancel, onSubmit }) => (
        <>
          {/* Validation errors banner */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="px-4 pt-3 pb-2">
              <ErrorBanner errors={validationErrors} />
            </div>
          )}

          {/* Warning si score faible */}
          {score < 4 && (
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-300">Données incomplètes</p>
                  <p className="text-amber-700 dark:text-amber-400">
                    Certaines informations importantes sont manquantes. Vérifiez les données avant de créer le lead.
                  </p>
                </div>
              </div>
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
              type="button"
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
