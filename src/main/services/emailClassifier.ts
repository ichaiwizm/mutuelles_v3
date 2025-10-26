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

// Mots-clés indiquant un lead potentiel (réduit aux termes spécifiques)
const LEAD_KEYWORDS = [
  // Demande de devis (expressions spécifiques uniquement)
  'demande de devis',
  'demande devis',
  'devis mutuelle',
  'devis complémentaire',
  'devis complementaire',
  'tarification mutuelle',
  'simulation mutuelle',
  'cotisation',

  // Mutuelle et santé (termes spécifiques)
  'mutuelle',
  'complémentaire santé',
  'complementaire sante',
  'assurance santé',
  'assurance sante',
  'prévoyance',
  'prevoyance',

  // Actions (uniquement actions d'engagement)
  'souscription',
  'souscrire',
  'adhésion',
  'adhesion',
  'résiliation',
  'resiliation',

  // Types de personnes (professions spécifiques)
  'tns',
  'travailleur non salarié',
  'profession libérale',
  'auto-entrepreneur',
  'indépendant',

  // Informations lead (termes explicites)
  'prospect',
  'client potentiel',
  'nouvelle demande',

  // Plateformes (sources connues)
  'assurprospect',
  'assurlead',
  'lelynx',
  'assurland',
  'hyperassur',

  // Termes techniques spécifiques
  'indemnités journalières',
  'indemnites journalieres'
  // Note: 'ij' retiré car trop court (2 lettres)
  // Causait des faux positifs dans URLs, tokens JWT/base64, et mots aléatoires
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
  'recu',
  'publicité',
  'publicite',
  'pub',
  'annonce',
  'découvrez',
  'decouvrez',
  'profitez',
  'économisez',
  'economisez',
  'ne pas répondre',
  'ne pas repondre',
  'no-reply',
  'noreply',
  'automatic',
  'automatique'
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
 * Scoring : Points pour la détection
 */
const SCORING = {
  KNOWN_SENDER: 50,
  KEYWORD_IN_SUBJECT: 30,
  KEYWORD_IN_CONTENT: 15,
  THRESHOLD: 70 // Seuil minimum pour considérer un email comme lead
}

/**
 * Vérifie si l'expéditeur est connu et retourne le score
 */
function checkKnownSender(from: string): { isKnown: boolean; score: number } {
  const normalizedFrom = normalize(from)
  const isKnown = KNOWN_SENDERS.some(sender => normalizedFrom.includes(normalize(sender)))
  return { isKnown, score: isKnown ? SCORING.KNOWN_SENDER : 0 }
}

/**
 * Compte les mots-clés de lead dans le texte et retourne le score
 */
function countLeadKeywords(text: string, scorePerKeyword: number): { count: number; score: number; keywords: string[] } {
  const normalizedText = normalize(text)
  const foundKeywords: string[] = []

  LEAD_KEYWORDS.forEach(keyword => {
    if (normalizedText.includes(normalize(keyword))) {
      foundKeywords.push(keyword)
    }
  })

  return {
    count: foundKeywords.length,
    score: foundKeywords.length * scorePerKeyword,
    keywords: foundKeywords
  }
}

/**
 * Vérifie si le texte contient des mots-clés d'exclusion
 */
function containsExclusionKeywords(text: string): { hasExclusion: boolean; keywords: string[] } {
  const normalizedText = normalize(text)
  const foundKeywords: string[] = []

  EXCLUSION_KEYWORDS.forEach(keyword => {
    if (normalizedText.includes(normalize(keyword))) {
      foundKeywords.push(keyword)
    }
  })

  return {
    hasExclusion: foundKeywords.length > 0,
    keywords: foundKeywords
  }
}

/**
 * Détecte si un email contient potentiellement un lead avec système de scoring
 *
 * @param email - Message email à analyser
 * @returns Résultat de la détection avec raisons et score
 */
export function detectLeadPotential(email: {
  from: string
  subject: string
  content: string
  snippet?: string
}): { hasLead: boolean; reasons: string[]; score?: number } {
  const reasons: string[] = []
  let totalScore = 0

  // 1. Vérifier l'expéditeur
  const senderCheck = checkKnownSender(email.from)
  if (senderCheck.isKnown) {
    totalScore += senderCheck.score
    reasons.push(`Expéditeur connu : ${email.from} (+${senderCheck.score} pts)`)
  }

  // 2. Vérifier le sujet
  const subjectCheck = countLeadKeywords(email.subject, SCORING.KEYWORD_IN_SUBJECT)
  if (subjectCheck.count > 0) {
    totalScore += subjectCheck.score
    reasons.push(`${subjectCheck.count} mot(s)-clé(s) dans le sujet : ${subjectCheck.keywords.slice(0, 3).join(', ')}${subjectCheck.keywords.length > 3 ? '...' : ''} (+${subjectCheck.score} pts)`)
  }

  // 3. Vérifier le contenu (snippet d'abord pour performance)
  const textToCheck = email.snippet || email.content
  const contentCheck = countLeadKeywords(textToCheck, SCORING.KEYWORD_IN_CONTENT)
  if (contentCheck.count > 0) {
    totalScore += contentCheck.score
    reasons.push(`${contentCheck.count} mot(s)-clé(s) dans le contenu (+${contentCheck.score} pts)`)
  }

  // 4. Exclure si contient des mots-clés d'exclusion
  const fullText = `${email.subject} ${textToCheck}`
  const exclusionCheck = containsExclusionKeywords(fullText)
  if (exclusionCheck.hasExclusion) {
    // Si on avait détecté un lead mais qu'il y a des mots d'exclusion
    if (reasons.length > 0) {
      reasons.push(`⚠️ Mots d'exclusion détectés : ${exclusionCheck.keywords.slice(0, 2).join(', ')}${exclusionCheck.keywords.length > 2 ? '...' : ''} (score annulé)`)
    }
    // Ne retourne pas de lead si exclusion keywords présents
    return { hasLead: false, reasons: [], score: 0 }
  }

  // 5. Décision finale basée sur le score
  const hasLead = totalScore >= SCORING.THRESHOLD

  // Ajouter le score total dans les raisons si c'est un lead
  if (hasLead) {
    reasons.push(`✓ Score total : ${totalScore}/${SCORING.THRESHOLD} (seuil atteint)`)
  } else if (totalScore > 0) {
    reasons.push(`✗ Score insuffisant : ${totalScore}/${SCORING.THRESHOLD}`)
  }

  return { hasLead, reasons, score: totalScore }
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
