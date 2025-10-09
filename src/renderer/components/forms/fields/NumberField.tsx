import React, { useId } from 'react'

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
  const fieldId = useId()
  const errorId = `${fieldId}-error`

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    // Si vide, on garde vide. Sinon on convertit en number
    onChange(val === '' ? '' : Number(val))
  }

  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={fieldId}
        type="number"
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
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
      />
      {error && (
        <p id={errorId} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
