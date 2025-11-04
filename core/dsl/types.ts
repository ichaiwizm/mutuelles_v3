/**
 * Flow DSL Types
 * ===============
 *
 * Type-safe DSL for defining automation flows.
 *
 * Step types (8 core + utilities):
 * - Navigation: goto, waitField
 * - Forms: fill, type, select, toggle, click
 * - Frames: frame{enter, exit}
 * - Utilities: sleep, pressKey, comment
 *
 * Unified condition language: `when`
 */

export * from './condition-types';
export * from './step-types';
export * from './flow-types';
