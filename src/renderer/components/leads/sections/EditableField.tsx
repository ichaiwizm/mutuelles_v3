import React from 'react'
import type { CreateLeadData } from '../../../../shared/types/leads'

interface EditableFieldProps {
  section: keyof CreateLeadData
  field: string
  label: string
  value: any
  type?: 'text' | 'email' | 'tel' | 'date' | 'select' | 'number'
  options?: { value: string; label: string }[]
  colSpan?: 1 | 2
  isEditing: boolean
  hasError?: boolean
  errorMessage?: string
  onChange: (section: keyof CreateLeadData, field: string, value: any) => void
}

export default function EditableField({
  section,
  field,
  label,
  value,
  type = 'text',
  options,
  colSpan = 1,
  isEditing,
  hasError,
  errorMessage,
  onChange
}: EditableFieldProps) {
  if (!isEditing) {
    return (
      <div className={colSpan === 2 ? 'col-span-2' : ''}>
        <span className="text-neutral-500 text-xs">{label}:</span>
        <span className={`ml-2 text-sm ${hasError ? 'text-red-600' : ''}`}>
          {value || '-'}
        </span>
      </div>
    )
  }

  const baseClasses = `w-full px-2 py-1.5 text-sm rounded border focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20'
      : 'border-neutral-300 dark:border-neutral-700 focus:border-emerald-500 focus:ring-emerald-500/20'
  } bg-white dark:bg-neutral-900`

  return (
    <div className={colSpan === 2 ? 'col-span-2' : ''}>
      <label className="block text-xs text-neutral-500 mb-1">{label}</label>
      {type === 'select' ? (
        <select
          value={value || ''}
          onChange={(e) => onChange(section, field, e.target.value)}
          className={baseClasses}
        >
          <option value="">-</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(section, field, type === 'number' ? Number(e.target.value) : e.target.value)}
          className={baseClasses}
        />
      )}
      {hasError && errorMessage && <p className="text-xs text-red-600 mt-1">{errorMessage}</p>}
    </div>
  )
}
