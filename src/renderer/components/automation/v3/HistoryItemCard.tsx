import React from 'react'
import { Play, FolderOpen, FileText, CheckCircle, XCircle, Clock } from 'lucide-react'
import type { ExecutionHistoryItem } from '../../../../shared/types/automation'
import { formatDuration } from '../../../utils/dateGrouping'

interface HistoryItemCardProps {
  item: ExecutionHistoryItem
  onRerun: (item: ExecutionHistoryItem) => void
  onOpenFolder?: (runDir: string) => void
  onViewManifest?: (runDir: string) => void
}

export default function HistoryItemCard({
  item,
  onRerun,
  onOpenFolder,
  onViewManifest
}: HistoryItemCardProps) {
  const getStatusConfig = () => {
    switch (item.status) {
      case 'success':
        return {
          icon: CheckCircle,
          color: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950',
          borderColor: 'border-emerald-200 dark:border-emerald-800'
        }
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950',
          borderColor: 'border-red-200 dark:border-red-800'
        }
      case 'pending':
        return {
          icon: Clock,
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-50 dark:bg-amber-950',
          borderColor: 'border-amber-200 dark:border-amber-800'
        }
    }
  }

  const config = getStatusConfig()
  const StatusIcon = config.icon

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded border ${config.borderColor} ${config.bgColor} hover:shadow-sm transition-all`}
    >
      {/* Status icon */}
      <StatusIcon size={16} className={`flex-shrink-0 ${config.color}`} />

      {/* Content */}
      <div className="flex-1 min-w-0 grid grid-cols-3 gap-3 items-center">
        {/* Lead name */}
        <span className="text-sm font-medium truncate">{item.leadName}</span>

        {/* Platform + Flow */}
        <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
          <span>{item.platformName}</span>
          <span className="mx-1">•</span>
          <span>{item.flowName}</span>
        </div>

        {/* Duration */}
        <div className="text-xs text-neutral-500 text-right">
          {item.durationMs ? formatDuration(item.durationMs) : '-'}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Rerun */}
        <button
          onClick={() => onRerun(item)}
          className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-800 transition-colors group"
          title="Relancer cet item"
        >
          <Play size={14} className="text-neutral-600 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
        </button>

        {/* Open folder */}
        {item.runDir && onOpenFolder && (
          <button
            onClick={() => onOpenFolder(item.runDir!)}
            className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-800 transition-colors group"
            title="Ouvrir le dossier"
          >
            <FolderOpen size={14} className="text-neutral-600 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </button>
        )}

        {/* View manifest */}
        {item.runDir && onViewManifest && (
          <button
            onClick={() => onViewManifest(item.runDir!)}
            className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-800 transition-colors group"
            title="Voir le manifest"
          >
            <FileText size={14} className="text-neutral-600 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </button>
        )}
      </div>

      {/* Error message (if any) */}
      {item.status === 'error' && item.error && (
        <div className="col-span-full mt-1 p-1.5 rounded bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-300 truncate">{item.error}</p>
        </div>
      )}
    </div>
  )
}
