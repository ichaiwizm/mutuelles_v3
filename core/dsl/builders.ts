/**
 * Flow DSL Builders
 * =================
 *
 * Fluent API for building flows.
 */

export * from './navigation-builders';
export * from './form-builders';
export * from './utility-builders';

// Convenience namespace export
import * as navigation from './navigation-builders';
import * as form from './form-builders';
import * as utility from './utility-builders';

export const step = {
  ...navigation,
  ...form,
  ...utility,
};
