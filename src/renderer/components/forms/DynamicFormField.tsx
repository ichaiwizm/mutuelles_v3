import React from 'react'
import { FormFieldDefinition } from '@renderer/utils/formSchemaGenerator'
import TextField from './fields/TextField'
import DateField from './fields/DateField'
import SelectField from './fields/SelectField'
import RadioField from './fields/RadioField'
import NumberField from './fields/NumberField'
import ToggleField from './fields/ToggleField'
import PlatformBadge from './PlatformBadge'

interface DynamicFormFieldProps {
  field: FormFieldDefinition
  value: any
  onChange: (value: any) => void
  onGenerate?: () => void
  error?: string
  hidePlatformBadge?: boolean
  disabled?: boolean
}

export default function DynamicFormField({
  field,
  value,
  onChange,
  onGenerate,
  error,
  hidePlatformBadge = false,
  disabled = false
}: DynamicFormFieldProps) {
  // Add platform badge to label if field is platform-specific (unless hidden)
  const labelWithBadge = field.platform && !hidePlatformBadge ? (
    <span className="flex items-center gap-2">
      {field.label}
      <PlatformBadge platform={field.platform} />
    </span>
  ) : field.label

  // Combine global disabled with field-specific disabled
  const isDisabled = disabled || field.disabled

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
          disabled={isDisabled}
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
          disabled={isDisabled}
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
          disabled={isDisabled}
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
          disabled={isDisabled}
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
          disabled={isDisabled}
        />
      )

    case 'toggle':
    case 'checkbox':
      return (
        <ToggleField
          label={labelWithBadge}
          value={value === true || value === 'true'}
          onChange={onChange}
          error={error}
          required={field.required}
          disabled={isDisabled}
        />
      )

    default:
      return null
  }
}
