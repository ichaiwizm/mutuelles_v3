import React from 'react'
import { FormFieldDefinition } from '@renderer/utils/formSchemaGenerator'
import DynamicFormField from '../DynamicFormField'
import CivilitySwitch from '../CivilitySwitch'

interface ProjectFieldsSectionProps {
  projectFields: FormFieldDefinition[]
  civilityField: FormFieldDefinition | undefined
  lastNameField: FormFieldDefinition | undefined
  firstNameField: FormFieldDefinition | undefined
  birthDateField: FormFieldDefinition | undefined
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  onGenerate: () => void
  errors: Record<string, string>
}

export default function ProjectFieldsSection({
  projectFields,
  civilityField,
  lastNameField,
  firstNameField,
  birthDateField,
  values,
  onChange,
  onGenerate,
  errors
}: ProjectFieldsSectionProps) {
  const dateEffetField = projectFields.find(f => f.domainKey === 'project.dateEffet')
  const projectNameField = projectFields.find(f => f.domainKey === 'project.name')
  const otherProjectFields = projectFields.filter(f =>
    !['project.name', 'project.dateEffet'].includes(f.domainKey)
  )

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-300">Projet</h3>
      <div className="flex flex-wrap gap-3 items-start">
        {/* Civilité */}
        {civilityField && (
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
        {otherProjectFields.map(field => (
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
  )
}
