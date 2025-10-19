// ClickField command - click on field or radio option
import { BaseCommand } from '../BaseCommand.mjs'

export class ClickFieldCommand extends BaseCommand {
  async execute(step) {
    const activeContext = this.getActiveContext()
    const fieldDef = this.resolveField(step)

    // Support pour radio-group : chercher l'option basée sur la valeur du lead
    if (fieldDef.type === 'radio-group' && fieldDef.options) {
      const value = this.resolveValue(step)

      // Validate optional value for radio-group
      const validation = this.validateOptionalValue(step, value, 'clickField (radio)')
      if (validation.skip) return

      const option = fieldDef.options.find(opt => String(opt.value) === String(value))
      if (!option) throw new Error(`Option radio non trouvée pour ${this.getFieldName(step)}:${value}`)
      console.log('[hl] clickField (radio) %s = %s', this.getFieldName(step), value)
      await activeContext.click(option.selector)
      return
    }

    if (!fieldDef.selector) throw new Error(`Selector manquant pour ${this.getFieldName(step)}`)

    // Si optional, vérifier d'abord si l'élément existe
    if (step.optional === true) {
      try {
        await activeContext.waitForSelector(fieldDef.selector, { state: 'attached', timeout: 1000 })
        await activeContext.click(fieldDef.selector)
        console.log('[hl] clickField %s (optional, found)', this.getFieldName(step))
      } catch (err) {
        console.log('[hl] clickField %s = SKIPPED (optional, not found)', this.getFieldName(step))
      }
      return
    }

    await activeContext.click(fieldDef.selector)
  }

  describe(step) {
    return `Cliquer ${this.getFieldName(step)}`
  }
}
