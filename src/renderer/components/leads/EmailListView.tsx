/**
 * EmailListView - Vue liste des emails importés
 *
 * Affiche :
 * - Liste des emails avec date, expéditeur, sujet, aperçu
 * - Badge "Lead potentiel" si détecté
 * - Détails du contenu au clic
 */

import React, { useState } from 'react'
import type { EmailMessage } from '../../../shared/types/email'

interface EmailListViewProps {
  emails: EmailMessage[]
  onEmailSelect?: (email: EmailMessage) => void
}

export function EmailListView({ emails, onEmailSelect }: EmailListViewProps) {
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null)

  if (emails.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 dark:text-gray-500 mb-2">
          <svg
            className="mx-auto h-12 w-12"
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
        <p className="text-gray-500 dark:text-gray-400">Aucun email récupéré</p>
      </div>
    )
  }

  const toggleExpand = (emailId: string) => {
    setExpandedEmailId(expandedEmailId === emailId ? null : emailId)
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {emails.length} email{emails.length > 1 ? 's' : ''} récupéré{emails.length > 1 ? 's' : ''}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {emails.map((email) => {
          const isExpanded = expandedEmailId === email.id

          return (
            <div
              key={email.id}
              className={`
                border rounded-lg transition-colors
                ${
                  email.hasLeadPotential
                    ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }
                hover:shadow-md cursor-pointer
              `}
              onClick={() => toggleExpand(email.id)}
            >
              <div className="p-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {email.subject || '(Sans sujet)'}
                      </h4>
                      {email.hasLeadPotential && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Lead potentiel
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span className="truncate">{email.from}</span>
                      <span>•</span>
                      <span>{new Date(email.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpand(email.id)
                    }}
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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

                {/* Snippet */}
                {!isExpanded && email.snippet && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {email.snippet}
                  </p>
                )}

                {/* Raisons de détection */}
                {!isExpanded && email.hasLeadPotential && email.detectionReasons && email.detectionReasons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {email.detectionReasons.slice(0, 2).map((reason: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      >
                        {reason}
                      </span>
                    ))}
                    {email.detectionReasons.length > 2 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        +{email.detectionReasons.length - 2} autre{email.detectionReasons.length - 2 > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}

                {/* Contenu complet (expanded) */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {/* Raisons de détection complètes */}
                    {email.hasLeadPotential && email.detectionReasons && email.detectionReasons.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Raisons de détection :
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {email.detectionReasons.map((reason: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contenu */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-3">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contenu :
                      </p>
                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {email.content || email.snippet || '(Aucun contenu)'}
                      </div>
                    </div>

                    {/* Actions (pour future feature) */}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Prochainement disponible"
                      >
                        Convertir en lead
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
