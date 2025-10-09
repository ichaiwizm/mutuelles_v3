import React, { useState, useEffect } from 'react'
import Modal from '../Modal'
import Button from '../Button'
import CommonFieldsSection from '../forms/CommonFieldsSection'
import PlatformSpecificSection from '../forms/PlatformSpecificSection'
import { useFormSchema } from '@renderer/hooks/useFormSchema'
import { validateForm } from '@renderer/utils/formValidation'
import { transformToCleanLead } from '@renderer/utils/formDataTransformer'
import { useToastContext } from '@renderer/contexts/ToastContext'
import { FormSchema } from '@renderer/utils/formSchemaGenerator'

function getDefaultValues(schema: FormSchema): Record<string, any> {
  const defaults: Record<string, any> = {}

  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  nextMonth.setDate(1)
  const dateEffet = `01/${String(nextMonth.getMonth() + 1).padStart(2, '0')}/${nextMonth.getFullYear()}`

  const allFields = [
    ...schema.common,
    ...schema.platformSpecific.alptis,
    ...schema.platformSpecific.swisslifeone
  ]

  allFields.forEach(field => {
    if (field.domainKey === 'project.dateEffet') {
      defaults[field.domainKey] = dateEffet
    } else if (field.disabled && field.options && field.options.length > 0) {
      defaults[field.domainKey] = field.options[0].value
    } else if (field.type === 'select' && field.options && field.options.length > 0) {
      const securiteSociale = field.options.find(opt => opt.value === 'SECURITE_SOCIALE')
      const cadres = field.options.find(opt => opt.value === 'CADRES')
      const salarie = field.options.find(opt => opt.value === 'SALARIE')
      const autre = field.options.find(opt => opt.value === 'AUTRE')

      if (securiteSociale) {
        defaults[field.domainKey] = 'SECURITE_SOCIALE'
      } else if (cadres) {
        defaults[field.domainKey] = 'CADRES'
      } else if (salarie) {
        defaults[field.domainKey] = 'SALARIE'
      } else if (autre) {
        defaults[field.domainKey] = 'AUTRE'
      } else {
        defaults[field.domainKey] = field.options[0].value
      }
    } else if (field.type === 'radio' && field.options && field.options.length > 0) {
      defaults[field.domainKey] = field.options[0].value
    }
  })

  return defaults
}

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormState {
  values: Record<string, any>
  errors: Record<string, string>
  touched: Record<string, boolean>
  isSubmitting: boolean
}

