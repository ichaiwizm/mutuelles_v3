import { useReducer, useCallback } from 'react'
import type { CreateLeadData } from '../../shared/types/leads'

type LeadFormAction =
  | { type: 'UPDATE_FIELD'; section: keyof CreateLeadData; field: string; value: any }
  | { type: 'UPDATE_NESTED_FIELD'; section: keyof CreateLeadData; subSection: string; field: string; value: any }
  | { type: 'UPDATE_DATA'; data: CreateLeadData }
  | { type: 'RESET_FORM'; data: CreateLeadData }
  | { type: 'SET_EDITING'; isEditing: boolean }

interface LeadFormState {
  data: CreateLeadData
  originalData: CreateLeadData
  isEditing: boolean
}

function leadFormReducer(state: LeadFormState, action: LeadFormAction): LeadFormState {
  switch (action.type) {
    case 'UPDATE_FIELD':
      // Si field est vide, on remplace directement la section (pour arrays comme enfants, platformData)
      if (action.field === '') {
        return {
          ...state,
          data: {
            ...state.data,
            [action.section]: action.value
          }
        }
      }
      // Sinon, on met à jour le champ dans l'objet de la section
      return {
        ...state,
        data: {
          ...state.data,
          [action.section]: {
            ...(state.data[action.section] as any),
            [action.field]: action.value
          }
        }
      }

    case 'UPDATE_NESTED_FIELD':
      return {
        ...state,
        data: {
          ...state.data,
          [action.section]: {
            ...(state.data[action.section] as any),
            [action.subSection]: {
              ...((state.data[action.section] as any)?.[action.subSection] || {}),
              [action.field]: action.value
            }
          }
        }
      }

    case 'UPDATE_DATA':
      return {
        ...state,
        data: action.data
      }

    case 'RESET_FORM':
      return {
        ...state,
        data: action.data,
        isEditing: false
      }

    case 'SET_EDITING':
      return {
        ...state,
        isEditing: action.isEditing
      }

    default:
      return state
  }
}

export function useLeadFormState(initialData: CreateLeadData) {
  const [state, dispatch] = useReducer(leadFormReducer, {
    data: initialData,
    originalData: initialData,
    isEditing: false
  })

  const updateField = useCallback((section: keyof CreateLeadData, field: string, value: any) => {
    dispatch({ type: 'UPDATE_FIELD', section, field, value })
  }, [])

  const updateNestedField = useCallback((section: keyof CreateLeadData, subSection: string, field: string, value: any) => {
    dispatch({ type: 'UPDATE_NESTED_FIELD', section, subSection, field, value })
  }, [])

  const updateData = useCallback((data: CreateLeadData) => {
    dispatch({ type: 'UPDATE_DATA', data })
  }, [])

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM', data: state.originalData })
  }, [state.originalData])

  const setEditing = useCallback((isEditing: boolean) => {
    dispatch({ type: 'SET_EDITING', isEditing })
  }, [])

  return {
    data: state.data,
    originalData: state.originalData,
    isEditing: state.isEditing,
    updateField,
    updateNestedField,
    updateData,
    resetForm,
    setEditing
  }
}
