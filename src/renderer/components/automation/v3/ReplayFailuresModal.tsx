/**
 * ReplayFailuresModal - Modal to review and replay failed executions
 * Shows list of failed items with option to edit leads or replay all
 */

import React from 'react'
import { X, RotateCcw, Edit2, AlertTriangle } from 'lucide-react'
import type { ExecutionItem } from '../../../hooks/useAutomation'

interface ReplayFailuresModalProps {
  isOpen: boolean
  onClose: () => void
  failedItems: ExecutionItem[]
  onReplayAll: () => void
  onEditLead?: (leadId: string) => void
}

export default function ReplayFailuresModal({
  isOpen,
  onClose,
  failedItems,
  onReplayAll,
  onEditLead
}: ReplayFailuresModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            <div>
              <h2 className="text-lg font-semibold">Échecs détectés</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {failedItems.length} exécution{failedItems.length > 1 ? 's ont' : ' a'} échoué
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {failedItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                      {item.leadName}
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                      {item.platformName} • {item.flowName}
                    </div>
                    {item.message && (
                      <div className="text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 p-2 rounded">
                        <span className="font-medium">Erreur:</span> {item.message}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {onEditLead && (
                    <button
                      onClick={() => {
                        onEditLead(item.leadId)
                        onClose()
                      }}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors flex-shrink-0"
                      title="Corriger le lead"
                    >
                      <Edit2 size={14} />
                      Corriger
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Les leads et flows seront pré-sélectionnés pour vous
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-neutral-300 dark:border-neutral-700 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                onReplayAll()
                onClose()
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
            >
              <RotateCcw size={16} />
              Rejouer tous les échecs
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
