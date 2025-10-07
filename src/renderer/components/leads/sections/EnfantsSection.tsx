import React from 'react'
import { Baby, Plus, Trash2 } from 'lucide-react'
import type { CreateLeadData, EnfantInfo } from '../../../../shared/types/leads'

interface EnfantsSectionProps {
  data: CreateLeadData
  isEditing: boolean
  onEnfantsChange: (enfants: EnfantInfo[]) => void
}

export default function EnfantsSection({
  data,
  isEditing,
  onEnfantsChange
}: EnfantsSectionProps) {
  if (!data.enfants?.length && !isEditing) return null

  const handleAddEnfant = () => {
    onEnfantsChange([...(data.enfants || []), { dateNaissance: '' }])
  }

  const handleUpdateEnfant = (index: number, dateNaissance: string) => {
    const newEnfants = [...(data.enfants || [])]
    newEnfants[index] = { ...newEnfants[index], dateNaissance }
    onEnfantsChange(newEnfants)
  }

  const handleRemoveEnfant = (index: number) => {
    const newEnfants = data.enfants?.filter((_, i) => i !== index) || []
    onEnfantsChange(newEnfants)
  }

  return (
    <div className={`rounded-lg border p-3 transition-colors ${
      isEditing
        ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
        : 'border-neutral-200 dark:border-neutral-800'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Baby size={16} className="text-neutral-500" />
          <h4 className="font-medium">Enfants ({data.enfants?.length || 0})</h4>
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={handleAddEnfant}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <Plus size={14} />
            Ajouter
          </button>
        )}
      </div>

      {data.enfants && data.enfants.length > 0 ? (
        <div className="space-y-3">
          {data.enfants.map((enfant, index) => (
            <div key={index} className="flex items-center gap-3 p-2 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex-1">
                {isEditing ? (
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">
                      Date de naissance {index + 1}
                    </label>
                    <input
                      type="date"
                      value={enfant.dateNaissance || ''}
                      onChange={(e) => handleUpdateEnfant(index, e.target.value)}
                      className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-700 focus:border-emerald-500 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                    />
                  </div>
                ) : (
                  <div className="text-sm">
                    <span className="text-neutral-500">Enfant {index + 1}:</span>
                    <span className="ml-2 font-medium">{enfant.dateNaissance || '-'}</span>
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => handleRemoveEnfant(index)}
                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Aucun enfant</p>
      )}
    </div>
  )
}
