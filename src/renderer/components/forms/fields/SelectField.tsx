import React, { useId } from 'react'

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
  const fieldId = useId()
  const errorId = `${fieldId}-error`

  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="block text-sm font-medium">
        {label}
      </label>
      <select
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        aria-required={required}
        className={`w-full px-3 py-2 border rounded-md text-sm transition-colors
          ${error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-neutral-300 dark:border-neutral-700 focus:border-blue-500 focus:ring-blue-500'
          }
          ${disabled ? 'bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed' : 'bg-white dark:bg-neutral-900'}
          focus:outline-none focus:ring-1
        `}
      >
        <option value="">Sélectionnez...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
