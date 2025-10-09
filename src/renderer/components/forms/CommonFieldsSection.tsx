import React from 'react'
import { Users, Baby } from 'lucide-react'
import { FormFieldDefinition } from '@renderer/utils/formSchemaGenerator'
import DynamicFormField from './DynamicFormField'
import ToggleableSectionWrapper from '../common/ToggleableSectionWrapper'
import RepeatableFieldSet from './RepeatableFieldSet'

interface CommonFieldsSectionProps {
  commonFields: FormFieldDefinition[]
  spouseFields: FormFieldDefinition[]
  childrenFields: FormFieldDefinition[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  onGenerate: () => void
  errors: Record<string, string>
  hasSpouse: boolean
  onToggleSpouse: (active: boolean) => void
  hasChildren: boolean
  onToggleChildren: (active: boolean) => void
  children: any[]
  onAddChild: () => void
  onRemoveChild: (index: number) => void
}

export default function CommonFieldsSection({
  commonFields,
  spouseFields,
  childrenFields,
  values,
  onChange,
  onGenerate,
  errors,
  hasSpouse,
  onToggleSpouse,
  hasChildren,
  onToggleChildren,
  children,
  onAddChild,
  onRemoveChild
}: CommonFieldsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {commonFields.map(field => (
          <DynamicFormField
            key={field.domainKey}
            field={field}
            value={values[field.domainKey]}
            onChange={(value) => onChange(field.domainKey, value)}
            onGenerate={onGenerate}
            error={errors[field.domainKey]}
          />
        ))}
      </div>

      {spouseFields.length > 0 && (
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
                key={field.domainKey}
                field={field}
                value={values[field.domainKey]}
                onChange={(value) => onChange(field.domainKey, value)}
                error={errors[field.domainKey]}
              />
            ))}
          </div>
        </ToggleableSectionWrapper>
      )}

      {childrenFields.length > 0 && (
        <ToggleableSectionWrapper
          title="Enfants"
          icon={Baby}
          isActive={hasChildren}
          onToggle={onToggleChildren}
          isEditing={true}
        >
          <RepeatableFieldSet
            title="Enfant"
            items={children}
            onAdd={onAddChild}
            onRemove={onRemoveChild}
            renderItem={(item, index) => (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {childrenFields.map(field => {
                  const childFieldKey = `children[${index}].${field.domainKey.replace('children[].', '')}`
                  return (
                    <DynamicFormField
                      key={childFieldKey}
                      field={{ ...field, domainKey: childFieldKey }}
                      value={values[childFieldKey]}
                      onChange={(value) => onChange(childFieldKey, value)}
                      error={errors[childFieldKey]}
                    />
                  )
                })}
              </div>
            )}
          />
        </ToggleableSectionWrapper>
      )}
    </div>
  )
}
