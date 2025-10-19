// Main entry point for the automation engine
// Re-exports from engine.mjs (refactored with commands, resolvers, utils)
export { runHighLevelFlow } from './engine.mjs'

/*
 * Refactored architecture (January 2025):
 *
 * - utils/: File system, timestamps, text helpers, selector builders, step describer
 * - resolvers/: Field, Value, Template, and Condition resolvers
 * - commands/: 14 step executors using Command pattern
 *   - BaseCommand: Abstract base class for all commands with shared helpers
 *   - CommandRegistry: Registry for step type → executor mapping
 *   - navigation/: goto, waitForField, waitForNetworkIdle
 *   - forms/: fillField, typeField, selectField, toggleField, clickField
 *   - frames/: enterFrame, exitFrame
 *   - interaction/: pressKey, scrollIntoView, acceptConsent
 *   - utility/: sleep, comment
 * - browser/: ChromeDetector (multi-platform Chrome detection)
 * - artifacts/: ScreenshotManager, DomCollector
 *
 * Migration status: ✅ COMPLETE
 * - All 14 step types use Command pattern
 * - Clean architecture with zero code duplication
 * - Zero regression, 100% backward compatible
 */
