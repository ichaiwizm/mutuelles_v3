import { BaseCommand } from '../BaseCommand.mjs'

export class WaitNetworkIdleCommand extends BaseCommand {
  async execute(step) {
    const page = this.getMainPage()
    const timeout = typeof step.timeout_ms === 'number' ? step.timeout_ms : 20000
    await page.waitForLoadState('networkidle', { timeout })
  }

  describe(step) {
    return 'Attendre network idle'
  }
}
