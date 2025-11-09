/**
 * Types pour le système de parsing de leads (générique, pas spécifique aux emails)
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low'
export type ValidationStatus = 'valid' | 'partial' | 'invalid'

// ============================================================================
// CONTENU NETTOYÉ (source agnostique)
// ============================================================================

export interface CleanedContent {
  /** Contenu texte nettoyé (HTML stripped, entities décodées, etc.) */
  text: string
  /** Contenu original brut */
  original: string
  /** Métadonnées de nettoyage */
  metadata: {
    wasHtml: boolean
    linesRemoved: number
    charsRemoved: number
  }
}

// ============================================================================
// DÉTECTION DE PROVIDER
// ============================================================================

export type ProviderType = 'assurlead' | 'assurprospect' | 'generic' | 'unknown'

export interface StructureAnalysis {
  hasTabularFormat: boolean
  hasSections: boolean
  fieldCount: number
  hasContactInfo: boolean
  hasProjectInfo: boolean
  hasFamilyInfo: boolean
}

export interface ProviderDetection {
  provider: ProviderType
  confidence: number // 0-100
  reasons: string[]
  structureAnalysis: StructureAnalysis
  keywordsFound: string[]
}

// ============================================================================
// CHAMPS PARSÉS
// ============================================================================

export interface ParsedField<T = any> {
  value: T
  confidence: ConfidenceLevel
  source: 'parsed' | 'default' | 'inferred'
  originalText?: string
}

export interface ParsedLeadData {
  subscriber?: {
    civility?: ParsedField<string>
    lastName?: ParsedField<string>
    firstName?: ParsedField<string>
    birthDate?: ParsedField<string>
    email?: ParsedField<string>
    telephone?: ParsedField<string>
    address?: ParsedField<string>
    postalCode?: ParsedField<string>
    city?: ParsedField<string>
    departmentCode?: ParsedField<number | string>
    regime?: ParsedField<string>
    category?: ParsedField<string>
    status?: ParsedField<string>
    profession?: ParsedField<string>
    workFramework?: ParsedField<string>
  }

  spouse?: {
    civility?: ParsedField<string>
    lastName?: ParsedField<string>
    firstName?: ParsedField<string>
    birthDate?: ParsedField<string>
    regime?: ParsedField<string>
    category?: ParsedField<string>
    status?: ParsedField<string>
    profession?: ParsedField<string>
  }

  children?: Array<{
    birthDate?: ParsedField<string>
    gender?: ParsedField<string>
    regime?: ParsedField<string>
    ayantDroit?: ParsedField<string>
  }>

  project?: {
    name?: ParsedField<string>
    dateEffet?: ParsedField<string>
    plan?: ParsedField<string>
    couverture?: ParsedField<boolean>
    ij?: ParsedField<boolean>
    madelin?: ParsedField<boolean>
    resiliation?: ParsedField<boolean>
    reprise?: ParsedField<boolean>
    currentlyInsured?: ParsedField<boolean>
    // Parsed need levels (AssurProspect: Soins, Hospitalisation, Optique, Dentaire)
    medicalCareLevel?: ParsedField<number>
    hospitalizationLevel?: ParsedField<number>
    opticsLevel?: ParsedField<number>
    dentalLevel?: ParsedField<number>
  }

  metadata: {
    parserUsed: string
    parsingDate: string
    sourceId: string
    confidence: ConfidenceLevel
    parsedFieldsCount: number
    defaultedFieldsCount: number
    warnings: string[]
  }
}

// ============================================================================
// RÉSULTATS DE PARSING
// ============================================================================

export interface ParserResult {
  success: boolean
  parserName: string
  parsedData?: ParsedLeadData
  fieldsExtracted: number
  score: number // Score de qualité (0-100)
  errors: string[]
  warnings: string[]
  executionTime: number
}

export interface OrchestrationResult {
  finalResult: ParserResult
  providerDetection: ProviderDetection
  allAttempts: ParserResult[]
  bestParser: string
  cleanedContent: CleanedContent
  debugReport: DebugReport
}

// ============================================================================
// DEBUG & REPORTING
// ============================================================================

export interface DebugReport {
  timestamp: string
  sourceId: string

  // Phase 1: Nettoyage
  cleaning: {
    originalLength: number
    cleanedLength: number
    removedChars: number
    wasHtml: boolean
  }

  // Phase 2: Détection provider
  providerDetection: ProviderDetection

  // Phase 3: Tentatives de parsing
  parsingAttempts: Array<{
    parserName: string
    success: boolean
    fieldsExtracted: number
    score: number
    executionTime: number
    errors: string[]
  }>

  // Phase 4: Résultat final
  finalChoice: {
    parserUsed: string
    reason: string
    fieldsExtracted: string[]
    missingFields: string[]
  }

  // Contenu pour debug
  content: {
    original: string
    cleaned: string
  }
}

// ============================================================================
// INTERFACES DE PARSERS
// ============================================================================

export interface ILeadParser {
  readonly name: string
  readonly priority: number

  /**
   * Parse le contenu nettoyé et retourne les données extraites
   */
  parse(content: CleanedContent, sourceId: string): ParserResult
}

// ============================================================================
// FIELD EXTRACTION (réutilisé de l'ancien système)
// ============================================================================

export interface FieldExtractionResult<T = any> {
  value: T | null
  confidence: ConfidenceLevel
  source: 'parsed' | 'default' | 'inferred'
  originalText?: string
}

export interface EmailContentSections {
  text: string
  html?: string
  subject: string
  from: string
  lines: string[]
  cleanLines: string[]
}
