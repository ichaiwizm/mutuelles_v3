/**
 * LeadParsing - Point d'entrée principal du système de parsing de leads
 *
 * Initialise et exporte l'orchestrateur configuré avec tous les parsers
 */

import { parserOrchestrator } from './core/ParserOrchestrator'
import { AssurleadParser } from './parsers/AssurleadParser'
import { AssurProspectParser } from './parsers/AssurProspectParser'
import { GenericStructuredParser } from './parsers/GenericStructuredParser'
import { createLogger } from '../logger'

const logger = createLogger('LeadParsing')

// Enregistrer tous les parsers
parserOrchestrator.registerParser(new AssurProspectParser())
parserOrchestrator.registerParser(new AssurleadParser())
parserOrchestrator.registerParser(new GenericStructuredParser())

logger.debug('[LeadParsing] System initialized with parsers:', parserOrchestrator.listParsers())

// Exports
export { parserOrchestrator } from './core/ParserOrchestrator'
export { ParsingDebugger } from './core/ParsingDebugger'
export { ContentCleaner } from './core/ContentCleaner'
export { ProviderDetector } from './core/ProviderDetector'

export * from './types'
