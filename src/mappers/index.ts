/**
 * MAPPER FACTORY
 *
 * Factory centralisée pour récupérer les Mappers.
 * Retourne le Mapper approprié selon platformKey + productKey.
 */

import { Mapper } from '../shared/types/mappers';
import { SwissLifeSanteProMapper } from './swisslife/sante-pro.mapper';
import { AlptisSanteProMapper } from './alptis/sante-pro.mapper';

// Registre des mappers
const mappers = new Map<string, Mapper>();

/**
 * Enregistre un mapper
 */
function registerMapper(platformKey: string, productKey: string, mapper: Mapper) {
  const key = `${platformKey}:${productKey}`;
  mappers.set(key, mapper);
}

/**
 * Initialise les mappers
 */
function initializeMappers() {
  // SwissLife
  registerMapper('swisslife', 'sante-pro', new SwissLifeSanteProMapper());
  // Future: registerMapper('swisslife', 'sante-plus', new SwissLifeSantePlusMapper());

  // Alptis
  registerMapper('alptis', 'sante-pro', new AlptisSanteProMapper());
  // Future: registerMapper('alptis', 'sante-plus', new AlptisSantePlusMapper());
}

// Initialiser au chargement du module
initializeMappers();

/**
 * Récupère un mapper par platformKey + productKey
 */
export function getMapper(platformKey: string, productKey: string): Mapper | null {
  const key = `${platformKey}:${productKey}`;
  return mappers.get(key) || null;
}

/**
 * Liste tous les mappers disponibles
 */
export function listMappers(): Array<{ platformKey: string; productKey: string }> {
  return Array.from(mappers.keys()).map((key) => {
    const [platformKey, productKey] = key.split(':');
    return { platformKey, productKey };
  });
}

/**
 * Vérifie si un mapper existe
 */
export function hasMapper(platformKey: string, productKey: string): boolean {
  const key = `${platformKey}:${productKey}`;
  return mappers.has(key);
}

// Export des mappers individuels (pour tests, etc.)
export { SwissLifeSanteProMapper } from './swisslife/sante-pro.mapper';
export { AlptisSanteProMapper } from './alptis/sante-pro.mapper';
