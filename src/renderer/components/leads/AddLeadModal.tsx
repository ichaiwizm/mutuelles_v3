import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useToastContext } from '../../contexts/ToastContext'
import type { CreateLeadData, LeadProvider } from '../../../shared/types/leads'
import IntelligentMode from './modes/IntelligentMode'
import ManualMode from './modes/ManualMode'
import ParsedLeadConfirmation from './ParsedLeadConfirmation'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onLeadCreated: () => void
  initialMode?: 'intelligent' | 'manual'
}

type AddMode = 'intelligent' | 'manual' | 'confirmation'

const initialFormData: CreateLeadData = {
  contact: {
    civilite: 'M.',
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresse: '',
    codePostal: '',
    ville: ''
  },
  souscripteur: {
    dateNaissance: '',
    profession: '',
    regimeSocial: 'Salarié',
    nombreEnfants: 0
  },
  conjoint: undefined,
  enfants: [],
  besoins: {
    dateEffet: '',
    assureActuellement: false,
    gammes: [],
    madelin: false,
    niveaux: {
      soinsMedicaux: 3,
      hospitalisation: 3,
      optique: 2,
      dentaire: 2
    }
  }
}

export default function AddLeadModal({ isOpen, onClose, onLeadCreated, initialMode = 'intelligent' }: AddLeadModalProps) {
  const [mode, setMode] = useState<AddMode>(initialMode === 'manual' ? 'manual' : 'intelligent')
  const [loading, setLoading] = useState(false)
  const [rawText, setRawText] = useState('')
  const [formData, setFormData] = useState<CreateLeadData>(initialFormData)
  const [parsedData, setParsedData] = useState<CreateLeadData | null>(null)
  const [parsedProvider, setParsedProvider] = useState<LeadProvider | null>(null)
  const [parsedScore, setParsedScore] = useState(0)
  const toast = useToastContext()

  // Synchroniser le mode avec initialMode quand la modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode === 'manual' ? 'manual' : 'intelligent')
    }
  }, [isOpen, initialMode])

  if (!isOpen) return null

  const handleClose = () => {
    setMode(initialMode === 'manual' ? 'manual' : 'intelligent')
    setRawText('')
    setFormData(initialFormData)
    setParsedData(null)
    setParsedProvider(null)
    setParsedScore(0)
    onClose()
  }

  const handleProcessText = async () => {
    if (!rawText.trim()) {
      toast.error('Veuillez coller du texte à traiter')
      return
    }

    setLoading(true)
    const toastId = toast.loading('Analyse du texte...')

    try {
      const result = await window.api.parsers.parse(rawText)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Erreur lors du parsing')
      }

      const { provider, data, score, error } = result.data

      if (error) {
        throw new Error(error)
      }

      if (!provider || !data) {
        throw new Error('Type de lead non reconnu')
      }

      // S'assurer que les champs ont des valeurs par défaut et générer platformData
      const normalizedData = {
        ...data,
        souscripteur: {
          ...data.souscripteur,
          nombreEnfants: data.souscripteur?.nombreEnfants ?? 0
        }
      }

      // Générer les platformData pour l'affichage dans la confirmation
      // Le backend les régénérera lors de la création finale
      const { PlatformMappingService } = await import('../../../shared/platformMapping')
      const platformData = PlatformMappingService.mapToPlatforms(normalizedData)

      const dataWithPlatforms = {
        ...normalizedData,
        platformData
      }

      setParsedData(dataWithPlatforms)
      setParsedProvider(provider)
      setParsedScore(score)
      setMode('confirmation')
      toast.update(toastId, { type: 'success', title: 'Lead identifié avec succès' })
    } catch (error) {
      toast.update(toastId, {
        type: 'error',
        title: 'Erreur de parsing',
        message: String(error)
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmParsedLead = async (editedData: CreateLeadData) => {
    setLoading(true)
    const toastId = toast.loading('Création du lead...')

    try {
      // Ajouter le score calculé par le parser aux données du lead
      const leadDataWithScore = {
        ...editedData,
        qualityScore: parsedScore
      }

      const result = await window.api.leads.create(leadDataWithScore)

      if (result.success) {
        toast.update(toastId, { type: 'success', title: 'Lead créé avec succès' })
        onLeadCreated()
        handleClose()
      } else {
        // Gérer le cas spécifique des doublons
        if (result.error === 'Lead en doublon' && result.data?.isDuplicate) {
          const duplicates = result.data.duplicates
          const reasons = duplicates[0]?.reasons?.join(', ') || 'Similaire à un lead existant'
          toast.update(toastId, {
            type: 'error',
            title: '⚠️ Lead en doublon',
            message: `Ce lead existe déjà : ${reasons}. Impossible de créer un doublon.`
          })
        } else {
          throw new Error(result.error)
        }
      }
    } catch (error) {
      toast.update(toastId, { type: 'error', title: 'Erreur lors de la création', message: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = async () => {
    setLoading(true)

    // Validation basique
    if (!formData.contact.nom || !formData.contact.prenom) {
      toast.error('Nom et prénom requis')
      setLoading(false)
      return
    }

    if (formData.contact.email && !/\S+@\S+\.\S+/.test(formData.contact.email)) {
      toast.error('Email invalide')
      setLoading(false)
      return
    }

    const toastId = toast.loading('Création du lead...')

    try {
      const result = await window.api.leads.create(formData)

      if (result.success) {
        toast.update(toastId, { type: 'success', title: 'Lead créé avec succès' })
        onLeadCreated()
        handleClose()
      } else {
        // Gérer le cas spécifique des doublons
        if (result.error === 'Lead en doublon' && result.data?.isDuplicate) {
          const duplicates = result.data.duplicates
          const reasons = duplicates[0]?.reasons?.join(', ') || 'Similaire à un lead existant'
          toast.update(toastId, {
            type: 'error',
            title: '⚠️ Lead en doublon',
            message: `Ce lead existe déjà : ${reasons}. Impossible de créer un doublon.`
          })
        } else {
          throw new Error(result.error)
        }
      }
    } catch (error) {
      toast.update(toastId, { type: 'error', title: 'Erreur lors de la création', message: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Ajouter un lead</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content based on mode */}
        {mode === 'intelligent' && (
          <IntelligentMode
            rawText={rawText}
            onTextChange={setRawText}
            onProcess={handleProcessText}
            onCancel={handleClose}
            loading={loading}
          />
        )}

        {mode === 'confirmation' && parsedData && (
          <ParsedLeadConfirmation
            provider={parsedProvider}
            data={parsedData}
            score={parsedScore}
            onConfirm={handleConfirmParsedLead}
            onCancel={() => {
              setMode('intelligent')
              setParsedData(null)
              setParsedProvider(null)
              setParsedScore(0)
            }}
            loading={loading}
          />
        )}

        {mode === 'manual' && (
          <ManualMode
            formData={formData}
            onFormDataChange={setFormData}
            onSubmit={handleManualSubmit}
            onCancel={handleClose}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}
