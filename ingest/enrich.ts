/**
 * Enrichment Stage
 * Adds computed/default values to lead data
 */

import type { LeadData } from '../core/domain';
import { firstOfNextMonth } from '../core/adapters/date';

/**
 * Enrich lead with computed and default values
 */
export function enrichLead(partial: Partial<LeadData>): Partial<LeadData> {
  const enriched = { ...partial };

  // Set default project name if missing
  if (enriched.project && !enriched.project.name && enriched.subscriber) {
    enriched.project.name = `Simulation ${enriched.subscriber.lastName || ''} ${enriched.subscriber.firstName || ''}`.trim();
  }

  // Set default dateEffet if missing (first of next month)
  if (enriched.project && !enriched.project.dateEffet) {
    enriched.project.dateEffet = firstOfNextMonth();
  }

  // Compute childrenCount if children array exists
  if (enriched.children && enriched.subscriber) {
    enriched.subscriber.childrenCount = enriched.children.length;
  }

  return enriched;
}
