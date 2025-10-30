import React, { useState, useMemo } from 'react'
import { Settings, Zap } from 'lucide-react'
import { useAutomation } from '../hooks/useAutomation'
import { useToastContext } from '../contexts/ToastContext'
import { useConfirmation } from '../hooks/useConfirmation'
import CompactStats from '../components/automation/v3/CompactStats'
import AdvancedModeTab from '../components/automation/v3/AdvancedModeTab'
import SettingsModal from '../components/automation/v3/SettingsModal'

export default function AutomationV3() {
  // State
  const [showSettings, setShowSettings] = useState(false)

  // Hooks
  const automation = useAutomation()
  const toast = useToastContext()
  const { confirm } = useConfirmation()

  // Stats computation - unified with runHistory
  const stats = useMemo(() => {
    return {
      totalLeads: automation.leads.length,
      totalPlatforms: automation.platforms.length,
      totalFlows: automation.flows.length,
      totalRuns: automation.runHistory.length
    }
  }, [automation.leads, automation.platforms, automation.flows, automation.runHistory.length])

  // Handlers
  const handleStartExecution = async (mode: 'headless' | 'dev' | 'dev_private') => {
    try {
      if (automation.totalExecutions === 0) {
        toast.warning('Sélection requise', 'Veuillez sélectionner au moins un lead et un flow')
        return
      }

      await automation.startRun(mode)
      toast.success('Exécution démarrée', `${automation.totalExecutions} exécution(s) en cours`)
    } catch (error) {
      console.error('Failed to start execution:', error)
      toast.error('Erreur', error instanceof Error ? error.message : 'Impossible de démarrer l\'exécution')
    }
  }

  const handleSaveSettings = (settings: typeof automation.settings) => {
    automation.updateSettings(settings)
    toast.success('Paramètres sauvegardés', 'Vos paramètres ont été mis à jour')
  }

  const handleResetSettings = () => {
    automation.resetSettings()
  }

  const handleStopAll = async () => {
    if (!automation.isRunning) {
      toast.warning('Aucune exécution', 'Aucune exécution en cours')
      return
    }

    confirm(
      'Êtes-vous sûr de vouloir arrêter l\'exécution en cours ?',
      async () => {
        try {
          // Use the hook's stopRun method for proper state management
          const result = await automation.stopRun()
          if (result.success) {
            toast.success('Arrêté', result.message || 'Exécution arrêtée')
          } else {
            toast.error('Erreur', result.message || 'Impossible d\'arrêter l\'exécution')
          }
        } catch (error) {
          console.error('Failed to stop execution:', error)
          toast.error('Erreur', error instanceof Error ? error.message : 'Impossible d\'arrêter l\'exécution')
        }
      }
    )
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Title & Description */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="text-blue-600 dark:text-blue-400" size={28} />
            Automatisations
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Exécutez vos flows sur plusieurs leads et plateformes
          </p>
        </div>

        {/* Compact Stats & Settings */}
        <div className="flex items-center justify-between">
          <CompactStats
            totalLeads={stats.totalLeads}
            totalPlatforms={stats.totalPlatforms}
            totalFlows={stats.totalFlows}
            totalRuns={stats.totalRuns}
          />

          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            title="Paramètres avancés"
          >
            <Settings size={18} />
            Paramètres
          </button>
        </div>
      </div>

      {/* Content Area */}
      <AdvancedModeTab
        leads={automation.leads}
        platforms={automation.platforms}
        flows={automation.flows}
        selectedLeadIds={automation.selectedLeadIds}
        selectedFlowIds={automation.selectedFlowIds}
        onToggleLead={automation.toggleLead}
        onToggleFlow={automation.toggleFlow}
        onTogglePlatform={automation.togglePlatform}
        onSelectAllLeads={automation.selectAllLeads}
        onClearLeadSelection={automation.clearLeadSelection}
        onSelectAllFlows={automation.selectAllFlows}
        onClearFlowSelection={automation.clearFlowSelection}
        isRunning={automation.isRunning}
        runId={automation.runId}
        executionItems={automation.executionItems}
        totalExecutions={automation.totalExecutions}
        onStartRun={handleStartExecution}
        onStopExecution={handleStopAll}
        onClearCompletedExecutions={automation.clearExecution}
        runHistory={automation.runHistory}
        onRerunHistory={automation.rerunHistoryRun}
        onRerunHistoryItem={automation.rerunSingleItem}
        onDeleteHistory={automation.deleteHistoryRun}
        settings={automation.settings}
        onUpdateSettings={automation.updateSettings}
        getLeadName={automation.getLeadName}
        onPrepareReplayFromErrors={automation.prepareReplayFromErrors}
        onRetryItem={automation.requeueItem}
        onRetryFailedItems={automation.requeueItems}
        onStopItem={automation.stopItem}
        onTogglePauseItem={automation.toggleItemPause}
        activeRunMode={automation.activeRun?.mode}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={automation.settings}
        onSave={handleSaveSettings}
        onReset={handleResetSettings}
        platforms={automation.platforms}
        flows={automation.flows}
      />
    </section>
  )
}
