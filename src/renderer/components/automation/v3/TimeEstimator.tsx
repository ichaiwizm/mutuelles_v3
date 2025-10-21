/**
 * TimeEstimator - Display estimated duration badge
 * Shows estimated duration for a pending execution item
 */

import React from 'react'
import { Clock } from 'lucide-react'
import { formatDuration } from '../../../services/timeEstimationService'

interface TimeEstimatorProps {
  durationMs: number
  confidence?: 'high' | 'medium' | 'low'
}

export default function TimeEstimator({ durationMs, confidence = 'medium' }: TimeEstimatorProps) {
  const formattedDuration = formatDuration(durationMs)

  return (
    <div
      className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400"
      title={`Durée estimée: ${formattedDuration} (confiance: ${confidence})`}
    >
      <Clock size={12} className="flex-shrink-0" />
      <span className="flex-shrink-0">~{formattedDuration}</span>
    </div>
  )
}
