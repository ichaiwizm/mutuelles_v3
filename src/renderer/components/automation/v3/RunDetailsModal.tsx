import React, { useState, useEffect } from 'react'
import { X, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import ScreenshotTimeline from './ScreenshotTimeline'

interface RunDetailsModalProps {
  runDir: string
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

export default function RunDetailsModal({
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

  // Load manifest on mount
  useEffect(() => {
    const loadManifest = async () => {
      try {
        setLoading(true)
        const response = await window.api.scenarios.getRunDetails(runDir)

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
  }, [runDir])

  // Get screenshots list
  const screenshots = manifest?.steps?.filter(s => s.screenshot) || []

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
  const status = errorSteps > 0 ? (successSteps > 0 ? 'partial' : 'error') : 'success'

  const currentImage = screenshots[currentImageIndex]?.screenshot
    ? loadedImages.get(screenshots[currentImageIndex].screenshot)
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <span className="ml-3 text-neutral-600 dark:text-neutral-400">Chargement...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {!loading && !error && manifest && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
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
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {successSteps}/{totalSteps} étapes réussies
                </span>
              </div>

              {/* Screenshots Gallery */}
              {screenshots.length > 0 && (
                <div className="space-y-4">
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
                </div>
              )}

              {/* Steps Timeline */}
              {manifest.steps && manifest.steps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Étapes d'exécution</h3>
                  <div className="space-y-2">
                    {manifest.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-3 rounded border ${
                          step.ok
                            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30'
                            : step.skipped
                            ? 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900'
                            : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
                        }`}
                      >
                        {/* Icon */}
                        {step.ok ? (
                          <CheckCircle size={16} className="flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        ) : step.skipped ? (
                          <Clock size={16} className="flex-shrink-0 mt-0.5 text-neutral-500" />
                        ) : (
                          <XCircle size={16} className="flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              Étape {step.index + 1}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {step.type}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {formatStepDuration(step.ms)}
                            </span>
                          </div>

                          {step.error && (
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                              → {step.error}
                            </p>
                          )}

                          {step.screenshot && (
                            <button
                              onClick={() => {
                                const screenshotIdx = screenshots.findIndex(s => s.screenshot === step.screenshot)
                                if (screenshotIdx >= 0) {
                                  setCurrentImageIndex(screenshotIdx)
                                }
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                            >
                              Voir screenshot
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {manifest.steps && manifest.steps.length === 0 && (
                <div className="text-center py-8 text-neutral-500">
                  Aucune étape enregistrée pour cette exécution
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
