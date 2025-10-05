import React from 'react'
import { X, Edit, RotateCcw, Trash2, Star } from 'lucide-react'
import type { FullLead } from '../../../shared/types/leads'

interface ViewEditLeadModalHeaderProps {
  lead: FullLead
  isEditing: boolean
  loading: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
  onDelete: (lead: FullLead) => void
  onClose: () => void
}

export default function ViewEditLeadModalHeader({
  lead,
  isEditing,
  loading,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onClose
}: ViewEditLeadModalHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">
          {lead.contact.prenom} {lead.contact.nom}
        </h2>
        <div className="flex items-center gap-1">
          <Star className={`w-4 h-4 ${lead.qualityScore >= 8 ? 'text-emerald-500' : lead.qualityScore >= 5 ? 'text-amber-500' : 'text-red-500'}`} />
          <span className="font-mono text-sm">{lead.qualityScore}/10</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isEditing ? (
          <>
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <Edit size={16} />
              Modifier
            </button>
            <button
              onClick={() => onDelete(lead)}
              className="px-3 py-2 text-sm rounded-md border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onCancelEdit}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <RotateCcw size={16} />
              Annuler
            </button>
            <button
              onClick={onSave}
              disabled={loading}
              className="px-3 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </>
        )}
        <button
          onClick={onClose}
          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}
