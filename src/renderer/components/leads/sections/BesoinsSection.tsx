import React from 'react'
import { Heart } from 'lucide-react'
import type { CreateLeadData } from '@shared/types/leads'
import EditableField from './EditableField'

interface BesoinsSectionProps {
  data: CreateLeadData
  isEditing: boolean
  validationErrors: Record<string, string>
  onChange: (section: keyof CreateLeadData, field: string, value: any) => void
  onNestedChange: (section: keyof CreateLeadData, subSection: string, field: string, value: any) => void
}

export default function BesoinsSection({
  data,
  isEditing,
  validationErrors,
  onChange,
  onNestedChange
}: BesoinsSectionProps) {
  if (!data.besoins && !isEditing) return null

  return (
    <div className={`rounded-lg border p-3 transition-colors ${
      isEditing
        ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
        : 'border-neutral-200 dark:border-neutral-800'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <Heart size={16} className="text-neutral-500" />
        <h4 className="font-medium">Besoins</h4>
      </div>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <EditableField
            section="besoins"
            field="dateEffet"
            label="Date d'effet"
            value={data.besoins?.dateEffet}
            type="date"
            isEditing={isEditing}
            hasError={!!validationErrors['besoins.dateEffet']}
            errorMessage={validationErrors['besoins.dateEffet']}
            onChange={onChange}
          />
          {isEditing ? (
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Actuellement assuré</label>
              <select
                value={data.besoins?.assureActuellement?.toString() || ''}
                onChange={(e) => onChange('besoins', 'assureActuellement', e.target.value === 'true')}
                className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-700 focus:border-emerald-500 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
              >
                <option value="">-</option>
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>
            </div>
          ) : (
            data.besoins?.assureActuellement !== undefined && (
              <div>
                <span className="text-neutral-500">Actuellement assuré:</span>
                <span className="ml-2">{data.besoins.assureActuellement ? 'Oui' : 'Non'}</span>
              </div>
            )
          )}
        </div>

        {/* Niveaux de couverture */}
        {(data.besoins?.niveaux || isEditing) && (
          <div>
            <label className="block text-xs text-neutral-500 mb-2">Niveaux de couverture</label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {isEditing ? (
                <>
                  {['soinsMedicaux', 'hospitalisation', 'optique', 'dentaire'].map((field) => (
                    <div key={field}>
                      <label className="block text-xs text-neutral-400 mb-1">
                        {field === 'soinsMedicaux' ? 'Soins' : field === 'hospitalisation' ? 'Hospi' : field.charAt(0).toUpperCase() + field.slice(1)}
                      </label>
                      <select
                        value={data.besoins?.niveaux?.[field as keyof typeof data.besoins.niveaux] || ''}
                        onChange={(e) => onNestedChange('besoins', 'niveaux', field, Number(e.target.value) || undefined)}
                        className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-700 focus:border-emerald-500 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                      >
                        <option value="">-</option>
                        {[1, 2, 3, 4].map(n => <option key={n} value={n}>Niveau {n}</option>)}
                      </select>
                    </div>
                  ))}
                </>
              ) : (
                data.besoins?.niveaux && (
                  <div className="col-span-2 grid grid-cols-4 gap-2 text-xs">
                    {data.besoins.niveaux.soinsMedicaux && (
                      <div><span className="text-neutral-500">Soins:</span> {data.besoins.niveaux.soinsMedicaux}</div>
                    )}
                    {data.besoins.niveaux.hospitalisation && (
                      <div><span className="text-neutral-500">Hospi:</span> {data.besoins.niveaux.hospitalisation}</div>
                    )}
                    {data.besoins.niveaux.optique && (
                      <div><span className="text-neutral-500">Optique:</span> {data.besoins.niveaux.optique}</div>
                    )}
                    {data.besoins.niveaux.dentaire && (
                      <div><span className="text-neutral-500">Dentaire:</span> {data.besoins.niveaux.dentaire}</div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
