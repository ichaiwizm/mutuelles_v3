import React from 'react'
import { FormFieldDefinition } from '@renderer/utils/formSchemaGenerator'
import TextField from './fields/TextField'
import DateField from './fields/DateField'
import SelectField from './fields/SelectField'
import RadioField from './fields/RadioField'
import NumberField from './fields/NumberField'
import PlatformBadge from './PlatformBadge'

interface DynamicFormFieldProps {
  field: FormFieldDefinition
  value: any
  onChange: (value: any) => void
  onGenerate?: () => void
  error?: string
}

export default function DynamicFormField({
  field,
  value,
  onChange,
  onGenerate,
  error
}: DynamicFormFieldProps) {
  // Add platform badge to label if field is platform-specific
  const labelWithBadge = field.platform ? (
    <span className="flex items-center gap-2">
      {field.label}
      <PlatformBadge platform={field.platform} />
    </span>
  ) : field.label

  switch (field.type) {
    case 'text':
      return (
        <TextField
          label={labelWithBadge}
          value={value || ''}
          onChange={onChange}
          error={error}
          required={field.required}
          placeholder={field.placeholder}
          disabled={field.disabled}
          inputMode={field.inputMode}
          pattern={field.validation?.pattern}
          canGenerate={field.autoGenerate}
          onGenerate={onGenerate}
        />
      )

    case 'date':
      return (
        <DateField
          label={labelWithBadge}
          value={value || ''}
          onChange={onChange}
          error={error}
          required={field.required}
          disabled={field.disabled}
        />
      )

    case 'select':
      return (
        <SelectField
          label={labelWithBadge}
          value={value || ''}
          onChange={onChange}
          options={field.options || []}
          error={error}
          required={field.required}
          disabled={field.disabled}
        />
      )

    case 'radio':
      return (
        <RadioField
          label={labelWithBadge}
          value={value || ''}
          onChange={onChange}
          options={field.options || []}
          error={error}
          required={field.required}
          disabled={field.disabled}
        />
      )

    case 'number':
      return (
        <NumberField
          label={labelWithBadge}
          value={value ?? ''}
          onChange={onChange}
          error={error}
          required={field.required}
          min={field.validation?.min}
          max={field.validation?.max}
          disabled={field.disabled}
        />
      )

    default:
      return null
  }
}
