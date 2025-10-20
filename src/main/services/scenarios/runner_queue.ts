export type TaskFn<T=any> = () => Promise<T>

export class RunnerQueue {
  private concurrency: number
  private running = 0
  private queue: Array<{ fn: TaskFn; resolve: (v:any)=>void; reject: (e:any)=>void }> = []
  private stopped = false

  constructor(concurrency = 2) { this.concurrency = Math.max(1, concurrency) }

  setConcurrency(n: number) { this.concurrency = Math.max(1, n) }

  add<T>(fn: TaskFn<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.stopped) {
        reject(new Error('Queue has been stopped'))
        return
      }
      this.queue.push({ fn, resolve, reject })
      this.tick()
    })
  }

  stop(): number {
    this.stopped = true
    const cancelledCount = this.queue.length

    // Reject all pending tasks
    while (this.queue.length > 0) {
      const task = this.queue.shift()!
      task.reject(new Error('Task cancelled: queue stopped'))
    }

    return cancelledCount
  }

  get isRunning(): boolean {
    return this.running > 0 || this.queue.length > 0
  }

  get runningCount(): number {
    return this.running
  }

  get pendingCount(): number {
    return this.queue.length
  }

  private tick() {
    if (this.stopped) return

    while (this.running < this.concurrency && this.queue.length) {
      const next = this.queue.shift()!
      this.running++
      next.fn()
        .then(v => next.resolve(v))
        .catch(err => next.reject(err))
        .finally(() => { this.running--; this.tick() })
    }
  }
}

