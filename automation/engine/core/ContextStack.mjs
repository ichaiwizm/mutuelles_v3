export class ContextStack {
  constructor(rootPage) {
    this.stack = [rootPage]
  }
  current() {
    return this.stack[this.stack.length - 1]
  }
  push(frame) {
    this.stack.push(frame)
  }
  pop() {
    if (this.stack.length > 1) this.stack.pop()
  }
}

