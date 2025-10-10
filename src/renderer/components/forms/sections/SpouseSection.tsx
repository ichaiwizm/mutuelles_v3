import React from 'react'
import { Users } from 'lucide-react'
import { FormFieldDefinition, shouldShowField } from '@renderer/utils/formSchemaGenerator'
import DynamicFormField from '../DynamicFormField'
import ToggleableSectionWrapper from '../../common/ToggleableSectionWrapper'

interface SpouseSectionProps {
  spouseFields: FormFieldDefinition[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  errors: Record<string, string>
  hasSpouse: boolean
  onToggleSpouse: (active: boolean) => void
  disabled?: boolean
}

export default function SpouseSection({
  spouseFields,
  values,
  onChange,
  errors,
  hasSpouse,
  onToggleSpouse,
  disabled = false
}: SpouseSectionProps) {
  if (spouseFields.length === 0) {
    return null
  }

  // Organize fields by platform
  const commonFields = spouseFields.filter(f => !f.platform)
  const alptisFields = spouseFields.filter(f => f.platform === 'alptis')
  const swisslifeFields = spouseFields.filter(f => f.platform === 'swisslifeone')

  return (
    <ToggleableSectionWrapper
      title="Conjoint"
      icon={Users}
      isActive={hasSpouse}
      onToggle={onToggleSpouse}
      isEditing={!disabled}
    >
      <div className="space-y-4">
        {/* Common fields */}
        {commonFields.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {commonFields.filter(field => shouldShowField(field, values)).map(field => (
              <DynamicFormField
                key={field.domainKey}
                field={field}
                value={values[field.domainKey]}
                onChange={(value) => onChange(field.domainKey, value)}
                error={errors[field.domainKey]}
                disabled={disabled}
              />
            ))}
          </div>
        )}

        {/* Platform-specific fields */}
        {(alptisFields.length > 0 || swisslifeFields.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Alptis fields */}
            {alptisFields.filter(field => shouldShowField(field, values)).length > 0 && (
              <div className="space-y-3 p-3 rounded-lg border border-blue-200 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-950/10">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2">
                  Alptis
                </div>
                <div className="space-y-3">
                  {alptisFields.filter(field => shouldShowField(field, values)).map(field => (
                    <DynamicFormField
                      key={`${field.domainKey}__${field.platform}`}
                      field={field}
                      value={values[field.domainKey]}
                      onChange={(value) => onChange(field.domainKey, value)}
                      error={errors[field.domainKey]}
                      hidePlatformBadge={true}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* SwissLife fields */}
            {swisslifeFields.filter(field => shouldShowField(field, values)).length > 0 && (
              <div className="space-y-3 p-3 rounded-lg border border-purple-200 dark:border-purple-900/30 bg-purple-50/30 dark:bg-purple-950/10">
                <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-2">
                  SwissLife
                </div>
                <div className="space-y-3">
                  {swisslifeFields.filter(field => shouldShowField(field, values)).map(field => (
                    <DynamicFormField
                      key={`${field.domainKey}__${field.platform}`}
                      field={field}
                      value={values[field.domainKey]}
                      onChange={(value) => onChange(field.domainKey, value)}
                      error={errors[field.domainKey]}
                      hidePlatformBadge={true}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToggleableSectionWrapper>
  )
}
