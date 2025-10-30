import { BaseCommand } from '../BaseCommand.mjs'

export class SleepCommand extends BaseCommand {
  async execute(step) {
    await new Promise(r => setTimeout(r, step.timeout_ms || 0))
  }
}
