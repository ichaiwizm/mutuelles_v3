/**
 * EmailListItem - Composant pour afficher un email individuel dans la liste
 *
 * Gère l'affichage d'un seul email avec :
 * - Checkbox de sélection
 * - Expansion/réduction du contenu
 * - Affichage des raisons de détection
 * - Contenu complet en mode étendu
 */

import React from 'react'
import type { EmailMessage } from '../../../../shared/types/email'

interface EmailListItemProps {
  email: EmailMessage
  isSelected: boolean
  isExpanded: boolean
  onToggleSelect?: (id: string) => void
  onToggleExpand: (id: string) => void
}

export function EmailListItem({
  email,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand
}: EmailListItemProps) {
  return (
    <div
      className={`
        px-6 py-4 transition-colors
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {onToggleSelect && (
          <div className="flex-shrink-0 pt-0.5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(email.id)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              aria-label={`Sélectionner l'email de ${email.from}`}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className="cursor-pointer"
            onClick={() => onToggleExpand(email.id)}
          >
            {/* Ligne 1: Sujet + Date */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
                {email.subject || '(Sans sujet)'}
              </h4>
              <time className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {new Date(email.date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short'
                })}
              </time>
            </div>

            {/* Ligne 2: From */}
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {email.from}
            </div>

            {/* Snippet (si collapsed) */}
            {!isExpanded && email.snippet && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                {email.snippet}
              </p>
            )}

            {/* Tags détection (si collapsed) */}
            {!isExpanded && email.detectionReasons && email.detectionReasons.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {email.detectionReasons.slice(0, 3).map((reason, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {reason}
                  </span>
                ))}
                {email.detectionReasons.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{email.detectionReasons.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Bouton expand/collapse */}
            <button
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
            >
              <span>{isExpanded ? 'Réduire' : 'Voir plus'}</span>
              <svg
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>

          {/* Contenu étendu */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              {/* Raisons de détection */}
              {email.detectionReasons && email.detectionReasons.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pourquoi c'est un lead potentiel :
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {email.detectionReasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contenu complet */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contenu :
                </p>
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {email.content || email.snippet || '(Aucun contenu)'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
