/**
 * Email Parser
 * =============
 *
 * Parse emails and extract lead data.
 * Integrates with existing parsers but normalizes to ISO.
 */

import { normalizeToISO, enrichLead } from '../pipeline';

/**
 * Parse email to lead data (normalized to ISO)
 */
export function parseEmailToLead(emailContent: string, provider?: string): any {
  // TODO: Integrate with existing email parsers
  // For now, this is a placeholder that shows the structure

  // The existing parsers in /src/main/services/leadParsing/ would be called here
  // But we'd wrap their output with normalizeToISO()

  throw new Error('Email parsing not yet integrated. Use existing /src/main/services/leadParsing/');
}

/**
 * Wrapper for existing parser orchestrator
 */
export async function parseEmailWithOrchestrator(email: any): Promise<any> {
  // Import existing parser
  const { parserOrchestrator } = await import('../../src/main/services/leadParsing');

  // Parse with existing system
  const result = await parserOrchestrator.parseEmail(email);

  if (!result.success || !result.data) {
    return result;
  }

  // Normalize to ISO
  const normalized = normalizeToISO(result.data);
  const enriched = enrichLead(normalized);

  return {
    ...result,
    data: enriched,
  };
}
