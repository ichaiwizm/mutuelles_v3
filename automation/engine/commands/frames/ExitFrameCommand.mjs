import { BaseCommand } from '../BaseCommand.mjs'

export class ExitFrameCommand extends BaseCommand {
  async execute(step) {
    const { contextStack } = this.context

    if (contextStack.length <= 1) {
      console.log('[hl] exitFrame - déjà au contexte principal, ignoré')
      return
    }

    const popped = contextStack.pop()
    try {
      const url = typeof popped?.url === 'function' ? popped.url() : '(no-url)'
      console.log('[hl] exitFrame - contexte dépilé (profondeur: %d) lastFrameUrl=%s', contextStack.length, url)
    } catch {
      console.log('[hl] exitFrame - contexte dépilé (profondeur: %d)', contextStack.length)
    }
  }
}
