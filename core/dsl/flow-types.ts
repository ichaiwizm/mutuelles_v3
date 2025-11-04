/**
 * Flow Type
 * Main flow definition
 */

import type { FlowStep } from './step-types';

export interface Flow {
  /** Flow unique identifier (platform/slug) */
  slug: string;
  /** Platform identifier */
  platform: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description?: string;
  /** Trace mode (on | retain-on-failure | off) */
  trace?: 'on' | 'retain-on-failure' | 'off';
  /** Flow steps */
  steps: FlowStep[];
}
