import React, { useEffect, useState, useRef } from 'react'
import ScreenshotThumbnail from './ScreenshotThumbnail'
import { createLogger } from '../../../services/logger'

const logger = createLogger('ScreenshotTimeline')

interface Step {
  index: number
  type: string
  ok: boolean
  screenshot?: string
  error?: string
}

interface ScreenshotTimelineProps {
  steps: Step[]
  runDir: string
  currentIndex: number
  onSelectIndex: (index: number) => void
}

/**
 * Horizontal scrolling timeline of screenshot thumbnails
 * Uses react-window for virtual scrolling performance
 * Automatically scrolls to selected item
 */
export default function ScreenshotTimeline({
  steps,
  runDir,
  currentIndex,
  onSelectIndex
}: ScreenshotTimelineProps) {
  const [loadedImages, setLoadedImages] = useState<Map<string, string>>(new Map())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const thumbnailRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Filter steps with screenshots
  const screenshotSteps = steps.filter(s => s.screenshot)

  // Preload visible thumbnails
  useEffect(() => {
    const loadVisibleThumbnails = async () => {
      // Load current + 10 prev + 10 next
      const startIdx = Math.max(0, currentIndex - 10)
      const endIdx = Math.min(screenshotSteps.length - 1, currentIndex + 10)

      for (let i = startIdx; i <= endIdx; i++) {
        const step = screenshotSteps[i]
        if (!step?.screenshot || loadedImages.has(step.screenshot)) continue

        try {
          const s = step.screenshot
          const isAbsolute = /^([a-zA-Z]:[\\/]|\\\\|\/)/.test(s)
          const screenshotPath = isAbsolute ? s : `${runDir}/${s}`
          const response = await window.api.scenarios.readScreenshot(screenshotPath)

          if (response.success && response.data) {
            setLoadedImages(prev => new Map(prev).set(step.screenshot!, response.data!))
          }
        } catch (err) {
          logger.error('Error loading thumbnail:', err)
        }
      }
    }

    if (screenshotSteps.length > 0) {
      loadVisibleThumbnails()
    }
  }, [currentIndex, screenshotSteps, runDir, loadedImages])

  // Auto-scroll to selected thumbnail
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    const selectedThumbnail = thumbnailRefs.current.get(currentIndex)

    if (scrollContainer && selectedThumbnail) {
      const containerRect = scrollContainer.getBoundingClientRect()
      const thumbnailRect = selectedThumbnail.getBoundingClientRect()

      // Calculate the position to center the thumbnail
      const scrollLeft = selectedThumbnail.offsetLeft - (containerRect.width / 2) + (thumbnailRect.width / 2)

      scrollContainer.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      })
    }
  }, [currentIndex])

  if (screenshotSteps.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-neutral-500">
        Aucun screenshot disponible
      </div>
    )
  }

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-900">
      <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="text-sm font-semibold">Timeline des screenshots</h3>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
          {screenshotSteps.length} screenshot{screenshotSteps.length > 1 ? 's' : ''}
        </p>
      </div>

      <div ref={scrollContainerRef} className="p-3 overflow-x-auto">
        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
          {screenshotSteps.map((step, index) => (
            <div
              key={step.screenshot}
              ref={(el) => {
                if (el) {
                  thumbnailRefs.current.set(index, el)
                } else {
                  thumbnailRefs.current.delete(index)
                }
              }}
            >
              <ScreenshotThumbnail
                screenshot={step.screenshot!}
                stepIndex={step.index}
                stepType={step.type}
                isError={!step.ok}
                isSelected={index === currentIndex}
                imageData={loadedImages.get(step.screenshot!) || null}
                onSelect={() => onSelectIndex(index)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-600 dark:bg-blue-500"></div>
          <span className="text-neutral-600 dark:text-neutral-400">Soumission</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-600 dark:bg-red-500"></div>
          <span className="text-neutral-600 dark:text-neutral-400">Erreur</span>
        </div>
      </div>
    </div>
  )
}
