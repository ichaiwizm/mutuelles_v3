/**
 * SenderSuggestionsModal - Suggestions d'expéditeurs basées sur les leads détectés
 * Analyse les emails classés comme leads et propose d'ajouter leurs expéditeurs
 */

import React, { useState } from 'react'
import Modal from '../../Modal'

interface SenderSuggestion {
  email: string
  occurrences: number
}

interface SenderSuggestionsModalProps {
  isOpen: boolean
  onClose: () => void
  suggestions: SenderSuggestion[]
  onConfirm: (selected: SenderSuggestion[]) => Promise<void>
}

export function SenderSuggestionsModal({
  isOpen,
  onClose,
  suggestions,
  onConfirm
}: SenderSuggestionsModalProps) {
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(
    new Set(suggestions.filter(s => s.occurrences >= 3).map(s => s.email))
  )
  const [isSaving, setIsSaving] = useState(false)

  const handleToggle = (email: string) => {
    const newSelected = new Set(selectedEmails)
    if (newSelected.has(email)) {
      newSelected.delete(email)
    } else {
      newSelected.add(email)
    }
    setSelectedEmails(newSelected)
  }

  const handleConfirm = async () => {
    const selected = suggestions.filter(s => selectedEmails.has(s.email))

    setIsSaving(true)
    try {
      await onConfirm(selected)
      onClose()
    } catch (error) {
      alert('Erreur lors de l\'ajout des expéditeurs')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Suggestions d'expéditeurs">
      <div className="space-y-4">
        {/* Intro */}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Nous avons analysé vos emails classés comme leads et trouvé <strong>{suggestions.length}</strong> expéditeur{suggestions.length > 1 ? 's' : ''} récurrent{suggestions.length > 1 ? 's' : ''}.
          Sélectionnez ceux que vous souhaitez ajouter.
        </p>

        {/* Liste */}
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Aucune suggestion trouvée. Importez plus d'emails d'abord.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {suggestions.map((suggestion) => (
                <label
                  key={suggestion.email}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedEmails.has(suggestion.email)}
                    onChange={() => handleToggle(suggestion.email)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {suggestion.email}
                      </span>
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {suggestion.occurrences} occurrence{suggestion.occurrences > 1 ? 's' : ''}
                      </span>
                    </div>
                    {suggestion.occurrences < 3 && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-500">
                        ⚠️ Peu d'occurrences, peut générer des faux positifs
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedEmails.size} sélectionné{selectedEmails.size > 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedEmails.size === 0 || isSaving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Ajout en cours...' : `Ajouter ${selectedEmails.size} expéditeur${selectedEmails.size > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
