/**
 * ADAPTER FACTORY
 *
 * Factory centralisée pour récupérer les Adapters.
 * Retourne l'Adapter approprié selon platformKey.
 */

import { Adapter } from '../shared/types/adapters';
import { SwissLifeAdapter } from './swisslife.adapter';
// Future: import { AlptisAdapter } from './alptis.adapter';

// Registre des adapters
const adapters = new Map<string, Adapter>();

/**
 * Enregistre un adapter
 */
function registerAdapter(platformKey: string, adapter: Adapter) {
  adapters.set(platformKey, adapter);
}

/**
 * Initialise les adapters
 */
function initializeAdapters() {
  // SwissLife
  registerAdapter('swisslife', new SwissLifeAdapter());

  // Alptis (à implémenter)
  // registerAdapter('alptis', new AlptisAdapter());
}

// Initialiser au chargement du module
initializeAdapters();

/**
 * Récupère un adapter par platformKey
 */
export function getAdapter(platformKey: string): Adapter | null {
  return adapters.get(platformKey) || null;
}

/**
 * Liste tous les adapters disponibles
 */
export function listAdapters(): string[] {
  return Array.from(adapters.keys());
}

/**
 * Vérifie si un adapter existe
 */
export function hasAdapter(platformKey: string): boolean {
  return adapters.has(platformKey);
}

// Export des adapters individuels (pour tests, etc.)
export { SwissLifeAdapter } from './swisslife.adapter';
