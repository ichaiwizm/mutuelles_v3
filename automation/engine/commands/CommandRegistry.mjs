// Command registry for step executors
export class CommandRegistry {
  constructor() {
    this.commands = new Map()
  }

  register(type, commandInstance) {
    this.commands.set(type, commandInstance)
  }

  get(type) {
    return this.commands.get(type)
  }

  has(type) {
    return this.commands.has(type)
  }

  async execute(step, context) {
    const command = this.commands.get(step.type)
    if (!command) {
      throw new Error(`Unknown step type: ${step.type}`)
    }

    // Update command context (for when context changes between steps)
    command.context = context

    command.validate(step)
    return await command.execute(step)
  }
}
