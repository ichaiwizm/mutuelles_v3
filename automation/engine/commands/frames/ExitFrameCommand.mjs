import { BaseCommand } from '../BaseCommand.mjs'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('ExitFrameCommand')

export class ExitFrameCommand extends BaseCommand {
  async execute(step) {
    const { contextStack } = this.context

    if (contextStack.length <= 1) {
      logger.debug('[hl] exitFrame - déjà au contexte principal, ignoré')
      return
    }

    contextStack.pop()
    logger.debug('[hl] exitFrame - contexte dépilé (profondeur: %d)', contextStack.length)
  }
}
