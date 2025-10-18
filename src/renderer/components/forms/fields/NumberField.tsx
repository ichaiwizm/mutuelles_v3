import React from 'react'
import FieldWrapper, { getFieldClassName, getFieldAriaAttributes } from './FieldWrapper'

interface NumberFieldProps {
  label: React.ReactNode
  value: number | string
  onChange: (value: number | string) => void
  error?: string
  required?: boolean
  min?: number
  max?: number
  disabled?: boolean
}

export default function NumberField({
  label,
  value,
  onChange,
  error,
  required = false,
  min,
  max,
  disabled = false
}: NumberFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    // Si vide, on garde vide. Sinon on convertit en number
    onChange(val === '' ? '' : Number(val))
  }

  return (
    <FieldWrapper label={label} error={error} required={required} disabled={disabled}>
      {(props) => (
        <input
          id={props.fieldId}
          type="number"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          disabled={props.isDisabled}
          className={getFieldClassName(props.isInvalid, props.isDisabled)}
          {...getFieldAriaAttributes(props)}
        />
      )}
    </FieldWrapper>
  )
}
