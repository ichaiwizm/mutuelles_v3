import path from 'node:path'
import { writeText, writeJson } from '../utils/fileSystem.mjs'
import { createLogger } from '../utils/logger.mjs'

const logger = createLogger('DomCollector')

/**
 * DomCollector - Collecte de DOM et snapshots d'accessibilité
 */
export class DomCollector {
  /**
   * Collecte conditionnelle basée sur le mode et l'état d'erreur
   * @param {Page|Frame} activeContext - Contexte actif (page ou frame)
   * @param {number} index - Index du step
   * @param {object} step - Step object
   * @param {string} domDir - Répertoire de destination
   * @param {string} domMode - Mode: 'none', 'all', 'steps', 'errors'
   * @param {boolean} a11y - Activer capture A11y
   * @param {boolean} onError - true si appelé lors d'une erreur
   */
  async maybeCollect(activeContext, index, step, domDir, domMode, a11y, onError) {
    const should = (v) => {
      if (!v || v === 'none') return false
      if (v === 'all') return true
      if (v === 'steps' && !onError) return true
      if (v === 'errors' && onError) return true
      return false
    }

    if (!should(domMode)) return

    try {
      await this.collectDom(activeContext, index, step, domDir)
      if (a11y) await this.collectA11y(activeContext, index, domDir)
    } catch (err) {
      logger.error('[DomCollector] Erreur lors de la capture:', err.message)
    }
  }

  /**
   * Collecte le DOM HTML complet
   * @param {Page|Frame} activeContext - Contexte actif
   * @param {number} index - Index du step
   * @param {object} step - Step object
   * @param {string} domDir - Répertoire de destination
   */
  async collectDom(activeContext, index, step, domDir) {
    try {
      if (!activeContext || activeContext.isClosed?.()) {
        logger.warn(`[DomCollector] Contexte fermé pour step ${index + 1}`)
        return
      }

      const full = await activeContext.content()

      if (!full || full.trim().length < 100) {
        logger.warn(`[DomCollector] DOM vide ou trop court pour step ${index + 1}: ${full?.length || 0} chars`)
      }

      const filename = `step-${String(index + 1).padStart(2, '0')}.html`
      writeText(path.join(domDir, filename), full)
    } catch (err) {
      logger.error(`[DomCollector] Erreur step ${index + 1}:`, err.message)
    }
  }

  /**
   * Collecte le snapshot d'accessibilité (A11y)
   * @param {Page|Frame} activeContext - Contexte actif
   * @param {number} index - Index du step
   * @param {string} domDir - Répertoire de destination
   */
  async collectA11y(activeContext, index, domDir) {
    try {
      // A11y snapshot est seulement disponible sur Page, pas sur Frame
      if (!activeContext.accessibility) {
        return
      }

      const snap = await activeContext.accessibility.snapshot({ interestingOnly: false })
      const filename = `step-${String(index + 1).padStart(2, '0')}.a11y.json`
      writeJson(path.join(domDir, filename), snap)
    } catch {
      // Silent fail - A11y is optional
    }
  }
}
