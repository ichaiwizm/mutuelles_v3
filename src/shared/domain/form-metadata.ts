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
    // departmentCode retiré - calculé automatiquement à partir du code postal
    regime: {
      label: 'Régime',
      type: 'select' as const,
      options: [
        { value: 'SECURITE_SOCIALE', label: 'Sécurité Sociale' },
        { value: 'TNS', label: 'TNS (Indépendant)' },
        { value: 'SECURITE_SOCIALE_INDEPENDANTS', label: 'Sécurité Sociale Indépendants' },
        { value: 'AMEXA', label: 'AMEXA (Agricole)' },
        { value: 'ALSACE_MOSELLE', label: 'Alsace-Moselle' },
        { value: 'REGIME_SALARIES_AGRICOLES', label: 'Régime Salariés Agricoles' },
        { value: 'AUTRES_REGIME_SPECIAUX', label: 'Autres régimes spéciaux' },
      ],
      defaultValue: 'TNS',
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
      defaultValue: 'TNS',
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
      defaultValue: 'Autre',
    },
    category: {
      label: 'Catégorie',
      type: 'select' as const,
      options: [
        { value: 'CHEFS_D_ENTREPRISE', label: 'Chefs d\'entreprise' },
        { value: 'PROFESSIONS_LIBERALES_ET_ASSIMILES', label: 'Professions libérales et assimilés' },
        { value: 'ARTISANS', label: 'Artisans' },
        { value: 'COMMERCANTS_ET_ASSIMILES', label: 'Commerçants et assimilés' },
        { value: 'AGRICULTEURS_EXPLOITANTS', label: 'Agriculteurs exploitants' },
      ],
      defaultValue: 'PROFESSIONS_LIBERALES_ET_ASSIMILES',
    },
    workFramework: {
      label: 'Cadre de travail',
      type: 'select' as const,
      options: [
        { value: 'SALARIE', label: 'Salarié' },
        { value: 'INDEPENDANT', label: 'Indépendant' },
      ],
      defaultValue: 'INDEPENDANT',
    },
    childrenCount: {
      label: 'Nombre d\'enfants',
      type: 'number' as const,
      inputMode: 'numeric' as const,
      defaultValue: 0,
    },
  },
  spouse: {
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
        { value: 'SECURITE_SOCIALE_INDEPENDANTS', label: 'Sécurité Sociale Indépendants' },
        { value: 'AMEXA', label: 'AMEXA (Agricole)' },
        { value: 'ALSACE_MOSELLE', label: 'Alsace-Moselle' },
        { value: 'REGIME_SALARIES_AGRICOLES', label: 'Régime Salariés Agricoles' },
        { value: 'AUTRES_REGIME_SPECIAUX', label: 'Autres régimes spéciaux' },
      ],
      defaultValue: 'TNS',
    },
    status: {
      label: 'Statut',
      type: 'select' as const,
      options: [
        { value: 'SALARIE', label: 'Salarié' },
        { value: 'TNS', label: 'TNS' },
        { value: 'AUTRE', label: 'Autre' },
      ],
      defaultValue: 'TNS',
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
      defaultValue: 'Autre',
    },
    category: {
      label: 'Catégorie',
      type: 'select' as const,
      options: [
        { value: 'CHEFS_D_ENTREPRISE', label: 'Chefs d\'entreprise' },
        { value: 'PROFESSIONS_LIBERALES_ET_ASSIMILES', label: 'Professions libérales et assimilés' },
        { value: 'ARTISANS', label: 'Artisans' },
        { value: 'COMMERCANTS_ET_ASSIMILES', label: 'Commerçants et assimilés' },
        { value: 'AGRICULTEURS_EXPLOITANTS', label: 'Agriculteurs exploitants' },
      ],
      defaultValue: 'PROFESSIONS_LIBERALES_ET_ASSIMILES',
    },
    workFramework: {
      label: 'Cadre de travail',
      type: 'select' as const,
      options: [
        { value: 'SALARIE', label: 'Salarié' },
        { value: 'INDEPENDANT', label: 'Indépendant' },
      ],
      defaultValue: 'INDEPENDANT',
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
        { value: 'TNS', label: 'TNS (Indépendant)' },
        { value: 'SECURITE_SOCIALE_INDEPENDANTS', label: 'Sécurité Sociale Indépendants' },
        { value: 'AMEXA', label: 'AMEXA (Agricole)' },
        { value: 'ALSACE_MOSELLE', label: 'Alsace-Moselle' },
        { value: 'REGIME_SALARIES_AGRICOLES', label: 'Régime Salariés Agricoles' },
        { value: 'AUTRES_REGIME_SPECIAUX', label: 'Autres régimes spéciaux' },
      ],
      defaultValue: 'SECURITE_SOCIALE_INDEPENDANTS',
    },
    ayantDroit: {
      label: 'Ayant droit de',
      type: 'select' as const,
      options: [
        { value: 'CLIENT', label: 'Client' },
        { value: 'CONJOINT', label: 'Conjoint' },
      ],
      defaultValue: 'CLIENT',
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
