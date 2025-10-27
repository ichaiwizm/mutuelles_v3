import { BaseCommand } from '../BaseCommand.mjs'

export class CommentCommand extends BaseCommand {
  async execute(step) {
    if (step.text) console.log('[hl] comment:', step.text)
  }

  describe(step) {
    return step.text || 'comment'
  }
}
