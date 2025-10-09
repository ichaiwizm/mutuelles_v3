import React from 'react'

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
    <div className="space-y-1">
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="JJ/MM/AAAA"
        disabled={disabled}
        maxLength={10}
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
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
