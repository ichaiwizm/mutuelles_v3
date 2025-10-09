import React, { useId } from 'react'

interface ToggleFieldProps {
  label: React.ReactNode
  value: boolean
  onChange: (value: boolean) => void
  error?: string
  required?: boolean
  disabled?: boolean
}

export default function ToggleField({
  label,
  value,
  onChange,
  error,
  required = false,
  disabled = false
}: ToggleFieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-medium flex-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {value ? 'Oui' : 'Non'}
          </span>
          <button
            id={id}
            type="button"
            role="switch"
            aria-checked={value}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            aria-required={required}
            disabled={disabled}
            onClick={() => !disabled && onChange(!value)}
            className={`
              relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-neutral-900
              ${value ? 'bg-blue-600 dark:bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-600'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
            `}
          >
            <span className="sr-only">{value ? 'Oui' : 'Non'}</span>
            <span
              className={`
                inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform
                ${value ? 'translate-x-5' : 'translate-x-0.5'}
              `}
            />
          </button>
        </div>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
