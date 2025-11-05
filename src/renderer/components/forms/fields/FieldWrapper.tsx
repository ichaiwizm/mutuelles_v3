import React, { useId } from 'react'

export interface FieldRenderProps {
  fieldId: string
  errorId: string
  isInvalid: boolean
  isDisabled: boolean
  isRequired: boolean
}

export interface FieldWrapperProps {
  label: React.ReactNode
  error?: string
  required?: boolean
  disabled?: boolean
  children: (props: FieldRenderProps) => React.ReactNode
  containerClassName?: string
}

export default function FieldWrapper({
  label,
  error,
  required = false,
  disabled = false,
  children,
  containerClassName = 'space-y-1'
}: FieldWrapperProps) {
  const fieldId = useId()
  const errorId = `${fieldId}-error`

  const renderProps: FieldRenderProps = {
    fieldId,
    errorId,
    isInvalid: !!error,
    isDisabled: disabled,
    isRequired: required
  }

  return (
    <div className={containerClassName}>
      <label htmlFor={fieldId} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children(renderProps)}
      {error && <FieldError errorId={errorId} error={error} />}
    </div>
  )
}

// Hook pour générer les IDs de champs (réutilisable pour les cas spéciaux)
export function useFieldIds() {
  const fieldId = useId()
  const errorId = `${fieldId}-error`
  return { fieldId, errorId }
}

// Composant pour afficher les erreurs (réutilisable)
export function FieldError({ errorId, error }: { errorId: string; error: string }) {
  return (
    <p id={errorId} className="text-xs text-red-500" role="alert">
      {error}
    </p>
  )
}

// Fonction helper pour générer les classes CSS communes des contrôles
export function getFieldClassName(
  isInvalid: boolean,
  isDisabled: boolean,
  additionalClasses = ''
): string {
  return `w-full px-3 py-2 border rounded-md text-sm transition-colors
    ${
      isInvalid
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-neutral-300 dark:border-neutral-700 focus:border-blue-500 focus:ring-blue-500'
    }
    ${isDisabled ? 'bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed' : 'bg-white dark:bg-neutral-900'}
    focus:outline-none focus:ring-1
    ${additionalClasses}
  `.trim()
}

// Fonction helper pour générer les attributs a11y communs
export function getFieldAriaAttributes(props: FieldRenderProps) {
  return {
    'aria-invalid': props.isInvalid,
    'aria-describedby': props.isInvalid ? props.errorId : undefined,
    'aria-required': props.isRequired
  }
}
