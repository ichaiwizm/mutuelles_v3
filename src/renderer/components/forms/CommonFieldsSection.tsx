import React, { useMemo } from 'react'
import { Users, Baby } from 'lucide-react'
import { FormFieldDefinition } from '@renderer/utils/formSchemaGenerator'
import DynamicFormField from './DynamicFormField'
import ToggleableSectionWrapper from '../common/ToggleableSectionWrapper'
import RepeatableFieldSet from './RepeatableFieldSet'
import CivilitySwitch from './CivilitySwitch'

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

  // Extract field lookups to constants to avoid duplicate find() calls
  const lastNameField = fieldCategories.subscriberIdentityFields.find(f => f.domainKey === 'subscriber.lastName')
  const firstNameField = fieldCategories.subscriberIdentityFields.find(f => f.domainKey === 'subscriber.firstName')
  const birthDateField = fieldCategories.subscriberIdentityFields.find(f => f.domainKey === 'subscriber.birthDate')
  const dateEffetField = fieldCategories.projectFields.find(f => f.domainKey === 'project.dateEffet')
  const projectNameField = fieldCategories.projectFields.find(f => f.domainKey === 'project.name')

  return (
    <div className="space-y-3">
      {/* Section Projet - Layout compact avec largeurs fixes */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-300">Projet</h3>
        <div className="flex flex-wrap gap-3 items-start">
          {/* Civilité */}
          {fieldCategories.civilityField && (
            <div className="flex-shrink-0">
              <CivilitySwitch
                value={values['subscriber.civility'] || 'MONSIEUR'}
                onChange={(value) => onChange('subscriber.civility', value)}
                error={errors['subscriber.civility']}
              />
            </div>
          )}

          {/* Nom */}
          {lastNameField && (
            <div className="w-48">
              <DynamicFormField
                field={lastNameField}
                value={values['subscriber.lastName']}
                onChange={(value) => onChange('subscriber.lastName', value)}
                error={errors['subscriber.lastName']}
              />
            </div>
          )}

          {/* Prénom */}
          {firstNameField && (
            <div className="w-48">
              <DynamicFormField
                field={firstNameField}
                value={values['subscriber.firstName']}
                onChange={(value) => onChange('subscriber.firstName', value)}
                error={errors['subscriber.firstName']}
              />
            </div>
          )}

          {/* Date de naissance */}
          {birthDateField && (
            <div className="w-40">
              <DynamicFormField
                field={birthDateField}
                value={values['subscriber.birthDate']}
                onChange={(value) => onChange('subscriber.birthDate', value)}
                error={errors['subscriber.birthDate']}
              />
            </div>
          )}

          {/* Date d'effet */}
          {dateEffetField && (
            <div className="w-40">
              <DynamicFormField
                field={dateEffetField}
                value={values['project.dateEffet']}
                onChange={(value) => onChange('project.dateEffet', value)}
                error={errors['project.dateEffet']}
              />
            </div>
          )}

          {/* Nom du projet avec bouton magique */}
          {projectNameField && (
            <div className="w-72">
              <DynamicFormField
                field={projectNameField}
                value={values['project.name']}
                onChange={(value) => onChange('project.name', value)}
                onGenerate={onGenerate}
                error={errors['project.name']}
              />
            </div>
          )}

          {/* Autres champs projet (gamme, etc.) */}
          {fieldCategories.projectFields
            .filter(f => !['project.name', 'project.dateEffet'].includes(f.domainKey))
            .map(field => (
              <div key={field.domainKey} className="w-64">
                <DynamicFormField
                  field={field}
                  value={values[field.domainKey]}
                  onChange={(value) => onChange(field.domainKey, value)}
                  error={errors[field.domainKey]}
                />
              </div>
            ))}
        </div>
      </div>

      {/* Section Souscripteur (autres champs spécifiques qui ne sont ni civilité ni identité) */}
      {/* Note: La plupart des champs subscriber sont maintenant dans les sections spécifiques Alptis/Swiss Life */}
      {fieldCategories.otherSubscriberFields.length > 0 && (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
          <h3 className="text-sm font-semibold mb-3 text-neutral-700 dark:text-neutral-300">Informations complémentaires</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fieldCategories.otherSubscriberFields.map(field => (
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
      )}

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
                key={field.platform ? `${field.domainKey}__${field.platform}` : field.domainKey}
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
      )}
    </div>
  )
}
