export type TaskFn<T = any> = () => Promise<T>

export class RunnerQueue {
  private concurrency: number
  private maxQueueSize: number
  private running = 0
  private queue: Array<{ fn: TaskFn; resolve: (v: any) => void; reject: (e: any) => void }> = []
  private stopped = false

  constructor(concurrency = 2, maxQueueSize = 1000) {
    this.concurrency = Math.max(1, concurrency)
    this.maxQueueSize = maxQueueSize
  }

  setConcurrency(n: number) {
    this.concurrency = Math.max(1, n)
  }

  add<T>(fn: TaskFn<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.stopped) {
        reject(new Error('Queue has been stopped'))
        return
      }

      if (this.queue.length >= this.maxQueueSize) {
        reject(new Error(`Queue full (max: ${this.maxQueueSize})`))
        return
      }

      this.queue.push({ fn, resolve, reject })
      this.tick()
    })
  }

  stop(): number {
    this.stopped = true
    const cancelled = this.queue.length
    while (this.queue.length > 0) {
      const t = this.queue.shift()!
      t.reject(new Error('Task cancelled: queue stopped'))
    }
    return cancelled
  }

  get isRunning(): boolean {
    return this.running > 0 || this.queue.length > 0
  }

  private tick() {
    if (this.stopped) return
    while (this.running < this.concurrency && this.queue.length) {
      const next = this.queue.shift()!
      this.running++
      next
        .fn()
        .then((v) => next.resolve(v))
        .catch((e) => next.reject(e))
        .finally(() => {
          this.running--
          this.tick()
        })
    }
  }
}

