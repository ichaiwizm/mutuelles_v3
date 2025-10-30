import { BaseCommand } from '../BaseCommand.mjs'

export class AcceptConsentCommand extends BaseCommand {
  validate(step) {
    if (!step.selector) throw new Error('selector requis pour acceptConsent')
  }

  async execute(step) {
    const activeContext = this.getActiveContext()
    const timeout = step.timeout_ms || 5000
    const maxRetries = step.retries || 3
    const forceRemove = step.force === true

    console.log('[hl] acceptConsent: selector=%s, timeout=%dms, retries=%d', step.selector, timeout, maxRetries)

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const buttonExists = await activeContext.locator(step.selector).count() > 0
        if (!buttonExists) {
          console.log('[hl] acceptConsent: bouton non trouvé (tentative %d/%d)', attempt, maxRetries)
          if (attempt === maxRetries) {
            console.log('[hl] acceptConsent: bouton jamais apparu, skip')
            return
          }
          await new Promise(r => setTimeout(r, 500))
          continue
        }

        await activeContext.waitForSelector(step.selector, { timeout })
        await activeContext.click(step.selector, { force: true })
        console.log('[hl] acceptConsent: bouton cliqué (tentative %d/%d)', attempt, maxRetries)

        await new Promise(r => setTimeout(r, 1000))

        const overlayGone = await activeContext.locator(step.selector).count() === 0
        if (overlayGone) {
          console.log('[hl] acceptConsent: overlay disparu avec succès')
          return
        }

        console.log('[hl] acceptConsent: overlay toujours présent après click (tentative %d/%d)', attempt, maxRetries)

      } catch (err) {
        console.log('[hl] acceptConsent: erreur (tentative %d/%d): %s', attempt, maxRetries, err.message)
      }

      if (attempt === maxRetries && forceRemove) {
        try {
          console.log('[hl] acceptConsent: tentative de suppression DOM forcée')
          await activeContext.evaluate((sel) => {
            const btn = document.querySelector(sel)
            if (btn) btn.remove()

            const overlays = document.querySelectorAll('#axeptio_overlay, #axeptio_widget, [id^="axeptio"]')
            overlays.forEach(el => el.remove())

            console.log('[DOM] Axeptio overlays supprimés:', overlays.length)
          }, step.selector)
          console.log('[hl] acceptConsent: suppression DOM forcée réussie')
        } catch (domErr) {
          console.log('[hl] acceptConsent: échec suppression DOM: %s', domErr.message)
        }
      }

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    console.log('[hl] acceptConsent: terminé (best-effort)')
  }
}
