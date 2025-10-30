import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { FormSchema, shouldShowField } from '@renderer/utils/formSchemaGenerator'
import DynamicFormField from './DynamicFormField'

interface PlatformSpecificSectionProps {
  platform: 'alptis' | 'swisslifeone'
  schema: FormSchema
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  errors: Record<string, string>
  isExpanded: boolean
  onToggle: (expanded: boolean) => void
  disabled?: boolean
}

export default function PlatformSpecificSection({
  platform,
  schema,
  values,
  onChange,
  errors,
  isExpanded,
  onToggle,
  disabled = false
}: PlatformSpecificSectionProps) {
  const fields = schema.platformSpecific[platform]

  if (!fields || fields.length === 0) {
    return null
  }

  const platformNames = {
    alptis: 'Alptis',
    swisslifeone: 'Swiss Life One'
  }

  // Only show subscriber/project-specific fields, not spouse or children
  const subscriberFields = fields.filter(f =>
    !f.domainKey.includes('.spouse.') &&
    !f.domainKey.includes('children')
  )

  // Filter fields based on showIf conditions
  const visibleFields = subscriberFields.filter(field => shouldShowField(field, values))

  // Helper: map a carrier-prefixed key (e.g., 'swisslifeone.subscriber.status')
  // to its engine key (unprefixed, e.g., 'subscriber.status')
  const toEngineKey = (domainKey: string): string | null => {
    const prefixes = ['alptis.', 'swisslifeone.']
    for (const p of prefixes) {
      if (domainKey.startsWith(p)) return domainKey.slice(p.length)
    }
    return null
  }

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <h4 className="font-medium">
          Champs spécifiques - {platformNames[platform]}
        </h4>
        {isExpanded ? (
          <ChevronDown size={20} className="text-neutral-500" />
        ) : (
          <ChevronRight size={20} className="text-neutral-500" />
        )}
      </button>

      {isExpanded && visibleFields.length > 0 && (
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleFields.map(field => {
              const engineKey = toEngineKey(field.domainKey)
              const currentVal = values[field.domainKey]
              const engineVal = engineKey ? values[engineKey] : undefined
              const showEngine = engineKey && engineVal !== undefined && String(engineVal) !== String(currentVal)

              return (
                <div key={field.domainKey} className="space-y-1">
                  <DynamicFormField
                    field={field}
                    value={currentVal}
                    onChange={(value) => onChange(field.domainKey, value)}
                    error={errors[field.domainKey]}
                    disabled={disabled}
                  />
                  {showEngine && (
                    <div className="text-[11px] text-neutral-500">
                      Valeur utilisée par l'engine: <span className="font-medium">{String(engineVal)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
