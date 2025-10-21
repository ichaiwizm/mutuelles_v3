import React from 'react'
import { CheckCircle, XCircle, Send } from 'lucide-react'

interface ScreenshotThumbnailProps {
  screenshot: string
  stepIndex: number
  stepType: string
  isError: boolean
  isSelected: boolean
  imageData: string | null
  onSelect: () => void
}

/**
 * Screenshot thumbnail with special highlighting for:
 * - Submission screenshots (blue border)
 * - Error screenshots (red border)
 * - Selected screenshot (thicker border)
 */
export default function ScreenshotThumbnail({
  screenshot,
  stepIndex,
  stepType,
  isError,
  isSelected,
  imageData,
  onSelect
}: ScreenshotThumbnailProps) {
  // Detect submission steps (form submit, click submit button, etc.)
  const isSubmission = /submit|soumission|valider|envoyer/i.test(stepType)

  // Determine border style
  const getBorderClass = () => {
    if (isSelected) {
      if (isError) return 'border-4 border-red-600 dark:border-red-500'
      if (isSubmission) return 'border-4 border-blue-600 dark:border-blue-500'
      return 'border-4 border-blue-600 dark:border-blue-500'
    }
    if (isError) return 'border-2 border-red-400 dark:border-red-700'
    if (isSubmission) return 'border-2 border-blue-400 dark:border-blue-700'
    return 'border-2 border-neutral-300 dark:border-neutral-700'
  }

  // Icon badge
  const renderBadge = () => {
    if (isError) {
      return (
        <div className="absolute top-1 right-1 bg-red-600 dark:bg-red-500 rounded-full p-1">
          <XCircle size={12} className="text-white" />
        </div>
      )
    }
    if (isSubmission) {
      return (
        <div className="absolute top-1 right-1 bg-blue-600 dark:bg-blue-500 rounded-full p-1">
          <Send size={12} className="text-white" />
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-1">
      {/* Thumbnail */}
      <button
        onClick={onSelect}
        className={`
          relative overflow-hidden rounded
          ${getBorderClass()}
          ${isSelected ? 'shadow-lg' : 'hover:shadow-md'}
          transition-all cursor-pointer
          bg-neutral-100 dark:bg-neutral-800
        `}
        style={{ width: '120px', height: '80px' }}
        title={`Étape ${stepIndex + 1}: ${stepType}`}
      >
        {imageData ? (
          <img
            src={imageData}
            alt={`Étape ${stepIndex + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-neutral-500">Chargement...</span>
          </div>
        )}

        {/* Badge overlay */}
        {renderBadge()}
      </button>

      {/* Label */}
      <span className="text-xs text-neutral-600 dark:text-neutral-400">
        #{stepIndex + 1}
      </span>
    </div>
  )
}
