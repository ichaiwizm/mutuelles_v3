// Main entry point for the automation engine (refactored)
export { runHighLevelFlow } from './core/FlowRunner.mjs'

/*
 * Architecture (refactor sans changement fonctionnel)
 * - core/: FlowRunner, BrowserManager, ArtifactsPipeline, ProgressEmitter, ContextStack
 * - resolvers/: Field, Value, Template, Condition
 * - commands/: 14 step executors (Command pattern)
 * - registry/: buildDefaultRegistry()
 * - browser/: ChromeDetector
 * - artifacts/: ScreenshotManager, DomCollector
 * - utils/: filesystem, text, timestamp, selector builder, step describer
 */
