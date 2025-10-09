import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { FormSchema } from '@renderer/utils/formSchemaGenerator'
import DynamicFormField from './DynamicFormField'

interface PlatformSpecificSectionProps {
  platform: 'alptis' | 'swisslifeone'
  schema: FormSchema
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  errors: Record<string, string>
  isExpanded: boolean
  onToggle: (expanded: boolean) => void
}

export default function PlatformSpecificSection({
  platform,
  schema,
  values,
  onChange,
  errors,
  isExpanded,
  onToggle
}: PlatformSpecificSectionProps) {
  const fields = schema.platformSpecific[platform]

  if (!fields || fields.length === 0) {
    return null
  }

  const platformNames = {
    alptis: 'Alptis',
    swisslifeone: 'Swiss Life One'
  }

  const addPlatformToLabel = (field: any) => {
    const baseKeys = ['regime', 'status', 'profession', 'category']
    const fieldName = field.domainKey.split('.')[1]?.replace('[]', '')

    if (baseKeys.includes(fieldName)) {
      return {
        ...field,
        label: `${field.label} (${platformNames[platform]})`
      }
    }
    return field
  }

  // Only show subscriber/project-specific fields, not spouse or children
  const subscriberFields = fields.filter(f =>
    !f.domainKey.startsWith('spouse.') &&
    !f.domainKey.startsWith('children')
  )

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

      {isExpanded && subscriberFields.length > 0 && (
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {subscriberFields.map(field => (
              <DynamicFormField
                key={field.domainKey}
                field={addPlatformToLabel(field)}
                value={values[field.domainKey]}
                onChange={(value) => onChange(field.domainKey, value)}
                error={errors[field.domainKey]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
