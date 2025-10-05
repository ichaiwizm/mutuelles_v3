import React from 'react'
import { Users } from 'lucide-react'
import type { CreateLeadData } from '../../../../shared/types/leads'
import EditableField from './EditableField'

interface ConjointSectionProps {
  data: CreateLeadData
  isEditing: boolean
  validationErrors: Record<string, string>
  onChange: (section: keyof CreateLeadData, field: string, value: any) => void
}

const REGIME_OPTIONS = [
  { value: 'Salarié', label: 'Salarié' },
  { value: 'TNS', label: 'TNS' },
  { value: 'Fonctionnaire', label: 'Fonctionnaire' },
  { value: 'Retraité', label: 'Retraité' },
  { value: 'Libéral', label: 'Libéral' },
  { value: 'Indépendant', label: 'Indépendant' }
]

export default function ConjointSection({
  data,
  isEditing,
  validationErrors,
  onChange
}: ConjointSectionProps) {
  if (!data.conjoint && !isEditing) return null

  return (
    <div className={`rounded-lg border p-3 transition-colors ${
      isEditing
        ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
        : 'border-neutral-200 dark:border-neutral-800'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <Users size={16} className="text-neutral-500" />
        <h4 className="font-medium">Conjoint</h4>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <EditableField
          section="conjoint"
          field="dateNaissance"
          label="Date de naissance"
          value={data.conjoint?.dateNaissance}
          type="date"
          isEditing={isEditing}
          hasError={!!validationErrors['conjoint.dateNaissance']}
          errorMessage={validationErrors['conjoint.dateNaissance']}
          onChange={onChange}
        />
        <EditableField
          section="conjoint"
          field="profession"
          label="Profession"
          value={data.conjoint?.profession}
          isEditing={isEditing}
          hasError={!!validationErrors['conjoint.profession']}
          errorMessage={validationErrors['conjoint.profession']}
          onChange={onChange}
        />
        <EditableField
          section="conjoint"
          field="regimeSocial"
          label="Régime"
          value={data.conjoint?.regimeSocial}
          type="select"
          colSpan={2}
          options={REGIME_OPTIONS}
          isEditing={isEditing}
          hasError={!!validationErrors['conjoint.regimeSocial']}
          errorMessage={validationErrors['conjoint.regimeSocial']}
          onChange={onChange}
        />
      </div>
    </div>
  )
}
