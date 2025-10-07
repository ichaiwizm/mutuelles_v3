import React from 'react'
import { AlertCircle } from 'lucide-react'

interface ErrorBannerProps {
  errors: Record<string, string>
  className?: string
}

export default function ErrorBanner({ errors, className = '' }: ErrorBannerProps) {
  const errorCount = Object.keys(errors).length

  if (errorCount === 0) return null

  return (
    <div className={`flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${className}`}>
      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
      <div className="text-xs">
        <p className="font-medium text-red-800 dark:text-red-300">
          {errorCount === 1 ? 'Erreur de validation' : `${errorCount} erreurs de validation`}
        </p>
        <p className="text-red-700 dark:text-red-400">
          Veuillez corriger les erreurs avant de continuer.
        </p>
      </div>
    </div>
  )
}
