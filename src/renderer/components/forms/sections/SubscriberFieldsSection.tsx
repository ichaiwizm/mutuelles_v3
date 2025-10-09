import React from 'react'
import { FormFieldDefinition, shouldShowField } from '@renderer/utils/formSchemaGenerator'
import DynamicFormField from '../DynamicFormField'

interface SubscriberFieldsSectionProps {
  subscriberFields: FormFieldDefinition[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  errors: Record<string, string>
}

export default function SubscriberFieldsSection({
  subscriberFields,
  values,
  onChange,
  errors
}: SubscriberFieldsSectionProps) {
  // Filter fields based on showIf conditions
  const visibleFields = subscriberFields.filter(field => shouldShowField(field, values))

  if (visibleFields.length === 0) {
    return null
  }

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
      <h3 className="text-sm font-semibold mb-3 text-neutral-700 dark:text-neutral-300">
        Informations complémentaires
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleFields.map(field => (
          <DynamicFormField
            key={field.domainKey}
            field={field}
            value={values[field.domainKey]}
            onChange={(value) => onChange(field.domainKey, value)}
            error={errors[field.domainKey]}
          />
        ))}
      </div>
    </div>
  )
}
