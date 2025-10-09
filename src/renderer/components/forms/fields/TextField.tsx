import React, { useId } from 'react'
import { Wand2 } from 'lucide-react'

interface TextFieldProps {
  label: React.ReactNode
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url'
  onGenerate?: () => void
  canGenerate?: boolean
}

export default function TextField({
  label,
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  inputMode = 'text',
  onGenerate,
  canGenerate = false
}: TextFieldProps) {
  const fieldId = useId()
  const errorId = `${fieldId}-error`

  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          inputMode={inputMode}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          aria-required={required}
          className={`w-full px-3 py-2 ${canGenerate ? 'pr-9' : ''} border rounded-md text-sm transition-colors
            ${error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-neutral-300 dark:border-neutral-700 focus:border-blue-500 focus:ring-blue-500'
            }
            ${disabled ? 'bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed' : 'bg-white dark:bg-neutral-900'}
            focus:outline-none focus:ring-1
          `}
        />
        {canGenerate && onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            title="Générer automatiquement"
          >
            <Wand2 size={14} />
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
