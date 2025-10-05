import React from 'react'
import { Briefcase } from 'lucide-react'
import type { CreateLeadData } from '../../../../shared/types/leads'
import EditableField from './EditableField'

interface SouscripteurSectionProps {
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

export default function SouscripteurSection({
  data,
  isEditing,
  validationErrors,
  onChange
}: SouscripteurSectionProps) {
  if (!data.souscripteur && !isEditing) return null

  return (
    <div className={`rounded-lg border p-3 transition-colors ${
      isEditing
        ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
        : 'border-neutral-200 dark:border-neutral-800'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <Briefcase size={16} className="text-neutral-500" />
        <h4 className="font-medium">Souscripteur</h4>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <EditableField
          section="souscripteur"
          field="dateNaissance"
          label="Date de naissance"
          value={data.souscripteur?.dateNaissance}
          type="date"
          isEditing={isEditing}
          hasError={!!validationErrors['souscripteur.dateNaissance']}
          errorMessage={validationErrors['souscripteur.dateNaissance']}
          onChange={onChange}
        />
        <EditableField
          section="souscripteur"
          field="profession"
          label="Profession"
          value={data.souscripteur?.profession}
          isEditing={isEditing}
          hasError={!!validationErrors['souscripteur.profession']}
          errorMessage={validationErrors['souscripteur.profession']}
          onChange={onChange}
        />
        <EditableField
          section="souscripteur"
          field="regimeSocial"
          label="Régime social"
          value={data.souscripteur?.regimeSocial}
          type="select"
          options={REGIME_OPTIONS}
          isEditing={isEditing}
          hasError={!!validationErrors['souscripteur.regimeSocial']}
          errorMessage={validationErrors['souscripteur.regimeSocial']}
          onChange={onChange}
        />
        <EditableField
          section="souscripteur"
          field="nombreEnfants"
          label="Nombre d'enfants"
          value={data.souscripteur?.nombreEnfants ?? 0}
          type="number"
          isEditing={isEditing}
          hasError={!!validationErrors['souscripteur.nombreEnfants']}
          errorMessage={validationErrors['souscripteur.nombreEnfants']}
          onChange={onChange}
        />
      </div>
    </div>
  )
}
