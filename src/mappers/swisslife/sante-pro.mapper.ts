/**
 * MAPPER: SwissLife - Santé Pro
 *
 * Convertit un LeadGenerique en données spécifiques
 * pour le produit "Santé Pro" de Swiss Life One.
 */

import {
  Mapper,
  MapperMetadata,
  MapperValidationResult,
  SwissLifeSanteProData,
} from '../../shared/types/mappers';
import { LeadGenerique } from '../../shared/types/models';

export class SwissLifeSanteProMapper implements Mapper<SwissLifeSanteProData> {
  metadata: MapperMetadata = {
    platformKey: 'swisslife',
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
    if (!lead.subscriber.departmentCode) {
      errors.push('Département souscripteur manquant');
    }
    if (!lead.subscriber.regime) {
      warnings.push('Régime souscripteur manquant (défaut: TNS)');
    }
    if (!lead.subscriber.status) {
      warnings.push('Statut souscripteur manquant (défaut: TNS)');
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
    }

    // Enfants (si présents)
    if (lead.children && lead.children.length > 0) {
      lead.children.forEach((child, index) => {
        if (!child.birthDate) {
          errors.push(`Date de naissance enfant #${index + 1} manquante`);
        }
        if (!child.ayantDroit) {
          warnings.push(
            `Ayant droit enfant #${index + 1} manquant (défaut: CLIENT)`
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
   * Mappe le lead vers les données SwissLife
   */
  map(lead: LeadGenerique): SwissLifeSanteProData {
    // Projet
    const projet = {
      nom:
        lead.project.name ||
        `Simulation ${lead.subscriber.lastName} ${lead.subscriber.firstName}`,
      couverture_individuelle: lead.project.couverture !== false,
      indemnites_journalieres: lead.project.ij || false,
      resiliation_contrat: lead.project.resiliation || false,
      reprise_concurrence: lead.project.reprise || false,
      loi_madelin: this.shouldApplyMadelin(lead),
      date_effet: lead.project.dateEffet,
    };

    // Souscripteur
    const souscripteur = {
      civilite: lead.subscriber.civility,
      nom: lead.subscriber.lastName,
      prenom: lead.subscriber.firstName,
      date_naissance: lead.subscriber.birthDate,
      departement: String(lead.subscriber.departmentCode || '75'),
      regime_social: lead.subscriber.regime || 'TNS',
      statut: lead.subscriber.status || 'TNS',
      profession: lead.subscriber.profession,
    };

    // Conjoint (optionnel)
    const conjoint = lead.spouse
      ? {
          civilite: lead.spouse.civility || 'MADAME',
          date_naissance: lead.spouse.birthDate,
          regime_social: lead.spouse.regime || 'TNS',
          statut: lead.spouse.status || 'TNS',
          profession: lead.spouse.profession,
        }
      : undefined;

    // Enfants (optionnel)
    const enfants =
      lead.children && lead.children.length > 0
        ? lead.children.map((child) => ({
            date_naissance: child.birthDate,
            ayant_droit: this.mapAyantDroit(child.ayantDroit),
          }))
        : undefined;

    return {
      projet,
      souscripteur,
      conjoint,
      enfants,
    };
  }

  /**
   * Détermine si la Loi Madelin doit être appliquée
   */
  private shouldApplyMadelin(lead: LeadGenerique): boolean {
    // Madelin explicitement défini
    if (lead.project.madelin !== undefined) {
      return lead.project.madelin;
    }

    // Madelin par défaut si TNS ou Exploitant Agricole
    const status = lead.subscriber.status?.toUpperCase();
    return status === 'TNS' || status === 'EXPLOITANT_AGRICOLE';
  }

  /**
   * Mappe l'ayant droit
   */
  private mapAyantDroit(ayantDroit?: string): 'CLIENT' | 'CONJOINT' {
    if (ayantDroit === '2') return 'CONJOINT';
    return 'CLIENT';
  }
}
