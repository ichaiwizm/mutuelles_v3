import { BaseCommand } from '../BaseCommand.mjs'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('CommentCommand')

export class CommentCommand extends BaseCommand {
  async execute(step) {
    if (step.text) logger.debug('[hl] comment:', step.text)
  }
}
