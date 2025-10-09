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
  onRemoveChild
}: ChildrenSectionProps) {
  if (childrenFields.length === 0) {
    return null
  }

  return (
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
                  key={field.platform ? `${childFieldKey}__${field.platform}` : childFieldKey}
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
  )
}
