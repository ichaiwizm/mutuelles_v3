// ExitFrame command - exit current frame context
import { BaseCommand } from '../BaseCommand.mjs'

export class ExitFrameCommand extends BaseCommand {
  async execute(step) {
    const { contextStack } = this.context

    if (contextStack.length <= 1) {
      console.log('[hl] exitFrame - déjà au contexte principal, ignoré')
      return
    }

    contextStack.pop()
    console.log('[hl] exitFrame - contexte dépilé (profondeur: %d)', contextStack.length)
  }

  describe(step) {
    return `Sortir de l'iframe`
  }
}
