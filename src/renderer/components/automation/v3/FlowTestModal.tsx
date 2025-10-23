import React, { useState, useEffect, useRef } from 'react'
import { Play, Square, ExternalLink } from 'lucide-react'
import Modal from '../../Modal'
import Button from '../../Button'
import { Flow, Lead } from '../../../hooks/useAutomation'
import { generateRandomTestData } from '../../../utils/testDataGenerator'
import { generateFormSchema } from '../../../utils/formSchemaGenerator'

interface FlowTestModalProps {
  isOpen: boolean
  onClose: () => void
  flow: Flow
  leads: Lead[]
}

type TestMode = 'mock' | 'lead'
type ExecutionStatus = 'idle' | 'running' | 'success' | 'error'

export default function FlowTestModal({ isOpen, onClose, flow, leads }: FlowTestModalProps) {
  const [testMode, setTestMode] = useState<TestMode>('mock')
  const [selectedLeadId, setSelectedLeadId] = useState<string>('')
  const [status, setStatus] = useState<ExecutionStatus>('idle')
  const [visible, setVisible] = useState(false)
  const [output, setOutput] = useState<string[]>([])
  const [latestRunDir, setLatestRunDir] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (leads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(leads[0].id)
    }
  }, [leads, selectedLeadId])

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [])

  const handleTest = async () => {
    setStatus('running')
    setOutput([])
    setLatestRunDir(null)

    try {
      let leadId = selectedLeadId

      // If using mock data, generate a test lead
      if (testMode === 'mock') {
        // Generate mock lead data
        const schema = await generateFormSchema()
        const mockData = generateRandomTestData(schema)

        // Create a temporary lead in the database
        const createResult = await window.api.leads.create({
          data: mockData,
          platforms: { [flow.platform]: true }
        })

        if (!createResult.success || !createResult.data?.id) {
          throw new Error('Failed to create test lead')
        }

        leadId = createResult.data.id
        setOutput(prev => [...prev, `Lead de test créé: ${leadId.slice(0, 8)}`])
      }

      setOutput(prev => [...prev, `Démarrage du flow: ${flow.name}`])
      setOutput(prev => [...prev, `Plateforme: ${flow.platform}`])
      setOutput(prev => [...prev, `Lead: ${leadId.slice(0, 8)}`])
      setOutput(prev => [...prev, `Mode: ${visible ? 'visible' : 'headless'}`])
      setOutput(prev => [...prev, ''])

      // Run the flow
      const mode = visible ? 'dev' : 'headless'
      const result = await window.api.adminHL.runWithLeadId({
        platform: flow.platform,
        flowFile: flow.file,
        leadId: leadId,
        mode: mode,
        keepOpen: visible
      })

      setOutput(prev => [...prev, `Run key: ${result.runKey}`])

      // Listen for output
      const unsub = window.api.adminHL.onRunOutput(result.runKey, (event: any) => {
        if (event.type === 'stdout' && event.data) {
          setOutput(prev => [...prev, event.data.trim()])
        }

        if (event.type === 'stderr' && event.data) {
          setOutput(prev => [...prev, `[ERROR] ${event.data.trim()}`])
        }

        if (event.type === 'exit') {
          if (event.latestRunDir) {
            setLatestRunDir(event.latestRunDir)
          }

          if (event.code === 0) {
            setStatus('success')
            setOutput(prev => [...prev, '', 'Flow exécuté avec succès'])
          } else {
            setStatus('error')
            setOutput(prev => [...prev, '', `Flow terminé avec le code: ${event.code}`])
          }

          if (unsub) unsub()
          unsubscribeRef.current = null
        }
      })

      unsubscribeRef.current = unsub
    } catch (error) {
      setStatus('error')
      setOutput(prev => [...prev, '', `Erreur: ${String(error)}`])
    }
  }

  const handleStop = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    setStatus('idle')
    setOutput(prev => [...prev, '', "Test arrêté par l'utilisateur"]) 
  }

  const handleClose = () => {
    if (status === 'running') {
      handleStop()
    }
    onClose()
  }

  const canRun = testMode === 'mock' || (testMode === 'lead' && selectedLeadId)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Tester: ${flow.name}`} size="large">
      <div className="space-y-6">
        {/* Configuration */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mode de test</label>
            <div className="flex gap-3">
              <label className="flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-neutral-400 dark:hover:border-neutral-600 has-[:checked]:border-neutral-900 dark:has-[:checked]:border-white has-[:checked]:bg-neutral-50 dark:has-[:checked]:bg-neutral-800">
                <input
                  type="radio"
                  value="mock"
                  checked={testMode === 'mock'}
                  onChange={() => setTestMode('mock')}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-sm">Données fictives</div>
                  <div className="text-xs text-neutral-500">
                    Génère automatiquement un lead de test
                  </div>
                </div>
              </label>

              <label className="flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-neutral-400 dark:hover:border-neutral-600 has-[:checked]:border-neutral-900 dark:has-[:checked]:border-white has-[:checked]:bg-neutral-50 dark:has-[:checked]:bg-neutral-800">
                <input
                  type="radio"
                  value="lead"
                  checked={testMode === 'lead'}
                  onChange={() => setTestMode('lead')}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-sm">Lead existant</div>
                  <div className="text-xs text-neutral-500">
                    Utilise les données d'un lead réel
                  </div>
                </div>
              </label>
            </div>
          </div>

          {testMode === 'lead' && (
            <div>
              <label className="block text-sm font-medium mb-2">Sélectionner un lead</label>
              <select
                value={selectedLeadId}
                onChange={e => setSelectedLeadId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900"
              >
                {leads.map(lead => {
                  const name = `${lead.data?.subscriber?.firstName || ''} ${lead.data?.subscriber?.lastName || ''}`.trim() || lead.id.slice(0, 8)
                  return (
                    <option key={lead.id} value={lead.id}>
                      {name} ({lead.id.slice(0, 8)})
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={visible}
                onChange={e => setVisible(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700"
              />
              <span className="text-sm font-medium">
                Rendre le navigateur visible
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {status === 'running' ? (
            <Button onClick={handleStop} variant="danger" className="flex-1">
              <Square size={16} />
              Arrêter
            </Button>
          ) : (
            <Button
              onClick={handleTest}
              disabled={!canRun}
              variant="primary"
              className="flex-1"
            >
              <Play size={16} />
              Lancer le test
            </Button>
          )}

          {latestRunDir && (
            <Button
              onClick={() => window.api.scenarios.openPath(latestRunDir)}
              variant="secondary"
            >
              <ExternalLink size={16} />
              Ouvrir le dossier
            </Button>
          )}
        </div>

        {/* Output */}
        {output.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Console</label>
              <div
                className={`text-xs px-2 py-1 rounded ${
                  status === 'running'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                    : status === 'success'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                    : status === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {status === 'running' && 'En cours...'}
                {status === 'success' && 'Succès'}
                {status === 'error' && 'Erreur'}
                {status === 'idle' && 'Prêt'}
              </div>
            </div>

            <div className="bg-neutral-900 dark:bg-black rounded-md p-4 font-mono text-xs text-neutral-100 max-h-96 overflow-y-auto">
              {output.map((line, index) => (
                <div key={index} className={line.startsWith('[ERROR]') ? 'text-red-400' : ''}>
                  {line || '\u00A0'}
                </div>
              ))}
              {status === 'running' && (
                <div className="animate-pulse text-neutral-400">▊</div>
              )}
            </div>
          </div>
        )}

        {/* Flow info */}
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-md p-4 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-500">Plateforme:</span>
            <span className="font-medium capitalize">{flow.platform}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Slug:</span>
            <span className="font-medium">{flow.slug}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Fichier:</span>
            <span className="font-medium font-mono truncate max-w-md" title={flow.file}>
              {flow.file.split('/').pop()}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
