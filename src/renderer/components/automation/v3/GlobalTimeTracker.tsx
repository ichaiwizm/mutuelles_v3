/**
 * GlobalTimeTracker - Display global time remaining and estimated end time
 * Shows overall progress and time estimates for current execution
 */

import React, { useMemo } from 'react'
import { Clock } from 'lucide-react'
import { formatDuration, formatEstimatedEndTime } from '../../../services/timeEstimationService'
import type { TimeEstimate } from '../../../services/timeEstimationService'

interface GlobalTimeTrackerProps {
  remainingTime: TimeEstimate
  showEndTime?: boolean
}

export default function GlobalTimeTracker({
  remainingTime,
  showEndTime = true
}: GlobalTimeTrackerProps) {
  const formattedDuration = useMemo(
    () => formatDuration(remainingTime.durationMs),
    [remainingTime.durationMs]
  )

  const formattedEndTime = useMemo(
    () => formatEstimatedEndTime(remainingTime.durationMs),
    [remainingTime.durationMs]
  )

  if (remainingTime.durationMs === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-blue-600 dark:text-blue-400" />
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          Temps restant:
        </span>
        <span className="text-blue-600 dark:text-blue-400 font-semibold">
          ~{formattedDuration}
        </span>
      </div>

      {showEndTime && (
        <>
          <span className="text-neutral-400">•</span>
          <span className="text-neutral-600 dark:text-neutral-400">
            Fin estimée: {formattedEndTime}
          </span>
        </>
      )}
    </div>
  )
}
