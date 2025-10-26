/**
 * Email Classifier - Détecte si un email contient potentiellement un lead
 *
 * Utilise deux méthodes de détection :
 * 1. Expéditeurs connus (whitelist)
 * 2. Mots-clés dans le sujet et le contenu
 */

import type { EmailMessage } from '../../shared/types/email'

// Expéditeurs connus qui envoient des leads
const KNOWN_SENDERS = [
  'assurprospect',
  'assurlead',
  'leads@',
  'prospect@',
  'contact@assurances',
  'mutuelle@',
  'devis@',
  'comparateur',
  'assurance-sante'
]

// Mots-clés indiquant un lead potentiel
const LEAD_KEYWORDS = [
  // Demande de devis
  'devis',
  'demande de devis',
  'demande devis',
  'tarif',
  'tarification',
  'simulation',
  'cotisation',
  'prix',

  // Mutuelle et santé
  'mutuelle',
  'complémentaire santé',
  'complementaire sante',
  'assurance santé',
  'assurance sante',
  'protection santé',
  'couverture santé',
  'prévoyance',
  'prevoyance',

  // Actions
  'souscrire',
  'souscription',
  'adhésion',
  'adhesion',
  'inscription',
  'résiliation',
  'resiliation',

  // Types de personnes
  'tns',
  'travailleur non salarié',
  'profession libérale',
  'auto-entrepreneur',
  'indépendant',
  'salarié',
  'salarie',
  'retraité',
  'retraite',
  'étudiant',
  'etudiant',

  // Informations lead
  'prospect',
  'client potentiel',
  'nouvelle demande',
  'nouveau contact',
  'formulaire',
  'coordonnées',
  'coordonnees',

  // Plateformes
  'assurprospect',
  'assurlead',
  'lelynx',
  'assurland',
  'hyperassur',

  // Spécifique assurance
  'régime obligatoire',
  'regime obligatoire',
  'ij',
  'indemnités journalières',
  'indemnites journalieres',
  'hospitalisation',
  'dentaire',
  'optique',
  'lunettes'
]

// Mots-clés à exclure (emails promotionnels, newsletters, etc.)
const EXCLUSION_KEYWORDS = [
  'newsletter',
  'actualités',
  'actualites',
  'promotion',
  'offre spéciale',
  'offre speciale',
  'code promo',
  'réduction',
  'reduction',
  'soldes',
  'black friday',
  'cyber monday',
  'notification',
  'rappel',
  'confirmation',
  'facture',
  'paiement',
  'reçu',
  'recu'
]

/**
 * Normalise une chaîne pour la comparaison
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim()
}

/**
 * Vérifie si l'expéditeur est connu
 */
function isKnownSender(from: string): boolean {
  const normalizedFrom = normalize(from)
  return KNOWN_SENDERS.some(sender => normalizedFrom.includes(normalize(sender)))
}

/**
 * Vérifie si le texte contient des mots-clés de lead
 */
function containsLeadKeywords(text: string): boolean {
  const normalizedText = normalize(text)
  return LEAD_KEYWORDS.some(keyword => normalizedText.includes(normalize(keyword)))
}

/**
 * Vérifie si le texte contient des mots-clés d'exclusion
 */
function containsExclusionKeywords(text: string): boolean {
  const normalizedText = normalize(text)
  return EXCLUSION_KEYWORDS.some(keyword => normalizedText.includes(normalize(keyword)))
}

/**
 * Détecte si un email contient potentiellement un lead
 *
 * @param email - Message email à analyser
 * @returns Résultat de la détection avec raisons
 */
export function detectLeadPotential(email: {
  from: string
  subject: string
  content: string
  snippet?: string
}): { hasLead: boolean; reasons: string[] } {
  const reasons: string[] = []

  // 1. Vérifier l'expéditeur
  if (isKnownSender(email.from)) {
    reasons.push(`Expéditeur connu : ${email.from}`)
  }

  // 2. Vérifier le sujet
  if (containsLeadKeywords(email.subject)) {
    reasons.push('Mots-clés de lead détectés dans le sujet')
  }

  // 3. Vérifier le contenu (snippet d'abord pour performance)
  const textToCheck = email.snippet || email.content
  if (containsLeadKeywords(textToCheck)) {
    reasons.push('Mots-clés de lead détectés dans le contenu')
  }

  // 4. Exclure si contient des mots-clés d'exclusion
  const fullText = `${email.subject} ${textToCheck}`
  if (containsExclusionKeywords(fullText)) {
    // Si on avait détecté un lead mais qu'il y a des mots d'exclusion
    if (reasons.length > 0) {
      reasons.push('⚠️ Contient des mots-clés d\'exclusion (newsletter/promo)')
    }
    // Ne retourne pas de lead si exclusion keywords présents
    return { hasLead: false, reasons: [] }
  }

  // 5. Décision finale
  const hasLead = reasons.length > 0

  return { hasLead, reasons }
}

/**
 * Classe EmailClassifier pour une utilisation orientée objet
 */
export class EmailClassifier {
  /**
   * Détecte si un email contient potentiellement un lead
   */
  classify(email: EmailMessage): EmailMessage {
    const { hasLead, reasons } = detectLeadPotential({
      from: email.from,
      subject: email.subject,
      content: email.content,
      snippet: email.snippet
    })

    return {
      ...email,
      hasLeadPotential: hasLead,
      detectionReasons: reasons
    }
  }

  /**
   * Classe un batch d'emails
   */
  classifyBatch(emails: EmailMessage[]): EmailMessage[] {
    return emails.map(email => this.classify(email))
  }

  /**
   * Retourne les statistiques de classification
   */
  getStats(emails: EmailMessage[]): {
    total: number
    withLeads: number
    withoutLeads: number
    percentage: number
  } {
    const total = emails.length
    const withLeads = emails.filter(e => e.hasLeadPotential).length
    const withoutLeads = total - withLeads
    const percentage = total > 0 ? Math.round((withLeads / total) * 100) : 0

    return { total, withLeads, withoutLeads, percentage }
  }
}

// Export singleton instance
export const emailClassifier = new EmailClassifier()
