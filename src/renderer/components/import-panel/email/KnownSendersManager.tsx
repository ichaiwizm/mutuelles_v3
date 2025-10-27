/**
 * KnownSendersManager - Gestion des expéditeurs connus pour la détection de leads
 *
 * Permet:
 * - Lister les expéditeurs connus
 * - Ajouter/Modifier/Supprimer
 * - Configurer pattern, type et bonus
 */

import React, { useState } from 'react'
import type { KnownSender, SenderPatternType } from '../../../../shared/types/email'

interface KnownSendersManagerProps {
  knownSenders: KnownSender[]
  onUpdate: (senders: KnownSender[]) => Promise<void>
  onAnalyze?: () => void
}

export function KnownSendersManager({ knownSenders, onUpdate, onAnalyze }: KnownSendersManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState<KnownSender>({
    pattern: '',
    type: 'domain',
    bonus: 50
  })

  const handleAdd = () => {
    setIsAdding(true)
    setFormData({ pattern: '', type: 'domain', bonus: 50 })
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setFormData({ ...knownSenders[index] })
  }

  const handleSave = async () => {
    if (!formData.pattern.trim()) {
      alert('Le pattern ne peut pas être vide')
      return
    }

    let updatedSenders: KnownSender[]
    if (isAdding) {
      updatedSenders = [...knownSenders, formData]
    } else if (editingIndex !== null) {
      updatedSenders = knownSenders.map((s, i) => i === editingIndex ? formData : s)
    } else {
      return
    }

    await onUpdate(updatedSenders)
    setIsAdding(false)
    setEditingIndex(null)
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingIndex(null)
  }

  const handleDelete = async (index: number) => {
    if (!confirm('Supprimer cet expéditeur ?')) return
    const updatedSenders = knownSenders.filter((_, i) => i !== index)
    await onUpdate(updatedSenders)
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        {onAnalyze && (
          <button
            onClick={onAnalyze}
            className="px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Analyser automatiquement
          </button>
        )}
        <button
          onClick={handleAdd}
          disabled={isAdding || editingIndex !== null}
          className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter manuellement
        </button>
      </div>

      {/* Form (Add/Edit) */}
      {(isAdding || editingIndex !== null) && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pattern
              </label>
              <input
                type="text"
                value={formData.pattern}
                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                placeholder="exemple.fr ou leads@"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as SenderPatternType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="domain">Domaine</option>
                <option value="email">Email exact</option>
                <option value="contains">Contient</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bonus (pts)
              </label>
              <input
                type="number"
                value={formData.bonus}
                onChange={(e) => setFormData({ ...formData, bonus: parseInt(e.target.value) || 0 })}
                min="0"
                max="200"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              {isAdding ? 'Ajouter' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {knownSenders.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Aucun expéditeur configuré
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Utilisez "Analyser automatiquement" ou ajoutez manuellement
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pattern
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Bonus
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {knownSenders.map((sender, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                    {sender.pattern}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {sender.type === 'domain' && 'Domaine'}
                    {sender.type === 'email' && 'Email exact'}
                    {sender.type === 'contains' && 'Contient'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    +{sender.bonus} pts
                  </td>
                  <td className="px-4 py-3 text-right text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(index)}
                      disabled={isAdding || editingIndex !== null}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      disabled={isAdding || editingIndex !== null}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        <strong>Domaine</strong>: exemple.fr → @exemple.fr • <strong>Contient</strong>: leads@ → leads@*.com • <strong>Email exact</strong>: email complet uniquement
      </p>
    </div>
  )
}
