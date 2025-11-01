import { BaseCommand } from '../BaseCommand.mjs'

export class WaitForFieldCommand extends BaseCommand {
  async execute(step) {
    const f = this.resolveField(step)
    if (!f.selector) throw new Error(`Selector manquant pour ${step.field||step.domainField}`)

    const activeContext = this.getActiveContext()
    await activeContext.waitForSelector(f.selector, { state: 'attached' })
  }
}
