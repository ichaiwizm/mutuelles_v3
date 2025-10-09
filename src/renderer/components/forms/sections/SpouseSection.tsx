import React from 'react'
import { Users } from 'lucide-react'
import { FormFieldDefinition } from '@renderer/utils/formSchemaGenerator'
import DynamicFormField from '../DynamicFormField'
import ToggleableSectionWrapper from '../../common/ToggleableSectionWrapper'

interface SpouseSectionProps {
  spouseFields: FormFieldDefinition[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  errors: Record<string, string>
  hasSpouse: boolean
  onToggleSpouse: (active: boolean) => void
}

export default function SpouseSection({
  spouseFields,
  values,
  onChange,
  errors,
  hasSpouse,
  onToggleSpouse
}: SpouseSectionProps) {
  if (spouseFields.length === 0) {
    return null
  }

  return (
    <ToggleableSectionWrapper
      title="Conjoint"
      icon={Users}
      isActive={hasSpouse}
      onToggle={onToggleSpouse}
      isEditing={true}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {spouseFields.map(field => (
          <DynamicFormField
            key={field.platform ? `${field.domainKey}__${field.platform}` : field.domainKey}
            field={field}
            value={values[field.domainKey]}
            onChange={(value) => onChange(field.domainKey, value)}
            error={errors[field.domainKey]}
          />
        ))}
      </div>
    </ToggleableSectionWrapper>
  )
}
