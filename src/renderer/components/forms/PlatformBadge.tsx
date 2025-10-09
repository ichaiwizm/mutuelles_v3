import React from 'react'

interface PlatformBadgeProps {
  platform: 'alptis' | 'swisslifeone'
}

export default function PlatformBadge({ platform }: PlatformBadgeProps) {
  const config = {
    alptis: {
      label: 'Alptis',
      color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    },
    swisslifeone: {
      label: 'Swiss Life',
      color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    }
  }

  const { label, color } = config[platform]

  return (
    <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium ${color}`}>
      {label}
    </span>
  )
}
