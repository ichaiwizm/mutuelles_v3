import React from 'react'
import FieldWrapper, { getFieldClassName, getFieldAriaAttributes } from './FieldWrapper'

interface SelectFieldProps {
  label: React.ReactNode
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  error?: string
  required?: boolean
  disabled?: boolean
}

export default function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  required = false,
  disabled = false
}: SelectFieldProps) {
  return (
    <FieldWrapper label={label} error={error} required={required} disabled={disabled}>
      {(props) => (
        <select
          id={props.fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={props.isDisabled}
          className={getFieldClassName(props.isInvalid, props.isDisabled)}
          {...getFieldAriaAttributes(props)}
        >
          <option value="">Sélectionnez...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldWrapper>
  )
}
