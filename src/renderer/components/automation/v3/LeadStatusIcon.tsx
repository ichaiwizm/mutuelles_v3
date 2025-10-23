/**
 * LeadStatusIcon - Display status icon with tooltip for a lead
 * Shows the most important status badge based on priority
 */

import React from 'react'
import { RefreshCw, XCircle, AlertTriangle, Star, Circle } from 'lucide-react'
import type { LeadStatus } from '../../../services/leadStatusService'

interface LeadStatusIconProps {
  status: LeadStatus
}

export default function LeadStatusIcon({ status }: LeadStatusIconProps) {
  // Don't render if no status
  if (status.type === 'none') {
    return null
  }

  const iconEl = (() => {
    switch (status.type) {
      case 'duplicate':
        return <RefreshCw size={14} className={status.color} />
      case 'error':
        return <XCircle size={14} className={status.color} />
      case 'incomplete':
        return <AlertTriangle size={14} className={status.color} />
      case 'new':
        return <Star size={14} className={status.color} />
      default:
        return <Circle size={12} className={status.color} />
    }
  })()

  return (
    <span className="relative group cursor-help flex-shrink-0" title={status.tooltip}>
      {iconEl}

      {/* Tooltip (on hover) */}
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 whitespace-nowrap">
        <span className="block px-3 py-1.5 text-xs font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded shadow-lg">
          {status.tooltip}
        </span>
        {/* Arrow */}
        <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-neutral-900 dark:border-t-neutral-100" />
      </span>
    </span>
  )
}
