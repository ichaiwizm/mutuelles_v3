import React from 'react'
import FieldWrapper, { getFieldClassName, getFieldAriaAttributes } from './FieldWrapper'

interface DateFieldProps {
  label: React.ReactNode
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  disabled?: boolean
}

export default function DateField({
  label,
  value,
  onChange,
  error,
  required = false,
  disabled = false
}: DateFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, '')
    let formatted = ''

    if (input.length > 0) {
      formatted = input.substring(0, 2)
    }
    if (input.length >= 3) {
      formatted += '/' + input.substring(2, 4)
    }
    if (input.length >= 5) {
      formatted += '/' + input.substring(4, 8)
    }

    onChange(formatted)
  }

  return (
    <FieldWrapper label={label} error={error} required={required} disabled={disabled}>
      {(props) => (
        <input
          id={props.fieldId}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="JJ/MM/AAAA"
          disabled={props.isDisabled}
          maxLength={10}
          className={getFieldClassName(props.isInvalid, props.isDisabled)}
          {...getFieldAriaAttributes(props)}
        />
      )}
    </FieldWrapper>
  )
}
