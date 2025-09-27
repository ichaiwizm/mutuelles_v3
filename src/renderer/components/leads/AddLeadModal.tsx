import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useToastContext } from '../../contexts/ToastContext'
import type { CreateLeadData } from '../../../shared/types/leads'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onLeadCreated: () => void
}

export default function AddLeadModal({ isOpen, onClose, onLeadCreated }: AddLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'contact' | 'souscripteur' | 'conjoint' | 'enfants' | 'besoins'>('contact')
  const [hasConjoint, setHasConjoint] = useState(false)
  const toast = useToastContext()

  const [formData, setFormData] = useState<CreateLeadData>({
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
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

    const dataToSubmit = {
      ...formData,
      conjoint: hasConjoint ? formData.conjoint : undefined
    }

    const toastId = toast.loading('Création du lead...')

    try {
      const result = await window.api.leads.create(dataToSubmit)

      if (result.success) {
        toast.update(toastId, { type: 'success', title: 'Lead créé avec succès' })
        onLeadCreated()
        onClose()
        // Reset form
        setFormData({
          contact: { civilite: 'M.', nom: '', prenom: '', telephone: '', email: '', adresse: '', codePostal: '', ville: '' },
          souscripteur: { dateNaissance: '', profession: '', regimeSocial: 'Salarié', nombreEnfants: 0 },
          conjoint: undefined,
          enfants: [],
          besoins: { dateEffet: '', assureActuellement: false, gammes: [], madelin: false, niveaux: { soinsMedicaux: 3, hospitalisation: 3, optique: 2, dentaire: 2 } }
        })
        setHasConjoint(false)
        setActiveTab('contact')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast.update(toastId, { type: 'error', title: 'Erreur lors de la création', message: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const updateContact = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contact: { ...prev.contact, [field]: value }
    }))
  }

  const updateSouscripteur = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      souscripteur: { ...prev.souscripteur, [field]: value }
    }))
  }

  const updateConjoint = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      conjoint: { ...prev.conjoint, [field]: value }
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Ajouter un lead</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200 dark:border-neutral-800">
          <nav className="flex space-x-8 px-4">
            {[
              { key: 'contact', label: 'Contact' },
              { key: 'souscripteur', label: 'Souscripteur' },
              { key: 'conjoint', label: 'Conjoint' },
              { key: 'enfants', label: 'Enfants' },
              { key: 'besoins', label: 'Besoins' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col h-[500px]">
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Civilité</label>
                    <select
                      value={formData.contact.civilite}
                      onChange={(e) => updateContact('civilite', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                    >
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom *</label>
                    <input
                      type="text"
                      value={formData.contact.nom}
                      onChange={(e) => updateContact('nom', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Prénom *</label>
                    <input
                      type="text"
                      value={formData.contact.prenom}
                      onChange={(e) => updateContact('prenom', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.contact.telephone}
                      onChange={(e) => updateContact('telephone', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.contact.email}
                      onChange={(e) => updateContact('email', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Adresse</label>
                  <input
                    type="text"
                    value={formData.contact.adresse}
                    onChange={(e) => updateContact('adresse', e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Code postal</label>
                    <input
                      type="text"
                      value={formData.contact.codePostal}
                      onChange={(e) => updateContact('codePostal', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Ville</label>
                    <input
                      type="text"
                      value={formData.contact.ville}
                      onChange={(e) => updateContact('ville', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'souscripteur' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date de naissance</label>
                    <input
                      type="date"
                      value={formData.souscripteur.dateNaissance}
                      onChange={(e) => updateSouscripteur('dateNaissance', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Profession</label>
                    <input
                      type="text"
                      value={formData.souscripteur.profession}
                      onChange={(e) => updateSouscripteur('profession', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Régime social</label>
                    <select
                      value={formData.souscripteur.regimeSocial}
                      onChange={(e) => updateSouscripteur('regimeSocial', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                    >
                      <option value="Salarié">Salarié</option>
                      <option value="TNS">TNS</option>
                      <option value="Fonctionnaire">Fonctionnaire</option>
                      <option value="Retraité">Retraité</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre d'enfants</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.souscripteur.nombreEnfants}
                      onChange={(e) => updateSouscripteur('nombreEnfants', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'conjoint' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasConjoint"
                    checked={hasConjoint}
                    onChange={(e) => {
                      setHasConjoint(e.target.checked)
                      if (!e.target.checked) {
                        setFormData(prev => ({ ...prev, conjoint: undefined }))
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          conjoint: {
                            civilite: 'Mme',
                            prenom: '',
                            nom: '',
                            dateNaissance: '',
                            profession: '',
                            regimeSocial: 'Salarié'
                          }
                        }))
                      }
                    }}
                    className="rounded border-neutral-300 dark:border-neutral-700"
                  />
                  <label htmlFor="hasConjoint" className="text-sm font-medium">
                    Le souscripteur a un conjoint
                  </label>
                </div>

                {hasConjoint && formData.conjoint && (
                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Civilité</label>
                        <select
                          value={formData.conjoint.civilite}
                          onChange={(e) => updateConjoint('civilite', e.target.value)}
                          className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                        >
                          <option value="M.">M.</option>
                          <option value="Mme">Mme</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Nom</label>
                        <input
                          type="text"
                          value={formData.conjoint.nom}
                          onChange={(e) => updateConjoint('nom', e.target.value)}
                          className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Prénom</label>
                        <input
                          type="text"
                          value={formData.conjoint.prenom}
                          onChange={(e) => updateConjoint('prenom', e.target.value)}
                          className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'enfants' && (
              <div className="text-center text-neutral-500">
                <p>Gestion des enfants à implémenter</p>
                <p className="text-sm text-neutral-400">
                  Pour l'instant, utilisez le champ "Nombre d'enfants" dans l'onglet Souscripteur
                </p>
              </div>
            )}

            {activeTab === 'besoins' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date d'effet souhaitée</label>
                  <input
                    type="date"
                    value={formData.besoins?.dateEffet}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      besoins: { ...prev.besoins, dateEffet: e.target.value }
                    }))}
                    className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="assureActuellement"
                    checked={formData.besoins?.assureActuellement}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      besoins: { ...prev.besoins, assureActuellement: e.target.checked }
                    }))}
                    className="rounded border-neutral-300 dark:border-neutral-700"
                  />
                  <label htmlFor="assureActuellement" className="text-sm font-medium">
                    Actuellement assuré
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm rounded-md bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer le lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}