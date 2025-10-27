import type { EmailMessage } from '../../shared/types/email'

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

const LEAD_KEYWORDS = [
  'demande de devis',
  'demande devis',
  'devis mutuelle',
  'devis complémentaire',
  'devis complementaire',
  'tarification mutuelle',
  'simulation mutuelle',
  'cotisation',
  'mutuelle',
  'complémentaire santé',
  'complementaire sante',
  'assurance santé',
  'assurance sante',
  'prévoyance',
  'prevoyance',
  'souscription',
  'souscrire',
  'adhésion',
  'adhesion',
  'résiliation',
  'resiliation',
  'tns',
  'travailleur non salarié',
  'profession libérale',
  'auto-entrepreneur',
  'indépendant',
  'prospect',
  'client potentiel',
  'nouvelle demande',
  'assurprospect',
  'assurlead',
  'lelynx',
  'assurland',
  'hyperassur',
  'indemnités journalières',
  'indemnites journalieres'
]

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

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const SCORING = {
  KNOWN_SENDER: 50,
  KEYWORD_IN_SUBJECT: 30,
  KEYWORD_IN_CONTENT: 15,
  THRESHOLD: 70
}

function checkKnownSender(from: string): { isKnown: boolean; score: number } {
  const normalizedFrom = normalize(from)
  const isKnown = KNOWN_SENDERS.some(sender => normalizedFrom.includes(normalize(sender)))
  return { isKnown, score: isKnown ? SCORING.KNOWN_SENDER : 0 }
}

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

export function detectLeadPotential(email: {
  from: string
  subject: string
  content: string
  snippet?: string
}): { hasLead: boolean; reasons: string[]; score?: number } {
  const reasons: string[] = []
  let totalScore = 0

  const senderCheck = checkKnownSender(email.from)
  if (senderCheck.isKnown) {
    totalScore += senderCheck.score
    reasons.push(`Expéditeur connu : ${email.from} (+${senderCheck.score} pts)`)
  }

  const subjectCheck = countLeadKeywords(email.subject, SCORING.KEYWORD_IN_SUBJECT)
  if (subjectCheck.count > 0) {
    totalScore += subjectCheck.score
    reasons.push(`${subjectCheck.count} mot(s)-clé(s) dans le sujet : ${subjectCheck.keywords.slice(0, 3).join(', ')}${subjectCheck.keywords.length > 3 ? '...' : ''} (+${subjectCheck.score} pts)`)
  }

  const textToCheck = email.snippet || email.content
  const contentCheck = countLeadKeywords(textToCheck, SCORING.KEYWORD_IN_CONTENT)
  if (contentCheck.count > 0) {
    totalScore += contentCheck.score
    reasons.push(`${contentCheck.count} mot(s)-clé(s) dans le contenu (+${contentCheck.score} pts)`)
  }

  const fullText = `${email.subject} ${textToCheck}`
  const exclusionCheck = containsExclusionKeywords(fullText)
  if (exclusionCheck.hasExclusion) {
    if (reasons.length > 0) {
      reasons.push(`⚠️ Mots d'exclusion détectés : ${exclusionCheck.keywords.slice(0, 2).join(', ')}${exclusionCheck.keywords.length > 2 ? '...' : ''} (score annulé)`)
    }
    return { hasLead: false, reasons: [], score: 0 }
  }

  const hasLead = totalScore >= SCORING.THRESHOLD

  if (hasLead) {
    reasons.push(`✓ Score total : ${totalScore}/${SCORING.THRESHOLD} (seuil atteint)`)
  } else if (totalScore > 0) {
    reasons.push(`✗ Score insuffisant : ${totalScore}/${SCORING.THRESHOLD}`)
  }

  return { hasLead, reasons, score: totalScore }
}

export class EmailClassifier {
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

  classifyBatch(emails: EmailMessage[]): EmailMessage[] {
    return emails.map(email => this.classify(email))
  }

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

export const emailClassifier = new EmailClassifier()
