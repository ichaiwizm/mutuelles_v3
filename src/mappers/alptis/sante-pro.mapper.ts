/**
 * MAPPER: Alptis - Santé Pro
 *
 * Convertit un LeadGenerique en données spécifiques
 * pour le produit "Santé Pro" d'Alptis.
 */

import {
  Mapper,
  MapperMetadata,
  MapperValidationResult,
  AlptisSanteProData,
} from '../../shared/types/mappers';
import { LeadGenerique } from '../../shared/types/models';

export class AlptisSanteProMapper implements Mapper<AlptisSanteProData> {
  metadata: MapperMetadata = {
    platformKey: 'alptis',
    productKey: 'sante-pro',
    version: '1.0.0',
  };

  /**
   * Valide le lead
   */
  validate(lead: LeadGenerique): MapperValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Champs requis - Subscriber
    if (!lead.subscriber.civility) {
      errors.push('Civilité souscripteur manquante');
    }
    if (!lead.subscriber.lastName) {
      errors.push('Nom souscripteur manquant');
    }
    if (!lead.subscriber.firstName) {
      errors.push('Prénom souscripteur manquant');
    }
    if (!lead.subscriber.birthDate) {
      errors.push('Date de naissance souscripteur manquante');
    }
    if (!lead.subscriber.postalCode) {
      errors.push('Code postal souscripteur manquant');
    }
    if (!lead.subscriber.category) {
      warnings.push(
        'Catégorie socioprofessionnelle manquante (défaut: PERSONNES_SANS_ACTIVITE_PROFESSIONNELLE)'
      );
    }
    if (!lead.subscriber.regime) {
      warnings.push('Régime souscripteur manquant (défaut: SECURITE_SOCIALE)');
    }

    // Champs requis - Project
    if (!lead.project.dateEffet) {
      errors.push('Date d\'effet manquante');
    }

    // Conjoint (si présent)
    if (lead.spouse) {
      if (!lead.spouse.birthDate) {
        errors.push('Date de naissance conjoint manquante');
      }
      if (!lead.spouse.civility) {
        warnings.push('Civilité conjoint manquante (défaut: MADAME)');
      }
      if (!lead.spouse.category) {
        warnings.push(
          'Catégorie socioprofessionnelle conjoint manquante (défaut: PERSONNES_SANS_ACTIVITE_PROFESSIONNELLE)'
        );
      }
    }

    // Enfants (si présents)
    if (lead.children && lead.children.length > 0) {
      lead.children.forEach((child, index) => {
        if (!child.birthDate) {
          errors.push(`Date de naissance enfant #${index + 1} manquante`);
        }
        if (!child.regime) {
          warnings.push(
            `Régime enfant #${index + 1} manquant (défaut: SECURITE_SOCIALE)`
          );
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Mappe le lead vers les données Alptis
   */
  map(lead: LeadGenerique): AlptisSanteProData {
    // Date effet
    const date_effet = lead.project.dateEffet;

    // Souscripteur
    const souscripteur = {
      civilite: lead.subscriber.civility,
      nom: lead.subscriber.lastName,
      prenom: lead.subscriber.firstName,
      date_naissance: lead.subscriber.birthDate,
      code_postal: lead.subscriber.postalCode || '',
      categorie_socioprofessionnelle:
        lead.subscriber.category || 'PERSONNES_SANS_ACTIVITE_PROFESSIONNELLE',
      regime_obligatoire: lead.subscriber.regime || 'SECURITE_SOCIALE',
      cadre_exercice: this.determineCadreExercice(lead),
    };

    // Conjoint (optionnel)
    const conjoint = lead.spouse
      ? {
          civilite: lead.spouse.civility || 'MADAME',
          date_naissance: lead.spouse.birthDate,
          categorie_socioprofessionnelle:
            lead.spouse.category || 'PERSONNES_SANS_ACTIVITE_PROFESSIONNELLE',
          regime_obligatoire: lead.spouse.regime || 'SECURITE_SOCIALE',
          cadre_exercice: lead.spouse.workFramework,
        }
      : undefined;

    // Enfants (optionnel)
    const enfants =
      lead.children && lead.children.length > 0
        ? lead.children.map((child) => ({
            date_naissance: child.birthDate,
            regime_obligatoire: child.regime || 'SECURITE_SOCIALE',
          }))
        : undefined;

    return {
      date_effet,
      souscripteur,
      conjoint,
      enfants,
    };
  }

  /**
   * Détermine le cadre d'exercice
   */
  private determineCadreExercice(
    lead: LeadGenerique
  ): 'SALARIE' | 'INDEPENDANT' | undefined {
    // Si explicitement défini
    if (lead.subscriber.workFramework) {
      return lead.subscriber.workFramework;
    }

    // Cadre d'exercice uniquement pour certaines catégories
    const category = lead.subscriber.category;
    const categoriesAvecCadre = [
      'CHEFS_D_ENTREPRISE',
      'PROFESSIONS_LIBERALES_ET_ASSIMILES',
      'ARTISANS',
      'COMMERCANTS_ET_ASSIMILES',
      'AGRICULTEURS_EXPLOITANTS',
    ];

    if (category && categoriesAvecCadre.includes(category)) {
      return 'SALARIE'; // Défaut
    }

    return undefined;
  }
}
