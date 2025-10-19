import React, { useState, useEffect } from 'react'
import { X, Play, FileText, List, Layers } from 'lucide-react'
import Modal from '../../Modal'
import type { Flow } from '../../../hooks/useAutomation'

interface FlowDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  flow: Flow | null
  onLaunchTest?: (flow: Flow) => void
}

interface FlowDefinition {
  version: number
  platform: string
  slug: string
  name: string
  description?: string
  trace?: string
  steps: Array<{
    type: string
    label?: string
    [key: string]: any
  }>
}

export default function FlowDetailsModal({
  isOpen,
  onClose,
  flow,
  onLaunchTest
}: FlowDetailsModalProps) {
  const [flowDefinition, setFlowDefinition] = useState<FlowDefinition | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !flow) {
      setFlowDefinition(null)
      setError(null)
      return
    }

    // Load the flow definition from the file
    const loadFlowDefinition = async () => {
      setLoading(true)
      setError(null)

      try {
        // Use the adminHL API to read the flow file
        const result = await window.api.adminHL.readFlowFile(flow.file)
        if (result) {
          setFlowDefinition(result)
        } else {
          setError('Could not load flow definition')
        }
      } catch (err) {
        console.error('Failed to load flow definition:', err)
        setError('Failed to load flow definition')
      } finally {
        setLoading(false)
      }
    }

    loadFlowDefinition()
  }, [isOpen, flow])

  if (!flow) return null

  const getStepTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      goto: '🌐',
      fillField: '✏️',
      selectField: '📋',
      clickField: '👆',
      toggleField: '🔘',
      typeField: '⌨️',
      waitForField: '⏳',
      acceptConsent: '✅',
      sleep: '⏱️',
      enterFrame: '🖼️',
      exitFrame: '🚪',
      scrollIntoView: '📜',
      pressKey: '⌨️',
      waitNetworkIdle: '🌐',
      comment: '💬'
    }
    return icons[type] || '⚙️'
  }

  const getStepTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      goto: 'Navigation',
      fillField: 'Remplir champ',
      selectField: 'Sélectionner',
      clickField: 'Cliquer',
      toggleField: 'Toggle',
      typeField: 'Taper',
      waitForField: 'Attendre champ',
      acceptConsent: 'Accepter consentement',
      sleep: 'Pause',
      enterFrame: 'Entrer iframe',
      exitFrame: 'Sortir iframe',
      scrollIntoView: 'Scroller',
      pressKey: 'Touche',
      waitNetworkIdle: 'Attendre réseau',
      comment: 'Commentaire'
    }
    return labels[type] || type
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold mb-1 truncate">{flow.name}</h2>
              <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <Layers size={14} />
                <span className="capitalize">{flow.platform}</span>
                <span>•</span>
                <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                  {flow.slug}
                </code>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div className="text-center py-8 text-neutral-500">
            Chargement du flow...
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
          </div>
        )}

        {flowDefinition && (
          <>
            {/* Description */}
            {flowDefinition.description && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-neutral-500" />
                  <h3 className="text-sm font-semibold">Description</h3>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                  {flowDefinition.description}
                </p>
              </div>
            )}

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <List size={16} className="text-neutral-500" />
                  <h3 className="text-sm font-semibold">
                    Étapes ({flowDefinition.steps.length})
                  </h3>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {flowDefinition.steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-center w-8 h-8 flex-shrink-0 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{getStepTypeIcon(step.type)}</span>
                          <span className="text-sm font-medium">
                            {getStepTypeLabel(step.type)}
                          </span>
                          {step.optional && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                              optionnel
                            </span>
                          )}
                        </div>

                        {step.label && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                            {step.label}
                          </div>
                        )}

                        {/* Show additional info based on step type */}
                        {step.type === 'goto' && step.url && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
                            {step.url}
                          </div>
                        )}
                        {(step.field || step.domainField) && (
                          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                            Champ: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                              {step.field || step.domainField}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Version:</span>
                  <span className="font-medium">{flowDefinition.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Trace:</span>
                  <span className="font-medium">{flowDefinition.trace || 'N/A'}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-neutral-500">Fichier:</span>
                  <span className="font-medium font-mono text-right truncate ml-2">
                    {flow.file.split('/').slice(-2).join('/')}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-neutral-300 dark:border-neutral-700 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Fermer
          </button>

          {onLaunchTest && (
            <button
              onClick={() => {
                onClose()
                onLaunchTest(flow)
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Play size={16} />
              Tester ce flow
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
