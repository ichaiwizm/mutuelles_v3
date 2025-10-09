import React from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface RepeatableFieldSetProps {
  title: string
  items: any[]
  onAdd: () => void
  onRemove: (index: number) => void
  renderItem: (item: any, index: number) => React.ReactNode
  maxItems?: number
}

export default function RepeatableFieldSet({
  title,
  items,
  onAdd,
  onRemove,
  renderItem,
  maxItems = 10
}: RepeatableFieldSetProps) {
  const canAdd = items.length < maxItems

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium">{title}</h5>
        {canAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
          >
            <Plus size={14} />
            Ajouter
          </button>
        )}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-3 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-md">
          Aucun élément. Cliquez sur "Ajouter" pour commencer.
        </p>
      )}

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="p-3 border border-neutral-200 dark:border-neutral-800 rounded-md space-y-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {title} #{index + 1}
              </span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
              >
                <Trash2 size={14} />
                Supprimer
              </button>
            </div>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}
