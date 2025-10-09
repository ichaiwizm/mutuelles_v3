import React from 'react'
import { LucideIcon, Plus, Trash2 } from 'lucide-react'

interface ToggleableSectionWrapperProps {
  title: string
  icon: LucideIcon
  isActive: boolean
  onToggle: (active: boolean) => void
  children: React.ReactNode
  isEditing?: boolean
}

export default function ToggleableSectionWrapper({
  title,
  icon: Icon,
  isActive,
  onToggle,
  children,
  isEditing = true
}: ToggleableSectionWrapperProps) {
  if (!isActive && !isEditing) {
    return null
  }

  return (
    <div
      className={`rounded-lg border p-3 transition-all ${
        isEditing && isActive
          ? 'border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm'
          : isEditing
          ? 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30'
          : 'border-neutral-200 dark:border-neutral-800'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-neutral-500" />
          <h4 className="font-medium">{title}</h4>
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={() => onToggle(!isActive)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              isActive
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
            }`}
          >
            {isActive ? (
              <>
                <Trash2 size={14} />
                Supprimer
              </>
            ) : (
              <>
                <Plus size={14} />
                Ajouter
              </>
            )}
          </button>
        )}
      </div>

      {isActive && children}

      {!isActive && isEditing && (
        <p className="text-sm text-neutral-500 text-center py-2">
          Cliquez sur "Ajouter" pour renseigner les informations du {title.toLowerCase()}
        </p>
      )}
    </div>
  )
}
