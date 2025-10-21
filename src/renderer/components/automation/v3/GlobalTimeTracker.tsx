/**
 * GlobalTimeTracker - Display global time remaining and estimated end time
 * Shows overall progress and time estimates for current execution
 * Now with live countdown that updates every second
 */

import React, { useMemo, useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { formatDuration } from '../../../services/timeEstimationService'
import type { TimeEstimate } from '../../../services/timeEstimationService'
import { useNow } from '../../../hooks/useNow'

interface GlobalTimeTrackerProps {
  remainingTime: TimeEstimate
  showEndTime?: boolean
}

export default function GlobalTimeTracker({
  remainingTime,
  showEndTime = true
}: GlobalTimeTrackerProps) {
  // Calculate estimated end time ONCE when remainingTime changes
  const [estimatedEndTime, setEstimatedEndTime] = useState<Date | null>(null)

  useEffect(() => {
    if (remainingTime.durationMs > 0) {
      setEstimatedEndTime(new Date(Date.now() + remainingTime.durationMs))
    } else {
      setEstimatedEndTime(null)
    }
  }, [remainingTime.durationMs])

  // Use live clock for countdown (updates every second)
  const now = useNow(remainingTime.durationMs > 0, 1000)

  // Calculate ACTUAL remaining time based on current clock
  const actualRemainingMs = useMemo(() => {
    if (!estimatedEndTime) return 0
    const remaining = estimatedEndTime.getTime() - now
    return Math.max(0, remaining)
  }, [estimatedEndTime, now])

  const formattedDuration = useMemo(
    () => formatDuration(actualRemainingMs),
    [actualRemainingMs]
  )

  const formattedEndTime = useMemo(() => {
    if (!estimatedEndTime) return ''
    return estimatedEndTime.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [estimatedEndTime])

  if (actualRemainingMs === 0) {
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