export default function AddLeadModal({
  isOpen,
  onClose,
  onSuccess
}: AddLeadModalProps) {
  const { schema, loading: schemaLoading, error: schemaError } = useFormSchema()
  const toast = useToastContext()

  const [formState, setFormState] = useState<FormState>({
    values: {},
    errors: {},
    touched: {},
    isSubmitting: false
  })

  useEffect(() => {
    if (schema && isOpen && Object.keys(formState.values).length === 0) {
      const defaultValues = getDefaultValues(schema)
      setFormState(prev => ({
        ...prev,
        values: defaultValues
      }))
    }
  }, [schema, isOpen])

  const [hasSpouse, setHasSpouse] = useState(false)
  const [hasChildren, setHasChildren] = useState(false)
  const [children, setChildren] = useState<any[]>([])
  const [alptisExpanded, setAlptisExpanded] = useState(false)
  const [swisslifeExpanded, setSwisslifeExpanded] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setFormState({
        values: {},
        errors: {},
        touched: {},
        isSubmitting: false
      })
      setHasSpouse(false)
      setHasChildren(false)
      setChildren([])
      setAlptisExpanded(false)
      setSwisslifeExpanded(false)
    }
  }, [isOpen])

  const handleFieldChange = (key: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      values: { ...prev.values, [key]: value },
      touched: { ...prev.touched, [key]: true }
    }))
  }

  const handleToggleSpouse = (active: boolean) => {
    setHasSpouse(active)
    setFormState(prev => ({
      ...prev,
      values: { ...prev.values, 'conjoint': active }
    }))

    if (!active) {
      setFormState(prev => {
        const newValues = { ...prev.values }
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
    setFormState(prev => ({
      ...prev,
      values: { ...prev.values, 'enfants': active, 'children.count': active ? children.length : 0 }
    }))

    if (!active) {
      setChildren([])
      setFormState(prev => {
        const newValues = { ...prev.values }
        Object.keys(newValues).forEach(key => {
          if (key.startsWith('children[')) {
            delete newValues[key]
          }
        })
        newValues['children.count'] = 0
        return { ...prev, values: newValues }
      })
    }
  }

  const handleAddChild = () => {
    const newChildren = [...children, {}]
    setChildren(newChildren)
    setFormState(prev => ({
      ...prev,
      values: { ...prev.values, 'children.count': newChildren.length }
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

  const handleSubmit = async () => {
    if (!schema) return

    const errors = validateForm(schema, formState.values)

    if (Object.keys(errors).length > 0) {
      setFormState(prev => ({ ...prev, errors }))
      toast.error('Formulaire invalide', 'Veuillez corriger les erreurs avant de continuer')
      return
    }

    setFormState(prev => ({ ...prev, isSubmitting: true, errors: {} }))
    const toastId = toast.loading('Création du lead...')

    try {
      const cleanLead = transformToCleanLead(formState.values)
      const result = await window.api.leads.create(cleanLead)

      if (result.success) {
        if (result.data?.isDuplicate) {
          toast.update(toastId, {
            type: 'warning',
            title: 'Doublons détectés',
            message: `${result.data.duplicates?.length || 0} lead(s) similaire(s) trouvé(s)`,
            duration: 5000
          })
        } else {
          toast.update(toastId, {
            type: 'success',
            title: 'Lead créé avec succès'
          })
        }
        onSuccess()
      } else {
        throw new Error(result.error || 'Erreur inconnue')
      }
    } catch (error) {
      toast.update(toastId, {
        type: 'error',
        title: 'Erreur lors de la création',
        message: String(error)
      })
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  const handleGenerateProjectName = () => {
    const lastName = formState.values['subscriber.lastName'] || ''
    const firstName = formState.values['subscriber.firstName'] || ''

    if (lastName && firstName) {
      const generated = `Simulation ${lastName} ${firstName}`
      handleFieldChange('project.name', generated)
      toast.success('Nom généré', generated)
    } else {
      toast.warning('Nom et prénom requis', 'Veuillez d\'abord renseigner le nom et le prénom')
    }
  }

  const handleClose = () => {
    if (!formState.isSubmitting) {
      onClose()
    }
  }

  if (schemaLoading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Ajouter un lead manuellement" size="large">
        <div className="flex items-center justify-center py-12">
          <div className="text-neutral-500">Chargement du formulaire...</div>
        </div>
      </Modal>
    )
  }

  if (schemaError || !schema) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Ajouter un lead manuellement" size="large">
        <div className="flex items-center justify-center py-12">
          <div className="text-red-600 dark:text-red-400">
            Erreur lors du chargement du formulaire: {schemaError || 'Schema non disponible'}
          </div>
        </div>
      </Modal>
    )
  }

  // Merge all spouse fields (common + platform-specific) with badges
  const allSpouseFields = [
    ...schema.common.filter(f => f.domainKey.startsWith('spouse.')),
    ...schema.platformSpecific.alptis.filter(f => f.domainKey.startsWith('spouse.')).map(f => ({ ...f, platform: 'alptis' as const })),
    ...schema.platformSpecific.swisslifeone.filter(f => f.domainKey.startsWith('spouse.')).map(f => ({ ...f, platform: 'swisslifeone' as const }))
  ]

  // Merge all children fields (common + platform-specific) with badges
  const allChildrenFields = [
    ...schema.common.filter(f => f.domainKey.startsWith('children[].')),
    ...schema.platformSpecific.alptis.filter(f => f.domainKey.startsWith('children[].')).map(f => ({ ...f, platform: 'alptis' as const })),
    ...schema.platformSpecific.swisslifeone.filter(f => f.domainKey.startsWith('children[].')).map(f => ({ ...f, platform: 'swisslifeone' as const }))
  ]

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Ajouter un lead manuellement" size="large">
      <div className="space-y-3">
        <CommonFieldsSection
          commonFields={schema.common.filter(f => !f.domainKey.startsWith('spouse.') && !f.domainKey.startsWith('children'))}
          spouseFields={allSpouseFields}
          childrenFields={allChildrenFields}
          values={formState.values}
          onChange={handleFieldChange}
          onGenerate={handleGenerateProjectName}
          errors={formState.errors}
          hasSpouse={hasSpouse}
          onToggleSpouse={handleToggleSpouse}
          hasChildren={hasChildren}
          onToggleChildren={handleToggleChildren}
          children={children}
          onAddChild={handleAddChild}
          onRemoveChild={handleRemoveChild}
        />

        <div className="space-y-4">
          <PlatformSpecificSection
            platform="alptis"
            schema={schema}
            values={formState.values}
            onChange={handleFieldChange}
            errors={formState.errors}
            isExpanded={alptisExpanded}
            onToggle={setAlptisExpanded}
          />

          <PlatformSpecificSection
            platform="swisslifeone"
            schema={schema}
            values={formState.values}
            onChange={handleFieldChange}
            errors={formState.errors}
            isExpanded={swisslifeExpanded}
            onToggle={setSwisslifeExpanded}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <Button
            onClick={handleClose}
            disabled={formState.isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            loading={formState.isSubmitting}
          >
            Créer le lead
          </Button>
        </div>
      </div>
    </Modal>
  )
}
