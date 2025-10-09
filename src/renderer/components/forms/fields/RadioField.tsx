import React from 'react'

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
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="space-y-2">
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
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
