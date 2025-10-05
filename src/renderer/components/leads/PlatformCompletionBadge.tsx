import React from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'

interface PlatformCompletionBadgeProps {
  platformName: string
  completion: number // 0-100
  requiredFieldsCount: number
  filledFieldsCount: number
}

export default function PlatformCompletionBadge({
  platformName,
  completion,
  requiredFieldsCount,
  filledFieldsCount
}: PlatformCompletionBadgeProps) {
  const isComplete = completion === 100
  const platformLabel = platformName === 'swisslifeone' ? 'Swiss Life One' : platformName

  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-sm">{platformLabel}</span>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
          isComplete
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
        }`}
        title={`${filledFieldsCount}/${requiredFieldsCount} champs remplis`}
      >
        {isComplete ? (
          <CheckCircle size={14} />
        ) : (
          <AlertCircle size={14} />
        )}
        <span>{completion}%</span>
      </div>
    </div>
  )
}
