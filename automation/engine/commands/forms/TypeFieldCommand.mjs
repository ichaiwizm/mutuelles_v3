import { BaseCommand } from '../BaseCommand.mjs'

export class TypeFieldCommand extends BaseCommand {
  async execute(step) {
    const activeContext = this.getActiveContext()
    const fieldDef = this.resolveField(step)
    let value = this.resolveValue(step)

    if (typeof value === 'string') {
      value = this.parseTemplates(value)
    }

    const validation = this.validateOptionalValue(step, value, 'typeField')
    if (validation.skip) return

    if (!fieldDef.selector) throw new Error(`Selector manquant pour ${this.getFieldName(step)}`)

    const locator = activeContext.locator(fieldDef.selector)
    await locator.scrollIntoViewIfNeeded()
    await locator.click({ clickCount: 1 })
    await locator.fill('')
    await locator.pressSequentially(String(value), { delay: 40 })

    if (step.pressEnter === true) {
      await locator.press('Enter')
    }
    if (step.pressEscape === true) {
      await locator.press('Escape')
    }
    if (step.blur !== false) {
      await locator.blur().catch(()=>{})
    }

    await new Promise(r => setTimeout(r, step.postDelay_ms || 200))
  }
}
