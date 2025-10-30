import { BaseCommand } from '../BaseCommand.mjs'

export class ScrollIntoViewCommand extends BaseCommand {
  async execute(step) {
    const activeContext = this.getActiveContext()

    if (step.field || step.domainField) {
      const f = this.resolveField(step)
      if (!f.selector) throw new Error(`Selector manquant pour ${step.field||step.domainField}`)
      await activeContext.locator(f.selector).scrollIntoViewIfNeeded()
    } else if (step.selector) {
      await activeContext.locator(step.selector).scrollIntoViewIfNeeded()
    }

    await new Promise(r => setTimeout(r, step.timeout_ms || 150))
  }
}
