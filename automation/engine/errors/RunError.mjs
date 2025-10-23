export class RunError extends Error {
  constructor(message, runDir, stack) {
    super(message)
    this.name = 'RunError'
    this.runDir = runDir
    if (stack) this.stack = stack
  }
}

