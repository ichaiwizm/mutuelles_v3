import { BaseCommand } from '../BaseCommand.mjs'

export class PressKeyCommand extends BaseCommand {
  async execute(step) {
    const activeContext = this.getActiveContext()
    const key = step.key || step.code || 'Escape'

    if (step.field || step.domainField) {
      const f = this.resolveField(step)
      if (!f.selector) throw new Error(`Selector manquant pour ${step.field||step.domainField}`)

      const locator = activeContext.locator(f.selector)
      await locator.click({ force: true })
      await locator.press(key)
    } else {
      await activeContext.keyboard.press(key)
    }
  }
}
