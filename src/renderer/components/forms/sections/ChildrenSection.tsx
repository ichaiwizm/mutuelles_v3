import React from 'react'
import { Baby } from 'lucide-react'
import { FormFieldDefinition } from '@renderer/utils/formSchemaGenerator'
import DynamicFormField from '../DynamicFormField'
import ToggleableSectionWrapper from '../../common/ToggleableSectionWrapper'
import RepeatableFieldSet from '../RepeatableFieldSet'

interface ChildrenSectionProps {
  childrenFields: FormFieldDefinition[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  errors: Record<string, string>
  hasChildren: boolean
  onToggleChildren: (active: boolean) => void
  children: any[]
  onAddChild: () => void
  onRemoveChild: (index: number) => void
  disabled?: boolean
}

export default function ChildrenSection({
  childrenFields,
  values,
  onChange,
  errors,
  hasChildren,
  onToggleChildren,
  children,
  onAddChild,
  onRemoveChild,
  disabled = false
}: ChildrenSectionProps) {
  if (childrenFields.length === 0) {
    return null
  }

  // Organize fields by platform
  const commonFields = childrenFields.filter(f => !f.platform)
  const alptisFields = childrenFields.filter(f => f.platform === 'alptis')
  const swisslifeFields = childrenFields.filter(f => f.platform === 'swisslifeone')

  return (
    <ToggleableSectionWrapper
      title="Enfants"
      icon={Baby}
      isActive={hasChildren}
      onToggle={onToggleChildren}
      isEditing={!disabled}
    >
      <RepeatableFieldSet
        title="Enfant"
        items={children}
        onAdd={onAddChild}
        onRemove={onRemoveChild}
        disabled={disabled}
        renderItem={(item, index) => (
          <div className="space-y-4">
            {/* Common fields */}
            {commonFields.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {commonFields.map(field => {
                  const childFieldKey = field.domainKey.replace('children[]', `children[${index}]`)
                  return (
                    <DynamicFormField
                      key={childFieldKey}
                      field={{ ...field, domainKey: childFieldKey }}
                      value={values[childFieldKey]}
                      onChange={(value) => onChange(childFieldKey, value)}
                      error={errors[childFieldKey]}
                      disabled={disabled}
                    />
                  )
                })}
              </div>
            )}

            {/* Platform-specific fields */}
            {(alptisFields.length > 0 || swisslifeFields.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Alptis fields */}
                {alptisFields.length > 0 && (
                  <div className="space-y-3 p-3 rounded-lg border border-blue-200 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-950/10">
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2">
                      Alptis
                    </div>
                    <div className="space-y-3">
                      {alptisFields.map(field => {
                        const childFieldKey = field.domainKey.replace('children[]', `children[${index}]`)
                        return (
                          <DynamicFormField
                            key={`${childFieldKey}__${field.platform}`}
                            field={{ ...field, domainKey: childFieldKey }}
                            value={values[childFieldKey]}
                            onChange={(value) => onChange(childFieldKey, value)}
                            error={errors[childFieldKey]}
                            hidePlatformBadge={true}
                            disabled={disabled}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* SwissLife fields */}
                {swisslifeFields.length > 0 && (
                  <div className="space-y-3 p-3 rounded-lg border border-purple-200 dark:border-purple-900/30 bg-purple-50/30 dark:bg-purple-950/10">
                    <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-2">
                      SwissLife
                    </div>
                    <div className="space-y-3">
                      {swisslifeFields.map(field => {
                        const childFieldKey = field.domainKey.replace('children[]', `children[${index}]`)
                        return (
                          <DynamicFormField
                            key={`${childFieldKey}__${field.platform}`}
                            field={{ ...field, domainKey: childFieldKey }}
                            value={values[childFieldKey]}
                            onChange={(value) => onChange(childFieldKey, value)}
                            error={errors[childFieldKey]}
                            hidePlatformBadge={true}
                            disabled={disabled}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      />
    </ToggleableSectionWrapper>
  )
}
