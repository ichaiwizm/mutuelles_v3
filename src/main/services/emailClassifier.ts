import type { EmailMessage, KnownSender } from '../../shared/types/email'

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const SCORING = {
  KNOWN_SENDER: 50,
  STRUCTURED_THRESHOLD: 2  // Score V1 minimum pour considérer comme lead
}

function checkKnownSender(from: string, customSenders?: KnownSender[]): { isKnown: boolean; score: number; matchedPattern?: string } {
  const normalizedFrom = normalize(from)

  if (customSenders && customSenders.length > 0) {
    for (const sender of customSenders) {
      const normalizedPattern = normalize(sender.pattern)

      let matches = false
      if (sender.type === 'email') {
        matches = normalizedFrom === normalizedPattern
      } else if (sender.type === 'domain') {
        matches = normalizedFrom.includes(normalizedPattern)
      } else if (sender.type === 'contains') {
        matches = normalizedFrom.includes(normalizedPattern)
      }

      if (matches) {
        return { isKnown: true, score: sender.bonus, matchedPattern: sender.pattern }
      }
    }
  }

  return { isKnown: false, score: 0 }
}

/**
 * Détection V1: AssurProspect format
 * Score: 5 si détecté, 0 sinon
 */
function canParseAsAssurProspect(content: string): number {
  const hasAssurProspect = content.includes('AssurProspect')
  const hasTransmission = content.includes('Transmission d\'une fiche') || content.includes("Transmission d'une fiche")
  const hasFiche = content.includes('Voici les éléments de la fiche trio')

  if (hasAssurProspect && hasTransmission && hasFiche) {
    return 5
  }

  return 0
}

/**
 * Détection V1: Assurlead format
 * Score: 5 si domaine/structure, 4 si marqueurs, 3 si basique, 0 sinon
 */
function canParseAsAssurlead(content: string): number {
  const c = content.toLowerCase()

  // Niveau 1: Détection explicite par domaine/source
  if (
    c.includes('assurlead') ||
    c.includes('assurland') ||
    c.includes('assurland.com') ||
    c.includes('service assurland') ||
    c.includes('opdata@assurland.com')
  ) {
    return 5
  }

  // Niveau 2: Détection par structure tabulaire spécifique
  const hasTabularStructure = c.includes('civilite\t') && c.includes('nom\t') && c.includes('telephone portable\t')

  if (hasTabularStructure) {
    return 5
  }

  // Niveau 3: Détection par marqueurs spécifiques Assurlead
  const hasAssurleadMarkers =
    c.includes('user_id') ||
    c.includes('besoin assurance sante') ||
    c.includes('formule choisie') ||
    c.includes('regime social conjoint')

  if (hasAssurleadMarkers) {
    return 4
  }

  // Niveau 4: Ancien système de détection (fallback)
  const hasBasicMarkers =
    c.includes('civilite') &&
    (c.includes('telephone portable') || c.includes('code postal')) &&
    c.includes('profession')

  if (hasBasicMarkers) {
    return 3
  }

  return 0
}

/**
 * Détection V1: Generic structured content
 * Score basé sur présence de champs structurés (0-5 points)
 * - Contact (0-2.5pts): nom+prénom (0.5), email (0.5), tel (0.5), adresse complète (1.0)
 * - Souscripteur (0-1.5pts): date naissance (0.5), profession (0.5), régime (0.5)
 * - Besoins (0-1.5pts): date effet (0.5), assuré (0.5), niveaux garantie (0.5)
 */
