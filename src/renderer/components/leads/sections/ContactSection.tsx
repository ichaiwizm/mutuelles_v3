import React from 'react'
import { User } from 'lucide-react'
import type { CreateLeadData } from '../../../../shared/types/leads'
import EditableField from './EditableField'

interface ContactSectionProps {
  data: CreateLeadData
  isEditing: boolean
  validationErrors: Record<string, string>
  onChange: (section: keyof CreateLeadData, field: string, value: any) => void
}

export default function ContactSection({
  data,
  isEditing,
  validationErrors,
  onChange
}: ContactSectionProps) {
  return (
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
          value={data.contact?.civilite}
          type="select"
          options={[
            { value: 'M.', label: 'M.' },
            { value: 'Mme', label: 'Mme' },
            { value: 'Mlle', label: 'Mlle' }
          ]}
          isEditing={isEditing}
          hasError={!!validationErrors['contact.civilite']}
          errorMessage={validationErrors['contact.civilite']}
          onChange={onChange}
        />
        <EditableField
          section="contact"
          field="nom"
          label="Nom"
          value={data.contact?.nom}
          isEditing={isEditing}
          hasError={!!validationErrors['contact.nom']}
          errorMessage={validationErrors['contact.nom']}
          onChange={onChange}
        />
        <EditableField
          section="contact"
          field="prenom"
          label="Prénom"
          value={data.contact?.prenom}
          isEditing={isEditing}
          hasError={!!validationErrors['contact.prenom']}
          errorMessage={validationErrors['contact.prenom']}
          onChange={onChange}
        />
        <EditableField
          section="contact"
          field="email"
          label="Email"
          value={data.contact?.email}
          type="email"
          isEditing={isEditing}
          hasError={!!validationErrors['contact.email']}
          errorMessage={validationErrors['contact.email']}
          onChange={onChange}
        />
        <EditableField
          section="contact"
          field="telephone"
          label="Téléphone"
          value={data.contact?.telephone}
          type="tel"
          isEditing={isEditing}
          hasError={!!validationErrors['contact.telephone']}
          errorMessage={validationErrors['contact.telephone']}
          onChange={onChange}
        />
        <EditableField
          section="contact"
          field="adresse"
          label="Adresse"
          value={data.contact?.adresse}
          isEditing={isEditing}
          hasError={!!validationErrors['contact.adresse']}
          errorMessage={validationErrors['contact.adresse']}
          onChange={onChange}
        />
        <EditableField
          section="contact"
          field="codePostal"
          label="Code postal"
          value={data.contact?.codePostal}
          isEditing={isEditing}
          hasError={!!validationErrors['contact.codePostal']}
          errorMessage={validationErrors['contact.codePostal']}
          onChange={onChange}
        />
        <EditableField
          section="contact"
          field="ville"
          label="Ville"
          value={data.contact?.ville}
          isEditing={isEditing}
          hasError={!!validationErrors['contact.ville']}
          errorMessage={validationErrors['contact.ville']}
          onChange={onChange}
        />
      </div>
    </div>
  )
}
