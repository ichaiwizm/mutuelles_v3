import { useState, useEffect, useRef } from 'react'
import { FormSchema } from '@renderer/utils/formSchemaGenerator'
import { validateForm } from '@renderer/utils/formValidation'
import { transformToCleanLead, transformFromCleanLead } from '@renderer/utils/formDataTransformer'
import { getAllDefaultsWithBusinessRules, applyDefaultsToForm } from '@renderer/utils/defaultValueService'
import { generateRandomTestData } from '@renderer/utils/testDataGenerator'
import type { Lead } from '@shared/types/leads'

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
  handleFillTest: () => void
  handleSubmit: () => Promise<void>
  handleReset: () => void
}

interface UseLeadFormOptions {
  schema: FormSchema | null
  mode: 'create' | 'edit'
  initialLead?: Lead
  onSuccess: () => void
  onError?: (error: string) => void
  onLoadingChange?: (isLoading: boolean, message?: string) => void
}

export function useLeadForm({ schema, mode, initialLead, onSuccess, onError, onLoadingChange }: UseLeadFormOptions): UseLeadFormReturn {
  const [formState, setFormState] = useState<FormState>({
    values: {},
    errors: {},
    touched: {},
    isSubmitting: false
  })

  const [hasSpouse, setHasSpouse] = useState(false)
  const [hasChildren, setHasChildren] = useState(false)
  const [children, setChildren] = useState<ChildItem[]>([])

  // Track if form has been initialized to prevent re-initialization
  const isInitialized = useRef(false)
  const initializedLeadId = useRef<string | undefined>(undefined)

  // Initialize form from lead when in edit mode
  const initializeFromLead = (lead: Lead) => {
    const formValues = transformFromCleanLead(lead)

    setFormState(prev => ({
      ...prev,
      values: formValues
    }))

    // Activate spouse toggle if conjoint present
    if (formValues['conjoint'] === true) {
      setHasSpouse(true)
    }

    // Activate children toggle and create child items
    const childrenCount = formValues['children.count'] || 0
    if (childrenCount > 0) {
      setHasChildren(true)
      const newChildren: ChildItem[] = []
      for (let i = 0; i < childrenCount; i++) {
        newChildren.push({ id: `child-${Date.now()}-${i}` })
      }
      setChildren(newChildren)
    }

    // Mark as initialized
    isInitialized.current = true
    initializedLeadId.current = lead.id
  }

  // Initialize from lead when in edit mode OR when in create mode with prefilled data
  // CRITICAL FIX: Only initialize once to prevent resetting after "Fill defaults"
  useEffect(() => {
    if (!initialLead) {
      // No initial lead - reset initialization flags
      isInitialized.current = false
      initializedLeadId.current = undefined
      return
    }

    // Don't re-initialize if already initialized with the same lead
    if (isInitialized.current && initializedLeadId.current === initialLead.id) {
      return
    }

    // Initialize for edit mode or create with prefilled data
    if (mode === 'edit' || mode === 'create') {
      initializeFromLead(initialLead)
    }
  }, [mode, initialLead?.id]) // Use only lead ID as dependency, not the entire object

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

    // Get all defaults WITH business rules (computed values like madelin, department)
    const defaults = getAllDefaultsWithBusinessRules(schema, formState.values)
    const updatedValues = applyDefaultsToForm(formState.values, defaults, { overwrite: false })

    setFormState(prev => ({
      ...prev,
      values: updatedValues
    }))
  }

  const handleFillTest = () => {
    if (!schema) return

    const testData = generateRandomTestData(schema)

    // Update form state with test data
    setFormState(prev => ({
      ...prev,
      values: testData
    }))

    // Activate spouse toggle if conjoint present in test data
    if (testData['conjoint'] === true) {
      setHasSpouse(true)
    } else {
      setHasSpouse(false)
    }

    // Activate children toggle and create child items if children present
    const childrenCount = testData['children.count'] || 0
    if (childrenCount > 0) {
      setHasChildren(true)
      const newChildren: ChildItem[] = []
      for (let i = 0; i < childrenCount; i++) {
        newChildren.push({ id: `child-${Date.now()}-${i}` })
      }
      setChildren(newChildren)
    } else {
      setHasChildren(false)
      setChildren([])
    }
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

    const loadingMessage = mode === 'create' ? 'Création du lead...' : 'Mise à jour du lead...'
    onLoadingChange?.(true, loadingMessage)

    try {
      const cleanLead = transformToCleanLead(formState.values)

      let result
      if (mode === 'create') {
        result = await window.api.leads.create(cleanLead)
      } else {
        if (!initialLead?.id) {
          throw new Error('ID du lead manquant pour la mise à jour')
        }
        result = await window.api.leads.update(initialLead.id, cleanLead)
      }

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

    // Reset initialization flags
    isInitialized.current = false
    initializedLeadId.current = undefined
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
    handleFillTest,
    handleSubmit,
    handleReset
  }
}