function canParseAsGeneric(content: string): number {
  const c = content.toLowerCase()
  let score = 0

  // Contact (0-2.5 points)
  if ((c.includes('nom :') || c.includes('nom:')) && (c.includes('prenom :') || c.includes('prénom :') || c.includes('prenom:'))) {
    score += 0.5
  }

  // Email - cherche pattern ou label
  if (c.includes('email :') || c.includes('email:') || c.includes('e-mail :') || /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(content)) {
    score += 0.5
  }

  // Téléphone
  if (c.includes('telephone :') || c.includes('téléphone :') || c.includes('tel :') || c.includes('telephone:') || c.includes('mobile :')) {
    score += 0.5
  }

  // Adresse complète (adresse + code postal + ville)
  if (
    (c.includes('adresse :') || c.includes('adresse:')) &&
    /\d{4,5}/.test(content) && // code postal (4-5 chiffres)
    (c.includes('ville :') || c.includes('ville:'))
  ) {
    score += 1.0
  }

  // Souscripteur (0-1.5 points)
  if (c.includes('date de naissance') || c.includes('ne le') || c.includes('né le')) {
    score += 0.5
  }

  if (c.includes('profession :') || c.includes('profession:') || c.includes('metier :')) {
    score += 0.5
  }

  if (c.includes('regime social') || c.includes('régime social') || c.includes('statut :')) {
    score += 0.5
  }

  // Besoins (0-1.5 points)
  if (c.includes('date d\'effet') || c.includes("date d'effet") || c.includes('date effet')) {
    score += 0.5
  }

  if (c.includes('assure actuellement') || c.includes('assuré actuellement') || c.includes('deja assure')) {
    score += 0.5
  }

  // Niveaux de garantie
  if (
    (c.includes('soins') || c.includes('hospitalisation') || c.includes('optique') || c.includes('dentaire')) &&
    (c.includes('niveau') || c.includes('garantie') || c.includes('formule'))
  ) {
    score += 0.5
  }

  return Math.min(score, 5)
}

/**
 * Orchestrateur: essaie les 3 détecteurs par ordre de spécificité
 * Retourne le premier score > 0 trouvé
 */
function detectStructuredContent(email: { subject: string; content: string; snippet?: string }): number {
  const fullContent = `${email.subject}\n${email.snippet || email.content}`

  // Essayer AssurProspect (le plus spécifique)
  const assurProspectScore = canParseAsAssurProspect(fullContent)
  if (assurProspectScore > 0) return assurProspectScore

  // Essayer Assurlead
  const assurleadScore = canParseAsAssurlead(fullContent)
  if (assurleadScore > 0) return assurleadScore

  // Fallback sur Generic
  return canParseAsGeneric(fullContent)
}

export function detectLeadPotential(
  email: {
    from: string
    subject: string
    content: string
    snippet?: string
  },
  customSenders?: KnownSender[]
): { hasLead: boolean; reasons: string[]; score?: number } {
  const reasons: string[] = []

  // Logique OR hybride: Known Sender OU Détection structurée V1

  // 1. Check Known Senders (V3) - prioritaire
  const senderCheck = checkKnownSender(email.from, customSenders)
  if (senderCheck.isKnown) {
    const matchInfo = senderCheck.matchedPattern ? ` (${senderCheck.matchedPattern})` : ''
    reasons.push(`✓ Expéditeur connu${matchInfo}`)
    return { hasLead: true, reasons, score: 50 }
  }

  // 2. Check détection structurée (V1)
  const v1Score = detectStructuredContent(email)

  if (v1Score >= SCORING.STRUCTURED_THRESHOLD) {
    reasons.push(`✓ Contenu structuré détecté (score: ${v1Score}/5)`)
    return { hasLead: true, reasons, score: v1Score }
  }

  // 3. Aucun critère satisfait
  if (v1Score > 0) {
    reasons.push(`✗ Score structurel insuffisant : ${v1Score}/${SCORING.STRUCTURED_THRESHOLD}`)
  } else {
    reasons.push(`✗ Aucune structure de lead détectée`)
  }

  return { hasLead: false, reasons, score: v1Score }
}

export class EmailClassifier {
  classify(email: EmailMessage, customSenders?: KnownSender[]): EmailMessage {
    const { hasLead, reasons } = detectLeadPotential({
      from: email.from,
      subject: email.subject,
      content: email.content,
      snippet: email.snippet
    }, customSenders)

    return {
      ...email,
      hasLeadPotential: hasLead,
      detectionReasons: reasons
    }
  }

  classifyBatch(emails: EmailMessage[], customSenders?: KnownSender[]): EmailMessage[] {
    return emails.map(email => this.classify(email, customSenders))
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
