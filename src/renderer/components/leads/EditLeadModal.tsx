import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useToastContext } from '../../contexts/ToastContext'
import type { FullLead, CreateLeadRequest } from '../../../shared/types/leads'

interface EditLeadModalProps {
  lead: FullLead | null
  isOpen: boolean
  onClose: () => void
  onLeadUpdated: () => void
}

export default function EditLeadModal({ lead, isOpen, onClose, onLeadUpdated }: EditLeadModalProps) {
  const [activeTab, setActiveTab] = useState('contact')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateLeadRequest>({
    contact: {
      civilite: 'M.',
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      adresse: '',
      ville: '',
      codePostal: ''
    },
    souscripteur: {
      profession: '',
      regimeSocial: '',
      nombreEnfants: 0
    }
  })

  const toast = useToastContext()

  // Reset form when lead changes
  useEffect(() => {
    if (lead) {
      setFormData({
        contact: {
          civilite: lead.contact.civilite || 'M.',
          prenom: lead.contact.prenom || '',
          nom: lead.contact.nom || '',
          email: lead.contact.email || '',
          telephone: lead.contact.telephone || '',
          adresse: lead.contact.adresse || '',
          ville: lead.contact.ville || '',
          codePostal: lead.contact.codePostal || ''
        },
        souscripteur: {
          dateNaissance: lead.souscripteur.dateNaissance || undefined,
          profession: lead.souscripteur.profession || '',
          regimeSocial: lead.souscripteur.regimeSocial || '',
          nombreEnfants: lead.souscripteur.nombreEnfants || 0
        },
        conjoint: lead.conjoint ? {
          civilite: lead.conjoint.civilite || 'M.',
          prenom: lead.conjoint.prenom || '',
          nom: lead.conjoint.nom || '',
          dateNaissance: lead.conjoint.dateNaissance || undefined,
          profession: lead.conjoint.profession || '',
          regimeSocial: lead.conjoint.regimeSocial || ''
        } : undefined,
        enfants: lead.enfants || [],
        besoins: lead.besoins ? {
          dateEffet: lead.besoins.dateEffet || undefined,
          assureActuellement: lead.besoins.assureActuellement || false,
          gammes: lead.besoins.gammes || [],
          niveaux: lead.besoins.niveaux || undefined,
          madelin: lead.besoins.madelin || false
        } : undefined
      })
      setActiveTab('contact')
    }
  }, [lead])

  if (!isOpen || !lead) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.contact.prenom || !formData.contact.nom || !formData.contact.email) {
      toast.error('Veuillez remplir les champs obligatoires')
      return
    }

    setLoading(true)
    const toastId = toast.loading('Modification du lead...')

    try {
      const result = await window.api.leads.update(lead.id, formData)

      if (result.success) {
        toast.update(toastId, { type: 'success', title: 'Lead modifié avec succès' })
        onLeadUpdated()
        onClose()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast.update(toastId, { type: 'error', title: 'Erreur lors de la modification', message: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const updateContact = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      contact: { ...prev.contact, [field]: value }
    }))
  }

  const updateSouscripteur = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      souscripteur: { ...prev.souscripteur, [field]: value }
    }))
  }

  const tabs = [
    { id: 'contact', label: 'Contact' },
    { id: 'souscripteur', label: 'Souscripteur' }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Modifier le lead</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-neutral-200 dark:border-neutral-800">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Civilité *
                    </label>
                    <select
                      value={formData.contact.civilite}
                      onChange={(e) => updateContact('civilite', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      required
                    >
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Mlle">Mlle</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      value={formData.contact.prenom}
                      onChange={(e) => updateContact('prenom', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nom *
                    </label>
                    <input
                      type="text"
                      value={formData.contact.nom}
                      onChange={(e) => updateContact('nom', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.contact.email}
                      onChange={(e) => updateContact('email', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.contact.telephone}
                      onChange={(e) => updateContact('telephone', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={formData.contact.adresse}
                    onChange={(e) => updateContact('adresse', e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Code postal
                    </label>
                    <input
                      type="text"
                      value={formData.contact.codePostal}
                      onChange={(e) => updateContact('codePostal', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Ville
                    </label>
                    <input
                      type="text"
                      value={formData.contact.ville}
                      onChange={(e) => updateContact('ville', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'souscripteur' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={formData.souscripteur.dateNaissance || ''}
                    onChange={(e) => updateSouscripteur('dateNaissance', e.target.value || undefined)}
                    className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Profession
                  </label>
                  <input
                    type="text"
                    value={formData.souscripteur.profession}
                    onChange={(e) => updateSouscripteur('profession', e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Régime social
                  </label>
                  <select
                    value={formData.souscripteur.regimeSocial}
                    onChange={(e) => updateSouscripteur('regimeSocial', e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  >
                    <option value="">Sélectionnez</option>
                    <option value="general">Régime général</option>
                    <option value="agricole">Régime agricole</option>
                    <option value="fonction_publique">Fonction publique</option>
                    <option value="independant">Indépendant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nombre d'enfants
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.souscripteur.nombreEnfants}
                    onChange={(e) => updateSouscripteur('nombreEnfants', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-md bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
            >
              {loading ? 'Modification...' : 'Modifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}