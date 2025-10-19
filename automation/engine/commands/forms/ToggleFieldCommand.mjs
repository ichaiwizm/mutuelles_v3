// ToggleField command - toggle field on/off
import { BaseCommand } from '../BaseCommand.mjs'

export class ToggleFieldCommand extends BaseCommand {
  async execute(step) {
    const activeContext = this.getActiveContext()
    const fieldDef = this.resolveField(step)

    const fieldName = this.getFieldName(step)

    // Vérifier que metadata.toggle est présent
    if (!fieldDef?.metadata?.toggle) throw new Error(`metadata.toggle manquant pour ${fieldName}`)
    if (!fieldDef.metadata.toggle.click_selector) throw new Error(`metadata.toggle.click_selector manquant pour ${fieldName}`)
    if (!fieldDef.metadata.toggle.state_on_selector) throw new Error(`metadata.toggle.state_on_selector manquant pour ${fieldName}`)

    const clickSel = fieldDef.metadata.toggle.click_selector
    const stateSel = fieldDef.metadata.toggle.state_on_selector
    console.log('[hl] toggleField %s -> %s', fieldName, step.state)

    // Vérifier l'état actuel avant de cliquer
    const isCurrentlyOn = await activeContext.locator(stateSel).count() > 0

    if (step.state === 'on' && !isCurrentlyOn) {
      // Cliquer sur le toggle pour l'activer
      await activeContext.locator(clickSel).click({ force: true })
      console.log('[hl] toggleField %s - clicked to activate', fieldName)
      // Attendre que l'animation/state update se termine
      await new Promise(r => setTimeout(r, 300))
      await activeContext.waitForSelector(stateSel, { state: 'attached', timeout: 20000 })
      console.log('[hl] toggleField %s - état ON confirmé', fieldName)
    } else if (step.state === 'off' && isCurrentlyOn) {
      // Cliquer sur le toggle pour le désactiver
      await activeContext.locator(clickSel).click({ force: true })
      console.log('[hl] toggleField %s - clicked to deactivate', fieldName)
      await new Promise(r => setTimeout(r, 300))
    } else {
      console.log('[hl] toggleField %s - already in desired state %s', fieldName, step.state)
    }
  }

  describe(step) {
    return `Toggle ${this.getFieldName(step)} -> ${step.state}`
  }
}
