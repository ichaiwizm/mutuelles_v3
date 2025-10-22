import React, { useState } from 'react'
import { AlertCircle, Rocket, Table } from 'lucide-react'
import Modal from '../../Modal'
import type { Lead, Flow, AdvancedSettings } from '../../../hooks/useAutomation'

interface AutoPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  selectedLeads: Lead[]
  selectedFlows: Flow[]
  totalExecutions: number
  getLeadName: (id: string) => string
  settings: AdvancedSettings
  onUpdateSettings: (settings: AdvancedSettings) => void
}

export default function AutoPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  selectedLeads,
  selectedFlows,
  totalExecutions,
  getLeadName,
  settings,
  onUpdateSettings
}: AutoPreviewModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  // Group flows by platform for display
  const flowsByPlatform = selectedFlows.reduce((acc, flow) => {
    if (!acc[flow.platform]) {
      acc[flow.platform] = []
    }
    acc[flow.platform].push(flow)
    return acc
  }, {} as Record<string, Flow[]>)

  const platforms = Object.keys(flowsByPlatform)

  const handleConfirm = () => {
    if (dontShowAgain) {
      // Update settings to disable preview (persisted to database)
      onUpdateSettings({ ...settings, showPreviewBeforeRun: false })
    }
    onConfirm()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmation de lancement"
      size="xlarge"
    >
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={24} />
          <div>
            <div className="font-semibold text-base mb-1">
              Vous allez lancer {totalExecutions} exécution{totalExecutions > 1 ? 's' : ''}
            </div>
            <div className="text-sm text-neutral-700 dark:text-neutral-300">
              <span className="font-medium">{selectedLeads.length}</span> lead{selectedLeads.length > 1 ? 's' : ''} sélectionné{selectedLeads.length > 1 ? 's' : ''}
              {' × '}
              <span className="font-medium">{platforms.length}</span> plateforme{platforms.length > 1 ? 's' : ''} sélectionnée{platforms.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Matrix Preview */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <Table size={16} className="text-neutral-600 dark:text-neutral-400" />
            <span className="text-sm font-medium">Matrice d'exécution</span>
          </div>

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-medium border-b border-neutral-200 dark:border-neutral-700">
                    Lead
                  </th>
                  {platforms.map((platform) => (
                    <th
                      key={platform}
                      className="px-4 py-3 text-left font-medium border-b border-l border-neutral-200 dark:border-neutral-700"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="capitalize">{platform}</span>
                        <span className="text-xs font-normal text-neutral-500">
                          {flowsByPlatform[platform].length} flow{flowsByPlatform[platform].length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedLeads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={platforms.length + 1}
                      className="px-4 py-8 text-center text-neutral-500"
                    >
                      Aucun lead sélectionné
                    </td>
                  </tr>
                ) : (
                  selectedLeads.map((lead, leadIndex) => (
                    <tr
                      key={lead.id}
                      className={leadIndex % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-neutral-800'}
                    >
                      <td className="px-4 py-3 font-medium border-b border-neutral-200 dark:border-neutral-700">
                        <div className="flex flex-col gap-0.5">
                          <span>{getLeadName(lead.id)}</span>
                          {lead.data?.subscriber?.email && (
                            <span className="text-xs text-neutral-500">
                              {lead.data.subscriber.email}
                            </span>
                          )}
                        </div>
                      </td>
                      {platforms.map((platform) => {
                        const platformFlows = flowsByPlatform[platform]
                        return (
                          <td
                            key={`${lead.id}-${platform}`}
                            className="px-4 py-3 border-b border-l border-neutral-200 dark:border-neutral-700"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
                              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                                {platformFlows.map(f => f.name).join(', ')}
                              </div>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Don't show again checkbox */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
          <input
            type="checkbox"
            id="dont-show-again"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="dont-show-again" className="text-sm cursor-pointer select-none">
            <div className="font-medium">Ne plus afficher cet avertissement</div>
            <div className="text-xs text-neutral-500">
              Vous pourrez réactiver cette confirmation depuis les paramètres
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium border border-neutral-300 dark:border-neutral-700 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-all hover:shadow-md"
          >
            <Rocket size={16} />
            Confirmer et Lancer
          </button>
        </div>
      </div>
    </Modal>
  )
}
