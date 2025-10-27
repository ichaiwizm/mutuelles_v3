/**
 * KnownSendersManager - Gestion simple des expéditeurs connus
 * Permet d'ajouter/supprimer des emails d'expéditeurs pour la détection automatique de leads
 */

import React, { useState } from 'react'
import type { KnownSender } from '../../../../shared/types/email'

interface KnownSendersManagerProps {
  knownSenders: KnownSender[]
  onUpdate: (senders: KnownSender[]) => Promise<void>
  onAnalyze?: () => void
  isAnalyzing?: boolean
}

export function KnownSendersManager({ knownSenders, onUpdate, onAnalyze, isAnalyzing = false }: KnownSendersManagerProps) {
  const [newEmail, setNewEmail] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    const trimmedEmail = newEmail.trim().toLowerCase()

    if (!trimmedEmail) {
      alert('L\'email ne peut pas être vide')
      return
    }

    // Validation basique d'email
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      alert('Format d\'email invalide')
      return
    }

    // Vérifier si déjà existant
    if (knownSenders.some(s => s.email.toLowerCase() === trimmedEmail)) {
      alert('Cet email existe déjà')
      return
    }

    setIsAdding(true)
    try {
      const updatedSenders = [...knownSenders, { email: trimmedEmail }]
      await onUpdate(updatedSenders)
      setNewEmail('')
    } catch (error) {
      alert('Erreur lors de l\'ajout')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (email: string) => {
    if (!confirm(`Supprimer l'expéditeur ${email} ?`)) return

    const updatedSenders = knownSenders.filter(s => s.email !== email)
    await onUpdate(updatedSenders)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAdding) {
      handleAdd()
    }
  }

  return (
    <div className="space-y-4">
      {/* Header avec actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Expéditeurs connus ({knownSenders.length})
        </h3>
        {onAnalyze && (
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyse...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Analyser
              </>
            )}
          </button>
        )}
      </div>

      {/* Formulaire d'ajout */}
      <div className="flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="contact@exemple.fr"
          disabled={isAdding}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={isAdding || !newEmail.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAdding ? 'Ajout...' : 'Ajouter'}
        </button>
      </div>

      {/* Liste des expéditeurs */}
      {knownSenders.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Aucun expéditeur configuré
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Utilisez "Analyser" ou ajoutez manuellement un email
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {knownSenders.map((sender, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-mono text-sm text-gray-900 dark:text-gray-100 truncate">
                    {sender.email}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(sender.email)}
                  className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition-colors flex-shrink-0"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Les emails provenant de ces expéditeurs seront automatiquement détectés comme leads.
      </p>
    </div>
  )
}
