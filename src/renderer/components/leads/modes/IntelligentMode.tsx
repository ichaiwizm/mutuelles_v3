import React from 'react'

interface IntelligentModeProps {
  rawText: string
  onTextChange: (text: string) => void
  onProcess: () => void
  onCancel: () => void
  loading: boolean
}

export default function IntelligentMode({
  rawText,
  onTextChange,
  onProcess,
  onCancel,
  loading
}: IntelligentModeProps) {
  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex-1 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Collez les informations du lead
          </label>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            Collez ici un email, un message ou tout autre texte contenant les informations du lead.
            Le système extraira automatiquement les données pertinentes.
          </p>
          <textarea
            value={rawText}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Exemple: Bonjour, je m'appelle Jean Dupont, j'habite au 123 Rue de Paris 75001, mon email est jean.dupont@email.com..."
            className="w-full h-64 px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 p-4 border-t border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onProcess}
          disabled={!rawText.trim() || loading}
          className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Traitement...' : 'Traiter le texte'}
        </button>
      </div>
    </div>
  )
}
