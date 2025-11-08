/**
 * Platforms Module
 * =================
 *
 * Exports all platform configurations and flows.
 */

export * as swisslifeone from './swisslifeone';
export * as alptis from './alptis';
export * from './types';

// Optional registry to simplify runtime discovery
import * as _swisslifeone from './swisslifeone'
import * as _alptis from './alptis'
export const registry = {
  swisslifeone: _swisslifeone,
  alptis: _alptis,
}
