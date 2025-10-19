// Goto command - navigate to URL
import { BaseCommand } from '../BaseCommand.mjs'

export class GotoCommand extends BaseCommand {
  validate(step) {
    if (!step.url) throw new Error('URL manquante')
  }

  async execute(step) {
    const page = this.getMainPage()
    await page.goto(step.url, { waitUntil: 'domcontentloaded' })
  }

  describe(step) {
    return `Aller sur ${step.url}`
  }
}
