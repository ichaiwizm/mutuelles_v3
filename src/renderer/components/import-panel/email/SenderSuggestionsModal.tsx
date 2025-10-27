/**
 * SenderSuggestionsModal - Modal pour suggérer des expéditeurs basés sur les leads détectés
 *
 * Analyse les emails classés comme leads et propose d'ajouter leurs expéditeurs
 */

import React, { useState } from 'react'
import Modal from '../../Modal'

interface SenderSuggestion {
  pattern: string
  type: string
  occurrences: number
  examples: string[]
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
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(
    new Set(suggestions.filter(s => s.occurrences >= 3).map(s => s.pattern))
  )
  const [bonus, setBonus] = useState(50)
  const [isSaving, setIsSaving] = useState(false)

  const handleToggle = (pattern: string) => {
    const newSelected = new Set(selectedPatterns)
    if (newSelected.has(pattern)) {
      newSelected.delete(pattern)
    } else {
      newSelected.add(pattern)
    }
    setSelectedPatterns(newSelected)
  }

  const handleConfirm = async () => {
    const selected = suggestions.filter(s => selectedPatterns.has(s.pattern))
    const withBonus = selected.map(s => ({ ...s, bonus }))

    setIsSaving(true)
    try {
      await onConfirm(withBonus)
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
          Nous avons analysé vos emails classés comme leads et trouvé <strong>{suggestions.length}</strong> expéditeur{suggestions.length > 1 ? 's' : ''} fréquent{suggestions.length > 1 ? 's' : ''}.
          Sélectionnez ceux que vous souhaitez ajouter à vos expéditeurs connus.
        </p>

        {/* Bonus input */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bonus de points pour tous les expéditeurs sélectionnés
          </label>
          <input
            type="number"
            value={bonus}
            onChange={(e) => setBonus(parseInt(e.target.value) || 0)}
            min="0"
            max="200"
            className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">points</span>
        </div>

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
                  key={suggestion.pattern}
                  className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPatterns.has(suggestion.pattern)}
                    onChange={() => handleToggle(suggestion.pattern)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                        {suggestion.pattern}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {suggestion.occurrences} occurrence{suggestion.occurrences > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                        {suggestion.type === 'domain' ? 'Domaine' : 'Contient'}
                      </span>
                      <span className="truncate">
                        Ex: {suggestion.examples[0]}
                      </span>
                    </div>
                    {suggestion.occurrences < 3 && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
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
            {selectedPatterns.size} sélectionné{selectedPatterns.size > 1 ? 's' : ''}
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
              disabled={selectedPatterns.size === 0 || isSaving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Ajout en cours...' : `Ajouter ${selectedPatterns.size} expéditeur${selectedPatterns.size > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
