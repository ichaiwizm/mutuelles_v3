import React from 'react'
import { Wand2 } from 'lucide-react'
import FieldWrapper, { getFieldClassName, getFieldAriaAttributes } from './FieldWrapper'

interface TextFieldProps {
  label: React.ReactNode
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url'
  pattern?: string
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
  pattern,
  onGenerate,
  canGenerate = false
}: TextFieldProps) {
  return (
    <FieldWrapper label={label} error={error} required={required} disabled={disabled}>
      {(props) => (
        <div className="relative">
          <input
            id={props.fieldId}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={props.isDisabled}
            inputMode={inputMode}
            pattern={pattern}
            className={getFieldClassName(props.isInvalid, props.isDisabled, canGenerate ? 'pr-9' : '')}
            {...getFieldAriaAttributes(props)}
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
      )}
    </FieldWrapper>
  )
}
