/**
 * Form field metadata for UI generation
 *
 * This file contains UI-specific metadata for form fields.
 * It works alongside the Zod schemas in core/domain/lead.schema.ts
 * to generate form UIs.
 */

export interface FieldMetadata {
  label: string
  type: 'text' | 'date' | 'select' | 'radio' | 'number' | 'toggle' | 'checkbox' | 'email' | 'tel'
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  defaultValue?: any
  disabled?: boolean
  showIf?: {
    field: string
    equals?: any
    oneOf?: any[]
  }
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email'
  autoGenerate?: boolean
  template?: string
}

/**
 * Form metadata organized by section and field
 */
export const formMetadata = {
  subscriber: {
    civility: {
      label: 'Civilité',
      type: 'radio' as const,
      options: [
        { value: 'MONSIEUR', label: 'Monsieur' },
        { value: 'MADAME', label: 'Madame' },
      ],
      defaultValue: 'MONSIEUR',
    },
    lastName: {
      label: 'Nom',
      type: 'text' as const,
      placeholder: 'Dupont',
    },
    firstName: {
      label: 'Prénom',
      type: 'text' as const,
      placeholder: 'Jean',
    },
    birthDate: {
      label: 'Date de naissance',
      type: 'date' as const,
    },
    phoneE164: {
      label: 'Téléphone',
      type: 'tel' as const,
      inputMode: 'tel' as const,
      placeholder: '+33612345678',
    },
    email: {
      label: 'Email',
      type: 'email' as const,
      inputMode: 'email' as const,
      placeholder: 'jean.dupont@example.com',
    },
    postalCode: {
      label: 'Code postal',
      type: 'text' as const,
      inputMode: 'numeric' as const,
      placeholder: '75001',
    },
    departmentCode: {
      label: 'Département',
      type: 'text' as const,
      placeholder: '75',
    },
    regime: {
      label: 'Régime',
      type: 'select' as const,
      options: [
        { value: 'SECURITE_SOCIALE', label: 'Sécurité Sociale' },
        { value: 'TNS', label: 'TNS (Indépendant)' },
        { value: 'AMEXA', label: 'AMEXA (Agricole)' },
        { value: 'SECURITE_SOCIALE_ALSACE_MOSELLE', label: 'Alsace-Moselle' },
        { value: 'AUTRES_REGIME_SPECIAUX', label: 'Autres régimes spéciaux' },
      ],
      defaultValue: 'SECURITE_SOCIALE',
    },
    status: {
      label: 'Statut',
      type: 'select' as const,
      options: [
        { value: 'SALARIE', label: 'Salarié' },
        { value: 'TNS', label: 'TNS' },
        { value: 'EXPLOITANT_AGRICOLE', label: 'Exploitant agricole' },
        { value: 'AUTRE', label: 'Autre' },
      ],
    },
    profession: {
      label: 'Profession',
      type: 'select' as const,
      options: [
        { value: 'Ingénieur', label: 'Ingénieur' },
        { value: 'Médecin', label: 'Médecin' },
        { value: 'Profession libérale', label: 'Profession libérale' },
        { value: 'Commerçant', label: 'Commerçant' },
        { value: 'Cadre', label: 'Cadre' },
        { value: 'Employé', label: 'Employé' },
        { value: 'Ouvrier', label: 'Ouvrier' },
        { value: 'Enseignant', label: 'Enseignant' },
        { value: 'Infirmier', label: 'Infirmier' },
        { value: 'Avocat', label: 'Avocat' },
        { value: 'Autre', label: 'Autre' },
      ],
    },
    category: {
      label: 'Catégorie',
      type: 'select' as const,
      options: [
        { value: 'CADRES', label: 'Cadres' },
        { value: 'NON_CADRES', label: 'Non-cadres' },
      ],
    },
    workFramework: {
      label: 'Cadre de travail',
      type: 'select' as const,
      options: [
        { value: 'SALARIE', label: 'Salarié' },
        { value: 'INDEPENDANT', label: 'Indépendant' },
      ],
    },
    childrenCount: {
      label: 'Nombre d\'enfants',
      type: 'number' as const,
      inputMode: 'numeric' as const,
      defaultValue: 0,
    },
  },
  spouse: {
    civility: {
      label: 'Civilité',
      type: 'radio' as const,
      options: [
        { value: 'MONSIEUR', label: 'Monsieur' },
        { value: 'MADAME', label: 'Madame' },
      ],
    },
    firstName: {
      label: 'Prénom',
      type: 'text' as const,
    },
    lastName: {
      label: 'Nom',
      type: 'text' as const,
    },
    birthDate: {
      label: 'Date de naissance',
      type: 'date' as const,
    },
    regime: {
      label: 'Régime',
      type: 'select' as const,
      options: [
        { value: 'SECURITE_SOCIALE', label: 'Sécurité Sociale' },
        { value: 'TNS', label: 'TNS (Indépendant)' },
        { value: 'AMEXA', label: 'AMEXA (Agricole)' },
        { value: 'SECURITE_SOCIALE_ALSACE_MOSELLE', label: 'Alsace-Moselle' },
      ],
    },
    status: {
      label: 'Statut',
      type: 'select' as const,
      options: [
        { value: 'SALARIE', label: 'Salarié' },
        { value: 'TNS', label: 'TNS' },
        { value: 'AUTRE', label: 'Autre' },
      ],
    },
    profession: {
      label: 'Profession',
      type: 'select' as const,
      options: [
        { value: 'Ingénieur', label: 'Ingénieur' },
        { value: 'Médecin', label: 'Médecin' },
        { value: 'Profession libérale', label: 'Profession libérale' },
        { value: 'Commerçant', label: 'Commerçant' },
        { value: 'Cadre', label: 'Cadre' },
        { value: 'Employé', label: 'Employé' },
        { value: 'Ouvrier', label: 'Ouvrier' },
        { value: 'Enseignant', label: 'Enseignant' },
        { value: 'Infirmier', label: 'Infirmier' },
        { value: 'Avocat', label: 'Avocat' },
        { value: 'Autre', label: 'Autre' },
      ],
    },
    category: {
      label: 'Catégorie',
      type: 'select' as const,
      options: [
        { value: 'CADRES', label: 'Cadres' },
        { value: 'NON_CADRES', label: 'Non-cadres' },
      ],
    },
    workFramework: {
      label: 'Cadre de travail',
      type: 'select' as const,
      options: [
        { value: 'SALARIE', label: 'Salarié' },
        { value: 'INDEPENDANT', label: 'Indépendant' },
      ],
    },
  },
  children: {
    birthDate: {
      label: 'Date de naissance',
      type: 'date' as const,
    },
    regime: {
      label: 'Régime',
      type: 'select' as const,
      options: [
        { value: 'SECURITE_SOCIALE', label: 'Sécurité Sociale' },
        { value: 'TNS', label: 'TNS' },
      ],
    },
    ayantDroit: {
      label: 'Ayant droit de',
      type: 'select' as const,
      options: [
        { value: 'CLIENT', label: 'Client' },
        { value: 'CONJOINT', label: 'Conjoint' },
      ],
    },
  },
  project: {
    name: {
      label: 'Nom du projet',
      type: 'text' as const,
      autoGenerate: true,
      template: 'Simulation {subscriber.lastName} {subscriber.firstName}',
    },
    dateEffet: {
      label: 'Date d\'effet',
      type: 'date' as const,
      defaultValue: 'firstOfNextMonth',
    },
  },
}

/**
 * Helper to get metadata for a field
 */
export function getFieldMetadata(section: string, field: string): FieldMetadata | undefined {
  return (formMetadata as any)[section]?.[field]
}
