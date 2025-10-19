/**
 * ScreenshotManager - Gestion des captures d'écran avec retry logic
 */
export class ScreenshotManager {
  /**
   * Capture un screenshot avec retry en cas d'échec
   * @param {Page|Frame} context - Page ou frame Playwright
   * @param {string} filepath - Chemin du fichier de destination
   */
  async capture(context, filepath) {
    try {
      await context.screenshot({ path: filepath })
    } catch (e) {
      const msg = String(e?.message || '')
      console.warn('[ScreenshotManager] 1st attempt failed:', msg)

      // Attendre que le DOM soit chargé avant de retry
      try {
        await context.waitForLoadState('domcontentloaded', { timeout: 3000 })
      } catch {}

      // 2ème tentative
      try {
        await context.screenshot({ path: filepath })
      } catch (e2) {
        const msg2 = String(e2?.message || '')
        console.warn('[ScreenshotManager] 2nd attempt failed:', msg2)
        throw e2  // Propager l'erreur après 2 tentatives échouées
      }
    }
  }
}
