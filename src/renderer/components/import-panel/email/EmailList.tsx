/**
 * EmailList - Liste des emails leads potentiels
 *
 * Affiche uniquement les leads potentiels (pas de filtres, pas de recherche)
 * - Sélection individuelle avec checkbox
 * - Expansion pour voir le contenu
 * - Actions rapides
 */

import React, { useState, useCallback } from 'react'
import type { EmailMessage } from '../../../../shared/types/email'
import { EmailListItem } from './EmailListItem'

interface EmailListProps {
  emails: EmailMessage[]
  selectedEmailIds?: string[]
  onSelectionChange?: (selectedEmailIds: string[]) => void
}

export function EmailList({
  emails,
  selectedEmailIds = [],
  onSelectionChange
}: EmailListProps) {
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null)

  const toggleExpand = useCallback((emailId: string) => {
    setExpandedEmailId(expandedEmailId === emailId ? null : emailId)
  }, [expandedEmailId])

  const handleToggleSelect = useCallback((emailId: string) => {
    if (!onSelectionChange) return

    const newSelection = selectedEmailIds.includes(emailId)
      ? selectedEmailIds.filter(id => id !== emailId)
      : [...selectedEmailIds, emailId]

    onSelectionChange(newSelection)
  }, [selectedEmailIds, onSelectionChange])

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">
          Aucun lead potentiel
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Cliquez sur "Rafraîchir" pour récupérer les derniers emails
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header avec compteur */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-blue-600">{emails.length}</span>
            {' '}lead{emails.length > 1 ? 's' : ''} potentiel{emails.length > 1 ? 's' : ''}
          </span>
          {selectedEmailIds.length > 0 && (
            <span className="text-gray-600 dark:text-gray-400">
              {selectedEmailIds.length} sélectionné{selectedEmailIds.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Liste des emails */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {emails.map((email) => (
          <EmailListItem
            key={email.id}
            email={email}
            isSelected={selectedEmailIds.includes(email.id)}
            isExpanded={expandedEmailId === email.id}
            onToggleSelect={onSelectionChange ? handleToggleSelect : undefined}
            onToggleExpand={toggleExpand}
          />
        ))}
      </div>
    </div>
  )
}
