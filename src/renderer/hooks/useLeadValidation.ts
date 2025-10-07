import { useState, useCallback } from 'react'
import type { CreateLeadData } from '../../shared/types/leads'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/
const POSTAL_CODE_REGEX = /^\d{5}$/

export function useLeadValidation() {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateData = useCallback((data: CreateLeadData): boolean => {
    const errors: Record<string, string> = {}

    // Champs obligatoires
    if (!data.contact.nom?.trim()) {
      errors['contact.nom'] = 'Le nom est obligatoire'
    }
    if (!data.contact.prenom?.trim()) {
      errors['contact.prenom'] = 'Le prénom est obligatoire'
    }

    // Validation email
    if (data.contact.email) {
      if (!EMAIL_REGEX.test(data.contact.email)) {
        errors['contact.email'] = 'Format email invalide'
      }
    }

    // Validation téléphone (format français basique)
    if (data.contact.telephone) {
      if (!PHONE_REGEX.test(data.contact.telephone.replace(/\s/g, ''))) {
        errors['contact.telephone'] = 'Format téléphone invalide'
      }
    }

    // Validation code postal
    if (data.contact.codePostal) {
      if (!POSTAL_CODE_REGEX.test(data.contact.codePostal)) {
        errors['contact.codePostal'] = 'Code postal invalide (5 chiffres)'
      }
    }

    // Validation dates
    if (data.souscripteur?.dateNaissance) {
      const date = new Date(data.souscripteur.dateNaissance)
      if (isNaN(date.getTime())) {
        errors['souscripteur.dateNaissance'] = 'Date invalide'
      }
    }
    if (data.conjoint?.dateNaissance) {
      const date = new Date(data.conjoint.dateNaissance)
      if (isNaN(date.getTime())) {
        errors['conjoint.dateNaissance'] = 'Date invalide'
      }
    }
    if (data.besoins?.dateEffet) {
      const date = new Date(data.besoins.dateEffet)
      if (isNaN(date.getTime())) {
        errors['besoins.dateEffet'] = 'Date invalide'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [])

  const clearError = useCallback((fieldKey: string) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldKey]
      return newErrors
    })
  }, [])

  const clearAllErrors = useCallback(() => {
    setValidationErrors({})
  }, [])

  return {
    validationErrors,
    validateData,
    clearError,
    clearAllErrors
  }
}
