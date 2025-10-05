import React, { useState, useEffect } from 'react'
import { Check, X, AlertCircle, User, Briefcase, Users, Heart, Edit, RotateCcw, Baby, Plus, Trash2 } from 'lucide-react'
import type { CreateLeadData, LeadProvider } from '../../../shared/types/leads'
import PlatformFieldsSection from './PlatformFieldsSection'

interface ParsedLeadConfirmationProps {
  provider: LeadProvider | null
  data: CreateLeadData
  score: number
  onConfirm: (editedData: CreateLeadData) => void
  onCancel: () => void
  loading?: boolean
  onDataChange?: (data: CreateLeadData) => void
}

export default function ParsedLeadConfirmation({
  provider,
  data,
  score,
  onConfirm,
  onCancel,
  loading,
  onDataChange
}: ParsedLeadConfirmationProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<CreateLeadData>(data)
  const [originalData] = useState<CreateLeadData>(data)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Synchroniser editedData avec data si data change (au cas où)
  useEffect(() => {
    setEditedData(data)
  }, [data])

  // Notifier le parent des changements
  useEffect(() => {
    if (onDataChange) {
      onDataChange(editedData)
    }
  }, [editedData, onDataChange])

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 4) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 7) return 'Excellent'
    if (score >= 4) return 'Moyen'
    return 'Faible'
  }

  const providerLabels: Record<string, string> = {
    assurprospect: 'AssurProspect',
    assurlead: 'Assurlead',
    generic: 'Générique'
  }

  // Fonction pour mettre à jour un champ
  const updateField = (section: keyof CreateLeadData, field: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value
      }
    }))
    // Effacer l'erreur de validation pour ce champ
    const fieldKey = `${section}.${field}`
    if (validationErrors[fieldKey]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldKey]
        return newErrors
      })
    }
  }

  // Fonction pour mettre à jour un champ imbriqué (ex: besoins.niveaux.soinsMedicaux)
  const updateNestedField = (section: keyof CreateLeadData, subSection: string, field: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [subSection]: {
          ...((prev[section] as any)?.[subSection] || {}),
          [field]: value
        }
      }
    }))
  }

  // Validation des données
  const validateData = (): boolean => {
    const errors: Record<string, string> = {}

    // Champs obligatoires
    if (!editedData.contact.nom?.trim()) {
      errors['contact.nom'] = 'Le nom est obligatoire'
    }
    if (!editedData.contact.prenom?.trim()) {
      errors['contact.prenom'] = 'Le prénom est obligatoire'
    }

    // Validation email
    if (editedData.contact.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(editedData.contact.email)) {
        errors['contact.email'] = 'Format email invalide'
      }
    }

    // Validation téléphone (format français basique)
    if (editedData.contact.telephone) {
      const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/
      if (!phoneRegex.test(editedData.contact.telephone.replace(/\s/g, ''))) {
        errors['contact.telephone'] = 'Format téléphone invalide'
      }
    }

    // Validation code postal
    if (editedData.contact.codePostal) {
      const cpRegex = /^\d{5}$/
      if (!cpRegex.test(editedData.contact.codePostal)) {
        errors['contact.codePostal'] = 'Code postal invalide (5 chiffres)'
      }
    }

    // Validation dates
    if (editedData.souscripteur?.dateNaissance) {
      const date = new Date(editedData.souscripteur.dateNaissance)
      if (isNaN(date.getTime())) {
        errors['souscripteur.dateNaissance'] = 'Date invalide'
      }
    }
    if (editedData.conjoint?.dateNaissance) {
      const date = new Date(editedData.conjoint.dateNaissance)
      if (isNaN(date.getTime())) {
        errors['conjoint.dateNaissance'] = 'Date invalide'
      }
    }
    if (editedData.besoins?.dateEffet) {
      const date = new Date(editedData.besoins.dateEffet)
      if (isNaN(date.getTime())) {
        errors['besoins.dateEffet'] = 'Date invalide'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Annuler les modifications
  const handleCancelEdit = () => {
    setEditedData(originalData)
    setIsEditing(false)
    setValidationErrors({})
  }

  // Confirmer avec validation
  const handleConfirm = () => {
    if (isEditing && !validateData()) {
      return
    }
    onConfirm(editedData)
  }

  // Composant de champ éditable
  const EditableField = ({
    section,
    field,
    label,
    value,
    type = 'text',
    options,
    colSpan = 1
  }: {
    section: keyof CreateLeadData
    field: string
    label: string
    value: any
    type?: 'text' | 'email' | 'tel' | 'date' | 'select' | 'number'
    options?: { value: string; label: string }[]
    colSpan?: 1 | 2
  }) => {
    const fieldKey = `${section}.${field}`
    const hasError = validationErrors[fieldKey]

    if (!isEditing) {
      if (!value && value !== 0) return null
      return (
        <div className={colSpan === 2 ? 'col-span-2' : ''}>
          <span className="text-neutral-500">{label}:</span>
          <span className="ml-2">{type === 'select' && options ? options.find(o => o.value === value)?.label || value : value}</span>
        </div>
      )
    }

    return (
      <div className={colSpan === 2 ? 'col-span-2' : ''}>
        <label className="block text-xs text-neutral-500 mb-1">{label}</label>
        {type === 'select' && options ? (
          <select
            value={value || ''}
            onChange={(e) => updateField(section, field, e.target.value)}
            className={`w-full px-2 py-1.5 text-sm rounded border ${
              hasError
                ? 'border-red-500 focus:border-red-600'
                : 'border-neutral-300 dark:border-neutral-700 focus:border-emerald-500'
            } bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 ${
              hasError ? 'focus:ring-red-500/20' : 'focus:ring-emerald-500/20'
            } transition-colors`}
          >
            <option value="">-</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value || ''}
            onChange={(e) => updateField(section, field, type === 'number' ? Number(e.target.value) : e.target.value)}
            className={`w-full px-2 py-1.5 text-sm rounded border ${
              hasError
                ? 'border-red-500 focus:border-red-600'
                : 'border-neutral-300 dark:border-neutral-700 focus:border-emerald-500'
            } bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 ${
              hasError ? 'focus:ring-red-500/20' : 'focus:ring-emerald-500/20'
            } transition-colors`}
          />
        )}
        {hasError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{validationErrors[fieldKey]}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header avec provider et score */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isEditing ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
              {isEditing ? (
                <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">{isEditing ? 'Edition du lead' : 'Lead identifié'}</h3>
              <p className="text-sm text-neutral-500">
                Source: {provider ? providerLabels[provider] : 'Inconnue'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}/10
            </div>
            <div className="text-xs text-neutral-500">{getScoreLabel(score)}</div>
          </div>
        </div>

        {/* Bouton Modifier / Annuler modifications */}
        {!loading && (
          <div className="flex justify-end">
            {isEditing ? (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <RotateCcw size={14} />
                Annuler les modifications
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <Edit size={14} />
                Modifier
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content avec les données parsées */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Contact */}
        <div className={`rounded-lg border p-3 transition-colors ${
          isEditing
            ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
            : 'border-neutral-200 dark:border-neutral-800'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <User size={16} className="text-neutral-500" />
            <h4 className="font-medium">Contact</h4>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <EditableField
              section="contact"
              field="civilite"
              label="Civilité"
              value={editedData.contact.civilite}
              type="select"
              options={[
                { value: 'M.', label: 'M.' },
                { value: 'Mme', label: 'Mme' }
              ]}
            />
            <EditableField
              section="contact"
              field="nom"
              label="Nom"
              value={editedData.contact.nom}
            />
            <EditableField
              section="contact"
              field="prenom"
              label="Prénom"
              value={editedData.contact.prenom}
            />
            <EditableField
              section="contact"
              field="email"
              label="Email"
              value={editedData.contact.email}
              type="email"
              colSpan={2}
            />
            <EditableField
              section="contact"
              field="telephone"
              label="Téléphone"
              value={editedData.contact.telephone}
              type="tel"
            />
            <EditableField
              section="contact"
              field="adresse"
              label="Adresse"
              value={editedData.contact.adresse}
              colSpan={2}
            />
            <EditableField
              section="contact"
              field="codePostal"
              label="Code postal"
              value={editedData.contact.codePostal}
            />
            <EditableField
              section="contact"
              field="ville"
              label="Ville"
              value={editedData.contact.ville}
            />
          </div>
        </div>

        {/* Souscripteur */}
        {(editedData.souscripteur || isEditing) && (
          <div className={`rounded-lg border p-3 transition-colors ${
            isEditing
              ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
              : 'border-neutral-200 dark:border-neutral-800'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <Briefcase size={16} className="text-neutral-500" />
              <h4 className="font-medium">Souscripteur</h4>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <EditableField
                section="souscripteur"
                field="dateNaissance"
                label="Date de naissance"
                value={editedData.souscripteur?.dateNaissance}
                type="date"
              />
              <EditableField
                section="souscripteur"
                field="profession"
                label="Profession"
                value={editedData.souscripteur?.profession}
              />
              <EditableField
                section="souscripteur"
                field="regimeSocial"
                label="Régime"
                value={editedData.souscripteur?.regimeSocial}
                type="select"
                colSpan={2}
                options={[
                  { value: 'Salarié', label: 'Salarié' },
                  { value: 'TNS', label: 'TNS' },
                  { value: 'Fonctionnaire', label: 'Fonctionnaire' },
                  { value: 'Retraité', label: 'Retraité' },
                  { value: 'Libéral', label: 'Libéral' },
                  { value: 'Indépendant', label: 'Indépendant' }
                ]}
              />
              <EditableField
                section="souscripteur"
                field="nombreEnfants"
                label="Nombre d'enfants"
                value={editedData.souscripteur?.nombreEnfants ?? 0}
                type="number"
              />
            </div>
          </div>
        )}

        {/* Conjoint */}
        {(editedData.conjoint || isEditing) && (
          <div className={`rounded-lg border p-3 transition-colors ${
            isEditing
              ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
              : 'border-neutral-200 dark:border-neutral-800'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-neutral-500" />
              <h4 className="font-medium">Conjoint</h4>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <EditableField
                section="conjoint"
                field="dateNaissance"
                label="Date de naissance"
                value={editedData.conjoint?.dateNaissance}
                type="date"
              />
              <EditableField
                section="conjoint"
                field="profession"
                label="Profession"
                value={editedData.conjoint?.profession}
              />
              <EditableField
                section="conjoint"
                field="regimeSocial"
                label="Régime"
                value={editedData.conjoint?.regimeSocial}
                type="select"
                colSpan={2}
                options={[
                  { value: 'Salarié', label: 'Salarié' },
                  { value: 'TNS', label: 'TNS' },
                  { value: 'Fonctionnaire', label: 'Fonctionnaire' },
                  { value: 'Retraité', label: 'Retraité' },
                  { value: 'Libéral', label: 'Libéral' },
                  { value: 'Indépendant', label: 'Indépendant' }
                ]}
              />
            </div>
          </div>
        )}

        {/* Enfants */}
        {((editedData.enfants && editedData.enfants.length > 0) || isEditing) && (
          <div className={`rounded-lg border p-3 transition-colors ${
            isEditing
              ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
              : 'border-neutral-200 dark:border-neutral-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Baby size={16} className="text-neutral-500" />
                <h4 className="font-medium">Enfants ({editedData.enfants?.length || 0})</h4>
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditedData(prev => ({
                      ...prev,
                      enfants: [...(prev.enfants || []), { dateNaissance: '' }]
                    }))
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                >
                  <Plus size={14} />
                  Ajouter
                </button>
              )}
            </div>

            {editedData.enfants && editedData.enfants.length > 0 ? (
              <div className="space-y-3">
                {editedData.enfants.map((enfant, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <div className="flex-1">
                      {isEditing ? (
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">
                            Date de naissance {index + 1}
                          </label>
                          <input
                            type="date"
                            value={enfant.dateNaissance || ''}
                            onChange={(e) => {
                              const newEnfants = [...(editedData.enfants || [])]
                              newEnfants[index] = { ...newEnfants[index], dateNaissance: e.target.value }
                              setEditedData(prev => ({ ...prev, enfants: newEnfants }))
                            }}
                            className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-700 focus:border-emerald-500 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                          />
                        </div>
                      ) : (
                        <div className="text-sm">
                          <span className="text-neutral-500">Enfant {index + 1}:</span>
                          <span className="ml-2 font-medium">{enfant.dateNaissance || '-'}</span>
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          const newEnfants = editedData.enfants?.filter((_, i) => i !== index)
                          setEditedData(prev => ({ ...prev, enfants: newEnfants }))
                        }}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">Aucun enfant</p>
            )}
          </div>
        )}

        {/* Besoins */}
        {(editedData.besoins || isEditing) && (
          <div className={`rounded-lg border p-3 transition-colors ${
            isEditing
              ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
              : 'border-neutral-200 dark:border-neutral-800'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <Heart size={16} className="text-neutral-500" />
              <h4 className="font-medium">Besoins</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <EditableField
                  section="besoins"
                  field="dateEffet"
                  label="Date d'effet"
                  value={editedData.besoins?.dateEffet}
                  type="date"
                />
                {isEditing ? (
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Actuellement assuré</label>
                    <select
                      value={editedData.besoins?.assureActuellement?.toString() || ''}
                      onChange={(e) => updateField('besoins', 'assureActuellement', e.target.value === 'true')}
                      className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-700 focus:border-emerald-500 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                    >
                      <option value="">-</option>
                      <option value="true">Oui</option>
                      <option value="false">Non</option>
                    </select>
                  </div>
                ) : (
                  editedData.besoins?.assureActuellement !== undefined && (
                    <div>
                      <span className="text-neutral-500">Actuellement assuré:</span>
                      <span className="ml-2">{editedData.besoins.assureActuellement ? 'Oui' : 'Non'}</span>
                    </div>
                  )
                )}
              </div>

              {/* Niveaux de couverture */}
              {(editedData.besoins?.niveaux || isEditing) && (
                <div>
                  <label className="block text-xs text-neutral-500 mb-2">Niveaux de couverture</label>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1">Soins médicaux</label>
                          <select
                            value={editedData.besoins?.niveaux?.soinsMedicaux || ''}
                            onChange={(e) => updateNestedField('besoins', 'niveaux', 'soinsMedicaux', Number(e.target.value) || undefined)}
                            className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-700 focus:border-emerald-500 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                          >
                            <option value="">-</option>
                            <option value="1">Niveau 1</option>
                            <option value="2">Niveau 2</option>
                            <option value="3">Niveau 3</option>
                            <option value="4">Niveau 4</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1">Hospitalisation</label>
                          <select
                            value={editedData.besoins?.niveaux?.hospitalisation || ''}
                            onChange={(e) => updateNestedField('besoins', 'niveaux', 'hospitalisation', Number(e.target.value) || undefined)}
                            className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-700 focus:border-emerald-500 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                          >
                            <option value="">-</option>
                            <option value="1">Niveau 1</option>
                            <option value="2">Niveau 2</option>
                            <option value="3">Niveau 3</option>
                            <option value="4">Niveau 4</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1">Optique</label>
                          <select
                            value={editedData.besoins?.niveaux?.optique || ''}
                            onChange={(e) => updateNestedField('besoins', 'niveaux', 'optique', Number(e.target.value) || undefined)}
                            className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-700 focus:border-emerald-500 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                          >
                            <option value="">-</option>
                            <option value="1">Niveau 1</option>
                            <option value="2">Niveau 2</option>
                            <option value="3">Niveau 3</option>
                            <option value="4">Niveau 4</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1">Dentaire</label>
                          <select
                            value={editedData.besoins?.niveaux?.dentaire || ''}
                            onChange={(e) => updateNestedField('besoins', 'niveaux', 'dentaire', Number(e.target.value) || undefined)}
                            className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-700 focus:border-emerald-500 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                          >
                            <option value="">-</option>
                            <option value="1">Niveau 1</option>
                            <option value="2">Niveau 2</option>
                            <option value="3">Niveau 3</option>
                            <option value="4">Niveau 4</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2 grid grid-cols-2 gap-1">
                        {editedData.besoins?.niveaux?.soinsMedicaux !== undefined && (
                          <span className="text-xs">Soins: {editedData.besoins.niveaux.soinsMedicaux}</span>
                        )}
                        {editedData.besoins?.niveaux?.hospitalisation !== undefined && (
                          <span className="text-xs">Hospi: {editedData.besoins.niveaux.hospitalisation}</span>
                        )}
                        {editedData.besoins?.niveaux?.optique !== undefined && (
                          <span className="text-xs">Optique: {editedData.besoins.niveaux.optique}</span>
                        )}
                        {editedData.besoins?.niveaux?.dentaire !== undefined && (
                          <span className="text-xs">Dentaire: {editedData.besoins.niveaux.dentaire}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section Plateformes */}
        {editedData.platformData && (
          <PlatformFieldsSection
            platformData={editedData.platformData}
            onPlatformDataChange={(newPlatformData) => {
              setEditedData(prev => ({
                ...prev,
                platformData: newPlatformData
              }))
            }}
            editable={isEditing}
          />
        )}

        {/* Warning si score faible */}
        {score < 4 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300">Données incomplètes</p>
              <p className="text-amber-700 dark:text-amber-400">
                Certaines informations importantes sont manquantes. Vérifiez les données avant de créer le lead.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer avec actions */}
      <div className="border-t border-neutral-200 dark:border-neutral-800">
        {/* Message d'erreur de validation */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-red-800 dark:text-red-300">Erreurs de validation</p>
                <p className="text-red-700 dark:text-red-400">
                  Veuillez corriger les erreurs avant de créer le lead.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 p-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Création...' : 'Créer le lead'}
          </button>
        </div>
      </div>
    </div>
  )
}
