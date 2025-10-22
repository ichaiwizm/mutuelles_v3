import React, { useState, useEffect } from 'react'
import { X, CheckCircle, XCircle, Clock, Loader2, ArrowLeft, ArrowRight, Copy, Check } from 'lucide-react'
import ScreenshotTimeline from './ScreenshotTimeline'
import Tabs from '../../Tabs'

interface RunDetailsModalProps {
  runId: string      // Parent run ID
  itemId: string     // Execution item ID (for loading data from DB)
  runDir: string     // Filesystem path (for loading screenshots)
  leadName: string
  platformName: string
  flowName: string
  onClose: () => void
}

interface Step {
  index: number
  type: string
  ok: boolean
  ms?: number
  screenshot?: string
  error?: string
  skipped?: boolean
}

interface RunManifest {
  lead?: {
    name?: string
  }
  run?: {
    platform?: string
    slug?: string
    startedAt?: string
    finishedAt?: string
  }
  steps?: Step[]
  artifacts?: {
    screenshotsDir?: string
  }
}

type TabKey = 'overview' | 'screenshots' | 'details'

export default function RunDetailsModal({
  runId,
  itemId,
  runDir,
  leadName,
  platformName,
  flowName,
  onClose
}: RunDetailsModalProps) {
  const [manifest, setManifest] = useState<RunManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loadedImages, setLoadedImages] = useState<Map<string, string>>(new Map())
  const [loadingImage, setLoadingImage] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [copiedJson, setCopiedJson] = useState(false)

  // Load manifest on mount using itemId from database
  useEffect(() => {
    const loadManifest = async () => {
      try {
        setLoading(true)
        const response = await window.api.scenarios.getItemDetails(itemId)

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to load run details')
        }

        setManifest(response.data)
        setError(null)
      } catch (err) {
        console.error('Error loading manifest:', err)
        setError(err instanceof Error ? err.message : 'Failed to load run details')
      } finally {
        setLoading(false)
      }
    }

    loadManifest()
  }, [itemId])

  // Get screenshots list
  const screenshots = manifest?.steps?.filter(s => s.screenshot) || []

  // Initialize to middle screenshot when manifest is loaded
  useEffect(() => {
    if (screenshots.length > 0 && currentImageIndex === 0) {
      const middleIndex = Math.floor(screenshots.length / 2)
      setCurrentImageIndex(middleIndex)
    }
  }, [screenshots.length])

  // Load current image
  useEffect(() => {
    if (screenshots.length === 0) return

    const currentScreenshot = screenshots[currentImageIndex]
    if (!currentScreenshot?.screenshot) return

    // Check if already loaded
    if (loadedImages.has(currentScreenshot.screenshot)) return

    const loadImage = async () => {
      try {
        setLoadingImage(true)
        const screenshotPath = `${runDir}/${currentScreenshot.screenshot}`
        const response = await window.api.scenarios.readScreenshot(screenshotPath)

        if (response.success && response.data) {
          setLoadedImages(prev => new Map(prev).set(currentScreenshot.screenshot!, response.data!))
        }
      } catch (err) {
        console.error('Error loading screenshot:', err)
      } finally {
        setLoadingImage(false)
      }
    }

    loadImage()
  }, [currentImageIndex, screenshots, runDir, loadedImages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }

    // Screenshot navigation when in screenshots tab
    if (activeTab === 'screenshots' && screenshots.length > 0) {
      if (e.key === 'ArrowLeft' && currentImageIndex > 0) {
        setCurrentImageIndex(currentImageIndex - 1)
      } else if (e.key === 'ArrowRight' && currentImageIndex < screenshots.length - 1) {
        setCurrentImageIndex(currentImageIndex + 1)
      }
    }
  }

  // Handle copying JSON to clipboard
  const handleCopyJson = () => {
    if (!manifest) return
    navigator.clipboard.writeText(JSON.stringify(manifest, null, 2))
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 2000)
  }

  // Navigate to screenshot from timeline
  const handleViewScreenshot = (screenshotPath: string) => {
    const screenshotIdx = screenshots.findIndex(s => s.screenshot === screenshotPath)
    if (screenshotIdx >= 0) {
      setCurrentImageIndex(screenshotIdx)
      setActiveTab('screenshots')
    }
  }

  // Calculate duration
  const duration = manifest?.run?.startedAt && manifest?.run?.finishedAt
    ? new Date(manifest.run.finishedAt).getTime() - new Date(manifest.run.startedAt).getTime()
    : null

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`
  }

  const formatStepDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  // Status summary
  const totalSteps = manifest?.steps?.length || 0
  const successSteps = manifest?.steps?.filter(s => s.ok).length || 0
  const errorSteps = manifest?.steps?.filter(s => !s.ok && !s.skipped).length || 0
  const skippedSteps = manifest?.steps?.filter(s => s.skipped).length || 0
  const status = errorSteps > 0 ? (successSteps > 0 ? 'partial' : 'error') : 'success'

  // Find first error
  const firstError = manifest?.steps?.find(s => !s.ok && !s.skipped)

  // Calculate average step duration
  const stepsWithDuration = manifest?.steps?.filter(s => s.ms && s.ms > 0) || []
  const avgStepDuration = stepsWithDuration.length > 0
    ? stepsWithDuration.reduce((sum, s) => sum + (s.ms || 0), 0) / stepsWithDuration.length
    : 0

  // Find slowest step
  const slowestStep = stepsWithDuration.length > 0
    ? stepsWithDuration.reduce((max, s) => (s.ms || 0) > (max.ms || 0) ? s : max)
    : null

  const currentImage = screenshots[currentImageIndex]?.screenshot
    ? loadedImages.get(screenshots[currentImageIndex].screenshot)
    : null

  // Tabs configuration
  const tabs = [
    { key: 'overview', label: 'Vue d\'ensemble' },
    { key: 'screenshots', label: `Screenshots (${screenshots.length})` },
    { key: 'details', label: 'Détails' }
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{leadName}</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {platformName} • {flowName}
              {duration && ` • ${formatDuration(duration)}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(key) => setActiveTab(key as TabKey)} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <span className="ml-3 text-neutral-600 dark:text-neutral-400">Chargement...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          ) : manifest ? (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Status Badge */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {status === 'success' && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle size={16} />
                        <span className="text-sm font-medium">Succès complet</span>
                      </div>
                    )}
                    {status === 'partial' && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        <CheckCircle size={16} />
                        <span className="text-sm font-medium">Succès partiel</span>
                      </div>
                    )}
                    {status === 'error' && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                        <XCircle size={16} />
                        <span className="text-sm font-medium">Échec</span>
                      </div>
                    )}
                  </div>

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                      <div className="text-xs text-neutral-500 mb-1">Étapes réussies</div>
                      <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{successSteps}/{totalSteps}</div>
                    </div>
                    <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                      <div className="text-xs text-neutral-500 mb-1">Durée totale</div>
                      <div className="text-2xl font-bold">{duration ? formatDuration(duration) : '-'}</div>
                    </div>
                    <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                      <div className="text-xs text-neutral-500 mb-1">Durée moyenne/étape</div>
                      <div className="text-2xl font-bold">{formatStepDuration(avgStepDuration)}</div>
                    </div>
                    <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                      <div className="text-xs text-neutral-500 mb-1">Screenshots</div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{screenshots.length}</div>
                    </div>
                  </div>

                  {/* Error Section */}
                  {firstError && (
                    <div className="p-4 rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
                      <h3 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">Première erreur détectée</h3>
                      <div className="flex items-start gap-3">
                        <XCircle size={20} className="flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-medium mb-1">Étape {firstError.index + 1} - {firstError.type}</div>
                          <p className="text-sm text-red-700 dark:text-red-300">{firstError.error}</p>
                          {firstError.screenshot && (
                            <button
                              onClick={() => handleViewScreenshot(firstError.screenshot!)}
                              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Voir le screenshot de l'erreur →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-3">
                    {screenshots.length > 0 && (
                      <button
                        onClick={() => setActiveTab('screenshots')}
                        className="flex-1 px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <div className="text-sm font-medium">Voir les screenshots</div>
                        <div className="text-xs text-neutral-500">{screenshots.length} disponibles</div>
                      </button>
                    )}
                  </div>

                  {/* Slowest Step */}
                  {slowestStep && (
                    <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                      <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1">Étape la plus lente</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Étape {slowestStep.index + 1} - {slowestStep.type}</span>
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{formatStepDuration(slowestStep.ms)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SCREENSHOTS TAB */}
              {activeTab === 'screenshots' && (
                <div className="space-y-4">
                  {screenshots.length > 0 ? (
                    <>
                      {/* Navigation hint */}
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <div className="flex items-center gap-2">
                          <ArrowLeft size={14} />
                          <span>Utilisez les flèches ← → pour naviguer</span>
                          <ArrowRight size={14} />
                        </div>
                        <span>Screenshot {currentImageIndex + 1}/{screenshots.length}</span>
                      </div>

                      {/* Main image viewer */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">
                            Screenshot #{currentImageIndex + 1}
                          </h3>
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">
                            {screenshots[currentImageIndex]?.type}
                          </span>
                        </div>

                        <div className="relative bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
                          {loadingImage && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Loader2 className="animate-spin text-blue-600" size={24} />
                            </div>
                          )}
                          {currentImage && (
                            <img
                              src={currentImage}
                              alt={`Screenshot ${currentImageIndex + 1}`}
                              className="w-full h-auto"
                            />
                          )}
                        </div>
                      </div>

                      {/* Screenshot Timeline */}
                      <ScreenshotTimeline
                        steps={manifest?.steps || []}
                        runDir={runDir}
                        currentIndex={currentImageIndex}
                        onSelectIndex={setCurrentImageIndex}
                      />
                    </>
                  ) : (
                    <div className="text-center py-12 text-neutral-500">
                      Aucun screenshot disponible pour cette exécution
                    </div>
                  )}
                </div>
              )}

              {/* DETAILS TAB */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  {/* Copy button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleCopyJson}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      {copiedJson ? (
                        <>
                          <Check size={14} className="text-emerald-600" />
                          <span>Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copier le JSON</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* JSON Display */}
                  <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-4 overflow-x-auto">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(manifest, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
