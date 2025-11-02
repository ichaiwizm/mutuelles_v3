/**
 * Main process constants
 * Central location for all hardcoded values used in the main Electron process
 */

// ============================================================================
// Window Configuration
// ============================================================================

export const WINDOW_CONFIG = {
  DEFAULT_WIDTH: 1200,
  DEFAULT_HEIGHT: 800,
  TITLE: 'Mutuelles'
} as const

// ============================================================================
// Development Configuration
// ============================================================================

export const DEV_CONFIG = {
  DEV_TOOLS_MODE: 'detach',
  SECURITY_WARNINGS_DISABLED: 'true'
} as const

// ============================================================================
// Platform-Specific Values
// ============================================================================

export const PLATFORMS = {
  MAC_OS: 'darwin'
} as const
