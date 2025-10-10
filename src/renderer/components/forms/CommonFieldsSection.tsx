import React, { useMemo } from 'react'
import { FormFieldDefinition } from '@renderer/utils/formSchemaGenerator'
import ProjectFieldsSection from './sections/ProjectFieldsSection'
import SubscriberFieldsSection from './sections/SubscriberFieldsSection'
import SpouseSection from './sections/SpouseSection'
import ChildrenSection from './sections/ChildrenSection'

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
  disabled?: boolean
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
  onRemoveChild,
  disabled = false
}: CommonFieldsSectionProps) {
  // Memoize field categorization to avoid recomputing on every render
  const fieldCategories = useMemo(() => {
    const projectFields = commonFields.filter(f => f.domainKey.startsWith('project.'))
    const subscriberFields = commonFields.filter(f => f.domainKey.startsWith('subscriber.'))

    // Champs identité à afficher dans la section Projet
    const subscriberIdentityFields = subscriberFields.filter(f =>
      ['subscriber.lastName', 'subscriber.firstName', 'subscriber.birthDate'].includes(f.domainKey)
    )

    // Civilité à afficher en premier dans la section Projet
    const civilityField = subscriberFields.find(f => f.domainKey === 'subscriber.civility')

    // Autres champs subscriber (hors civilité et identité)
    const otherSubscriberFields = subscriberFields.filter(f =>
      !['subscriber.civility', 'subscriber.lastName', 'subscriber.firstName', 'subscriber.birthDate'].includes(f.domainKey)
    )

    return {
      projectFields,
      subscriberIdentityFields,
      civilityField,
      otherSubscriberFields
    }
  }, [commonFields])

  return (
    <div className="space-y-3">
      <ProjectFieldsSection
        projectFields={fieldCategories.projectFields}
        civilityField={fieldCategories.civilityField}
        lastNameField={fieldCategories.subscriberIdentityFields.find(f => f.domainKey === 'subscriber.lastName')}
        firstNameField={fieldCategories.subscriberIdentityFields.find(f => f.domainKey === 'subscriber.firstName')}
        birthDateField={fieldCategories.subscriberIdentityFields.find(f => f.domainKey === 'subscriber.birthDate')}
        values={values}
        onChange={onChange}
        onGenerate={onGenerate}
        errors={errors}
        disabled={disabled}
      />

      <SubscriberFieldsSection
        subscriberFields={fieldCategories.otherSubscriberFields}
        values={values}
        onChange={onChange}
        errors={errors}
        disabled={disabled}
      />

      <SpouseSection
        spouseFields={spouseFields}
        values={values}
        onChange={onChange}
        errors={errors}
        hasSpouse={hasSpouse}
        onToggleSpouse={onToggleSpouse}
        disabled={disabled}
      />

      <ChildrenSection
        childrenFields={childrenFields}
        values={values}
        onChange={onChange}
        errors={errors}
        hasChildren={hasChildren}
        onToggleChildren={onToggleChildren}
        children={children}
        onAddChild={onAddChild}
        onRemoveChild={onRemoveChild}
        disabled={disabled}
      />
    </div>
  )
}
