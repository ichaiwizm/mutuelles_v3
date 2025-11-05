import React from 'react'
import { useFieldIds, FieldError } from './FieldWrapper'

interface RadioFieldProps {
  label: React.ReactNode
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  error?: string
  required?: boolean
  disabled?: boolean
}

export default function RadioField({
  label,
  value,
  onChange,
  options,
  error,
  required = false,
  disabled = false
}: RadioFieldProps) {
  const { fieldId: groupId, errorId } = useFieldIds()

  return (
    <div className="space-y-2">
      <label id={groupId} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div
        role="radiogroup"
        aria-labelledby={groupId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        aria-required={required}
        className="space-y-2"
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="radio"
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 border-neutral-300 dark:border-neutral-700 focus:ring-blue-500 dark:focus:ring-blue-600 dark:bg-neutral-900"
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
      {error && <FieldError errorId={errorId} error={error} />}
    </div>
  )
}
