/**
 * Platform Leads Module
 * Clean, modular architecture for generating platform-specific lead data
 */

// Main service (public API)
export { PlatformLeadsService } from './platform_leads_service'

// Individual modules (can be used independently if needed)
export { PlatformLeadGenerator } from './platform_lead_generator'
export { PlatformLeadValidator } from './platform_lead_validator'
export { AssignmentsRepository } from './assignments_repository'
export { FlowSelector } from './flow_selector'

// Utility functions
export * from './utils'
