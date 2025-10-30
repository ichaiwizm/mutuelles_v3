/**
 * Smart Add Modal - Parse raw lead text and open form with pre-filled data
 */

import React, { useState } from 'react'
import { Sparkles, AlertCircle } from 'lucide-react'
import Modal from '../Modal'
import { useSmartParsing } from '../../hooks/useSmartParsing'
import type { EnrichedLeadData } from '../../../shared/types/emailParsing'

interface SmartAddModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (enrichedLead: EnrichedLeadData) => void
}

export default function SmartAddModal({
  isOpen,
  onClose,
  onSuccess
}: SmartAddModalProps) {
  const [rawText, setRawText] = useState('')
  const { isParsing, error, parseText, reset } = useSmartParsing()

  const handleClose = () => {
    setRawText('')
    reset()
    onClose()
  }

  const handleParse = async () => {
    if (!rawText.trim()) {
      return
    }

    const enrichedLead = await parseText(rawText)

    if (enrichedLead) {
      // Success - close modal and pass data to parent
      handleClose()
      onSuccess(enrichedLead)
    }
    // If error, it will be displayed via the error state
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter to submit
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleParse()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Ajout intelligent"
      size="large"
    >
      <div className="space-y-4">
        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Sparkles className="flex-shrink-0 text-blue-600 dark:text-blue-400" size={20} />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">Collez directement les données du lead</p>
              <p className="text-blue-700 dark:text-blue-300">
                Le système analysera automatiquement le texte et extraira les informations (nom, prénom, téléphone, etc.).
                Formats supportés : Assurlead, AssurProspect, ou tout texte structuré.
              </p>
            </div>
          </div>
        </div>

        {/* Textarea */}
        <div>
          <label
            htmlFor="raw-text"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
          >
            Texte du lead
          </label>
          <textarea
            id="raw-text"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Collez ici les données du lead...&#10;&#10;Exemple :&#10;Civilité: M.&#10;Nom: DUPONT&#10;Prénom: Jean&#10;Téléphone: 0123456789&#10;..."
            className="w-full h-80 px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700
                     bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                     placeholder-neutral-400 dark:placeholder-neutral-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600
                     font-mono text-sm resize-none"
            disabled={isParsing}
          />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Astuce : Ctrl+Entrée pour parser rapidement
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="flex-shrink-0 text-red-600 dark:text-red-400" size={20} />
              <div className="text-sm text-red-900 dark:text-red-100">
                <p className="font-medium mb-1">Erreur de parsing</p>
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={isParsing}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300
                     bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700
                     rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleParse}
            disabled={isParsing || !rawText.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
                     hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                     flex items-center gap-2"
          >
            {isParsing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Parsing en cours...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Parser et créer
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
