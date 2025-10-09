import { useState, useEffect } from 'react'
import { FormSchema } from '@renderer/utils/formSchemaGenerator'
import { validateForm } from '@renderer/utils/formValidation'
import { transformToCleanLead } from '@renderer/utils/formDataTransformer'
import { getAllDefaults, getSpouseDefaults, getChildDefaults, applyDefaultsToForm } from '@renderer/utils/defaultValueService'

interface FormState {
  values: Record<string, any>
  errors: Record<string, string>
  touched: Record<string, boolean>
  isSubmitting: boolean
}

interface ChildItem {
  id: string
}

export interface UseLeadFormReturn {
  // Form state
  formState: FormState
  hasSpouse: boolean
  hasChildren: boolean
  children: ChildItem[]

  // Form handlers
  handleFieldChange: (key: string, value: any) => void
  handleToggleSpouse: (active: boolean) => void
  handleToggleChildren: (active: boolean) => void
  handleAddChild: () => void
  handleRemoveChild: (index: number) => void
  handleFillDefaults: () => void
  handleSubmit: () => Promise<void>
  handleReset: () => void
}

interface UseLeadFormOptions {
  schema: FormSchema | null
  onSuccess: () => void
  onError?: (error: string) => void
  onLoadingChange?: (isLoading: boolean, message?: string) => void
}

export function useLeadForm({ schema, onSuccess, onError, onLoadingChange }: UseLeadFormOptions): UseLeadFormReturn {
  const [formState, setFormState] = useState<FormState>({
    values: {},
    errors: {},
    touched: {},
    isSubmitting: false
  })

  const [hasSpouse, setHasSpouse] = useState(false)
  const [hasChildren, setHasChildren] = useState(false)
  const [children, setChildren] = useState<ChildItem[]>([])

  const handleFieldChange = (key: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      values: { ...prev.values, [key]: value },
      touched: { ...prev.touched, [key]: true }
    }))
  }

  const handleToggleSpouse = (active: boolean) => {
    setHasSpouse(active)

    if (active) {
      // Ne PAS remplir automatiquement, juste marquer le conjoint comme présent
      setFormState(prev => ({
        ...prev,
        values: {
          ...prev.values,
          'conjoint': true
        }
      }))
    } else {
      setFormState(prev => {
        const newValues = { ...prev.values, 'conjoint': false }
        Object.keys(newValues).forEach(key => {
          if (key.startsWith('spouse.')) {
            delete newValues[key]
          }
        })
        return { ...prev, values: newValues }
      })
    }
  }

  const handleToggleChildren = (active: boolean) => {
    setHasChildren(active)

    if (active) {
      const newChildren = [{ id: `child-${Date.now()}-0` }]
      setChildren(newChildren)

      // Ne PAS remplir automatiquement, juste créer le premier enfant
      setFormState(prev => ({
        ...prev,
        values: {
          ...prev.values,
          'enfants': true,
          'children.count': 1
        }
      }))
    } else {
      setChildren([])
      setFormState(prev => {
        const newValues = { ...prev.values }
        Object.keys(newValues).forEach(key => {
          if (key.startsWith('children[')) {
            delete newValues[key]
          }
        })
        newValues['children.count'] = 0
        newValues['enfants'] = false
        return { ...prev, values: newValues }
      })
    }
  }

  const handleAddChild = () => {
    const childIndex = children.length
    const newChildren = [...children, { id: `child-${Date.now()}-${childIndex}` }]
    setChildren(newChildren)

    // Ne PAS remplir automatiquement, juste ajouter l'enfant
    setFormState(prev => ({
      ...prev,
      values: {
        ...prev.values,
        'children.count': newChildren.length
      }
    }))
  }

  const handleRemoveChild = (index: number) => {
    const newChildren = children.filter((_, i) => i !== index)
    setChildren(newChildren)

    setFormState(prev => {
      const newValues = { ...prev.values }
      Object.keys(newValues).forEach(key => {
        if (key.startsWith(`children[${index}]`)) {
          delete newValues[key]
        }
      })

      // Re-index children after the removed one
      for (let i = index + 1; i < children.length; i++) {
        Object.keys(newValues).forEach(key => {
          if (key.startsWith(`children[${i}]`)) {
            const newKey = key.replace(`children[${i}]`, `children[${i - 1}]`)
            newValues[newKey] = newValues[key]
            delete newValues[key]
          }
        })
      }

      newValues['children.count'] = newChildren.length
      return { ...prev, values: newValues }
    })
  }

  const handleFillDefaults = () => {
    if (!schema) return

    const defaults = getAllDefaults(schema, formState.values)
    const updatedValues = applyDefaultsToForm(formState.values, defaults, { overwrite: false })

    setFormState(prev => ({
      ...prev,
      values: updatedValues
    }))
  }

  const handleSubmit = async () => {
    if (!schema) return

    const errors = validateForm(schema, formState.values)

    if (Object.keys(errors).length > 0) {
      setFormState(prev => ({ ...prev, errors }))
      onError?.('Veuillez corriger les erreurs avant de continuer')
      return
    }

    setFormState(prev => ({ ...prev, isSubmitting: true, errors: {} }))
    onLoadingChange?.(true, 'Création du lead...')

    try {
      const cleanLead = transformToCleanLead(formState.values)
      const result = await window.api.leads.create(cleanLead)

      if (result.success) {
        onSuccess()
      } else {
        throw new Error(result.error || 'Erreur inconnue')
      }
    } catch (error) {
      onError?.(String(error))
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }))
      onLoadingChange?.(false)
    }
  }

  const handleReset = () => {
    setFormState({
      values: {},
      errors: {},
      touched: {},
      isSubmitting: false
    })
    setHasSpouse(false)
    setHasChildren(false)
    setChildren([])
  }

  return {
    formState,
    hasSpouse,
    hasChildren,
    children,
    handleFieldChange,
    handleToggleSpouse,
    handleToggleChildren,
    handleAddChild,
    handleRemoveChild,
    handleFillDefaults,
    handleSubmit,
    handleReset
  }
}
